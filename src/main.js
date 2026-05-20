import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene.js';
import { COLS, ROWS, CELL_SIZE, STATUS_BAR_H } from './constants.js';
import { getMineCount, setMineCount, getTankEnabled, setTankEnabled } from './settings.js';

const picker = document.getElementById('mineCount');
picker.value = getMineCount();

const tankToggle = document.getElementById('tankToggle');
function applyTankToggle(enabled) {
  tankToggle.textContent = enabled ? 'ON' : 'OFF';
  tankToggle.setAttribute('aria-pressed', String(enabled));
}
applyTankToggle(getTankEnabled());

const phaserGame = new Phaser.Game({
  type: Phaser.CANVAS,
  width: COLS * CELL_SIZE,
  height: ROWS * CELL_SIZE + STATUS_BAR_H,
  backgroundColor: '#080e08',
  canvas: document.getElementById('gameCanvas'),
  scene: GameScene,
});

picker.addEventListener('input', () => {
  picker.value = picker.value.replace(/[^0-9]/g, '');
});

picker.addEventListener('change', () => {
  const v = Math.max(0, Math.min(250, parseInt(picker.value, 10) || 0));
  picker.value = v;
  setMineCount(v);
});

tankToggle.addEventListener('click', () => {
  const enabled = !getTankEnabled();
  setTankEnabled(enabled);
  applyTankToggle(enabled);
  const scene = phaserGame.scene.getScene('GameScene');
  if (scene && scene.gs) {
    scene.gs.tankEnabled = enabled;
    if (enabled) {
      scene.gs.playerMoved = false;
      scene.gs.squadTimer = 30;
    } else {
      scene.gs.tanks = [];
    }
  }
});
