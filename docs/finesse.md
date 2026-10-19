# Finesse

In Tetris, finesse counts the inputs you wasted placing a piece. cube·type counts the **turns** you
wasted.

## The rule

Moves on the same axis don't interfere with each other: R, L and M all turn around the same axis, so
`R L R'` does the same thing as `L`. The game groups your turns by axis until you turn around a
different axis. Inside a group, each layer's quarter turns add up to a net rotation:

| Net rotation | Cheapest way | Turns |
| --- | --- | --- |
| none | do nothing | 0 |
| quarter | `R` or `R'` | 1 |
| half | `R R` (typed as a double) | 2 |

Any turns beyond the cheapest are waste.

| You typed | Same as | Wasted |
| --- | --- | --- |
| `R R'` | nothing | 2 |
| `R R R` | `R'` | 2 |
| `R L R'` | `L` | 2 |
| `R R R R` | nothing | 4 |
| `R U R' U'` | itself | 0 |

Each time you waste turns you see `finesse −2`, a red flash and a low sound.

## The score

```
finesse = 1 − wasted turns ÷ turns you chose
```

Whole-cube rotations count as turns too, so swiping back and forth costs finesse. Algorithm lines don't
count, because those moves aren't your choice.

The score shows live next to WPM, on the results screen and in your stats (average over sprints).
