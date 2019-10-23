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
let prevNote;

// threshold of micLevel by trial and error
const MIC_THRESHOLD = 0.01;

function preload() {
  // stuff that needs to load before setup()
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
}

function freqToNote( frequency ) {
  var noteNum = 12 * (Math.log( frequency / 440 )/Math.log(2) );
  return Math.round( noteNum ) + 69;
}

function noteToFreq( note ) {
  return 440 * Math.pow(2,(note-69)/12);
}

function getPitch() {
  pitch.getPitch(function(err, frequency) {
    if (frequency && typeof frequency === "number") {
      
      const note = freqToNote( frequency )
      select('#result').html(note);
    	
      // We only bother to send a request when note is changed as of now
      if (note && prevNote != note){

        const micLevel = mic.getLevel()
        if (micLevel >= MIC_THRESHOLD)
        {        
          const noteJson = { "key": note, "level": micLevel } 
          sendMidiToServer(noteJson);
          prevNote = note;
          
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
