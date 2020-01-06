window.AudioContext = window.AudioContext || window.webkitAudioContext;

var audioContext = null;
var isPlaying = false;
var source = null;
var sourceNode = null;
var gainNode = null;
var analyser = null;
var theBuffer = null;
var mediaStreamSource = null;
var detectorElem, 
	waveCanvas,
	pitchElem,
	noteElem,
	detuneElem,
	gainElem,
	detuneAmount,
	prevNote,
	levelMeter;

var DRAW_CANVAS = true;
var threshold = 0.00; // threshold of mic input level
var MESSAGE_TYPES = {
	ON : "note_on",
	OFF : "note_off",
}

var time_on = null;
var time_off = null;

window.onload = function() {
	audioContext = new AudioContext();
	analyser = audioContext.createAnalyser();
	gainNode = audioContext.createGain();
	analyser.fftSize = 2048;
	levelMeter = createAudioMeter(audioContext);
	
	MAX_SIZE = Math.max(4, Math.floor(audioContext.sampleRate / 5000));	// corresponds to a 5kHz signal

	detectorElem = document.getElementById( "detector" );
	if (DRAW_CANVAS) {
		waveform = document.getElementById( "waveform" );
		waveCanvas = waveform.getContext("2d");
		waveCanvas.strokeStyle = "black";
		waveCanvas.lineWidth = 1;
	}
	pitchElem = document.getElementById( "pitch" );
	noteElem = document.getElementById( "note" );
	detuneElem = document.getElementById( "detune" );
	gainElem = document.getElementById( "gain" );
	detuneAmount = document.getElementById( "detune_amt" );

	const toggle = document.querySelector('.toggle');
	toggle.addEventListener('click', function() {
		toggleLiveInput();
	});
}

function toggleLiveInput() {
    if (isPlaying) {
        //stop playing and return
        sourceNode.stop( 0 );
        sourceNode = null;
        analyser = null;
        isPlaying = false;
		if (!window.cancelAnimationFrame)
			window.cancelAnimationFrame = window.webkitCancelAnimationFrame;
        window.cancelAnimationFrame( rafID );
    }

		// both microphone and sound playback must be enabled
		navigator.mediaDevices.getUserMedia({ audio: true, video: false })
	  .then((stream) => {
	    // Create an AudioNode from the stream.
	    sourceNode = audioContext.createMediaStreamSource(stream);

		  // Connect it to the destination.
	    sourceNode.connect(gainNode);
	    gainNode.connect(analyser);
	    analyser.connect(levelMeter);

	    // analyser.connect( audioContext.destination ); // connect to output
	  	updatePitch();
	  })
	  .catch((err) => console.log("ERROR", err))
}


var rafID = null;
var tracks = null;
var buflen = 2048;
var buf = new Float32Array( buflen );

var noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function noteFromPitch( frequency ) {
	var noteNum = 12 * (Math.log( frequency / 440 )/Math.log(2) );
	return Math.round( noteNum ) + 69;
}

function frequencyFromNoteNumber( note ) {
	return 440 * Math.pow(2,(note-69)/12);
}

function centsOffFromPitch( frequency, note ) {
	return Math.floor( 1200 * Math.log( frequency / frequencyFromNoteNumber( note ))/Math.log(2) );
}

function sendMidiSocket(json, printResponse = false) {
	socket.emit('midi', json)
}

function autoCorrelate( buf, sampleRate ) {
	// Implements the ACF2+ algorithm
	var SIZE = buf.length;
	var rms = 0;

	for (var i=0;i<SIZE;i++) {
		var val = buf[i];
		rms += val*val;
	}
	rms = Math.sqrt(rms/SIZE);
	if (rms<0.01) // not enough signal
		return -1;

	var r1=0, r2=SIZE-1, thres=0.2;
	for (var i=0; i<SIZE/2; i++)
		if (Math.abs(buf[i])<thres) { r1=i; break; }
	for (var i=1; i<SIZE/2; i++)
		if (Math.abs(buf[SIZE-i])<thres) { r2=SIZE-i; break; }

	buf = buf.slice(r1,r2);
	SIZE = buf.length;

	var c = new Array(SIZE).fill(0);
	for (var i=0; i<SIZE; i++)
		for (var j=0; j<SIZE-i; j++)
			c[i] = c[i] + buf[j]*buf[j+i];

	var d=0; while (c[d]>c[d+1]) d++;
	var maxval=-1, maxpos=-1;
	for (var i=d; i<SIZE; i++) {
		if (c[i] > maxval) {
			maxval = c[i];
			maxpos = i;
		}
	}
	var T0 = maxpos;

	var x1=c[T0-1], x2=c[T0], x3=c[T0+1];
	a = (x1 + x3 - 2*x2)/2;
	b = (x3 - x1)/2;
	if (a) T0 = T0 - b/(2*a);

	return sampleRate/T0;
}

