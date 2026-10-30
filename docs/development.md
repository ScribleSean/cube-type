# Development

The game is plain HTML, CSS and ES modules, with no build step and no dependencies. `vendor/three.min.js`
is three.js r128 (MIT), copied from cdnjs. Its sha512 matches the SRI hash that cdnjs publishes.

## Run

```bash
python3 -m http.server 5178
```

Open http://localhost:5178. Modules don't load from `file://`, so use a server.

## Test

```bash
npm test
```

This runs `node --test` on the logic modules: cube moves, the last-layer planner, the player frame,
finesse, stats, drill, typing and the word picker. It needs Node 20 or newer.

## Layout

| File | Job |
| --- | --- |
| `src/cube.js` | Cube model, moves, stage detection, last-layer planner, player frame |
| `src/words.js` | Word pools per move and intensity |
| `src/picker.js` | Smooth-typing score and weighted pick ([details](word-picker.md)) |
| `src/typing.js` | The typing rules every mode shares: letters are kept, errors count once |
| `src/finesse.js` | Wasted-turn counter ([details](finesse.md)) |
| `src/stats.js` | Best, ao5, ao12, means |
| `src/profiles.js` | Profiles, settings and history in localStorage; parses what it loads |
| `src/html.js` | The one HTML escaper (`escapeHtml`) |
| `src/storage.js` | localStorage that never throws |
| `src/drill.js` | Drill move picker |
| `src/sound.js` | Synthesized sounds |
| `src/scene.js` | three.js cube, animation, arrows, cameras, swipes |
| `src/ui/*.js` | Board, word stream, HUD, panels, overlays |
| `src/game.js` | Modes, typing and flow; the entry point |

The logic modules (`cube`, `picker`, `finesse`, `stats`, `typing`) don't touch the DOM, so they run under Node.

## How the cube model works

The cube is 54 stickers. Each has a position (a cubie at −1, 0 or 1 on each axis), an outward normal and a
color. A move picks the stickers in its layer and turns their position and normal a quarter turn
about the move's axis. Stage detection compares each sticker with the center of its face, so it
works in any orientation.

The last-layer planner rotates the cube so the unsolved layer is on top. Then it tries each
algorithm, with every U turn before it (and after it, for PLL), and keeps the shortest one that
reaches the goal. The tests run it on 2,000 random last-layer cases.

The player frame handles camera views. If you look from the back-right, the face on your left is
world R, so the game calls it F. `toWorld(move, k)` translates a move, where `k` is the number of
quarter turns about the vertical axis. A test checks that a translated move equals turning the whole
cube, making the move and turning back.

## Deploy

GitHub Pages serves the repository root from `main`. Pushing to `main` updates the site.
