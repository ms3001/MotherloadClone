import { TILE_SIZE } from './world.js';
import { TILE, isSolid, isDrillable, isOre, ORE_BY_ID, tileHardness, tileDrillTier } from './ores.js';

const GRAVITY = 900;          // px/s^2
const THRUST = 1500;          // px/s^2 upward when W held
const MAX_FALL = 900;         // terminal velocity
const MAX_RISE = 520;
const LATERAL_ACCEL = 1500;
const LATERAL_AIR_ACCEL = 1100;
const LATERAL_MAX = 240;
const GROUND_FRICTION = 1800; // px/s^2 deceleration when no input
const AIR_DRAG = 200;

const FUEL_THRUST_RATE = 8;    // units/sec while thrusting
const FUEL_DRILL_RATE = 1.5;   // units/sec while drilling
const FUEL_IDLE_RATE = 0.05;   // units/sec ambient
const FALL_DAMAGE_THRESHOLD = 650;
const FALL_DAMAGE_PER_PXS = 0.12;

const HITBOX_W = 28;
const HITBOX_H = 28;

const DRILL_BASE_RATE = 1.0; // units/sec; tile takes hardness seconds at base
const STARTER_DRILL_TIER = 1;
const STARTER_DRILL_POWER = 1.0;

export class Digger {
  constructor(world, spawn) {
    this.world = world;
    this.spawn = spawn;

    // Position is the CENTER of the digger.
    this.x = spawn.x;
    this.y = spawn.y;
    this.vx = 0;
    this.vy = 0;

    this.facing = 1; // 1 = right, -1 = left
    this.onGround = false;

    // Stats / attachments (MVP starter values; future shop will tune these).
    this.maxFuel = 200;
    this.fuel = this.maxFuel;
    this.maxHull = 100;
    this.hull = this.maxHull;
    this.maxCargo = 25;
    this.drillTier = STARTER_DRILL_TIER;
    this.drillPower = STARTER_DRILL_POWER;

    // cargo: Map<oreKey, count>
    this.cargo = new Map();
    this.cargoUsed = 0;

    // Drilling state
    this.drillTarget = null; // { tx, ty, dir }
    this.drillProgress = 0;
    this.drilling = false;   // true this frame
    this.thrusting = false;  // true this frame

    // Animation
    this.animTime = 0;

    this.dead = false;
    this.deathReason = null;
  }

  get bbox() {
    return {
      x: this.x - HITBOX_W / 2,
      y: this.y - HITBOX_H / 2,
      w: HITBOX_W,
      h: HITBOX_H,
    };
  }

  respawn(reason) {
    this.x = this.spawn.x;
    this.y = this.spawn.y;
    this.vx = 0;
    this.vy = 0;
    this.fuel = this.maxFuel;
    this.hull = this.maxHull;
    this.cargo.clear();
    this.cargoUsed = 0;
    this.drillTarget = null;
    this.drillProgress = 0;
    this.deathReason = reason;
    this.dead = false;
  }

  cargoValue() {
    let v = 0;
    for (const [key, count] of this.cargo) {
      const ore = [...ORE_BY_ID.values()].find((o) => o.key === key);
      if (ore) v += ore.value * count;
    }
    return v;
  }

