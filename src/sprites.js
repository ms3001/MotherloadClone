import { TILE, ORES, ORE_OFFSET, isOre } from './ores.js';
import { TILE_SIZE } from './world.js';
import { mulberry32 } from './rng.js';

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
  const r = mulberry32(seed);
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

function drawSpawnFlag(ctx) {
  // 16x48 logical px (32x96 canvas at PX=2): pole runs full height, flag at top.
  // Pole
  rect(ctx, 7, 0, 2, 48, '#b0b4be');
  rect(ctx, 7, 0, 1, 48, '#d8dce4'); // highlight
  // Ball on top
  rect(ctx, 6, 0, 4, 2, '#ffd166');
  rect(ctx, 5, 1, 6, 2, '#ffd166');
  rect(ctx, 6, 3, 4, 1, '#c8a030');
  // Flag (triangle pointing right)
  for (let row = 0; row < 8; row++) {
    const w = 8 - row;
    rect(ctx, 9, 5 + row, w, 1, row < 4 ? '#e63946' : '#c1121f');
  }
}

function drawConcrete(ctx) {
  // Dirt fill for the lower portion
  noisyFill(ctx, '#7a4a2b', '#5a3520', '#956038', 12346);
  rect(ctx, 3, 9,  2, 1, '#3f2515');
  rect(ctx, 9, 13, 2, 1, '#3f2515');
  rect(ctx, 12, 7, 1, 1, '#3f2515');

  // Clean concrete slab on top (rows 0–4)
  rect(ctx, 0, 0, 16, 5, '#8a8e96');
  rect(ctx, 0, 0, 16, 1, '#c0c4cc');  // top highlight
  rect(ctx, 0, 4, 16, 1, '#5a5e66');  // bottom shadow
  // slab seam lines
  rect(ctx, 0, 2,  5, 1, '#7a7e88');
  rect(ctx, 7, 2,  5, 1, '#7a7e88');
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

function drawGasPump(ctx) {
  // 64x64 sprite (32 logical px @ PX=2). Pump occupies the bottom-most
  // tile-row's worth of pixels resting on the surface; top row has
  // sign/canopy.
  // Background is transparent; only paint the pump body.

  // Canopy / sign on top
  // Pole
  ctx.fillStyle = '#3a3f4a';
  ctx.fillRect(14 * PX, 2 * PX, 4 * PX, 6 * PX);   // pole

  // Sign board
  ctx.fillStyle = '#d34d4d';
  ctx.fillRect(2 * PX, 1 * PX, 28 * PX, 6 * PX);
  ctx.fillStyle = '#a93a1c';
  ctx.fillRect(2 * PX, 6 * PX, 28 * PX, 1 * PX);   // shadow under sign
  // "GAS" text — three short bars in white pixels
  ctx.fillStyle = '#ffffff';
  // G
  ctx.fillRect(7 * PX, 3 * PX, 3 * PX, 1 * PX);
  ctx.fillRect(7 * PX, 4 * PX, 1 * PX, 2 * PX);
  ctx.fillRect(7 * PX, 5 * PX, 3 * PX, 1 * PX);
  ctx.fillRect(9 * PX, 4 * PX, 1 * PX, 1 * PX);
  // A
  ctx.fillRect(12 * PX, 4 * PX, 1 * PX, 2 * PX);
  ctx.fillRect(14 * PX, 4 * PX, 1 * PX, 2 * PX);
  ctx.fillRect(13 * PX, 3 * PX, 1 * PX, 1 * PX);
  ctx.fillRect(13 * PX, 4 * PX, 1 * PX, 1 * PX);
  // S
  ctx.fillRect(17 * PX, 3 * PX, 3 * PX, 1 * PX);
  ctx.fillRect(17 * PX, 4 * PX, 1 * PX, 1 * PX);
  ctx.fillRect(17 * PX, 5 * PX, 3 * PX, 1 * PX);
  ctx.fillRect(19 * PX, 4 * PX, 1 * PX, 1 * PX);   // (note this overpaints A's right column slightly — fine visually)

  // Pump body (lower section ~rows 10..30)
  ctx.fillStyle = '#f0a13a';
  ctx.fillRect(8 * PX, 10 * PX, 16 * PX, 20 * PX);
  // Body shadows / outlines
  ctx.fillStyle = '#a85f15';
  ctx.fillRect(8 * PX, 10 * PX, 16 * PX, 1 * PX);
  ctx.fillRect(8 * PX, 29 * PX, 16 * PX, 1 * PX);
  ctx.fillRect(22 * PX, 10 * PX, 2 * PX, 20 * PX);
  // Highlight
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(9 * PX, 11 * PX, 1 * PX, 18 * PX);

  // Display screen
  ctx.fillStyle = '#1a2233';
  ctx.fillRect(11 * PX, 13 * PX, 10 * PX, 5 * PX);
  ctx.fillStyle = '#7df5b2';
  ctx.fillRect(12 * PX, 14 * PX, 8 * PX, 1 * PX);
  ctx.fillRect(12 * PX, 16 * PX, 5 * PX, 1 * PX);

  // Nozzle handle (right side)
  ctx.fillStyle = '#2a2d36';
  ctx.fillRect(24 * PX, 14 * PX, 4 * PX, 2 * PX);   // hose attach
  // Hose curve (zig-zag pixels)
  ctx.fillStyle = '#1c1e25';
  ctx.fillRect(28 * PX, 14 * PX, 1 * PX, 4 * PX);
  ctx.fillRect(27 * PX, 18 * PX, 2 * PX, 1 * PX);
  ctx.fillRect(27 * PX, 19 * PX, 1 * PX, 4 * PX);
  // Nozzle gun
  ctx.fillStyle = '#5a5f6b';
  ctx.fillRect(26 * PX, 22 * PX, 3 * PX, 3 * PX);
  ctx.fillStyle = '#3a3f4a';
  ctx.fillRect(25 * PX, 23 * PX, 1 * PX, 2 * PX);

  // Base plate
  ctx.fillStyle = '#3a3f4a';
  ctx.fillRect(6 * PX, 30 * PX, 20 * PX, 2 * PX);
  ctx.fillStyle = '#2a2d36';
  ctx.fillRect(6 * PX, 31 * PX, 20 * PX, 1 * PX);
}

export function buildSprites() {
  const sprites = {
    tiles: {},
    digger: {},
    gasPump: null,
    spawnFlag: null,
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

  const concreteC = makeCanvas(TILE_SIZE);
  drawConcrete(concreteC.getContext('2d'));
  sprites.tiles[TILE.CONCRETE] = concreteC;

  // Ore tiles
  for (const ore of ORES) {
    const c = makeCanvas(TILE_SIZE);
    drawOreTile(c.getContext('2d'), ore);
    sprites.tiles[ore.id] = c;
  }

  // Spawn flag (32x96, 16x48 logical px @ PX=2)
  const flagC = makeCanvas(TILE_SIZE);
  flagC.height = TILE_SIZE * 3;
  drawSpawnFlag(flagC.getContext('2d'));
  sprites.spawnFlag = flagC;

  // Gas pump (64x64, 32 logical px @ PX=2)
  const pumpC = makeCanvas(64);
  const pumpCtx = pumpC.getContext('2d');
  pumpCtx.imageSmoothingEnabled = false;
  drawGasPump(pumpCtx);
  sprites.gasPump = pumpC;

  // Digger variants — index by [facing][stateKey][frame]
  const DIGGER_STATES = [
    { key: 'idle',       thrusting: false, drilling: false },
    { key: 'thrust',     thrusting: true,  drilling: false },
    { key: 'drill',      thrusting: false, drilling: true  },
    { key: 'thrustDrill',thrusting: true,  drilling: true  },
  ];
  sprites.digger = {};
  for (const facing of ['right', 'left']) {
    sprites.digger[facing] = {};
    for (const { key, thrusting, drilling } of DIGGER_STATES) {
      sprites.digger[facing][key] = [0, 1].map(frame =>
        composeDigger({ thrusting, drilling, frame, facingLeft: facing === 'left' })
      );
    }
  }

  return sprites;
}

export function tileSprite(sprites, tileId) {
  return sprites.tiles[tileId] ?? sprites.tiles[TILE.STONE];
}
