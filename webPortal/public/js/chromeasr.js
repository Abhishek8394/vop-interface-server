var recognition = new webkitSpeechRecognition();
var recognizing = false;
var ignore_onend;
var info = $("#asr-info-messages")[0];
var final_span = document.getElementById("final_span");
var interim_span = document.getElementById("interim_span");
var final_transcript ="";

window.onload = function(){ 
	recognizing = false;	
	info = $("#asr-info-messages")[0];
	final_span = document.getElementById("textInput");
	interim_span = document.getElementById("interim_span");	
	final_transcript ="";
};

recognition.continuous = true;
recognition.interimResults = false;
recognition.lang = "en-US";
console.log(recognition);


	function showInfo(s){
		if (s) {
		    for (var child = info.firstChild; child; child = child.nextSibling) {
		      if (child.style) {
		        child.style.display = child.id == s ? 'inline' : 'none';
		      }
		    }
		    info.style.visibility = 'visible';
		} 
		 else {
		    info.style.visibility = 'hidden';
		}
	}

	recognition.onstart = function() {
		console.log("Start!");
		recognizing = true;
		showInfo('info_speak_now');
		// start_img.src = 'mic-animate.gif';
	};

	recognition.onerror = function(event) {
		if (event.error == 'no-speech') {
		  // start_img.src = 'mic.gif';
		  showInfo('info_no_speech');
		  ignore_onend = true;
		}
		if (event.error == 'audio-capture') {
		  // start_img.src = 'mic.gif';
		  showInfo('info_no_microphone');
		  ignore_onend = true;
		}
		if (event.error == 'not-allowed') {
		  if (event.timeStamp - start_timestamp < 100) {
		    showInfo('info_blocked');
		  } else {
		    showInfo('info_denied');
		  }
		  ignore_onend = true;
		}
	};

	recognition.onend = function() {
		recognizing = false;
		if (ignore_onend) {
		  return;
		}
		// start_img.src = 'mic.gif';
		if (!final_transcript) {
		  showInfo('info_start');
		  return;
		}
		showInfo('');
		if (window.getSelection) {
		  window.getSelection().removeAllRanges();
		  var range = document.createRange();
		  range.selectNode(document.getElementById('final_span'));
		  window.getSelection().addRange(range);
		}
	};

	recognition.onresult = function(event) {
		var interim_transcript = '';
		for (var i = event.resultIndex; i < event.results.length; ++i) {
			if (event.results[i].isFinal) {
			    final_transcript += event.results[i][0].transcript;
			} else {
			    interim_transcript += event.results[i][0].transcript;
			}
		}
		final_transcript = (final_transcript);
	    final_span.value = (final_transcript);
	    interim_span.innerHTML = (interim_transcript);
	    if (final_transcript || interim_transcript) {
		    // showButtons('inline-block');
		    sendText();
	    }
	  };


function startButton(event) {
  // console.log(event);
  if (recognizing) {
    recognition.stop();
    return;
  }
  final_transcript = '';
  recognition.lang = "en-US";
  recognition.start();
  ignore_onend = false;
  final_span.value = '';
  interim_span.innerHTML = '';
  // start_img.src = 'mic-slash.gif';
  showInfo('info_allow');
  // showButtons('none');
  start_timestamp = event.timeStamp;
}

function stopButton(event){
	// console.log(event);
	if (recognizing) {
	    recognition.stop();
	    return;
	}
}