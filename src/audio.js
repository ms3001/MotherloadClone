export class AudioManager {
  constructor() {
    this._ctx = null;
    this._sounds = {
      repair: (ctx, t) => {
        // Metallic weld buzz: short sawtooth burst with quick decay
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.linearRampToValueAtTime(140, t + 0.07);
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(t); osc.stop(t + 0.09);
      },
      refuel: (ctx, t) => {
        // Low pump thump: sine sweep 110→60 Hz, fast decay
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(110, t);
        osc.frequency.exponentialRampToValueAtTime(60, t + 0.08);
        gain.gain.setValueAtTime(0.0, t);
        gain.gain.linearRampToValueAtTime(0.25, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(t); osc.stop(t + 0.12);
      },
      chaChing: (ctx, t) => {
        const o1 = ctx.createOscillator();
        const g1 = ctx.createGain();
        o1.type = 'triangle';
        o1.frequency.value = 1760;
        g1.gain.setValueAtTime(0.3, t);
        g1.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        o1.connect(g1); g1.connect(ctx.destination);
        o1.start(t); o1.stop(t + 0.18);

        const o2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        o2.type = 'triangle';
        o2.frequency.value = 2217;
        g2.gain.setValueAtTime(0.001, t + 0.09);
        g2.gain.linearRampToValueAtTime(0.4, t + 0.11);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
        o2.connect(g2); g2.connect(ctx.destination);
        o2.start(t + 0.09); o2.stop(t + 0.42);
      },
    };
  }

  play(name) {
    if (!this._ctx) this._ctx = new AudioContext();
    const fn = this._sounds[name];
    if (fn) fn(this._ctx, this._ctx.currentTime);
  }
}
