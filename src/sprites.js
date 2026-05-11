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

function drawGasPumpUpgraded(ctx) {
  // 64×64 sprite (32 logical px @ PX=2). Two pump bodies side by side
  // under a shared sign/canopy. Left nozzle faces left, right faces right.

  // Shared canopy pole (center)
  ctx.fillStyle = '#3a3f4a';
  ctx.fillRect(14 * PX, 2 * PX, 4 * PX, 6 * PX);

  // Shared sign board
  ctx.fillStyle = '#d34d4d';
  ctx.fillRect(1 * PX, 1 * PX, 30 * PX, 6 * PX);
  ctx.fillStyle = '#a93a1c';
  ctx.fillRect(1 * PX, 6 * PX, 30 * PX, 1 * PX);

  // "GAS" text
  ctx.fillStyle = '#ffffff';
  // G
  ctx.fillRect(6 * PX, 3 * PX, 3 * PX, 1 * PX);
  ctx.fillRect(6 * PX, 4 * PX, 1 * PX, 2 * PX);
  ctx.fillRect(6 * PX, 5 * PX, 3 * PX, 1 * PX);
  ctx.fillRect(8 * PX, 4 * PX, 1 * PX, 1 * PX);
  // A
  ctx.fillRect(11 * PX, 4 * PX, 1 * PX, 2 * PX);
  ctx.fillRect(13 * PX, 4 * PX, 1 * PX, 2 * PX);
  ctx.fillRect(12 * PX, 3 * PX, 1 * PX, 2 * PX);
  // S
  ctx.fillRect(16 * PX, 3 * PX, 3 * PX, 1 * PX);
  ctx.fillRect(16 * PX, 4 * PX, 1 * PX, 1 * PX);
  ctx.fillRect(16 * PX, 5 * PX, 3 * PX, 1 * PX);
  ctx.fillRect(18 * PX, 4 * PX, 1 * PX, 1 * PX);

  // Left pump body (x=2..11)
  ctx.fillStyle = '#f0a13a';
  ctx.fillRect(2 * PX, 10 * PX, 10 * PX, 20 * PX);
  ctx.fillStyle = '#a85f15';
  ctx.fillRect(2 * PX, 10 * PX, 10 * PX, 1 * PX);
  ctx.fillRect(2 * PX, 29 * PX, 10 * PX, 1 * PX);
  ctx.fillRect(10 * PX, 10 * PX, 2 * PX, 20 * PX);
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(3 * PX, 11 * PX, 1 * PX, 18 * PX);
  // Left pump display
  ctx.fillStyle = '#1a2233';
  ctx.fillRect(4 * PX, 13 * PX, 6 * PX, 5 * PX);
  ctx.fillStyle = '#7df5b2';
  ctx.fillRect(5 * PX, 14 * PX, 4 * PX, 1 * PX);
  ctx.fillRect(5 * PX, 16 * PX, 3 * PX, 1 * PX);
  // Left nozzle (faces left)
  ctx.fillStyle = '#2a2d36';
  ctx.fillRect(0 * PX, 14 * PX, 2 * PX, 2 * PX);
  ctx.fillStyle = '#1c1e25';
  ctx.fillRect(0 * PX, 14 * PX, 1 * PX, 4 * PX);
  ctx.fillRect(0 * PX, 18 * PX, 2 * PX, 1 * PX);
  ctx.fillRect(1 * PX, 19 * PX, 1 * PX, 4 * PX);
  ctx.fillStyle = '#5a5f6b';
  ctx.fillRect(0 * PX, 22 * PX, 2 * PX, 3 * PX);
  // Left base
  ctx.fillStyle = '#3a3f4a';
  ctx.fillRect(1 * PX, 30 * PX, 12 * PX, 2 * PX);
  ctx.fillStyle = '#2a2d36';
  ctx.fillRect(1 * PX, 31 * PX, 12 * PX, 1 * PX);

  // Right pump body (x=20..29)
  ctx.fillStyle = '#f0a13a';
  ctx.fillRect(20 * PX, 10 * PX, 10 * PX, 20 * PX);
  ctx.fillStyle = '#a85f15';
  ctx.fillRect(20 * PX, 10 * PX, 10 * PX, 1 * PX);
  ctx.fillRect(20 * PX, 29 * PX, 10 * PX, 1 * PX);
  ctx.fillRect(28 * PX, 10 * PX, 2 * PX, 20 * PX);
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(21 * PX, 11 * PX, 1 * PX, 18 * PX);
  // Right pump display
  ctx.fillStyle = '#1a2233';
  ctx.fillRect(22 * PX, 13 * PX, 6 * PX, 5 * PX);
  ctx.fillStyle = '#7df5b2';
  ctx.fillRect(23 * PX, 14 * PX, 4 * PX, 1 * PX);
  ctx.fillRect(23 * PX, 16 * PX, 3 * PX, 1 * PX);
  // Right nozzle (faces right)
  ctx.fillStyle = '#2a2d36';
  ctx.fillRect(30 * PX, 14 * PX, 2 * PX, 2 * PX);
  ctx.fillStyle = '#1c1e25';
  ctx.fillRect(31 * PX, 14 * PX, 1 * PX, 4 * PX);
  ctx.fillRect(30 * PX, 18 * PX, 2 * PX, 1 * PX);
  ctx.fillRect(30 * PX, 19 * PX, 1 * PX, 4 * PX);
  ctx.fillStyle = '#5a5f6b';
  ctx.fillRect(30 * PX, 22 * PX, 2 * PX, 3 * PX);
  ctx.fillStyle = '#3a3f4a';
  ctx.fillRect(25 * PX, 23 * PX, 1 * PX, 2 * PX);
  // Right base
  ctx.fillStyle = '#3a3f4a';
  ctx.fillRect(19 * PX, 30 * PX, 12 * PX, 2 * PX);
  ctx.fillStyle = '#2a2d36';
  ctx.fillRect(19 * PX, 31 * PX, 12 * PX, 1 * PX);
}

