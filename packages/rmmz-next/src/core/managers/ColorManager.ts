import type { Game_BattlerBase } from '../objects/Game_BattlerBase'
import type { Bitmap } from '../primitives'
import { ImageManager } from './ImageManager'

/**
 * ColorManager
 *
 * The static class that handles the window colors.
 */
export class ColorManager {
  constructor() {
    throw new Error('This is a static class')
  }

  static _windowskin: Bitmap

  static loadWindowskin(): void {
    this._windowskin = ImageManager.loadSystem('Window')
  }

  static textColor(n: number): string {
    const px = 96 + (n % 8) * 12 + 6
    const py = 144 + Math.floor(n / 8) * 12 + 6
    return this._windowskin.getPixel(px, py)
  }

  static normalColor(): string {
    return this.textColor(0)
  }

  static systemColor(): string {
    return this.textColor(16)
  }

  static crisisColor(): string {
    return this.textColor(17)
  }

  static deathColor(): string {
    return this.textColor(18)
  }

  static gaugeBackColor(): string {
    return this.textColor(19)
  }

  static hpGaugeColor1(): string {
    return this.textColor(20)
  }

  static hpGaugeColor2(): string {
    return this.textColor(21)
  }

  static mpGaugeColor1(): string {
    return this.textColor(22)
  }

  static mpGaugeColor2(): string {
    return this.textColor(23)
  }

  static mpCostColor(): string {
    return this.textColor(23)
  }

  static powerUpColor(): string {
    return this.textColor(24)
  }

  static powerDownColor(): string {
    return this.textColor(25)
  }

  static ctGaugeColor1(): string {
    return this.textColor(26)
  }

  static ctGaugeColor2(): string {
    return this.textColor(27)
  }

  static tpGaugeColor1(): string {
    return this.textColor(28)
  }

  static tpGaugeColor2(): string {
    return this.textColor(29)
  }

  static tpCostColor(): string {
    return this.textColor(29)
  }

  static pendingColor(): string {
    return this._windowskin.getPixel(120, 120)
  }

  static hpColor(actor?: Game_BattlerBase | null): string {
    if (!actor) {
      return this.normalColor()
    }
    else if (actor.isDead()) {
      return this.deathColor()
    }
    else if (actor.isDying()) {
      return this.crisisColor()
    }
    else {
      return this.normalColor()
    }
  }

  static mpColor(_actor?: Game_BattlerBase | null): string {
    return this.normalColor()
  }

  static tpColor(_actor?: Game_BattlerBase | null): string {
    return this.normalColor()
  }

  static paramchangeTextColor(change: number): string {
    if (change > 0) {
      return this.powerUpColor()
    }
    else if (change < 0) {
      return this.powerDownColor()
    }
    else {
      return this.normalColor()
    }
  }

  static damageColor(colorType: number): string {
    switch (colorType) {
      case 0: // HP damage
        return '#ffffff'
      case 1: // HP recover
        return '#b9ffb5'
      case 2: // MP damage
        return '#ffff90'
      case 3: // MP recover
        return '#80b0ff'
      default:
        return '#808080'
    }
  }

  static outlineColor(): string {
    return 'rgba(0, 0, 0, 0.6)'
  }

  static dimColor1(): string {
    return 'rgba(0, 0, 0, 0.6)'
  }

  static dimColor2(): string {
    return 'rgba(0, 0, 0, 0)'
  }

  static itemBackColor1(): string {
    return 'rgba(32, 32, 32, 0.5)'
  }

  static itemBackColor2(): string {
    return 'rgba(0, 0, 0, 0.5)'
  }
}
