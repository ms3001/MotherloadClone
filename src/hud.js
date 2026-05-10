export class HUD {
  constructor() {
    this.depth = document.getElementById('hud-depth');
    this.fuel = document.getElementById('hud-fuel');
    this.fuelVal = document.getElementById('hud-fuel-val');
    this.hull = document.getElementById('hud-hull');
    this.hullVal = document.getElementById('hud-hull-val');
    this.cargo = document.getElementById('hud-cargo');
    this.cargoVal = document.getElementById('hud-cargo-val');
    this.moneyFill = document.getElementById('hud-money');
    this.moneyVal  = document.getElementById('hud-money-val');
    this.banner = document.getElementById('banner');
  }

  _updateBar(fill, val, current, max) {
    fill.style.width = `${(current / max) * 100}%`;
    val.textContent = `${Math.round(current)} / ${max}`;
  }

  update(digger, world, dt = 0) {
    const depthM = world.depthMeters(digger.y);
    this.depth.textContent = depthM > 0 ? `-${depthM} m` : `${-depthM} m`;
    this._updateBar(this.fuel, this.fuelVal, digger.fuel, digger.maxFuel);
    this._updateBar(this.hull, this.hullVal, digger.hull, digger.maxHull);
    this._updateBar(this.cargo, this.cargoVal, digger.cargoUsed, digger.maxCargo);
    this._updateBar(this.moneyFill, this.moneyVal, Math.floor(digger.money), digger.maxMoney);
    if (this._bannerTimer > 0) {
      this._bannerTimer -= dt;
      if (this._bannerTimer <= 0) this.hideBanner();
    }
  }

  showBanner(text, sub, duration = null) {
    this.banner.innerHTML = `${text}${sub ? `<span class="sub">${sub}</span>` : ''}`;
    this.banner.classList.remove('hidden');
    this._bannerTimer = duration ?? 0;
  }

  hideBanner() {
    this.banner.classList.add('hidden');
  }
}
