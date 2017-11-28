const UTILITY = require('./utility.js');
const IOLIB = require('./IOLibrary.js');
const eventEmitter = require('events');

var utility = new UTILITY();
var customiolib = new IOLIB();
var cmEventEmitter = new eventEmitter();
var byPassAppRegistration = false; 			// Turn this to true for all uses. False only for network debugging.
// Maintain states to get proper connections established. Connecting applications must register a app ID
const AppConnectionStates = {
	UNCONNECTED:1,
	REGISTERING:2,
	CONNECTED:3
};
const ConnectionTypes={
	VOP:1,
	APP:2,
	WSS:3,
	TALKBACKWSS: 4
};

// ----------------------------------- VOPConnection --------------------------------------------------------------------------------------------
/**
* Use this class for connections from VOP
* @constructor
*/
function VOPConnection(){
	this.socket=undefined;
	this.readHandler = undefined;
	this.writeHandler = undefined;	
	this.msgBuffer="";
};

/**
* Initialize various connection Parameters, handlers
* @param {net.Socket} socket - The socket that connects to VOP
*/
VOPConnection.prototype.initializeConnection = function(socket){
	this.socket = socket;
	this.readHandler = customiolib.TCPReader;
	this.writeHandler = customiolib.TCPWriter;
	var selfPtr = this;
	this.socket.on('data',function(buff){selfPtr.read(buff);});
	this.socket.on('close',function(hadError){selfPtr.closeHandler(hadError);});
	// console.log("vop intitalized");
};

/**
* get the socket object for given vop connection
* @return {net.Socket} socket - Returns the socket corresponding VOPConnectionObject. May return undefined.
*/
VOPConnection.prototype.getSocket = function(){
	return this.socket;
};

/** 
* Read and process the socket data.
* @param {Buffer/String} buffer - As passed by net.Socket event 'data'
* Emits:
*  - vopReceivedData: The event notifying interested listeners about receivind data from VOP. Emitted only if a valid message is received.
*/
VOPConnection.prototype.read = function(buffer){
	this.msgBuffer+=buffer;
	// console.log(this.msgBuffer);		
	var res = utility.extractAllJSONStrings(this.msgBuffer);
	this.msgBuffer = res.leftover;
	for(message of res.jsonStringArray){		
		var inc =  this.readHandler(message);
		if(inc==undefined){
			console.log("VOP: invalid format: "+message);
			return;
		}
		// Emit event to let connection manager this.
		cmEventEmitter.emit("vopReceivedData",this,inc); 
		console.log("vop sent this: ");
		console.log(inc);
	}
};

/**
* Converts a msgObj into JSON string and sends to the VOP
* @param {object} msgObj - An object that is to be sent to VOP. Must be JSON serializable and in accordance with the protocols.
*/
VOPConnection.prototype.write=function(msgObj){
	msgObj.currentTime = new Date();
	this.writeHandler(this.socket,msgObj);
	console.log("to vop");
	console.log(JSON.stringify(msgObj,null," "));
};

/**
* Handler for handling the event of connection being closed. Emit an event to inform the connections manager and perform any cleanup if required
* @param {boolean} hadError - boolean indicating if the connection was closed due to an error.
* Emits:
*  - vopDisconnected: The event indicating that connection to VOP is lost.
*/
VOPConnection.prototype.closeHandler = function(hadError){
	this.read(this.buffer);
	console.log("vop disconnected");
	cmEventEmitter.emit("vopDisconnected");
};

// ----------------------------------- AppConnection --------------------------------------------------------------------------------------------
/**
* Use this connection for client app connnections as well as web socket connections.
* @constructor
*/
function AppConnection(){
	this.appname = "";
	this.appId="";
	this.connType=undefined;
	this.socket = undefined;
	this.state = AppConnectionStates.UNCONNECTED;
	this.readHandler = undefined;
	this.writeHandler = undefined;	
	this.msgBuffer="";
};

