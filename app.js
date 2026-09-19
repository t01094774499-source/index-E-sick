// NeoArcade Main Application Controller
class ArcadeApp {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.currentGame = null;
    this.currentGameId = 'breakout';
    this.lastTime = performance.now();
    this.isPaused = false;
    this.crtEnabled = true;

    this.highScores = {
      breakout: 0,
      snake: 0,
      invaders: 0
    };

    this.loadSettings();
    this.initDOM();
    this.initControls();
    this.selectGame('breakout');

    // Start game loop
    requestAnimationFrame(this.loop.bind(this));
  }

  loadSettings() {
    try {
      const savedScores = localStorage.getItem('neoarcade_highscores');
      if (savedScores) {
        this.highScores = { ...this.highScores, ...JSON.parse(savedScores) };
      }
      const crtPref = localStorage.getItem('neoarcade_crt');
      if (crtPref !== null) {
        this.crtEnabled = crtPref === 'true';
      }
    } catch (e) {
      console.warn('LocalStorage not accessible:', e);
    }
  }

  saveHighScore(gameId, score) {
    if (score > (this.highScores[gameId] || 0)) {
      this.highScores[gameId] = score;
      try {
        localStorage.setItem('neoarcade_highscores', JSON.stringify(this.highScores));
      } catch (e) {}
      this.updateScoresUI();
      window.soundEngine.playVictory();
    }
  }

  initDOM() {
    this.crtOverlay = document.getElementById('crtOverlay');
    this.crtToggleBtn = document.getElementById('toggleCrtBtn');
    this.bgmToggleBtn = document.getElementById('toggleBgmBtn');
    this.soundToggleBtn = document.getElementById('toggleSoundBtn');
    this.fullscreenBtn = document.getElementById('fullscreenBtn');
    this.volumeSlider = document.getElementById('volumeSlider');
    this.pauseModal = document.getElementById('pauseModal');

    // Apply initial CRT state
    this.updateCRTDisplay();

    // CRT Toggle
    if (this.crtToggleBtn) {
      this.crtToggleBtn.addEventListener('click', () => {
        this.crtEnabled = !this.crtEnabled;
        try {
          localStorage.setItem('neoarcade_crt', this.crtEnabled);
        } catch (e) {}
        this.updateCRTDisplay();
        window.soundEngine.playBounce();
      });
    }

    // Sound Mute Toggle
    if (this.soundToggleBtn) {
      this.soundToggleBtn.addEventListener('click', () => {
        const isMuted = window.soundEngine.toggleMute();
        this.soundToggleBtn.classList.toggle('active', !isMuted);
        this.soundToggleBtn.querySelector('span').textContent = isMuted ? 'MUTE' : 'SOUND ON';
        if (!isMuted) window.soundEngine.playBounce();
      });
    }

    // BGM Toggle
    if (this.bgmToggleBtn) {
      this.bgmToggleBtn.addEventListener('click', () => {
        const isPlaying = window.soundEngine.toggleBgm();
        this.bgmToggleBtn.classList.toggle('active', isPlaying);
        this.bgmToggleBtn.querySelector('span').textContent = isPlaying ? 'BGM ON' : 'BGM OFF';
      });
    }

    // Volume Slider
    if (this.volumeSlider) {
      this.volumeSlider.addEventListener('input', (e) => {
        window.soundEngine.setVolume(parseFloat(e.target.value));
      });
    }

    // Fullscreen Toggle
    if (this.fullscreenBtn) {
      this.fullscreenBtn.addEventListener('click', () => {
        const elem = document.querySelector('.arcade-screen-wrapper');
        if (!document.fullscreenElement) {
          elem.requestFullscreen().catch(err => {
            alert(`전체화면 모드를 시작할 수 없습니다: ${err.message}`);
          });
        } else {
          document.exitFullscreen();
        }
      });
    }

    // Game Switch Buttons
    document.querySelectorAll('.game-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetGame = btn.dataset.game;
        if (targetGame && targetGame !== this.currentGameId) {
          this.selectGame(targetGame);
        }
      });
    });

    // Instructions toggle
    const helpBtn = document.getElementById('helpBtn');
    const helpModal = document.getElementById('helpModal');
    const closeHelpBtn = document.getElementById('closeHelpBtn');
    if (helpBtn && helpModal) {
      helpBtn.addEventListener('click', () => {
        helpModal.classList.remove('hidden');
        window.soundEngine.playBounce();
      });
    }
    if (closeHelpBtn && helpModal) {
      closeHelpBtn.addEventListener('click', () => {
        helpModal.classList.add('hidden');
        window.soundEngine.playBounce();
      });
    }

    // Resume button on pause modal
    const resumeBtn = document.getElementById('resumeBtn');
    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => {
        this.togglePause();
      });
    }

    this.updateScoresUI();
  }

  updateCRTDisplay() {
    if (this.crtOverlay) {
      this.crtOverlay.classList.toggle('active', this.crtEnabled);
    }
    if (this.crtToggleBtn) {
      this.crtToggleBtn.classList.toggle('active', this.crtEnabled);
      this.crtToggleBtn.querySelector('span').textContent = this.crtEnabled ? 'CRT ON' : 'CRT OFF';
    }
  }

  updateScoresUI() {
    const bScore = document.getElementById('highScoreBreakout');
    const sScore = document.getElementById('highScoreSnake');
    const iScore = document.getElementById('highScoreInvaders');

    if (bScore) bScore.textContent = (this.highScores.breakout || 0).toLocaleString();
    if (sScore) sScore.textContent = (this.highScores.snake || 0).toLocaleString();
    if (iScore) iScore.textContent = (this.highScores.invaders || 0).toLocaleString();

    // Top active badge
    const activeBadge = document.getElementById('currentTopScore');
    if (activeBadge) {
      activeBadge.textContent = (this.highScores[this.currentGameId] || 0).toLocaleString();
    }
  }

  selectGame(gameId) {
    if (this.currentGame && typeof this.currentGame.destroy === 'function') {
      this.currentGame.destroy();
    }

    this.currentGameId = gameId;

    // Update active nav button
    document.querySelectorAll('.game-nav-btn').forEach(btn => {
      const match = btn.dataset.game === gameId;
      btn.classList.toggle('active', match);
      btn.setAttribute('aria-selected', match);
    });

    // Instantiate game
    if (gameId === 'breakout') {
      this.currentGame = new BreakoutGame(this.canvas, this);
    } else if (gameId === 'snake') {
      this.currentGame = new SnakeGame(this.canvas, this);
    } else if (gameId === 'invaders') {
      this.currentGame = new InvadersGame(this.canvas, this);
    }

    this.updateScoresUI();
    window.soundEngine.playCoin();
    this.updateGameInfoUI(gameId);
  }

  updateGameInfoUI(gameId) {
    const titles = {
      breakout: 'CYBER BREAKOUT',
      snake: 'NEON SNAKE',
      invaders: 'GALACTIC DEFENDER'
    };
    const subtitles = {
      breakout: '네온 벽돌을 파괴하고 특수 무기와 멀티볼 파워업을 획득하세요!',
      snake: '벽과 꼬리를 피해 에너지 큐브를 먹고 최고의 콤보를 달성하세요!',
      invaders: '외계 침략 함선과 맞서 싸우고 거대 보스를 격추하세요!'
    };

    const titleElem = document.getElementById('currentGameTitle');
    const descElem = document.getElementById('currentGameDesc');
    if (titleElem) titleElem.textContent = titles[gameId] || '';
    if (descElem) descElem.textContent = subtitles[gameId] || '';
  }

  togglePause() {
    if (this.currentGame && this.currentGame.state === 'playing') {
      this.isPaused = !this.isPaused;
      if (this.pauseModal) {
        this.pauseModal.classList.toggle('hidden', !this.isPaused);
      }
      window.soundEngine.playBounce();
    }
  }

  initControls() {
    // Keyboard Controls
    window.addEventListener('keydown', (e) => {
      // Do not capture game inputs when user is typing in chat or settings inputs
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;

      if (e.repeat && ['Space', 'KeyP'].includes(e.code)) return;

      if (e.code === 'KeyP') {
        this.togglePause();
        return;
      }

      if (e.code === 'KeyM') {
        if (this.soundToggleBtn) this.soundToggleBtn.click();
        return;
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      if (this.isPaused) return;

      if (this.currentGame) {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
          this.currentGame.handleInput('left', true);
        } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
          this.currentGame.handleInput('right', true);
        } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
          this.currentGame.handleInput('up', true);
        } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
          this.currentGame.handleInput('down', true);
        } else if (e.code === 'Space' || e.code === 'KeyZ') {
          this.currentGame.handleInput('action', true);
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;

      if (this.currentGame) {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
          this.currentGame.handleInput('left', false);
        } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
          this.currentGame.handleInput('right', false);
        } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
          this.currentGame.handleInput('up', false);
        } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
          this.currentGame.handleInput('down', false);
        } else if (e.code === 'Space' || e.code === 'KeyZ') {
          this.currentGame.handleInput('action', false);
        }
      }
    });

    // Direct Canvas Pointer / Touch interaction
    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.isPaused && this.currentGame && typeof this.currentGame.handleInput === 'function') {
        this.currentGame.handleInput('pointermove', true, e);
      }
    });

    this.canvas.addEventListener('pointerdown', (e) => {
      window.soundEngine.init();
      if (!this.isPaused && this.currentGame && typeof this.currentGame.handleInput === 'function') {
        this.currentGame.handleInput('pointerdown', true, e);
      }
    });

    // Virtual D-pad / Buttons for Mobile
    const setupVirtualBtn = (btnId, action) => {
      const btn = document.getElementById(btnId);
      if (!btn) return;

      const handleStart = (e) => {
        e.preventDefault();
        window.soundEngine.init();
        if (this.currentGame) this.currentGame.handleInput(action, true);
        btn.classList.add('pressed');
      };

      const handleEnd = (e) => {
        e.preventDefault();
        if (this.currentGame) this.currentGame.handleInput(action, false);
        btn.classList.remove('pressed');
      };

      btn.addEventListener('touchstart', handleStart, { passive: false });
      btn.addEventListener('touchend', handleEnd, { passive: false });
      btn.addEventListener('mousedown', handleStart);
      btn.addEventListener('mouseup', handleEnd);
      btn.addEventListener('mouseleave', handleEnd);
    };

    setupVirtualBtn('vpadLeft', 'left');
    setupVirtualBtn('vpadRight', 'right');
    setupVirtualBtn('vpadUp', 'up');
    setupVirtualBtn('vpadDown', 'down');
    setupVirtualBtn('vpadAction', 'action');
  }

  loop(currentTime) {
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    if (!this.isPaused && this.currentGame) {
      this.currentGame.update(dt);
      this.currentGame.draw();
    }

    requestAnimationFrame(this.loop.bind(this));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new ArcadeApp();
});
