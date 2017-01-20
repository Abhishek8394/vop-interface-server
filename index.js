const WebSocket = require('ws');
const fs = require('fs');
const https = require('https');
const http = require('http');
const express = require('express');
const net = require('net');
// Settings -------------------------
var useSecureServerWebSocket = false; // If websocket server should listen on secure/unsecure connection
var webSocketPort = 8080; // Port websocket server listens to
var privateKey = fs.readFileSync('cert/key.pem'); // for websocket server
var certificate = fs.readFileSync('cert/cert.pem'); // for websocket server
var TCP_SERVER_PORT_VE = 11917; // TCP connection port to be used by voice engine
var TCP_SERVER_PORT_APPS = 12000; // TCP connection port for rest of the clients to connect to.
var vopServerEncoding = "utf8"; // Interpret data from vop as a string of this encoding
var appServerEncoding = "utf8"; // Interpret data from client apps as a string of this encoding
//  ---------------------------------
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
  ws.on('message', function incoming(message) {
    console.log('client side received: %s', message);
	var msg = {"echo":message,"extra":"something"};
	ws.send('msg');
  });
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

// Send msgObj to connection at socket. By default sends as a JSON string. 
// callback to register a handler when message finally sent
// Set asJson to false to send msgObj as is (sender responsible for setting encoding). 
// returns same value as node js net.socket.write() method.
function sendMessage(socket,msgObj,callback=null,asJson = true,encoding="utf8"){
	if(asJson){		
		return socket.write(getJSONString(msgObj),encoding,callback);
	}
	else{
		return socket.write(msgObj,encoding,callback);
	}
}

// Handle message received by vop
function vopMessageHandler(buffer){
	console.log(buffer);
	var buffData = jsonify(buffer);
	if(buffData!=undefined){
		if(buffData["msg"]=="hello"){
			sendMessage(vopServSocket,"yo");
		}
	}
}
// Handle messages from client apps
function appsMessageHandler(buffer){
	console.log(buffer);
}

// server for speech recognition module (called vop) ----------------------
var vopServSocket;
var vopServer = net.createServer((socket)=>{
	vopServSocket = socket;
	vopServSocket.setEncoding(vopServerEncoding);
	socket.on('data',vopMessageHandler);
	console.log("vop connected");
});
vopServer.on('error',function(err){
	console.log("vop server: error connecting");
});
vopServer.listen(TCP_SERVER_PORT_VE,function(){
	console.log("vop server: listening on "+TCP_SERVER_PORT_VE);
});
// --------------------------------------------------------------

// Server for other applications --------------------------------
var appServSockets = [];
var otherAppServer = net.createServer((s)=>{
	var tmpName = generateTempName();
	s.setEncoding(appServerEncoding);
	appServSockets.push({tmpName:{"socket":s}});
	console.log("new app connected");
});
vopServer.on('error',function(err){
	console.log("app server: error connecting");
});
vopServer.listen(TCP_SERVER_PORT_APPS,function(){
	console.log("app server listening on "+TCP_SERVER_PORT_APPS);
});
//  -------------------------------------------------------------

function generateTempName(){
	return "temp" + getRandomInt(1,10000)+"-"+getRandomInt(10000,100000);
}

// Random Integer generator
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}
function getJSONString(obj){
	return JSON.stringify(obj,null,'\t');
}
function jsonify(buff){
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
}