# cube·type

Solve a Rubik's cube by typing words.

**Play:** https://scriblesean.github.io/cube-type/

Each turn has a word: `rush` turns R, `recoil` turns R'. Enter repeats the last turn. After F2L,
your OLL and PLL show up as a line of words to type. Swipe the cube or use the arrow keys to rotate it.

| Mode | |
| --- | --- |
| drill | Random moves, one at a time |
| sprint | One timed solve with splits |
| zen | Untimed, cubes keep coming |

The game saves stats (best, ao5, ao12, splits, finesse) and profiles in your browser.

## Run locally

There's no build step and no dependencies. Clone the repo and serve the folder (ES modules don't load from `file://`):

```bash
git clone https://github.com/ScribleSean/cube-type.git
cd cube-type
python3 -m http.server 5178
```

Then open http://localhost:5178. Pick a mode, type the word shown for each turn, and press Enter to repeat the last one.

More: [How to play](docs/how-to-play.md) · [Word picker](docs/word-picker.md) · [Finesse](docs/finesse.md) · [Development](docs/development.md)

## Contributing

Issues and pull requests are welcome. Before you open a PR, run `npm test` (Node 20 or newer). It runs `node --test` on the logic modules. See [Development](docs/development.md) for the code layout.

## License

[MIT](LICENSE)
