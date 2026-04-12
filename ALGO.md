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

## Shuffle Mode (offline simulated annealing)

Coach bulk-adds players, then taps "Shuffle games" to generate the full schedule at once. This is designed for the offline/printed flow: generate → print → hand out paper schedules → play.

Shuffle mode treats scheduling as an **offline combinatorial optimization problem** — a variant of the Social Golfer Problem. Given N players, C courts, and R rounds, find an assignment of players to games that minimizes partner repeats, opponent repeats, and games-played spread.

### High-level flow

1. Build **virtual history** from real player stats + any uncommitted pending schedule entries.
2. Compute **round format**: how many games fit per round given the player count (e.g. 17 players / 4 courts = 4 × 2v2; 15 players = 3 × 2v2 + 1 × 2v1).
3. Build a randomized **seed schedule**: `rounds` rounds, each a shuffled assignment of players to game slots + bench.
4. Run **simulated annealing** (~20k iterations) to minimize a lexicographic objective.
5. Append the optimized games to `App.state.schedule` in round order.

### Round-based invariant

Games are grouped into **rounds** of `gamesPerRound` consecutive games, and within each round **every player appears in at most one game** (or is on the bench). This is a hard invariant, not a soft constraint — moves that violate it are never proposed.

This invariant means the schedule is naturally "playable" in rounds: every round can start its games simultaneously on all courts, since no player is double-booked.

### Objective: lexicographic tuple

Rather than a weighted scalar penalty, SA compares states by a tuple of metrics, lower on the first differing component wins. This eliminates weight tuning and directly matches the validator's quality criteria.

| Position | Component | Meaning |
|---|---|---|
| 1 | `maxSoloCount` | Worst-case: max times any player was the solo side of a 2v1 (base + new) |
| 2 | `totalSoloRepeats` | Sum over players of max(0, soloCount − 1) |
| 3 | `maxPartnerRepeat` | Worst-case: max times any pair partnered |
| 4 | `totalPartnerRepeats` | Sum over pairs of max(0, count − 1) |
| 5 | `groupRepeats` | Games with the same 4 players as a prior game (including finished matches) |
| 6 | `maxOpponentRepeat` | Worst-case: max times any pair faced each other |
| 7 | `totalOpponentRepeats` | Sum over pairs of max(0, count − 1) |
| 8 | `gamesPlayedSpread` | max − min total games played per player (base + new) |
| 9 | `maxConsecutiveBenches` | Longest run of bench rounds for any player |
| 10 | `autoAssignStuck` | # (round, first-finisher) scenarios with no assignable next-round game |
| 11 | `unfulfilledWishes` | Players whose wished partner never got on their team |

`maxSoloCount` / `totalSoloRepeats` lead the tuple because at tight configurations a 2v1 recurs every round — e.g. 15 players on 4 courts = 3×2v2 + 1×2v1, one solo slot per round. A single player stuck solo 2×/10 games is far more visible than a partner repeat among 70 partnerships, so solo fairness outweighs partner/opponent repeats. Configurations without 2v1 games (e.g. 16/17p × 4c) have `maxSoloCount = 0` always, so this reordering is a no-op for them. See alexey-bass/badmixton-flow#42.

`groupRepeats` ranks above opponent repeats: the same 4 players on one court again is very noticeable ("we played this already"), while a single opponent pair meeting across the net again barely registers if the partners keep changing. Trading one extra opponent-pair event for avoiding a group repeat is a better UX.

Base history from committed/finished games is folded in: SA's `partnerCount`, `opponentCount`, and `baseGamesPlayed` start from real stats, so later calls to `generate()` carry prior history forward and avoid re-doing old pairings.

### Moves

At each iteration SA proposes a **within-round swap** — exchange two players' positions inside the same round. Positions can be game slots `{game, team, pos}` or bench slots `{bench, pos}`, so a single move can swap a bencher into a game or rotate players between teams. Same-team no-op swaps are filtered out.

Cross-round movement isn't needed: every player is in every round (either playing or benching), so within-round swaps are sufficient to reach any valid layout via hill-climbing.

### SA acceptance

