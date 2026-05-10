// Upgrade tables — single source of truth for all attachments and their tiers.
// Each attachment has tiers[0] as the free starter; later tiers list a `cost`
// object of { oreKey: count }. Stat fields differ per attachment but are
// always plain numbers so they're easy to scan.

export const UPGRADES = {
  // power: drill-rate multiplier; drillTier: max ore tier breakable.
  drill: [
    { name: 'Iron Drill',          power: 1.0, drillTier: 1, cost: null },
    { name: 'Steel Drill',         power: 1.4, drillTier: 2, cost: { copper: 8,  iron: 8 },                                         credits: 150 },
    { name: 'Tungsten-Carbide',    power: 1.8, drillTier: 3, cost: { iron: 12, silver: 6,  gold: 4 },                               credits: 500 },
    { name: 'Diamond-Tipped',      power: 2.3, drillTier: 4, cost: { gold: 8,  platinum: 4, cobalt: 4 },                            credits: 1500 },
    { name: 'Plasma Cutter',       power: 3.0, drillTier: 5, cost: { cobalt: 6, ruby: 4, emerald: 4 },                              credits: 4000 },
    { name: 'Quantum Drill',       power: 4.0, drillTier: 6, cost: { ruby: 6, emerald: 6, tungsten: 4, diamond: 2 },                credits: 10000 },
  ],

  // capacity: max fuel units. 7 tiers (extra one between Stock and Reserve).
  fuelTank: [
    { name: 'Stock Tank',          capacity: 100,  cost: null },
    { name: 'Small Tank',          capacity: 180,  cost: { copper: 6 },                                                             credits: 80 },
    { name: 'Reserve Tank',        capacity: 320,  cost: { copper: 12, iron: 6 },                                                   credits: 220 },
    { name: 'Twin Tank',           capacity: 500,  cost: { iron: 16, silver: 4 },                                                   credits: 550 },
    { name: 'Heavy Tank',          capacity: 750,  cost: { silver: 10, gold: 6 },                                                   credits: 1300 },
    { name: 'Aux Reactor',         capacity: 1100, cost: { gold: 10, platinum: 4 },                                                 credits: 3200 },
    { name: 'Fusion Cell',         capacity: 1600, cost: { platinum: 8, cobalt: 6, diamond: 1 },                                    credits: 8000 },
  ],

  // hp: max hull points.
  hull: [
    { name: 'Tin Frame',           hp: 100, cost: null },
    { name: 'Steel Frame',         hp: 175, cost: { copper: 10, iron: 10 },                                                         credits: 200 },
    { name: 'Reinforced Frame',    hp: 280, cost: { iron: 18, silver: 6 },                                                          credits: 650 },
    { name: 'Titanium Frame',      hp: 420, cost: { silver: 12, gold: 8, platinum: 2 },                                             credits: 1600 },
    { name: 'Composite Frame',     hp: 620, cost: { gold: 12, platinum: 6, cobalt: 4 },                                             credits: 4000 },
    { name: 'Adamantium Frame',    hp: 900, cost: { cobalt: 8, ruby: 4, tungsten: 4 },                                              credits: 9500 },
  ],

  // reduction: fraction of incoming damage reduced (0..1).
  thermal: [
    { name: 'No Insulation',       reduction: 0.00, cost: null },
    { name: 'Asbestos Pad',        reduction: 0.10, cost: { copper: 6, iron: 4 },                                                   credits: 100 },
    { name: 'Heat Shield',         reduction: 0.20, cost: { iron: 10, silver: 6 },                                                  credits: 380 },
    { name: 'Ceramic Plating',     reduction: 0.35, cost: { silver: 8, gold: 6 },                                                   credits: 950 },
    { name: 'Cryo Coating',        reduction: 0.50, cost: { gold: 8, platinum: 4, emerald: 2 },                                     credits: 2600 },
    { name: 'Thermo Aegis',        reduction: 0.65, cost: { platinum: 6, cobalt: 6, ruby: 3 },                                      credits: 6500 },
  ],

  // capacity: cargo weight units the bay can hold.
  storage: [
    { name: 'Small Bay',           capacity: 25,  cost: null },
    { name: 'Standard Bay',        capacity: 45,  cost: { copper: 8, iron: 4 },                                                     credits: 120 },
    { name: 'Cargo Hold',          capacity: 75,  cost: { iron: 12, silver: 4 },                                                    credits: 420 },
    { name: 'Expanded Hold',       capacity: 115, cost: { silver: 8, gold: 6 },                                                     credits: 1100 },
    { name: 'Mega Hold',           capacity: 170, cost: { gold: 10, platinum: 4, emerald: 2 },                                      credits: 2800 },
    { name: 'Quantum Storage',     capacity: 240, cost: { platinum: 8, cobalt: 4, emerald: 4, diamond: 1 },                         credits: 7000 },
  ],

  // lateralMax: px/s lateral cap; thrust: px/s^2 upward when thrusting.
  engine: [
    { name: 'Stock Engine',        lateralMax: 240, thrust: 1500, cost: null },
    { name: 'Tuned V4',            lateralMax: 290, thrust: 1800, cost: { copper: 8, iron: 6 },                                     credits: 180 },
    { name: 'Turbo V6',            lateralMax: 350, thrust: 2150, cost: { iron: 12, silver: 6 },                                    credits: 580 },
    { name: 'Twin Turbo',          lateralMax: 420, thrust: 2500, cost: { silver: 8, gold: 6, cobalt: 2 },                          credits: 1450 },
    { name: 'Hyper Drive',         lateralMax: 500, thrust: 3000, cost: { gold: 8, platinum: 6, ruby: 2 },                          credits: 3700 },
    { name: 'Antimatter Engine',   lateralMax: 600, thrust: 3600, cost: { platinum: 6, cobalt: 8, ruby: 4, diamond: 1 },            credits: 9500 },
  ],

  // capacity: max credits the player can hold.
  wallet: [
    { name: 'Coin Purse',     capacity:    500, cost: null },
    { name: 'Leather Wallet', capacity:   1500, cost: { copper: 8,  iron: 4 },                                                      credits: 100 },
    { name: 'Money Clip',     capacity:   4000, cost: { iron: 8,   silver: 6 },                                                     credits: 320 },
    { name: 'Cash Roll',      capacity:  10000, cost: { silver: 8,  gold: 4 },                                                      credits: 850 },
    { name: 'Safe Deposit',   capacity:  30000, cost: { gold: 6,   platinum: 4 },                                                   credits: 2100 },
    { name: 'Credit Chip',    capacity: 100000, cost: { cobalt: 6,  ruby: 4 },                                                      credits: 5200 },
    { name: 'Quantum Vault',  capacity: 500000, cost: { diamond: 4, tungsten: 6 },                                                  credits: 16000 },
  ],

  // range: tiles around the digger where ores are highlighted.
  // colorCode: highlight rare ores with a colored ring.
  // valuePreview: show $ value floating over revealed ores.
  radar: [
    { name: 'No Radar',            range: 0,  colorCode: false, valuePreview: false, cost: null },
    { name: 'Pinger',              range: 4,  colorCode: false, valuePreview: false, cost: { copper: 6, iron: 4 },                  credits: 130 },
    { name: 'Sonic Radar',         range: 8,  colorCode: false, valuePreview: false, cost: { iron: 10, silver: 4 },                 credits: 420 },
    { name: 'Geo Scanner',         range: 14, colorCode: false, valuePreview: false, cost: { silver: 8, gold: 6 },                  credits: 1050 },
    { name: 'Deep Probe',          range: 22, colorCode: true,  valuePreview: false, cost: { gold: 10, platinum: 4, emerald: 2 },   credits: 2900 },
    { name: 'Quantum Lens',        range: 32, colorCode: true,  valuePreview: true,  cost: { platinum: 8, cobalt: 4, ruby: 4, diamond: 1 }, credits: 8500 },
  ],
};

// ---- Gas station pricing hook ----
// MVP: gas is free. Future: vary by depth, distance from home, station tier, etc.
// Inputs:
//   amount      — fuel units about to be dispensed this tick
//   ctx         — { digger, world, station } context for future logic
// Returns total $ cost (number).
export const GAS_PRICE_PER_UNIT = 1;

export function gasPriceFor(amount, _ctx) {
  return amount * GAS_PRICE_PER_UNIT;
}

// Helper for future shop UI: check whether the player's cargo currently
// contains enough materials to craft a given upgrade tier.
export function canAfford(cargo, tier) {
  if (!tier?.cost) return true;
  for (const [key, count] of Object.entries(tier.cost)) {
    if ((cargo.get(key) ?? 0) < count) return false;
  }
  return true;
}
