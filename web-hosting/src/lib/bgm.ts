/**
 * GDG Go - Subway Surfers Style High-Energy Funk & Groove Soundtrack Engine
 * Features:
 * - Bouncy slap funk bassline with syncopated 16th groove
 * - Catchy playful whistle hooks & bright marimba chimes
 * - Punchy brass chord stabs & swinging vinyl drum kit
 * - Dynamic Seasonal adaptation (Sunny City, Sunset Cruise, Cyberpunk Night, Storm Rush)
 * Built with zero-latency Web Audio API synthesis.
 */

export type SeasonTheme = 'SunnyDay' | 'GoldenSunset' | 'CyberpunkNight' | 'RainyStorm';

class SubwaySurfersMusicEngine {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private isMuted = false;
  private masterGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private timerId: number | null = null;
  private step = 0;
  private loopCount = 0;
  private secondsPerBeat = 60 / 128; // 128 BPM
  public currentSeason: SeasonTheme = 'SunnyDay';

  constructor() {
    const saved = localStorage.getItem('gdg_go_bgm_muted');
    if (saved === 'true') this.isMuted = true;

    // Unlock Web Audio API automatically on first mobile touch or click
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
      };
      window.addEventListener('touchstart', unlockAudio, { passive: true, once: false });
      window.addEventListener('touchend', unlockAudio, { passive: true, once: false });
      window.addEventListener('click', unlockAudio, { passive: true, once: false });
    }
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(12000, this.ctx.currentTime);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.24, this.ctx.currentTime);

      this.filterNode.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public start() {
    this.initContext();
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.step = 0;
    this.loopCount = 0;

    const tickIntervalMs = (this.secondsPerBeat / 4) * 1000; // 16th note tick
    this.timerId = window.setInterval(() => {
      this.tick();
    }, tickIntervalMs);
  }

  public stop() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    localStorage.setItem('gdg_go_bgm_muted', String(this.isMuted));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.24, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setFilterCutoff(freq: number) {
    if (this.filterNode && this.ctx) {
      this.filterNode.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.08);
    }
  }

  private tick() {
    if (!this.ctx || !this.masterGain || this.isMuted) {
      this.step = (this.step + 1) % 64;
      if (this.step === 0) this.loopCount++;
      return;
    }

    const t = this.ctx.currentTime;
    const current16th = this.step;
    const beat = Math.floor(current16th / 4);
    const sub = current16th % 4;

    // Season cycle
    const seasons: SeasonTheme[] = ['SunnyDay', 'GoldenSunset', 'CyberpunkNight', 'RainyStorm'];
    const seasonIndex = Math.floor(this.loopCount / 2) % 4;
    this.currentSeason = seasons[seasonIndex];

    // 1. Kick Drum (Subway Surfers bouncing four-on-the-floor with punch)
    if (sub === 0) {
      this.playKick(t);
    }

    // 2. Snappy Clap / Snare with bouncy reverb tail on beats 2 and 4
    if (sub === 0 && (beat % 4 === 1 || beat % 4 === 3)) {
      this.playSnare(t);
    }

    // 3. Shuffling 16th Hi-Hats with accent on off-beats
    if (sub === 2) {
      this.playHat(t, true);
    } else {
      this.playHat(t, false);
    }

    // 4. Bouncy Funk Slap Bass (Subway Surfers signature groove)
    this.playSlapBass(t, current16th);

    // 5. Catchy Whistle & Marimba Melody
    this.playWhistleMelody(t, current16th);

    // 6. Punchy Brass Fanfare on Bar Starts
    if (current16th % 16 === 0 || current16th % 16 === 10) {
      this.playBrassStab(t, current16th);
    }

    this.step = (this.step + 1) % 64;
    if (this.step === 0) {
      this.loopCount++;
    }
  }

  private playKick(t: number) {
    if (!this.ctx || !this.filterNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.setValueAtTime(145, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.11);

    gain.gain.setValueAtTime(0.75, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(gain);
    gain.connect(this.filterNode);

    osc.start(t);
    osc.stop(t + 0.16);
  }

  private playSnare(t: number) {
    if (!this.ctx || !this.filterNode) return;

    // Body
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(210, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.09);
    oscGain.gain.setValueAtTime(0.38, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(oscGain);
    oscGain.connect(this.filterNode);
    osc.start(t);
    osc.stop(t + 0.09);

    // Clap Noise
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.11);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1400;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.42, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.filterNode);
    noise.start(t);
    noise.stop(t + 0.11);
  }

  private playHat(t: number, open: boolean) {
    if (!this.ctx || !this.filterNode) return;
    const dur = open ? 0.075 : 0.03;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7200;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(open ? 0.26 : 0.11, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.filterNode);
    noise.start(t);
    noise.stop(t + dur);
  }

  private playSlapBass(t: number, step: number) {
    if (!this.ctx || !this.filterNode) return;

    const bar = Math.floor(step / 16);
    const sub = step % 16;

    // Subway Surfers signature funk syncopation: hits on 0, 3, 6, 8, 11, 14
    const funkPattern = [true, false, false, true, false, false, true, false, true, false, false, true, false, false, true, false];
    if (!funkPattern[sub]) return;

    // Bass notes: Am (A1/A2) -> F (F1/F2) -> C (C2/G2) -> G (G1/D2)
    const roots = [55.0, 43.65, 65.41, 49.0]; // A1, F1, C2, G1
    const baseFreq = roots[bar];
    const octave = sub === 6 || sub === 14 ? 2 : 1;
    const freq = baseFreq * octave;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);

    // Punchy slap envelope
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1600, t);
    filter.frequency.exponentialRampToValueAtTime(280, t + 0.12);

    gain.gain.setValueAtTime(0.38, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.filterNode);

    osc.start(t);
    osc.stop(t + 0.13);
  }

  private playWhistleMelody(t: number, step: number) {
    if (!this.ctx || !this.filterNode) return;

    // Playful whistle melody pattern
    const melodyNotes: { [key: number]: number } = {
      0: 880,   // A5
      2: 987.77, // B5
      4: 1046.5, // C6
      8: 1318.5, // E6
      10: 1046.5, // C6
      12: 1174.66, // D6
      16: 698.46, // F5
      18: 880,   // A5
      20: 1046.5, // C6
      24: 1396.91, // F6
      26: 1318.5,  // E6
      32: 1046.5, // C6
      34: 1318.5, // E6
      36: 1567.98, // G6
      40: 2093.0, // C7
      42: 1567.98, // G6
      48: 783.99, // G5
      50: 987.77, // B5
      52: 1174.66, // D6
      56: 1567.98, // G6
      58: 1760.0, // A6
      60: 1567.98, // G6
    };

    if (melodyNotes[step] !== undefined) {
      const freq = melodyNotes[step];

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      // Whistle vibrato & slight slide
      osc.frequency.setValueAtTime(freq * 0.96, t);
      osc.frequency.exponentialRampToValueAtTime(freq, t + 0.04);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.filterNode);

      osc.start(t);
      osc.stop(t + 0.18);
    }
  }

  private playBrassStab(t: number, step: number) {
    if (!this.ctx || !this.filterNode) return;

    const bar = Math.floor(step / 16);
    const chords = [
      [440, 523.25, 659.25], // Am
      [349.23, 440, 523.25], // F
      [523.25, 659.25, 783.99], // C
      [392, 493.88, 587.33], // G
    ];

    const chord = chords[bar];
    chord.forEach((freq) => {
      if (!this.ctx || !this.filterNode) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      osc.connect(gain);
      gain.connect(this.filterNode);

      osc.start(t);
      osc.stop(t + 0.16);
    });
  }
}

export const bgmEngine = new SubwaySurfersMusicEngine();
