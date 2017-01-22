# vop-interface-server
Interface used by ([Project VoiceEngine] (https://github.com/Abhishek8394/VoiceEngine/tree/master)) to talk with desktop applications. Works as a simple bridge
for transferring commands between Voice Engine and any desktop application.

## Protocol
### For messages sent by VOP to this server
Messages sent from VOP must be of the following format 
 ```
 {
    to:"targetApp", 
      // Name of App for which this message is intended. 
      // Apps should be registered with this app name (app-id). 
      // "to" attribute will be dropped by server and not forwarded to apps.
    msg:{
      // custom Message Object.
      // This object alone will be forwarded to apps wrapped in the response object. 
    }
 }
 ```
### For messages sent by apps to this server
The message object will be sent as is, wrapped in the response object to the VOP server.

### Messages transmitted by this server
All messages transmitted will have the following format:
```
 {
    from:senderName,
    msg:{
        //messageObject sent by the sender
    }
 }
```
This is the format referred to as **response object**.
## Status
Supports request routing for VOP to app messages and all messages from any app forwarded to apps. Apps cannot communicate among each other via this server. Supports web sockets as well as simple TCP socket connections. 
Just a basic skeleton for now, needs more changes.
