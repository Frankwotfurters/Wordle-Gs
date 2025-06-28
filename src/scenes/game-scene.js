import Phaser from '../lib/phaser.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });

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
    // enemy id
    const id = this.nextEnemyId;
    const hasPowerUp = id > 10 && id % 10 == 0; // boolean. every 10 enemies, give them a powerup to hold

    const powerUp = hasPowerUp ? 1 : 0; // id of powerup, 1 is freeze for example

    // randomize a word
    const word = this.getNextWord('medium');

    // spawn sprite
    const x = Phaser.Math.Between(50, 400); // random x position
    const y = -50; // start above screen

    const velocity = Phaser.Math.Between(30, 60); // random velocity
    // const velocity = Phaser.Math.Between(100, 150); // random velocity

    // let velocity;
    // if (this.elapsedSeconds < 30) {
    //   velocity = Phaser.Math.Between(10, 30); // Initial speed for the first 30 seconds
    // } else if (this.elapsedSeconds < 60) {
    //   velocity = Phaser.Math.Between(30, 60); // Increase speed after 30 seconds
    // } else {
    //   velocity = Phaser.Math.Between(60, 90); // Speed up further after 1 minute
    // }

    const sprite = this.physics.add
      .sprite(x, y, 'slime')
      .setMaxVelocity(velocity)
      .setVelocityY(velocity)
      .setData('word', word);

    // add the word above the sprite
    const label = this.add.text(x, y - 20, word, {
      fontSize: '16px',
      color: hasPowerUp ? '#ADD8E6' : '#ffffff',
      fontFamily: 'monospace',
    });
    label.setOrigin(0.5, 1);

    // store enemy data
    this.enemies.push({ id, sprite, label, word, powerUp });

    // increment id
    this.nextEnemyId++;
  }

  startGameTimer() {
    this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.elapsedSeconds++;
        this.timerText.setText('Time: ' + this.elapsedSeconds + 's');

        // calculate wpm
        this.wpm = this.charactersTyped / 5 / (this.elapsedSeconds / 60);
      },
      loop: true,
    });
  }

  checkTypedWord() {
    let matchedEnemyIndex = -1;
    let maxY = -Infinity;

    // Loop through all enemies to find the matching one with the lowest Y (i.e., closest to player)
    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      if (enemy.word === this.typedText && enemy.sprite.y > maxY) {
        maxY = enemy.sprite.y;
        matchedEnemyIndex = i;
      }
    }

    if (matchedEnemyIndex !== -1) {
      // Match found!
      const enemy = this.enemies[matchedEnemyIndex];
      const numCharacters = enemy.word.length;
      const powerUp = enemy.powerUp;

      // Remove sprite and label
      enemy.sprite.destroy();
      enemy.label.destroy();

      // Remove from array
      this.enemies.splice(matchedEnemyIndex, 1);

      // get power up if any
      if (this.currentPowerUp == 0 && powerUp > 0) {
        this.updatePowerUp(powerUp);
      }

      // TODO: Add effects
      // increase respective counters
      this.wordsTyped += 1;
      this.charactersTyped += numCharacters;

      // increase score with combo points
      let basePoints = 10;
      let comboBonus = 0;

      if (this.comboCount >= this.comboThreshold) {
        comboBonus = Math.floor(this.comboCount / this.comboThreshold) * 5; // +5 per threshold
      }

      this.score += basePoints + comboBonus;
      this.scoreText.setText('Score: ' + this.score);

      // start timer if this is the first word
      if (!this.timerStarted) {
        this.timerStarted = true;
        this.startGameTimer();
      }
      // this.sound.play('hit');
    }

    // Reset input
    this.typedText = '';
    this.inputDisplay.setText('');
  }

  updatePowerUp(powerUpId) {
    this.currentPowerUp = powerUpId;
    if (powerUpId == 0) {
      this.powerUpText.setText(`Power Up:\n`);
    }
    if (powerUpId == 1) {
      this.powerUpText.setText(`Power Up:\nFreeze`);
    }
  }

  usePowerUp() {
    // use the current powerup

    if (this.currentPowerUp > 0) {
      if (this.currentPowerUp == 1) {
        // freeze
        this.updatePowerUp(0); // clear powerup
        this.freezeEnemies(3000);
      }
    }
  }

  freezeEnemies(duration = 0) {
    // duration in ms
    this.spawnTimer.paused = true;
    this.enemySpawner.paused = true;
    this.enemies.forEach((enemy) => {
      // Store original velocity
      enemy.originalVelocity = enemy.sprite.body.maxVelocity.y;

      // Set velocity to 0
      enemy.sprite.setMaxVelocity(0);

      // frozen effect
      // enemy.sprite.setTint(0x66ccff);
    });

    // After duration, unfreeze
    if (duration > 0) {
      this.time.delayedCall(duration, () => {
        this.enemies.forEach((enemy) => {
          if (enemy.originalVelocity) {
            enemy.sprite.setMaxVelocity(enemy.originalVelocity.y);
            // enemy.sprite.clearTint();
            delete enemy.originalVelocity; // cleanup
          }
        });
        this.spawnTimer.paused = false;
        this.enemySpawner.paused = false;
      });
    }
  }

  unfreezeEnemies() {
    this.enemies.forEach((enemy) => {
      if (enemy.originalVelocity) {
        enemy.sprite.setVelocity(enemy.originalVelocity.x, enemy.originalVelocity.y);
        delete enemy.originalVelocity; // cleanup
      }
    });
  }

  gameOver() {
    // set gameover flag to true to stop the game
    this.isGameOver = true;
    this.freezeEnemies();

    // game over texts
    this.add
      .text(230, 300, 'GAME OVER', {
        fontSize: '40px',
        color: '#f00',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);
    this.add
      .text(230, 360, `WPM: ${Math.round(this.wpm)}`, {
        fontSize: '40px',
        color: '#f00',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);
    this.add
      .text(230, 420, 'Press SPACE to Restart', {
        fontSize: '20px',
        color: '#aaa',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    // Wait for spacebar to restart
    this.input.keyboard.once('keydown-SPACE', () => {
      this.scene.restart(); // restarts the current GameScene
    });
  }

  preload() {
    // load assets
    this.load.image('bg', 'assets/images/bg.png');
    // this.load.image('player', 'assets/images/amongus.png');
    this.load.spritesheet('slime', 'assets/images/Slime_Blue_32x32.png', { frameWidth: 32, frameHeight: 32 });

    this.load.json('short', 'assets/words/short.json');
    this.load.json('medium', 'assets/words/medium.json');
    this.load.json('long', 'assets/words/long.json');
  }

  create() {
    // enemies
    this.enemies = [];

    // gameover flag
    this.isGameOver = false;

    // draw background
    this.add.image(0, 0, 'bg').setScale(0.6).setOrigin(0, 0);

    // setup score counters for statistics
    this.wordsTyped = 0;
    this.charactersTyped = 0;
    this.score = 0;
    this.scoreText = this.add.text(10, 10, `Score: ${this.score}`, {
      fontSize: '24px',
      color: '#fff',
      fontFamily: 'monospace',
    });
    // this is the player sprite at the bottom
    // this.add.image(200, 500, 'player').setScale(0.1).setOrigin(0, 0);

    // set timer
    this.elapsedSeconds = 0;
    this.timerStarted = false;
    this.timerText = this.add.text(10, 40, 'Time: 0s', {
      fontSize: '24px',
      color: '#fff',
      fontFamily: 'monospace',
    });

    // set lives
    this.lives = 3;

    this.livesText = this.add.text(350, 10, 'Lives: 3', {
      fontSize: '20px',
      color: '#fff',
      fontFamily: 'monospace',
    });

    // setup powerups
    this.currentPowerUp = 0;

    this.powerUpText = this.add.text(350, 580, `Power Up:\n}`, {
      fontSize: '20px',
      color: '#fff',
      fontFamily: 'monospace',
    });
    this.updatePowerUp(1);

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

    // combo feature
    this.comboCount = 0;
    // this.maxCombo = 0; // to keep track of max combo
    this.comboThreshold = 15; // example: bonus after 15 characters
    this.comboText = this.add.text(180, 10, 'Combo: 0', {
      fontSize: '20px',
      color: '#ffff00',
      fontFamily: 'monospace',
    });

    // capture keyboard input
    this.typedText = '';
    this.input.keyboard.on('keydown', (event) => {
      const key = event.key;

      if (key === 'Backspace') {
        this.typedText = this.typedText.slice(0, -1);
        this.comboCount = 0; // reset combo on backspace
      } else if (key === ' ' || key === 'Enter') {
        this.checkTypedWord();
      } else if (key === 'Shift') {
        this.usePowerUp();
      } else if (/^[a-zA-Z]$/.test(key)) {
        this.typedText += key.toLowerCase();
        this.comboCount += 1; // increment combo streak
        // for keeping track of max combo streak
        // if (this.comboCount > this.maxCombo) {
        //   this.maxCombo = this.comboCount;
        // }
      }

      this.inputDisplay.setText(this.typedText); // show typed input
      this.comboText.setText('Combo: ' + this.comboCount); // show combo
    });

    // level scaling
    this.spawnDelay = 2000;
    this.minSpawnDelay = 500;
    this.speedupRate = 100;
    this.nextEnemyId = 0;
    this.spawnTimer = this.time.addEvent({
      delay: this.spawnDelay,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true,
    });

    this.enemySpawner = this.time.addEvent({
      delay: 10000,
      callback: () => {
        this.spawnDelay = Math.max(this.minSpawnDelay, this.spawnDelay - this.speedupRate);

        this.spawnTimer.remove();

        this.spawnTimer = this.time.addEvent({
          delay: this.spawnDelay,
          callback: this.spawnEnemy,
          callbackScope: this,
          loop: true,
        });
      },
      loop: true,
    });
  }

  update() {
    if (this.isGameOver) {
      return;
    }
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
