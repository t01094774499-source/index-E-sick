// Web Audio API Retro Sound Effects & Chiptune BGM Synthesizer
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.volume = 0.25;
    this.isMuted = false;
    this.isBgmPlaying = false;
    this.bgmTimer = null;
    this.bgmStep = 0;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  // Helper to play tone
  playTone(freq, type = 'square', duration = 0.1, gainVal = 0.3, freqEnd = null) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      if (freqEnd !== null) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(10, freqEnd), this.ctx.currentTime + duration);
      }

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  playLaser() {
    if (this.isMuted) return;
    this.init();
    this.playTone(880, 'sawtooth', 0.12, 0.25, 110);
  }

  playBounce() {
    if (this.isMuted) return;
    this.init();
    this.playTone(280, 'sine', 0.08, 0.3, 440);
  }

  playHit() {
    if (this.isMuted) return;
    this.init();
    this.playTone(220, 'square', 0.09, 0.35, 80);
  }

  playExplosion() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const bufferSize = this.ctx.sampleRate * 0.25;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.25);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noise.start();
      noise.stop(this.ctx.currentTime + 0.25);
    } catch (e) {}
  }

  playCoin() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.playTone(987.77, 'square', 0.08, 0.25); // B5
    setTimeout(() => {
      this.playTone(1318.51, 'square', 0.2, 0.3); // E6
    }, 80);
  }

  playPowerup() {
    if (this.isMuted) return;
    this.init();
    const notes = [330, 440, 550, 660, 880];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'triangle', 0.09, 0.3);
      }, idx * 60);
    });
  }

  playGameOver() {
    if (this.isMuted) return;
    this.init();
    const notes = [440, 415, 392, 370, 311];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'sawtooth', 0.2, 0.3, freq * 0.85);
      }, idx * 140);
    });
  }

  playVictory() {
    if (this.isMuted) return;
    this.init();
    const melody = [523.25, 659.25, 783.99, 1046.50];
    melody.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'triangle', 0.18, 0.3);
      }, idx * 100);
    });
  }

  toggleBgm() {
    this.init();
    this.isBgmPlaying = !this.isBgmPlaying;
    if (this.isBgmPlaying) {
      this.startBgmLoop();
    } else {
      this.stopBgmLoop();
    }
    return this.isBgmPlaying;
  }

  startBgmLoop() {
    this.stopBgmLoop();
    const notes = [
      130.81, 164.81, 196.00, 164.81, 
      146.83, 174.61, 220.00, 174.61,
      110.00, 130.81, 164.81, 130.81,
      123.47, 146.83, 196.00, 146.83
    ];
    const tempoMs = 150;

    const tick = () => {
      if (!this.isBgmPlaying || this.isMuted) {
        if (this.isBgmPlaying) {
          this.bgmTimer = setTimeout(tick, tempoMs);
        }
        return;
      }
      const freq = notes[this.bgmStep % notes.length];
      this.playTone(freq, 'triangle', 0.12, 0.08);

      if (this.bgmStep % 4 === 0) {
        this.playTone(freq * 2, 'square', 0.06, 0.04);
      }

      this.bgmStep = (this.bgmStep + 1) % notes.length;
      this.bgmTimer = setTimeout(tick, tempoMs);
    };

    tick();
  }

  stopBgmLoop() {
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

window.soundEngine = new SoundEngine();
