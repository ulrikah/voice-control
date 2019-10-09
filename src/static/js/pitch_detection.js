// Copyright (c) 2018 ml5
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

/* ===
ml5 Example
Basic Pitch Detection
=== */


let audioContext;
let mic;
let pitch;
let fmOsc;
let prevMidi;

// threshold of micLevel by trial and error
const MIC_THRESHOLD = 0.01;

function preload() {
	fmOsc = new Tone.FatOscillator().toMaster();
  fmOsc.volume.value = -40
}

function setup() {
  noCanvas();
  audioContext = getAudioContext();
  mic = new p5.AudioIn();
  mic.start(startPitch);
}

function startPitch() {
  pitch = ml5.pitchDetection('/static/model/', audioContext , mic.stream, modelLoaded);
}

function modelLoaded() {
  select('#status').html('Model Loaded');
  getPitch();
  // fmOsc.start()
}


function getPitch() {
  pitch.getPitch(function(err, frequency) {
    if (frequency && typeof frequency === "number") {
      select('#result').html(frequency);
      
      const midi = Tone.Frequency(freqToMidi(frequency), 'midi').toMidi()
    	
      // We only bother to send a request onChange as of now
      if (midi && prevMidi != midi){

        const micLevel = mic.getLevel() // TO DO - add velocity from volume
        if (micLevel >= MIC_THRESHOLD)
        {        
          const midiJson = { "key": midi, "level": micLevel } 
          sendMidiToServer(midiJson);
          prevMidi = midi;
    
          // Set the frequency of the oscillator to the new value
          fmOsc.frequency.value = midi;
        }
      }

    } else {
      select('#result').html('No pitch detected');
    }
    getPitch();
  })
}

function sendMidiToServer(midiJson, printResponse = false) {
  const http = new XMLHttpRequest()
  const url = "/osc"
  http.open("POST", url)
  if (printResponse)
  {
    http.onreadystatechange = function() {
      if (http.readyState == XMLHttpRequest.DONE) {
        console.log(http.responseText);
      }
    }
  }
  http.setRequestHeader("Content-Type", "application/json;charset=UTF-8")
  http.send(JSON.stringify(midiJson))
}

function mouseClicked() {
	if (fmOsc.state === "stopped")
	{
		fmOsc.start()
	} else {
		fmOsc.stop()
	}
}
