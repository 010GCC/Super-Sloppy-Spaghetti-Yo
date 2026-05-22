// Super Sloppy Spaghetti Yo — core game module
// Vanilla canvas 2D. Tile-based physics tuned for precision platforming.

import { LEVELS } from './levels.js';

export const TILE = 30;
export const COLS = 18;
export const ROWS = 32;
export const W = COLS * TILE; // 540
export const H = ROWS * TILE; // 960

// Tile types (numeric for fast lookup)
export const T = {
  EMPTY: 0,
  WALL: 1,        // # tomato-can wall
  SLAB: 2,        // = cream slab (solid, same as wall but rendered differently)
  SPIKE_UP: 3,
  SPIKE_DOWN: 4,
  SPIKE_LEFT: 5,  // points right (mounted on left wall) -> actually visualized as pointing into open space
  SPIKE_RIGHT: 6,
  PIT: 7,         // empty pit; deadly to player
  PIT_FILLED: 8,  // pit filled by block (solid)
  GOAL: 9,        // goal flag (not solid)
  CHECKPOINT: 10,
  CRUMBLE: 11,    // crumbly pasta cracker platform
  LAUNCH: 12,     // springy sauce launcher
};

export function isSolid(t) {
  return t === T.WALL || t === T.SLAB || t === T.PIT_FILLED || t === T.CRUMBLE || t === T.LAUNCH;
}
export function isHazard(t) {
  return t === T.SPIKE_UP || t === T.SPIKE_DOWN || t === T.SPIKE_LEFT || t === T.SPIKE_RIGHT;
}

// Parse a level grid (array of strings) into a 2D number array.
export function parseLevel(level) {
  const grid = [];
  const blocks = [];
  const spawns = { o: null, t: null };
  const goals = [];
  const crumbles = [];
  for (let r = 0; r < level.rows; r++) {
    const row = [];
    const src = level.grid[r] || '';
    for (let c = 0; c < level.cols; c++) {
      const ch = src[c] || '.';
      let tile = T.EMPTY;
      switch (ch) {
        case '#': tile = T.WALL; break;
        case '=': tile = T.SLAB; break;
        case '^': tile = T.SPIKE_UP; break;
        case 'v': tile = T.SPIKE_DOWN; break;
        case '<': tile = T.SPIKE_LEFT; break;
        case '>': tile = T.SPIKE_RIGHT; break;
        case 'o': tile = T.PIT; break;
        case 'G': tile = T.GOAL; goals.push({ c, r }); break;
        case '-': tile = T.CHECKPOINT; break;
        case 'c': tile = T.CRUMBLE; crumbles.push({ c, r }); break;
        case 'j': tile = T.LAUNCH; break;
        case 'S': spawns.o = { c, r }; break;
        case 'T': spawns.t = { c, r }; break;
        case 'B': blocks.push({ c, r, w: 1, h: 1, kind: 'small' }); break;
        case 'L': blocks.push({ c, r, w: 2, h: 1, kind: 'wide' }); break;
        case 'M': blocks.push({ c, r, w: 1, h: 2, kind: 'tall' }); break;
      }
      row.push(tile);
    }
    grid.push(row);
  }
  // Turnstiles: define their arm cells based on orientation
  const turnstiles = (level.turnstiles || []).map((t, i) => ({
    id: i,
    cx: t.col,
    cy: t.row,
    orientation: t.orientation, // 'h' or 'v'
    rotating: false,
    rotateT: 0, // 0..1
    fromOrient: t.orientation,
    toOrient: t.orientation,
  }));
  const saws = (level.saws || []).map((s, i) => ({
    id: i,
    x0: (s.col + 0.5) * TILE,
    y0: (s.row + 0.5) * TILE,
    axis: s.axis || 'x',
    range: (s.range || 0) * TILE,
    speed: s.speed || 1,
    phase: s.phase || 0,
    x: (s.col + 0.5) * TILE,
    y: (s.row + 0.5) * TILE,
    r: s.radius || 13,
    t: 0,
  }));
  return { grid, blocks, spawns, goals, turnstiles, saws, crumbles };
}