/**
* Initialize connection attributes and attach handlers to socket
* @param {net.Socket / WebSocket} socket - The socket object corresponding to a connection
* @param {int} typeOfConn - The type of connection, must be one of ConnectionTypes.{WSS, APP}
* @param {String} name - Name of the connection, This name is used to route requests.
*/
AppConnection.prototype.initializeConnection = function(socket,typeOfConn,name){
	this.socket=socket;
	this.connType = typeOfConn;
	this.state=AppConnectionStates.REGISTERING;
	this.appname = name;
	var selfPtr = this;
	switch(typeOfConn){
		case ConnectionTypes.APP:
			this.readHandler = customiolib.TCPReader;
			this.writeHandler = customiolib.TCPWriter;
			// Ensure data handling doesn't interrupt initialization process
			process.nextTick(function(){
				selfPtr.socket.on('data',function(b){selfPtr.bufferedReader(b);});			
			});
			break;
		case ConnectionTypes.WSS:
			this.readHandler = customiolib.WSReader;
			this.writeHandler = customiolib.WSWriter;
			// Ensure data handling doesn't interrupt initialization process
			process.nextTick(function(){				
				selfPtr.socket.on('message',function(b){selfPtr.bufferedReader(b);});
			});
			break;
	}
	this.socket.on('close',function(hadError){selfPtr.closeHandler(hadError);});
	console.log(this.appname+" intitalized");
};

/**
* Receives Application ID. 
* TODO: verify with a secret api key.
* @param {String} name - Name/ID of the connection. Used to identify the app.
* Emits:
*  - appRename: Event indicating the registration of an app by given name.
*/
AppConnection.prototype.registerName = function(name){
	var oldName = this.appname;
	this.appname = name;
	this.state = AppConnectionStates.CONNECTED;
	cmEventEmitter.emit("appRename",oldName,this);
};

/**
* @return {string} appname - return app name this connection maps to. Used for routing requests.
*/
AppConnection.prototype.getName = function(){return this.appname;};

/**
* [Deprecated] Perform state management. Accept and forward requests only after obtaining application id. 
* Will emit event/accept messages only if app has successfully registered itself.
* NOTE: Do not use this method. Use BufferedReader instead.
* @param {Buffer / String} buffer - object passed by event 'data' of net.Socket.
* Emits:
*  - appReceivedData: Notify about the data received.
*/
AppConnection.prototype.read = function(buffer){
	var incMsg =  this.readHandler(buffer);
	console.log(this.getName()+": ");
	console.log(buffer);
	if(incMsg==undefined){return;}
	// If app hasn't registered with an app name/id, treat all messages as app registration. Do NOT allow anything unless registered.
	if(this.state==AppConnectionStates.REGISTERING && !byPassAppRegistration){
		if(incMsg.appname!=undefined){
			this.registerName(incMsg.appname);
			this.state=AppConnectionStates.CONNECTED;
			console.log("registered");
		}
	}
	// Process any request only if in this state
	else if((this.state==AppConnectionStates.CONNECTED) || byPassAppRegistration){
		// forward all messages to Connection Manager.
		cmEventEmitter.emit("appReceivedData",this,incMsg); 
		this.write({from:"nodeJS",msg:buffer});
	}
};
// 
/**
* Deal with partitioned messages. Not working due to bug in utility.
* Will emit event/accept messages only if app has successfully registered itself.
* @param {Buffer / String} buffer - object passed by event 'data' of net.Socket.
* Emits:
*  - appReceivedData: Notify about the data received.
*/
AppConnection.prototype.bufferedReader = function(buffer){
	this.msgBuffer+=buffer;
	// console.log(this.msgBuffer);		
	var res = utility.extractAllJSONStrings(this.msgBuffer);
	this.msgBuffer = res.leftover;
	for(message of res.jsonStringArray){	
		var incMsg =  this.readHandler(message);
		// console.log(this.getName()+": ");
		// console.log(message);
		if(incMsg==undefined){return;}
		// If app hasn't registered with an app name/id, treat all messages as app registration. Do NOT allow anything unless registered.
		if(this.state==AppConnectionStates.REGISTERING && !byPassAppRegistration){
			if(incMsg.appname!=undefined){
				this.registerName(incMsg.appname);
				this.state=AppConnectionStates.CONNECTED;
				console.log(incMsg.appname+" registered");
			}
		}
		// Process any request only if in this state
		else if((this.state==AppConnectionStates.CONNECTED) || byPassAppRegistration){
			// forward all messages to Connection Manager.
			cmEventEmitter.emit("appReceivedData",this,incMsg); 
			// echo back for debugging
			// this.write({from:"nodeJS",msg:message});
		}
	}	
};
/**
* Cleanup and inform connections manager about an app disconnecting
* @param {boolean} hasError - Boolean indicating if closed by error or not
* Emits:
*  - appConnectionClosed: Notify about losing connection to this app.
*/
AppConnection.prototype.closeHandler = function(hasError){
	console.log(this.getName() + "closed");
	cmEventEmitter.emit("appConnectionClosed",this);
};