function updatePitch() {
	var cycles = new Array;
	analyser.getFloatTimeDomainData( buf );
	var ac = autoCorrelate( buf, audioContext.sampleRate );
	var note = noteFromPitch(ac);
	if (note){
		if (note !== prevNote && levelMeter.volume >= threshold)
		{
			const midiJson = { key: note, level: Number(levelMeter.volume.toFixed(2)), msg_type: MESSAGE_TYPES.ON };
			sendMidiSocket(midiJson)
			// send note_off on previous message
			if (prevNote)
			{
				const midiJsonPrev = { key: prevNote, level: Number(levelMeter.volume.toFixed(2)), msg_type: MESSAGE_TYPES.OFF };
				sendMidiSocket(midiJsonPrev)
			}
		}
		// case where note is the same, but the input level is lowered
		else if (note === prevNote && levelMeter.volume < threshold){
			const midiJson = { key: note, level: Number(levelMeter.volume.toFixed(2)), msg_type: MESSAGE_TYPES.OFF };
			sendMidiSocket(midiJson);
		}
		prevNote = note;
	}

	if (DRAW_CANVAS) {  // This draws the current waveform, useful for debugging
		waveCanvas.clearRect(0,0,512,256);
		waveCanvas.strokeStyle = "red";
		waveCanvas.beginPath();
		waveCanvas.moveTo(0,0);
		waveCanvas.lineTo(0,256);
		waveCanvas.moveTo(128,0);
		waveCanvas.lineTo(128,256);
		waveCanvas.moveTo(256,0);
		waveCanvas.lineTo(256,256);
		waveCanvas.moveTo(384,0);
		waveCanvas.lineTo(384,256);
		waveCanvas.moveTo(512,0);
		waveCanvas.lineTo(512,256);
		waveCanvas.stroke();
		waveCanvas.strokeStyle = "black";
		waveCanvas.beginPath();
		waveCanvas.moveTo(0,buf[0]);
		for (var i=1;i<512;i++) {
			waveCanvas.lineTo(i,128+(buf[i]*128));
		}
		waveCanvas.stroke();
	}

 	if (ac == -1) {
	 	pitchElem.innerText = "--";
		noteElem.innerText = "-";
		detuneElem.className = "";
		detuneAmount.innerText = "--";
 	} else {
	 	pitch = ac;
	 	pitchElem.innerText = Math.round( pitch ) ;
	 	var note =  noteFromPitch( pitch );
		noteElem.innerHTML = noteStrings[note%12];
		var detune = centsOffFromPitch( pitch, note );
		if (detune == 0 ) {
			detuneAmount.innerHTML = "--";
		} else {
			if (detune < 0)
			{
				
			}
			else
			{
				detuneAmount.innerHTML = Math.abs( detune );
			}
		}
	}

	if (!window.requestAnimationFrame)
		window.requestAnimationFrame = window.webkitRequestAnimationFrame;
	rafID = window.requestAnimationFrame( updatePitch );
}

/*
	
	Hommage to https://github.com/cwilso/volume-meter/blob/master/volume-meter.js
	for the code for the audio meter below
	
*/


function createAudioMeter(audioContext,clipLevel,averaging,clipLag) {
	var processor = audioContext.createScriptProcessor(512);
	processor.onaudioprocess = volumeAudioProcess;
	processor.clipping = false;
	processor.lastClip = 0;
	processor.volume = 0;
	processor.clipLevel = clipLevel || 0.98;
	processor.averaging = averaging || 0.95;
	processor.clipLag = clipLag || 750;

	// this will have no effect, since we don't copy the input to the output,
	// but works around a current Chrome bug.
	processor.connect(audioContext.destination);

	processor.checkClipping =
		function(){
			if (!this.clipping)
				return false;
			if ((this.lastClip + this.clipLag) < window.performance.now())
				this.clipping = false;
			return this.clipping;
		};

	processor.shutdown =
		function(){
			this.disconnect();
			this.onaudioprocess = null;
		};

	return processor;
}

function volumeAudioProcess( event ) {
		var buf = event.inputBuffer.getChannelData(0);
	    var bufLength = buf.length;
		var sum = 0;
	    var x;

		// Do a root-mean-square on the samples: sum up the squares...
    for (var i=0; i<bufLength; i++) {
    	x = buf[i];
    	if (Math.abs(x)>=this.clipLevel) {
    		this.clipping = true;
    		this.lastClip = window.performance.now();
    	}
    	sum += x * x;
    }

    // ... then take the square root of the sum.
    var rms =  Math.sqrt(sum / bufLength);

    // Now smooth this out with the averaging factor applied
    // to the previous sample - take the max here because we
    // want "fast attack, slow release."
    this.volume = Math.max(rms, this.volume*this.averaging);
}

// eruda for having a console on mobile browsers
;(function () {
    var src = '//cdn.jsdelivr.net/npm/eruda';
    if (!/eruda=true/.test(window.location) && localStorage.getItem('active-eruda') != 'true') return;
    document.write('<scr' + 'ipt src="' + src + '"></scr' + 'ipt>');
    document.write('<scr' + 'ipt>eruda.init();</scr' + 'ipt>');
})();
