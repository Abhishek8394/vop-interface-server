var UTILITY = function(){};
// Random Integer generator
UTILITY.prototype.getRandomInt = function (min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
};

UTILITY.prototype.getJSONString = function (obj){
	return JSON.stringify(obj,null,'\t');
};
UTILITY.prototype.jsonify = function (buff){
	var jb;
	try{
		jb = JSON.parse(buff);
	}
	catch(e){
		console.log("jsonify error");
		console.log(e);
		jb =  undefined;
	}
	return jb;
};
UTILITY.prototype.generateTempName = function (){
	return "temp" + this.getRandomInt(1,10000)+"-"+this.getRandomInt(10000,100000);
};
module.exports = UTILITY;