import { ORES } from './ores.js';
import { UPGRADES } from './upgrades.js';

const RARITY_COLORS = [
  '#c0c4cc', // 0 — light grey (stock)
  '#6a6e78', // 1 — dark grey
  '#3cb371', // 2 — green
  '#4a90d9', // 3 — blue
  '#9966cc', // 4 — purple
  '#ffd166', // 5 — gold (sparkle)
  '#e63946', // 6 — red  (sparkle)
];
const SPARKLE_TIERS = new Set([5, 6]);
const DRILLER_SLOTS = ['drill', 'fuelTank', 'hull', 'thermal', 'storage', 'engine', 'radar'];
const ORE_BY_KEY = new Map(ORES.map(o => [o.key, o]));

function slotLabel(key) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
}

function tierIndexOf(slot, equipped) {
  const idx = (UPGRADES[slot] ?? []).indexOf(equipped);
  return idx === -1 ? 0 : idx;
}

export class Inventory {
  constructor() {
    this.panel       = document.getElementById('inventory');
    this.cargoList   = document.getElementById('inv-cargo-list');
    this.cargoFooter = document.getElementById('inv-cargo-footer');
    this.drillerList = document.getElementById('inv-driller-list');
    this.visible     = false;
  }

  toggle() {
    this.visible = !this.visible;
    this.panel.classList.toggle('hidden', !this.visible);
  }

  update(digger) {
    if (!this.visible) return;
    this._updateCargo(digger);
    this._updateDriller(digger);
  }

  _updateCargo(digger) {
    let html = '';
    let totalValue = 0;
    for (const [key, count] of digger.cargo) {
      const ore = ORE_BY_KEY.get(key);
      if (!ore) continue;
      const value = ore.value * count;
      totalValue += value;
      html +=
        `<div class="inv-row">` +
        `<div class="inv-swatch" style="background:${ore.color}"></div>` +
        `<span class="inv-name">${ore.name}</span>` +
        `<span class="inv-count">\xd7${count}</span>` +
        `<span class="inv-weight">${ore.weight * count} wt</span>` +
        `<span class="inv-value">$${value}</span>` +
        `</div>`;
    }
    this.cargoList.innerHTML = html || '<div class="inv-empty">Empty</div>';
    this.cargoFooter.textContent =
      `Weight: ${digger.cargoUsed} / ${digger.maxCargo}   •   Value: $${totalValue}`;
  }

  _updateDriller(digger) {
    let html = '';
    for (const slot of DRILLER_SLOTS) {
      const equipped = digger.attachments[slot];
      const tierIdx  = tierIndexOf(slot, equipped);
      const color    = RARITY_COLORS[Math.min(tierIdx, RARITY_COLORS.length - 1)];
      const sparkle  = SPARKLE_TIERS.has(tierIdx) ? ' sparkle' : '';
      html +=
        `<div class="inv-row">` +
        `<div class="inv-swatch${sparkle}" style="background:${color}"></div>` +
        `<span class="inv-slot-label">${slotLabel(slot)}</span>` +
        `<span class="inv-part-name">${equipped?.name ?? '—'}</span>` +
        `</div>`;
    }
    this.drillerList.innerHTML = html;
  }
}
