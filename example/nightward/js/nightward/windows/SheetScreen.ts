import { Container } from 'pixi.js'
import { back, fitScale, introAlpha, largeScale, out, phase, reducedMotion } from '../primitives/ui'
import { Sprite_NightwardHeading } from '../sprites/Sprite_NightwardHeading'
import { panel } from './panel'
import { UiScreen } from './UiScreen'

export abstract class SheetScreen extends UiScreen {
  protected heading: Sprite_NightwardHeading
  protected sheet = new Container()
  protected frame = panel(1, 1)
  protected sheetY = 0
  protected headingY = 0
  constructor(title: string) {
    super(); this.heading = new Sprite_NightwardHeading(title); this.sheet.addChild(this.frame); this.content.addChild(this.heading, this.sheet)
  }
  protected placeSheet(width: number, height: number): void {
    const l = this.layout, scale = l.short ? l.unit : fitScale(this.heading.title.textWidth, l.width - l.margin * 2, largeScale(l.unit))
    const headingH = this.heading.layout(scale, l.unit, Math.floor(l.w / 2) - 8)
    this.headingY = l.short ? 4 : Math.max(4, Math.round((l.h - headingH - 12 - height) / 2))
    this.sheetY = this.headingY + headingH + (l.short ? 6 : 12)
    this.heading.position.set(Math.round(l.w / 2), this.headingY); this.sheet.position.set(Math.round((l.w - width) / 2), this.sheetY)
    this.frame.width = width; this.frame.height = height
  }
  protected animate(_dt: number): void {
    this.heading.animate(this.age)
    const p = phase(this.age, .08, .3)
    this.sheet.y = this.sheetY + (reducedMotion() ? 0 : Math.round(12 * (1 - back(p))))
    this.sheet.alpha = introAlpha(this.age, .08)
    this.buttons.forEach((button, i) => { button.motion.x = reducedMotion() ? 0 : Math.round(8 * (1 - out(phase(this.age, .2 + i * .04, .22)))); button.motion.alpha = introAlpha(this.age, .2 + i * .04) })
  }
}
