# How the Algorithm Works

Badmixton Flow has two modes. Both use scoring to pick fair games.

---

## Queue Mode (default)

Coach taps "Suggest" on a free court. The algorithm picks players and splits teams.

### Step 1: Score each player in the queue

Every player in the queue gets a score. **Lower score = picked first.**

| Factor | Weight | Example |
|--------|--------|---------|
| Queue position | +100 per position | 1st in queue = 0, 3rd = 200 |
| Games above average | +50 per extra game | Average is 3, player has 5 → +100 |
| Unfulfilled wish | -80 per wish | Player wants to play with someone → -80 |

**Example:** 8 players in queue, average 2 games each.

| Player | Queue pos | Games | Wish | Score |
|--------|-----------|-------|------|-------|
| Anna | 1st | 2 | — | 0 |
| Bob | 2nd | 2 | — | 100 |
| Cleo | 3rd | 4 | — | 300 |
| Dan | 4th | 1 | — | 300 |
| Eva | 5th | 2 | wants Anna | 320 |

Anna (0), Bob (100), Dan (300), Cleo (300) get picked. Eva's wish bonus (-80) wasn't enough to beat queue position.

But if Eva wished for Bob and was 3rd in queue:
- Eva: 200 (position) + 0 (games) - 80 (wish) = **120** → she'd get picked.

### Step 2: Wish pull-in

If a picked player has an unfulfilled wish and the wished partner is in the top 75% of the queue, the algorithm swaps the 4th pick for the wished partner.

### Step 3: Diversify

Checks the last 10 finished matches. If 3+ of the 4 picked players were in the same recent match, swaps the lowest-priority overlapping player with someone who wasn't in that match.

**Why:** Prevents the same group from playing together repeatedly.

### Step 4: Split into teams

With 4 players, there are 3 possible team splits. Each split gets a penalty score. **Lowest penalty wins.**

| Factor | Penalty | Example |
|--------|---------|---------|
| Partner repeat | +30 per time paired before | Anna+Bob paired 2x before → +60 |
| Opponent repeat | +15 per time beyond 1st | Anna vs Cleo 3x before → +30 |
| Wish fulfilled | -100 | Anna wished for Bob, they're on same team → -100 |

**Example:** Players Anna, Bob, Cleo, Dan. Anna+Bob have played together twice.

| Split | Partner penalty | Opponent penalty | Wish | Total |
|-------|----------------|-----------------|------|-------|
| Anna+Bob vs Cleo+Dan | +60 | 0 | 0 | **60** |
| Anna+Cleo vs Bob+Dan | 0 | 0 | 0 | **0** ← wins |
| Anna+Dan vs Bob+Cleo | 0 | 0 | 0 | **0** |

The algorithm picks Anna+Cleo vs Bob+Dan (or Anna+Dan vs Bob+Cleo — tie broken by order).

### Game formats

- **4+ players available** → 2v2
- **3 players** → 2v1 (3 possible splits, each player takes a turn solo)
- **2 players** → 1v1

---

## Shuffle Mode (generate-and-select)

Coach adds players, then taps "Shuffle games" to generate a batch of games at once.

Unlike queue mode's single-game greedy approach, shuffle mode uses a **generate-and-select** strategy: it builds multiple randomized candidate batches, scores each batch holistically, and picks the best one. This lets the algorithm see the whole batch at once and avoid locally-good but globally-bad choices.

### High-level flow

1. Build **virtual history** — starts from real stats (games played, partner/opponent history), then layers on all already-scheduled games. This way game #8 "knows about" games #1–7.
2. For each batch of `courtCount` games:
   - Generate **50 candidate batches** (1 deterministic, 49 randomized)
   - Score each candidate holistically (see scoring below)
   - Pick the lowest-penalty candidate
   - Append its games to the schedule and update virtual history
3. Repeat until `count` games are generated.

### Candidate generation

Each candidate is built greedily, game-by-game:

**Player scoring (same idea as queue mode, no queue positions):**

| Factor | Weight |
|--------|--------|
| Virtual games above average | +50 per extra game |
| Unfulfilled wish | -80 per wish |
| **Random tiebreaker** (non-deterministic candidates only) | 0–10 |

The random tiebreaker is small enough not to override fairness scoring but large enough to shuffle equally-scored players across candidates. The first candidate (`n === 0`) uses no randomness, so it matches a deterministic baseline.

**Game building loop:**
1. Pick top 4 players by score (or 2-3 for 1v1/2v1)
2. Split into teams via `_splitWithVirtual` (3 possible splits, pick lowest penalty)
3. Mark players as used in this batch (each player appears at most once per batch)
4. Update the *clone* virtual history so the next game in the batch sees the update
5. Repeat for `courtCount` games

### Batch scoring (holistic)

A complete candidate batch is scored by summing penalties across all games. **Lower is better.**

| Factor | Penalty | Rationale |
|--------|---------|-----------|
| Partner repeat (exponential) | `(count+1)² × 100` | Heavily penalize reusing the same pair |
| Opponent repeat (3+) | `(count-1)² × 50` | Exponential — 3x is tolerable, 4x+ is bad |
| Group regrouping (same 4 players as any past game) | +500 | Forbidden |
| Intra-batch partner repeat (same pair in two games of this batch) | +400 | Should never happen |
| Intra-batch opponent repeat | +60 | Shouldn't concentrate opponents within one batch |
| 3+ player overlap with existing games | +30 | Mild penalty |
| Games spread > 2 | +40 per extra | Keep game counts even across players |
| **Sequential auto-assign failure** | +400 per failed finish | See below |

