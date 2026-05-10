export class Input {
  constructor() {
    this.keys = new Set();
    this.justPressed = new Set();
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'f', 'r', ' '].includes(k)) e.preventDefault();
      if (!this.keys.has(k)) this.justPressed.add(k);
      this.keys.add(k);
    });
    window.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      this.keys.delete(k);
    });
    window.addEventListener('blur', () => this.keys.clear());
  }

  down(k) { return this.keys.has(k); }
  pressed(k) { return this.justPressed.has(k); }

  endFrame() { this.justPressed.clear(); }
}
