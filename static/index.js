
// ------------------------------------------------------------
let NIKNIKstatus = document.getElementById('PliStatus');
let NIKNIKtriggerPli = false;

setInterval(() => {
  NIKNIKtriggerPli = !NIKNIKtriggerPli;
  if (NIKNIKtriggerPli) {
    NIKNIKstatus.innerHTML = 'status: PLIs for each frame';
  } else {
    NIKNIKstatus.innerHTML = 'status: GOOD';
  }

  worker.postMessage({
    operation: 'PLI',
    pli: NIKNIKtriggerPli,
  });
}, 15000);

const worker = new Worker('./worker.js', {name: 'E2EE worker'});
function XXX_setupReceiverTransform(kind, receiver) {
  if (window.RTCRtpScriptTransform && kind === 'video') {
    receiver.transform = new RTCRtpScriptTransform(worker, {operation: 'decode'});
    return;
  }
}

// ------------------------------------------------------------

function createButton(label, onclick) {
  const button = document.createElement('button')
  button.textContent = label
  button.onclick = onclick
  document.body.appendChild(button)
}

function createLabel(text) {
  const label = document.createElement('span')
  label.textContent = text
  document.body.appendChild(label)
  return label
}

createButton('join', function() {
  document.body.innerHTML = '<p><span id="PliStatus">status: GOOD</span></p>'
  NIKNIKstatus = document.getElementById('PliStatus');
  createButton('Add camera stream', async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true })
    addVideo(stream)
    sendVideo(stream)
  })

  createButton('Add desktop stream', async () => {
    const stream = await navigator.mediaDevices.getDisplayMedia({ audio: false, video: true })
    addVideo(stream)
    sendVideo(stream)
  })

  const status = createLabel('Connecting')
  document.body.appendChild(document.createElement('div'))

  const wsUrl = location.origin.replace(/^http/, 'ws') + '/ws/'
  const ws = new WebSocket(wsUrl)
  const pc = new RTCPeerConnection({
    encodedInsertableStreams: true,
    iceServers: [{
      urls: ['stun:rtc.peercalls.com'],
    }],
  })

  let initialOffer = true
  const icePromise = new Promise(resolve => {
    if (!initialOffer) {
      resolve()
      return
    }
    pc.onicecandidate = e => {
      // console.log('ice candidate', e.candidate)
    }
    pc.onicegatheringstatechange = e => {
      console.log('ice gathering state', e.target.iceGatheringState)
      if (e.target.iceGatheringState === 'complete') {
        initialOffer = false
        resolve()
      }
    }
  })
  pc.oniceconnectionstatechange = e => {
    status.textContent = pc.iceConnectionState
    console.log('ice connection state change', pc.iceConnectionState)
  }

  const send = (type, payload) => ws.send(JSON.stringify({type, payload}))

  ws.addEventListener('open', () => {
    console.log('ws connected')
    setInterval(() => send('ping'), 5000)
    send('ready')
  })

  ws.addEventListener('message', async event => {
    const msg = JSON.parse(event.data)
    console.log('ws message', msg.type)
    switch (msg.type) {
      case 'offer':
        // console.log(msg.payload.type, msg.payload.sdp)
        await pc.setRemoteDescription(msg.payload)
        const answer = await pc.createAnswer()
        console.log('setting local description')
        await pc.setLocalDescription(answer)
        console.log('awaiting ice gathering')
        await icePromise
        // console.log('sending answer', pc.localDescription.sdp)
        send('answer', pc.localDescription)
    }
  })

  function addVideo(stream) {
    v = document.createElement('video')
    v.style.width = '200px'
    v.srcObject = stream
    document.body.appendChild(v)
    v.play()
  }

  function sendVideo(stream) {
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream)
    })
    send('pub')
  }

  pc.addEventListener('track', event => {
    console.log('peer ontrack event', event.track)
    XXX_setupReceiverTransform(event.track.kind, event.receiver)
    event.streams.forEach(stream => {
      addVideo(stream)
    })
  })

})
