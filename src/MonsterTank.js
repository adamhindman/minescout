import { COLS, ROWS } from './constants.js';

const MOVE_INTERVAL = 1.2;
const VISION_RANGE = 8;

const DIRS = {
  right: [1, 0],
  left:  [-1, 0],
  up:    [0, -1],
  down:  [0, 1],
};

function dirToFacing(dc, dr) {
  if (dc > 0) return 'right';
  if (dc < 0) return 'left';
  if (dr < 0) return 'up';
  return 'down';
}

export class MonsterTank {
  constructor(col, row) {
    this.col = col;
    this.row = row;
    this.alive = true;
    this.facing = 'right';
    this.state = 'patrol'; // 'patrol' | 'chase'
    this.lastSeenPlayer = null;
    this.patrolTarget = null;
    this.moveTimer = 0;
    this.MOVE_INTERVAL = MOVE_INTERVAL;
  }

  step(game, dt) {
    if (!this.alive) return;

    const interval = this.state === 'chase' ? MOVE_INTERVAL / 2 : MOVE_INTERVAL;
    this.moveTimer += dt;
    if (this.moveTimer < interval) return;
    this.moveTimer -= interval;

    this._updateVision(game);
    this._move(game);
  }

  _updateVision(game) {
    if (this._canSeePlayer(game)) {
      this.state = 'chase';
      this.lastSeenPlayer = { col: game.player.col, row: game.player.row };
    }
  }

  _canSeePlayer(game) {
    const [dc, dr] = DIRS[this.facing];
    const relC = game.player.col - this.col;
    const relR = game.player.row - this.row;
    const dot = relC * dc + relR * dr;
    if (dot <= 0) return false;
    const perp = Math.abs(relC * dr - relR * dc);
    if (perp > dot) return false;
    const dist = Math.abs(relC) + Math.abs(relR);
    if (dist > VISION_RANGE) return false;
    return this._hasLineOfSight(game, this.col, this.row, game.player.col, game.player.row);
  }

  _hasLineOfSight(game, c0, r0, c1, r1) {
    let x = c0, y = r0;
    const dx = Math.abs(c1 - c0), dy = Math.abs(r1 - r0);
    const sx = c0 < c1 ? 1 : -1, sy = r0 < r1 ? 1 : -1;
    let err = dx - dy;
    while (x !== c1 || y !== r1) {
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx)  { err += dx; y += sy; }
      if (x === c1 && y === r1) break;
      const cell = game.grid.at(x, y);
      if (!cell || cell.wall) return false;
    }
    return true;
  }

  _move(game) {
    if (this.state === 'chase') {
      const atTarget = !this.lastSeenPlayer ||
        (this.col === this.lastSeenPlayer.col && this.row === this.lastSeenPlayer.row);
      if (atTarget) {
        this.state = 'patrol';
        this.lastSeenPlayer = null;
      } else {
        this._chaseStep(game, this.lastSeenPlayer.col, this.lastSeenPlayer.row);
        this._checkKillPlayer(game);
        return;
      }
    }
    this._patrolStep(game);
    this._checkKillPlayer(game);
  }

  _patrolStep(game) {
    if (!this.patrolTarget ||
        (this.col === this.patrolTarget.col && this.row === this.patrolTarget.row)) {
      this.patrolTarget = this._pickPatrolTarget(game);
    }
    if (!this.patrolTarget) return;
    if (!this._chaseStep(game, this.patrolTarget.col, this.patrolTarget.row)) {
      this.patrolTarget = null; // unreachable — pick a new one next tick
    }
  }

  _pickPatrolTarget(game) {
    const candidates = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!this._canMoveTo(game, c, r)) continue;
        if (c === this.col && r === this.row) continue;
        candidates.push({ col: c, row: r });
      }
    }
    if (candidates.length === 0) return null;
    // Bias toward cells far away so the tank actually wanders
    const far = candidates.filter(
      p => Math.abs(p.col - this.col) + Math.abs(p.row - this.row) > 6
    );
    const pool = far.length > 0 ? far : candidates;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  _chaseStep(game, targetCol, targetRow) {
    // BFS through cleared cells; move toward the reachable cell closest to target
    const key = (c, r) => r * COLS + c;
    const parent = new Map([[key(this.col, this.row), null]]);
    const queue = [{ col: this.col, row: this.row }];

    while (queue.length) {
      const node = queue.shift();
      for (const [dc, dr] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nc = node.col + dc, nr = node.row + dr;
        const k = key(nc, nr);
        if (parent.has(k)) continue;
        if (!this._canMoveTo(game, nc, nr)) continue;
        parent.set(k, { col: node.col, row: node.row });
        queue.push({ col: nc, row: nr });
      }
    }

    // Find reachable cell closest to target (excluding start)
    let best = null, bestDist = Infinity;
    for (const k of parent.keys()) {
      const c = k % COLS, r = Math.floor(k / COLS);
      if (c === this.col && r === this.row) continue;
      const dist = Math.abs(c - targetCol) + Math.abs(r - targetRow);
      if (dist < bestDist) { bestDist = dist; best = { col: c, row: r }; }
    }

    if (!best) return false;

    // Trace back to first step from start
    let cur = best;
    while (true) {
      const par = parent.get(key(cur.col, cur.row));
      if (!par || (par.col === this.col && par.row === this.row)) break;
      cur = par;
    }

    this._doMove(game, cur.col, cur.row);
    return true;
  }

  _canMoveTo(game, col, row) {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
    const cell = game.grid.at(col, row);
    return cell && !cell.wall && (cell.revealed || cell.defused);
  }

  _doMove(game, col, row) {
    const dc = col - this.col, dr = row - this.row;
    this.facing = dirToFacing(dc, dr);
    this.col = col;
    this.row = row;
  }

  _checkKillPlayer(game) {
    if (this.col === game.player.col && this.row === game.player.row) {
      game.status = 'lost';
      game.message = 'The monster tank ran you down!';
    }
  }

  getVisionCells(game) {
    const [dc, dr] = DIRS[this.facing];
    const cells = [];
    for (let relC = -VISION_RANGE; relC <= VISION_RANGE; relC++) {
      for (let relR = -VISION_RANGE; relR <= VISION_RANGE; relR++) {
        const dot = relC * dc + relR * dr;
        if (dot <= 0) continue;
        const perp = Math.abs(relC * dr - relR * dc);
        if (perp > dot) continue;
        const dist = Math.abs(relC) + Math.abs(relR);
        if (dist > VISION_RANGE) continue;
        const tc = this.col + relC, tr = this.row + relR;
        if (tc < 0 || tc >= COLS || tr < 0 || tr >= ROWS) continue;
        if (!this._hasLineOfSight(game, this.col, this.row, tc, tr)) continue;
        cells.push({ col: tc, row: tr });
      }
    }
    return cells;
  }
}