// Get arm cells for a turnstile.
export function turnstileArmCells(ts) {
  if (ts.orientation === 'h') {
    return [{ c: ts.cx - 1, r: ts.cy }, { c: ts.cx + 1, r: ts.cy }];
  }
  return [{ c: ts.cx, r: ts.cy - 1 }, { c: ts.cx, r: ts.cy + 1 }];
}
export function turnstileCenterCell(ts) { return { c: ts.cx, r: ts.cy }; }

// Sample a tile from the world (returns WALL if out of bounds)
export function tileAt(state, c, r) {
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return T.WALL;
  return state.grid[r][c];
}

// Returns true if cell (c,r) is occupied by any solid object (tile, block, turnstile).
// `ignoreActorId` is an actor id to skip (e.g., when checking the actor's destination).
// `ignoreBlockId` is a block id to skip.
export function cellSolid(state, c, r, opts = {}) {
  const t = tileAt(state, c, r);
  if (isSolid(t)) return true;
  // Check blocks
  for (const b of state.blocks) {
    if (opts.ignoreBlockId === b.id) continue;
    if (c >= b.c && c < b.c + b.w && r >= b.r && r < b.r + b.h) return true;
  }
  // Check turnstiles (only when not rotating)
  for (const ts of state.turnstiles) {
    if (ts.rotating) continue;
    if (ts.cx === c && ts.cy === r) return true; // center is solid pivot
    const arms = turnstileArmCells(ts);
    for (const a of arms) if (a.c === c && a.r === r) return true;
  }
  return false;
}

// Check if a cell is a hazard
export function cellHazard(state, c, r) {
  const t = tileAt(state, c, r);
  if (t === T.PIT) return true;
  if (isHazard(t)) return true;
  return false;
}

// Try to push a block by (dx,0) — only horizontal pushes implemented (1 cell at a time)
// Returns true if pushed.
export function tryPushBlock(state, block, dx) {
  if (dx === 0) return false;
  const dir = dx > 0 ? 1 : -1;
  // Destination cells: the column(s) immediately ahead of the block in direction dir,
  // spanning all rows the block occupies.
  const destC = dir > 0 ? block.c + block.w : block.c - 1;
  // For 2-wide block, only the leading column needs to be checked (front).
  // For each row r in block, check cell (destC, r) is empty (no solid, no other block, no turnstile arm/center, no spike).
  for (let dr = 0; dr < block.h; dr++) {
    const r = block.r + dr;
    const t = tileAt(state, destC, r);
    if (isSolid(t)) return false;
    if (isHazard(t)) return false;
    // Allow pushing into PIT — block falls in!
    // Check blocks
    for (const b of state.blocks) {
      if (b === block) continue;
      if (destC >= b.c && destC < b.c + b.w && r >= b.r && r < b.r + b.h) return false;
    }
    // Check turnstiles (block can't push through turnstile bars)
    for (const ts of state.turnstiles) {
      if (ts.cx === destC && ts.cy === r) return false;
      const arms = turnstileArmCells(ts);
      for (const a of arms) if (a.c === destC && a.r === r) return false;
    }
  }
  // Move block
  block.c += dir;
  // After moving, check if any of the cells the block occupies are pits.
  // A small (1x1) block dropped into a pit fills it and the block is consumed.
  // A 2x1 block fills both pits if both new cells are pits — otherwise it sits on partial pit (treat as not filling unless ALL its bottom row is pit).
  const newCells = [];
  for (let dc = 0; dc < block.w; dc++) for (let dr = 0; dr < block.h; dr++) newCells.push({ c: block.c + dc, r: block.r + dr });
  // Only the BOTTOM row of the block matters for pit-filling (pits are floor holes).
  const bottomRow = block.r + block.h - 1;
  let allPit = true;
  for (let dc = 0; dc < block.w; dc++) {
    if (tileAt(state, block.c + dc, bottomRow) !== T.PIT) { allPit = false; break; }
  }
  if (allPit && block.h === 1) {
    // Fill pits beneath block
    for (let dc = 0; dc < block.w; dc++) {
      state.grid[bottomRow][block.c + dc] = T.PIT_FILLED;
    }
    block.consumed = true;
    state.fx.push({ kind: 'splash', x: (block.c + block.w/2) * TILE, y: (block.r + block.h) * TILE, t: 0 });
  }
  // SFX hook
  if (state.onSfx) state.onSfx('push');
  return true;
}

