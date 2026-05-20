# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the game

```bash
npm run dev
```

Vite serves with HMR at `http://localhost:5173`.

## Architecture

All source files live in `src/`. The entry point is `src/main.js`, which boots Phaser and registers `GameScene`.

### Game logic (no Phaser dependency)
- **`constants.js`** — grid dimensions (`COLS=22`, `ROWS=14`), `CELL_SIZE`, `STATUS_BAR_H`
- **`Grid.js`** — mine + wall placement, adjacency computation, defuse logic. `Cell` has `hasMine`, `defused`, `revealed`, `wall`, `adjacentCount`.
- **`Player.js`** — position, `moveTo()`, `isAdjacentTo()` (used by Game for defuse range and Renderer for highlights)
- **`Soldier.js`** — tank AI: BFS through cleared cells toward the rightmost reachable one; greedy-right in the minefield; after player wins, BFS through all non-wall cells to find and rejoin the cleared path
- **`Game.js`** — state machine (`playing` / `won` / `lost`), coordinates Grid + Player + soldiers. Owns `defuseMode`, `message`, `exploded` flag, `squadTimer`

### Rendering & input (Phaser-dependent)
- **`Renderer.js`** — creates and owns all Phaser display objects; `render(game, dt)` reads game state and draws each frame. Uses a `WeakMap` for entity display positions (interpolated) so game objects stay pure data.
- **`input/KeyboardInput.js`** — maps keyboard events to game actions. Takes `getGame` callback so it always references the current game instance after restarts.
- **`input/TouchInput.js`** — single-finger swipe (move player), two-finger drag (pan camera), double-tap (defuse adjacent cell), desktop pointer click (defuse in defuse mode)
- **`scenes/GameScene.js`** — Phaser scene: `preload()` loads assets, `create()` wires Game + Renderer + inputs, `update()` ticks game logic and triggers sounds

### Persistence
- **`settings.js`** — mine count stored in `localStorage`; includes a `INVALIDATE_BEFORE` datetime to bust stale stored values

## Game mechanics

- Grid is 22×14. A 3×2 safe zone (cols 0–1, rows `startRow-1` to `startRow+1`) is mine- and wall-free at the start.
- All cells start **covered** — mines, walls, and safe cells look identical until revealed.
- Walking onto a cell reveals it. Walking onto a mine = instant death.
- The player sees mine counts only for their current cell and the 8 adjacent cells (moving flashlight).
- **Defuse mode** (Shift to toggle, Esc to cancel): adjacent covered cells highlight amber; arrow keys or click to aim cursor; Enter or click to confirm.
  - Correct (mine): defused, cell becomes passable.
  - Wrong (empty): false alarm, lose one of 3 charges. Lose all → mission fails.
- **Tank**: spawns 30s after first player move, follows cleared path via BFS, ventures greedy-right into the minefield when no cleared path is reachable ahead. Player can push it. If player wins first, tank speeds up 5× and pathfinds back to the cleared route.
- Reaching column 21 wins. `R` restarts.
