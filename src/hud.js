export class HUD {
  constructor() {
    this.depth = document.getElementById('hud-depth');
    this.fuel = document.getElementById('hud-fuel');
    this.fuelVal = document.getElementById('hud-fuel-val');
    this.hull = document.getElementById('hud-hull');
    this.hullVal = document.getElementById('hud-hull-val');
    this.cargo = document.getElementById('hud-cargo');
    this.cargoVal = document.getElementById('hud-cargo-val');
    this.money = document.getElementById('hud-money');
    this.banner = document.getElementById('banner');
  }

  update(digger, world) {
    const depthM = world.depthMeters(digger.y);
    this.depth.textContent = depthM > 0 ? `-${depthM} m` : `${-depthM} m`;
    this.fuel.style.width = `${(digger.fuel / digger.maxFuel) * 100}%`;
    this.fuelVal.textContent = `${Math.round(digger.fuel)} / ${digger.maxFuel}`;
    this.hull.style.width = `${(digger.hull / digger.maxHull) * 100}%`;
    this.hullVal.textContent = `${Math.round(digger.hull)} / ${digger.maxHull}`;
    this.cargo.style.width = `${(digger.cargoUsed / digger.maxCargo) * 100}%`;
    this.cargoVal.textContent = `${digger.cargoUsed} / ${digger.maxCargo}`;
    this.money.textContent = `$${digger.money.toFixed(2)}`;
  }

  showBanner(text, sub) {
    this.banner.innerHTML = `${text}${sub ? `<span class="sub">${sub}</span>` : ''}`;
    this.banner.classList.remove('hidden');
  }

  hideBanner() {
    this.banner.classList.add('hidden');
  }
}
