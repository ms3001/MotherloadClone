import { TILE_SIZE } from './world.js';
import { TILE, isSolid, isDrillable, isOre, ORE_BY_ID, tileHardness, tileDrillTier } from './ores.js';
import { UPGRADES } from './upgrades.js';

const GRAVITY = 900;          // px/s^2
const MAX_FALL = 900;         // terminal velocity
const MAX_RISE = 520;
const LATERAL_ACCEL = 1000;
const LATERAL_AIR_ACCEL = 733;
const GROUND_FRICTION = 1800; // px/s^2 deceleration when no input
const AIR_DRAG = 200;

const FUEL_THRUST_RATE = 4;    // units/sec while thrusting (W)
const FUEL_HOVER_RATE  = 8;    // units/sec while hovering (space)
const FUEL_DRILL_RATE = 1.5;   // units/sec while drilling
const FUEL_IDLE_RATE = 0.05;   // units/sec ambient
const FALL_DAMAGE_THRESHOLD = 750;
const FALL_DAMAGE_PER_PXS = 0.24;

const HITBOX_W = 28;
const HITBOX_H = 28;

const DRILL_BASE_RATE = 1.0; // units/sec; tile takes hardness seconds at base

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

    // Attachments: each points at a tier object from upgrades.js.
    // Future shop will mutate these references to higher tiers.
    this.attachments = {
      drill:    UPGRADES.drill[0],
      fuelTank: UPGRADES.fuelTank[0],
      hull:     UPGRADES.hull[0],
      thermal:  UPGRADES.thermal[0],
      storage:  UPGRADES.storage[0],
      engine:   UPGRADES.engine[0],
      radar:    UPGRADES.radar[0],
      wallet:   UPGRADES.wallet[0],
    };
    this._applyAttachmentStats();
    this.fuel = this.maxFuel;
    this.hull = this.maxHull;

    this.money = 100;

    // cargo: Map<oreKey, count>
    this.cargo = new Map();
    this.cargoUsed = 0;

    // Drilling state
    this.drillTarget = null; // { tx, ty, dir }
    this.drillProgress = 0;
    this.drilling = false;   // true this frame
    this.thrusting = false;  // true this frame

    this.snapTargetX = null;
    this._drillStartX = 0;
    this._drillStartY = 0;
    this._drillTargetX = 0;
    this._drillTargetY = 0;

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
    this.snapTargetX = null;
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
    const hovering = input.down(' ') && !up && this.fuel > 0;

    // ---- Vertical: gravity + thrust ----
    this.thrusting = false;
    if (up && this.fuel > 0 && !this.drillTarget) {
      this.vy -= this.thrust * dt;
      this.thrusting = true;
      this.fuel = Math.max(0, this.fuel - FUEL_THRUST_RATE * dt);
    } else if (hovering && !this.drillTarget) {
      this.thrusting = true;
      this.fuel = Math.max(0, this.fuel - FUEL_HOVER_RATE * dt);
    } else {
      this.fuel = Math.max(0, this.fuel - FUEL_IDLE_RATE * dt);
    }
    this.vy += GRAVITY * dt;
    this.vy = Math.max(-MAX_RISE, Math.min(MAX_FALL, this.vy));
    if (hovering) {
      this.vy -= GRAVITY * dt;             // cancel gravity
      this.vy *= Math.max(0, 1 - 3 * dt); // damp toward zero
    }

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
    this.vx = Math.max(-this.lateralMax, Math.min(this.lateralMax, this.vx));

    // ---- Drilling: pick a target if input asks for it ----
    this._updateDrillTarget(left, right, down);
    this._progressDrill(dt);

    // ---- Snap to tile center after single-column downward drill ----
    if (this.snapTargetX !== null) {
      const diff = this.snapTargetX - this.x;
      if (Math.abs(diff) < 0.5) {
        this.x = this.snapTargetX;
        this.snapTargetX = null;
      } else {
        this.x += diff * Math.min(1, 12 * dt);
      }
    }

    // ---- Move with collision (axis-separated) ----
    const prevVy = this.vy;
    this._moveX(this.vx * dt);
    const groundedNow = this._moveY(this.vy * dt);

    // Fall damage
    if (groundedNow && !this.onGround && prevVy > FALL_DAMAGE_THRESHOLD && this.fuel > 0) {
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
    const reduction = this.attachments.thermal?.reduction ?? 0;
    this.hull = Math.max(0, this.hull - amount * (1 - reduction));
  }

  // Recompute derived caps/stats from currently equipped attachments.
  // Call after swapping any attachment in `this.attachments`.
  _applyAttachmentStats() {
    this.maxFuel = this.attachments.fuelTank.capacity;
    this.maxHull = this.attachments.hull.hp;
    this.maxCargo = this.attachments.storage.capacity;
    this.maxMoney = this.attachments.wallet.capacity;
    this.drillTier = this.attachments.drill.drillTier;
    this.drillPower = this.attachments.drill.power;
    this.thrust = this.attachments.engine.thrust;
    this.lateralMax = this.attachments.engine.lateralMax;
    if (this.fuel > this.maxFuel) this.fuel = this.maxFuel;
    if (this.hull > this.maxHull) this.hull = this.maxHull;
    if (this.money > this.maxMoney) this.money = this.maxMoney;
  }

  // Refuel by `units`. Returns the actual amount added (clamped to capacity).
  addFuel(units) {
    const before = this.fuel;
    this.fuel = Math.min(this.maxFuel, this.fuel + units);
    return this.fuel - before;
  }

  _die(reason) {
    this.dead = true;
    this.deathReason = reason;
  }

  // -- Drilling target & progress --

  _updateDrillTarget(left, right, down) {
    this.drilling = false;

    // Commit to the current target once drilling has started.
    if (this.drillTarget && this.drillProgress > 0) {
      this.drilling = true;
      return;
    }

    if (!this.onGround) {
      this.drillTarget = null;
      this.drillProgress = 0;
      return;
    }

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

    // Lock in the chosen tile even before progress accumulates. Without this,
    // sub-pixel x-movement can flip centerTx each frame and reset progress to
    // 0 indefinitely, making the drill bounce between neighboring columns.
    if (this.drillTarget && this.drillTarget.dir === dir) {
      const t = this.world.get(this.drillTarget.tx, this.drillTarget.ty);
      if (isDrillable(t) && tileDrillTier(t) <= this.drillTier) {
        this.drilling = true;
        return;
      }
      // Tile is gone — clear and pick fresh.
      this.drillTarget = null;
      this.drillProgress = 0;
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
      this._drillStartX = this.x;
      this._drillStartY = this.y;
      if (dir === 'down') {
        this._drillTargetX = target.tx * TILE_SIZE + TILE_SIZE / 2;
        this._drillTargetY = this.y + TILE_SIZE;
      } else {
        this._drillTargetX = target.tx * TILE_SIZE + TILE_SIZE / 2;
        this._drillTargetY = this.y;
      }
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
      ty = cellY;

      tx = Math.floor(this.x / TILE_SIZE);
      if (!w.inBounds(tx, ty)) return null;
      const t = w.get(tx, ty);
      if (!isDrillable(t) || tileDrillTier(t) > this.drillTier) return null;

      return { tx, ty, snapX: tx * TILE_SIZE + TILE_SIZE / 2 };
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

    const { tx, ty, dir } = this.drillTarget;
    const tile = this.world.get(tx, ty);
    if (!isDrillable(tile)) {
      this.drillTarget = null;
      this.drillProgress = 0;
      return;
    }

    const required = tileHardness(tile);
    const rate = DRILL_BASE_RATE * this.drillPower;
    this.drillProgress += rate * dt;
    this.world.setProgress(tx, ty, this.drillProgress / required);
    this.fuel = Math.max(0, this.fuel - FUEL_DRILL_RATE * dt);

    // Drill-through: physically advance the digger into the target tile.
    const frac = Math.min(1, this.drillProgress / required);
    this.x = this._drillStartX + frac * (this._drillTargetX - this._drillStartX);
    this.y = this._drillStartY + frac * (this._drillTargetY - this._drillStartY);
    this.vx = 0;
    this.vy = 0;

    if (this.drillProgress >= required) {
      this.x = this._drillTargetX;
      this.y = this._drillTargetY;
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

  // Returns [minTile, maxTile] for a pixel span [lo, hi) along one axis.
  _tileRange(lo, hi) {
    return [Math.floor(lo / TILE_SIZE), Math.floor((hi - 0.001) / TILE_SIZE)];
  }

  _moveX(dx) {
    if (dx === 0) return;
    const b = this.bbox;
    let newX = b.x + dx;
    const [minTy, maxTy] = this._tileRange(b.y, b.y + b.h);

    if (dx > 0) {
      const tileX = Math.floor((newX + b.w) / TILE_SIZE);
      for (let ty = minTy; ty <= maxTy; ty++) {
        if (isSolid(this.world.get(tileX, ty))) {
          newX = tileX * TILE_SIZE - b.w - 0.001;
          this.vx = 0;
          break;
        }
      }
    } else {
      const tileX = Math.floor(newX / TILE_SIZE);
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
    const [minTx, maxTx] = this._tileRange(b.x, b.x + b.w);

    if (dy > 0) {
      const tileY = Math.floor((newY + b.h) / TILE_SIZE);
      for (let tx = minTx; tx <= maxTx; tx++) {
        if (isSolid(this.world.get(tx, tileY))) {
          newY = tileY * TILE_SIZE - b.h - 0.001;
          this.vy = 0;
          grounded = true;
          break;
        }
      }
    } else if (dy < 0) {
      const tileY = Math.floor(newY / TILE_SIZE);
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
      const [minTx2, maxTx2] = this._tileRange(this.x - b.w / 2, this.x + b.w / 2);
      for (let tx = minTx2; tx <= maxTx2; tx++) {
        if (isSolid(this.world.get(tx, tileY))) {
          grounded = true;
          break;
        }
      }
    }
    return grounded;
  }
}
