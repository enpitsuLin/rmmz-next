import type { NineSliceSprite, Sprite } from 'pixi.js'
import type { Reward } from '../objects/Game_NightwardRewards'
import { Container } from 'pixi.js'
import { Input } from 'rmmz-next'
import { NightwardSound } from '../patches/AudioManager'
import { NightwardConfig } from '../patches/ConfigManager'
import { approach, back, colors, fitScale, largeScale, out, phase, reducedMotion, uiLayout } from '../primitives/ui'
import { panel } from '../windows/panel'
import { Sprite_NightwardHeading } from './Sprite_NightwardHeading'
import { Sprite_NightwardText, text } from './Sprite_NightwardText'
import { icon, iconScale, keycap, sprite, touchHintArt } from './uiSprites'

interface Toast { node: Container, image: Sprite, age: number, title: Sprite_NightwardText, glint: Sprite_NightwardText, sparkles: Sprite[], y: number }

class Banner extends Container {
  private heading: Sprite_NightwardHeading
  private subtitle: Sprite_NightwardText
  private plate = panel(1, 1, 'softRect')
  private body = new Container()
  private diamonds = [sprite('diamond'), sprite('diamond')]
  private age = 0
  private heightF = 0
  constructor(main: string, sub: string, style: number, private hold: number, private slam: boolean) {
    super({ eventMode: 'none' })
    const l = uiLayout()
    const max = slam ? 2 * l.unit : largeScale(l.unit)
    const titleScale = l.short ? l.unit : fitScale(new Sprite_NightwardText(main, style, 0.5, true).textWidth, l.width - 2 * l.margin - 40 * l.unit, max)
    this.heading = new Sprite_NightwardHeading(main, style)
    this.heading.configure({ halo: 0, lettersAt: 0.08, drop: 10, letterSeconds: 0.32, strength: 1.7, stagger: 0.03, rulesAt: 100, diamondsAt: 100, glintAt: Infinity })
    const titleH = this.heading.layout(titleScale, l.unit, l.w / 2, 0)
    const half = Math.ceil(this.heading.title.textWidth * titleScale / l.unit / 2)
    this.heading.y = 8
    this.subtitle = text(sub, 0, 8 + titleH + 6, 0, colors.blue, 0.5)
    const width = (Math.max(half + 14, Math.ceil(this.subtitle.textWidth / 2)) + 12) * 2
    this.heightF = 16 + titleH + (sub ? 13 : 0)
    this.plate.width = width
    this.plate.height = this.heightF
    this.plate.pivot.set(width / 2, this.heightF / 2)
    this.plate.position.set(0, this.heightF / 2)
    this.plate.tint = 0
    this.plate.alpha = 0.5
    this.diamonds.forEach((node, i) => {
      node.anchor.set(0.5)
      node.position.set((i ? 1 : -1) * (half + 10), 8 + Math.round(titleH / 2))
      node.tint = style === 2 ? 16732224 : 0xFFFFFF
    })
    this.body.pivot.set(0, 8 + Math.round(titleH / 2))
    this.body.position.copyFrom(this.body.pivot)
    this.body.addChild(this.heading, this.subtitle, ...this.diamonds)
    this.addChild(this.plate, this.body)
    this.scale.set(l.unit)
  }

  place(band: number): void {
    const l = uiLayout()
    this.position.set(Math.round(l.w / 2) * l.unit, (l.short ? l.h - 8 - this.heightF : Math.max(Math.ceil(band / l.unit) + 12, Math.round(l.h * 0.28))) * l.unit)
  }

  tick(dt: number): boolean {
    this.age += dt
    const age = this.age
    const still = reducedMotion()
    const end = 0.4 + this.hold
    this.heading.animate(this.slam ? age + 2 : age)
    this.plate.scale.x = still ? 1 : out(phase(age, this.slam ? 0.16 : 0, 0.25), 4)
    this.subtitle.alpha = out(phase(age, 0.4, 0.3))
    this.subtitle.y = 8 + this.heading.title.capHeight * this.heading.title.scale.y + 6 + Math.round((still ? 0 : this.slam ? 4 : 3) * (1 - out(phase(age, 0.4, 0.3))))
    this.diamonds.forEach((node) => {
      node.scale.set(still ? 1 : back(phase(age, 0.3, 0.2), 2.5))
      node.alpha = 0.8 + 0.2 * Math.cos(age * Math.PI / 0.8)
    })
    this.body.scale.set(!still && this.slam ? 2.2 - 1.2 * phase(age, 0, 0.16) ** 5 : 1)
    this.body.alpha = this.slam && !still ? phase(age, 0, 0.06) : 1
    this.body.x = !still && this.slam && age >= 0.16 && age < 0.46 ? [1, -1, 1, -1, 1, 0][Math.round(phase(age, 0.16, 0.3) * 5)]! : 0
    this.alpha = still ? phase(age, 0, 0.15) * (1 - phase(age, 0.15 + this.hold, 0.15)) : 1 - phase(age, end, 0.35) ** 3
    return age >= (still ? this.hold + 0.3 : end + 0.35)
  }
}

