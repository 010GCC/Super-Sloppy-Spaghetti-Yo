# Super Sloppy Spaghetti Yo

A browser-based precision platformer starring a sentient Spaghetti-O in a saucy tomato-can factory. The current direction drops the Kwirk-style puzzle focus and leans into speed, wall-slides, wall-jumps, moving saws, launch pads, crumble platforms, spike reads, instant respawns, medal targets, best-run ghosts, and short levels built for clean reruns.

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

Any static file server will work (`npx serve`, `caddy file-server`, etc.).

## How to build / deploy

There is no build output directory. The site is already static. Deploy the project root:

```
deploy_website(project_path="/home/user/workspace/super-sloppy-spaghetti-yo")
```

The entry point is `index.html` at the project root. All assets (`style.css`, `favicon.svg`, `src/*.js`) are referenced with relative paths and will resolve correctly when served from any sub-path.

## Key files

| Path | Purpose |
|---|---|
| `index.html` | Title screen, HUD, pause/reset/menu buttons, mobile touch controls, overlay panels |
| `style.css` | Pasta-noir design tokens, responsive layout, touch control styling |
| `favicon.svg` | Custom Spaghetti-O ring mark |
| `src/levels.js` | 5 hand-authored precision-platforming levels in ASCII tile grids plus declared saw paths |
| `src/game.js` | Core engine — tile collision, moving saws, crumble platforms, launch pads, AABB sub-stepping, wall-slide, wall-jump, coyote time, jump buffering |
| `src/render.js` | Procedural canvas rendering of tiles, spikes, saws, launch pads, crumble platforms, best-run ghosts, goal, actors, and dormant puzzle-object visuals |
| `src/audio.js` | Procedural Web Audio sound effects |
| `src/main.js` | Phase machine, input handling, fixed-timestep loop, HUD wiring, speedrun session state, responsive orientation classes, Playwright test hooks |

## Gameplay features

**Movement & physics**
- Run with higher acceleration and top speed than v1 for a snappier Meat Boy-inspired feel.
- Jump with coyote time and jump buffering for forgiving timing.
- Variable jump height: release jump early to cut the arc.
- Wall slide and wall jump for vertical gauntlets.
- Collision uses sub-stepped AABB to prevent tunneling at high speed.
- Instant respawn on spike contact, death counter increments, timer keeps running.

**Hazards & platforming toys**
- Moving saw blades travel on horizontal or vertical rails and instantly respawn the player on contact.
- Crumble platforms shake, break after a short delay, and respawn so the player has to keep moving.
- Launch pads bounce the player upward for fast routes and vertical exits.
- Static spikes and pits still provide readable one-touch hazards.

**5 platforming-first levels**
1. **Launch Lunch** — introduces sauce launch pads.
2. **Buzzsaw Bucatini** — introduces moving saw timing.
3. **Cracker Collapse** — introduces crumble platforms.
4. **Wall Sauce Deluxe** — wall-jump shaft with moving saw pressure.
5. **The Final Slopline** — mixed final gauntlet with pads, crumble, saws, spikes, and flow.

**UI**
- Animated title screen with logo, How To Play, and Level Select.
- Level select grid with best-time tracking, medal status, and ghost availability in memory.
- HUD chips for current level, timer, death count, and active medal pace.
- Pause overlay with resume / reset / quit.
- Win overlay with final time, deaths, medal result, best ghost status, retry / next / menu.
- Touch controls on mobile-sized viewports.

**Speedrun layer**
- Each level has gold, silver, and bronze target times.
- Completing a level saves the best time and a translucent best-run ghost for that level.
- Level select shows best time, medal status, and session total progress.
- Clearing every level shows a full-clear total time on the win screen.
- Speedrun data is in-memory only and resets when the page reloads.

**Auto-rotate / responsive play**
- The game listens for `resize` and `orientationchange` events and updates orientation classes immediately.
- Landscape mobile fills the available viewport while preserving the 16:9 canvas.
- Portrait touch devices use a CSS auto-rotate frame so the game remains landscape-shaped instead of stretching vertically.
- Browser orientation-lock and fullscreen APIs are intentionally not used because the hosted preview iframe blocks them.

## Controls

- Move: Arrow Left/Right or A/D
- Jump: Space, W, or Up Arrow
- Reset: R
- Pause: P or Esc
- Mute: M

## Design decisions

- **Pure vanilla HTML/CSS/JS modules**: no framework or bundler, easy static deployment.
- **Procedural art and audio**: zero external sprite or sample files, fully original visual/audio identity.
- **Short reset-loop levels**: every level is meant to be readable, retryable, and speedrunnable rather than a logic puzzle.
- **Puzzle systems kept dormant**: push blocks, pit-filling, turnstiles, and multi-character switching are still in the engine, but current levels do not require them. This preserves optional future remix potential without compromising the platforming direction.
- **Pasta-noir aesthetic**: tomato-can industrial walls, cream slab platforms, sauce-bone spikes, meatball goal, and a Spaghetti-O ring character.

## Known limitations

- **No persistent saves.** Best times, medals, ghosts, and progress reset on page reload because the sandboxed iframe blocks browser storage.
- **Fonts require network.** Fontshare fonts load from the CDN; offline users fall back to system sans-serif.
- **Physical mobile device QA not performed.** Touch controls and responsive auto-rotate behavior are implemented and tested through browser viewport emulation, but should still be checked on real phones.
- **No online leaderboards yet.** Medal targets and best-run ghosts are implemented; global scores would need a backend.
