var Worker = function(){
	this.workerBuffer = [];
	this.recLen = 0;
}
Worker.prototype.addData = function(data){
	// store only what's needed. Receives extra stuff in case want to move storage elsewhere in future.
	// console.log(data.buffer[0]);
	this.workerBuffer.push(data.buffer[0]);
	this.recLen+=data.buffer[0].length;
};
Worker.prototype.getData = function(){
	return this.workerBuffer;
};
// create one long array out of all contents in buffer.
Worker.prototype.mergeBuffers = function(){
	var buff = new Float32Array(this.recLen);
	console.log(this.workerBuffer);
	var offset = 0;
	for(var i=0;i<this.workerBuffer.length;i++){
		buff.set(this.workerBuffer[i],offset);
		offset+=this.workerBuffer[i].length;
	}
	return buff;
};

Worker.prototype.reset = function(){
	this.workerBuffer = [];
	this.recLen = 0;
};

// downsample the audio.
Worker.prototype.downSample = function(buff, currentSampleRate, downSampleRate = 16000){
	if(currentSampleRate==downSampleRate){
		return buff;
	}
	var sampleRateRatio = currentSampleRate / downSampleRate;
	var newLength = Math.round(buff.length / sampleRateRatio);
	var result = new Float32Array(newLength);
	var offsetResult = 0;
	var offsetBuffer = 0;
	while(offsetResult<result.length){
		var nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
		var acc = 0;
		var count = 0;
		for(var i=offsetBuffer;i<nextOffsetBuffer && i<buff.length; i++){
			acc += buff[i];
			count++;
		}
		result[offsetResult] = acc/count;
		offsetResult++;
		offsetBuffer = nextOffsetBuffer;
	}
	return result;
};

function floatTo16BitPCM(output, offset, input){
  for (var i = 0; i < input.length; i++, offset+=2){
    var s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function writeString(dataBuff, offset, strData){
	for (var i = 0; i < strData.length; i++){
        dataBuff.setUint8(offset + i, strData.charCodeAt(i));
      }
};

function blobToBase64(blob, cb) {
  var reader = new FileReader();
  reader.onload = function() {
    var dataUrl = reader.result;
    // console.log(reader.result);
    var base64 = dataUrl.split(',')[1];
    cb(base64);
  };
  reader.readAsDataURL(blob);
};

Worker.prototype.encodeWAV = function(samples, sampleRate) {
      var buffer = new ArrayBuffer(44 + samples.length * 2);
      var view = new DataView(buffer);
 
      writeString(view, 0, 'RIFF');
      view.setUint32(4, 32 + samples.length * 2, true);
      writeString(view, 8, 'WAVE');
      writeString(view, 12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeString(view, 36, 'data');
      view.setUint32(40, samples.length * 2, true);
      floatTo16BitPCM(view, 44, samples);
      return view;
    };

var worker = new Worker();