export class Sprite_NightwardMoments extends Container {
  private toastQueue: Pick<Reward, 'icon' | 'rank' | 'name'>[] = []
  private toasts: Toast[] = []
  private banner?: Banner
  private minute?: { node: Container, age: number }
  private hint?: Container
  private hintBody?: Container
  private hintKnob?: Sprite
  private hintCaps: { frame: NineSliceSprite, key: string }[] = []
  private hintY = 0
  private hintAge = 0
  private walked = 0

  constructor() {
    super({ eventMode: 'none' })
  }

  queueToast(reward: Pick<Reward, 'icon' | 'rank' | 'name'>): void {
    this.toastQueue.push(reward)
  }

  placeBanner(bandBottom: number): void {
    this.banner?.place(bandBottom)
  }

  showBanner(main: string, sub: string, style: number, hold: number, slam: boolean, bandBottom: number): void {
    this.banner?.destroy({ children: true })
    this.banner = new Banner(main, sub, style, hold, slam)
    this.banner.place(bandBottom)
    this.addChild(this.banner)
  }

  showNotice(value: string, timerBottom: number): void {
    this.minute?.node.destroy({ children: true })
    const l = uiLayout()
    const node = new Container()
    const line = text(value, 0, 8, 0, colors.text, 0.5)
    const plate = panel(line.textWidth + 24, 23, 'softRect')
    plate.pivot.x = Math.round((line.textWidth + 24) / 2)
    plate.tint = 0
    plate.alpha = 0.5
    node.addChild(plate, line)
    node.scale.set(l.unit)
    node.position.set(Math.round(l.w / 2) * l.unit, l.short ? l.height - 27 * l.unit : timerBottom + 6 * l.unit)
    this.addChild(node)
    this.minute = { node, age: 0 }
  }

  showMoveHint(hint: boolean): void {
    if (!hint)
      return
    const l = uiLayout()
    const root = new Container()
    const body = new Container()
    const sub = text('Your weapons fire on their own', 0, 25, 0, colors.blue, 0.5)
    const cap = (value: string): { node: Container, width: number } => {
      const part = keycap(value)
      if (value.length === 1)
        this.hintCaps.push({ frame: part.frame, key: value.toLowerCase() })
      return { node: part.node, width: part.width }
    }
    const word = (value: string, tint = 0xFFFFFF): { node: Container, width: number } => {
      const node = text(value, 0, 2, 0, tint)
      return { node, width: node.textWidth }
    }
    const line = (parts: { node: Container, width: number }[], caps = 0): { node: Container, width: number } => {
      const node = new Container()
      let x = 0
      parts.forEach((part, i) => {
        part.node.x = x
        node.addChild(part.node)
        x += part.width + (i < caps - 1 ? 3 : 5)
      })
      node.pivot.x = Math.round((x - 5) / 2)
      node.y = 8
      return { node, width: x - 5 }
    }
    const keys = line([...['W', 'A', 'S', 'D'].map(cap), word('or', colors.dim), word('arrows'), word('to move')], 4)
    const pad = line([cap('L STICK'), word('to move')])
    const { node: touchArt, knob } = touchHintArt()
    touchArt.y = -7
    const touch = line([{ node: touchArt, width: 26 }, word('Drag anywhere to move')])
    const controller = [...navigator.getGamepads()].some(pad => pad?.connected && (pad.axes.some(value => Math.abs(value) > 0.2) || pad.buttons.some(button => button.pressed)))
    const selected = l.tap ? touch : controller ? pad : keys
    const width = Math.max(keys.width, pad.width, touch.width, sub.textWidth) + 24
    const plate = panel(width, 40, 'softRect')
    for (const row of [keys, pad, touch]) row.node.visible = row === selected
    this.hintKnob = selected === touch ? knob : undefined
    plate.x = -Math.round(width / 2)
    plate.tint = 0
    plate.alpha = 0.45
    body.addChild(keys.node, pad.node, touch.node, sub)
    root.addChild(plate, body)
    root.scale.set(l.unit)
    this.hintY = Math.round(l.h * (l.portrait ? 0.78 : 0.74) - 20) * l.unit
    root.position.set(Math.round(l.w / 2) * l.unit, this.hintY)
    this.hint = root
    this.hintBody = body
    this.addChild(root)
  }

  recordMovement(x: number, z: number): void {
    if (this.hintAge >= 0.9 && Math.hypot(x, z) > 0.3)
      this.walked += 1 / 60
  }

