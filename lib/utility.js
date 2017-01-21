var UTILITY = function(){};

// EOF symbol used to buffer entire message before processing. Not suitable for streaming data but works fine for current situation.
UTILITY.prototype.EOF_SYMBOL = "VOP_EOF_SPECIAL"; 

// Random Integer generator
UTILITY.prototype.getRandomInt = function (min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
};

UTILITY.prototype.getJSONString = function (obj){
	return JSON.stringify(obj,null,' ');
};
UTILITY.prototype.jsonify = function (buff){
	var jb;
	try{
		jb = JSON.parse(buff);
	}
	catch(e){
		console.log("jsonify error");
		// console.log(e);
		jb =  undefined;
	}
	return jb;
};
UTILITY.prototype.generateTempName = function (){
	return "temp" + this.getRandomInt(1,10000)+"-"+this.getRandomInt(10000,100000);
};


// Extract complete msg string from a given string. Since just two properties, they are directly accessed. Do not change return result keys.
UTILITY.prototype.extractJSONString = function(buffer){
	var EOFIndex = buffer.indexOf(this.EOF_SYMBOL);
	if(EOFIndex==-1){
		console.log("noe eof");
		return {jsonString:undefined,leftover:buffer};
	}
	console.log(EOFIndex+" "+buffer.substring(EOFIndex,EOFIndex + EOFIndex.length));
	return {
		jsonString:buffer.substring(0,EOFIndex).trim(),
		leftover:buffer.substring(EOFIndex,EOFIndex + EOFIndex.length)
	};
};
UTILITY.prototype.extractAllJSONStrings = function(buffer){
	var jsonStrs=[];
	var ejs = this.extractJSONString(buffer);
	if(ejs.jsonString==undefined){
		return {
			jsonStringArray:[],
			leftover:ejs.leftover
		};
	}
	console.log(ejs);
	return {
			jsonStringArray:[],
			leftover:ejs.leftover
		};
	while(ejs.jsonString!=undefined){
		jsonStrs.push(ejs.jsonString);
		ejs = this.extractJSONString(ejs.leftover);
	}
	return {
		jsonStringArray:jsonStrs,
		leftover:ejs.leftover
	};
};
module.exports = UTILITY;