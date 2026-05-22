// Renderer for Super Sloppy Spaghetti Yo — pasta-noir aesthetic
import { TILE, COLS, ROWS, W, H, T, isSolid, turnstileArmCells } from './game.js';

const COLORS = {
  bgTop: '#1f1510',
  bgBot: '#120a07',
  wallA: '#a83422',     // tomato-can red panel
  wallB: '#7a2515',     // shadow
  wallRivet: '#3a1207',
  wallHi: '#e25b3c',
  slabA: '#f6e7c1',     // noodle cream
  slabB: '#dcc391',
  slabEdge: '#8a6a3a',
  slabSpeckle: '#c9a96b',
  spike: '#f0d8a0',     // bone/pasta spike
  spikeEdge: '#4a2914',
  pit: '#0a0604',
  pitFilledA: '#caa367',
  pitFilledB: '#9a784a',
  saucePool: '#a83422',
  block: '#cf6a3a',     // ravioli pillow
  blockEdge: '#5e2110',
  blockHi: '#f6c388',
  turnstileBar: '#dcc391',
  turnstileEdge: '#4a2914',
  turnstileCenter: '#a83422',
  goal: '#f0d066',
  charO: '#f5a056',     // O — orange spaghetti-o ring
  charT: '#e8c474',     // T — pale chef
};

// 3-color "saucy" gradients via patches
function drawWallTile(ctx, x, y) {
  // Tomato-can panel with rivets
  const g = ctx.createLinearGradient(x, y, x, y + TILE);
  g.addColorStop(0, '#bb4128');
  g.addColorStop(0.5, '#a83422');
  g.addColorStop(1, '#7a2515');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, TILE, TILE);
  // Highlight top edge
  ctx.fillStyle = 'rgba(255, 180, 120, 0.18)';
  ctx.fillRect(x, y, TILE, 2);
  // Bottom shadow
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.fillRect(x, y + TILE - 3, TILE, 3);
  // Rivets
  ctx.fillStyle = COLORS.wallRivet;
  ctx.fillRect(x + 4, y + 4, 3, 3);
  ctx.fillRect(x + TILE - 7, y + 4, 3, 3);
  ctx.fillRect(x + 4, y + TILE - 7, 3, 3);
  ctx.fillRect(x + TILE - 7, y + TILE - 7, 3, 3);
  ctx.fillStyle = 'rgba(255, 220, 180, 0.25)';
  ctx.fillRect(x + 4, y + 4, 1, 1);
  ctx.fillRect(x + TILE - 7, y + 4, 1, 1);
  ctx.fillRect(x + 4, y + TILE - 7, 1, 1);
  ctx.fillRect(x + TILE - 7, y + TILE - 7, 1, 1);
}

function drawSlabTile(ctx, x, y, topEdge = false) {
  const g = ctx.createLinearGradient(x, y, x, y + TILE);
  g.addColorStop(0, COLORS.slabA);
  g.addColorStop(1, COLORS.slabB);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, TILE, TILE);
  if (topEdge) {
    // Toasted top crust
    ctx.fillStyle = '#e8b96b';
    ctx.fillRect(x, y, TILE, 3);
    ctx.fillStyle = '#8a5a2a';
    ctx.fillRect(x, y + 3, TILE, 1);
  }
  // Speckles
  ctx.fillStyle = COLORS.slabSpeckle;
  // Deterministic: based on tile pos
  const seed = (x * 73 + y * 37) % 100;
  for (let i = 0; i < 4; i++) {
    const sx = x + ((seed + i * 17) % (TILE - 4)) + 2;
    const sy = y + ((seed + i * 23) % (TILE - 4)) + 2;
    ctx.fillRect(sx, sy, 2, 2);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(x, y + TILE - 2, TILE, 2);
}

