# Super Sloppy Spaghetti Yo

A browser-based precision platformer starring a sentient Spaghetti-O in a saucy tomato-can factory. This v2 direction drops the Kwirk-style puzzle focus and leans into speed, wall-slides, wall-jumps, spike reads, instant respawns, and short levels built for clean reruns.

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
| `src/levels.js` | 5 hand-authored precision-platforming levels in ASCII tile grids |
| `src/game.js` | Core engine — tile collision, AABB sub-stepping, actor physics, hazards, wall-slide, wall-jump, coyote time, jump buffering |
| `src/render.js` | Procedural canvas rendering of tiles, spikes, goal, actors, and dormant puzzle-object visuals |
| `src/audio.js` | Procedural Web Audio sound effects |
| `src/main.js` | Phase machine, input handling, fixed-timestep loop, HUD wiring, Playwright test hooks |

## Gameplay features

**Movement & physics**
- Run with higher acceleration and top speed than v1 for a snappier Meat Boy-inspired feel.
- Jump with coyote time and jump buffering for forgiving timing.
- Variable jump height: release jump early to cut the arc.
- Wall slide and wall jump for vertical gauntlets.
- Collision uses sub-stepped AABB to prevent tunneling at high speed.
- Instant respawn on spike contact, death counter increments, timer keeps running.

**5 platforming-first levels**
1. **Slop Sprint** — clean warm-up with gaps and spike rows.
2. **Sauce-Slick Chimney** — dedicated wall-jump practice.
3. **Needle Linguine** — horizontal spike rhythm and commitment jumps.
4. **Can-Factory Hopline** — small platform chain over bad floors.
5. **The Slop Corridor** — mixed final gauntlet with jump cuts, ceiling spikes, and flow.

**UI**
- Animated title screen with logo, How To Play, and Level Select.
- Level select grid with best-time tracking in memory.
- HUD chips for current level, timer, and deaths.
- Pause overlay with resume / reset / quit.
- Win overlay with final time, deaths, retry / next / menu.
- Touch controls on mobile-sized viewports.

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
- **Puzzle systems kept dormant**: push blocks, pits, turnstiles, and multi-character switching are still in the engine, but v2 levels do not require them. This preserves optional future remix potential without compromising the current gameplay direction.
- **Pasta-noir aesthetic**: tomato-can industrial walls, cream slab platforms, sauce-bone spikes, meatball goal, and a Spaghetti-O ring character.

## Known limitations

- **No persistent saves.** Best times and progress reset on page reload because the sandboxed iframe blocks browser storage.
- **Fonts require network.** Fontshare fonts load from the CDN; offline users fall back to system sans-serif.
- **Physical mobile device QA not performed.** Touch controls are implemented but should be tested on real phones before calling the mobile version final.
- **No moving hazards yet.** The current platforming uses static spikes, pits, and geometry; saws, crumbling platforms, moving blades, and ghost replays would be natural v3 additions.
