// Super Sloppy Spaghetti Yo — application shell
import { LEVELS } from './levels.js';
import { createState, update, resetLevel, switchActor, W, H } from './game.js';
import { render } from './render.js';
import { unlockAudio, playSfx, setMuted, isMuted } from './audio.js';

// ─── Canvas & context ────────────────────────────────────────────────────
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = W;
canvas.height = H;
ctx.imageSmoothingEnabled = true;

// ─── App phases ──────────────────────────────────────────────────────────
const PHASE = {
  TITLE: 'title',
  HOWTO: 'howto',
  LEVELS: 'levels',
  PLAYING: 'playing',
  PAUSED: 'paused',
  WIN: 'win',
};

const app = {
  phase: PHASE.TITLE,
  state: null,        // game state (when playing)
  levelIndex: 0,
  bestTimes: {},      // levelId -> seconds
  bestDeaths: {},     // levelId -> deaths
  cleared: {},        // levelId -> bool
  lastT: performance.now(),
  acc: 0,
};

// ─── Input ───────────────────────────────────────────────────────────────
const keys = Object.create(null);
const justPressed = Object.create(null);

window.addEventListener('keydown', (e) => {
  // Prevent default browser scroll on game keys
  const gameKeys = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'];
  if (gameKeys.includes(e.code)) e.preventDefault();
  if (!keys[e.code]) justPressed[e.code] = true;
  keys[e.code] = true;
});
window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

// Touch buttons map to virtual keys (held while pressed)
document.querySelectorAll('.tbtn').forEach((btn) => {
  const k = btn.dataset.key;
  const press = (e) => {
    e.preventDefault();
    if (!keys[k]) justPressed[k] = true;
    keys[k] = true;
    unlockAudio();
  };
  const release = (e) => {
    e.preventDefault();
    keys[k] = false;
  };
  btn.addEventListener('pointerdown', press);
  btn.addEventListener('pointerup', release);
  btn.addEventListener('pointercancel', release);
  btn.addEventListener('pointerleave', release);
});

function readInput() {
  const left = !!(keys['ArrowLeft'] || keys['KeyA']);
  const right = !!(keys['ArrowRight'] || keys['KeyD']);
  const jumpHeld = !!(keys['Space'] || keys['KeyW'] || keys['ArrowUp']);
  const jumpPressed = !!(justPressed['Space'] || justPressed['KeyW'] || justPressed['ArrowUp']);
  return { left, right, jumpHeld, jumpPressed };
}

// ─── UI elements ─────────────────────────────────────────────────────────
const overlay = document.getElementById('overlay');
const ovTitle = document.getElementById('ov-title');
const ovHowto = document.getElementById('ov-howto');
const ovLevels = document.getElementById('ov-levels');
const ovPause = document.getElementById('ov-pause');
const ovWin = document.getElementById('ov-win');
const hud = document.getElementById('hud');
const hudLevel = document.getElementById('hud-level');
const hudTimer = document.getElementById('timer-val');
const hudDeaths = document.getElementById('deaths-val');
const hudChar = document.getElementById('hud-char');
const charVal = document.getElementById('char-val');
const winTitle = document.getElementById('win-title');
const winTime = document.getElementById('win-time');
const winDeaths = document.getElementById('win-deaths');
const levelGrid = document.getElementById('level-grid');
const debugEl = document.getElementById('debug');

function setOverlay(panel) {
  overlay.classList.remove('hidden');
  [ovTitle, ovHowto, ovLevels, ovPause, ovWin].forEach((p) => p.classList.add('hidden'));
  if (panel) panel.classList.remove('hidden');
}
function hideOverlay() { overlay.classList.add('hidden'); }

function setPhase(p) {
  app.phase = p;
  switch (p) {
    case PHASE.TITLE: setOverlay(ovTitle); break;
    case PHASE.HOWTO: setOverlay(ovHowto); break;
    case PHASE.LEVELS: renderLevelGrid(); setOverlay(ovLevels); break;
    case PHASE.PAUSED: setOverlay(ovPause); break;
    case PHASE.WIN: setOverlay(ovWin); break;
    case PHASE.PLAYING: hideOverlay(); break;
  }
  // HUD visibility (always shown in playing-ish phases)
  hud.style.opacity = (p === PHASE.PLAYING || p === PHASE.PAUSED || p === PHASE.WIN) ? '1' : '0';
  // Hide multi-char chip when only one
  if (app.state && app.state.actors.length <= 1) hudChar.style.display = 'none';
  else if (app.state) hudChar.style.display = '';
}

function renderLevelGrid() {
  levelGrid.innerHTML = '';
  LEVELS.forEach((lv, i) => {
    const card = document.createElement('button');
    card.className = 'level-card';
    const best = app.bestTimes[lv.id];
    const cleared = app.cleared[lv.id];
    card.innerHTML = `
      <div class="lc-num">${cleared ? '★ ' : ''}LEVEL ${String(i + 1).padStart(2, '0')}</div>
      <div class="lc-name">${lv.name}</div>
      <div class="lc-desc">${lv.desc}</div>
      ${best != null ? `<div class="lc-best">Best ${formatTime(best)}</div>` : ''}
    `;
    card.addEventListener('click', () => {
      playSfx('select');
      startLevel(i);
    });
    levelGrid.appendChild(card);
  });
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = (s - m * 60).toFixed(2).padStart(5, '0');
  return `${m}:${sec}`;
}

