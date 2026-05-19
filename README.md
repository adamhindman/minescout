# Minescout

A minesweeper-inspired game where you physically control a military scout navigating a minefield. Navigate from the left edge to the right edge without getting blown up.

## How to play

Move with **WASD** or **arrow keys**. Reach the rightmost column to win.

Mines are hidden. As you walk, cells you've stepped on reveal a count of how many mines are in the 8 surrounding cells — use those numbers to deduce which adjacent covered cells are dangerous.

**Defusing:**
- Press **D** to enter defuse mode — adjacent covered cells highlight amber
- Click the cell you believe holds a mine
- Correct: mine defused, cell becomes passable
- Wrong: false alarm — you lose one of 3 charges. Lose all 3 and the mission fails

Press **R** to restart. Press **Esc** to cancel defuse mode.

## Running

```bash
npm run dev
```

Opens at `http://localhost:5173` with hot reload.

## Stack

Vanilla JS, Canvas API, no build step, no dependencies.