function drawOreShack(ctx) {
  // 192×64 canvas, logical 96×32 @ PX=2
  rect(ctx, 0, 0, 96, 32, '#6b4a2a');
  // Vertical plank seams
  for (let lx = 8; lx < 96; lx += 8) {
    rect(ctx, lx, 0, 1, 32, '#3a2010');
  }
  // Roof (peaked, asymmetric — peak at logical x=30)
  for (let row = 0; row < 10; row++) {
    const lx = Math.max(0, Math.round(30 - row * 3.2));
    const rr = Math.min(96, Math.round(30 + row * 2.5));
    rect(ctx, lx, row, rr - lx, 1, '#4a3010');
  }
  rect(ctx, 28, 0, 4, 1, '#7a5830'); // peak highlight
  rect(ctx, 0, 10, 96, 2, '#3a2010'); // eave shadow
  // Broken window (left)
  rect(ctx, 10, 14, 14, 10, '#1a2233');
  rect(ctx, 10, 14,  1, 10, '#3a2010');
  rect(ctx, 10, 14, 14,  1, '#3a2010');
  rect(ctx, 15, 14,  1,  5, '#2a1a10');
  // Door (right)
  rect(ctx, 76, 16, 14, 16, '#1a0f08');
  rect(ctx, 76, 14, 14,  2, '#3a2010');
  rect(ctx, 76, 14,  2, 18, '#3a2010');
  rect(ctx, 88, 14,  2, 18, '#3a2010');
  // Weathering spots
  rect(ctx,  3, 18,  2, 1, '#2a1a0a');
  rect(ctx, 45, 22,  3, 1, '#2a1a0a');
  rect(ctx, 60, 17,  1, 2, '#2a1a0a');
  rect(ctx, 35, 28,  4, 1, '#2a1a0a');
}

function drawOreStorage(ctx) {
  // 64×64 canvas, logical 32×32 @ PX=2
  rect(ctx, 0, 0, 32, 32, '#2d3748');
  rect(ctx, 1, 1, 30, 30, '#4a5568');
  rect(ctx,  0,  0, 32,  1, '#9ba8b8');
  rect(ctx,  0,  0,  1, 32, '#9ba8b8');
  rect(ctx, 31,  0,  1, 32, '#1c2030');
  rect(ctx,  0, 31, 32,  1, '#1c2030');
  // Yellow label strip
  rect(ctx, 2, 2, 28, 6, '#ffd166');
  rect(ctx, 2, 2, 28, 1, '#ffe899');
  rect(ctx, 2, 7, 28, 1, '#c8a030');
  // Label marks (suggesting "ORE")
  rect(ctx,  4, 4, 4, 2, '#3a2a00');
  rect(ctx, 10, 4, 4, 2, '#3a2a00');
  rect(ctx, 16, 4, 4, 2, '#3a2a00');
  // Slot hatch marks
  for (let lx = 3; lx < 30; lx += 5) {
    rect(ctx, lx, 12, 3, 16, '#2d3748');
  }
  rect(ctx, 2, 11, 28, 1, '#3a4460');
  // Bolt corners
  px(ctx,  2,  9, '#1c2030');
  px(ctx, 29,  9, '#1c2030');
  px(ctx,  2, 29, '#1c2030');
  px(ctx, 29, 29, '#1c2030');
}