### Sequential auto-assign constraint

When the previous batch is already playing on courts, the new batch must be **assignable in order** as the previous batch finishes. Each time a court frees up, `assignNextToCourt()` looks for any pending game whose players are all free.

The scoring simulates this: it walks through `prevBatchGames` one finish at a time, adding their players to a "free pool", and checks whether *some* game in the new batch can be assigned at each step. If a step has no assignable game, it's a **400-point penalty**.

This replaces the old algorithm's greedy per-game batch logic (which happened to produce assignable schedules by construction but couldn't optimize globally).

### Team splitting (same as before)

`_splitWithVirtual` is unchanged — 3 possible splits scored by partner/opponent repeats and wish bonus:

| Factor | Penalty |
|--------|---------|
| Partner repeat | +100 per time paired |
| Opponent repeat | +30 per time beyond 1st |
| Wish fulfilled | -100 |

### Virtual history updates

After the winning candidate batch is committed, virtual history is updated:
- Player's virtual game count +1
- Partner history +1 for teammates
- Opponent history +1 for opposing players

So batch #3 has full context of batches #1–2, even though none have been played yet.

### Why generate-and-select?

The old algorithm was greedy game-by-game: pick the best 4 players for game #1, then game #2, etc. This works well when there's slack (e.g. 20+ players on 4 courts), but with tight configurations (15-17 players on 4 courts), early choices constrain later games and cause cascading repeats.

Generate-and-select trades a bit of computation (50 candidates × ~8 games each = 400 split evaluations per batch — still trivial) for much better results: randomized candidates explore different player groupings, and holistic scoring picks the one with the fewest total repeats across the whole batch.

### Batch constraint

Games are generated in **batches** of `courtCount` (e.g. 4 courts = batches of 4 games). Within a batch, **each player appears at most once**. This models reality: one batch fills all courts, next batch fills them again after those games finish.

**Example:** 12 players, 3 courts → batch of 3 games × 4 players = 12 slots → all 12 players play, no bench. Next batch: everyone available again.

With 17 players on 4 courts: 16 play per batch, 1 benches. Bench rotates across batches via the fairness scoring.

---

## Quick reference: all weights

| Factor | Queue mode | Shuffle mode | Where used |
|--------|-----------|-------------|------------|
| Queue position | +100/pos | — | Player selection |
| Games above avg | +50/game | +50/game | Player selection |
| Wish (selection) | -80 | -80 | Player selection |
| Random tiebreaker | — | 0–10 | Candidate variety |
| Partner repeat (split) | +30/time | +100/time | Team splitting |
| Opponent repeat (split) | +15/time (>1) | +30/time (>1) | Team splitting |
| Wish (split) | -100 | -100 | Team splitting |
| Batch: partner repeat | — | (count+1)² × 100 | Holistic batch scoring |
| Batch: opponent repeat | — | (count-1)² × 50 | Holistic batch scoring |
| Batch: group regrouping | — | +500 | Holistic batch scoring |
| Batch: intra-batch partner repeat | — | +400 | Holistic batch scoring |
| Batch: sequential auto-assign failure | — | +400 per failure | Holistic batch scoring |
| Batch: games spread > 2 | — | +40 per extra | Holistic batch scoring |

---

## Edge cases

| Situation | What happens |
|-----------|-------------|
| < 2 players | No game generated, toast message shown |
| 3 players available | 2v1 format (one player plays solo) |
| 2 players available | 1v1 format |
| Player marked absent mid-schedule | Affected games downgraded (2v2→2v1→1v1) or removed |
| All possible splits have partner repeats | Least-repeated split wins |
| Wish already fulfilled | No bonus (wish is checked off after first fulfillment) |
| Wish partner not available | Wish ignored for this round |
| Tight player counts (15-17 on 4 courts) | Generate-and-select explores 50 candidates to minimize repeats |

---

## Quality criteria

The algorithm is validated by running 10 shuffle-mode simulations (17 players, 4 courts, 10 rounds, 2 late arrivals) and checking these criteria. Thresholds are **per-match** (scale with total games played), since the new algorithm generates full-capacity schedules (~40 matches over 10 rounds).

| Criterion | Threshold | Why |
|-----------|-----------|-----|
| **Partner pair repeats** | ≤ 15% of matches (e.g. 6 out of 40) | Some repeats are mathematically unavoidable with dense scheduling |
| **Frequent opponents (3+)** | ≤ 60% of matches (e.g. 24 out of 40) | Opponent variety, but not as strict as partner repeats |
| **Worst opponent pair** | < 6 times | No two players should face each other more than 5x |
| **No group regrouping** | 0 exact same 4 players in 2 games | Every game should feel like a new matchup |
| **Fair games distribution** | Max − Min ≤ 3 games | Everyone plays roughly the same number of games |
| **Late player fairness** | Late player games ≥ avg − 2 | Arriving late shouldn't mean sitting out too much |

Run `npm run simulation:validate` to check all criteria across 10 simulations.

### Why per-match thresholds?

With 17 players on 4 courts playing 10 rounds, the algorithm produces ~40 matches (16 players per round + rotation). This is **full capacity** — every round, every court is used. That generates ~80 partnership slots and ~160 opponent-pair slots.

With C(17,2) = 136 possible pairs, the math works out to:
- Partnerships: 80/136 = 59% of pairs used → some repeats likely in tight corners
- Opponents: 160/136 = 1.18× per pair on average → 3x pairs are common, 4x rare, 5x+ very rare

The thresholds are calibrated to catch actual algorithm failures (clustering) while accepting mathematically unavoidable repeats at dense scheduling.
