var omx = require('omxdirector');//.enableNativeLoop();
var osc = require("osc");
const path = require('path');
const fs = require('fs');

//Config.AUDIO_OUTPUT can be local, hdmi or alsa:hw:1,0 (for usb) 

var Playlist = [];

var Config = JSON.parse(fs.readFileSync("config.json"));

const directoryPath = path.join(__dirname, Config.MEDIAS_FOLDER);

var NextAction;

omx.setVideoDir(directoryPath);

var Log = function(msg)
{
	if(Config.LOGS)
	{
		console.log(msg);
	}
}

var StartAutoplay = function ()
{
	Log("Autoplay");
    Log(Playlist);

    omx.stop();

    omx.play(Playlist, {loop: true, audioOutput: Config.AUDIO_OUTPUT});
}

fs.readdirSync(directoryPath).forEach(function (file)
{
    Playlist.push(file);
});

if(Config.AUTOPLAY == true)
{
	StartAutoplay();
}

var udp = new osc.UDPPort(
{
    localAddress: "0.0.0.0",
    localPort: 7400,
    remoteAddress: "127.0.0.1",
    remotePort: 7500
});

udp.on("ready", function ()
{
   Log("Listening");
});

var SendAcknowledge = function (fileId)
{
    udp.send({
        address: Config.OSC_MESSAGE,
        args: [Config.ID, fileId]
    });
}

var ProcessMessage = function(oscMsg)
{
	var fileIndex = parseInt(oscMsg.args[0]);

	if(fileIndex == 0)
	{
		if(omx.getStatus().loaded == true)
		{
			NextAction = '';
			omx.stop();
			Log("Stop");
			SendAcknowledge(oscMsg.args[0]);
		}
	}
	else if(oscMsg.args[0] == "loop")
	{
		if(omx.getStatus().loaded == true)
		{
			NextAction = oscMsg.args[0];
			omx.stop();
		}
		else
		{
			StartAutoplay();
			SendAcknowledge(oscMsg.args[0]);
		}
	}
	else if(oscMsg.args[0] == "stop")
	{
		if(omx.getStatus().loaded == true)
		{
			NextAction = '';
			omx.stop();
			Log("Stop");
			SendAcknowledge(oscMsg.args[0]);
		}
	}
	else if(fileIndex >= 1)
	{
		var fileIndex = parseInt(fileIndex) - 1;
		
		if(fileIndex < Playlist.length)
		{
			if(omx.getStatus().loaded == true)
			{
				Log("Play: " + fileIndex);
				NextAction = oscMsg.args[0];
				Log("Stopping");
				omx.stop();
			}
			else
			{
				omx.play(Playlist[fileIndex], {loop: true, audioOutput: Config.AUDIO_OUTPUT});
				SendAcknowledge(oscMsg.args[0]);
			}
		}
	}
}

var ExecuteNextAction = function(action)
{
	if(action == "loop")
	{
		Log("ExecuteNextAction loop");
		StartAutoplay();
		SendAcknowledge(action);
	}
	else
	{	
		var fileIndex = parseInt(action) - 1;

		if(fileIndex < Playlist.length)
		{
			Log("ExecuteNextAction play: " + fileIndex);
			omx.play(Playlist[fileIndex], {loop: true, audioOutput: Config.AUDIO_OUTPUT});
			SendAcknowledge(action);
		}
	}
}

udp.on("message", function (oscMsg, timeTag, info)
{
    udp.options.remoteAddress = info.address;

    if(oscMsg.address == Config.OSC_MESSAGE)
    {
    	if(oscMsg.args != undefined && 
    		oscMsg.args.length > 0)
    	{
    		ProcessMessage(oscMsg);
    	}                
    }
});

omx.on('stop', function()
{
	Log("Stopped");
	Log(NextAction);
	if(NextAction != '')
	{
		ExecuteNextAction(NextAction);
		NextAction = '';
	}
});

udp.open();



