const UTILITY = require('./utility.js');
const IOLIB = require('./IOLibrary.js');
const eventEmitter = require('events');

var utility = new UTILITY();
var customiolib = new IOLIB();
var cmEventEmitter = new eventEmitter();
// Maintain states to get proper connections established. Connecting applications must register a app ID
const AppConnectionStates = {
	UNCONNECTED:1,
	REGISTERING:2,
	CONNECTED:3
};
const ConnectionTypes={
	VOP:1,
	APP:2,
	WSS:3
};

// ----------------------------------- VOPConnection --------------------------------------------------------------------------------------------
// Use this class for connections from VOP
function VOPConnection(){
	this.socket=undefined;
	this.readHandler = undefined;
	this.writeHandler = undefined;	
};

// Initialize various connection Parameters, handlers
VOPConnection.prototype.initializeConnection = function(socket){
	this.socket = socket;
	this.readHandler = customiolib.TCPReader;
	this.writeHandler = customiolib.TCPWriter;
	var selfPtr = this;
	this.socket.on('data',function(buff){selfPtr.read(buff);});
	this.socket.on('close',function(hadError){selfPtr.closeHandler(hadError);});
	// console.log("vop intitalized");
};

// get socket object for given vop connection
VOPConnection.prototype.getSocket = function(){
	return this.socket;
};

// Read and process the socket data
VOPConnection.prototype.read = function(buffer){
	var inc =  this.readHandler(buffer);
	console.log("vop got: ");
	console.log(inc);
};

// Converts a msgObj into JSON string and sends to the VOP
VOPConnection.prototype.write=function(msgobj){
	this.writeHandler(this.socket,msgObj);
};

// Handler for handling when connection is closed. Emit an event to inform the connections manager and perform any cleanup if required
VOPConnection.prototype.closeHandler = function(hadError){
	console.log("vop disconnected");
	cmEventEmitter.emit("vopDisconnected");
};

// ----------------------------------- AppConnection --------------------------------------------------------------------------------------------
// Use this connection for client app connnections as well as web socket connections.
function AppConnection(){
	this.appname = "";
	this.appId="";
	this.connType=undefined;
	this.socket = undefined;
	this.state = AppConnectionStates.UNCONNECTED;
	this.readHandler = undefined;
	this.writeHandler = undefined;	
};

// Initialize connection attributes and attach handlers to socket
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
				selfPtr.socket.on('data',function(b){selfPtr.read(b);});			
			});
			break;
		case ConnectionTypes.WSS:
			this.readHandler = customiolib.WSReader;
			this.writeHandler = customiolib.WSWriter;
			// Ensure data handling doesn't interrupt initialization process
			process.nextTick(function(){				
				selfPtr.socket.on('message',function(b){selfPtr.read(b);});
			});
			break;
	}
	this.socket.on('close',function(hadError){selfPtr.closeHandler(hadError);});
	console.log(this.appname+" intitalized");
};

// Receives Application ID. TODO: verify with a secret api key.
AppConnection.prototype.registerName = function(name){
	this.appname = name;
	this.state = AppConnectionStates.CONNECTED;
};

// return app name this connection maps to. Used for routing requests
AppConnection.prototype.getName = function(){return this.appname;};

// Perform state management. Accept and forward requests only after obtaining application id.
AppConnection.prototype.read = function(buffer){
	var incMsg =  this.readHandler(buffer);
	console.log(this.getName()+": ");
	console.log(incMsg);
	this.write({from:"nodeJS",msg:buffer});
	// If app hasn't registered with an app name/id, treat all messages as app registration. Do NOT allow anything unless registered.
	if(this.state==AppConnectionStates.REGISTERING){

	}
	// Process any request only if in this state
	if(this.state==AppConnectionStates.CONNECTED){
		// stuff
	}
};
// Deal with partitioned messages. Not working due to bug in utility. TODO: use this instead of read
AppConnection.prototype.bufferedReader = function(buffer){
	this.msgBuffer+=buffer;
	console.log(this.msgBuffer);		
	var res = utility.extractAllJSONStrings(this.msgBuffer);
	this.msgBuffer = res.leftover;
	for(message of res.jsonStringArray){	
		var incMsg =  this.readHandler(message); // incomingMessage as JS object
		console.log(this.getName()+": ");
		console.log(incMsg);
		// return if not a valid JavaScript Object
		if(incMsg==undefined){
			return;
		}
		// If app hasn't registered with an app name/id, treat all messages as app registration. Do NOT allow anything unless registered.
		if(this.state==AppConnectionStates.REGISTERING){
			if(incMsg.appname!=undefined){
				this.appname = incMsg.appname;
				this.state==AppConnectionStates.CONNECTED;
				console.log("registered");
			}
		}
		// Process any request only if in this state
		else if(this.state==AppConnectionStates.CONNECTED){
			// stuff. Echo for now
			this.write({name:"NodeJS server",msg:incMsg});
		}
	}	
};
// Cleanup and inform connections manager about an app disconnecting
AppConnection.prototype.closeHandler = function(hasError){
	console.log(this.getName() + "closed");
	cmEventEmitter.emit("appConnectionClosed",this);
};

// Write to application associated with this connection. Do NOT send messages from vop unless applicatin id established.
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
// Holds references to connections along with their names. Used for routing of requests.
function ConnectionsManager(){
	this.appConnections={};
	this.vopConnection;
	var selfPtr = this;
	cmEventEmitter.on("vopDisconnected",function(){
		selfPtr.vopConnection = undefined;
	});
	cmEventEmitter.on("appConnectionClosed",function(appconn){
		selfPtr.removeApp(appconn);
	});
};

// Check if given app is currently connected
ConnectionsManager.prototype.containsApp=function(appname) {
	return this.appConnections[appname]!=undefined;
};

// Create and add an instance of AppConnection to the connection manager's list of app connections.
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

/* Copy of created connection object is returned. 
 * Creates appropriate type of connection object.
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
	}
	return co;
};

// Remove reference to app that closed connection
ConnectionsManager.prototype.removeApp=function(appconn){
	if(this.appConnections[appconn.getName()]!=undefined){
		delete this.appConnections[appconn.getName()];
	}
	console.log("closed ");
	console.log(this.appConnections);
};

// get connection for an app. Return undefined if it doesn't exist.
ConnectionsManager.prototype.getAppConnection=function(appname){
	return this.appConnections[appname];
};
module.exports = {
	ConnectionsManager:ConnectionsManager,
	AppConnectionStates:AppConnectionStates,
	ConnectionTypes:ConnectionTypes,
	VOPConnection:VOPConnection,
	AppConnection:AppConnection
}