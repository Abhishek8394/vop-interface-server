const fs = require('fs');
process.env['GOOGLE_APPLICATION_CREDENTIALS'] = 'credentials/google-cloud-speech/creds.json';
const credentials = JSON.parse(fs.readFileSync(process.env['GOOGLE_APPLICATION_CREDENTIALS'],'utf8'));
const projectId = credentials.project_id;
const Speech = require('@google-cloud/speech');//({projectId:projectId, keyFileName:'credentials/google-cloud-speech/creds.json'});
const speechClient = Speech();
const directoryPathForTmpFile = "./tmp";

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

function GoogleSpeechHandler(req, res){
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
					deleteFile(fileName);
				}
			}).catch(function(err){
				console.log(err);
				// deleteFile(fileName);
			});
		});
	}
	res.send("thanks");
}

module.exports = {SpeechHandler: GoogleSpeechHandler};