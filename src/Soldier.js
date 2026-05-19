import { COLS, ROWS } from "./constants.js";

export class Soldier {
  constructor(col, row) {
    this.col = col;
    this.row = row;
    this.alive = true;
    this.reached = false;
    this.moveTimer = 0;
    this.MOVE_INTERVAL = 3;
    this.facing = "right";
  }

  step(game, dt) {
    if (!this.alive || this.reached) return;
    this.moveTimer += dt;
    const interval =
      game.status === "won" ? this.MOVE_INTERVAL / 5 : this.MOVE_INTERVAL;
    if (this.moveTimer < interval) return;
    this.moveTimer -= interval;
    this._move(game);
  }

  _move(game) {
    const next = this._nextStep(game);
    if (!next) return;

    const dc = next.col - this.col;
    const dr = next.row - this.row;
    if (dc > 0) this.facing = "right";
    else if (dc < 0) this.facing = "left";
    else if (dr < 0) this.facing = "up";
    else if (dr > 0) this.facing = "down";

    this.col = next.col;
    this.row = next.row;

    const cell = game.grid.at(this.col, this.row);
    if (cell && cell.hasMine && !cell.defused) {
      this.alive = false;
      game.message = "Tank hit a mine! Clear a safer path.";
      game.exploded = true;
      return;
    }
    if (this.col >= COLS - 1) {
      this.reached = true;
      game.message = "You made it through the minefield!";
    }
  }

  _nextStep(game) {
    const currentCell = game.grid.at(this.col, this.row);
    const onClearedGround =
      currentCell && (currentCell.revealed || currentCell.defused);

    if (onClearedGround) {
      const step = this._bfsRightmost(game);
      if (step) return step;
    } else if (game.status === "won") {
      // Player finished — find nearest cleared cell and head for it
      const step = this._bfsToCleared(game);
      if (step) return step;
    }

    return this._greedyStep(game);
  }

  // BFS through all reachable cleared cells; returns first step toward rightmost one,
  // or null if no cleared cell is further right than current position.
  _bfsRightmost(game) {
    const key = (c, r) => r * COLS + c;
    const parent = new Map();
    parent.set(key(this.col, this.row), null);
    const queue = [{ col: this.col, row: this.row }];
    let best = { col: this.col, row: this.row };

    while (queue.length) {
      const node = queue.shift();
      for (const [dc, dr] of [
        [0, -1],
        [0, 1],
        [-1, 0],
        [1, 0],
      ]) {
        const nc = node.col + dc,
          nr = node.row + dr;
        const k = key(nc, nr);
        if (parent.has(k)) continue;
        const cell = game.grid.at(nc, nr);
        if (!cell || cell.wall || (!cell.revealed && !cell.defused)) continue;
        parent.set(k, { col: node.col, row: node.row });
        if (
          nc > best.col ||
          (nc === best.col &&
            Math.abs(nr - this.row) < Math.abs(best.row - this.row))
        ) {
          best = { col: nc, row: nr };
        }
        queue.push({ col: nc, row: nr });
      }
    }

    if (best.col <= this.col) return null;

    // Trace back from best to the first step away from start
    let cur = best;
    let par = parent.get(key(best.col, best.row));
    while (par && parent.get(key(par.col, par.row)) !== null) {
      cur = par;
      par = parent.get(key(cur.col, cur.row));
    }

    // If the first step is occupied, wait rather than forcing a detour
    if (this._isOccupied(game, cur.col, cur.row)) return null;
    return cur;
  }

  // BFS through all non-wall cells to find the nearest cleared cell; returns
  // first step toward it. Used when the tank is in the minefield after player wins.
  _bfsToCleared(game) {
    const key = (c, r) => r * COLS + c;
    const parent = new Map();
    parent.set(key(this.col, this.row), null);
    const queue = [{ col: this.col, row: this.row }];

    while (queue.length) {
      const node = queue.shift();
      for (const [dc, dr] of [
        [0, -1],
        [0, 1],
        [-1, 0],
        [1, 0],
      ]) {
        const nc = node.col + dc,
          nr = node.row + dr;
        const k = key(nc, nr);
        if (parent.has(k)) continue;
        const cell = game.grid.at(nc, nr);
        if (!cell || cell.wall) continue;
        parent.set(k, { col: node.col, row: node.row });
        if (cell.revealed || cell.defused) {
          let cur = { col: nc, row: nr };
          let par = parent.get(key(cur.col, cur.row));
          while (par && parent.get(key(par.col, par.row)) !== null) {
            cur = par;
            par = parent.get(key(cur.col, cur.row));
          }
          if (this._isOccupied(game, cur.col, cur.row)) return null;
          return cur;
        }
        queue.push({ col: nc, row: nr });
      }
    }
    return null;
  }

  _isOccupied(game, col, row) {
    if (game.player.col === col && game.player.row === row) return true;
    return game.soldiers.some(
      (s) => s !== this && s.alive && s.col === col && s.row === row,
    );
  }

  _greedyStep(game) {
    const candidates = [
      { col: this.col + 1, row: this.row },
      { col: this.col + 1, row: this.row - 1 },
      { col: this.col + 1, row: this.row + 1 },
    ];
    for (const m of candidates) {
      if (m.col < 0 || m.col >= COLS || m.row < 0 || m.row >= ROWS) continue;
      const mc = game.grid.at(m.col, m.row);
      if (!mc || mc.wall) continue;
      if (this._isOccupied(game, m.col, m.row)) continue;
      return m;
    }
    return null;
  }
}
