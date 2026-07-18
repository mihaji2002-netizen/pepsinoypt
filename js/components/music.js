/**
 * Ambient calm audio via Web Audio API — works offline, no asset files.
 */

const TRACKS = {
  rain: { label: "باران آرام", base: 110, type: "noise" },
  drone: { label: "درون ملایم", base: 98, type: "drone" },
  waves: { label: "موج ساحل", base: 80, type: "waves" },
};

export class AmbientPlayer {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.nodes = [];
    this.playing = false;
    this.track = "rain";
    this.volume = 0.35;
  }

  async ensureCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
  }

  setTrack(id) {
    const was = this.playing;
    this.stop();
    this.track = TRACKS[id] ? id : "rain";
    if (was) this.play();
  }

  async play() {
    await this.ensureCtx();
    this.stopNodes();
    const def = TRACKS[this.track] || TRACKS.rain;
    if (def.type === "noise") this.#startNoise();
    else if (def.type === "waves") this.#startWaves();
    else this.#startDrone(def.base);
    this.playing = true;
  }

  stop() {
    this.stopNodes();
    this.playing = false;
  }

  toggle() {
    if (this.playing) {
      this.stop();
      return false;
    }
    this.play();
    return true;
  }

  stopNodes() {
    for (const n of this.nodes) {
      try {
        n.stop?.();
        n.disconnect?.();
      } catch {
        /* ignore */
      }
    }
    this.nodes = [];
  }

  #startNoise() {
    const bufferSize = 2 * this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.22;

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start();
    this.nodes.push(src, filter, gain);
  }

  #startDrone(base) {
    const freqs = [base, base * 1.5, base * 2.01];
    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = i === 0 ? "sine" : "triangle";
      osc.frequency.value = f;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.04 / (i + 1);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start();
      this.nodes.push(osc, gain);
    });
  }

  #startWaves() {
    this.#startNoise();
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.12;
    lfo.connect(lfoGain);
    lfoGain.connect(this.master.gain);
    lfo.start();
    this.nodes.push(lfo, lfoGain);
  }

  static trackList() {
    return Object.entries(TRACKS).map(([id, t]) => ({ id, label: t.label }));
  }
}
