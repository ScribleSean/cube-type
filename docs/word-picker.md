# Word picker

Each move has a pool of words (see [`src/words.js`](../src/words.js)). Every time the board fills
up, or an algorithm needs words, the picker chooses from those pools. The goal is what Monkeytype
gives you: short, familiar words that are easy to type in a row.

## What Monkeytype does

Monkeytype's word generator draws words at random from a list of common words. The only rule is that
a word can't match either of the last two
([source](https://github.com/monkeytypegame/monkeytype/blob/master/frontend/src/ts/test/words-generator.ts)).
Most of the smoothness comes from the word list (short, very common words), not from how it picks.

cube·type keeps that randomness and the last-two rule. It also makes words that are easy to type in a
row more likely.

## The score

Each candidate word `w` gets a score from five features. Each feature is between 0 and 1, and higher is better:

```
score(w) = 0.30·flow + 0.25·noSfb + 0.15·balance + 0.15·ease + 0.15·novelty
```

| Feature | Weight | Meaning |
| --- | --- | --- |
| flow | 0.30 | Share of letter pairs that switch hands. `pane` = 1 (p→a→n→e alternates), `were` = 0. |
| noSfb | 0.25 | 1 minus the share of letter pairs typed by the same finger on different keys (e.g. `un`, `ed`). |
| balance | 0.15 | Pulls recent typing back toward a 50/50 split between hands. If the last ~60 keys leaned left, right-heavy words score higher. |
| ease | 0.15 | Short words read and type faster: 1 at 4 letters or fewer, falling to 0 at 9. |
| novelty | 0.15 | 1 minus how recently this word was used (fading over 12 words), minus 0.3 × the share of its letters already shown on screen. |

Fingers follow standard QWERTY touch typing: pinky `qaz`, ring `wsx`, middle `edc`, index `rfvtgb` on the
left. On the right, index `yhnujm`, middle `ik`, ring `ol`, pinky `p`.

## Choosing

The picker doesn't always take the best word. It draws one with probability:

```
P(w) = exp(score(w) / T) / Σ exp(score(v) / T),   T = 0.08
```

With `T = 0.08`, a word that scores 0.1 higher is about 3.5× as likely to be picked
(`e^(0.1/0.08) ≈ 3.5`). Smooth words show up more often, and every word still gets a chance.

Two filters run first:

- The picker skips words equal to either of the last two picks, like Monkeytype.
- On the board, no word can be the start of another word on screen, so each word turns its layer
  as soon as you type its last letter. Inside one algorithm a word isn't reused, except for doubles,
  which repeat on purpose.

## Where it applies

| Place | Pool |
| --- | --- |
| Board, cross | Calm words |
| Board, F2L | Building words |
| Board, last layer and algorithms | Building and intense words mixed |
| Zen | Calm words throughout |

## Tuning

The weights and temperature are the first lines of [`src/picker.js`](../src/picker.js). The tests in
[`test/picker.test.js`](../test/picker.test.js) check the features. To try a change, edit the
numbers and reload.