// Try rotating a turnstile 90 degrees. Requires the two destination arm cells to be empty (and not hazards/solids).
export function tryRotateTurnstile(state, ts) {
  if (ts.rotating) return false;
  const newOrient = ts.orientation === 'h' ? 'v' : 'h';
  const targetArms = newOrient === 'h'
    ? [{ c: ts.cx - 1, r: ts.cy }, { c: ts.cx + 1, r: ts.cy }]
    : [{ c: ts.cx, r: ts.cy - 1 }, { c: ts.cx, r: ts.cy + 1 }];
  for (const a of targetArms) {
    const t = tileAt(state, a.c, a.r);
    if (isSolid(t)) return false;
    if (isHazard(t)) return false;
    if (t === T.PIT) return false;
    // Check blocks
    for (const b of state.blocks) {
      if (a.c >= b.c && a.c < b.c + b.w && a.r >= b.r && a.r < b.r + b.h) return false;
    }
    // Check other turnstiles
    for (const other of state.turnstiles) {
      if (other === ts) continue;
      if (other.cx === a.c && other.cy === a.r) return false;
      const oa = turnstileArmCells(other);
      for (const x of oa) if (x.c === a.c && x.r === a.r) return false;
    }
    // Check if actor is in the destination cell — can't crush
    for (const ac of state.actors) {
      if (!ac.alive) continue;
      const ax = Math.floor((ac.x + ac.w / 2) / TILE);
      const ay = Math.floor((ac.y + ac.h / 2) / TILE);
      if (ax === a.c && ay === a.r) return false;
    }
  }
  ts.fromOrient = ts.orientation;
  ts.toOrient = newOrient;
  ts.orientation = newOrient; // commit immediately so cellSolid uses new orientation
  ts.rotating = true;
  ts.rotateT = 0;
  if (state.onSfx) state.onSfx('turn');
  return true;
}

// Update turnstile rotation animation
export function updateTurnstiles(state, dt) {
  for (const ts of state.turnstiles) {
    if (!ts.rotating) continue;
    ts.rotateT += dt / 0.22; // 220ms
    if (ts.rotateT >= 1) {
      ts.rotateT = 1;
      ts.rotating = false;
    }
  }
}

// Create initial game state for a level.
export function createState(levelIndex) {
  const level = LEVELS[levelIndex];
  const parsed = parseLevel(level);
  const actors = [];
  const charKinds = level.chars || ['o'];
  charKinds.forEach((kind, idx) => {
    const sp = parsed.spawns[kind];
    if (!sp) return;
    actors.push(makeActor(kind, sp.c, sp.r, idx));
  });
  parsed.blocks.forEach((b, i) => { b.id = i; });
  return {
    level,
    levelIndex,
    grid: parsed.grid,
    blocks: parsed.blocks,
    turnstiles: parsed.turnstiles,
    saws: parsed.saws,
    crumbles: new Map(parsed.crumbles.map((c) => [`${c.c},${c.r}`, { c: c.c, r: c.r, touched: false, t: 0, broken: false }])),
    goals: parsed.goals,
    spawns: parsed.spawns,
    actors,
    activeActor: 0,
    deaths: 0,
    time: 0,
    won: false,
    paused: false,
    fx: [],
    pushCooldown: 0,
    onSfx: null,
  };
}

function makeActor(kind, c, r, id) {
  return {
    id,
    kind, // 'o' or 't'
    x: c * TILE + 1,
    y: r * TILE,
    w: TILE - 4,
    h: TILE - 2,
    vx: 0,
    vy: 0,
    onGround: false,
    wallDir: 0, // -1 = wall on left, 1 = wall on right, 0 = none
    facing: 1,
    coyote: 0,
    jumpBuffer: 0,
    wallJumpLock: 0, // brief horizontal-lock after a wall jump
    alive: true,
    inGoal: false,
    spawnC: c, spawnR: r,
    animT: 0,
    squash: 1, // 1=normal
    stretch: 1,
  };
}