function drawSpikeUp(ctx, x, y) {
  ctx.fillStyle = COLORS.spike;
  ctx.beginPath();
  ctx.moveTo(x + 2, y + TILE);
  ctx.lineTo(x + TILE / 4, y + 6);
  ctx.lineTo(x + TILE / 2, y + TILE);
  ctx.lineTo(x + (3 * TILE) / 4, y + 6);
  ctx.lineTo(x + TILE - 2, y + TILE);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = COLORS.spikeEdge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Drip of sauce
  ctx.fillStyle = '#7a2515';
  ctx.fillRect(x + TILE / 4 - 1, y + TILE - 2, 2, 3);
  ctx.fillRect(x + (3 * TILE) / 4 - 1, y + TILE - 2, 2, 3);
}
function drawSpikeDown(ctx, x, y) {
  ctx.save();
  ctx.translate(x + TILE / 2, y + TILE / 2);
  ctx.rotate(Math.PI);
  drawSpikeUp(ctx, -TILE / 2, -TILE / 2);
  ctx.restore();
}
function drawSpikeLeft(ctx, x, y) {
  ctx.save();
  ctx.translate(x + TILE / 2, y + TILE / 2);
  ctx.rotate(-Math.PI / 2);
  drawSpikeUp(ctx, -TILE / 2, -TILE / 2);
  ctx.restore();
}
function drawSpikeRight(ctx, x, y) {
  ctx.save();
  ctx.translate(x + TILE / 2, y + TILE / 2);
  ctx.rotate(Math.PI / 2);
  drawSpikeUp(ctx, -TILE / 2, -TILE / 2);
  ctx.restore();
}

function drawPit(ctx, x, y) {
  // Dark pit with inner shadow
  const g = ctx.createLinearGradient(x, y, x, y + TILE);
  g.addColorStop(0, '#000');
  g.addColorStop(0.6, '#0a0604');
  g.addColorStop(1, '#221008');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, TILE, TILE);
  // Edge highlights
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(x, y, TILE, 4);
  // Sauce shimmer
  ctx.fillStyle = 'rgba(168, 52, 34, 0.5)';
  ctx.fillRect(x + 4, y + TILE - 6, TILE - 8, 2);
}
function drawPitFilled(ctx, x, y) {
  const g = ctx.createLinearGradient(x, y, x, y + TILE);
  g.addColorStop(0, COLORS.pitFilledA);
  g.addColorStop(1, COLORS.pitFilledB);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = 'rgba(80, 40, 20, 0.5)';
  ctx.fillRect(x, y + TILE - 2, TILE, 2);
  // Sauce stain
  ctx.fillStyle = 'rgba(168, 52, 34, 0.4)';
  ctx.fillRect(x + 4, y + 2, TILE - 8, 4);
}

function drawCrumbleTile(ctx, x, y, crumb) {
  const shake = crumb?.touched ? Math.sin(crumb.t * 80) * 1.5 : 0;
  ctx.save();
  ctx.translate(shake, 0);
  const g = ctx.createLinearGradient(x, y, x, y + TILE);
  g.addColorStop(0, '#f3d89a');
  g.addColorStop(1, '#b8793d');
  ctx.fillStyle = g;
  ctx.fillRect(x + 1, y + 3, TILE - 2, TILE - 5);
  ctx.strokeStyle = '#5e2f16';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 1.5, y + 3.5, TILE - 3, TILE - 6);
  ctx.strokeStyle = 'rgba(74, 35, 14, 0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 7, y + 8);
  ctx.lineTo(x + 14, y + 15);
  ctx.lineTo(x + 10, y + 24);
  ctx.moveTo(x + 21, y + 7);
  ctx.lineTo(x + 18, y + 18);
  ctx.lineTo(x + 25, y + 25);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 240, 190, 0.5)';
  ctx.fillRect(x + 4, y + 5, TILE - 8, 2);
  ctx.restore();
}

