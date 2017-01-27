# vop-interface-server
Interface used by ([Project VoiceEngine] (https://github.com/Abhishek8394/VoiceEngine/tree/master)) to talk with desktop applications. Works as a simple bridge
for transferring commands between Voice Engine and any desktop application.

## Protocol
### For messages sent by VOP to this server
Messages sent from VOP must be of the following format 
 ```javascript
 {
    to:"targetApp", 
      // Name of App for which this message is intended. 
      // Apps should be registered with this app name (app-id). 
      // "to" attribute will be dropped by server and not forwarded to apps.
    msg:{
      // custom Message Object.
    }
 }
 ```
### For messages sent by apps to this server
Whatever object an app sends, is wrapped in the response object shown below and then sent to the VOP server.
```javascript
 {
    from:senderName,
    msg:{
        //messageObject sent by the sender
    }
 }
```
This is the format referred to as **response object**.

### Messages transmitted by this server
Apps will receive a message object that the VOP intended to send them. The message to delivered to an app is in the `msg` attribute of the message sent by VOP. For example if VOP sent a message as shown below, then the app will get just the message object in the `msg` attribute.
```javascript
{
 to: "your-app",
 msg:{a message object}
}
```
## Status
Supports request routing for VOP to app messages and all messages from any app forwarded to VOP. 

Apps cannot communicate among each other via this server. Supports web sockets as well as simple TCP socket connections. 

Just a basic skeleton for now, needs more changes.