// Tunables (snappy pasta physics — fast starts, readable air control, instant retries)
export const PHYS = {
  GRAVITY: 1900,
  MAX_FALL: 980,
  RUN_ACCEL: 3200,
  RUN_MAX: 265,
  GROUND_FRICTION: 18, // multiplier
  AIR_FRICTION: 4,
  JUMP_VEL: 620,
  JUMP_CUT: 0.45,
  WALL_SLIDE_VEL: 160,
  WALL_JUMP_VX: 330,
  WALL_JUMP_VY: 620,
  WALL_JUMP_LOCK: 0.12,
  COYOTE: 0.10,
  JUMP_BUFFER: 0.12,
  LAUNCH_VEL: 840,
};

// Move actor on one axis (axis-aligned sweep against tiles + blocks + turnstiles).
// Returns { collided: boolean, isHazard: boolean, pushed: boolean }
function moveActor(state, actor, dx, dy, input) {
  const result = { collidedX: false, collidedY: false, hazard: false, pushed: false };

  // Move X
  if (dx !== 0) {
    actor.x += dx;
    const box = actorBox(actor);
    const colliders = collectColliders(state, box);
    for (const col of colliders) {
      if (col.hazard) { result.hazard = true; }
      if (col.solid) {
        if (dx > 0) {
          // Try pushing if it's a block and player is running into it (and grounded? allow pushing in air too but typically grounded)
          if (col.block && state.pushCooldown <= 0) {
            if (tryPushBlock(state, col.block, 1)) {
              state.pushCooldown = 0.14;
              actor.x = col.block.c * TILE - actor.w - 0.01 + (dx > 0 ? -1 : 1) * 0; // re-snap to block's new left edge
              // Re-snap: place actor flush against the (now moved) block's left side.
              actor.x = col.block.c * TILE - actor.w - 0.01;
              actor.vx = 0;
              result.collidedX = true;
              result.pushed = true;
              break;
            }
          }
          if (col.turnstile) {
            // Try rotating it
            if (state.pushCooldown <= 0 && tryRotateTurnstile(state, col.turnstile)) {
              state.pushCooldown = 0.30;
            }
          }
          actor.x = col.rect.x - actor.w - 0.01;
          actor.vx = 0;
          result.collidedX = true;
          break;
        } else {
          if (col.block && state.pushCooldown <= 0) {
            if (tryPushBlock(state, col.block, -1)) {
              state.pushCooldown = 0.14;
              actor.x = (col.block.c + col.block.w) * TILE + 0.01;
              actor.vx = 0;
              result.collidedX = true;
              result.pushed = true;
              break;
            }
          }
          if (col.turnstile) {
            if (state.pushCooldown <= 0 && tryRotateTurnstile(state, col.turnstile)) {
              state.pushCooldown = 0.30;
            }
          }
          actor.x = col.rect.x + col.rect.w + 0.01;
          actor.vx = 0;
          result.collidedX = true;
          break;
        }
      }
    }
  }

  // Move Y
  if (dy !== 0) {
    actor.y += dy;
    const box = actorBox(actor);
    const colliders = collectColliders(state, box);
    for (const col of colliders) {
      if (col.hazard) { result.hazard = true; }
      if (col.solid) {
        if (dy > 0) {
          actor.y = col.rect.y - actor.h - 0.01;
          if (col.tileType === T.LAUNCH) {
            actor.vy = -PHYS.LAUNCH_VEL;
            actor.onGround = false;
            actor.stretch = 1.32;
            actor.squash = 0.78;
            state.fx.push({ kind: 'launch', x: actor.x + actor.w / 2, y: col.rect.y + 4, t: 0, life: 0.35 });
            if (state.onSfx) state.onSfx('jump');
          } else {
            actor.vy = 0;
            actor.onGround = true;
            if (col.tileType === T.CRUMBLE && col.crumbleKey) touchCrumble(state, col.crumbleKey);
          }
          result.collidedY = true;
          break;
        } else {
          actor.y = col.rect.y + col.rect.h + 0.01;
          actor.vy = 0;
          result.collidedY = true;
          break;
        }
      }
    }
  }

  return result;
}

