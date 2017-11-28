
function sendData(sendUrl, data, successCallBack, errorCallBack, method="POST", contentType="application/json"){
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.onreadystatechange = function(){
		switch(this.readyState){
			case 1:
				console.log("connection established");
				break;
			case 2:
				console.log("request received");
				break;
			case 3:
				console.log("processing req");
				break;
		}
		if(this.readyState==4){
			if(this.status == 200){
				return successCallBack(this.responseText);
			}
			errorCallBack(this.responseText);

		}
	};
	xmlhttp.open(method, sendUrl, true);
	xmlhttp.setRequestHeader("Content-Type", contentType);
	xmlhttp.send(JSON.stringify(data));	

}

function sendGoogleSpeechRequest(data, successCallBack, errorCallBack, sampleRate){
	// var speechUrl = "https://speech.googleapis.com/v1/speech:recognize?key=AIzaSyBOjYjPU29kpuq6DVbuimRFbcZ93hFmnr4";
	var speechUrl = "http://localhost/voice";
	requestPayload = {
      "config": {
        "encoding":"LINEAR16",
        "sampleRateHertz":sampleRate,
        "languageCode":"en-US"
      },
      "audio": {
        "content": data
      }
    };
    sendData(speechUrl, requestPayload, successCallBack, errorCallBack);
}

function sendText(){
	// var textUrl = "http://vop-interface-server.herokuapp.com/text";
	var textUrl = "http://localhost/text";
	var inputElem = document.querySelector("#textInput");
	var requestPayload = {"textInput":inputElem.value};
	sendData(textUrl, requestPayload, function(d){
		console.log("success sending to textEndpoint");
		console.log(d);
		setStatusBarText("Request sent successfully");
	}, function(e){
		console.log("error sending to textEndpoint");
		console.log(e);
		setStatusBarText("Some error occurred while trying to send request. Check connection and console.");
	});

	setStatusBarText("Sending request...");	
}

function setStatusBarText(txt){
	$('#request-status-bar').text(txt);
}

function keydownhandler(e){
	// pressed enter.
	if(e.keyCode == 13){
		sendText();
	}
	// console.log(e, "change handler");
}

function initialSetup(){
	var inputElem = document.querySelector("#textInput");
	inputElem.onkeydown = keydownhandler;
}

$(function(){
	initialSetup();
});