import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene.js';
import { COLS, ROWS, CELL_SIZE, STATUS_BAR_H } from './constants.js';
import { getMineCount, setMineCount } from './settings.js';

const picker = document.getElementById('mineCount');
picker.value = getMineCount();

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
  const v = Math.max(5, Math.min(150, parseInt(picker.value, 10) || 55));
  picker.value = v;
  setMineCount(v);
  phaserGame.scene.getScene('GameScene').scene.restart();
});