function drawOreStorageUpgraded(ctx) {
  // 64×64 canvas, logical 32×32 @ PX=2 — high-throughput industrial ore processor
  rect(ctx, 0, 0, 32, 32, '#1e2435');
  rect(ctx, 1, 1, 30, 30, '#2a3248');

  // Outer frame
  rect(ctx,  0,  0, 32,  1, '#6a7a8a');
  rect(ctx,  0,  0,  1, 32, '#6a7a8a');
  rect(ctx, 31,  0,  1, 32, '#0e1020');
  rect(ctx,  0, 31, 32,  1, '#0e1020');

  // Yellow label strip (same "ORE" motif as base storage)
  rect(ctx, 2, 2, 28, 6, '#ffd166');
  rect(ctx, 2, 2, 28, 1, '#ffe899');
  rect(ctx, 2, 7, 28, 1, '#c8a030');
  rect(ctx,  4, 4, 4, 2, '#3a2a00');
  rect(ctx, 10, 4, 4, 2, '#3a2a00');
  rect(ctx, 16, 4, 4, 2, '#3a2a00');

  // Cyan accent bar below label
  rect(ctx, 2, 8, 28, 1, '#00a8cc');

  // Processing display panel
  rect(ctx, 2, 10, 28, 9, '#0a0f1a');
  rect(ctx, 2, 10, 28, 1, '#003a50');
  // Bar-graph inside display (5 bars of varying height, cyan tones)
  for (let i = 0; i < 5; i++) {
    const barH = [6, 4, 7, 5, 8][i];
    rect(ctx, 4 + i * 5, 10 + (8 - barH), 3, barH, i % 2 === 0 ? '#00ccff' : '#0099cc');
  }
  // Green status LEDs top-right of panel
  px(ctx, 28, 11, '#00dd88');
  px(ctx, 29, 11, '#00dd88');

  // Divider
  rect(ctx, 2, 19, 28, 1, '#003a50');

  // Conveyor belt section
  rect(ctx, 2, 20, 28, 10, '#151c28');
  // Roller cylinders
  for (let lx = 3; lx < 29; lx += 4) {
    rect(ctx, lx, 21, 2, 9, '#2a3248');
    rect(ctx, lx, 21, 2,  1, '#4a5568');
  }
  // Belt surface with diagonal stripe texture
  rect(ctx, 3, 22, 26, 7, '#1e2838');
  for (let i = 0; i < 7; i++) {
    const bx = 3 + i * 4;
    if (bx < 28) rect(ctx, bx, 22, 2, 7, '#263040');
  }
  // Cyan glow at belt bottom edge
  rect(ctx, 2, 29, 28, 1, '#00a8cc');

  // Corner bolts
  px(ctx,  2,  9, '#0e1020');
  px(ctx, 29,  9, '#0e1020');
  px(ctx,  2, 19, '#0e1020');
  px(ctx, 29, 19, '#0e1020');
}

function drawOrePad(ctx) {
  // 128×64 canvas, logical 64×32 @ PX=2
  rect(ctx, 0, 0, 64, 32, '#2a2d36');
  rect(ctx, 0, 0, 64,  1, '#8a909c');
  // Grid lines
  for (let ly = 8; ly < 32; ly += 8) rect(ctx, 0, ly, 64, 1, '#1c1e25');
  for (let lx = 8; lx < 64; lx += 8) rect(ctx, lx, 0,  1, 32, '#1c1e25');
  // Landing circle (center 32,16, r=9)
  const cx = 32, cy = 16, r = 9;
  for (let dy = -r; dy <= r; dy++) {
    const hw = Math.round(Math.sqrt(r * r - dy * dy));
    rect(ctx, cx - hw, cy + dy, hw * 2, 1, '#3a3f4a');
  }
  for (let dy = -(r - 2); dy <= r - 2; dy++) {
    const hw2 = Math.round(Math.sqrt((r - 2) * (r - 2) - dy * dy));
    rect(ctx, cx - hw2, cy + dy, hw2 * 2, 1, '#2a2d36');
  }
  // Crosshair
  rect(ctx, cx - 1, cy - r + 1, 2, r * 2 - 1, '#4a4f5a');
  rect(ctx, cx - r + 1, cy - 1, r * 2 - 1, 2, '#4a4f5a');
  // Corner lights
  for (const [lx, ly] of [[3, 3], [3, 27], [59, 3], [59, 27]]) {
    rect(ctx, lx, ly, 2, 2, '#9ba8b8');
    rect(ctx, lx, ly, 2, 1, '#c8d4e0');
  }
  rect(ctx, 0,  0,  1, 32, '#8a909c');
  rect(ctx, 0, 31, 64,  1, '#1c1e25');
  rect(ctx, 63, 0,  1, 32, '#1c1e25');
}

function drawRepairShack(ctx) {
  // 128×64 canvas, logical 64×32 @ PX=2
  rect(ctx, 0, 0, 64, 32, '#6b4a2a');
  for (let lx = 8; lx < 64; lx += 8) rect(ctx, lx, 0, 1, 32, '#3a2010');
  // Roof, peak at x=22
  for (let row = 0; row < 10; row++) {
    const lx = Math.max(0, Math.round(22 - row * 2.4));
    const rr = Math.min(64, Math.round(22 + row * 2.0));
    rect(ctx, lx, row, rr - lx, 1, '#4a3010');
  }
  rect(ctx, 20, 0, 4, 1, '#7a5830');
  rect(ctx, 0, 10, 64, 2, '#3a2010');
  // Broken window
  rect(ctx, 8, 14, 10, 8, '#1a2233');
  rect(ctx, 8, 14, 1, 8, '#3a2010');
  rect(ctx, 8, 14, 10, 1, '#3a2010');
  rect(ctx, 12, 14, 1, 4, '#2a1a10');
  // Door
  rect(ctx, 46, 16, 12, 16, '#1a0f08');
  rect(ctx, 46, 14, 12, 2, '#3a2010');
  rect(ctx, 46, 14, 2, 18, '#3a2010');
  rect(ctx, 56, 14, 2, 18, '#3a2010');
  // Weathering
  rect(ctx,  3, 18, 2, 1, '#2a1a0a');
  rect(ctx, 28, 22, 3, 1, '#2a1a0a');
  rect(ctx, 38, 17, 1, 2, '#2a1a0a');
}

