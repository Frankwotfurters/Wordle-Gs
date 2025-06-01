import Phaser from '../lib/phaser.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // load assets
    this.load.spritesheet('slime', 'assets/images/Slime_Blue_32x32.png', { frameWidth: 32, frameHeight: 32 });
  }

  create() {
    this.scene.start('PreloadScene');
  }
}
