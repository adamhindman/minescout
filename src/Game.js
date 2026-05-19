import { Grid } from "./Grid.js";
import { Player } from "./Player.js";
import { Soldier } from "./Soldier.js";
import { COLS, ROWS } from "./constants.js";
import { getMineCount } from "./settings.js";

export class Game {
  constructor() {
    this.grid = new Grid(getMineCount());
    this.player = new Player();
    this.defuseMode = false;
    this.defuseCursor = null; // {col, row}
    this.mistakes = 3;
    this.status = "playing";
    this.message =
      "Navigate to the right. Use the numbers to avoid mines. Hold Shift to defuse.";
    this.soldiers = [];
    this.squadTimer = 30; // seconds until first soldier spawns
    this.playerMoved = false;
    this.exploded = false;
    this.grid.at(this.player.col, this.player.row).revealed = true;
  }

  move(dc, dr) {
    if (this.status !== "playing" || this.defuseMode) return;

    const { col, row } = this.player.targetCell(dc, dr);
    const cell = this.grid.at(col, row);
    if (!cell || cell.wall) return;

    // Push soldier if standing in target cell
    const soldier = this.soldiers.find(
      (s) => s.alive && s.col === col && s.row === row,
    );
    if (soldier) {
      const pushCol = col + dc,
        pushRow = row + dr;
      const pushCell = this.grid.at(pushCol, pushRow);
      if (!pushCell) return; // wall blocks push
      const blocked = this.soldiers.some(
        (s) =>
          s !== soldier && s.alive && s.col === pushCol && s.row === pushRow,
      );
      if (blocked) return;
      soldier.col = pushCol;
      soldier.row = pushRow;
      if (pushCell.hasMine && !pushCell.defused) {
        soldier.alive = false;
        this.message = "You pushed a soldier onto a mine!";
        this.exploded = true;
      }
    }

    if (cell.hasMine && !cell.defused) {
      this.player.moveTo(col, row);
      this.status = "lost";
      this.message =
        "BOOM! You blundered onto a mine. Mission failed, war lost.";
      this.exploded = true;
      return;
    }

    this.playerMoved = true;
    this.player.moveTo(col, row);
    cell.revealed = true;

    if (this.player.col >= COLS - 1) {
      this.status = "won";
      this.message =
        "Mission complete! You cleared a path through the minefield.";
    }
  }

  update(dt) {
    if (this.status === "lost") return;

    if (this.status === 'playing' && this.soldiers.length === 0 && this.playerMoved) {
      this.squadTimer -= dt;
      if (this.squadTimer <= 0) {
        this.soldiers.push(new Soldier(0, Math.floor(ROWS / 2)));
        this.message = "A soldier has entered the minefield!";
      }
    }

    for (const soldier of this.soldiers) {
      soldier.step(this, dt);
    }
  }

  enterDefuse() {
    if (this.status !== "playing" || this.defuseMode) return;
    this.defuseMode = true;
    this.defuseCursor = this._defaultCursorPosition();
    this.message =
      "DEFUSE MODE — arrow keys to aim, Enter to confirm, release Shift to cancel.";
  }

  exitDefuse() {
    this.defuseMode = false;
    this.defuseCursor = null;
    this.message = "Defuse cancelled.";
  }

  toggleDefuse() {
    if (this.status !== "playing") return;
    if (this.defuseMode) this.exitDefuse();
    else this.enterDefuse();
  }

  _defaultCursorPosition() {
    const dirs = [
      { dc: 1, dr: 0 },
      { dc: 1, dr: -1 },
      { dc: 1, dr: 1 },
      { dc: 0, dr: -1 },
      { dc: 0, dr: 1 },
      { dc: -1, dr: 0 },
      { dc: -1, dr: -1 },
      { dc: -1, dr: 1 },
    ];
    for (const { dc, dr } of dirs) {
      const col = this.player.col + dc;
      const row = this.player.row + dr;
      const cell = this.grid.at(col, row);
      if (cell && !cell.wall && !cell.revealed && !cell.defused) return { col, row };
    }
    return null;
  }

  moveCursor(dk_dc, dk_dr) {
    if (!this.defuseMode) return;
    if (!this.defuseCursor) {
      const col = this.player.col + dk_dc;
      const row = this.player.row + dk_dr;
      const c = this.grid.at(col, row);
      if (c && !c.wall && this.player.isAdjacentTo(col, row)) {
        this.defuseCursor = { col, row };
      }
      return;
    }
    const dc_cur = this.defuseCursor.col - this.player.col;
    const dr_cur = this.defuseCursor.row - this.player.row;
    const new_dc = Math.max(-1, Math.min(1, dc_cur + dk_dc));
    const new_dr = Math.max(-1, Math.min(1, dr_cur + dk_dr));
    if (new_dc === 0 && new_dr === 0) return;
    const col = this.player.col + new_dc;
    const row = this.player.row + new_dr;
    const nc = this.grid.at(col, row);
    if (nc && !nc.wall) this.defuseCursor = { col, row };
  }

  confirmDefuse() {
    if (!this.defuseMode || !this.defuseCursor) return;
    this.clickCell(this.defuseCursor.col, this.defuseCursor.row);
  }

  clickCell(col, row) {
    if (this.status !== "playing" || !this.defuseMode) return;

    const cell = this.grid.at(col, row);
    if (!cell || cell.wall) return;

    if (!this.player.isAdjacentTo(col, row)) {
      this.message = "Out of range — move adjacent to the target first.";
      return;
    }

    if (cell.revealed || cell.defused) {
      this.defuseMode = false;
      this.defuseCursor = null;
      this.message = "That square is already clear.";
      return;
    }

    if (cell.hasMine) {
      this.grid.defuse(col, row);
      this.defuseMode = false;
      this.defuseCursor = null;
      this.message = "Mine defused! Path cleared.";
    } else {
      this.defuseMode = false;
      this.defuseCursor = null;
      cell.revealed = true;
      this.mistakes--;
      if (this.mistakes <= 0) {
        this.status = "lost";
        this.message =
          "FALSE ALARM — no mine there. No charges left. Mission failed.";
      } else {
        this.message = `FALSE ALARM — no mine there. ${this.mistakes} charge${this.mistakes === 1 ? "" : "s"} remaining.`;
      }
    }
  }
}
