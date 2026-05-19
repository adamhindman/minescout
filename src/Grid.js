import { COLS, ROWS } from './constants.js';

class Cell {
  constructor() {
    this.hasMine = false;
    this.defused = false;
    this.revealed = false; // player has walked through this cell
    this.adjacentCount = 0;
  }
}

export class Grid {
  constructor(mineCount) {
    this.cols = COLS;
    this.rows = ROWS;
    this.cells = Array.from({ length: ROWS }, () =>
      Array.from({ length: COLS }, () => new Cell())
    );
    this._placeMines(mineCount);
    this._computeAdjacency();
  }

  _placeMines(mineCount) {
    const startRow = Math.floor(ROWS / 2);
    let placed = 0;
    while (placed < mineCount) {
      const col = Math.floor(Math.random() * (COLS - 1)); // exclude goal col
      const row = Math.floor(Math.random() * ROWS);
      // Safe zone: 2x2 block around start (cols 0–1, rows startRow-1 to startRow)
      if (col <= 1 && row >= startRow - 1 && row <= startRow) continue;
      if (!this.cells[row][col].hasMine) {
        this.cells[row][col].hasMine = true;
        placed++;
      }
    }
  }

  _computeAdjacency() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        this.cells[r][c].adjacentCount = this._countAdjacent(r, c);
      }
    }
  }

  _countAdjacent(row, col) {
    let n = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const r2 = row + dr, c2 = col + dc;
        if (r2 >= 0 && r2 < ROWS && c2 >= 0 && c2 < COLS) {
          const cell = this.cells[r2][c2];
          if (cell.hasMine && !cell.defused) n++;
        }
      }
    }
    return n;
  }

  at(col, row) {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
    return this.cells[row][col];
  }

  defuse(col, row) {
    const cell = this.at(col, row);
    if (!cell || !cell.hasMine || cell.defused) return false;
    cell.defused = true;
    // Recompute adjacency for all neighbors and the cell itself
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nc = this.at(col + dc, row + dr);
        if (nc) nc.adjacentCount = this._countAdjacent(row + dr, col + dc);
      }
    }
    return true;
  }
}
