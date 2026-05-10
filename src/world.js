import { mulberry32 } from './rng.js';
import { TILE, ORES, isOre, ORE_BY_ID } from './ores.js';

export const TILE_SIZE = 32;
export const WORLD_W = 222;
export const WORLD_H = 12000;
export const SURFACE_ROW = 10; // rows 0..9 are sky; row 10 is the top dirt row

export class World {
  constructor(seed) {
    this.w = WORLD_W;
    this.h = WORLD_H;
    this.seed = seed >>> 0;
    this.tiles = new Uint8Array(this.w * this.h);
    // per-tile drill progress, only allocated lazily
    this.progress = new Map();
    this._generate();
  }

  idx(tx, ty) { return ty * this.w + tx; }

  inBounds(tx, ty) {
    return tx >= 0 && tx < this.w && ty >= 0 && ty < this.h;
  }

  get(tx, ty) {
    if (!this.inBounds(tx, ty)) return TILE.BEDROCK;
    return this.tiles[this.idx(tx, ty)];
  }

  set(tx, ty, v) {
    if (!this.inBounds(tx, ty)) return;
    this.tiles[this.idx(tx, ty)] = v;
  }

  getProgress(tx, ty) {
    return this.progress.get(this.idx(tx, ty)) ?? 0;
  }

  setProgress(tx, ty, v) {
    const k = this.idx(tx, ty);
    if (v <= 0) this.progress.delete(k);
    else this.progress.set(k, v);
  }

  clearProgress(tx, ty) {
    this.progress.delete(this.idx(tx, ty));
  }

  _generate() {
    const rand = mulberry32(this.seed);
    const { w, h, tiles } = this;

    // 1. Sky on top, then base terrain.
    for (let ty = 0; ty < h; ty++) {
      let base;
      if (ty < SURFACE_ROW) base = TILE.SKY;
      else if (ty < 400) base = TILE.DIRT;
      else if (ty < 3000) base = (rand() < 0.85 ? TILE.DIRT : TILE.STONE);
      else if (ty < 7000) base = (rand() < 0.55 ? TILE.STONE : TILE.DIRT);
      else if (ty < 10500) base = (rand() < 0.7 ? TILE.STONE : TILE.HARDSTONE);
      else if (ty < h - 1) base = (rand() < 0.6 ? TILE.HARDSTONE : TILE.STONE);
      else base = TILE.BEDROCK;

      for (let tx = 0; tx < w; tx++) {
        tiles[ty * w + tx] = base;
      }
    }

    // 2. Bedrock floor on the bottom row, and a bedrock frame on left/right.
    for (let tx = 0; tx < w; tx++) tiles[(h - 1) * w + tx] = TILE.BEDROCK;
    for (let ty = SURFACE_ROW; ty < h; ty++) {
      tiles[ty * w + 0] = TILE.BEDROCK;
      tiles[ty * w + (w - 1)] = TILE.BEDROCK;
    }

    // 3. Carve a small spawn opening on the surface so the digger has clear ground beneath.
    const spawnTx = (w / 2) | 0;
    for (let tx = spawnTx - 3; tx <= spawnTx + 3; tx++) {
      tiles[(SURFACE_ROW - 1) * w + tx] = TILE.SKY;
    }
    // Make sure the row directly under the digger is solid dirt (no surprises).
    for (let tx = spawnTx - 3; tx <= spawnTx + 3; tx++) {
      tiles[SURFACE_ROW * w + tx] = TILE.DIRT;
    }

    // 4. Sprinkle ores in clusters within their depth bands.
    for (const ore of ORES) {
      const minRow = Math.max(SURFACE_ROW + 4, ore.depthMin);
      const maxRow = Math.min(h - 2, ore.depthMax);
      if (maxRow <= minRow) continue;

      const rowsAvail = maxRow - minRow;
      const tilesAvail = rowsAvail * (w - 2);
      const targetCount = Math.floor(tilesAvail * ore.frequency);
      const clusters = Math.max(1, Math.floor(targetCount / 4));

      for (let c = 0; c < clusters; c++) {
        const cx = 1 + Math.floor(rand() * (w - 2));
        const cy = minRow + Math.floor(rand() * rowsAvail);
        const clusterSize = 2 + Math.floor(rand() * 5);
        let placed = 0;
        let attempts = 0;
        while (placed < clusterSize && attempts < clusterSize * 6) {
          attempts++;
          const ox = cx + Math.floor((rand() - 0.5) * 5);
          const oy = cy + Math.floor((rand() - 0.5) * 5);
          if (ox < 1 || ox >= w - 1 || oy < minRow || oy > maxRow) continue;
          const i = oy * w + ox;
          const cur = tiles[i];
          if (cur !== TILE.DIRT && cur !== TILE.STONE && cur !== TILE.HARDSTONE) continue;
          tiles[i] = ore.id;
          placed++;
        }
      }
    }
  }

  spawnPoint() {
    // Returns world-pixel (x, y) for the digger center on top of the surface.
    const spawnTx = (this.w / 2) | 0;
    const px = spawnTx * TILE_SIZE + TILE_SIZE / 2;
    const py = (SURFACE_ROW - 1) * TILE_SIZE + TILE_SIZE / 2;
    return { x: px, y: py };
  }

  // Convenience to compute depth in meters from a world-pixel y.
  // 1 tile = 1 meter (32px).
  depthMeters(worldY) {
    const surfaceY = SURFACE_ROW * TILE_SIZE;
    return Math.max(0, Math.floor((worldY - surfaceY) / TILE_SIZE));
  }
}

export function tileLabel(id) {
  if (isOre(id)) return ORE_BY_ID.get(id).name;
  switch (id) {
    case TILE.SKY: return 'Sky';
    case TILE.DIRT: return 'Dirt';
    case TILE.STONE: return 'Stone';
    case TILE.HARDSTONE: return 'Hard Stone';
    case TILE.BEDROCK: return 'Bedrock';
    default: return '?';
  }
}
