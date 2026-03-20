let userName = "AJOY";

let audioContext, analyser, buffer;

let isSinging = false;
let lastSoundTime = 0;
let hasReplied = false;

let pitchList = [];
let isSpeaking = false;

// 👩 Female English voice
function speak(text) {
  if (speechSynthesis.speaking) return;

  isSpeaking = true;

  let msg = new SpeechSynthesisUtterance(text);
  let voices = speechSynthesis.getVoices();

  let female = voices.find(v =>
    v.lang.startsWith("en") &&
    (v.name.includes("Google") || v.name.toLowerCase().includes("female"))
  );

  if (!female) female = voices.find(v => v.lang.startsWith("en"));

  msg.voice = female;
  msg.lang = "en-US";
  msg.pitch = 1.4;

  msg.onend = () => isSpeaking = false;

  speechSynthesis.speak(msg);
}

// 🎤 Start
async function start() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  audioContext = new AudioContext();
  await audioContext.resume();

  analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;

  let mic = audioContext.createMediaStreamSource(stream);
  mic.connect(analyser);

  buffer = new Float32Array(analyser.fftSize);

  document.getElementById("status").innerText = "Listening...";
  loop();
}

// ⏹️ Stop
function stop() {
  if (audioContext) audioContext.close();
}

// 🔁 Loop
function loop() {
  if (isSpeaking) {
    requestAnimationFrame(loop);
    return;
  }

  analyser.getFloatTimeDomainData(buffer);

  let pitch = detectPitch(buffer, audioContext.sampleRate);
  let now = Date.now();

  if (pitch > 0) {
    pitchList.push(pitch);
    lastSoundTime = now;
    isSinging = true;
    hasReplied = false;
  }

  if (isSinging && now - lastSoundTime > 2000 && !hasReplied) {
    isSinging = false;
    hasReplied = true;

    analyze();
    pitchList = [];
  }

  requestAnimationFrame(loop);
}

// 🎵 Pitch detection
function detectPitch(buf, sampleRate) {
  let SIZE = buf.length;
  let rms = 0;

  for (let i = 0; i < SIZE; i++) {
    rms += buf[i] * buf[i];
  }

  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1;

  let bestOffset = -1;
  let bestCorrelation = 0;

  for (let offset = 8; offset < 1000; offset++) {
    let correlation = 0;

    for (let i = 0; i < SIZE - offset; i++) {
      correlation += buf[i] * buf[i + offset];
    }

    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestOffset = offset;
    }
  }

  if (bestOffset === -1) return -1;

  return sampleRate / bestOffset;
}

// 🎼 Note detect
function getNote(freq) {
  let A4 = 440;
  let noteNum = 12 * (Math.log(freq / A4) / Math.log(2));
  let midi = Math.round(noteNum) + 69;

  let notes = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  return notes[midi % 12];
}

// 📊 Analyze
function analyze() {
  if (pitchList.length < 5) return;

  let avg = pitchList.reduce((a,b)=>a+b,0) / pitchList.length;
  let note = getNote(avg);

  let feedback = "";

  if (avg < 150) {
    feedback = "Bad singing";
  } 
  else if (avg < 300) {
    feedback = "Average performance";
  } 
  else {
    feedback = "Good singing";
  }

  document.getElementById("status").innerText = feedback;
  document.getElementById("note").innerText = "Detected Note: " + note;

  speak(userName + ", " + feedback + ". Detected note is " + note);
    }
