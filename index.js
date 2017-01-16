const WebSocket = require('ws');
const fs = require('fs');
const https = require('https');

var privateKey = fs.readFileSync('cert/key.pem');
var certificate = fs.readFileSync('cert/cert.pem');
var credentials = {key:privateKey,cert:certificate};
var express = require('express');
var app = express();
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
var httpsServer = https.createServer(credentials,app);
httpsServer.listen(8080);

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