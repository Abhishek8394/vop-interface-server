// AUTOGENERATE this file in the future.

var configOptions = {
	useSecureServerWebSocket : false, 				// If websocket server should listen on secure/unsecure connection
	webSocketPort : 8080, 							// Port websocket server listens to
	privateKey : 'cert/key.pem', 	// for websocket server
	certificate : 'cert/cert.pem', // for websocket server
	TCP_SERVER_PORT_VE : 11917, 					// TCP connection port to be used by voice engine
	TCP_SERVER_PORT_APPS : 12050, 					// TCP connection port for rest of the clients to connect to.
	vopServerEncoding : "utf8", 					// Interpret data from vop as a string of this encoding
	appServerEncoding : "utf8", 					// Interpret data from client apps as a string of this encoding
	enableWebSockServer : true,						// Switch for Web Socket Server
	enableAppServer : true
};
module.exports = configOptions;