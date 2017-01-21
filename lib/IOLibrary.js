var IOLIB=function(){};
const UTILITY = require('./utility.js');
var utility = new UTILITY();

// doesn't really read. Just for naming consistency
IOLIB.prototype.TCPReader = function(buffer){
	var buffData = utility.jsonify(buffer);
	return buffData;
};

//TODO attach handlers for write finished
IOLIB.prototype.TCPWriter = function(socket,msgObj,callback=null,asJson = true,encoding="utf8"){
	if(asJson){		
		return socket.write(utility.getJSONString(msgObj),encoding,callback);
	}
	else{
		return  socket.write(msgObj,encoding,callback);
		// socket.write(utility.VOP_EOF_SPECIAL);
	}
};

// doesn't really read. Just for naming consistency
IOLIB.prototype.WSReader = function(buffer){
	return utility.jsonify(buffer);
};

//TODO attach handlers for write finished
IOLIB.prototype.WSWriter = function(websocket,dataObj){
	websocket.send(utility.getJSONString(dataObj));
};

module.exports = IOLIB;