  private showToast({ icon: iconIndex, rank, name: label }: Pick<Reward, 'icon' | 'rank' | 'name'>): void {
    const l = uiLayout()
    const node = new Container()
    const well = sprite('slot', 4, 6)
    const image = icon(iconIndex)
    const title = text(rank === 5 ? 'MAXED!' : 'NEW WEAPON', 24, 5, rank === 5 ? 1 : 3)
    const name = text(label, 24, 15)
    const glint = text(title.text, 24, 5, 0, 16773312)
    const sparkles = Array.from({ length: 3 }, () => sprite('sparkle'))
    well.scale.set(l.icon / l.unit)
    image.anchor.set(0.5)
    image.position.set(4 + 10 * l.icon / l.unit, 6 + 10 * l.icon / l.unit)
    sparkles.forEach((spark, i) => {
      spark.anchor.set(0.5)
      spark.position.set(32 + i * 18, i === 1 ? 3 : 8)
      spark.visible = rank === 5
    })
    glint.visible = rank === 5
    node.addChild(panel(116, 26), well, image, title, glint, name, ...sparkles)
    node.scale.set(l.unit)
    this.addChild(node)
    this.toasts.push({ node, image, age: 0, title, glint, sparkles, y: this.toasts.length * 30 * l.unit })
    NightwardSound.playNightwardSe('Cursor', 30)
  }

  tick(worldDt: number, active: boolean, bandBottom: number, slotBottom: number): void {
    const l = uiLayout()
    const u = l.unit
    const still = reducedMotion()
    if (this.banner?.tick(worldDt)) {
      this.banner.destroy({ children: true })
      this.banner = undefined
    }
    if (this.minute) {
      this.minute.age += worldDt
      const age = this.minute.age
      this.minute.node.alpha = phase(age, 0.05, 0.2) * (1 - phase(age, 2.05, 0.3) ** 3)
      this.minute.node.children[0]!.scale.x = out(phase(age, 0, 0.2), 4)
      if (age > 2.35) {
        this.minute.node.destroy({ children: true })
        this.minute = undefined
      }
    }
    if (active && this.toasts.length < 2 && this.toastQueue.length)
      this.showToast(this.toastQueue.shift()!)
    this.toasts = this.toasts.filter((toast, i) => {
      toast.age += worldDt
      const age = toast.age
      toast.y = still ? i * 30 * u : approach(toast.y, i * 30 * u, 20, worldDt)
      toast.node.position.set((l.portrait ? Math.round((l.w - 116) / 2) : 4) * u + (still ? 0 : Math.round(-40 * (1 - back(phase(age, 0, 0.3))) - 20 * phase(age, 2.5, 0.2) ** 3) * u), (l.portrait ? bandBottom + 6 * u : slotBottom + 6 * u) + Math.round(toast.y))
      toast.node.alpha = phase(age, 0, 0.12) * (1 - phase(age, 2.5, 0.2) ** 3)
      toast.image.scale.set(iconScale(toast.image, l.icon / u * (still ? 1 : back(phase(age, 0.1, 0.25), 3))))
      toast.sparkles.forEach((node, index) => {
        const p = phase(age, 0.2 + index * 0.08, 0.5)
        node.scale.set(still ? 0 : Math.sin(p * Math.PI) * 1.2)
        node.rotation = p * Math.PI / 4
      })
      const sweep = -16 + phase(age, 0.2, 0.75) * (toast.title.textWidth + 32)
      toast.glint.glyphs.forEach((glyph, index) => {
        const distance = Math.abs(toast.title.glyphs[index]!.x + 5 - sweep) / 13
        glyph.alpha = !still && age >= 0.2 && age < 0.95 ? Math.max(0, 1 - distance * distance) * 0.6 : 0
      })
      if (age < 2.7)
        return true
      toast.node.destroy({ children: true })
      return false
    })
    if (this.hint) {
      this.hintAge += worldDt
      const exit = this.walked >= 0.25 || this.hintAge > 8.9
      const age = this.hintAge
      this.hint.alpha = phase(age, 0.9, 0.4) * (exit ? 1 - phase(this.walked >= 0.25 ? this.walked - 0.25 : age - 8.9, 0, 0.3) : 1)
      this.hint.y = this.hintY + (still ? 0 : Math.round(6 * (1 - out(phase(age, 0.9, 0.4))) + (exit ? 6 * phase(this.walked >= 0.25 ? this.walked - 0.25 : age - 8.9, 0, 0.3) ** 3 : 0)) * u)
      this.hintBody!.y = still || age < 1.3 ? 0 : Math.round(-1 + Math.cos((age - 1.3) * Math.PI / 1.2))
      const pressed = { w: Input.isPressed('up'), a: Input.isPressed('left'), s: Input.isPressed('down'), d: Input.isPressed('right') }
      this.hintCaps.forEach(({ frame, key }) => {
        frame.tint = pressed[key as keyof typeof pressed] ? colors.lantern : 0xFFFFFF
      })
      if (this.hintKnob)
        this.hintKnob.position.set(Math.round(12 + 6 * Math.cos(age * Math.PI * 2 / 1.6)), Math.round(12 + 6 * Math.sin(age * Math.PI * 2 / 1.6)))
      if (exit && this.hint.alpha <= 0.001) {
        this.hint.destroy({ children: true })
        this.hint = undefined
        if (this.walked >= 0.25) {
          NightwardConfig.nightwardSeenMoveHint = true
          NightwardConfig.save()
        }
      }
    }
  }
}
