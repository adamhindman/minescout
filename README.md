# Minescout

https://github.com/adamhindman/minescout

A minesweeper-inspired game where you physically control a scout navigating a minefield. Move from the left edge to the right edge without getting blown up.

## How to play

Move with **arrow keys**. Reach the rightmost column to win.

Mines are hidden. As you walk, the numbers on your current cell and cells you've stepped on show how many mines are in the surrounding 8 squares — use those to deduce which covered cells are dangerous.

**Defusing:**
- Hold **Shift** to enter defuse mode — adjacent covered cells highlight amber
- Use **arrow keys** to aim the cursor at the cell you believe holds a mine
- Press **Enter** to confirm
- Correct: mine defused, cell becomes passable
- Wrong: false alarm — you lose one of 3 charges. Lose all 3 and the mission fails
- Release **Shift** or press **Esc** to cancel

Press **R** to restart. Adjust mine count with the selector below the board (saved between sessions).

## Running

```bash
npm run dev
```

Opens at `http://localhost:5173` with hot reload.

## Stack

Phaser 4, Vite, vanilla JS.
