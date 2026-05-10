import { TILE, ORES, ORE_OFFSET, isOre } from './ores.js';
import { TILE_SIZE } from './world.js';

// Each sprite is a 32x32 offscreen canvas, drawn pixel-by-pixel via fillRect.
// We work on an internal 16x16 grid scaled 2x for chunky pixel-art look.

const PX = 2; // sub-pixel size in the 32x32 sprite (16 logical pixels per side).

function makeCanvas(size = TILE_SIZE) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return c;
}

function px(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * PX, y * PX, PX, PX);
}

function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * PX, y * PX, w * PX, h * PX);
}

function noisyFill(ctx, baseColor, dark, light, seed) {
  let s = seed >>> 0;
  const r = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  rect(ctx, 0, 0, 16, 16, baseColor);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const n = r();
      if (n < 0.18) px(ctx, x, y, dark);
      else if (n > 0.88) px(ctx, x, y, light);
    }
  }
}

function drawDirt(ctx) {
  noisyFill(ctx, '#7a4a2b', '#5a3520', '#956038', 12345);
  // small pebbles
  rect(ctx, 3, 5, 2, 1, '#3f2515');
  rect(ctx, 9, 11, 2, 1, '#3f2515');
  rect(ctx, 12, 3, 1, 1, '#3f2515');
}

function drawStone(ctx) {
  noisyFill(ctx, '#6e7480', '#4a4f59', '#8a909c', 7777);
  rect(ctx, 2, 9, 3, 1, '#3f444c');
  rect(ctx, 10, 4, 3, 1, '#3f444c');
  rect(ctx, 7, 13, 2, 1, '#3f444c');
}

function drawHardstone(ctx) {
  noisyFill(ctx, '#3f4350', '#2a2d36', '#565b6b', 4242);
  // sharper cracks
  px(ctx, 5, 2, '#1c1e25'); px(ctx, 6, 3, '#1c1e25'); px(ctx, 7, 3, '#1c1e25'); px(ctx, 8, 4, '#1c1e25');
  px(ctx, 11, 9, '#1c1e25'); px(ctx, 12, 10, '#1c1e25'); px(ctx, 12, 11, '#1c1e25');
}

function drawBedrock(ctx) {
  noisyFill(ctx, '#1f222b', '#0f1116', '#30343f', 1);
  // diagonal hatch
  for (let i = 0; i < 16; i += 4) {
    px(ctx, i, i, '#0a0b0f');
    px(ctx, (i + 8) % 16, i, '#0a0b0f');
  }
}

function drawSky(ctx) {
  rect(ctx, 0, 0, 16, 16, '#6ec5ff');
}

function drawOreTile(ctx, ore) {
  // Stone backdrop
  noisyFill(ctx, '#6e7480', '#4a4f59', '#8a909c', 99 + ore.id);
  // Gem cluster: a diamond + facets
  const cx = 8, cy = 8;
  const c = ore.color;
  const a = ore.accent;
  const dark = shade(c, -0.35);

  // body (rhombus-ish)
  rect(ctx, cx - 3, cy - 1, 6, 3, c);
  rect(ctx, cx - 2, cy - 3, 4, 2, c);
  rect(ctx, cx - 2, cy + 2, 4, 2, c);
  rect(ctx, cx - 1, cy + 4, 2, 1, c);
  rect(ctx, cx - 1, cy - 4, 2, 1, c);

  // shadow side
  rect(ctx, cx + 1, cy + 1, 2, 2, dark);
  rect(ctx, cx + 2, cy, 1, 2, dark);
  px(ctx, cx + 1, cy + 3, dark);

  // highlight
  px(ctx, cx - 2, cy - 2, a);
  px(ctx, cx - 1, cy - 2, a);
  px(ctx, cx - 2, cy - 1, a);
  px(ctx, cx, cy - 3, a);
}

function shade(hex, amt) {
  const m = hex.replace('#', '');
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  const toHex = (n) => n.toString(16).padStart(2, '0');
  return `#${toHex(f(r))}${toHex(f(g))}${toHex(f(b))}`;
}

// Digger sprite. Faces RIGHT by default; we flip when facing left.
// We render a few variants: idle, drill-active (drill bit shimmer), thrust (flame).
function drawDiggerBase(ctx) {
  // body: rounded boxy hull
  // chassis
  rect(ctx, 3, 6, 9, 6, '#d6512a');     // body red-orange
  rect(ctx, 3, 6, 9, 1, '#a93a1c');     // top shadow
  rect(ctx, 3, 11, 9, 1, '#7a2a13');    // bottom shadow
  rect(ctx, 11, 6, 1, 6, '#a93a1c');    // right side shadow

  // cockpit window
  rect(ctx, 8, 7, 3, 3, '#9bdcff');
  px(ctx, 8, 7, '#cdebff');
  px(ctx, 9, 7, '#cdebff');
  rect(ctx, 8, 9, 3, 1, '#5fa8d6');

  // bolts
  px(ctx, 4, 7, '#3a1a0c');
  px(ctx, 4, 10, '#3a1a0c');
  px(ctx, 11, 7, '#3a1a0c');
  px(ctx, 11, 10, '#3a1a0c');

  // tracks / treads underneath
  rect(ctx, 2, 12, 11, 2, '#2a2d36');
  rect(ctx, 3, 13, 1, 1, '#5a5f6b');
  rect(ctx, 5, 13, 1, 1, '#5a5f6b');
  rect(ctx, 7, 13, 1, 1, '#5a5f6b');
  rect(ctx, 9, 13, 1, 1, '#5a5f6b');
  rect(ctx, 11, 13, 1, 1, '#5a5f6b');

  // front drill mount
  rect(ctx, 12, 7, 2, 4, '#8a909c');
  rect(ctx, 12, 7, 2, 1, '#aab0bb');
}