function drawUpgradeShack(ctx) {
  // 160×64 canvas, logical 80×32 @ PX=2
  rect(ctx, 0, 0, 80, 32, '#6b4a2a');
  for (let lx = 8; lx < 80; lx += 8) rect(ctx, lx, 0, 1, 32, '#3a2010');
  // Asymmetric peaked roof, peak at x=36
  for (let row = 0; row < 10; row++) {
    const lx = Math.max(0, Math.round(36 - row * 3.8));
    const rr = Math.min(80, Math.round(36 + row * 2.2));
    rect(ctx, lx, row, rr - lx, 1, row % 2 === 0 ? '#3a2010' : '#5a3a1a');
  }
  rect(ctx, 34, 0, 4, 1, '#7a5830');
  rect(ctx, 0, 10, 80, 2, '#3a2010');
  // Broken window left
  rect(ctx, 8, 14, 10, 9, '#0a0810');
  rect(ctx, 8, 14, 1, 9, '#3a2010');
  rect(ctx, 8, 14, 10, 1, '#3a2010');
  rect(ctx, 13, 14, 1, 5, '#2a1a10');
  rect(ctx, 9, 17, 4, 1, '#2a1a10');
  // Broken window right
  rect(ctx, 50, 14, 10, 9, '#0a0810');
  rect(ctx, 50, 14, 1, 9, '#3a2010');
  rect(ctx, 50, 14, 10, 1, '#3a2010');
  rect(ctx, 55, 14, 1, 5, '#2a1a10');
  rect(ctx, 51, 17, 4, 1, '#2a1a10');
  // Central door
  rect(ctx, 36, 20, 8, 12, '#0d0a08');
  rect(ctx, 36, 18, 8, 2, '#3a2010');
  rect(ctx, 36, 18, 1, 14, '#3a2010');
  rect(ctx, 43, 18, 1, 14, '#3a2010');
  // Weathering
  rect(ctx,  3, 18, 2, 1, '#2a1a0a');
  rect(ctx, 28, 25, 3, 1, '#2a1a0a');
  rect(ctx, 65, 20, 1, 2, '#2a1a0a');
  rect(ctx, 18, 28, 4, 1, '#2a1a0a');
}

function drawUpgradeLab(ctx) {
  // 160×64 canvas, logical 80×32 @ PX=2
  // Left pillar
  rect(ctx, 0, 0, 7, 32, '#2a303d');
  rect(ctx, 5, 0, 1, 32, '#006a7a');
  rect(ctx, 0, 0, 7, 1, '#5a6280');
  rect(ctx, 1, 8,  5, 1, '#1a1e28');
  rect(ctx, 1, 16, 5, 1, '#1a1e28');
  rect(ctx, 1, 24, 5, 1, '#1a1e28');
  // Right pillar
  rect(ctx, 72, 0, 8, 32, '#2a303d');
  rect(ctx, 73, 0, 1, 32, '#006a7a');
  rect(ctx, 72, 0, 8, 1, '#5a6280');
  rect(ctx, 73, 8,  5, 1, '#1a1e28');
  rect(ctx, 73, 16, 5, 1, '#1a1e28');
  rect(ctx, 73, 24, 5, 1, '#1a1e28');
  // Ceiling
  rect(ctx, 7, 0, 65, 3, '#1a1e28');
  rect(ctx, 7, 1, 65, 1, '#3a4055');
  // Interior background
  rect(ctx, 7, 3, 65, 29, '#0d0f18');
  // Left terminal
  rect(ctx, 12, 8, 9, 14, '#2a3040');
  rect(ctx, 13, 9, 7, 12, '#001a28');
  rect(ctx, 13, 9, 7, 1, '#00a8cc');
  // Right terminal
  rect(ctx, 58, 8, 9, 14, '#2a3040');
  rect(ctx, 59, 9, 7, 12, '#001a28');
  rect(ctx, 59, 9, 7, 1, '#00a8cc');
  // Central fabricator
  rect(ctx, 34, 7, 12, 17, '#003a4a');
  rect(ctx, 35, 8, 10, 15, '#0d1f3a');
  rect(ctx, 34, 7,  12, 1, '#00ccff');
  rect(ctx, 34, 23, 12, 1, '#00ccff');
  // Antenna
  rect(ctx, 39, 3, 1, 4, '#3a6090');
  // Floor
  rect(ctx, 7, 25, 65, 7, '#151820');
  for (let lx of [16, 24, 32, 40, 48, 56, 64]) rect(ctx, lx, 25, 1, 7, '#1e2230');
  rect(ctx, 7, 25, 65, 1, '#002a30');
  rect(ctx, 7, 26, 65, 1, '#002a30');
}

