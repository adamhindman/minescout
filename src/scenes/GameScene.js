import Phaser from 'phaser';
import { Game } from '../Game.js';
import { COLS, ROWS, CELL_SIZE, STATUS_BAR_H } from '../constants.js';

const NUM_COLORS = ['', '#5c9edd', '#66bb6a', '#ef5350', '#7986cb', '#a1887f', '#26c6da', '#ff7043', '#90a4ae'];
const NUM_HEX    = [0, 0x5c9edd, 0x66bb6a, 0xef5350, 0x7986cb, 0xa1887f, 0x26c6da, 0xff7043, 0x90a4ae];

const cs = CELL_SIZE;
const W  = COLS * cs;
const barY = ROWS * cs;

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this.gs = new Game();

    this.gfx = this.add.graphics();

    // One text object per cell for adjacency numbers / icons
    this.cellTexts = Array.from({ length: ROWS }, (_, r) =>
      Array.from({ length: COLS }, (_, c) =>
        this.add.text(c * cs + cs / 2, r * cs + cs / 2, '', {
          fontFamily: 'monospace',
          fontSize: `${Math.floor(cs * 0.55)}px`,
          fontStyle: 'bold',
        }).setOrigin(0.5, 0.5).setVisible(false)
      )
    );

    // Player disc label (M / ✕)
    this.playerLabel = this.add.text(0, 0, 'M', {
      fontFamily: 'monospace',
      fontSize: `${Math.floor(cs * 0.32)}px`,
      fontStyle: 'bold',
      color: '#000000',
    }).setOrigin(0.5, 0.5).setDepth(1);

    // Soldier label (reused for the single soldier)
    this.soldierLabel = this.add.text(0, 0, 'S', {
      fontFamily: 'monospace',
      fontSize: `${Math.floor(cs * 0.32)}px`,
      fontStyle: 'bold',
      color: '#000000',
    }).setOrigin(0.5, 0.5).setDepth(1).setVisible(false);

    // Corner count on the player's current cell
    this.cornerCount = this.add.text(0, 0, '', {
      fontFamily: 'monospace',
      fontSize: `${Math.floor(cs * 0.32)}px`,
      fontStyle: 'bold',
    }).setOrigin(1, 0).setDepth(1).setVisible(false);

    // Status bar text objects
    this.modeText = this.add.text(14, barY + 10, '', {
      fontFamily: 'monospace', fontSize: '13px', fontStyle: 'bold',
    }).setOrigin(0, 0);

    this.msgText = this.add.text(14, barY + 34, '', {
      fontFamily: 'monospace', fontSize: '12px',
    }).setOrigin(0, 0);

    this.restartHint = this.add.text(W - 12, barY + 30, 'Press R to restart',
      { fontFamily: 'monospace', fontSize: '11px', color: '#ffd600' }
    ).setOrigin(1, 0).setVisible(false);

    this.countdownText = this.add.text(W - 12, barY + 10, '',
      { fontFamily: 'monospace', fontSize: '11px', color: '#ef9a9a' }
    ).setOrigin(1, 0).setVisible(false);

    this._setupInput();
  }

  _setupInput() {
    const kb = this.input.keyboard;
    const K  = Phaser.Input.Keyboard.KeyCodes;

    const key = (code) => kb.addKey(code);

    const arrowUp    = key(K.UP);
    const arrowDown  = key(K.DOWN);
    const arrowLeft  = key(K.LEFT);
    const arrowRight = key(K.RIGHT);
    const keyA = key(K.A);
    const keyR = key(K.R);
    const keyEnter = key(K.ENTER);
    const keyEsc   = key(K.ESC);
    const keyShift = key(K.SHIFT);

    arrowUp.on('down',    () => { const g = this.gs; g.defuseMode ? g.moveCursor(0,-1) : g.move(0,-1); });
    arrowDown.on('down',  () => { const g = this.gs; g.defuseMode ? g.moveCursor(0, 1) : g.move(0, 1); });
    arrowLeft.on('down',  () => { const g = this.gs; g.defuseMode ? g.moveCursor(-1,0) : g.move(-1,0); });
    arrowRight.on('down', () => { const g = this.gs; g.defuseMode ? g.moveCursor( 1,0) : g.move( 1,0); });

    keyA.on('down', () => this.gs.move(-1,0));

    keyR.on('down',     () => this.scene.restart());
    keyEnter.on('down', () => this.gs.confirmDefuse());
    keyEsc.on('down',   () => { if (this.gs.defuseMode) this.gs.exitDefuse(); });

    keyShift.on('down', () => this.gs.toggleDefuse());

    this.input.on('pointerdown', (pointer) => {
      if (!this.gs.defuseMode) return;
      const col = Math.floor(pointer.x / cs);
      const row = Math.floor(pointer.y / cs);
      if (row < 0 || row >= ROWS) return;
      this.gs.clickCell(col, row);
    });
  }

  update(time, delta) {
    const dt = delta / 1000;
    this.gs.update(dt);
    this._render(this.gs, dt);
  }

  _render(g, dt = 0) {
    const gfx = this.gfx;
    const { player, defuseMode, defuseCursor } = g;

    gfx.clear();

    // Canvas background
    gfx.fillStyle(0x080e08);
    gfx.fillRect(0, 0, W, barY + STATUS_BAR_H);

    // Status bar divider
    gfx.lineStyle(1, 0x1a3a1a);
    gfx.beginPath();
    gfx.moveTo(0, barY + 0.5);
    gfx.lineTo(W, barY + 0.5);
    gfx.strokePath();

    // --- Cells ---
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * cs, y = r * cs;
        const cell = g.grid.cells[r][c];
        const isGoal      = c === COLS - 1;
        const isPlayerHere = c === player.col && r === player.row;
        const isAdjacent  = player.isAdjacentTo(c, r);
        const isCovered   = !cell.revealed && !cell.defused && !isAdjacent && !isPlayerHere;
        const isDefusable = defuseMode && isAdjacent && !cell.revealed && !cell.defused && !isPlayerHere;
        const isCursor    = defuseMode && defuseCursor && c === defuseCursor.col && r === defuseCursor.row;

        // Background
        const bg = cell.defused         ? 0x13312a
                 : isGoal && !isCovered ? 0x0a1220
                 : isGoal               ? 0x0e1828
                 : isCovered            ? 0x232e23
                 : !cell.revealed       ? 0x162316
                 :                        0x0f1a0f;
        gfx.fillStyle(bg);
        gfx.fillRect(x, y, cs, cs);

        // Raised bevel on covered cells
        if (isCovered) {
          gfx.fillStyle(0xffffff, 0.06);
          gfx.fillRect(x, y, cs, 1);
          gfx.fillRect(x, y, 1, cs);
          gfx.fillStyle(0x000000, 0.25);
          gfx.fillRect(x, y + cs - 1, cs, 1);
          gfx.fillRect(x + cs - 1, y, 1, cs);
        }

        if (isDefusable) { gfx.fillStyle(0xff8c00, 0.18); gfx.fillRect(x, y, cs, cs); }
        if (isCursor)    { gfx.fillStyle(0xffd200, 0.55); gfx.fillRect(x, y, cs, cs); }
        if (isGoal)      { gfx.fillStyle(0x466ec8, isCovered ? 0.08 : 0.16); gfx.fillRect(x, y, cs, cs); }

        const strokeColor = isCursor ? 0xffd600 : isDefusable ? 0xff8c00 : !isCovered ? 0x0d180d : 0x1a2a1a;
        gfx.lineStyle((isCursor || isDefusable) ? 2 : 1, strokeColor);
        gfx.strokeRect(x + 0.5, y + 0.5, cs - 1, cs - 1);

        // Cell text
        const t = this.cellTexts[r][c];
        if (cell.defused && cell.adjacentCount > 0) {
          const idx = Math.min(cell.adjacentCount, 8);
          t.setFontSize(Math.floor(cs * 0.55)).setText(String(cell.adjacentCount)).setColor(NUM_COLORS[idx]).setVisible(true);
        } else if (cell.defused) {
          t.setFontSize(Math.floor(cs * 0.75)).setText('✓').setColor('#4caf50').setVisible(true);
        } else if (isGoal && !isCovered) {
          t.setText('▶').setColor('#6a9fd8').setVisible(true);
        } else if (cell.revealed && !cell.hasMine && !isPlayerHere && cell.adjacentCount > 0) {
          const idx = Math.min(cell.adjacentCount, 8);
          t.setText(String(cell.adjacentCount)).setColor(NUM_COLORS[idx]).setVisible(true);
        } else {
          t.setVisible(false);
        }
      }
    }

    // --- Soldiers ---
    const sr = cs * 0.24;
    let soldierRendered = false;
    for (const soldier of g.soldiers) {
      const targetSx = soldier.col * cs + cs / 2;
      const targetSy = soldier.row * cs + cs / 2;
      if (soldier.displayX === undefined) { soldier.displayX = targetSx; soldier.displayY = targetSy; }
      if (!soldier.alive) {
        // Snap to death position
        soldier.displayX = targetSx;
        soldier.displayY = targetSy;
      } else {
        // Linear movement at 1 cell per MOVE_INTERVAL seconds
        const sdx = targetSx - soldier.displayX;
        const sdy = targetSy - soldier.displayY;
        const dist = Math.sqrt(sdx * sdx + sdy * sdy);
        const step = (cs / soldier.MOVE_INTERVAL) * dt;
        if (dist <= step) { soldier.displayX = targetSx; soldier.displayY = targetSy; }
        else { soldier.displayX += (sdx / dist) * step; soldier.displayY += (sdy / dist) * step; }
      }
      const sx = soldier.displayX;
      const sy = soldier.displayY;

      gfx.fillStyle(0x000000, 0.4);
      gfx.fillEllipse(sx + 2, sy + 3, sr * 2, sr);

      const soldierColor = !soldier.alive ? 0xff3333 : soldier.reached ? 0x76ff03 : 0x42a5f5;
      gfx.fillStyle(soldierColor);
      gfx.fillCircle(sx, sy, sr);
      gfx.lineStyle(1.5, 0x000000, 0.55);
      gfx.strokeCircle(sx, sy, sr);

      const soldierLabelSize = !soldier.alive ? Math.floor(cs * 0.55) : Math.floor(cs * 0.32);
      this.soldierLabel
        .setFontSize(soldierLabelSize)
        .setPosition(sx, sy)
        .setText(!soldier.alive ? '✕' : 'S')
        .setColor('#000000')
        .setVisible(true);
      soldierRendered = true;
    }
    if (!soldierRendered) this.soldierLabel.setVisible(false);

    // --- Player ---
    const targetPx = player.col * cs + cs / 2;
    const targetPy = player.row * cs + cs / 2;
    if (player.displayX === undefined) { player.displayX = targetPx; player.displayY = targetPy; }
    const lerpT = Math.min(1, 20 * dt);
    player.displayX += (targetPx - player.displayX) * lerpT;
    player.displayY += (targetPy - player.displayY) * lerpT;
    const px = player.displayX;
    const py = player.displayY;
    const pr = cs * 0.28;

    gfx.fillStyle(0x000000, 0.4);
    gfx.fillEllipse(px + 2, py + 3, pr * 2, pr);

    const playerColor = g.status === 'lost' ? 0xff3333 : defuseMode ? 0xff8c00 : 0xffd600;
    gfx.fillStyle(playerColor);
    gfx.fillCircle(px, py, pr);
    gfx.lineStyle(1.5, 0x000000, 0.55);
    gfx.strokeCircle(px, py, pr);

    const labelSize = g.status === 'lost' ? Math.floor(cs * 0.55) : Math.floor(cs * 0.32);
    this.playerLabel.setFontSize(labelSize).setPosition(px, py).setText(g.status === 'lost' ? '✕' : 'M');

    // Corner count
    const pcell = g.grid.at(player.col, player.row);
    if (pcell && pcell.adjacentCount > 0) {
      const idx = Math.min(pcell.adjacentCount, 8);
      this.cornerCount
        .setPosition(px + cs / 2 - 2, py - cs / 2 + 2)
        .setText(String(pcell.adjacentCount))
        .setColor(NUM_COLORS[idx])
        .setVisible(true);
    } else {
      this.cornerCount.setVisible(false);
    }

    // --- Status bar ---
    const modeColor = g.status === 'lost' ? '#ff5252' : g.status === 'won' ? '#76ff03' : defuseMode ? '#ff8c00' : '#4caf50';
    const modeStr   = g.status === 'lost' ? '[ DEAD ]' : g.status === 'won' ? '[ MISSION COMPLETE ]' : defuseMode ? '[ DEFUSE MODE ]' : '[ MOVING ]';
    this.modeText.setText(modeStr).setColor(modeColor);

    const msgColor = g.status === 'won' ? '#76ff03' : g.status === 'lost' ? '#ff5252' : '#9e9e9e';
    this.msgText.setText(g.message).setColor(msgColor);

    this.restartHint.setVisible(g.status !== 'playing');

    // Squad countdown
    if (g.status === 'playing' && g.soldiers.length === 0 && g.playerMoved && g.squadTimer > 0) {
      const secs = Math.ceil(g.squadTimer);
      this.countdownText.setText(`Squad in ${secs}s`).setVisible(true);
    } else {
      this.countdownText.setVisible(false);
    }

    // Charge pips
    const charges   = g.mistakes;
    const pipColor  = charges >= 2 ? 0x4caf50 : charges === 1 ? 0xff8c00 : 0xff5252;
    const pipR      = 5, pipSpacing = 16, pipY = barY + 18;
    for (let i = 0; i < 3; i++) {
      const pipX = W - 12 - (2 - i) * pipSpacing;
      if (i < charges) { gfx.fillStyle(pipColor); gfx.fillCircle(pipX, pipY, pipR); }
      gfx.lineStyle(1.5, pipColor);
      gfx.strokeCircle(pipX, pipY, pipR);
    }
  }
}
