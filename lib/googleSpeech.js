const fs = require('fs');
// for heroku, need to create file if it doesn't exist.
if(process.env["reload_google_creds"]){
	fs.writeFileSync(process.env['GOOGLE_APPLICATION_CREDENTIALS'],JSON.stringify(process.env));
}
else{

	process.env['GOOGLE_APPLICATION_CREDENTIALS'] = 'credentials/google-cloud-speech/creds.json';
}
const credentials = JSON.parse(fs.readFileSync(process.env['GOOGLE_APPLICATION_CREDENTIALS'],'utf8'));
const projectId = credentials.project_id;
const Speech = require('@google-cloud/speech');//({projectId:projectId, keyFileName:'credentials/google-cloud-speech/creds.json'});
const speechClient = Speech();
const directoryPathForTmpFile = "./tmp";
const SPEECH_RECOG_NAME = "speech_recognition";

if(!fs.existsSync(directoryPathForTmpFile)){
	fs.mkdirSync(directoryPathForTmpFile);
} 

function deleteFile(fileName){
	fs.unlink(fileName, function(err){
		if(err){console.log(err);}
		else{
			console.log("deleted "+ fileName);
		}
	});
}

// Wrap a text message for VOP 
function wrapperForVop(textStr){
	return {
		response:{
			outputSpeech:{			
				type: "PlainText",
				text: textStr
			}
		}
	};
}

/**
* Gets voice data. Sends it to google cloud speech and forwards text to VOP
* Params: request object, response object => express server objects
*		   connectionsManager to send messages to VOP
*/
function GoogleSpeechHandler(req, res, connectionsManager){
	// console.log(req.body);
	var requestConfig = req.body.config;
	// console.log(requestConfig);
	// save as file.
	var fileName = "tmp/" + (new Date).getTime() + ".wav";
	if(req.body && req.body.audio && req.body.audio.content!=undefined){
		// decode base64 data
		var audiBuff = new Buffer(req.body.audio.content,'base64'); 
		// console.log(audiBuff);		
		fs.writeFile(fileName, audiBuff, function(){
			console.log("done writing file");
			// send to speech recog
			speechClient.recognize(fileName,requestConfig).then(function(results){
				var textResult = results[0];
				// console.log(results);
				console.log(`Text: ${textResult}`);
				// delete only if there was a response
				if(textResult.trim() != ""){
					connectionsManager.sendToVop(SPEECH_RECOG_NAME, wrapperForVop(textResult));
					// deleteFile(fileName);
				}
			}).catch(function(err){
				console.log(err);
				// deleteFile(fileName);
			});
		});
	}
	res.send("thanks");
}

/**
* Gets text command. Forwards it to VOP.
* Params: request object, response object => express server objects
*		   connectionsManager to send messages to VOP
*/
function TextEndpointHandler(req, res, connectionsManager){
	if(req.body.textInput==undefined){
		// error msg.
		res.send({"status":"error", "data":"Invalid parameters"});
		return;
	}
	var textInput = req.body.textInput;
	console.log(textInput);
	connectionsManager.sendToVop(SPEECH_RECOG_NAME, wrapperForVop(textInput));
	res.send({"status":"success", "data":"request forwarded for processing"});
}

module.exports = {SpeechHandler: GoogleSpeechHandler, TextHandler: TextEndpointHandler};