function drawRepairGarage(ctx) {
  // 128×64 canvas, logical 64×32 @ PX=2 — cyberpunk/martian repair bay
  rect(ctx, 0, 0, 64, 32, '#0e1118');

  // Left pillar
  rect(ctx, 0, 0, 6, 32, '#3a4055');
  rect(ctx, 0, 0, 1, 32, '#7a8590');
  rect(ctx, 5, 0, 1, 32, '#1a1e2a');
  rect(ctx, 1, 8,  4, 1,  '#1a1e2a');
  rect(ctx, 1, 18, 4, 1,  '#1a1e2a');
  px(ctx, 2, 2,  '#7a8a9a'); px(ctx, 4, 2,  '#7a8a9a');
  px(ctx, 2, 28, '#7a8a9a'); px(ctx, 4, 28, '#7a8a9a');
  rect(ctx, 3, 4,  1, 3, '#007a8c'); // cyan accent stripes
  rect(ctx, 3, 13, 1, 4, '#007a8c');
  rect(ctx, 3, 21, 1, 4, '#007a8c');

  // Right pillar
  rect(ctx, 58, 0, 6, 32, '#3a4055');
  rect(ctx, 58, 0, 1, 32, '#7a8590');
  rect(ctx, 63, 0, 1, 32, '#1a1e2a');
  rect(ctx, 58, 8,  5, 1,  '#1a1e2a');
  rect(ctx, 58, 18, 5, 1,  '#1a1e2a');
  px(ctx, 59, 2,  '#7a8a9a'); px(ctx, 61, 2,  '#7a8a9a');
  px(ctx, 59, 28, '#7a8a9a'); px(ctx, 61, 28, '#7a8a9a');
  rect(ctx, 60, 4,  1, 3, '#007a8c');
  rect(ctx, 60, 13, 1, 4, '#007a8c');
  rect(ctx, 60, 21, 1, 4, '#007a8c');
  // Control panel
  rect(ctx, 58, 10, 5, 6, '#0a0d14');
  px(ctx, 59, 12, '#00dd88'); // green LED
  px(ctx, 61, 12, '#ff4422'); // orange LED
  rect(ctx, 59, 14, 3, 1, '#3a4050'); // button

  // Overhead beam
  rect(ctx, 6, 0, 52, 3, '#252a38');
  rect(ctx, 6, 0, 52, 1, '#5a6375');
  rect(ctx, 8, 2, 48, 1, '#3a4050'); // track rail

  // Bay interior
  rect(ctx, 6, 3, 52, 24, '#0a0d14');
  rect(ctx, 8,  3, 48, 1, '#004a58'); // ceiling glow (teal)
  rect(ctx, 12, 3, 40, 1, '#006070');
  rect(ctx, 8, 10, 48, 1, '#141720'); // wall lines
  rect(ctx, 8, 18, 48, 1, '#141720');

  // Hook 1 — J-shape at x=20
  rect(ctx, 20, 3, 1, 9, '#4a5060');
  rect(ctx, 20, 3, 1, 1, '#6a7080');
  rect(ctx, 20, 12, 4, 1, '#4a5060');
  rect(ctx, 23, 12, 1, 3, '#4a5060');
  rect(ctx, 20, 14, 3, 1, '#3a4050');

  // Hook 2 — J-shape at x=40
  rect(ctx, 40, 3, 1, 8, '#4a5060');
  rect(ctx, 40, 3, 1, 1, '#6a7080');
  rect(ctx, 40, 11, 4, 1, '#4a5060');
  rect(ctx, 43, 11, 1, 3, '#4a5060');
  rect(ctx, 40, 13, 3, 1, '#3a4050');

  // Repair floor platform
  rect(ctx, 6,  27, 52, 1, '#003a48');
  rect(ctx, 8,  28, 48, 1, '#005a6c'); // teal glow
  rect(ctx, 6,  29, 52, 3, '#1a2230'); // floor plate
  for (let lx = 10; lx < 57; lx += 7) rect(ctx, lx, 29, 1, 3, '#222a38');

  // Top edge highlight
  rect(ctx, 0, 0, 64, 1, '#8090a0');
}

