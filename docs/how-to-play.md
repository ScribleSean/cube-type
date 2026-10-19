# How to play

## Turning the cube

Each move has a word. Type the word and that layer turns, with no space needed. If one word is the
start of another word on screen, press space or enter to choose the shorter one.

- The first letter of a word is its face: `r` words turn R, `u` words turn U, and so on.
- Words about going forward turn clockwise, and words about going back turn counter-clockwise.
- Typing the same word twice makes a double turn: `rush rush` is R2.
- A wrong letter is ignored and counts against accuracy.

Notation is standard WCA. `U` turns the top face clockwise as you look straight at it, and `U'` turns it
counter-clockwise.

| Moves | What turns |
| --- | --- |
| R L U D F B | One face |
| M | Middle slice between L and R, turns like L |
| E | Middle slice between U and D, turns like D |
| S | Middle slice between F and B, turns like F |
| x y z | The whole cube, like R, U and F |

## Rotating the whole cube

| Input | Rotation |
| --- | --- |
| Swipe or drag left / right | y / y' |
| Swipe or drag up / down | x / x' |
| Shift + drag, or a two-finger swipe | z / z' |
| Arrow keys ← → ↑ ↓ | y, y', x, x' |
| Shift + ← → | z', z |

The rotation words (`xray`, `yaw`, `zen`, ...) work too.

## Stages

The bar at the top tracks CFOP: cross (edges 0/4), F2L (pairs 0/4), OLL, PLL. A finished stage shows
its split time.

When F2L is done, the board is replaced by a line of words for your last-layer algorithm. The game
picks the algorithm and the U turns before and after it. Type the line to apply it.
2-look OLL needs two lines and PLL needs one.

If you break a finished stage on purpose, for example opening the cross to insert a pair, the stage
shows `!` until it is restored. Nothing else changes.

## Views

Open **view** to pick a camera. There are 8 corner views, named by the three faces they show
(`U F R` is the standard one). Words move to sit beside their faces, and notation follows the view:
the face on your left is F and the face on your right is R.

The small corner view is the **mirror**. Set it separately: the opposite corner of the main view
(the default), any of the 8 corners, or off.

## Settings

| Setting | Options |
| --- | --- |
| words | **steady**: words change only the first time you reach a new stage. **flux**: words reshuffle after every turn. |
| layout | **full**: every word is visible. **focus**: type a face letter to show that face's words. |
| name cases | Type the OLL/PLL case name (`sune`, `tperm`) before its algorithm. |
| sound | Key clicks, a rising note for each clean word, and a chord when you solve. |

Settings are saved to the current profile.

## Keys

| Key | Action |
| --- | --- |
| tab | New scramble |
| esc | Stop zen and show results, or start over in the other modes. Also closes panels. |
| enter | Choose a word that is also the start of a longer one. Restarts from the results screen. |
| backspace | Remove the last typed letter |
