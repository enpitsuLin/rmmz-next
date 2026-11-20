import type { Game_Actor } from '../objects/Game_Actor'
import type { Rectangle, Sprite } from '../primitives'
import { BattleManager } from '../managers/BattleManager'
import { ColorManager } from '../managers/ColorManager'
import { GlobalMananger } from '../managers/GlobalManager'
import { ImageManager } from '../managers/ImageManager'
import { TextManager } from '../managers/TextManager'
import { Sprite_Gauge, Sprite_Name, Sprite_StateIcon } from '../sprites'
import { Window_Selectable } from './Window_Selectable'

/**
 * Window_StatusBase
 *
 * The superclass of windows for displaying actor status.
 */
export class Window_StatusBase extends Window_Selectable {
  _additionalSprites: Record<string, Sprite>

  constructor(rect: Rectangle.Shape) {
    super(rect)
    this._additionalSprites = {}
    this.loadFaceImages()
  }

  loadFaceImages(): void {
    for (const actor of GlobalMananger.$gameParty.members()) {
      ImageManager.loadFace(actor.faceName())
    }
  }

  refresh(): void {
    this.hideAdditionalSprites()
    super.refresh()
  }

  hideAdditionalSprites(): void {
    for (const sprite of Object.values(this._additionalSprites)) {
      sprite.hide()
    }
  }

  placeActorName(actor: Game_Actor, x: number, y: number): void {
    const key = `actor${actor.actorId()}-name`
    const sprite = this.createInnerSprite(key, Sprite_Name)
    sprite.setup(actor)
    sprite.move(x, y)
    sprite.show()
  }

  placeStateIcon(actor: Game_Actor, x: number, y: number): void {
    const key = `actor${actor.actorId()}-stateIcon`
    const sprite = this.createInnerSprite(key, Sprite_StateIcon)
    sprite.setup(actor)
    sprite.move(x, y)
    sprite.show()
  }

  placeGauge(actor: Game_Actor, type: Window_StatusBase.GaugeType, x: number, y: number): void {
    const key = `actor${actor.actorId()}-gauge-${type}`
    const sprite = this.createInnerSprite(key, Sprite_Gauge)
    sprite.setup(actor, type)
    sprite.move(x, y)
    sprite.show()
  }

  createInnerSprite<T extends Sprite>(
    key: string,
    spriteClass: new (...args: any[]) => T,
  ): T {
    const dict = this._additionalSprites
    if (dict[key]) {
      return dict[key] as T
    }
    else {
      const sprite = new spriteClass()
      dict[key] = sprite
      this.addInnerChild(sprite as unknown as Sprite)
      return sprite
    }
  }

  placeTimeGauge(actor: Game_Actor, x: number, y: number): void {
    if (BattleManager.isTpb()) {
      this.placeGauge(actor, 'time', x, y)
    }
  }

  placeBasicGauges(actor: Game_Actor, x: number, y: number): void {
    this.placeGauge(actor, 'hp', x, y)
    this.placeGauge(actor, 'mp', x, y + this.gaugeLineHeight())
    if (GlobalMananger.$dataSystem.optDisplayTp) {
      this.placeGauge(actor, 'tp', x, y + this.gaugeLineHeight() * 2)
    }
  }

  gaugeLineHeight(): number {
    return 24
  }

  drawActorCharacter(actor: Game_Actor, x: number, y: number): void {
    this.drawCharacter(actor.characterName(), actor.characterIndex(), x, y)
  }

  drawActorFace(actor: Game_Actor, x: number, y: number, width?: number, height?: number): void {
    this.drawFace(actor.faceName(), actor.faceIndex(), x, y, width!, height!)
  }

  drawActorName(actor: Game_Actor, x: number, y: number, width?: number): void {
    width = width || 168
    this.changeTextColor(ColorManager.hpColor(actor))
    this.drawText(actor.name(), x, y, width)
  }

  drawActorClass(actor: Game_Actor, x: number, y: number, width?: number): void {
    width = width || 168
    this.resetTextColor()
    this.drawText(actor.currentClass().name, x, y, width)
  }

  drawActorNickname(actor: Game_Actor, x: number, y: number, width?: number): void {
    width = width || 270
    this.resetTextColor()
    this.drawText(actor.nickname(), x, y, width)
  }

  drawActorLevel(actor: Game_Actor, x: number, y: number): void {
    this.changeTextColor(ColorManager.systemColor())
    this.drawText(TextManager.levelA, x, y, 48)
    this.resetTextColor()
    this.drawText(String(actor.level), x + 84, y, 36, 'right')
  }

  drawActorIcons(actor: Game_Actor, x: number, y: number, width?: number): void {
    width = width || 144
    const delta = ImageManager.standardIconWidth - ImageManager.iconWidth
    const iconWidth = ImageManager.standardIconWidth
    const icons = actor.allIcons().slice(0, Math.floor(width / iconWidth))
    let iconX = x + delta / 2
    for (const icon of icons) {
      this.drawIcon(icon, iconX, y + 2)
      iconX += iconWidth
    }
  }

  drawActorSimpleStatus(actor: Game_Actor, x: number, y: number): void {
    const lineHeight = this.lineHeight()
    const x2 = x + 180
    this.drawActorName(actor, x, y)
    this.drawActorLevel(actor, x, y + lineHeight * 1)
    this.drawActorIcons(actor, x, y + lineHeight * 2)
    this.drawActorClass(actor, x2, y)
    this.placeBasicGauges(actor, x2, y + lineHeight)
  }

  actorSlotName(actor: Game_Actor, index: number): string {
    const slots = actor.equipSlots()
    return GlobalMananger.$dataSystem.equipTypes[slots[index]]
  }
}

export namespace Window_StatusBase {

  export type GaugeType = 'hp' | 'mp' | 'tp' | 'time'
}