function drawLaunchTile(ctx, x, y, t) {
  drawSlabTile(ctx, x, y, true);
  const pulse = (Math.sin(t * 8) + 1) * 0.5;
  ctx.fillStyle = '#2b1309';
  roundRect(ctx, x + 4, y + 9, TILE - 8, TILE - 12, 4);
  ctx.fill();
  ctx.fillStyle = '#ff6b2a';
  ctx.fillRect(x + 7, y + 12 + pulse * 2, TILE - 14, 5);
  ctx.fillStyle = '#ffd089';
  ctx.fillRect(x + 10, y + 7, TILE - 20, 5);
  ctx.strokeStyle = '#4a210f';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x + 8, y + 21);
  ctx.lineTo(x + 13, y + 15);
  ctx.lineTo(x + 18, y + 21);
  ctx.lineTo(x + 23, y + 15);
  ctx.stroke();
}

function drawGoal(ctx, x, y, t) {
  // Meatball with shine, bouncing slightly
  const bob = Math.sin(t * 3) * 2;
  const cx = x + TILE / 2;
  const cy = y + TILE / 2 + bob;
  // Plate
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(cx, y + TILE - 3, TILE / 2 - 2, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Meatball
  const grad = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, TILE / 2 - 4);
  grad.addColorStop(0, '#a06030');
  grad.addColorStop(0.6, '#6a3a20');
  grad.addColorStop(1, '#3a1c0e');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, TILE / 2 - 5, 0, Math.PI * 2);
  ctx.fill();
  // Sauce drip
  ctx.fillStyle = '#c8421f';
  ctx.beginPath();
  ctx.ellipse(cx, cy - 2, TILE / 2 - 4, 4, 0, Math.PI, 0);
  ctx.fill();
  // Sparkle
  ctx.fillStyle = '#fff5d8';
  ctx.fillRect(cx - 5, cy - 6, 2, 2);
  // Cheese flakes (a few)
  ctx.fillStyle = '#f0d066';
  ctx.fillRect(cx + 2, cy - 8 + bob * 0.3, 2, 2);
  ctx.fillRect(cx - 7, cy - 4, 2, 1);
}

function drawBlock(ctx, b, t) {
  const x = b.c * TILE;
  const y = b.r * TILE;
  const w = b.w * TILE;
  const h = b.h * TILE;
  // Ravioli pillow body
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, '#e89455');
  g.addColorStop(0.5, COLORS.block);
  g.addColorStop(1, '#9a4a25');
  ctx.fillStyle = g;
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  // Crimped edges
  ctx.strokeStyle = COLORS.blockEdge;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
  // Crimp marks along edges
  ctx.fillStyle = COLORS.blockEdge;
  for (let i = 0; i < w; i += 4) {
    ctx.fillRect(x + 2 + i, y + 1, 1, 2);
    ctx.fillRect(x + 2 + i, y + h - 3, 1, 2);
  }
  for (let i = 0; i < h; i += 4) {
    ctx.fillRect(x + 1, y + 2 + i, 2, 1);
    ctx.fillRect(x + w - 3, y + 2 + i, 2, 1);
  }
  // Highlight
  ctx.fillStyle = COLORS.blockHi;
  ctx.fillRect(x + 6, y + 6, Math.max(4, w / 4), 2);
  ctx.fillRect(x + 6, y + 6, 2, Math.max(4, h / 4));
  // Center dimple
  ctx.fillStyle = 'rgba(70, 24, 12, 0.55)';
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 6, 0, Math.PI * 2);
  ctx.fill();
}

