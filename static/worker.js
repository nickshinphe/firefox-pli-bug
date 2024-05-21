let NIKNIKtriggerPli = false;
let NIKNIKtransformer;

function decodeFunction(encodedFrame, controller) {
  if (NIKNIKtransformer && NIKNIKtriggerPli) {
    NIKNIKtransformer.sendKeyFrameRequest();
  }
  if (encodedFrame.type === 'key') {
    console.log(performance.now().toFixed(2), 'recv',
      'type=' + (encodedFrame.type || 'audio'),
      'ts=' + encodedFrame.timestamp,
    );
  }

  controller.enqueue(encodedFrame);
}

function handleTransform(operation, readable, writable) {
  const transformStream = new TransformStream({
    transform: decodeFunction,
  });
  readable
    .pipeThrough(transformStream)
    .pipeTo(writable);
}

onmessage = (event) => {
  if (event.data.operation === 'decode') {
    console.log('NIKNIK: worker SETUP: ', event.data);
    return handleTransform(event.data.operation, event.data.readable, event.data.writable);
  }
  else if (event.data.operation === 'PLI') {
    NIKNIKtriggerPli = event.data.pli;
    console.log('NIKNIK PLI: ', NIKNIKtriggerPli);
  } else {
    console.log('NIKNIK: WHO DIS? event: ', event);
  }
};

if (self.RTCTransformEvent) {
  self.onrtctransform = (event) => {
    const transformer = event.transformer;
    handleTransform(transformer.options.operation, transformer.readable, transformer.writable);

    NIKNIKtransformer = transformer;
    console.log('NIKNIK onrtctransform set...');
  }
};
