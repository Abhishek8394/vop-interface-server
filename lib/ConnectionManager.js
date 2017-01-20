const UTILITY = require('./utility.js');
const IOLIB = require('./IOLibrary.js');
var utility = new UTILITY();
var customiolib = new IOLIB();
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
function VOPConnection(){
	this.socket=undefined;
	this.readHandler = undefined;
	this.writeHandler = undefined;
	this.IOlibHolder = undefined;	
};
VOPConnection.prototype.initializeConnection = function(socket){
	this.socket = socket;
	this.IOlibHolder = new IOLIB();
	this.readHandler = this.IOlibHolder.TCPReader;
	this.writeHandler = this.IOlibHolder.TCPWriter;
	this.socket.on('data',function(buff){this.read(buff);});
	// console.log("vop intitalized");
};
VOPConnection.prototype.getSocket = function(){
	return this.socket;
};
VOPConnection.prototype.read = function(buffer){
	var inc =  this.readHandler(buffer);
	console.log("vop got: ");
	console.log(inc);
};

VOPConnection.prototype.write=function(msgobj){
	this.writeHandler(this.socket,msgObj);
};
var AppConnection = function(){
	this.appname = "";
	this.connType=undefined;
	this.socket = undefined;
	this.state = AppConnectionStates.UNCONNECTED;
	this.readHandler = undefined;
	this.writeHandler = undefined;
	this.IOlibHolder = undefined;
	
};
AppConnection.prototype.initializeConnection = function(socket,typeOfConn,name=""){
	this.socket=socket;
	this.connType = typeOfConn;
	this.IOlibHolder = new IOLIB();
	if(name==""){
		this.state = AppConnectionStates.REGISTERING;
		this.appname = utility.generateTempName();
	}
	else{
		this.state=AppConnectionStates.CONNECTED;
		this.appname = name;
	}
	switch(typeOfConn){
		case ConnectionTypes.APP:
			this.readHandler = this.IOlibHolder.TCPReader;
			this.writeHandler = this.IOlibHolder.TCPWriter;
			this.socket.on('data',function(b){this.read(b);});
			break;
		case ConnectionTypes.WSS:
			this.readHandler = this.IOlibHolder.WSReader;
			this.writeHandler = this.IOlibHolder.WSWriter;
			this.socket.on('message',function(b){this.read(b);});
			break;
	}
	console.log(this.appname+" intitalized");
};

// Receives Application ID. TODO: verify with a secret api key.
AppConnection.prototype.registerName = function(name){
	this.appname = name;
	this.state = AppConnectionStates.CONNECTED;
};

AppConnection.prototype.getName = function(){return this.appname;};

// Perform state management. Accept and forward requests only after obtaining application id.
AppConnection.prototype.read = function(buffer){
	// var inc =  this.readHandler(buffer);
	// console.log(this.getName()+": ");
	// console.log(inc);
};

// Write to this connection. Do NOT send messages from vop unless applicatin id established.
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
var ConnectionsManager = function(){
	this.appConnections={};
	this.vopConnection;
	
};
ConnectionsManager.prototype.addAppConnection = function(appConnObj){
	if(this.appConnections[appConnObj.getName()]==undefined){
		this.appConnections[appConnObj.getName()] = appConnObj;
		return true;
	}
	else{
		// connection with that name already exists. Prevent overwrite.
		return undefined;
	}
};
//  create and add an instance of AppConnection to the connection manager's list of app connections.
ConnectionsManager.prototype.createAppConnectionObject=function(socket,typeOfConn,name=""){
	var appconn = new AppConnection();
	appconn.initializeConnection(socket,typeOfConn);
	// Just in case random naming scheme clashes.
	for(var i=0;i<10;i++){
		if(this.addAppConnection(appconn)==undefined){
			appconn.initializeConnection(socket,typeOfConn);
		}
		else{
			break;
		}
	}
	return appconn;
};
// Copy of created connection object is returned. 
// Creates appropriate type of connection object.
ConnectionsManager.prototype.newConnectionHandler = function(socket,typeOfConn){
	var co=undefined;
	switch(typeOfConn){
		case ConnectionTypes.VOP:
			this.vopConnection = new VOPConnection();
			this.vopConnection.initializeConnection(socket);			
			console.log("peep: "+this.vopConnection.readHandler);
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
module.exports = {
	ConnectionsManager:ConnectionsManager,
	AppConnectionStates:AppConnectionStates,
	ConnectionTypes:ConnectionTypes,
	VOPConnection:VOPConnection,
	AppConnection:AppConnection
}