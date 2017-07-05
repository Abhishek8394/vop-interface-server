const WebSocket = require('ws');
const fs = require('fs');
const https = require('https');
const http = require('http');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser')
const net = require('net');
//  Custom libs
const UTILITY = require('./lib/utility.js');
const CONNECTION_MANAGER_LIB = require('./lib/ConnectionManager.js');
const ConnectionTypes = CONNECTION_MANAGER_LIB.ConnectionTypes;
const VOPConnection = CONNECTION_MANAGER_LIB.VOPConnection;
const AppConnection = CONNECTION_MANAGER_LIB.AppConnection;
const confReader = require('./lib/confReader.js');
const SPEECH_HANDLER_LIB = require('./lib/googleSpeech.js');
const SpeechHandler = SPEECH_HANDLER_LIB.SpeechHandler;

var connectionsManager = new CONNECTION_MANAGER_LIB.ConnectionsManager();
var utility = new UTILITY();
var conf = new confReader();
// Settings -------------------------
var useSecureServerWebSocket = conf.config.useSecureServerWebSocket; 	// If websocket server should listen on secure/unsecure connection
var webSocketPort = conf.config.webSocketPort; 							// Port websocket server listens to
var privateKey = fs.readFileSync(conf.config.privateKey); 				// for websocket server
var certificate = fs.readFileSync(conf.config.certificate); 			// for websocket server
var TCP_SERVER_PORT_VE = conf.config.TCP_SERVER_PORT_VE; 				// TCP connection port to be used by voice engine
var TCP_SERVER_PORT_APPS = conf.config.TCP_SERVER_PORT_APPS; 			// TCP connection port for rest of the clients to connect to.
var vopServerEncoding = conf.config.vopServerEncoding; 					// Interpret data from vop as a string of this encoding
var appServerEncoding = conf.config.appServerEncoding; 					// Interpret data from client apps as a string of this encoding
var enableWebSockServer = conf.config.enableWebSockServer;				// Switch for Web Socket Server
var enableAppServer = conf.config.enableAppServer;						// Switch for App Server
var enableAppRegistrationServer = conf.config.enableAppRegistrationServer; // Switch for App registration portal
var appRegistrationSecureMode = conf.config.appRegistrationSecureMode;	// Use https
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

// Web Portal to register apps.
function startAppRegistrationServer(){
	var credentials = {key:privateKey,cert:certificate};
	var app = express();
	app.use('/res',express.static('webPortal/public'));
	app.use(cors());
	app.use(bodyParser.urlencoded({extended:false}));
	app.use(bodyParser.json({limit:'50mb'}));
	var httpsServer;
	var listeningPort = 80;
	if(appRegistrationSecureMode){
		httpsServer = https.createServer(credentials,app);
		listeningPort = 443;
	}
	else{
		httpsServer = http.createServer(app);
	}
	app.get('/bijli',function(req,res){
		res.send("<html><head><script src=\"res/js/sample.js\" type=\"text/javascript\"></head></html>");
	});
	app.post('/voice', function(req,res){
		SpeechHandler(req,res, connectionsManager);
	});
	httpsServer.listen(listeningPort,function(){
		console.log("App Registration portal started");
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

if(enableAppRegistrationServer){
	startAppRegistrationServer();
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
