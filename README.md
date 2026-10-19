# cube·type

Solve a Rubik's cube by typing words.

Every turn of the cube has a word. Type it and the layer turns. Work through the cross and F2L by
picking turns yourself, then type your OLL and PLL algorithms as a Monkeytype-style line of words.
It runs in the browser on desktop and phone, with nothing to install.

**Play:** https://scriblesean.github.io/cube-type/

## How it plays

- **Cross and F2L.** Words sit around the cube on the side their face is on. Type `rush` to turn R,
  `recoil` to turn R'. Typing the same word twice makes a double turn (R2).
- **OLL and PLL.** Once F2L is done, the game reads your last layer and shows the algorithm as a line
  of words. It uses 2-look OLL and full PLL, all 21 cases.
- **Rotations.** Swipe the cube or use the arrow keys for x, y and z. Shift (or a two-finger swipe) gives z.
- **Your point of view.** Pick any of the 8 corner views. Notation follows the view you picked, so R is always
  the face on your right.
- **Words that get more intense** as you go, from calm in the cross to intense in the last layer. The colors
  shift with them.

## Modes

| Mode | What it is |
| --- | --- |
| sprint | One timed solve. Results show splits, WPM, accuracy and finesse. |
| zen | The clock counts up and cubes keep coming. Press `esc` when you are done. |
| learn | A drill through all 24 moves, then a timed round in notation only. |

## Stats and profiles

Profiles live in your browser. Each one keeps its own settings and history. The stats screen shows
your best time, ao5 and ao12 (WCA-style averages), mean, average split for each stage, best WPM,
finesse and recent runs.

## Docs

- [How to play](docs/how-to-play.md): controls, notation, stages and settings
- [Word picker](docs/word-picker.md): the formula that picks smooth-to-type words, with its weights
- [Finesse](docs/finesse.md): how wasted turns are counted
- [Development](docs/development.md): running locally, code layout and tests

## Run locally

```bash
git clone https://github.com/ScribleSean/cube-type.git
cd cube-type
python3 -m http.server 5178
```

Then open http://localhost:5178. Tests run with `npm test` (Node 20+ with no dependencies).

## License

MIT
