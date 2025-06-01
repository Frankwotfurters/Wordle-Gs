import Phaser from '../lib/phaser.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });

    this.enemies = [];
    this.shortWords;
    this.mediumWords;
    this.longWords;
    this.wordQueue = {
      short: [],
      medium: [],
      long: [],
    };
  }

  getNextWord(difficulty) {
    // check each queue if empty. if so, then reshuffle
    for (let key in this.wordQueue) {
      if (this.wordQueue[key].length == 0) {
        const originalWords = this.cache.json.get(difficulty).words;
        this.wordQueue[key] = Phaser.Utils.Array.Shuffle(originalWords.slice());
      }
    }

    return this.wordQueue[difficulty].shift();
  }

  spawnEnemy() {
    // randomize a word
    const word = this.getNextWord('medium');

    // spawn sprite
    const x = Phaser.Math.Between(50, 400); // random x position
    const y = -50; // start above screen
    const velocity = Phaser.Math.Between(50, 100);
    const sprite = this.physics.add
      .sprite(x, y, 'slime')
      .setMaxVelocity(velocity)
      .setVelocityY(velocity)
      .setData('word', word);

    // add the word above the sprite
    const label = this.add.text(x, y - 20, word, {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
    });
    label.setOrigin(0.5, 1);

    // store enemy data
    this.enemies.push({ sprite, label, word });
  }

  checkTypedWord() {
    // TODO: prioritize enemies closer to player (lower Y coordinates)
    const matchIndex = this.enemies.findIndex((enemy) => enemy.word === this.typedText);

    if (matchIndex !== -1) {
      // Match found!
      const enemy = this.enemies[matchIndex];

      // Remove sprite and label
      enemy.sprite.destroy();
      enemy.label.destroy();

      // Remove from array
      this.enemies.splice(matchIndex, 1);

      // TODO: Add effects
      this.score += 10;
      this.scoreText.setText('Score: ' + this.score);
      // this.sound.play('hit');
    }

    // Reset input
    this.typedText = '';
    this.inputDisplay.setText('');
  }

  gameOver() {
    this.add
      .text(230, 300, 'GAME OVER', {
        fontSize: '40px',
        color: '#f00',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    this.scene.pause(); // stops the game
  }

  preload() {
    // load assets
    this.load.image('bg', 'assets/images/bg.png');
    this.load.image('player', 'assets/images/amongus.png');
    this.load.spritesheet('slime', 'assets/images/Slime_Blue_32x32.png', { frameWidth: 32, frameHeight: 32 });

    this.load.json('short', 'assets/words/short.json');
    this.load.json('medium', 'assets/words/medium.json');
    this.load.json('long', 'assets/words/long.json');
  }

  create() {
    // draw ui
    this.add.image(0, 0, 'bg').setScale(0.6).setOrigin(0, 0);
    this.score = 0;
    this.scoreText = this.add.text(10, 10, `Score: ${this.score}`, {
      fontSize: '24px',
      color: '#fff',
      fontFamily: 'monospace',
    });
    // this.add.image(200, 500, 'player').setScale(0.1).setOrigin(0, 0);

    // set lives
    this.lives = 3;

    this.livesText = this.add.text(350, 10, 'Lives: 3', {
      fontSize: '20px',
      color: '#fff',
      fontFamily: 'monospace',
    });

    // setup wordlists
    this.shortWords = this.cache.json.get('short').words;
    this.mediumWords = this.cache.json.get('medium').words;
    this.longWords = this.cache.json.get('long').words;

    // display input box
    this.inputDisplay = this.add.text(50, 500, '', {
      fontSize: '24px',
      color: '#fff',
      fontFamily: 'monospace',
    });

    // capture keyboard input
    this.typedText = '';
    this.input.keyboard.on('keydown', (event) => {
      const key = event.key;

      if (key === 'Backspace') {
        this.typedText = this.typedText.slice(0, -1);
      } else if (key === ' ' || key === 'Enter') {
        this.checkTypedWord();
      } else if (/^[a-zA-Z]$/.test(key)) {
        this.typedText += key.toLowerCase();
      }

      this.inputDisplay.setText(this.typedText); // show typed input
    });

    // spawn enemy event
    this.time.addEvent({
      delay: 1000,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true,
    });
  }

  update() {
    // update enemies
    this.enemies.forEach((enemyObj, index) => {
      const { sprite, label } = enemyObj;

      // move word with the enemy
      label.setPosition(sprite.x, sprite.y - 20);

      // check if enemy reached bottom
      if (sprite.y > this.sys.game.config.height) {
        // Remove sprite & label
        sprite.destroy();
        label.destroy();
        this.enemies.splice(index, 1);

        // Lose a life
        this.lives--;
        this.livesText.setText('Lives: ' + this.lives);

        // Check for game over
        if (this.lives <= 0) {
          this.gameOver();
        }
      }
    });
  }
}
