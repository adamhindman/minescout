import { COLS, ROWS } from './constants.js';

class Cell {
  constructor() {
    this.hasMine = false;
    this.defused = false;
    this.revealed = false; // player has walked through this cell
    this.adjacentCount = 0;
    this.wall = false;
  }
}

export class Grid {
  constructor(mineCount) {
    this.cols = COLS;
    this.rows = ROWS;
    this.cells = Array.from({ length: ROWS }, () =>
      Array.from({ length: COLS }, () => new Cell())
    );
    this._placeWalls();
    this._placeMines(mineCount);
    this._computeAdjacency();
    this._placeKey();
  }

  _isSafeZone(col, row) {
    const startRow = Math.floor(ROWS / 2);
    return col <= 1 && row >= startRow - 1 && row <= startRow + 1;
  }

  _placeWalls(wallCount = 10) {
    const placed = [];
    let attempts = 0;
    while (placed.length < wallCount && attempts < 500) {
      attempts++;
      const col = Math.floor(Math.random() * (COLS - 1)); // exclude goal col
      const row = Math.floor(Math.random() * ROWS);
      if (this._isSafeZone(col, row)) continue;

      const horizontal = Math.random() < 0.5;
      const length = Math.floor(Math.random() * 3) + 1; // 1–3

      const cells = [];
      for (let i = 0; i < length; i++) {
        const c = horizontal ? col + i : col;
        const r = horizontal ? row : row + i;
        if (c < 0 || c >= COLS - 1 || r < 0 || r >= ROWS) { cells.length = 0; break; }
        if (this._isSafeZone(c, r)) { cells.length = 0; break; }
        if (this.cells[r][c].wall) { cells.length = 0; break; }
        cells.push({ c, r });
      }
      if (cells.length === 0) continue;

      for (const { c, r } of cells) this.cells[r][c].wall = true;
      placed.push(cells);
    }
  }

  _placeMines(mineCount) {
    const doorRow = Math.floor(ROWS / 2);
    let placed = 0;
    while (placed < mineCount) {
      const col = Math.floor(Math.random() * COLS);
      const row = Math.floor(Math.random() * ROWS);
      if (this._isSafeZone(col, row)) continue;
      if (col === COLS - 1 && row === doorRow) continue;
      const cell = this.cells[row][col];
      if (cell.wall || cell.hasMine) continue;
      cell.hasMine = true;
      placed++;
    }
  }

  _placeKey() {
    const doorRow = Math.floor(ROWS / 2);
    const startCol = 0;
    const startRow = Math.floor(ROWS / 2);
    const candidates = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (c === COLS - 1 && r === doorRow) continue;
        if (Math.max(Math.abs(c - startCol), Math.abs(r - startRow)) <= 4) continue;
        const cell = this.cells[r][c];
        if (cell.wall || cell.hasMine) continue;
        candidates.push({ c, r });
      }
    }
    const idx = Math.floor(Math.random() * candidates.length);
    this.keyCol = candidates[idx].c;
    this.keyRow = candidates[idx].r;
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