function drawDrillBit(ctx, frame) {
  // Drill bit at front (right side). frame 0 = static, frame 1 = active.
  const baseX = 14;
  rect(ctx, baseX, 7, 1, 4, '#d0d4dc');
  // helical band
  const c1 = '#8a909c';
  const c2 = '#5a5f6b';
  if (frame === 0) {
    px(ctx, baseX, 7, c1); px(ctx, baseX, 8, c2); px(ctx, baseX, 9, c1); px(ctx, baseX, 10, c2);
  } else {
    px(ctx, baseX, 7, c2); px(ctx, baseX, 8, c1); px(ctx, baseX, 9, c2); px(ctx, baseX, 10, c1);
  }
  // pointed tip
  px(ctx, baseX + 1, 8, '#cdd2dc');
  px(ctx, baseX + 1, 9, '#cdd2dc');
}

function drawThrust(ctx, frame) {
  // exhaust below body, flickering flame
  const colors = frame === 0
    ? ['#ffd166', '#f0a13a', '#d34d4d']
    : ['#fff2a8', '#ffd166', '#f0a13a'];
  // two nozzles
  for (const nx of [4, 9]) {
    px(ctx, nx, 14, colors[0]);
    px(ctx, nx, 15, colors[1]);
    px(ctx, nx + 1, 14, colors[1]);
    if (frame === 1) px(ctx, nx + 1, 15, colors[2]);
  }
}

function composeDigger({ thrusting, drilling, frame, facingLeft }) {
  const c = makeCanvas(TILE_SIZE);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  if (facingLeft) {
    ctx.translate(TILE_SIZE, 0);
    ctx.scale(-1, 1);
  }

  drawDiggerBase(ctx);
  drawDrillBit(ctx, drilling ? frame : 0);
  if (thrusting) drawThrust(ctx, frame);

  return c;
}

export function buildSprites() {
  const sprites = {
    tiles: {},
    digger: {},
  };

  // Tile sprites
  const skyC = makeCanvas(TILE_SIZE);
  drawSky(skyC.getContext('2d'));
  sprites.tiles[TILE.SKY] = skyC;

  const dirtC = makeCanvas(TILE_SIZE);
  drawDirt(dirtC.getContext('2d'));
  sprites.tiles[TILE.DIRT] = dirtC;

  const stoneC = makeCanvas(TILE_SIZE);
  drawStone(stoneC.getContext('2d'));
  sprites.tiles[TILE.STONE] = stoneC;

  const hardC = makeCanvas(TILE_SIZE);
  drawHardstone(hardC.getContext('2d'));
  sprites.tiles[TILE.HARDSTONE] = hardC;

  const bedC = makeCanvas(TILE_SIZE);
  drawBedrock(bedC.getContext('2d'));
  sprites.tiles[TILE.BEDROCK] = bedC;

  // Ore tiles
  for (const ore of ORES) {
    const c = makeCanvas(TILE_SIZE);
    drawOreTile(c.getContext('2d'), ore);
    sprites.tiles[ore.id] = c;
  }

  // Digger variants — index by [facing][thrust][drill][frame]
  sprites.digger = {
    right: {
      idle: [
        composeDigger({ thrusting: false, drilling: false, frame: 0, facingLeft: false }),
        composeDigger({ thrusting: false, drilling: false, frame: 1, facingLeft: false }),
      ],
      thrust: [
        composeDigger({ thrusting: true, drilling: false, frame: 0, facingLeft: false }),
        composeDigger({ thrusting: true, drilling: false, frame: 1, facingLeft: false }),
      ],
      drill: [
        composeDigger({ thrusting: false, drilling: true, frame: 0, facingLeft: false }),
        composeDigger({ thrusting: false, drilling: true, frame: 1, facingLeft: false }),
      ],
      thrustDrill: [
        composeDigger({ thrusting: true, drilling: true, frame: 0, facingLeft: false }),
        composeDigger({ thrusting: true, drilling: true, frame: 1, facingLeft: false }),
      ],
    },
    left: {
      idle: [
        composeDigger({ thrusting: false, drilling: false, frame: 0, facingLeft: true }),
        composeDigger({ thrusting: false, drilling: false, frame: 1, facingLeft: true }),
      ],
      thrust: [
        composeDigger({ thrusting: true, drilling: false, frame: 0, facingLeft: true }),
        composeDigger({ thrusting: true, drilling: false, frame: 1, facingLeft: true }),
      ],
      drill: [
        composeDigger({ thrusting: false, drilling: true, frame: 0, facingLeft: true }),
        composeDigger({ thrusting: false, drilling: true, frame: 1, facingLeft: true }),
      ],
      thrustDrill: [
        composeDigger({ thrusting: true, drilling: true, frame: 0, facingLeft: true }),
        composeDigger({ thrusting: true, drilling: true, frame: 1, facingLeft: true }),
      ],
    },
  };

  return sprites;
}

export function tileSprite(sprites, tileId) {
  return sprites.tiles[tileId] ?? sprites.tiles[TILE.STONE];
}
