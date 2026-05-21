# Super Sloppy Spaghetti Yo

A browser-based precision platformer that mashes Super Meat Boy-style tight movement (run, jump, wall-slide, wall-jump, spike hazards, instant respawn, death/timer tracking) with Kwirk-style grid puzzles (pushable blocks, pit fills, rotating turnstiles, multi-character switching). The player is a sentient Spaghetti-O navigating a saucy pasta-noir industrial kitchen.

All art, sound, code, level design and brand identity are original to this project.

---

## Project path

`/home/user/workspace/super-sloppy-spaghetti-yo`

## How to run

This is a **pure static site** — no build step, no bundler, no node_modules. Modules load directly via `<script type="module">`.

```bash
cd /home/user/workspace/super-sloppy-spaghetti-yo
python3 -m http.server 5173
# open http://localhost:5173
```

Any static file server will work (`npx serve`, `caddy file-server`, etc.). The dev server is already running on port 5173 for this session.

## How to build / deploy

There is no build output directory. The site is already static. To deploy, point the deploy tool at the project root:

```
deploy_website(project_path="/home/user/workspace/super-sloppy-spaghetti-yo")
```

The entry point is `index.html` at the project root. All assets (`style.css`, `favicon.svg`, `src/*.js`) are referenced with relative paths and will resolve correctly when served from any sub-path.

## Key files

| Path | Purpose |
|---|---|
| `index.html` | Title screen, HUD chips (level/timer/deaths/active character), pause/reset/menu buttons, mobile touch controls, overlay panels (title, how-to, level select, pause, win), debug FPS counter |
| `style.css` | Pasta-noir design tokens (sauce red `#c8421f`, cream `#f6e7c1`, paprika `#f5a056`, charcoal `#14100c`), Fontshare Clash Display + Satoshi + JetBrains Mono, responsive layout with touch controls under 720px width |
| `favicon.svg` | Custom Spaghetti-O ring mark |
| `src/levels.js` | 5 hand-authored levels in ASCII tile grids plus turnstile definitions |
| `src/game.js` | Core engine — tile collision, AABB sub-stepping, push-blocks, pit-fill consumption, turnstile rotation with collision check, actor physics (gravity, run, jump, wall-slide, wall-jump, coyote, jump-buffer, variable jump cut) |
| `src/render.js` | Procedural canvas rendering of all sprites — tomato-can rivet walls, cream slabs, sauce-spike bones, ravioli pillow blocks, wooden turnstile bars, Spaghetti-O actors with animated faces |
| `src/audio.js` | Procedural Web Audio sound effects (no sample files) — jump, wall-jump, land, push, turn, die, goal, win, switch, click, select |
| `src/main.js` | Phase machine (title / how-to / levels / playing / paused / win), input handling, fixed-timestep loop, HUD wiring, Playwright test hooks |

## Gameplay features

**Movement & physics**
- Run (accel 2400, max 230 px/s) with snappy ground friction
- Jump with coyote time (0.10s) and jump buffering (0.12s) for forgiving timing
- Variable jump height — release the button early to cut the arc
- Wall slide (capped 160 px/s fall) and wall jump (290 horizontal, 600 vertical, with 0.12s input lock)
- Squash and stretch on landing for game feel
- Collision uses sub-stepped AABB to prevent tunneling at high speed
- Instant respawn on spike contact, death counter increments, timer keeps running

**Puzzle objects**
- Pushable ravioli blocks of varying sizes (1×1, 2×1, 1×2)
- Pits that consume the first block pushed onto them, becoming traversable floor
- Rotating wooden turnstiles that pivot 90° when pushed if the destination tiles are clear, animated over 220ms
- Two-character levels with E or Tab to switch active actor; only the active one accepts input

**5 levels (progressive mechanic introduction)**
1. **Al Dente Arrival** — pure movement: run, jump, basic spike avoidance
2. **Pit & Pasta** — introduces blocks and pit-fill
3. **Spin Cycle** — introduces turnstiles
4. **Sauce-Slick Shaft** — wall-jump gauntlet with spike hazards
5. **Two Chefs One Pot** — multi-character puzzle requiring switching