function actorBox(a) {
  return { x: a.x, y: a.y, w: a.w, h: a.h };
}
function rectOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Collect all potential colliders that overlap the actor's box.
// Returns array of {solid, hazard, rect, block?, turnstile?, tileType?}
function collectColliders(state, box) {
  const out = [];
  const c0 = Math.max(0, Math.floor(box.x / TILE));
  const c1 = Math.min(COLS - 1, Math.floor((box.x + box.w) / TILE));
  const r0 = Math.max(0, Math.floor(box.y / TILE));
  const r1 = Math.min(ROWS - 1, Math.floor((box.y + box.h) / TILE));
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const t = state.grid[r][c];
      const rect = { x: c * TILE, y: r * TILE, w: TILE, h: TILE };
      if (!rectOverlap(rect, box)) continue;
      if (t === T.CRUMBLE) {
        const key = `${c},${r}`;
        const crumb = state.crumbles?.get(key);
        if (!crumb?.broken) out.push({ solid: true, rect, tileType: t, crumbleKey: key });
      } else if (isSolid(t)) out.push({ solid: true, rect, tileType: t });
      else if (t === T.PIT) {
        // Pit is hazard only when actor's feet enter it (centered overlap)
        out.push({ solid: false, hazard: true, rect, tileType: t });
      } else if (isHazard(t)) {
        // Spikes — slightly smaller hitbox
        const pad = 6;
        const sbox = { x: rect.x + pad, y: rect.y + pad, w: TILE - pad*2, h: TILE - pad*2 };
        if (rectOverlap(sbox, box)) out.push({ solid: false, hazard: true, rect, tileType: t });
      }
    }
  }
  // Blocks
  for (const b of state.blocks) {
    if (b.consumed) continue;
    const rect = { x: b.c * TILE, y: b.r * TILE, w: b.w * TILE, h: b.h * TILE };
    if (rectOverlap(rect, box)) out.push({ solid: true, rect, block: b });
  }
  // Turnstiles
  for (const ts of state.turnstiles) {
    if (ts.rotating) continue; // pass-through during animation
    const center = { x: ts.cx * TILE, y: ts.cy * TILE, w: TILE, h: TILE };
    if (rectOverlap(center, box)) out.push({ solid: true, rect: center, turnstile: ts });
    const arms = turnstileArmCells(ts);
    for (const a of arms) {
      const ar = { x: a.c * TILE, y: a.r * TILE, w: TILE, h: TILE };
      if (rectOverlap(ar, box)) out.push({ solid: true, rect: ar, turnstile: ts });
    }
  }
  // Moving saw blades
  for (const s of state.saws || []) {
    const rect = { x: s.x - s.r + 3, y: s.y - s.r + 3, w: (s.r - 3) * 2, h: (s.r - 3) * 2 };
    if (rectOverlap(rect, box)) out.push({ solid: false, hazard: true, rect, saw: s });
  }
  return out;
}

function touchCrumble(state, key) {
  const c = state.crumbles?.get(key);
  if (!c || c.touched || c.broken) return;
  c.touched = true;
  c.t = 0;
  state.fx.push({ kind: 'crumb', x: (c.c + 0.5) * TILE, y: (c.r + 0.5) * TILE, t: 0, life: 0.45 });
}

function updateCrumbles(state, dt) {
  if (!state.crumbles) return;
  for (const c of state.crumbles.values()) {
    if (!c.touched && !c.broken) continue;
    c.t += dt;
    if (c.touched && !c.broken && c.t > 0.32) {
      c.broken = true;
      c.touched = false;
      c.t = 0;
    } else if (c.broken && c.t > 2.1) {
      c.broken = false;
      c.touched = false;
      c.t = 0;
    }
  }
}

function updateSaws(state, dt) {
  for (const s of state.saws || []) {
    s.t += dt;
    const k = Math.sin((s.t * s.speed + s.phase) * Math.PI * 2);
    s.x = s.x0 + (s.axis === 'x' ? k * s.range : 0);
    s.y = s.y0 + (s.axis === 'y' ? k * s.range : 0);
  }
}

