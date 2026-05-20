import Phaser from 'phaser';
import { Game } from '../Game.js';
import { Renderer } from '../Renderer.js';
import { KeyboardInput } from '../input/KeyboardInput.js';
import { TouchInput } from '../input/TouchInput.js';
import explode1 from '../sounds/mine-explode-1.mp3';
import explode2 from '../sounds/mine-explode-2.mp3';
import explode3 from '../sounds/mine-explode-3.mp3';
import tankUp         from '../assets/tank up.png';
import tankDown       from '../assets/tank down.png';
import tankLeft       from '../assets/tank left.png';
import tankRight      from '../assets/tank right.png';
import explosionSheet from '../assets/explosion-sheet.png';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    this.load.audio('explode1', explode1);
    this.load.audio('explode2', explode2);
    this.load.audio('explode3', explode3);
    this.load.image('tank-up',    tankUp);
    this.load.image('tank-down',  tankDown);
    this.load.image('tank-left',  tankLeft);
    this.load.image('tank-right', tankRight);
    this.load.spritesheet('explosion', explosionSheet, { frameWidth: 128, frameHeight: 128 });
  }

  create() {
    this.gs       = new Game();
    this.renderer = new Renderer(this);

    new KeyboardInput(this, () => this.gs, () => this.scene.restart());
    new TouchInput(this, () => this.gs);
  }

  update(time, delta) {
    const dt = delta / 1000;
    this.gs.update(dt);

    if (this.gs.exploded) {
      const { col, row } = this.gs.exploded;
      this.gs.exploded = null;
      this.sound.play(`explode${Math.floor(Math.random() * 3) + 1}`, { volume: 0.6 });
      this.renderer.playExplosion(col, row);
    }

    this.renderer.render(this.gs, dt);
  }
}
