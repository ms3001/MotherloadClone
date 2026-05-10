import { World, TILE_SIZE, SURFACE_ROW } from './world.js';
import { Digger } from './digger.js';
import { Camera } from './camera.js';
import { Input } from './input.js';
import { HUD } from './hud.js';
import { buildSprites, tileSprite } from './sprites.js';
import { TILE, isOre } from './ores.js';
import { hashStringToSeed } from './rng.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    this._resize();
    window.addEventListener('resize', () => this._resize());

    const seed = hashStringToSeed('motherload-' + Date.now());
    this.world = new World(seed);
    this.sprites = buildSprites();
    this.input = new Input();
    this.digger = new Digger(this.world, this.world.spawnPoint());
    this.camera = new Camera(canvas.width, canvas.height);
    this.camera.snapTo(this.digger.x, this.digger.y);
    this.hud = new HUD();

    this.deathTimer = 0;
    this.deathDuration = 1.6;

    this.lastTime = performance.now();
    this.accum = 0;
    this.fixedDt = 1 / 60;
  }

  _resize() {
    const dpr = 1; // keep 1:1 to preserve pixel-art crispness
    this.canvas.width = Math.floor(window.innerWidth * dpr);
    this.canvas.height = Math.floor(window.innerHeight * dpr);
    if (this.camera) this.camera.resize(this.canvas.width, this.canvas.height);
  }

  start() {
    const loop = (t) => {
      const now = t;
      let dt = (now - this.lastTime) / 1000;
      if (dt > 0.25) dt = 0.25; // clamp big stalls
      this.lastTime = now;
      this.accum += dt;

      while (this.accum >= this.fixedDt) {
        this._update(this.fixedDt);
        this.accum -= this.fixedDt;
      }
      this._render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame((t) => { this.lastTime = t; loop(t); });
  }

  _update(dt) {
    if (this.deathTimer > 0) {
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) {
        this.digger.respawn(null);
        this.camera.snapTo(this.digger.x, this.digger.y);
        this.hud.hideBanner();
      }
      this.input.endFrame();
      return;
    }

    this.digger.update(dt, this.input);

    if (this.digger.dead && this.deathTimer <= 0) {
      this.deathTimer = this.deathDuration;
      this.hud.showBanner(this.digger.deathReason ?? 'Wrecked', 'Respawning at surface...');
    }

    this.camera.follow(this.digger.x, this.digger.y);
    this.hud.update(this.digger, this.world);

    this.input.endFrame();
  }

  _render() {
    const ctx = this.ctx;
    const cam = this.camera;
    const w = this.world;

    // Sky background gradient (depth-based)
    const surfaceY = SURFACE_ROW * TILE_SIZE;
    const camCenterY = cam.y + cam.viewH / 2;
    const depthFrac = Math.min(1, Math.max(0, (camCenterY - surfaceY) / (4000 * TILE_SIZE / 32 * 32)));
    const top = blend('#6ec5ff', '#0b0d12', Math.min(0.95, depthFrac * 1.2));
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, cam.viewW, cam.viewH);

    // Tiles
    const { x0, y0, x1, y1 } = cam.visibleTileBounds();
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const tile = w.get(tx, ty);
        if (tile === TILE.SKY) continue;
        const sprite = tileSprite(this.sprites, tile);
        const sx = tx * TILE_SIZE - cam.x;
        const sy = ty * TILE_SIZE - cam.y;
        ctx.drawImage(sprite, sx, sy);

        // drill progress overlay
        const prog = w.getProgress(tx, ty);
        if (prog > 0) {
          ctx.fillStyle = `rgba(0, 0, 0, ${0.25 + prog * 0.4})`;
          ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
          // crack lines
          ctx.strokeStyle = 'rgba(255,255,255,0.5)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(sx + 4, sy + 4);
          ctx.lineTo(sx + TILE_SIZE - 6, sy + TILE_SIZE - 8);
          ctx.moveTo(sx + TILE_SIZE - 6, sy + 5);
          ctx.lineTo(sx + 8, sy + TILE_SIZE - 4);
          ctx.stroke();
        }
      }
    }

    // Digger
    const d = this.digger;
    const facing = d.facing < 0 ? 'left' : 'right';
    let stateKey = 'idle';
    if (d.thrusting && d.drilling) stateKey = 'thrustDrill';
    else if (d.thrusting) stateKey = 'thrust';
    else if (d.drilling) stateKey = 'drill';

    const frames = this.sprites.digger[facing][stateKey];
    const frameIdx = Math.floor(d.animTime * 12) % frames.length;
    const sprite = frames[frameIdx];
    const dx = Math.round(d.x - TILE_SIZE / 2 - cam.x);
    const dy = Math.round(d.y - TILE_SIZE / 2 - cam.y);
    ctx.drawImage(sprite, dx, dy);
  }
}

function blend(hexA, hexB, t) {
  const pa = parseHex(hexA);
  const pb = parseHex(hexB);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const b = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r},${g},${b})`;
}
function parseHex(h) {
  const m = h.replace('#', '');
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
}