// Detect if actor is currently pressed against a wall on a given side.
// Returns -1 if wall on left, 1 if wall on right, 0 if none.
function detectWall(state, actor) {
  // Probe a few pixels to the side.
  const probeWidth = 2;
  const left = { x: actor.x - probeWidth, y: actor.y + 2, w: probeWidth, h: actor.h - 4 };
  const right = { x: actor.x + actor.w, y: actor.y + 2, w: probeWidth, h: actor.h - 4 };
  const lc = collectColliders(state, left).some(c => c.solid);
  const rc = collectColliders(state, right).some(c => c.solid);
  if (lc) return -1;
  if (rc) return 1;
  return 0;
}

// Detect grounded
function detectGround(state, actor) {
  const probe = { x: actor.x + 2, y: actor.y + actor.h, w: actor.w - 4, h: 2 };
  return collectColliders(state, probe).some(c => c.solid);
}

// Step physics for one actor
function stepActor(state, actor, input, dt) {
  if (!actor.alive) return;

  // Horizontal input
  let ix = 0;
  if (input.left) ix -= 1;
  if (input.right) ix += 1;
  if (ix !== 0) actor.facing = ix;

  // Apply horizontal acceleration (with wall-jump lock period)
  if (actor.wallJumpLock <= 0) {
    if (ix !== 0) {
      actor.vx += ix * PHYS.RUN_ACCEL * dt;
    }
  } else {
    actor.wallJumpLock -= dt;
  }

  // Cap
  if (actor.vx > PHYS.RUN_MAX) actor.vx = PHYS.RUN_MAX;
  if (actor.vx < -PHYS.RUN_MAX) actor.vx = -PHYS.RUN_MAX;

  // Friction
  if (ix === 0 && actor.wallJumpLock <= 0) {
    const friction = actor.onGround ? PHYS.GROUND_FRICTION : PHYS.AIR_FRICTION;
    actor.vx -= actor.vx * Math.min(1, friction * dt);
    if (Math.abs(actor.vx) < 5) actor.vx = 0;
  }

  // Gravity (with wall slide)
  const sliding = !actor.onGround && actor.wallDir !== 0 && ((actor.wallDir === -1 && input.left) || (actor.wallDir === 1 && input.right));
  if (sliding) {
    actor.vy += PHYS.GRAVITY * 0.4 * dt;
    if (actor.vy > PHYS.WALL_SLIDE_VEL) actor.vy = PHYS.WALL_SLIDE_VEL;
  } else {
    actor.vy += PHYS.GRAVITY * dt;
    if (actor.vy > PHYS.MAX_FALL) actor.vy = PHYS.MAX_FALL;
  }

  // Jump input
  if (input.jumpPressed) actor.jumpBuffer = PHYS.JUMP_BUFFER;
  else actor.jumpBuffer -= dt;

  // Jump execution
  if (actor.jumpBuffer > 0) {
    if (actor.onGround || actor.coyote > 0) {
      actor.vy = -PHYS.JUMP_VEL;
      actor.onGround = false;
      actor.coyote = 0;
      actor.jumpBuffer = 0;
      actor.stretch = 1.18;
      if (state.onSfx) state.onSfx('jump');
    } else if (actor.wallDir !== 0) {
      // Wall jump
      actor.vy = -PHYS.WALL_JUMP_VY;
      actor.vx = -actor.wallDir * PHYS.WALL_JUMP_VX;
      actor.wallJumpLock = PHYS.WALL_JUMP_LOCK;
      actor.facing = -actor.wallDir;
      actor.jumpBuffer = 0;
      actor.stretch = 1.18;
      if (state.onSfx) state.onSfx('walljump');
    }
  }

  // Variable jump height: if jump released early while rising, cut velocity
  if (!input.jumpHeld && actor.vy < 0) {
    actor.vy *= 1 - PHYS.JUMP_CUT * Math.min(1, dt * 30);
  }

  // Reset onGround; will be set in collision
  const wasGrounded = actor.onGround;
  actor.onGround = false;

  // Move
  const stepX = actor.vx * dt;
  const stepY = actor.vy * dt;
  // Sub-step for large movements to avoid tunneling
  const stepsN = Math.max(1, Math.ceil(Math.max(Math.abs(stepX), Math.abs(stepY)) / (TILE * 0.4)));
  for (let s = 0; s < stepsN; s++) {
    const r = moveActor(state, actor, stepX / stepsN, stepY / stepsN, input);
    if (r.hazard) { actor.alive = false; if (state.onSfx) state.onSfx('die'); }
  }

  // Detect wall after moving
  actor.wallDir = detectWall(state, actor);
  // Detect ground (in case onGround wasn't set during this frame's Y move)
  if (!actor.onGround && actor.vy >= 0) actor.onGround = detectGround(state, actor);

  // Coyote
  if (actor.onGround) actor.coyote = PHYS.COYOTE;
  else actor.coyote -= dt;

  // Land squash
  if (!wasGrounded && actor.onGround) {
    actor.squash = 1.25;
    actor.stretch = 0.85;
    if (state.onSfx) state.onSfx('land');
  }

  // Pit fall (when actor center is over a PIT tile)
  const cx = Math.floor((actor.x + actor.w / 2) / TILE);
  const cy = Math.floor((actor.y + actor.h - 2) / TILE);
  const ft = tileAt(state, cx, cy);
  if (ft === T.PIT && actor.y + actor.h > cy * TILE + 6) {
    actor.alive = false;
    if (state.onSfx) state.onSfx('die');
    state.fx.push({ kind: 'splash', x: actor.x + actor.w/2, y: actor.y + actor.h, t: 0 });
  }

  // Fall-off-world
  if (actor.y > H + 200) { actor.alive = false; }

  // Anim ease squash/stretch back
  actor.squash += (1 - actor.squash) * Math.min(1, dt * 12);
  actor.stretch += (1 - actor.stretch) * Math.min(1, dt * 12);

  actor.animT += dt;

  // Goal check
  if (!actor.inGoal) {
    for (const g of state.goals) {
      const gr = { x: g.c * TILE, y: g.r * TILE, w: TILE, h: TILE };
      if (rectOverlap(actorBox(actor), gr)) {
        actor.inGoal = true;
        if (state.onSfx) state.onSfx('goal');
        break;
      }
    }
  } else {
    // If actor leaves goal, mark as not in goal again? — keep sticky for multi-char convenience.
  }
}

