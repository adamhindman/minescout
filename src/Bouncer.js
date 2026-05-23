import { COLS, ROWS } from './constants.js';

const MOVE_INTERVAL = 0.1;

export class Bouncer {
  constructor(col, row) {
    this.type = 'bouncer';
    this.col = col;
    this.row = row;
    this.dc = 1;
    this.dr = 1;
    this.alive = true;
    this.moveTimer = 0;
    this.MOVE_INTERVAL = MOVE_INTERVAL;
  }

  step(game, dt) {
    if (!this.alive) return;
    this.moveTimer += dt;
    if (this.moveTimer < MOVE_INTERVAL) return;
    this.moveTimer -= MOVE_INTERVAL;

    const nc = this.col + this.dc;
    const nr = this.row + this.dr;
    if (!this._isSolid(game, nc, nr)) {
      this.col = nc;
      this.row = nr;
      if (this.col === game.player.col && this.row === game.player.row) {
        game.status = 'lost';
        game.message = 'A bouncer flattened you!';
      }
      return;
    }

    const hBlocked = this._isSolid(game, this.col + this.dc, this.row);
    const vBlocked = this._isSolid(game, this.col, this.row + this.dr);
    if (hBlocked && vBlocked)      { this.dc *= -1; this.dr *= -1; }
    else if (hBlocked)             { this.dc *= -1; }
    else if (vBlocked)             { this.dr *= -1; }
    else                           { this.dc *= -1; this.dr *= -1; }
  }

  _isSolid(game, col, row) {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return true;
    const cell = game.grid.at(col, row);
    if (!cell) return true;
    if (cell.wall) return true;
    return !cell.revealed && !cell.defused;
  }
}