function drawRepairGarageUpgraded(ctx) {
  // 128×64 canvas, logical 64×32 @ PX=2 — enhanced repair bay with three hooks and energy floor
  rect(ctx, 0, 0, 64, 32, '#080c14');

  // Left pillar
  rect(ctx, 0, 0, 6, 32, '#3a4055');
  rect(ctx, 0, 0, 1, 32, '#7a8590');
  rect(ctx, 5, 0, 1, 32, '#1a1e2a');
  rect(ctx, 1, 8,  4, 1, '#1a1e2a');
  rect(ctx, 1, 18, 4, 1, '#1a1e2a');
  px(ctx, 2, 2,  '#7a8a9a'); px(ctx, 4, 2,  '#7a8a9a');
  px(ctx, 2, 28, '#7a8a9a'); px(ctx, 4, 28, '#7a8a9a');
  rect(ctx, 3, 4,  1, 3, '#00ccee');
  rect(ctx, 3, 13, 1, 4, '#00ccee');
  rect(ctx, 3, 21, 1, 4, '#00ccee');

  // Right pillar
  rect(ctx, 58, 0, 6, 32, '#3a4055');
  rect(ctx, 58, 0, 1, 32, '#7a8590');
  rect(ctx, 63, 0, 1, 32, '#1a1e2a');
  rect(ctx, 58, 8,  5, 1, '#1a1e2a');
  rect(ctx, 58, 18, 5, 1, '#1a1e2a');
  px(ctx, 59, 2,  '#7a8a9a'); px(ctx, 61, 2,  '#7a8a9a');
  px(ctx, 59, 28, '#7a8a9a'); px(ctx, 61, 28, '#7a8a9a');
  rect(ctx, 60, 4,  1, 3, '#00ccee');
  rect(ctx, 60, 13, 1, 4, '#00ccee');
  rect(ctx, 60, 21, 1, 4, '#00ccee');
  // Upgraded control panel — more LEDs
  rect(ctx, 58, 9, 5, 8, '#0a0d14');
  px(ctx, 59, 11, '#00dd88'); px(ctx, 61, 11, '#00dd88');
  px(ctx, 59, 13, '#00ccff'); px(ctx, 61, 13, '#00ccff');
  px(ctx, 59, 15, '#ffd166'); px(ctx, 61, 15, '#ffd166');
  rect(ctx, 59, 17, 3, 1, '#3a4050');

  // Overhead beam with dual-rail track
  rect(ctx, 6, 0, 52, 3, '#252a38');
  rect(ctx, 6, 0, 52, 1, '#7a8a9a');
  rect(ctx, 8, 1, 48, 1, '#3a4050');
  rect(ctx, 8, 2, 48, 1, '#4a5568');

  // Bay interior
  rect(ctx, 6, 3, 52, 24, '#080c14');
  rect(ctx, 8,  3, 48, 1, '#007080');
  rect(ctx, 12, 3, 40, 1, '#009aaa');
  rect(ctx, 8, 10, 48, 1, '#141720');
  rect(ctx, 8, 18, 48, 1, '#141720');

  // Three hooks
  rect(ctx, 16, 3, 1, 9, '#4a5060'); rect(ctx, 16, 3, 1, 1, '#8a9aaa');
  rect(ctx, 16, 12, 4, 1, '#4a5060'); rect(ctx, 19, 12, 1, 3, '#4a5060');
  rect(ctx, 16, 14, 3, 1, '#3a4050');

  rect(ctx, 31, 3, 1, 8, '#4a5060'); rect(ctx, 31, 3, 1, 1, '#8a9aaa');
  rect(ctx, 31, 11, 4, 1, '#4a5060'); rect(ctx, 34, 11, 1, 3, '#4a5060');
  rect(ctx, 31, 13, 3, 1, '#3a4050');

  rect(ctx, 46, 3, 1, 9, '#4a5060'); rect(ctx, 46, 3, 1, 1, '#8a9aaa');
  rect(ctx, 46, 12, 4, 1, '#4a5060'); rect(ctx, 49, 12, 1, 3, '#4a5060');
  rect(ctx, 46, 14, 3, 1, '#3a4050');

  // Horizontal energy scan line mid-bay
  rect(ctx, 8, 20, 48, 1, '#003a50');
  rect(ctx, 10, 20, 44, 1, '#006888');

  // Repair floor platform with bright energy glow
  rect(ctx, 6,  27, 52, 1, '#005a6a');
  rect(ctx, 8,  28, 48, 1, '#00aacc');
  rect(ctx, 6,  29, 52, 3, '#1a2230');
  for (let lx = 10; lx < 57; lx += 7) rect(ctx, lx, 29, 1, 3, '#222a38');

  // Top edge highlight
  rect(ctx, 0, 0, 64, 1, '#a0b8c8');
}

