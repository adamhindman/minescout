# Minescout TODO

## 1. MonsterTank vision blocked by covered cells

The tank currently has line-of-sight through any non-wall cell, including
covered (unrevealed, un-defused) ground. It should only see through cells the
player has cleared — i.e. `revealed` or `defused`. Walls still block, as before.

### Implementation checklist

- [x] In [src/MonsterTank.js](src/MonsterTank.js), update `_hasLineOfSight` so an
      intermediate cell blocks vision unless it is `revealed` or `defused`
      (walls remain blocking).
- [x] Keep the endpoint exclusion as-is — the player's own cell shouldn't
      block the ray that's trying to land on it.
- [x] No change needed at the `_canSeePlayer` call site or `getVisionCells` —
      both already route through `_hasLineOfSight`, so the rendered vision cone
      will reflect the new rule automatically.

### Verification checklist

- [ ] `npm run dev` boots clean, no console errors at load.
- [ ] Start a game and wait ~30s for the tank to spawn. Confirm the rendered
      vision cone does **not** extend over covered cells — it should terminate
      at the first covered square in each direction.
- [ ] Stand inside the tank's vision cone but with a covered cell between
      you and the tank → tank stays in `patrol`, doesn't switch to `chase`.
- [ ] Step onto a cell so it becomes `revealed`, with the tank facing you
      through that newly cleared line → tank flips to `chase`.
- [ ] Defuse a mine on the line between tank and player → tank can now see
      through that defused cell (it counts as cleared).
- [ ] Walls still block vision (regression check).

## 2. Enemy spawn delay scales with mine count

Spawn delay = `Math.floor(30 + (mineCount / 250) * 30)` seconds. So an empty
field spawns the enemy after 30s, max difficulty (250 mines) after 60s, and
the middle of the range scales linearly between. Higher difficulty buys the
player a little more time to clear ground before the enemy shows up.

### Implementation checklist

- [x] In [src/Game.js](src/Game.js), set
      `this.squadTimer = Math.floor(30 + (getMineCount() / 250) * 30)` in the
      constructor.
- [x] In [src/main.js](src/main.js), the tank-toggle restart applies the same
      formula when re-arming `squadTimer`.
- [x] `getMineCount` is already imported in both files — no new import needed.
- [x] No change to the countdown logic in `update()` — it already decrements
      `squadTimer` and spawns the enemy at `<= 0`.

### Verification checklist

- [ ] Mine count 0 → enemy arrives ~30s after first move.
- [ ] Mine count 250 → enemy arrives ~60s after first move.
- [ ] Mine count 125 → enemy arrives ~45s after first move.
- [ ] Confirm the spawn message still fires once when the enemy appears.
- [ ] With tank disabled in settings, no enemy ever spawns regardless of mine
      count (regression check).

## 3. Bouncer enemy

A second enemy type. At game start, coin-flip whether the threat will be a
`MonsterTank` or a `Bouncer` — never both. The Bouncer is a ball that spawns
at the player's start cell (col 0, middle row) and moves diagonally down-right
one cell per tick. When the cell it's about to enter is "solid" (unrevealed
**and** un-defused, a wall, or off-grid), it bounces and keeps going. Touching
the player kills.

### Design decisions (confirm before implementing)

- [ ] **Spawn delay** = same `squadTimer` (mine count seconds) as the tank.
- [ ] **Speed** = reuse the tank's `MOVE_INTERVAL` (1.2 s/step). Tune later.
- [ ] **Solid cells** (cause a bounce): walls, off-grid, and any cell that is
      neither `revealed` nor `defused`. (Covered mines, covered empties, walls,
      and the edges all block.)
- [ ] **Bounce rule** when the diagonal next cell `(col+dc, row+dr)` is solid:
      - `hBlocked = (col+dc, row)` solid; `vBlocked = (col, row+dr)` solid.
      - hBlocked && vBlocked → flip both (`dc *= -1; dr *= -1`).
      - only hBlocked → flip `dc`.
      - only vBlocked → flip `dr`.
      - neither (interior corner hit) → flip both.
      - After flipping, the bouncer stays in its cell this tick and moves on
        the next tick with the new vector. (Avoids needing sub-cell physics.)