function startLevel(i) {
  app.levelIndex = i;
  app.state = createState(i);
  app.state.onSfx = playSfx;
  setPhase(PHASE.PLAYING);
}

function pauseGame() {
  if (app.phase !== PHASE.PLAYING) return;
  app.state.paused = true;
  setPhase(PHASE.PAUSED);
}
function resumeGame() {
  if (app.phase !== PHASE.PAUSED) return;
  app.state.paused = false;
  setPhase(PHASE.PLAYING);
}

// ─── Buttons ─────────────────────────────────────────────────────────────
document.getElementById('btn-start').addEventListener('click', () => { unlockAudio(); playSfx('click'); setPhase(PHASE.LEVELS); });
document.getElementById('btn-howto').addEventListener('click', () => { playSfx('click'); setPhase(PHASE.HOWTO); });
document.getElementById('btn-howto-back').addEventListener('click', () => { playSfx('click'); setPhase(PHASE.TITLE); });
document.getElementById('btn-levels-back').addEventListener('click', () => { playSfx('click'); setPhase(PHASE.TITLE); });
document.getElementById('btn-resume').addEventListener('click', () => { playSfx('click'); resumeGame(); });
document.getElementById('btn-restart').addEventListener('click', () => { playSfx('click'); startLevel(app.levelIndex); });
document.getElementById('btn-quit').addEventListener('click', () => { playSfx('click'); setPhase(PHASE.LEVELS); });
document.getElementById('btn-next').addEventListener('click', () => {
  playSfx('click');
  const next = app.levelIndex + 1;
  if (next < LEVELS.length) startLevel(next);
  else setPhase(PHASE.LEVELS);
});
document.getElementById('btn-replay').addEventListener('click', () => { playSfx('click'); startLevel(app.levelIndex); });
document.getElementById('btn-win-menu').addEventListener('click', () => { playSfx('click'); setPhase(PHASE.LEVELS); });
document.getElementById('btn-pause').addEventListener('click', () => { playSfx('click'); pauseGame(); });
document.getElementById('btn-reset').addEventListener('click', () => {
  playSfx('click');
  if (app.state) { app.state = resetLevel(app.state); app.state.onSfx = playSfx; }
});
document.getElementById('btn-menu').addEventListener('click', () => { playSfx('click'); setPhase(PHASE.LEVELS); });

// First user gesture unlocks audio
window.addEventListener('pointerdown', unlockAudio, { once: true });
window.addEventListener('keydown', unlockAudio, { once: true });

