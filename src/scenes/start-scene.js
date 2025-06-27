import Phaser from '../lib/phaser.js';

export class StartScene extends Phaser.Scene {
  constructor() {
    super({ key: 'StartScene' });
  }

  create() {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2 - 50, 'Type Rangers', {
        fontSize: '32px',
        color: '#fff',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    const startText = this.add
      .text(width / 2, height / 2 + 20, 'Press SPACE to Start', {
        fontSize: '20px',
        color: '#aaa',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    // blink effect
    this.tweens.add({
      targets: startText,
      alpha: { from: 1, to: 0.3 },
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    this.input.keyboard.once('keydown-SPACE', () => {
      this.scene.start('GameScene');
    });
  }
}