function drawCreditShack(ctx) {
  // 160×64 canvas, logical 80×32 @ PX=2 — dilapidated shack with faded coin motif
  rect(ctx, 0, 0, 80, 32, '#6b4a2a');
  for (let lx = 8; lx < 80; lx += 8) rect(ctx, lx, 0, 1, 32, '#3a2010');
  // Asymmetric peaked roof, peak at x=40
  for (let row = 0; row < 10; row++) {
    const lx = Math.max(0, Math.round(40 - row * 4.0));
    const rr = Math.min(80, Math.round(40 + row * 2.5));
    rect(ctx, lx, row, rr - lx, 1, row % 2 === 0 ? '#3a2010' : '#5a3a1a');
  }
  rect(ctx, 38, 0, 4, 1, '#7a5830');
  rect(ctx, 0, 10, 80, 2, '#3a2010');
  // Broken window left
  rect(ctx, 6, 14, 10, 9, '#0a0810');
  rect(ctx, 6, 14, 1, 9, '#3a2010');
  rect(ctx, 6, 14, 10, 1, '#3a2010');
  rect(ctx, 10, 14, 1, 5, '#2a1a10');
  // Faded "$" sign in window — two horizontal bars + vertical stroke
  rect(ctx, 7, 16, 7, 1, '#3a2a0a');
  rect(ctx, 7, 19, 7, 1, '#3a2a0a');
  rect(ctx, 10, 15, 1, 6, '#3a2a0a');
  // Broken window right
  rect(ctx, 60, 14, 10, 9, '#0a0810');
  rect(ctx, 60, 14, 1, 9, '#3a2010');
  rect(ctx, 60, 14, 10, 1, '#3a2010');
  rect(ctx, 65, 14, 1, 5, '#2a1a10');
  rect(ctx, 61, 17, 4, 1, '#2a1a10');
  // Central door
  rect(ctx, 36, 20, 8, 12, '#0d0a08');
  rect(ctx, 36, 18, 8, 2, '#3a2010');
  rect(ctx, 36, 18, 1, 14, '#3a2010');
  rect(ctx, 43, 18, 1, 14, '#3a2010');
  // Weathering
  rect(ctx,  3, 18, 2, 1, '#2a1a0a');
  rect(ctx, 28, 25, 3, 1, '#2a1a0a');
  rect(ctx, 70, 20, 1, 2, '#2a1a0a');
  rect(ctx, 18, 28, 4, 1, '#2a1a0a');
}

function drawCreditStore(ctx) {
  // 160×64 canvas, logical 80×32 @ PX=2 — gilded storefront
  rect(ctx, 0, 0, 80, 32, '#1a1208');
  // Façade base: warm dark gold
  rect(ctx, 0, 0, 80, 32, '#2a1e08');
  // Top molding band (gold)
  rect(ctx, 0, 0, 80, 4, '#b8860b');
  rect(ctx, 0, 0, 80, 1, '#ffe899');
  rect(ctx, 0, 3, 80, 1, '#8a6208');
  // Mid-height molding
  rect(ctx, 0, 14, 80, 2, '#b8860b');
  rect(ctx, 0, 14, 80, 1, '#ffd166');
  rect(ctx, 0, 15, 80, 1, '#8a6208');
  // Left column
  rect(ctx, 0, 0, 7, 32, '#b8860b');
  rect(ctx, 0, 0, 1, 32, '#ffe899');
  rect(ctx, 6, 0, 1, 32, '#8a6208');
  rect(ctx, 2, 6, 3, 1, '#8a6208');
  rect(ctx, 2, 14, 3, 1, '#8a6208');
  rect(ctx, 2, 22, 3, 1, '#8a6208');
  // Right column
  rect(ctx, 73, 0, 7, 32, '#b8860b');
  rect(ctx, 73, 0, 1, 32, '#ffe899');
  rect(ctx, 79, 0, 1, 32, '#8a6208');
  rect(ctx, 74, 6, 3, 1, '#8a6208');
  rect(ctx, 74, 14, 3, 1, '#8a6208');
  rect(ctx, 74, 22, 3, 1, '#8a6208');
  // Display window — large bright glow
  rect(ctx, 10, 5, 28, 22, '#8a6208');
  rect(ctx, 11, 6, 26, 20, '#fff9e0');
  rect(ctx, 11, 6, 26, 3, '#fffdf5');
  rect(ctx, 11, 6, 3, 20, '#fffdf5');
  // Gold coin stack above window
  rect(ctx, 20, 3, 8, 2, '#ffd166');
  rect(ctx, 21, 2, 6, 1, '#ffd166');
  rect(ctx, 22, 1, 4, 1, '#ffe899');
  rect(ctx, 23, 1, 2, 1, '#fff9cc');
  // "$" sign in window center
  rect(ctx, 22, 10, 6, 1, '#b8860b');
  rect(ctx, 22, 13, 6, 1, '#b8860b');
  rect(ctx, 24, 8, 1, 8, '#b8860b');
  // Right display window
  rect(ctx, 42, 5, 28, 22, '#8a6208');
  rect(ctx, 43, 6, 26, 20, '#fff9e0');
  rect(ctx, 43, 6, 26, 3, '#fffdf5');
  rect(ctx, 43, 6, 3, 20, '#fffdf5');
  // Second coin stack
  rect(ctx, 52, 3, 8, 2, '#ffd166');
  rect(ctx, 53, 2, 6, 1, '#ffd166');
  // Door between columns
  rect(ctx, 37, 18, 6, 14, '#1a1208');
  rect(ctx, 37, 16, 6, 2, '#b8860b');
  rect(ctx, 37, 16, 1, 16, '#b8860b');
  rect(ctx, 42, 16, 1, 16, '#b8860b');
  // Door knob
  rect(ctx, 39, 24, 1, 1, '#ffd166');
  // Top edge highlight
  rect(ctx, 0, 0, 80, 1, '#ffe899');
  // Floor line
  rect(ctx, 0, 31, 80, 1, '#8a6208');
}