/**
* Write to application associated with this connection. Do NOT send messages from vop unless applicatin id established.
* @param {object} msgObj - Message to be sent to App. Must be JSON serializable and in accordance to protocols.
* @param {function} callback - Callback to call after attempting to write the message.
* @param {boolean} asJSON - True if object is to be sent as JSON. 
* @param {string} encoding - encoding to use for data transmission.
*/
AppConnection.prototype.write=function(msgObj,callback=null,asJson = true,encoding="utf8"){
	switch(this.connType){
		case ConnectionTypes.APP:
			return this.writeHandler(this.socket,msgObj,callback,asJson,encoding);
		case ConnectionTypes.WSS:
			return this.writeHandler(this.socket,msgObj);
		// Shouldn't reach here but in case debugging with a new connection type
		default:
			return this.writeHandler(this.socket,msgObj,callback,asJson,encoding);
	}
};

// ----------------------------------- ConnectionsManager --------------------------------------------------------------------------------------------
/**
* Holds references to connections along with their names. Used for routing of requests.
* Let connection manager handle incoming data
* @constructor
*/
function ConnectionsManager(){
	this.appConnections={};
	this.talkbackSocket = undefined;
	this.vopConnection;
	var selfPtr = this;

	// Attach handlers for various events.
	cmEventEmitter.on("appRename",function(oldName,connObj){
		selfPtr.handleAppRename(oldName,connObj);
	});
	cmEventEmitter.on("vopDisconnected",function(){
		selfPtr.vopConnection = undefined;
	});
	cmEventEmitter.on("appConnectionClosed",function(appconn){
		selfPtr.removeApp(appconn);
	});
	cmEventEmitter.on("appReceivedData",function(appconn,msgObj){
		selfPtr.appMessageReceiver(appconn,msgObj);
	});
	cmEventEmitter.on("vopReceivedData",function(vopconn,msgObj){
		selfPtr.vopMessageReceiver(vopconn,msgObj);
	})
};

/**
* Handle App Rename. Invoked when connected app identifies itself. Assumes input is sanitized data, responsibility of caller to provide valid args
* @EventListener (appRename)
* @callback 
* @param {String} oldName - old name of app in case it is a rename / reconnection.
* @appconn {AppConnection} appconn - Corresponding AppConnection object 
*/
ConnectionsManager.prototype.handleAppRename = function(oldName,appconn){
	delete this.appConnections[oldName];
	this.appConnections[appconn.getName()] = appconn;
	// console.log(this.appConnections);
};

/**
* Check if given app is currently connected
* @param {string} appname - Name / ID of app 
*/
ConnectionsManager.prototype.containsApp=function(appname) {
	return this.appConnections[appname]!=undefined;
};

/**
* Create and add an instance of AppConnection to the connection manager's list of app connections.
* @param {Socket} socket - Can be a net.Socket or WebSocket. 
* @param {int} typeOfConn - Type of connection. Must be one of ConnectionTypes.{APP, WSS}
* @param {string} name - Name of app.
* @return {AppConnection} - AppConnection object corressponding to given socket connection.
*/
ConnectionsManager.prototype.createAppConnectionObject=function(socket,typeOfConn,name=""){
	var appconn = new AppConnection();
	var tmpName = utility.generateTempName();
	if(name!=""){tmpName=name;}
	// Just in case random naming scheme clashes.
	for(var i=0;i<10;i++){
		if(this.containsApp(tmpName)){
			tmpName = utility.generateTempName();
		}
		else{
			break;
		}
	}
	appconn.initializeConnection(socket,typeOfConn,tmpName);
	this.appConnections[appconn.getName()] = appconn;
	return appconn;
};

