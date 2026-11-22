import type { Content, FamilyKey, PassiveKey, WeaponKey } from '../managers/NightwardDataManager'
import { Container, Sprite } from 'pixi.js'
import { ImageManager } from 'rmmz-next'
import { equipmentIcon, getAssets } from '../managers/NightwardAssetManager'
import { passiveKeys, weaponKeys } from '../managers/NightwardDataManager'
import { back, colors, mixColor, phase, reducedMotion } from '../primitives/ui'
import { box, sprite } from './uiSprites'

export interface BuildItem { key: FamilyKey, rank: number }
interface Slot { root: Container, frame: Sprite, icon: Sprite, flash: Sprite, sparkle: Sprite, pips: Sprite[], pipFlashes: Sprite[], rank: number, age: number, reveal: number, key?: FamilyKey }
export class Sprite_NightwardBuild extends Container {
  readonly slots: Slot[] = []
  measuredWidth = 0
  measuredHeight = 0
  private order: FamilyKey[] = []
  private held = new Map<FamilyKey, number>()
  constructor(private content: Content) {
    super({ eventMode: 'none' })
    for (let i = 0; i < 10; i++) {
      const root = new Container(); const frame = sprite('slot'); const image = new Sprite(); const flash = box(16, 16, 0xFFFFFF, 0, 2, 2); const sparkle = sprite('sparkle'); const pips: Sprite[] = []; const pipFlashes: Sprite[] = []
      image.position.set(2, 2)
      root.addChild(frame, image, flash)
      for (let p = 0; p < 5; p++) { const pip = sprite('pipOff'); pip.anchor.set(0.5); pip.position.set(4 + p * 3, 23); pips.push(pip); root.addChild(pip) }
      for (let p = 0; p < 5; p++) { const pip = box(2, 2, 0xFFFFFF, 0); pip.anchor.set(0.5); pip.position.set(4 + p * 3, 23); pipFlashes.push(pip); root.addChild(pip) }
      sparkle.anchor.set(0.5); sparkle.position.set(18, 2); sparkle.scale.set(0); root.addChild(sparkle)
      root.pivot.set(10, 10); this.addChild(root)
      this.slots.push({ root, frame, icon: image, flash, sparkle, pips, pipFlashes, rank: 0, age: 10, reveal: 1 })
    }
  }

  fill(items: BuildItem[], animate = false): void {
    for (const item of items) {
      if (!this.order.includes(item.key))
        this.order.push(item.key)
    }
    const weapons = this.order.filter(key => weaponKeys.includes(key as typeof weaponKeys[number])); const passives = this.order.filter(key => passiveKeys.includes(key as typeof passiveKeys[number]))
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i]!; const key = i < 6 ? weapons[i] : passives[i - 6]; const item = items.find(item => item.key === key); const rank = key ? this.held.get(key) ?? item?.rank ?? 0 : 0
      if (rank > slot.rank && animate)
        slot.age = 0
      slot.rank = rank; slot.key = key; slot.frame.tint = key ? 0xFFFFFF : colors.edge; slot.frame.alpha = key ? 1 : 0.75
      slot.icon.visible = !!key && rank > 0
      if (key && rank > 0) {
        const family = this.content.weapons.get(key as WeaponKey) ?? this.content.passives.get(key as PassiveKey)!
        slot.icon.texture = equipmentIcon(family[rank - 1]!.iconIndex)
        slot.icon.scale.set(16 / slot.icon.texture.frame.width)
      }
      slot.pips.forEach((pip, p) => { pip.visible = !!key && rank > 0; pip.texture = getAssets().ui[p < rank ? 'pipOn' : 'pipOff']!; pip.tint = p < rank ? 0xFFFFFF : 11580616 })
    }
  }

  hold(key: FamilyKey, rank: number): void { this.held.set(key, Math.min(this.held.get(key) ?? rank, rank)) }
  release(key: FamilyKey): void {
    this.held.delete(key); const slot = this.slots.find(slot => slot.key === key); if (slot)
      slot.age = 0
  }

  layout(iconUnit: number, unit: number, available: number, hud = false): void {
    const scale = iconUnit / unit; const oneRow = !hud && 215 * scale <= available
    this.scale.set(scale)
    this.slots.forEach((slot, i) => {
      const weapon = i < 6; const column = weapon ? i : i - 6
      slot.root.position.set((hud ? 5 : 0) + (oneRow && !weapon ? 132 : 0) + column * 21 + 10, (hud ? 5 : 0) + (oneRow || weapon ? 0 : 27) + 10)
    })
    this.measuredWidth = (hud ? 135 : oneRow ? 215 : 125) * scale
    this.measuredHeight = (hud ? 62 : oneRow ? 25 : 52) * scale
  }

  point(key: FamilyKey): { x: number, y: number, scale: number } | undefined {
    const slot = this.slots.find(slot => slot.key === key)
    if (!slot)
      return
    const position = slot.root.getGlobalPosition()
    return { x: position.x, y: position.y, scale: this.scale.x * 16 / ImageManager.iconWidth }
  }

  tick(dt: number): void {
    for (const slot of this.slots) {
      slot.age += dt
      const age = slot.age; const still = reducedMotion(); const pop = slot.rank === 1 ? 0.6 + 0.4 * back(phase(age, 0, 0.35), 2.2) : 1
      slot.root.scale.set(slot.key && this.held.has(slot.key) && slot.rank === 0 ? 0 : slot.reveal * (still ? 1 : pop))
      slot.flash.alpha = (slot.rank >= 5 ? 0.9 : 0.7) * (1 - phase(age, 0, 0.35)) ** 3
      slot.sparkle.scale.set(!still && slot.rank >= 5 ? Math.max(0, Math.sin(phase(age % 3.5, 0, 0.5) * Math.PI)) * 1.2 : 0)
      slot.sparkle.rotation = phase(age % 3.5, 0, 0.5) * Math.PI / 4
      slot.frame.tint = slot.key ? slot.rank >= 5 && age < 0.6 ? mixColor(0xFFFFFF, colors.gold, Math.sin(phase(age, 0, 0.6) * Math.PI) ** 2) : 0xFFFFFF : colors.edge
      slot.pips.forEach((pip, p) => {
        const target = !still && p === slot.rank - 1 && age < 0.3 ? back(phase(age, 0, 0.24), 3) : 1
        pip.scale.set(target)
        slot.pipFlashes[p]!.scale.set(target)
        slot.pipFlashes[p]!.alpha = slot.rank === 5 ? 1 - phase(age, p * 0.05, 0.15) : p === slot.rank - 1 ? 1 - phase(age, 0, 0.3) : 0
      })
    }
  }
}