// Main update
export function update(state, input, dt) {
  if (state.paused || state.won) return;
  state.time += dt;
  state.pushCooldown = Math.max(0, state.pushCooldown - dt);
  updateSaws(state, dt);
  updateCrumbles(state, dt);

  // Active actor receives input; others are idle
  for (let i = 0; i < state.actors.length; i++) {
    const a = state.actors[i];
    const isActive = (i === state.activeActor);
    const actInput = isActive ? input : { left: false, right: false, jumpPressed: false, jumpHeld: false };
    stepActor(state, a, actInput, dt);
  }

  updateTurnstiles(state, dt);

  // Death respawn: if active actor died, respawn immediately. If a non-active actor died, also respawn (keep both alive).
  let died = false;
  for (const a of state.actors) {
    if (!a.alive) {
      a.x = a.spawnC * TILE + 1;
      a.y = a.spawnR * TILE;
      a.vx = 0; a.vy = 0;
      a.alive = true;
      a.inGoal = false;
      died = true;
    }
  }
  if (died) state.deaths++;

  // FX update
  for (const fx of state.fx) fx.t += dt;
  state.fx = state.fx.filter(fx => fx.t < (fx.life || 0.7));

  // Win check: all actors must be in goal simultaneously
  const allInGoal = state.actors.every(a => a.inGoal);
  if (allInGoal && state.actors.length > 0) {
    state.won = true;
  }
}

export function resetLevel(state) {
  const fresh = createState(state.levelIndex);
  fresh.onSfx = state.onSfx;
  // Preserve overall deaths? Spec says per-level deaths shown, so reset on full reset.
  // But we want to count deaths from R-press as one death. Keep state.deaths if you prefer.
  fresh.deaths = state.deaths; // preserve current per-level deaths
  return fresh;
}

export function switchActor(state) {
  if (state.actors.length <= 1) return;
  state.activeActor = (state.activeActor + 1) % state.actors.length;
  if (state.onSfx) state.onSfx('switch');
}