// ─── Fullscreen ──────────────────────────────────────────────────────────
function toggleFullscreen() {
  const frame = document.getElementById('frame');
  if (!document.fullscreenElement) {
    frame.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
}

// ─── Main loop ───────────────────────────────────────────────────────────
const TICK = 1 / 60;
let acc = 0;
let lastT = performance.now();
let frameCount = 0, fpsTimer = 0, fps = 0;

function frame(now) {
  let dt = (now - lastT) / 1000;
  if (dt > 0.25) dt = 0.25;
  lastT = now;
  acc += dt;

  // Handle global key shortcuts (run on real-time, not paused)
  handleShortcuts();

  // Fixed-timestep updates
  while (acc >= TICK) {
    if (app.phase === PHASE.PLAYING && app.state) {
      const input = readInput();
      update(app.state, input, TICK);
      // Check for level win
      if (app.state.won && app.phase === PHASE.PLAYING) {
        onLevelWon();
      }
    }
    acc -= TICK;
    // Clear "just pressed" frames after the tick
    for (const k in justPressed) delete justPressed[k];
  }

  // Render
  if (app.state) {
    render(ctx, app.state, performance.now() / 1000);
  } else {
    // Idle render — show a saucy backdrop for the title screen
    renderIdle();
  }

  updateHud();

  // FPS counter
  frameCount++;
  fpsTimer += dt;
  if (fpsTimer >= 0.5) {
    fps = Math.round(frameCount / fpsTimer);
    debugEl.textContent = `FPS ${fps} · ${app.phase}`;
    frameCount = 0; fpsTimer = 0;
  }

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

function handleShortcuts() {
  // R — reset
  if (justPressed['KeyR']) {
    if (app.phase === PHASE.PLAYING && app.state) {
      app.state = resetLevel(app.state);
      app.state.onSfx = playSfx;
    }
  }
  // E or Tab — switch character
  if (justPressed['KeyE'] || justPressed['Tab']) {
    if (app.phase === PHASE.PLAYING && app.state) switchActor(app.state);
  }
  // P or Esc — pause/resume
  if (justPressed['KeyP'] || justPressed['Escape']) {
    if (app.phase === PHASE.PLAYING) pauseGame();
    else if (app.phase === PHASE.PAUSED) resumeGame();
  }
  // F — fullscreen
  if (justPressed['KeyF']) toggleFullscreen();
  // M — mute
  if (justPressed['KeyM']) setMuted(!isMuted());
}

function updateHud() {
  if (!app.state) return;
  hudLevel.textContent = `LVL ${app.state.level.id}`;
  hudTimer.textContent = formatTime(app.state.time);
  hudDeaths.textContent = String(app.state.deaths);
  if (app.state.actors.length > 1) {
    const active = app.state.actors[app.state.activeActor];
    charVal.textContent = active.kind.toUpperCase();
  }
}

function onLevelWon() {
  playSfx('win');
  const id = app.state.level.id;
  const t = app.state.time;
  const d = app.state.deaths;
  if (app.bestTimes[id] == null || t < app.bestTimes[id]) app.bestTimes[id] = t;
  if (app.bestDeaths[id] == null || d < app.bestDeaths[id]) app.bestDeaths[id] = d;
  app.cleared[id] = true;
  winTitle.textContent = `Level ${id} Clear`;
  winTime.textContent = formatTime(t);
  winDeaths.textContent = String(d);
  setPhase(PHASE.WIN);
}

function renderIdle() {
  // Animated saucy backdrop with floating spaghetti rings
  ctx.fillStyle = '#14100c';
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W * 0.5, H * 0.35, 50, W * 0.5, H * 0.35, H * 1.1);
  g.addColorStop(0, 'rgba(200, 66, 31, 0.35)');
  g.addColorStop(0.5, 'rgba(112, 36, 18, 0.18)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const t = performance.now() / 1000;

  // Floating "O" rings
  for (let i = 0; i < 10; i++) {
    const x = ((t * (20 + i * 4) + i * 97) % (W + 80)) - 40;
    const y = (H * 0.25 + Math.sin(t * 1.2 + i) * 70 + (i % 3) * 120) % H;
    const r = 18 + (i % 4) * 6;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(t + i) * 0.2);
    // Ring
    ctx.fillStyle = `rgba(245, 160, 86, ${0.18 + (i % 3) * 0.06})`;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2, true);
    ctx.fill('evenodd');
    ctx.restore();
  }

  // Distant spaghetti strands
  ctx.strokeStyle = 'rgba(246, 231, 193, 0.06)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    ctx.beginPath();
    const off = (t * 8 + i * 80) % (W + 120) - 60;
    ctx.moveTo(off, 0);
    ctx.bezierCurveTo(off + 60, H / 3, off - 60, (2 * H) / 3, off + 40, H);
    ctx.stroke();
  }

  // Vignette
  const vg = ctx.createRadialGradient(W/2, H/2, H/3, W/2, H/2, H);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}

// ─── Test/Automation hooks ──────────────────────────────────────────────
window.render_game_to_text = () => {
  const payload = { phase: app.phase };
  if (app.state) {
    payload.level = app.state.level.id;
    payload.time = +app.state.time.toFixed(3);
    payload.deaths = app.state.deaths;
    payload.activeActor = app.state.activeActor;
    payload.actors = app.state.actors.map(a => ({
      kind: a.kind,
      x: Math.round(a.x), y: Math.round(a.y),
      vx: Math.round(a.vx), vy: Math.round(a.vy),
      onGround: a.onGround, wallDir: a.wallDir, alive: a.alive, inGoal: a.inGoal,
    }));
    payload.blocks = app.state.blocks.map(b => ({ c: b.c, r: b.r, w: b.w, h: b.h, consumed: !!b.consumed }));
    payload.turnstiles = app.state.turnstiles.map(t => ({ cx: t.cx, cy: t.cy, orient: t.orientation, rotating: t.rotating }));
    payload.won = app.state.won;
    payload.paused = app.state.paused;
  }
  return JSON.stringify(payload);
};

// Deterministic step hook for automated testing.
window.advanceTime = (ms) => {
  const steps = Math.max(1, Math.round(ms / (1000 / 60)));
  for (let i = 0; i < steps; i++) {
    if (app.phase === PHASE.PLAYING && app.state) {
      const input = readInput();
      update(app.state, input, TICK);
      if (app.state.won && app.phase === PHASE.PLAYING) onLevelWon();
    }
    for (const k in justPressed) delete justPressed[k];
  }
  render(ctx, app.state || { level: { id: 0, name: '', desc: '' }, time: 999, grid: [], blocks: [], turnstiles: [], goals: [], actors: [], fx: [] }, performance.now() / 1000);
};

// Test helpers
window.testStartLevel = (i) => { startLevel(i); };
window.testPressKey = (code) => { justPressed[code] = true; keys[code] = true; };
window.testReleaseKey = (code) => { keys[code] = false; };
window.testHoldKey = (code, ms) => {
  keys[code] = true;
  setTimeout(() => { keys[code] = false; }, ms);
};

// Initial phase
setPhase(PHASE.TITLE);

// Hide HUD on title
hud.style.opacity = '0';
