const startBtn = document.querySelector("#start");
const stopBtn = document.querySelector("#stop");
// parse microphone audio in real time through BufferNodes

startBtn.onclick = record_microphone;
stopBtn.onclick = stop_microphone;

var audio_context;

var BUFF_SIZE = 512;

var microphone_data = {};

try {
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  audio_context = new AudioContext();
  console.log("Audio context established.");
} catch (e) {
  alert(
    "Web Audio API is not supported by this browser and/or its current config\n"
  );
}

function process_microphone_buffer(event) {
  // NEED THIS TO BE CALLED
  console.log("IN");
  var microphone_buffer = event.inputBuffer.getChannelData(0);

  console.log("microphone_buffer.length ", microphone_buffer.length);
}

function on_error(e) {
  console.log(e);
}

function start_microphone() {
  microphone_data.microphone_stream = audio_context.createMediaStreamSource(
    microphone_data.media_stream
  );

  microphone_data.script_processor_node = audio_context.createScriptProcessor(
    BUFF_SIZE,
    1,
    0
  );

  microphone_data.script_processor_node.onaudioprocess = process_microphone_buffer;

  microphone_data.microphone_stream.connect(
    microphone_data.script_processor_node
  );
  microphone_data.microphone_stream.connect(audio_context.destination);

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
      microphone_data.media_stream = stream;
      start_microphone();
    },

    on_error
  );
}

function stop_microphone() {
  microphone_data.microphone_stream.disconnect();
  microphone_data.script_processor_node.disconnect();
  microphone_data.media_stream.getAudioTracks()[0].stop();
  microphone_data.script_processor_node.onaudioprocess = null;

  console.log("Microphone now stopped");
}
