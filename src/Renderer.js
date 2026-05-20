import { COLS, ROWS, CELL_SIZE, STATUS_BAR_H } from './constants.js';

const NUM_COLORS = ['', '#5c9edd', '#66bb6a', '#ef5350', '#7986cb', '#a1887f', '#26c6da', '#ff7043', '#90a4ae'];

const cs   = CELL_SIZE;
const W    = COLS * cs;
const barY = ROWS * cs;

export class Renderer {
  constructor(scene) {
    this._scene = scene;
    this.gfx = scene.add.graphics();

    scene.anims.create({
      key: 'explosion',
      frames: scene.anims.generateFrameNumbers('explosion', { start: 0, end: 7 }),
      frameRate: 16,
      repeat: 0,
    });

    this.cellTexts = Array.from({ length: ROWS }, (_, r) =>
      Array.from({ length: COLS }, (_, c) =>
        scene.add.text(c * cs + cs / 2, r * cs + cs / 2, '', {
          fontFamily: 'monospace',
          fontSize: `${Math.floor(cs * 0.55)}px`,
          fontStyle: 'bold',
        }).setOrigin(0.5, 0.5).setVisible(false)
      )
    );

    this.playerLabel = scene.add.text(0, 0, 'M', {
      fontFamily: 'monospace',
      fontSize: `${Math.floor(cs * 0.32)}px`,
      fontStyle: 'bold',
      color: '#000000',
    }).setOrigin(0.5, 0.5).setDepth(1);

    this.monsterSprite = scene.add.image(0, 0, 'tank-right')
      .setDisplaySize(cs * 0.95, cs * 0.95)
      .setOrigin(0.5, 0.5).setDepth(1).setVisible(false);

    this.cornerCount = scene.add.text(0, 0, '', {
      fontFamily: 'monospace',
      fontSize: `${Math.floor(cs * 0.32)}px`,
      fontStyle: 'bold',
    }).setOrigin(1, 0).setDepth(1).setVisible(false);

    this.modeText = scene.add.text(14, barY + 10, '', {
      fontFamily: 'monospace', fontSize: '13px', fontStyle: 'bold',
    }).setOrigin(0, 0);

    this.msgText = scene.add.text(14, barY + 34, '', {
      fontFamily: 'monospace', fontSize: '12px',
    }).setOrigin(0, 0);

    this.restartHint = scene.add.text(W - 12, barY + 30, 'Press R to restart', {
      fontFamily: 'monospace', fontSize: '11px', color: '#ffd600',
    }).setOrigin(1, 0).setVisible(false);

    this.countdownText = scene.add.text(W / 2, 10, '', {
      fontFamily: 'monospace', fontSize: '12px', color: '#ef9a9a',
    }).setOrigin(0.5, 0).setDepth(2).setVisible(false);

    this.ghostLabel = scene.add.text(0, 0, 'M', {
      fontFamily: 'monospace',
      fontSize: `${Math.floor(cs * 0.32)}px`,
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5, 0.5).setDepth(1).setAlpha(0.35).setVisible(false);

    // Display positions keyed by entity, kept out of game objects
    this._displayPos = new WeakMap();
    this._ghostPos = null;
    this._ghostTimer = 0;
    this._tankFlash = null; // { timer } while flashing, null otherwise
    this.flashGfx = scene.add.graphics().setDepth(3);
  }

  render(game, dt) {
    const gfx = this.gfx;
    const { player, defuseMode, defuseCursor } = game;

    gfx.clear();

    // Background
    gfx.fillStyle(0x080e08);
    gfx.fillRect(0, 0, W, barY + STATUS_BAR_H);

    // Status bar divider
    gfx.lineStyle(1, 0x1a3a1a);
    gfx.beginPath();
    gfx.moveTo(0, barY + 0.5);
    gfx.lineTo(W, barY + 0.5);
    gfx.strokePath();

    this._ghostTimer += dt;
    const _mt = game.tanks[0];
    if (_mt && _mt.lastSeenPlayer) {
      if (this._ghostPos === null || this._ghostTimer >= 2) {
        if (this._ghostTimer >= 2) this._ghostTimer -= 2;
        this._ghostPos = { ..._mt.lastSeenPlayer };
      }
    } else {
      this._ghostPos = null;
      this._ghostTimer = 0;
    }

    this._renderCells(game, gfx, player, defuseMode, defuseCursor);
    this._renderWalls(game, gfx);
    this._renderMonsterTanks(game, gfx, dt);
    this._renderPlayer(game, gfx, player, defuseMode, dt);
    this._renderStatusBar(game, defuseMode);
  }

  // --- Private render sections ---

  _renderCells(game, gfx, player, defuseMode, defuseCursor) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * cs, y = r * cs;
        const cell        = game.grid.cells[r][c];
        const isDoor      = c === COLS - 1 && r === Math.floor(ROWS / 2);
        const isKey       = c === game.grid.keyCol && r === game.grid.keyRow;
        const isPlayerHere = c === player.col && r === player.row;
        const isAdjacent  = player.isAdjacentTo(c, r);
        const isCovered   = !cell.revealed && !cell.defused && !isAdjacent && !isPlayerHere && !isDoor;
        const isDefusable = defuseMode && isAdjacent && !cell.wall && !cell.revealed && !cell.defused && !isPlayerHere;
        const isCursor    = defuseMode && defuseCursor && c === defuseCursor.col && r === defuseCursor.row;

        const bg = cell.defused    ? 0x13312a
                 : isDoor          ? 0x0a1220
                 : isCovered       ? 0x232e23
                 : !cell.revealed  ? 0x162316
                 :                   0x0f1a0f;
        gfx.fillStyle(bg);
        gfx.fillRect(x, y, cs, cs);

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
        if (isDoor)      { gfx.fillStyle(0x466ec8, 0.22); gfx.fillRect(x, y, cs, cs); }

        const strokeColor = isCursor ? 0xffd600 : isDefusable ? 0xff8c00 : !isCovered ? 0x0d180d : 0x1a2a1a;
        gfx.lineStyle((isCursor || isDefusable) ? 2 : 1, strokeColor);
        gfx.strokeRect(x + 0.5, y + 0.5, cs - 1, cs - 1);

        const t = this.cellTexts[r][c];
        if (cell.defused && cell.adjacentCount > 0) {
          const idx = Math.min(cell.adjacentCount, 8);
          t.setFontSize(Math.floor(cs * 0.55)).setText(String(cell.adjacentCount)).setColor(NUM_COLORS[idx]).setVisible(true);
        } else if (cell.defused) {
          t.setFontSize(Math.floor(cs * 0.75)).setText('✓').setColor('#4caf50').setVisible(true);
        } else if (isDoor) {
          t.setFontSize(Math.floor(cs * 0.65)).setText('▣').setColor(game.hasKey ? '#76ff03' : '#6a9fd8').setVisible(true);
        } else if (isKey && (isAdjacent || isPlayerHere)) {
          t.setFontSize(Math.floor(cs * 0.65)).setText('K').setColor('#ffd600').setVisible(true);
        } else if (cell.revealed && !cell.hasMine && !isPlayerHere && cell.adjacentCount > 0) {
          const idx = Math.min(cell.adjacentCount, 8);
          t.setText(String(cell.adjacentCount)).setColor(NUM_COLORS[idx]).setVisible(true);
        } else {
          t.setVisible(false);
        }
      }
    }
  }

  _renderWalls(game, gfx) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!game.grid.cells[r][c].wall) continue;
        const x = c * cs, y = r * cs;
        gfx.fillStyle(0x5c4a2a);
        gfx.fillRect(x + 1, y + 1, cs - 2, cs - 2);
        gfx.fillStyle(0x8a7040, 0.6);
        gfx.fillRect(x + 1, y + 1, cs - 2, 3);
        gfx.fillRect(x + 1, y + 1, 3, cs - 2);
        gfx.fillStyle(0x2a2010, 0.7);
        gfx.fillRect(x + 1, y + cs - 4, cs - 2, 3);
        gfx.fillRect(x + cs - 4, y + 1, 3, cs - 2);
      }
    }
  }

  _renderMonsterTanks(game, gfx, dt) {
    let rendered = false;

    for (const mt of game.tanks) {
      if (!mt.alive) continue;

      // Interpolate display position
      const targetX = mt.col * cs + cs / 2;
      const targetY = mt.row * cs + cs / 2;
      const pos = this._getDisplayPos(mt, targetX, targetY);
      const interval = mt.state === 'chase' ? mt.MOVE_INTERVAL / 2 : mt.MOVE_INTERVAL;
      const dx = targetX - pos.x;
      const dy = targetY - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const step = (cs / interval) * dt;
      if (dist <= step) { pos.x = targetX; pos.y = targetY; }
      else { pos.x += (dx / dist) * step; pos.y += (dy / dist) * step; }

      if (mt.justDetected) {
        mt.justDetected = false;
        this._tankFlash = { timer: 0 };
      }
      if (this._tankFlash) {
        this._tankFlash.timer += dt;
        if (this._tankFlash.timer >= 0.6) this._tankFlash = null;
      }

      // Flash overlay: bright red rect drawn above sprite, 3 × 0.2s pulses
      this.flashGfx.clear();
      if (this._tankFlash && (this._tankFlash.timer % 0.2) < 0.1) {
        this.flashGfx.fillStyle(0xff2200, 0.85);
        this.flashGfx.fillRect(pos.x - cs * 0.475, pos.y - cs * 0.475, cs * 0.95, cs * 0.95);
      }

      const tint = mt.state === 'chase' ? 0xff1111 : 0xff4444;
      this.monsterSprite
        .setTexture(`tank-${mt.facing}`)
        .setPosition(pos.x, pos.y)
        .setDisplaySize(cs * 0.95, cs * 0.95)
        .setTint(tint)
        .setVisible(true);
      rendered = true;
    }

    if (!rendered) {
      this.monsterSprite.setVisible(false);
      this.flashGfx.clear();
    }
  }

  _renderPlayer(game, gfx, player, defuseMode, dt) {
    if (this._ghostPos) {
      const gx = this._ghostPos.col * cs + cs / 2;
      const gy = this._ghostPos.row * cs + cs / 2;
      const pr = cs * 0.28;
      gfx.fillStyle(0xffffff, 0.18);
      gfx.fillCircle(gx, gy, pr);
      gfx.lineStyle(1.5, 0xffffff, 0.35);
      gfx.strokeCircle(gx, gy, pr);
      this.ghostLabel.setVisible(false);
    } else {
      this.ghostLabel.setVisible(false);
    }

    const targetX = player.col * cs + cs / 2;
    const targetY = player.row * cs + cs / 2;
    const pos = this._getDisplayPos(player, targetX, targetY);

    const lerpT = Math.min(1, 20 * dt);
    pos.x += (targetX - pos.x) * lerpT;
    pos.y += (targetY - pos.y) * lerpT;

    if (game.status === 'lost') {
      this.playerLabel
        .setFontSize(Math.floor(cs * 0.8))
        .setPosition(pos.x, pos.y)
        .setColor('#ff3333')
        .setText('✕');
    } else {
      const pr = cs * 0.28;
      gfx.fillStyle(0x000000, 0.4);
      gfx.fillEllipse(pos.x + 2, pos.y + 3, pr * 2, pr);

      const color = defuseMode ? 0xff8c00 : 0xffd600;
      gfx.fillStyle(color);
      gfx.fillCircle(pos.x, pos.y, pr);
      gfx.lineStyle(1.5, 0x000000, 0.55);
      gfx.strokeCircle(pos.x, pos.y, pr);

      this.playerLabel
        .setFontSize(Math.floor(cs * 0.32))
        .setPosition(pos.x, pos.y)
        .setColor('#000000')
        .setText('M');
    }

    const pcell = game.grid.at(player.col, player.row);
    if (pcell && pcell.adjacentCount > 0) {
      const idx = Math.min(pcell.adjacentCount, 8);
      this.cornerCount
        .setPosition(pos.x + cs / 2 - 2, pos.y - cs / 2 + 2)
        .setText(String(pcell.adjacentCount))
        .setColor(NUM_COLORS[idx])
        .setVisible(true);
    } else {
      this.cornerCount.setVisible(false);
    }
  }

  _renderStatusBar(game, defuseMode) {
    const modeColor = game.status === 'lost' ? '#ff5252' : game.status === 'won' ? '#76ff03' : defuseMode ? '#ff8c00' : '#4caf50';
    const modeStr   = game.status === 'lost' ? '[ DEAD ]' : game.status === 'won' ? '[ MISSION COMPLETE ]' : defuseMode ? '[ DEFUSE MODE ]' : game.hasKey ? '[ MOVING  —  KEY ✦ ]' : '[ MOVING ]';
    this.modeText.setText(modeStr).setColor(modeColor);

    const msgColor = game.status === 'won' ? '#76ff03' : game.status === 'lost' ? '#ff5252' : '#9e9e9e';
    this.msgText.setText(game.message).setColor(msgColor);

    this.restartHint.setVisible(game.status !== 'playing');

    if (game.tankEnabled && game.status === 'playing' && game.playerMoved && game.tanks.length === 0 && game.squadTimer > 0) {
      this.countdownText.setText(`Tank arrives in ${Math.ceil(game.squadTimer)}s`).setVisible(true);
    } else {
      this.countdownText.setVisible(false);
    }

    const charges = game.mistakes;
    const pipColor = charges >= 2 ? 0x4caf50 : charges === 1 ? 0xff8c00 : 0xff5252;
    const pipR = 5, pipSpacing = 16, pipY = barY + 18;
    for (let i = 0; i < 3; i++) {
      const pipX = W - 12 - (2 - i) * pipSpacing;
      if (i < charges) { this.gfx.fillStyle(pipColor); this.gfx.fillCircle(pipX, pipY, pipR); }
      this.gfx.lineStyle(1.5, pipColor);
      this.gfx.strokeCircle(pipX, pipY, pipR);
    }
  }

  playExplosion(col, row) {
    const x = col * cs + cs / 2;
    const y = row * cs + cs / 2;
    const sprite = this._scene.add.sprite(x, y, 'explosion')
      .setDisplaySize(cs * 2, cs * 2)
      .setDepth(4);
    sprite.play('explosion');
    sprite.once('animationcomplete', () => sprite.destroy());
  }

  _getDisplayPos(entity, defaultX, defaultY) {
    if (!this._displayPos.has(entity)) {
      this._displayPos.set(entity, { x: defaultX, y: defaultY });
    }
    return this._displayPos.get(entity);
  }
}
