export class HUD {
  constructor() {
    this.depth = document.getElementById('hud-depth');
    this.fuel = document.getElementById('hud-fuel');
    this.hull = document.getElementById('hud-hull');
    this.cargo = document.getElementById('hud-cargo');
    this.value = document.getElementById('hud-value');
    this.banner = document.getElementById('banner');
  }

  update(digger, world) {
    const depthM = world.depthMeters(digger.y);
    this.depth.textContent = `${depthM} m`;
    this.fuel.style.width = `${(digger.fuel / digger.maxFuel) * 100}%`;
    this.hull.style.width = `${(digger.hull / digger.maxHull) * 100}%`;
    this.cargo.textContent = `${digger.cargoUsed} / ${digger.maxCargo}`;
    this.value.textContent = `$${digger.cargoValue().toLocaleString()}`;
  }

  showBanner(text, sub) {
    this.banner.innerHTML = `${text}${sub ? `<span class="sub">${sub}</span>` : ''}`;
    this.banner.classList.remove('hidden');
  }

  hideBanner() {
    this.banner.classList.add('hidden');
  }
}
