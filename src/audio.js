export class AudioManager {
  constructor() {
    this._ctx = null;
    this._sounds = {
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
