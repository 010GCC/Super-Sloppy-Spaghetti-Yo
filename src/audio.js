// Procedural sound effects via Web Audio API
let ctx = null;
let muted = false;
let masterGain = null;

function ensureCtx() {
  if (ctx) return ctx;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.35;
    masterGain.connect(ctx.destination);
  } catch (e) {
    // No audio available
  }
  return ctx;
}

export function unlockAudio() {
  const c = ensureCtx();
  if (c && c.state === 'suspended') c.resume();
}

export function setMuted(m) { muted = m; }
export function isMuted() { return muted; }

function tone({ freq = 440, dur = 0.1, type = 'square', startGain = 0.4, endGain = 0.001, slide = 0, attack = 0.005 }) {
  if (muted) return;
  const c = ensureCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime);
  if (slide !== 0) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), c.currentTime + dur);
  g.gain.setValueAtTime(0, c.currentTime);
  g.gain.linearRampToValueAtTime(startGain, c.currentTime + attack);
  g.gain.exponentialRampToValueAtTime(endGain, c.currentTime + dur);
  osc.connect(g).connect(masterGain);
  osc.start();
  osc.stop(c.currentTime + dur + 0.02);
}

function noise({ dur = 0.1, startGain = 0.3, filter = 1200 }) {
  if (muted) return;
  const c = ensureCtx();
  if (!c) return;
  const bufSize = Math.floor(c.sampleRate * dur);
  const buffer = c.createBuffer(1, bufSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const bp = c.createBiquadFilter();
  bp.type = 'lowpass';
  bp.frequency.value = filter;
  const g = c.createGain();
  g.gain.value = startGain;
  src.connect(bp).connect(g).connect(masterGain);
  src.start();
}

export function playSfx(name) {
  switch (name) {
    case 'jump':
      tone({ freq: 380, dur: 0.12, type: 'square', startGain: 0.25, slide: 220 });
      break;
    case 'walljump':
      tone({ freq: 300, dur: 0.10, type: 'square', startGain: 0.28, slide: 320 });
      tone({ freq: 600, dur: 0.06, type: 'triangle', startGain: 0.15 });
      break;
    case 'land':
      noise({ dur: 0.08, startGain: 0.15, filter: 900 });
      break;
    case 'push':
      tone({ freq: 180, dur: 0.08, type: 'sawtooth', startGain: 0.18, slide: -40 });
      noise({ dur: 0.06, startGain: 0.1, filter: 600 });
      break;
    case 'turn':
      tone({ freq: 220, dur: 0.18, type: 'triangle', startGain: 0.22, slide: 180 });
      tone({ freq: 660, dur: 0.10, type: 'sine', startGain: 0.15, slide: 220 });
      break;
    case 'die':
      tone({ freq: 480, dur: 0.10, type: 'square', startGain: 0.3, slide: -360 });
      noise({ dur: 0.18, startGain: 0.18, filter: 1400 });
      break;
    case 'goal':
      tone({ freq: 660, dur: 0.10, type: 'triangle', startGain: 0.25, slide: 120 });
      setTimeout(() => tone({ freq: 880, dur: 0.16, type: 'triangle', startGain: 0.25, slide: 80 }), 100);
      break;
    case 'win':
      tone({ freq: 523, dur: 0.10, type: 'triangle', startGain: 0.25 });
      setTimeout(() => tone({ freq: 659, dur: 0.10, type: 'triangle', startGain: 0.25 }), 110);
      setTimeout(() => tone({ freq: 784, dur: 0.18, type: 'triangle', startGain: 0.3 }), 220);
      setTimeout(() => tone({ freq: 1047, dur: 0.30, type: 'triangle', startGain: 0.3 }), 380);
      break;
    case 'switch':
      tone({ freq: 540, dur: 0.06, type: 'sine', startGain: 0.18 });
      setTimeout(() => tone({ freq: 720, dur: 0.06, type: 'sine', startGain: 0.18 }), 50);
      break;
    case 'click':
      tone({ freq: 880, dur: 0.04, type: 'square', startGain: 0.12 });
      break;
    case 'select':
      tone({ freq: 660, dur: 0.05, type: 'triangle', startGain: 0.15 });
      break;
  }
}