  update(dt, input) {
    if (this.dead) return;

    const left = input.down('a');
    const right = input.down('d');
    const up = input.down('w');
    const down = input.down('s');

    // ---- Vertical: gravity + thrust ----
    this.thrusting = false;
    if (up && this.fuel > 0) {
      this.vy -= THRUST * dt;
      this.thrusting = true;
      this.fuel = Math.max(0, this.fuel - FUEL_THRUST_RATE * dt);
    } else {
      this.fuel = Math.max(0, this.fuel - FUEL_IDLE_RATE * dt);
    }
    this.vy += GRAVITY * dt;
    this.vy = Math.max(-MAX_RISE, Math.min(MAX_FALL, this.vy));

    // ---- Horizontal: input + friction ----
    const accel = this.onGround ? LATERAL_ACCEL : LATERAL_AIR_ACCEL;
    if (left && !right) {
      this.vx -= accel * dt;
      this.facing = -1;
    } else if (right && !left) {
      this.vx += accel * dt;
      this.facing = 1;
    } else {
      const fric = this.onGround ? GROUND_FRICTION : AIR_DRAG;
      if (this.vx > 0) this.vx = Math.max(0, this.vx - fric * dt);
      else if (this.vx < 0) this.vx = Math.min(0, this.vx + fric * dt);
    }
    this.vx = Math.max(-LATERAL_MAX, Math.min(LATERAL_MAX, this.vx));

    // ---- Drilling: pick a target if input asks for it ----
    this._updateDrillTarget(left, right, down);
    this._progressDrill(dt);

    // ---- Move with collision (axis-separated) ----
    const prevVy = this.vy;
    this._moveX(this.vx * dt);
    const groundedNow = this._moveY(this.vy * dt);

    // Fall damage
    if (groundedNow && !this.onGround && prevVy > FALL_DAMAGE_THRESHOLD) {
      const excess = prevVy - FALL_DAMAGE_THRESHOLD;
      const dmg = excess * FALL_DAMAGE_PER_PXS;
      this._takeDamage(dmg);
    }
    this.onGround = groundedNow;

    // Death conditions
    if (this.fuel <= 0 && this.onGround) {
      this._die('Out of fuel');
    } else if (this.hull <= 0) {
      this._die('Hull breached');
    }

    this.animTime += dt;
  }

  _takeDamage(amount) {
    this.hull = Math.max(0, this.hull - amount);
  }

  _die(reason) {
    this.dead = true;
    this.deathReason = reason;
  }

  // -- Drilling target & progress --

  _updateDrillTarget(left, right, down) {
    this.drilling = false;

    // Priority: down > sideways (in input direction).
    let dir = null;
    if (down) dir = 'down';
    else if (right && !left) dir = 'right';
    else if (left && !right) dir = 'left';

    if (!dir) {
      this.drillTarget = null;
      this.drillProgress = 0;
      return;
    }

    const target = this._tileAtFace(dir);
    if (!target) {
      this.drillTarget = null;
      this.drillProgress = 0;
      return;
    }

    if (!this.drillTarget ||
        this.drillTarget.tx !== target.tx ||
        this.drillTarget.ty !== target.ty ||
        this.drillTarget.dir !== dir) {
      this.drillTarget = { ...target, dir };
      this.drillProgress = 0;
    }

    this.drilling = true;
  }

  // Find the tile coordinates of the tile flush against the digger's face in `dir`,
  // if there is one and it's drillable with the current drill tier.
  _tileAtFace(dir) {
    const b = this.bbox;
    const w = this.world;
    const FACE_TOL = 4; // px tolerance for "flush"

    let tx, ty;
    if (dir === 'down') {
      const cellY = Math.floor((b.y + b.h + 0.5) / TILE_SIZE);
      const tileTop = cellY * TILE_SIZE;
      if (tileTop - (b.y + b.h) > FACE_TOL) return null;
      tx = Math.floor((this.x) / TILE_SIZE);
      ty = cellY;
    } else if (dir === 'right') {
      const cellX = Math.floor((b.x + b.w + 0.5) / TILE_SIZE);
      const tileLeft = cellX * TILE_SIZE;
      if (tileLeft - (b.x + b.w) > FACE_TOL) return null;
      tx = cellX;
      ty = Math.floor((this.y) / TILE_SIZE);
    } else if (dir === 'left') {
      const cellX = Math.floor((b.x - 0.5) / TILE_SIZE);
      const tileRight = (cellX + 1) * TILE_SIZE;
      if (b.x - tileRight > FACE_TOL) return null;
      tx = cellX;
      ty = Math.floor((this.y) / TILE_SIZE);
    } else {
      return null;
    }

    if (!w.inBounds(tx, ty)) return null;
    const tile = w.get(tx, ty);
    if (!isDrillable(tile)) return null;
    if (tileDrillTier(tile) > this.drillTier) return null;
    return { tx, ty };
  }

