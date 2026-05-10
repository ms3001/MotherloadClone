// Tile IDs. Keep contiguous; ores start at ORE_OFFSET.
export const TILE = {
  SKY: 0,
  DIRT: 1,
  STONE: 2,
  HARDSTONE: 3,
  BEDROCK: 4,
};

export const ORE_OFFSET = 16;

// Ores ordered by rarity (shallowest/most-common first).
// depthMin/Max are in tile rows (0 = surface row, world height = bottom).
// hardness: time multiplier for drilling (higher = slower).
// drillTier: minimum drill tier required to break this ore (1 = starter).
// weight: cargo slots consumed per unit.
// value: $ per unit.
// color: base sprite color.
// accent: highlight color for the gem facet.
export const ORES = [
  { id: ORE_OFFSET + 0, key: 'copper',   name: 'Copper',   depthMin: 8,    depthMax: 600,   hardness: 1.0, drillTier: 1, weight: 1, value: 30,    color: '#c87533', accent: '#f0a060', frequency: 0.040 },
  { id: ORE_OFFSET + 1, key: 'iron',     name: 'Iron',     depthMin: 200,  depthMax: 1600,  hardness: 1.2, drillTier: 1, weight: 1, value: 60,    color: '#9aa0a8', accent: '#d6dae0', frequency: 0.030 },
  { id: ORE_OFFSET + 2, key: 'silver',   name: 'Silver',   depthMin: 800,  depthMax: 3000,  hardness: 1.4, drillTier: 1, weight: 1, value: 150,   color: '#cfd8e3', accent: '#ffffff', frequency: 0.018 },
  { id: ORE_OFFSET + 3, key: 'gold',     name: 'Gold',     depthMin: 1500, depthMax: 4500,  hardness: 1.6, drillTier: 1, weight: 2, value: 350,   color: '#e8c84a', accent: '#fff2a8', frequency: 0.012 },
  { id: ORE_OFFSET + 4, key: 'platinum', name: 'Platinum', depthMin: 2800, depthMax: 6000,  hardness: 2.0, drillTier: 2, weight: 2, value: 750,   color: '#bcd3df', accent: '#eaf6ff', frequency: 0.008 },
  { id: ORE_OFFSET + 5, key: 'cobalt',   name: 'Cobalt',   depthMin: 4000, depthMax: 7500,  hardness: 2.4, drillTier: 2, weight: 2, value: 1400,  color: '#3a6ed4', accent: '#7fb0ff', frequency: 0.006 },
  { id: ORE_OFFSET + 6, key: 'ruby',     name: 'Ruby',     depthMin: 5500, depthMax: 9000,  hardness: 2.8, drillTier: 3, weight: 3, value: 2800,  color: '#d23b58', accent: '#ff8aa0', frequency: 0.004 },
  { id: ORE_OFFSET + 7, key: 'emerald',  name: 'Emerald',  depthMin: 7000, depthMax: 10500, hardness: 3.2, drillTier: 3, weight: 3, value: 5200,  color: '#2fbf71', accent: '#7df5b2', frequency: 0.003 },
  { id: ORE_OFFSET + 8, key: 'tungsten', name: 'Tungsten', depthMin: 8500, depthMax: 11500, hardness: 4.0, drillTier: 4, weight: 3, value: 9000,  color: '#5a6068', accent: '#a0a8b2', frequency: 0.0022 },
  { id: ORE_OFFSET + 9, key: 'diamond',  name: 'Diamond',  depthMin: 9500, depthMax: 11900, hardness: 5.0, drillTier: 5, weight: 4, value: 18000, color: '#b8f0ff', accent: '#ffffff', frequency: 0.0015 },
];

export const ORE_BY_ID = new Map(ORES.map(o => [o.id, o]));

export function isOre(tileId) {
  return tileId >= ORE_OFFSET;
}

// Hardness for non-ore tiles (drill time multipliers).
export const TILE_HARDNESS = {
  [TILE.DIRT]: 0.6,
  [TILE.STONE]: 1.4,
  [TILE.HARDSTONE]: 2.6,
};

export function tileHardness(tileId) {
  if (isOre(tileId)) return ORE_BY_ID.get(tileId).hardness;
  return TILE_HARDNESS[tileId] ?? Infinity;
}

export function tileDrillTier(tileId) {
  if (isOre(tileId)) return ORE_BY_ID.get(tileId).drillTier;
  if (tileId === TILE.HARDSTONE) return 2;
  return 1;
}

export function isSolid(tileId) {
  return tileId !== TILE.SKY;
}

export function isDrillable(tileId) {
  return tileId !== TILE.SKY && tileId !== TILE.BEDROCK;
}