/**
* Maintain reference to talkback socket. 
* @TODO: Maintain based on user IDs
* @param {Socket} socket - A websocket usually, to which to send responses from apps.
*/
ConnectionsManager.prototype.createTalkbackConnectionObject=function(socket){
	this.talkbackSocket = socket;
}

/**
* Copy of created connection object is returned. 
* Creates appropriate type of connection object.
* @param {Socket} socket - Socket corressponding to given connection.
* @param {int} typeOfConn - Type of connection. Must be one of ConnectionTypes.{APP, WSS, VOP}
* @return {VopConnection / AppConnection} - Returns connection object based on connection type.
*/
ConnectionsManager.prototype.newConnectionHandler = function(socket,typeOfConn){
	var co=undefined;
	switch(typeOfConn){
		case ConnectionTypes.VOP:
			this.vopConnection = new VOPConnection();
			this.vopConnection.initializeConnection(socket);			
			return this.vopConnection;
			break;
		case ConnectionTypes.APP:
			co = this.createAppConnectionObject(socket,typeOfConn);			
			break;
		case ConnectionTypes.WSS:
			co = this.createAppConnectionObject(socket,typeOfConn);
			break;
		case ConnectionTypes.TALKBACKWSS:
			co = this.createTalkbackConnectionObject(socket);
			break;
	}
	return co;
};

/**
* Remove reference to app that closed connection
* @param {AppConnection} appconn - AppConnection object corressponding to app to be removed,
*/
ConnectionsManager.prototype.removeApp=function(appconn){
	if(this.appConnections[appconn.getName()]!=undefined){
		delete this.appConnections[appconn.getName()];
	}
	console.log("closed ");
	// console.log(this.appConnections);
};

/**
* Get connection for an app. Return undefined if it doesn't exist.
* @param {string} appname - Name / ID of app.
*/
ConnectionsManager.prototype.getAppConnection=function(appname){	
	return this.appConnections[appname];
};

/**
* Send data to VOP
* @param {String} senderName - Name of app that sent the message.
* @param {object} msgObj - Message object to send to VOP. Must be JSON serializable and follow the protocols.
*/
ConnectionsManager.prototype.sendToVop = function(senderName, msgObj){
	if(this.vopConnection!=undefined){
		this.vopConnection.write({from:senderName,msg:msgObj});
		console.log("fwding to vop from "+senderName);
	}
	else{
		console.log("vop not connected yet.");
	}
};

/**
* Handle Incoming data from Apps.
* @param {AppConnection} appconn - AppConnection for app that wants to send message to VOP
* @param {object} msgObj - Message that should be sent to VOP. Must be JSON serializable and follow the protocols.
*/
ConnectionsManager.prototype.appMessageReceiver=function(appconn,msgObj){
	// forward to VOP
	this.sendToVop(appconn.getName(), msgObj)
};

/**
* Handle Incoming data from VOP.
* @param {VopConnection} vopconn - VopConnection object corresponding to VOP
* @param {object} msgObj - Message received from VOP. Must contain a "to" field and a "msg" field. "msg" is sent to "to".
*/
ConnectionsManager.prototype.vopMessageReceiver=function(vopconn,msgObj){
	// forward to corresponding app
	if(this.getAppConnection(msgObj.to)!=undefined){
		console.log("sending to "+msgObj.to);
		// this.getAppConnection(msgObj.to).write({from:"vop",msg:msgObj.msg});
		this.getAppConnection(msgObj.to).write(msgObj.msg);
	}
	else{		
		console.log("target app not found: "+msgObj.to);
	}
};

module.exports = {
	ConnectionsManager:ConnectionsManager,
	AppConnectionStates:AppConnectionStates,
	ConnectionTypes:ConnectionTypes,
	VOPConnection:VOPConnection,
	AppConnection:AppConnection
}