import { TILE_SIZE, WORLD_W, WORLD_H } from './world.js';

export class Camera {
  constructor(viewW, viewH) {
    this.viewW = viewW;
    this.viewH = viewH;
    this.x = 0; // world-pixel coords of camera top-left
    this.y = 0;
    this.deadzoneW = 80;
    this.deadzoneH = 80;
  }

  resize(w, h) {
    this.viewW = w;
    this.viewH = h;
  }

  // Snap immediately to center on target.
  snapTo(targetX, targetY) {
    this.x = targetX - this.viewW / 2;
    this.y = targetY - this.viewH / 2;
    this._clamp();
  }

  // Follow target with a small deadzone.
  follow(targetX, targetY) {
    const cx = this.x + this.viewW / 2;
    const cy = this.y + this.viewH / 2;

    const dx = targetX - cx;
    const dy = targetY - cy;

    if (Math.abs(dx) > this.deadzoneW / 2) {
      const overflow = Math.abs(dx) - this.deadzoneW / 2;
      this.x += Math.sign(dx) * overflow;
    }
    if (Math.abs(dy) > this.deadzoneH / 2) {
      const overflow = Math.abs(dy) - this.deadzoneH / 2;
      this.y += Math.sign(dy) * overflow;
    }

    this._clamp();
  }

  _clamp() {
    const worldPxW = WORLD_W * TILE_SIZE;
    const worldPxH = WORLD_H * TILE_SIZE;
    this.x = Math.max(0, Math.min(worldPxW - this.viewW, this.x));
    this.y = Math.max(0, Math.min(worldPxH - this.viewH, this.y));
  }

  worldToScreen(wx, wy) {
    return { x: wx - this.x, y: wy - this.y };
  }

  visibleTileBounds() {
    const x0 = Math.max(0, Math.floor(this.x / TILE_SIZE));
    const y0 = Math.max(0, Math.floor(this.y / TILE_SIZE));
    const x1 = Math.min(WORLD_W - 1, Math.ceil((this.x + this.viewW) / TILE_SIZE));
    const y1 = Math.min(WORLD_H - 1, Math.ceil((this.y + this.viewH) / TILE_SIZE));
    return { x0, y0, x1, y1 };
  }
}