export function buildSprites() {
  const sprites = {
    tiles: {},
    digger: {},
    gasPump: null,
    gasPumpUpgraded: null,
    spawnFlag: null,
    oreShack: null,
    oreStorage: null,
    oreStorageUpgraded: null,
    orePad: null,
    repairShack: null,
    repairGarage: null,
    repairGarageUpgraded: null,
    upgradeShack: null,
    upgradeLab: null,
    creditShack: null,
    creditStore: null,
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

  // Upgraded gas pump — two pumps side by side (64×64)
  const pumpUpC = makeCanvas(64);
  const pumpUpCtx = pumpUpC.getContext('2d');
  pumpUpCtx.imageSmoothingEnabled = false;
  drawGasPumpUpgraded(pumpUpCtx);
  sprites.gasPumpUpgraded = pumpUpC;

  // Ore shack (192×64, 96×32 logical @ PX=2)
  const shackC = document.createElement('canvas');
  shackC.width = 192; shackC.height = 64;
  const shackCtx = shackC.getContext('2d');
  shackCtx.imageSmoothingEnabled = false;
  drawOreShack(shackCtx);
  sprites.oreShack = shackC;

  // Ore storage bin (64×64, 32×32 logical @ PX=2)
  const storageC = makeCanvas(64);
  const storageCtx = storageC.getContext('2d');
  storageCtx.imageSmoothingEnabled = false;
  drawOreStorage(storageCtx);
  sprites.oreStorage = storageC;

  // Upgraded ore storage (64×64, 32×32 logical @ PX=2)
  const storageUpC = makeCanvas(64);
  const storageUpCtx = storageUpC.getContext('2d');
  storageUpCtx.imageSmoothingEnabled = false;
  drawOreStorageUpgraded(storageUpCtx);
  sprites.oreStorageUpgraded = storageUpC;

  // Landing pad (128×64, 64×32 logical @ PX=2)
  const padC = document.createElement('canvas');
  padC.width = 128; padC.height = 64;
  const padCtx = padC.getContext('2d');
  padCtx.imageSmoothingEnabled = false;
  drawOrePad(padCtx);
  sprites.orePad = padC;

  // Repair shack (128×64, 64×32 logical @ PX=2)
  const repairShackC = document.createElement('canvas');
  repairShackC.width = 128; repairShackC.height = 64;
  const repairShackCtx = repairShackC.getContext('2d');
  repairShackCtx.imageSmoothingEnabled = false;
  drawRepairShack(repairShackCtx);
  sprites.repairShack = repairShackC;

  // Repair garage (128×64, 64×32 logical @ PX=2)
  const repairGarageC = document.createElement('canvas');
  repairGarageC.width = 128; repairGarageC.height = 64;
  const repairGarageCtx = repairGarageC.getContext('2d');
  repairGarageCtx.imageSmoothingEnabled = false;
  drawRepairGarage(repairGarageCtx);
  sprites.repairGarage = repairGarageC;

  // Upgraded repair garage (128×64, 64×32 logical @ PX=2)
  const repairGarageUpC = document.createElement('canvas');
  repairGarageUpC.width = 128; repairGarageUpC.height = 64;
  const repairGarageUpCtx = repairGarageUpC.getContext('2d');
  repairGarageUpCtx.imageSmoothingEnabled = false;
  drawRepairGarageUpgraded(repairGarageUpCtx);
  sprites.repairGarageUpgraded = repairGarageUpC;

  // Upgrade shack (160×64, 80×32 logical @ PX=2)
  const upgradeShackC = document.createElement('canvas');
  upgradeShackC.width = 160; upgradeShackC.height = 64;
  const upgradeShackCtx = upgradeShackC.getContext('2d');
  upgradeShackCtx.imageSmoothingEnabled = false;
  drawUpgradeShack(upgradeShackCtx);
  sprites.upgradeShack = upgradeShackC;

  // Upgrade lab (160×64, 80×32 logical @ PX=2)
  const upgradeLabC = document.createElement('canvas');
  upgradeLabC.width = 160; upgradeLabC.height = 64;
  const upgradeLabCtx = upgradeLabC.getContext('2d');
  upgradeLabCtx.imageSmoothingEnabled = false;
  drawUpgradeLab(upgradeLabCtx);
  sprites.upgradeLab = upgradeLabC;

  // Credit shack (160×64, 80×32 logical @ PX=2)
  const creditShackC = document.createElement('canvas');
  creditShackC.width = 160; creditShackC.height = 64;
  const creditShackCtx = creditShackC.getContext('2d');
  creditShackCtx.imageSmoothingEnabled = false;
  drawCreditShack(creditShackCtx);
  sprites.creditShack = creditShackC;

  // Credit store (160×64, 80×32 logical @ PX=2)
  const creditStoreC = document.createElement('canvas');
  creditStoreC.width = 160; creditStoreC.height = 64;
  const creditStoreCtx = creditStoreC.getContext('2d');
  creditStoreCtx.imageSmoothingEnabled = false;
  drawCreditStore(creditStoreCtx);
  sprites.creditStore = creditStoreC;

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
