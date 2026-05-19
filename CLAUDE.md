# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the game

```bash
npm run dev
```

Vite serves with HMR at `http://localhost:5173`.

## Architecture

All game logic lives in `src/`. No build step, no dependencies.

- **`constants.js`** — single source of truth for grid dimensions, mine count, cell size
- **`Grid.js`** — mine placement, adjacency count computation, defuse logic. `Cell.passable` drives all movement gating. Defusing a mine triggers adjacency recomputation for neighbors.
- **`Player.js`** — position + movement. `isAdjacentTo(col, row)` used by both Game (defuse range check) and Renderer (highlight targets).
- **`Game.js`** — state machine (`playing` / `won` / `lost`), coordinates Grid + Player, owns `defuseMode` flag and `message` string.
- **`Renderer.js`** — pure canvas drawing, reads game state each frame. No state of its own.
- **`InputHandler.js`** — keyboard + mouse events; takes `getGame` callback so it works across resets.
- **`main.js`** — wires everything together, owns the `game` reference and passes a getter so resets (R key) swap in a fresh Game instance without rebinding input.

## Game mechanics

- Grid is 22×14. Columns 0–1 and column 21 are mine-free (safe start/goal zones).
- All cells start **covered** — mines and safe cells look identical.
- Walking onto a cell reveals it as safe floor. Walking onto a mine = instant death.
- The player sees mine counts **only for the 8 adjacent cells** (moving flashlight). Counts update as the player moves; revealed-but-not-adjacent cells show as empty floor with no count.
- Press `D` to enter defuse mode → all adjacent covered cells highlight amber → click the one you believe is a mine.
  - Correct (mine): defused, cell becomes passable.
  - Wrong (empty cell): false alarm → game over.
- Reaching column 21 wins. `R` restarts.
