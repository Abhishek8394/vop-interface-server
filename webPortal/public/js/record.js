var recording = false;

var Recorder = function(audioContext, source){
	this.audioContext = audioContext;
	this.source = source;	
	this.node = this.source.context.createScriptProcessor();	
	this.node.onaudioprocess = function(audioProcessingEvent){
		if(!recording){
			return;
		}
		var data = audioProcessingEvent.inputBuffer.getChannelData(0);
		// console.log(data);
		worker.addData({
			command:'record',
			// since only one channel is there either way, we just pass the first one (index:0).
			buffer: [data]
		});
	};

	this.source.connect(this.node);
};

Recorder.prototype.record = function(){
	worker.reset();
	recording = true;
	console.log("starting recorder.js");
};

var googleResponseHandler = function(data){
	console.log(data);
	var responseElem = document.querySelector("#responseData");
	responseData.innerHTML = data;
};

Recorder.prototype.prepareAudio = function(audio){
	var mBuff = worker.mergeBuffers();
	var sampleRate = 16000;
	console.log("current sample rate: " +  this.audioContext.sampleRate);
	// console.log(mBuff);
	var dsBuff = worker.downSample(mBuff, this.audioContext.sampleRate, sampleRate);
	var encodedWav = worker.encodeWAV(dsBuff, sampleRate);
	var audioBlob = new Blob([encodedWav], {type:'application/octet-stream'});
	blobToBase64(audioBlob, function(base64data){
		// console.log(base64data);
		sendGoogleSpeechRequest(base64data, googleResponseHandler, googleResponseHandler, sampleRate);		
	});
}

Recorder.prototype.stop = function(audio){
	recording = false;
	console.log("stopping recorder.js");
	// console.log(worker.mergeBuffers());
	this.prepareAudio(audio);
};
var recorder = null;