**UI**
- Animated title screen with logo, How To Play, Level Select buttons
- Level select grid (1-5) with best-time tracking (in-memory per session)
- HUD chips: current level name, live timer, death count, active character icon
- Pause overlay (P / Esc) with resume / reset / quit
- Win overlay with final time, deaths, retry / next / menu
- 2.4 s level intro title card on each level start
- On-screen instructions panel covering controls and mechanics

**Controls**
- Move: Arrow Left/Right or A/D
- Jump: Space, W, or Up Arrow
- Reset: R
- Switch character: E or Tab
- Pause: P or Esc

**Mobile**
- Under 720px viewport width, a touch control bar appears with Left, Right, Jump, Switch buttons that emit the same input events as the keyboard
- Canvas scales responsively while preserving 16:9 aspect via CSS

## Design decisions

- **Pure vanilla HTML/CSS/JS modules — no framework or bundler.** Removes a build step, makes the source readable end-to-end, keeps the bundle tiny (~2.3k LOC total) and ensures it deploys as static files anywhere.
- **Procedural art and audio — zero external asset files.** Every sprite is drawn each frame in `render.js` with canvas primitives (rects, paths, gradients), and every sound is synthesized in `audio.js` with Web Audio oscillators and noise buffers. This guarantees the brand is fully original and removes any IP concerns from the referenced commercial games.
- **Tile-based deterministic physics** (30 px tiles, 32×18 grid, 960×540 canvas) makes puzzles authorable as ASCII and makes collision predictable, while sub-stepping inside the actor update prevents tunneling at the high jump/fall speeds the Meat Boy feel requires.
- **In-memory state only — no localStorage.** The sandboxed iframe blocks Web Storage, so best times reset on reload. This is documented as a known limitation rather than worked around with a backend.
- **Pasta-noir aesthetic:** tomato-can industrial walls with rivets and gradient shading, cream noodle slab floors with speckles, ravioli pillow push-blocks with crimped edges, sauce-spike bone shapes, wooden turnstile bars with red pivot bolts, meatball goal that bobs and sparkles, Spaghetti-O ring characters with animated eyes and mouth. The palette derives from real pasta/sauce colors rather than a generic platformer palette.
- **Fontshare fonts (Clash Display + Satoshi + JetBrains Mono)** for distinctive UI typography that reads as confident and playful, never generic.
- **Playwright test hooks** (`window.testStartLevel`, `window.testPressKey/ReleaseKey`, `window.render_game_to_text`, `window.advanceTime`) are exposed on the global so functional QA can drive the game deterministically.

## QA performed

Functional QA was driven via Playwright through a persistent Chromium context on the local dev server.

Verified:
- Title screen loads, all overlay buttons (Start, How To, Level Select) wire correctly, zero console errors on cold load
- All 5 levels load with the expected actor count, block count and turnstile count via `render_game_to_text`
- Character switching toggles `activeActor` 0 ↔ 1 on level 5 with both E and Tab keys
- Pause toggles `paused` flag and unfreezes on second press, screenshot captured of pause overlay
- Reset (R) snaps the actor back to spawn coordinates and the level continues
- Movement (Arrow Right) advances the actor x position smoothly
- Spike collision triggers respawn and increments the death counter (verified by walking into the spike row on Level 1)
- All 5 levels rendered cleanly at 1280×720 desktop
- Mobile viewport (375×720) renders title and gameplay with touch controls visible

Screenshots saved in project root as `qa-01-title.png` through `qa-20-pause.png`.

## Known limitations

- **No persistent saves.** Best times and progress reset on page reload because the sandboxed iframe blocks `localStorage`, `sessionStorage`, `indexedDB`, and cookies.
- **Fonts require network.** Clash Display and Satoshi load from the Fontshare CDN; offline users will fall back to system sans-serif.
- **Physical mobile device QA not performed.** Touch controls were verified visually under a 375px CSS media query but have not been validated on a real iOS/Android device. Multi-touch (hold left + jump simultaneously) is supported via independent pointer events but may behave differently across mobile browsers.
- **Best Level 1 path is challenging.** Level 1 mixes a small spike row with the intended jump path; the test bot dies on a straight right-walk by design — completing it requires a jump.
- **No audio on first load until user gesture.** Web Audio context is suspended until any click/keypress, per browser autoplay policy. The title screen click resumes it.
