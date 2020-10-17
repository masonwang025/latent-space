const startBtn = document.querySelector("#start");
const stopBtn = document.querySelector("#stop");
// microphone source as AudioContext

startBtn.onclick = record_microphone;
stopBtn.onclick = stop_microphone;

var audioCtx = new AudioContext();

var source = audioCtx.createBufferSource();

var scriptNode = audioCtx.createScriptProcessor(BUFF_SIZE, 1, 1);

var BUFF_SIZE = 512;

try {
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  console.log("Audio context established and buffer source created.");
} catch (e) {
  alert(
    "Web Audio API is not supported by this browser and/or its current config\n"
  );
}

function process_microphone_buffer(event) {
  var microphone_buffer = event.inputBuffer.getChannelData(0);

  console.log("microphone_buffer.length ", microphone_buffer.length);
}

function on_error(e) {
  console.log(e);
}

function start_microphone() {
  console.log(audioCtx);
  microphone_stream = audioCtx.createMediaStreamSource(media_stream);

  scriptNode.onaudioprocess = process_microphone_buffer;

  microphone_stream.connect(scriptNode);
  microphone_stream.connect(audioCtx.destination);

  console.log("Microphone stream connected.");
}

function record_microphone() {
  if (!navigator.getUserMedia) {
    navigator.getUserMedia =
      navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
  }

  navigator.getUserMedia(
    { audio: true },

    function (stream) {
      media_stream = stream;
      start_microphone();
    },

    on_error
  );
}

function stop_microphone() {
  microphone_stream.disconnect();
  scriptNode.disconnect();
  media_stream.getAudioTracks()[0].stop();
  scriptNode.onaudioprocess = null;
  source.disconnect(scriptNode);
  scriptNode.disconnect(audioCtx.destination);

  console.log("Microphone now stopped");
}

// Give the node a function to process audio events
scriptNode.onaudioprocess = function (audioProcessingEvent) {
  // The input buffer is the song we loaded earlier
  var inputBuffer = audioProcessingEvent.inputBuffer;

  // The output buffer contains the samples that will be modified and played
  var outputBuffer = audioProcessingEvent.outputBuffer;

  // Loop through the output channels (in this case there is only one)
  for (var channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
    var inputData = inputBuffer.getChannelData(channel);
    var outputData = outputBuffer.getChannelData(channel);

    // Loop through the 4096 samples
    for (var sample = 0; sample < inputBuffer.length; sample++) {
      if (sample % 100 === 0)
        console.log("Sample " + sample, inputData[sample]);
      // make output equal to the same as the input
      outputData[sample] = inputData[sample];

      // add noise to each output sample
      outputData[sample] += (Math.random() * 2 - 1) * 0.1;
    }
  }
};
