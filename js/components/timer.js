import { clamp } from "../utils/helpers.js";

/**
 * Dual-mode timer: continuous countdown + Pomodoro cycles.
 */
export class FocusTimer {
  constructor({ onTick, onComplete, onPhaseChange } = {}) {
    this.onTick = onTick || (() => {});
    this.onComplete = onComplete || (() => {});
    this.onPhaseChange = onPhaseChange || (() => {});
    this.mode = "normal"; // normal | pomodoro
    this.phase = "work"; // work | break | longBreak
    this.remainingSec = 25 * 60;
    this.totalSec = 25 * 60;
    this.running = false;
    this.pomodoroCount = 0;
    this.settings = {
      pomodoroWork: 25,
      pomodoroBreak: 5,
      pomodoroLongBreak: 15,
    };
    this._raf = null;
    this._last = 0;
    this._acc = 0;
  }

  configure(settings = {}) {
    this.settings = { ...this.settings, ...settings };
  }

  setMode(mode) {
    this.pause();
    this.mode = mode;
    if (mode === "pomodoro") {
      this.phase = "work";
      this.setMinutes(this.settings.pomodoroWork);
    }
    this.onPhaseChange(this.phase, this.mode);
  }

  setMinutes(min) {
    const sec = Math.max(1, Math.round(min * 60));
    this.totalSec = sec;
    this.remainingSec = sec;
    this.onTick(this.snapshot());
  }

  loadBlock(durationMin) {
    this.setMode("normal");
    this.setMinutes(durationMin);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._last = performance.now();
    this._acc = 0;
    this._loop();
  }

  pause() {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
    this.onTick(this.snapshot());
  }

  reset() {
    this.pause();
    this.remainingSec = this.totalSec;
    this.onTick(this.snapshot());
  }

  toggle() {
    if (this.running) this.pause();
    else this.start();
  }

  _loop = (now) => {
    if (!this.running) return;
    const t = now || performance.now();
    const dt = t - this._last;
    this._last = t;
    this._acc += dt;
    while (this._acc >= 1000) {
      this._acc -= 1000;
      this.remainingSec = clamp(this.remainingSec - 1, 0, this.totalSec);
      this.onTick(this.snapshot());
      if (this.remainingSec <= 0) {
        this._handleComplete();
        return;
      }
    }
    this._raf = requestAnimationFrame(this._loop);
  };

  _handleComplete() {
    this.pause();
    this.onComplete(this.snapshot());
    if (this.mode === "pomodoro") {
      this._advancePomodoro();
    }
  }

  _advancePomodoro() {
    if (this.phase === "work") {
      this.pomodoroCount += 1;
      if (this.pomodoroCount % 4 === 0) {
        this.phase = "longBreak";
        this.setMinutes(this.settings.pomodoroLongBreak);
      } else {
        this.phase = "break";
        this.setMinutes(this.settings.pomodoroBreak);
      }
    } else {
      this.phase = "work";
      this.setMinutes(this.settings.pomodoroWork);
    }
    this.onPhaseChange(this.phase, this.mode);
  }

  snapshot() {
    return {
      mode: this.mode,
      phase: this.phase,
      remainingSec: this.remainingSec,
      totalSec: this.totalSec,
      running: this.running,
      pomodoroCount: this.pomodoroCount,
      label: formatTimer(this.remainingSec),
      progress: this.totalSec ? 1 - this.remainingSec / this.totalSec : 0,
    };
  }
}

export function formatTimer(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