- **Strict improvement** (new tuple < current in lex order): always accept.
- **Lateral move** (new tuple == current): accept with 50% probability — lets SA walk plateaus.
- **Worsening move**: reject (undo).
- **Stagnation** (no improvement for ~500 iterations): restore best-seen state, apply 3 random perturbation swaps, continue.

Budget: ~20,000 swap attempts per `generate()` call (~5–30ms on desktop). The final returned state is always the best-seen.

### Seed construction

The initial schedule is built by shuffling all player IDs once per round (using a seeded RNG), then packing the first `gamesPerRound × 4` into games and the rest onto bench. It's intentionally simple — SA handles the optimization. A deterministic seed from `hash(count | sorted player IDs | schedule length)` makes output reproducible for tests and debugging.

### Why offline SA instead of greedy batching?

The previous algorithm built games one batch at a time, committing early batches before seeing later ones. For tight configurations (15–17 players on 4 courts), this produced cascading repeats — early myopic choices forced later games to reuse partnerships. It also relied on a weighted penalty function with ad-hoc cross-category weights (100 vs 50 vs 400 vs 500) that were fragile to tuning.

Offline SA sees the whole schedule at once, uses a principled lexicographic objective (no weights), and reliably finds schedules with **0 partner repeats** for the 17p × 4c × 10r target configuration.

### Why a lexicographic objective?

Weighted-sum objectives invite trade-offs between incommensurable metrics. Is one extra partner repeat "worth" 5 extra opponent repeats? 10? The old algorithm's 100/50/400/500 weights were effectively guesses. Lex ordering removes the question: partner repeats dominate opponent repeats dominate spread, period. If the weights need to change, we just reorder the tuple.

---

## Edge cases

| Situation | What happens |
|-----------|-------------|
| < 2 players | No game generated, toast message shown |
| 3 players available | 2v1 format (one player plays solo) |
| 2 players available | 1v1 format |
| Player marked absent mid-schedule | Affected games downgraded (2v2→2v1→1v1) or removed |
| All possible splits have partner repeats | SA finds least-repeated layout via the lex objective |
| Wish already fulfilled | No bonus (wish is checked off after first fulfillment) |
| Wish partner not available | Wish ignored for this round |
| Tight player counts (15–17 on 4 courts) | SA's round-robin seed + lex objective reliably hits 0 partner repeats |

---

## Quality criteria

The algorithm is validated by running 10 shuffle-mode simulations (17 players, 4 courts, 10 rounds, 2 late arrivals) and checking these criteria. The offline SA algorithm hits 0 partner repeats and ≤ 3 max opponent repeats reliably at the 17p × 4c × 10r target.

| Criterion | Threshold | Why |
|-----------|-----------|-----|
| **Partner pair repeats** | ≤ 5% of matches (e.g. 2 out of 40) | SA typically achieves 0 at this scale |
| **Frequent opponents (3+)** | ≤ 5% of matches (e.g. 2 out of 40) | SA typically caps opponent counts at 2 |
| **Worst opponent pair** | < 4 times | No two players should face each other more than 3x |
| **No group regrouping** | 0 exact same 4 players in 2 games | Penalized by the `groupRepeats` lex component |
| **Fair games distribution** | Max − Min ≤ 3 games | Penalized by the `gamesPlayedSpread` lex component |
| **Late player fairness** | Late player games ≥ avg − 2 | SA's `baseGamesPlayed` tracking ensures late arrivals catch up |

Run `npm run simulation:validate` to check all criteria across 10 simulations.

### Mathematical bounds (17p × 4c × 10r)

With 17 players on 4 courts playing 10 rounds, the algorithm produces 40 matches. This is full capacity — every round, every court is used. Each round has 16 players in games + 1 bench.

- Partnerships: 40 × 2 = **80 partnerships**, C(17,2) = **136** possible pairs → 59% load.
- Opponent events: 40 × 4 = **160 events**, 136 possible pairs → 1.18× average.
- Bench: 10 × 1 = **10 bench slots**, distributed near-uniformly (10 players bench once, 7 play every round).

The SA algorithm reliably achieves:
- **Partner repeats: 0** (every pair partners at most once)
- **Opponent max: 2** (no pair faces each other more than 2x)
- **Spread: 1** (max 10 games, min 9 games per player)
