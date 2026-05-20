import { Grid } from "./Grid.js";
import { Player } from "./Player.js";
import { MonsterTank } from "./MonsterTank.js";
import { COLS, ROWS } from "./constants.js";
import { getMineCount, getTankEnabled } from "./settings.js";

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
    this.hasKey = false;
    this.tankEnabled = getTankEnabled();
    this.tanks = [];
    this.squadTimer = 30;
    this.playerMoved = false;
    this.exploded = null; // { col, row } when a mine fires, null otherwise
    this.grid.at(this.player.col, this.player.row).revealed = true;
  }

  move(dc, dr) {
    if (this.status !== "playing" || this.defuseMode) return;

    const { col, row } = this.player.targetCell(dc, dr);
    const cell = this.grid.at(col, row);
    if (!cell || cell.wall) return;

    const monster = this.tanks.find(
      (mt) => mt.alive && mt.col === col && mt.row === row,
    );
    if (monster) {
      this.player.moveTo(col, row);
      this.status = "lost";
      this.message = "You drove into the monster tank!";
      return;
    }

    if (cell.hasMine && !cell.defused) {
      this.player.moveTo(col, row);
      this.status = "lost";
      this.message =
        "BOOM! You blundered onto a mine. Mission failed, war lost.";
      this.exploded = { col, row };
      return;
    }

    this.playerMoved = true;
    this.player.moveTo(col, row);
    cell.revealed = true;

    if (
      !this.hasKey &&
      this.player.col === this.grid.keyCol &&
      this.player.row === this.grid.keyRow
    ) {
      this.hasKey = true;
      this.grid.keyCol = -1;
      this.grid.keyRow = -1;
      this.message = "You found the key! Reach the door on the right!";
    } else if (
      this.player.col === COLS - 1 &&
      this.player.row === Math.floor(ROWS / 2)
    ) {
      if (this.hasKey) {
        this.status = "won";
        const livingTank = this.tanks.find((mt) => mt.alive);
        if (livingTank) {
          livingTank.alive = false;
          this.exploded = { col: livingTank.col, row: livingTank.row };
          this.message =
            "You win! Seeing your victory, the tank self-destructs out of shame.";
        } else {
          this.message = "Mission complete! You escaped with the key!";
        }
      } else {
        this.message = "The door is locked — find the key first!";
      }
    }
  }

  update(dt) {
    if (this.status === "lost") return;

    if (
      this.tankEnabled &&
      this.status === "playing" &&
      this.tanks.length === 0 &&
      this.playerMoved
    ) {
      this.squadTimer -= dt;
      if (this.squadTimer <= 0) {
        this.tanks.push(new MonsterTank(0, Math.floor(ROWS / 2)));
        this.message = "A tank has entered the minefield!";
      }
    }

    for (const mt of this.tanks) {
      mt.step(this, dt);
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
      if (cell && !cell.wall && !cell.revealed && !cell.defused)
        return { col, row };
    }
    return null;
  }

  moveCursor(dk_dc, dk_dr) {
    if (!this.defuseMode) return;
    if (!this.defuseCursor) {
      const col = this.player.col + dk_dc;
      const row = this.player.row + dk_dr;
      const c = this.grid.at(col, row);
      if (c && this.player.isAdjacentTo(col, row)) {
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
    if (nc) this.defuseCursor = { col, row };
  }

  confirmDefuse() {
    if (!this.defuseMode || !this.defuseCursor) return;
    this.clickCell(this.defuseCursor.col, this.defuseCursor.row);
  }

  clickCell(col, row) {
    if (this.status !== "playing" || !this.defuseMode) return;

    const cell = this.grid.at(col, row);
    if (!cell) return;
    if (cell.wall) {
      this.defuseMode = false;
      this.defuseCursor = null;
      this.message = "That's a wall — nothing to defuse.";
      return;
    }

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