- [ ] **Initial vector**: `dc=1, dr=1` (down-right).
- [x] **On player win**: bouncer freezes; flavor line is `"boing!"` (tank's
      "self-destructs out of shame" message stays tank-only).
- [x] **Color**: red (red is scary).
- [ ] **Push interaction**: unlike the tank, the player cannot push the
      bouncer — stepping onto its cell would already kill the player, so this
      is moot.

### Implementation checklist

- [x] Create [src/Bouncer.js](src/Bouncer.js) exporting class `Bouncer`.
      Fields: `col`, `row`, `dc=1`, `dr=1`, `alive=true`, `moveTimer=0`.
      Method `step(game, dt)` mirrors `MonsterTank.step`'s timer pattern.
- [x] Inside `step`, after the timer elapses: compute `(col+dc, row+dr)`. If
      passable → move. Otherwise apply the bounce rule above (no move this
      tick). Helper `_isSolid(game, c, r)` encapsulates the rule.
- [x] After any move, if `col,row` equals the player's position → set
      `game.status = 'lost'` and `game.message = 'A bouncer flattened you!'`.
- [x] In [src/Game.js](src/Game.js):
      - Import `Bouncer`.
      - Replace the `tanks` field with a unified `enemies` array (keep one
        canonical name; update the few references in `move()` and `update()`).
      - In the constructor, decide enemy type once: `this.enemyType =
        Math.random() < 0.5 ? 'tank' : 'bouncer'` (gated on `tankEnabled` —
        if tanks are off, no enemy spawns at all, current behavior).
      - When `squadTimer <= 0`, push the right enemy:
        - tank → `new MonsterTank(0, Math.floor(ROWS/2))`, message
          `"A tank has entered the minefield!"`.
        - bouncer → `new Bouncer(0, Math.floor(ROWS/2))`, message
          `"A bouncer is loose in the minefield!"`.
- [x] In `Game.move()`, the existing enemy-on-player collision check should
      iterate `this.enemies` instead of `this.tanks` (so walking into a
      bouncer's cell also kills; bouncer's own `step` covers the reverse).
- [x] In the win branch of `Game.move()`, only fire the "tank self-destructs"
      flavor if the living enemy is a `MonsterTank`. Otherwise use the plain
      win message.
- [x] In [src/Renderer.js](src/Renderer.js), render the bouncer as a small
      filled red ball at its cell's center, using the existing entity-position
      WeakMap pattern so motion looks smooth between ticks. No facing/vision
      cone. Also: update `_renderMonsterTanks` and ghost-marker logic to
      filter `game.enemies` by `type === 'tank'`, and the countdown text in
      the status bar to label "Tank" or "Bouncer" based on `game.enemyType`.
- [x] In [src/main.js](src/main.js), the tank-toggle restart logic writes
      `gs.enemies = []` (not `gs.tanks`) and uses `getMineCount()` for the
      re-armed `squadTimer` (matches TODO #2).

### Verification checklist

- [ ] Across ~10 fresh games, roughly half spawn a tank, half a bouncer.
- [ ] Bouncer appears after `mineCount` seconds following the first move.
- [ ] From spawn, the bouncer travels down-right until it hits something.
- [ ] Hitting the bottom edge ricochets it up-right (only `dr` flipped).
- [ ] Hitting an unrevealed cell with a clear row below sends it down-left
      (only `dc` flipped).
- [ ] Hitting a corner where both neighbors are solid reverses direction
      (both flipped) and it heads back toward the spawn.
- [ ] Revealing/defusing cells along the bouncer's line lets it pass instead
      of bouncing.
- [ ] Touching the bouncer ends the game with the kill message.
- [ ] Winning with a bouncer alive shows the plain "Mission complete!" line
      (not the tank self-destruct line) and the bouncer freezes.
- [ ] No console errors during a full game with bouncer active.
