import { World, TILE_SIZE, SURFACE_ROW, WORLD_W } from './world.js';
import { Digger } from './digger.js';
import { Camera } from './camera.js';
import { Input } from './input.js';
import { HUD } from './hud.js';
import { buildSprites, tileSprite } from './sprites.js';
import { TILE, isOre } from './ores.js';
import { hashStringToSeed, mulberry32 } from './rng.js';
import { gasPriceFor, GAS_PRICE_PER_UNIT, UPGRADES } from './upgrades.js';
import { Inventory } from './inventory.js';

// How fast the pump dispenses fuel (units per second) while holding F.
const REFUEL_RATE = 40;
// Padding (px) added around the pump rectangle for the player-overlap trigger.
const PUMP_TRIGGER_PADDING = 12;

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
    this.inventory = new Inventory();

    // Gas stations sit on top of the surface dirt. tx/ty is the upper-left tile
    // of the 2x2 sprite; the pump base lands exactly at row SURFACE_ROW.
    const spawnTx = (WORLD_W / 2) | 0;
    this.gasStations = [
      { tx: spawnTx + 6, ty: SURFACE_ROW - 2, w: 2, h: 2 },
    ];
    this.refuelingStation = null;
    this.fuelBought = 0;
    this.fuelBoughtTimer = 0;

    // Concrete tiles beneath each gas station + 1-tile overhang on each side
    for (const gs of this.gasStations) {
      for (let dx = -1; dx < gs.w + 1; dx++) {
        this.world.set(gs.tx + dx, gs.ty + gs.h, TILE.CONCRETE);
      }
    }

    // Spawn marker: one concrete block at the surface under spawn
    this.world.set(spawnTx, SURFACE_ROW, TILE.CONCRETE);
    this.spawnFlagX = spawnTx * TILE_SIZE;
    this.spawnFlagY = SURFACE_ROW * TILE_SIZE;

    this.clouds = this._buildClouds(seed);

    this.nearFlag = false;

    // Auto-load saved game if one exists.
    const raw = localStorage.getItem('motherload_save');
    if (raw) {
      try { this._load(JSON.parse(raw)); }
      catch { localStorage.removeItem('motherload_save'); }
    }

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

    this._updateRefuel(dt);

    const flagCx = this.spawnFlagX + TILE_SIZE / 2;
    const flagCy = this.spawnFlagY - this.sprites.spawnFlag.height;
    this.nearFlag = Math.hypot(this.digger.x - flagCx, this.digger.y - flagCy) < TILE_SIZE;
    if (this.nearFlag && !this.refuelingStation && this.input.pressed('f')) {
      this._save();
    }

    this.camera.follow(this.digger.x, this.digger.y);
    this.hud.update(this.digger, this.world, dt);

    if (this.input.pressed('tab')) this.inventory.toggle();
    this.inventory.update(this.digger);

    this.input.endFrame();
  }

  _buildClouds(seed) {
    const clouds = [];
    const worldPxW = WORLD_W * TILE_SIZE;
    const rng = mulberry32(seed ^ 0xc0ffee);

    for (let i = 0; i < 28; i++) {
      const cx = rng() * worldPxW;
      const cy = (1 + rng() * (SURFACE_ROW * 0.6)) * TILE_SIZE;
      const rx = 90 + rng() * 130;
      const ry = 28 + rng() * 36;
      const puffs = [
        { dx: 0, dy: 0, sx: 1, sy: 1 },
        { dx: -(0.25 + rng() * 0.15), dy: -(0.4 + rng() * 0.25), sx: 0.45 + rng() * 0.1, sy: 0.7 + rng() * 0.2 },
        { dx:  (0.28 + rng() * 0.15), dy: -(0.35 + rng() * 0.2),  sx: 0.42 + rng() * 0.1, sy: 0.65 + rng() * 0.2 },
      ];
      clouds.push({ cx, cy, rx, ry, puffs });
    }
    return clouds;
  }

  _stationRect(gs) {
    return {
      x: gs.tx * TILE_SIZE,
      y: gs.ty * TILE_SIZE,
      w: gs.w * TILE_SIZE,
      h: gs.h * TILE_SIZE,
    };
  }

  _updateRefuel(dt) {
    this.refuelingStation = null;
    if (this.digger.dead) return;
    if (!this.input.down('f')) {
      if (this.fuelBoughtTimer > 0) {
        this.fuelBoughtTimer -= dt;
        if (this.fuelBoughtTimer <= 0) this.fuelBought = 0;
      }
    }

    const b = this.digger.bbox;
    for (const gs of this.gasStations) {
      const r = this._stationRect(gs);
      const tx = r.x - PUMP_TRIGGER_PADDING;
      const ty = r.y - PUMP_TRIGGER_PADDING;
      const tw = r.w + PUMP_TRIGGER_PADDING * 2;
      const th = r.h + PUMP_TRIGGER_PADDING * 2;
      const overlaps = b.x < tx + tw && b.x + b.w > tx && b.y < ty + th && b.y + b.h > ty;
      if (!overlaps) continue;

      this.refuelingStation = gs;
      if (this.input.down('f') && this.digger.money > 0) {
        const maxWant = REFUEL_RATE * dt;
        const affordable = GAS_PRICE_PER_UNIT > 0 ? this.digger.money / GAS_PRICE_PER_UNIT : maxWant;
        const want = Math.min(maxWant, affordable);
        const added = this.digger.addFuel(want);
        const actualCost = gasPriceFor(added, { digger: this.digger, world: this.world, station: gs });
        this.digger.money = Math.max(0, this.digger.money - actualCost);
        this.fuelBought += added;
        this.fuelBoughtTimer = 3;
      }
      break;
    }

    if (this.refuelingStation === null) {
      this.fuelBought = 0;
      this.fuelBoughtTimer = 0;
    }
  }

  _save() {
    const orig = new World(this.world.seed);
    const cur = this.world.tiles;
    const ref = orig.tiles;
    const diff = [];
    for (let i = 0; i < cur.length; i++) {
      if (cur[i] !== ref[i]) diff.push([i, cur[i]]);
    }

    const slots = ['drill', 'fuelTank', 'hull', 'thermal', 'storage', 'engine', 'radar', 'wallet'];
    const attachments = {};
    for (const slot of slots) attachments[slot] = UPGRADES[slot].indexOf(this.digger.attachments[slot]);

    const save = {
      v: 1,
      seed: this.world.seed,
      player: {
        x: this.digger.x, y: this.digger.y,
        money: this.digger.money,
        fuel: this.digger.fuel,
        hull: this.digger.hull,
        cargo: Object.fromEntries(this.digger.cargo),
        cargoUsed: this.digger.cargoUsed,
        attachments,
      },
      diff,
    };
    localStorage.setItem('motherload_save', JSON.stringify(save));
    this.hud.showBanner('GAME SAVED', 'Progress stored', 3);
  }

  _load(save) {
    this.world = new World(save.seed);
    // Re-apply surface fixtures (not part of seeded generation).
    const spawnTx = (WORLD_W / 2) | 0;
    for (const gs of this.gasStations) {
      for (let dx = -1; dx < gs.w + 1; dx++) {
        this.world.set(gs.tx + dx, gs.ty + gs.h, TILE.CONCRETE);
      }
    }
    this.world.set(spawnTx, SURFACE_ROW, TILE.CONCRETE);
    // Apply player-made changes.
    for (const [i, v] of save.diff) this.world.tiles[i] = v;

    this.digger.world = this.world;
    const d = this.digger;
    const p = save.player;
    d.x = p.x; d.y = p.y; d.vx = 0; d.vy = 0;
    d.money = p.money; d.fuel = p.fuel; d.hull = p.hull;
    d.cargo = new Map(Object.entries(p.cargo));
    d.cargoUsed = p.cargoUsed;

    const slots = ['drill', 'fuelTank', 'hull', 'thermal', 'storage', 'engine', 'radar', 'wallet'];
    for (const slot of slots) d.attachments[slot] = UPGRADES[slot][p.attachments[slot]];
    d._applyAttachmentStats();

    if (this.camera) this.camera.snapTo(d.x, d.y);
    if (this.hud) this.hud.showBanner('WELCOME BACK', 'Game loaded', 3);
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

    // Clouds (drawn in world space, top of sky)
    const camX = Math.round(cam.x);
    const camY = Math.round(cam.y);
    for (const cloud of this.clouds) {
      const sx = cloud.cx - camX;
      const sy = cloud.cy - camY;
      if (sx + cloud.rx * 1.5 < 0 || sx - cloud.rx * 1.5 > cam.viewW) continue;
      if (sy + cloud.ry * 1.5 < 0 || sy - cloud.ry * 1.5 > cam.viewH) continue;
      ctx.save();
      ctx.globalAlpha = 0.82;
      ctx.fillStyle = '#f0f8ff';
      ctx.beginPath();
      for (const p of cloud.puffs) {
        ctx.ellipse(sx + p.dx * cloud.rx, sy + p.dy * cloud.ry, cloud.rx * p.sx, cloud.ry * p.sy, 0, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.restore();
    }

    // Tiles
    const { x0, y0, x1, y1 } = cam.visibleTileBounds();
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const tile = w.get(tx, ty);
        if (tile === TILE.SKY) continue;
        const sprite = tileSprite(this.sprites, tile);
        const sx = tx * TILE_SIZE - camX;
        const sy = ty * TILE_SIZE - camY;
        ctx.drawImage(sprite, sx, sy);

        // Grass on surface dirt
        if (ty === SURFACE_ROW && tile === TILE.DIRT) {
          ctx.fillStyle = '#3a8c30';
          ctx.fillRect(sx, sy, TILE_SIZE, 4);
          ctx.fillStyle = '#56b845';
          ctx.fillRect(sx, sy, TILE_SIZE, 2);
        }

        // drill progress overlay
        const prog = w.getProgress(tx, ty);
        if (prog > 0) {
          ctx.fillStyle = `rgba(0, 0, 0, ${0.25 + prog * 0.4})`;
          ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    // Gas stations (drawn after tiles, before digger)
    for (const gs of this.gasStations) {
      const r = this._stationRect(gs);
      const sx = r.x - camX;
      const sy = r.y - camY;
      // Cull off-screen stations
      if (sx + r.w < 0 || sy + r.h < 0 || sx > cam.viewW || sy > cam.viewH) continue;

      ctx.drawImage(this.sprites.gasPump, sx, sy);

      if (this.refuelingStation === gs) {
        const cx = sx + r.w / 2;
        const refueling = this.input.down('f');
        const label = refueling ? 'REFUELING  $1/L' : '[F] REFUEL  $1/L';
        ctx.font = 'bold 12px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        let cy = sy - 6;
        if (this.fuelBought > 0) {
          const sub = `+${Math.floor(this.fuelBought)} L pumped`;
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillText(sub, cx + 1, cy + 1);
          ctx.fillStyle = '#a8e6a0';
          ctx.fillText(sub, cx, cy);
          cy -= 16;
        }
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillText(label, cx + 1, cy + 1);
        ctx.fillStyle = '#ffd166';
        ctx.fillText(label, cx, cy);
      }
    }

    // Spawn flag (drawn above the concrete spawn block)
    const flagSprite = this.sprites.spawnFlag;
    const flagSx = this.spawnFlagX - camX;
    const flagSy = this.spawnFlagY - flagSprite.height - camY;
    if (flagSx + flagSprite.width >= 0 && flagSx <= cam.viewW) {
      ctx.drawImage(flagSprite, flagSx, flagSy);
      if (this.nearFlag) {
        const label = '[F] SAVE';
        const cx = flagSx + flagSprite.width / 2;
        ctx.font = 'bold 12px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillText(label, cx + 1, flagSy + 1);
        ctx.fillStyle = '#ffd166';
        ctx.fillText(label, cx, flagSy);
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
    const dx = Math.round(d.x + d.drillNudgeX - TILE_SIZE / 2 - camX);
    const dy = Math.round(d.y + d.drillNudgeY - TILE_SIZE / 2 + 2 - camY);
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
