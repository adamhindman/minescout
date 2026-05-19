import { COLS, ROWS } from './constants.js';

export class Player {
  constructor() {
    this.col = 0;
    this.row = Math.floor(ROWS / 2);
  }

  // Returns the target cell coords without moving — Game decides whether to commit
  targetCell(dc, dr) {
    return { col: this.col + dc, row: this.row + dr };
  }

  moveTo(col, row) {
    this.col = col;
    this.row = row;
  }

  isAdjacentTo(col, row) {
    return (
      Math.abs(col - this.col) <= 1 &&
      Math.abs(row - this.row) <= 1 &&
      !(col === this.col && row === this.row)
    );
  }
}
