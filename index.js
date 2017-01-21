const WebSocket = require('ws');
const fs = require('fs');
const https = require('https');
const http = require('http');
const express = require('express');
const net = require('net');
//  Custom libs
const UTILITY = require('./lib/utility.js');
const CONNECTION_MANAGER_LIB = require('./lib/ConnectionManager.js');
const ConnectionTypes = CONNECTION_MANAGER_LIB.ConnectionTypes;
const VOPConnection = CONNECTION_MANAGER_LIB.VOPConnection;
const AppConnection = CONNECTION_MANAGER_LIB.AppConnection;

var connectionsManager = new CONNECTION_MANAGER_LIB.ConnectionsManager();
var utility = new UTILITY();
// Settings -------------------------
var useSecureServerWebSocket = false; 				// If websocket server should listen on secure/unsecure connection
var webSocketPort = 8080; 							// Port websocket server listens to
var privateKey = fs.readFileSync('cert/key.pem'); 	// for websocket server
var certificate = fs.readFileSync('cert/cert.pem'); // for websocket server
var TCP_SERVER_PORT_VE = 11917; 					// TCP connection port to be used by voice engine
var TCP_SERVER_PORT_APPS = 12050; 					// TCP connection port for rest of the clients to connect to.
var vopServerEncoding = "utf8"; 					// Interpret data from vop as a string of this encoding
var appServerEncoding = "utf8"; 					// Interpret data from client apps as a string of this encoding
var enableWebSockServer = true;						// Switch for Web Socket Server
var enableAppServer = true;							// Switch for App Server
//  ---------------------------------
/*
* Inititalize web socket servers
*/
function startWebSocketServers(){

	var credentials = {key:privateKey,cert:certificate};
	var app = express();
	var httpsServer;
	app.use(function(req, res, next) {
	  res.header("Access-Control-Allow-Origin", "*");
	  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	  next();
	});

	if(useSecureServerWebSocket){
		httpsServer = https.createServer(credentials,App);
	}
	else{
		httpsServer = http.createServer(app);	
	}

	httpsServer.listen(webSocketPort);
	const wss = new WebSocket.Server({ server: httpsServer,path:'/hi'});
	const wss2 = new WebSocket.Server({ server: httpsServer,path:'/speech'});
	wss.on('connection', function connection(ws) {
		connectionsManager.newConnectionHandler(ws,ConnectionTypes.WSS);
	});
	wss2.on('connection', function connection(ws) {
	  ws.on('message', function incoming(message) {
	    console.log('speech server side received: %s', message);
		var msg = {"echo":message,"extra":"something"};
		ws.send('speech!');
		wss.clients.forEach(function each(client){
			if(client.readyState == WebSocket.OPEN){
				client.send("get this!");
			}
		});
	  });
	});
}

// server for speech recognition module (called vop) 
function startSpeechServer(){	
	var vopServSocket;
	var vopconobj ;
	var vopServer = net.createServer((socket)=>{
		vopServSocket = socket;
		vopServSocket.setEncoding(vopServerEncoding);
		vopconobj = connectionsManager.newConnectionHandler(vopServSocket,ConnectionTypes.VOP);
		console.log("vop connected");
	});
	vopServer.on('error',function(err){
		console.log("vop server: error connecting");
	});
	vopServer.listen(TCP_SERVER_PORT_VE,function(){
		console.log("vop server: listening on "+TCP_SERVER_PORT_VE);
	});
}

// Server for other applications
function startAppServer(){	
	var otherAppServer = net.createServer((s)=>{
		s.setEncoding(appServerEncoding);
		var aco = connectionsManager.newConnectionHandler(s,ConnectionTypes.APP);
		// console.log("foo "+connectionsManager.VOPConnection);
		console.log("new app connected: "+aco.getName());
	});
	otherAppServer.on('error',function(err){
		console.log("app server: error connecting");
	});
	otherAppServer.listen(TCP_SERVER_PORT_APPS,function(){
		console.log("app server listening on "+TCP_SERVER_PORT_APPS);
	});
}
//  main function equivalent
process.on('uncaughtException',function(err){
	console.log(err);	
});
startSpeechServer();
if(enableWebSockServer){
	startWebSocketServers();
}
if(enableAppServer){
	startAppServer();
}

// // Send msgObj to connection at socket. By default sends as a JSON string. 
// // callback to register a handler when message finally sent
// // Set asJson to false to send msgObj as is (sender responsible for setting encoding). 
// // returns same value as node js net.socket.write() method.
// function sendMessage(socket,msgObj,callback=null,asJson = true,encoding="utf8"){
// 	if(asJson){		
// 		return socket.write(utility.getJSONString(msgObj),encoding,callback);
// 	}
// 	else{
// 		return socket.write(msgObj,encoding,callback);
// 	}
// }

// // Handle message received by vop
// function vopMessageHandler(buffer){
// 	console.log(buffer);
// 	var buffData = utility.jsonify(buffer);
// 	if(buffData!=undefined){
// 		if(buffData["msg"]=="hello"){
// 			sendMessage(vopServSocket,"yo");
// 		}
// 	}
// }
// // Handle messages from client apps
// function appsMessageHandler(buffer){
// 	console.log(buffer);
// }
