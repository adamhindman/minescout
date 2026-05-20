import { COLS, ROWS, CELL_SIZE, STATUS_BAR_H } from '../constants.js';

const cs   = CELL_SIZE;
const W    = COLS * cs;
const barH = ROWS * cs + STATUS_BAR_H;

export class TouchInput {
  constructor(scene, getGame) {
    const g   = () => getGame();
    const cam = () => scene.cameras.main;

    const clampCamera = () => {
      const c = cam();
      c.scrollX = Math.max(0, Math.min(Math.max(0, W    - c.width),  c.scrollX));
      c.scrollY = Math.max(0, Math.min(Math.max(0, barH - c.height), c.scrollY));
    };

    const toGrid = (sx, sy) => ({
      col: Math.floor((sx + cam().scrollX) / cs),
      row: Math.floor((sy + cam().scrollY) / cs),
    });

    // Desktop: click while in defuse mode
    scene.input.on('pointerdown', (pointer) => {
      if (!pointer.wasTouch && g().defuseMode) {
        const { col, row } = toGrid(pointer.x, pointer.y);
        if (row >= 0 && row < ROWS) g().clickCell(col, row);
      }
    });

    // Touch gestures
    const ptrs = new Map();
    let lastTapTime = 0, lastTapX = 0, lastTapY = 0;

    scene.input.on('pointerdown', (pointer) => {
      if (!pointer.wasTouch) return;
      ptrs.set(pointer.id, {
        startX: pointer.x, startY: pointer.y,
        lastX:  pointer.x, lastY:  pointer.y,
        panned: false,
      });
      if (ptrs.size >= 2) for (const p of ptrs.values()) p.panned = true;
    });

    scene.input.on('pointermove', (pointer) => {
      if (!pointer.wasTouch) return;
      const p = ptrs.get(pointer.id);
      if (!p || !p.panned) return;
      const c = cam();
      c.scrollX -= pointer.x - p.lastX;
      c.scrollY -= pointer.y - p.lastY;
      clampCamera();
      p.lastX = pointer.x;
      p.lastY = pointer.y;
    });

    scene.input.on('pointerup', (pointer) => {
      if (!pointer.wasTouch) return;
      const p = ptrs.get(pointer.id);
      ptrs.delete(pointer.id);
      if (!p || p.panned) return;

      const dx   = pointer.x - p.startX;
      const dy   = pointer.y - p.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const now  = Date.now();

      if (dist < 20) {
        const isDouble =
          now - lastTapTime < 300 &&
          Math.abs(pointer.x - lastTapX) < 50 &&
          Math.abs(pointer.y - lastTapY) < 50;

        if (isDouble) {
          lastTapTime = 0;
          const { col, row } = toGrid(pointer.x, pointer.y);
          if (g().player.isAdjacentTo(col, row)) {
            if (!g().defuseMode) g().enterDefuse();
            g().defuseCursor = { col, row };
            g().confirmDefuse();
          }
        } else {
          lastTapTime = now;
          lastTapX = pointer.x;
          lastTapY = pointer.y;
        }
      } else if (dist >= 25) {
        if (Math.abs(dx) >= Math.abs(dy)) g().move(dx > 0 ? 1 : -1, 0);
        else g().move(0, dy > 0 ? 1 : -1);
      }
    });
  }
}