function drawTurnstile(ctx, ts, t) {
  // Two-arm rotating bar with circular pivot at center
  const cx = ts.cx * TILE + TILE / 2;
  const cy = ts.cy * TILE + TILE / 2;
  let angle;
  if (ts.orientation === 'h') angle = 0;
  else angle = Math.PI / 2;

  // If rotating, interpolate from "fromOrient" base toward target
  if (ts.rotating) {
    const fromA = ts.fromOrient === 'h' ? 0 : Math.PI / 2;
    const toA = ts.toOrient === 'h' ? 0 : Math.PI / 2;
    angle = fromA + (toA - fromA) * easeOutCubic(ts.rotateT);
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  // Bar (length = 3 tiles, height = TILE - 8)
  const barLen = TILE * 3 - 8;
  const barH = TILE - 10;
  const g = ctx.createLinearGradient(0, -barH/2, 0, barH/2);
  g.addColorStop(0, '#f0d8a0');
  g.addColorStop(0.5, COLORS.turnstileBar);
  g.addColorStop(1, '#9a784a');
  ctx.fillStyle = g;
  roundRect(ctx, -barLen / 2, -barH / 2, barLen, barH, 5);
  ctx.fill();
  ctx.strokeStyle = COLORS.turnstileEdge;
  ctx.lineWidth = 2;
  ctx.stroke();
  // Wood grain lines
  ctx.strokeStyle = 'rgba(74, 41, 20, 0.4)';
  ctx.lineWidth = 1;
  for (let i = -barLen / 2 + 6; i < barLen / 2 - 6; i += 6) {
    ctx.beginPath();
    ctx.moveTo(i, -barH/2 + 4);
    ctx.lineTo(i + 2, barH/2 - 4);
    ctx.stroke();
  }
  ctx.restore();

  // Pivot ring (always upright)
  ctx.fillStyle = COLORS.turnstileCenter;
  ctx.beginPath();
  ctx.arc(cx, cy, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.spikeEdge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Inner dot
  ctx.fillStyle = '#f6e7c1';
  ctx.beginPath();
  ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawSaw(ctx, saw, t) {
  const teeth = 14;
  const spin = t * 8 + saw.id;
  ctx.save();
  ctx.translate(saw.x, saw.y);
  ctx.rotate(spin);
  ctx.fillStyle = '#e8d6ad';
  ctx.strokeStyle = '#3a1607';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? saw.r + 4 : saw.r - 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#c8421f';
  ctx.beginPath();
  ctx.arc(0, 0, saw.r * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3a1607';
  ctx.stroke();
  ctx.restore();

  if (saw.range > 0) {
    ctx.save();
    ctx.strokeStyle = 'rgba(246, 231, 193, 0.18)';
    ctx.setLineDash([4, 6]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (saw.axis === 'x') {
      ctx.moveTo(saw.x0 - saw.range, saw.y0);
      ctx.lineTo(saw.x0 + saw.range, saw.y0);
    } else {
      ctx.moveTo(saw.x0, saw.y0 - saw.range);
      ctx.lineTo(saw.x0, saw.y0 + saw.range);
    }
    ctx.stroke();
    ctx.restore();
  }
}

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Actor drawing — Spaghetti-O ring with face
function drawActor(ctx, a, isActive, t) {
  const cx = a.x + a.w / 2;
  const cy = a.y + a.h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  if (a.ghost) {
    ctx.globalAlpha = 0.42;
    ctx.shadowColor = '#7ee3ff';
    ctx.shadowBlur = 12;
  }

  // Squash/stretch
  ctx.scale(a.squash, a.stretch);

  // Subtle wobble
  const wob = Math.sin(a.animT * 8) * 0.04;
  ctx.rotate(wob * (a.vx / 200));

  // Drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(0, a.h / 2 - 1, a.w / 2 - 2, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Outer ring (the "O")
  const ringColor = a.kind === 'o' ? '#f5a056' : '#e8c474';
  const ringEdge = a.kind === 'o' ? '#5a2410' : '#5a4010';
  const innerColor = a.kind === 'o' ? '#f7c089' : '#f0d59a';

  const r = Math.min(a.w, a.h) / 2 - 1;
  // Outer disc
  const grad = ctx.createRadialGradient(-r/3, -r/3, 2, 0, 0, r);
  grad.addColorStop(0, '#ffd089');
  grad.addColorStop(0.6, ringColor);
  grad.addColorStop(1, '#b06020');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = ringEdge;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Inner hole
  ctx.fillStyle = innerColor;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = ringEdge;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Face (eyes + mouth) — drawn around the ring
  const facing = a.facing || 1;
  // Eyes
  ctx.fillStyle = '#2a1408';
  ctx.beginPath();
  ctx.arc(-3 * facing, -r * 0.7, 1.6, 0, Math.PI * 2);
  ctx.arc(5 * facing, -r * 0.7, 1.6, 0, Math.PI * 2);
  ctx.fill();
  // Mouth (smile / open if jumping)
  ctx.strokeStyle = '#2a1408';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  if (a.vy < -200) {
    // open mouth
    ctx.arc(1 * facing, r * 0.55, 2.5, 0, Math.PI);
  } else {
    ctx.arc(1 * facing, r * 0.45, 3.5, 0.1 * Math.PI, 0.9 * Math.PI);
  }
  ctx.stroke();

  // Chef hat for 't' character
  if (a.kind === 't') {
    ctx.fillStyle = '#fff5e0';
    ctx.beginPath();
    ctx.ellipse(0, -r - 4, r * 0.7, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-r * 0.45, -r - 7, 4, 0, Math.PI * 2);
    ctx.arc(0, -r - 9, 5, 0, Math.PI * 2);
    ctx.arc(r * 0.45, -r - 7, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b09060';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.restore();

  // Active indicator
  if (isActive && !a.ghost) {
    ctx.save();
    ctx.translate(cx, a.y - 10);
    const bob = Math.sin(t * 6) * 2;
    ctx.translate(0, bob);
    ctx.fillStyle = '#f5a056';
    ctx.strokeStyle = '#2a1408';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.lineTo(-5, -3);
    ctx.lineTo(5, -3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function drawBackground(ctx, t) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#241712');
  g.addColorStop(0.5, '#1a100c');
  g.addColorStop(1, '#0c0604');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Distant pasta lines (parallax-ish slow waves)
  ctx.strokeStyle = 'rgba(246, 231, 193, 0.04)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    const off = (t * 4 + i * 80) % (W + 120) - 60;
    ctx.moveTo(off, 0);
    ctx.bezierCurveTo(off + 40, H / 3, off - 40, (2 * H) / 3, off + 30, H);
    ctx.stroke();
  }

  // Sauce blobs
  for (let i = 0; i < 5; i++) {
    const seed = i * 73;
    const x = (seed * 13) % W;
    const y = (seed * 7) % H;
    ctx.fillStyle = `rgba(200, 66, 31, ${0.04 + (i % 3) * 0.02})`;
    ctx.beginPath();
    ctx.arc(x, y, 60 + (i * 13) % 30, 0, Math.PI * 2);
    ctx.fill();
  }

  // Vignette
  const vg = ctx.createRadialGradient(W/2, H/2, H/3, W/2, H/2, H);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}

function drawFX(ctx, fx, t) {
  for (const f of fx) {
    if (f.kind === 'splash') {
      const life = f.life || 0.7;
      const k = f.t / life;
      const alpha = 1 - k;
      ctx.fillStyle = `rgba(200, 66, 31, ${alpha})`;
      const r = 4 + k * 22;
      ctx.beginPath();
      ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
      ctx.fill();
      // Droplets
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const dr = r * 1.4;
        ctx.fillStyle = `rgba(168, 52, 34, ${alpha})`;
        ctx.beginPath();
        ctx.arc(f.x + Math.cos(a) * dr, f.y + Math.sin(a) * dr * 0.5, 3 * (1 - k), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (f.kind === 'launch') {
      const k = f.t / (f.life || 0.35);
      const alpha = 1 - k;
      ctx.strokeStyle = `rgba(255, 107, 42, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 8 + k * 20, Math.PI, Math.PI * 2);
      ctx.stroke();
    } else if (f.kind === 'crumb') {
      const k = f.t / (f.life || 0.45);
      ctx.fillStyle = `rgba(243, 216, 154, ${1 - k})`;
      for (let i = 0; i < 6; i++) {
        const a = i * 1.1;
        ctx.fillRect(f.x + Math.cos(a) * k * 24, f.y + Math.sin(a) * k * 12, 3, 3);
      }
    }
  }
}

// Top-level render
export function render(ctx, state, t) {
  drawBackground(ctx, t);

  // Tiles
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const tt = state.grid[r][c];
      if (tt === T.EMPTY) continue;
      const x = c * TILE;
      const y = r * TILE;
      switch (tt) {
        case T.WALL: drawWallTile(ctx, x, y); break;
        case T.SLAB: {
          // Top edge if cell above is empty/non-solid
          const above = r > 0 ? state.grid[r - 1][c] : T.EMPTY;
          const topEdge = !isSolid(above) && above !== T.SLAB;
          drawSlabTile(ctx, x, y, topEdge);
          break;
        }
        case T.SPIKE_UP: drawSpikeUp(ctx, x, y); break;
        case T.SPIKE_DOWN: drawSpikeDown(ctx, x, y); break;
        case T.SPIKE_LEFT: drawSpikeLeft(ctx, x, y); break;
        case T.SPIKE_RIGHT: drawSpikeRight(ctx, x, y); break;
        case T.PIT: drawPit(ctx, x, y); break;
        case T.PIT_FILLED: drawPitFilled(ctx, x, y); break;
        case T.CRUMBLE: {
          const crumb = state.crumbles?.get(`${c},${r}`);
          if (!crumb?.broken) drawCrumbleTile(ctx, x, y, crumb);
          break;
        }
        case T.LAUNCH: drawLaunchTile(ctx, x, y, t); break;
        case T.GOAL: drawGoal(ctx, x, y, t); break;
        default: break;
      }
    }
  }

  // Blocks
  for (const b of state.blocks) {
    if (b.consumed) continue;
    drawBlock(ctx, b, t);
  }

  // Turnstiles
  for (const ts of state.turnstiles) drawTurnstile(ctx, ts, t);

  // Moving saw blades
  for (const saw of state.saws || []) drawSaw(ctx, saw, t);

  // Best-run ghost appears behind the live actor after a level has a saved run.
  if (state.ghost) drawActor(ctx, state.ghost, false, t);

  // Actors
  for (let i = 0; i < state.actors.length; i++) {
    drawActor(ctx, state.actors[i], i === state.activeActor, t);
  }

  // FX
  drawFX(ctx, state.fx, t);

  // Level title overlay (first 2 seconds of level)
  if (state.time < 2.4) {
    const alpha = state.time < 2 ? 1 : 1 - (state.time - 2) / 0.4;
    ctx.save();
    ctx.globalAlpha = alpha;
    const tx = W / 2;
    const ty = 92;
    const bw = Math.min(W - 34, 360);
    const bh = 54;
    ctx.fillStyle = 'rgba(20, 14, 10, 0.62)';
    ctx.strokeStyle = 'rgba(245, 160, 86, 0.22)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, tx - bw / 2, ty - 28, bw, bh, 14);
    ctx.fill();
    ctx.stroke();
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f5a056';
    ctx.fillText(`LEVEL ${state.level.id}`, tx, ty - 10);
    ctx.font = '700 22px "Satoshi", sans-serif';
    ctx.fillStyle = '#f6e7c1';
    ctx.fillText(state.level.name, tx, ty + 14);
    ctx.font = '500 11px "Satoshi", sans-serif';
    ctx.fillStyle = '#b39c75';
    ctx.fillText(state.level.desc, tx, ty + 32);
    ctx.restore();
  }
}