  _progressDrill(dt) {
    if (!this.drilling || !this.drillTarget) return;
    if (this.fuel <= 0) return;

    const { tx, ty } = this.drillTarget;
    const tile = this.world.get(tx, ty);
    if (!isDrillable(tile)) {
      this.drillTarget = null;
      this.drillProgress = 0;
      return;
    }

    const required = tileHardness(tile); // seconds at base rate
    const rate = DRILL_BASE_RATE * this.drillPower; // multiplier
    this.drillProgress += rate * dt;
    this.world.setProgress(tx, ty, this.drillProgress / required);

    this.fuel = Math.max(0, this.fuel - FUEL_DRILL_RATE * dt);

    if (this.drillProgress >= required) {
      this._breakTile(tx, ty, tile);
      this.drillTarget = null;
      this.drillProgress = 0;
    }
  }

  _breakTile(tx, ty, tile) {
    this.world.set(tx, ty, TILE.SKY);
    this.world.clearProgress(tx, ty);

    if (isOre(tile)) {
      const ore = ORE_BY_ID.get(tile);
      if (this.cargoUsed + ore.weight <= this.maxCargo) {
        this.cargo.set(ore.key, (this.cargo.get(ore.key) ?? 0) + 1);
        this.cargoUsed += ore.weight;
      }
      // If cargo full, ore is destroyed (simple MVP rule).
    }
  }

  // -- Collision (axis-separated AABB vs grid) --

  _moveX(dx) {
    if (dx === 0) return;
    const b = this.bbox;
    let newX = b.x + dx;

    if (dx > 0) {
      const aheadX = newX + b.w;
      const tileX = Math.floor(aheadX / TILE_SIZE);
      const minTy = Math.floor(b.y / TILE_SIZE);
      const maxTy = Math.floor((b.y + b.h - 0.001) / TILE_SIZE);
      for (let ty = minTy; ty <= maxTy; ty++) {
        if (isSolid(this.world.get(tileX, ty))) {
          newX = tileX * TILE_SIZE - b.w - 0.001;
          this.vx = 0;
          break;
        }
      }
    } else {
      const aheadX = newX;
      const tileX = Math.floor(aheadX / TILE_SIZE);
      const minTy = Math.floor(b.y / TILE_SIZE);
      const maxTy = Math.floor((b.y + b.h - 0.001) / TILE_SIZE);
      for (let ty = minTy; ty <= maxTy; ty++) {
        if (isSolid(this.world.get(tileX, ty))) {
          newX = (tileX + 1) * TILE_SIZE + 0.001;
          this.vx = 0;
          break;
        }
      }
    }

    this.x = newX + b.w / 2;
  }

  // returns true if grounded after this move
  _moveY(dy) {
    const b = this.bbox;
    let newY = b.y + dy;
    let grounded = false;

    if (dy > 0) {
      const aheadY = newY + b.h;
      const tileY = Math.floor(aheadY / TILE_SIZE);
      const minTx = Math.floor(b.x / TILE_SIZE);
      const maxTx = Math.floor((b.x + b.w - 0.001) / TILE_SIZE);
      for (let tx = minTx; tx <= maxTx; tx++) {
        if (isSolid(this.world.get(tx, tileY))) {
          newY = tileY * TILE_SIZE - b.h - 0.001;
          this.vy = 0;
          grounded = true;
          break;
        }
      }
    } else if (dy < 0) {
      const aheadY = newY;
      const tileY = Math.floor(aheadY / TILE_SIZE);
      const minTx = Math.floor(b.x / TILE_SIZE);
      const maxTx = Math.floor((b.x + b.w - 0.001) / TILE_SIZE);
      for (let tx = minTx; tx <= maxTx; tx++) {
        if (isSolid(this.world.get(tx, tileY))) {
          newY = (tileY + 1) * TILE_SIZE + 0.001;
          this.vy = 0;
          break;
        }
      }
    }

    this.y = newY + b.h / 2;

    // Check ground state by sampling 1px below the new position.
    if (!grounded) {
      const below = this.y + b.h / 2 + 1;
      const tileY = Math.floor(below / TILE_SIZE);
      const minTx = Math.floor((this.x - b.w / 2) / TILE_SIZE);
      const maxTx = Math.floor((this.x + b.w / 2 - 0.001) / TILE_SIZE);
      for (let tx = minTx; tx <= maxTx; tx++) {
        if (isSolid(this.world.get(tx, tileY))) {
          grounded = true;
          break;
        }
      }
    }
    return grounded;
  }
}
