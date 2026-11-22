import { Container } from 'pixi.js'
import { back, colors, out, phase, reducedMotion } from '../primitives/ui'
import { Sprite_NightwardText } from './Sprite_NightwardText'
import { box, sprite } from './uiSprites'

export interface HeadingIntro { halo?: number, haloAt?: number, haloSeconds?: number, haloSine?: boolean, breath?: number, drop?: number, lettersAt?: number, letterSeconds?: number, letterFade?: number, strength?: number, stagger?: number, rulesAt?: number, diamondsAt?: number, diamondSeconds?: number, glintAt?: number, center?: boolean, scaleIn?: boolean }
export class Sprite_NightwardHeading extends Container {
  readonly title: Sprite_NightwardText
  readonly halo = sprite('glow')
  private glint: Sprite_NightwardText
  private rules = [box(1, 1, colors.rule), box(1, 1, colors.rule)]
  private diamonds = [sprite('diamond'), sprite('diamond')]
  private ruleLength = 0
  private options: Required<HeadingIntro> = { halo: 0.22, haloAt: 0, haloSeconds: 0.3, haloSine: false, breath: 0, drop: 9, lettersAt: 0.05, letterSeconds: 0.32, letterFade: 0.1, strength: 1.8, stagger: 0.035, rulesAt: 0.3, diamondsAt: 0.4, diamondSeconds: 0.22, glintAt: 0.6, center: false, scaleIn: false }
  constructor(value: string, style = 1) {
    super({ eventMode: 'none' })
    this.title = new Sprite_NightwardText(value, style, 0.5, true)
    this.glint = new Sprite_NightwardText(value, 0, 0.5, true)
    this.glint.tint = 16773312
    this.halo.anchor.set(0.5)
    this.halo.tint = colors.lanternDeep
    this.addChild(this.halo, ...this.rules, ...this.diamonds, this.title, this.glint)
    this.diamonds.forEach(node => node.anchor.set(0.5))
  }

  configure(options: HeadingIntro): void { Object.assign(this.options, options) }
  layout(scale: number, unit: number, halfWidth: number, maxRule = 44, minRule = 24, halo = 60): number {
    const ratio = scale / unit
    const height = Math.ceil(14 * ratio)
    const half = Math.ceil(this.title.textWidth * ratio / 2)
    const available = halfWidth - half - 13
    this.title.scale.set(ratio)
    this.glint.scale.set(ratio)
    this.ruleLength = Math.min(maxRule, available) >= minRule ? Math.min(maxRule, available) : 0
    this.rules.forEach((node, i) => {
      node.anchor.set(i ? 0 : 1, 0)
      node.position.set((i ? 1 : -1) * (half + 6), Math.round(height / 2))
      node.visible = this.ruleLength > 0
    })
    this.diamonds.forEach((node, i) => {
      node.position.set((i ? 1 : -1) * (half + 9 + this.ruleLength), Math.round(height / 2))
      node.visible = this.ruleLength > 0
    })
    this.halo.position.set(0, Math.round(height / 2))
    this.halo.width = half * 2 + halo
    this.halo.height = height + halo * 0.66
    return height
  }

  animate(age: number): void {
    const o = this.options
    const still = reducedMotion()
    const time = still ? Infinity : age
    const haloP = phase(time, o.haloAt, o.haloSeconds)
    this.halo.alpha = o.halo * (o.haloSine ? Math.sin(haloP * Math.PI / 2) : out(haloP, 4))
    if (!still && time > o.glintAt)
      this.halo.alpha += o.breath * (1 - Math.cos((time - o.glintAt) * Math.PI / 1.6))
    const chars = this.title.text.length
    const half = (chars - 1) / 2
    const glintTime = (time - o.glintAt) % 2.6
    const sweep = -16 + glintTime / 0.75 * (this.title.textWidth + 32)
    for (let i = 0; i < chars; i++) {
      const order = o.center ? Math.abs(i - half) - (chars % 2 ? 0 : 0.5) : i
      const at = o.lettersAt + order * o.stagger
      const glyph = this.title.glyphs[i]!
      const overlay = this.glint.glyphs[i]!
      const p = phase(time, at, o.letterSeconds)
      glyph.y = Math.round(-1 - o.drop * (1 - back(p, o.strength)))
      glyph.alpha = out(phase(time, at, o.letterFade), 2)
      glyph.scale.set(o.scaleIn ? 0.6 + 0.4 * back(p, o.strength) : 1)
      overlay.y = glyph.y
      overlay.scale.copyFrom(glyph.scale)
      const distance = Math.abs(glyph.x + Math.round(this.title.textWidth / 2) + 5 - sweep) / 13
      overlay.alpha = !still && time >= o.glintAt && glintTime < 0.75 ? glyph.alpha * Math.max(0, 1 - distance * distance) * 0.6 : 0
    }
    for (const node of this.rules) node.width = this.ruleLength * out(phase(time, o.rulesAt, 0.35), 4)
    for (const node of this.diamonds) node.scale.set(back(phase(time, o.diamondsAt, o.diamondSeconds), 3))
  }
}
