import type { NineSliceSprite, Sprite } from 'pixi.js'
import type { Reward } from '../objects/rewards'
import type { IconPoint } from '../primitives/ui'
import type { Sprite_NightwardText } from '../sprites/Sprite_NightwardText'
import type { Window_NightwardPanel } from './Window_NightwardPanel'
import { Container, Rectangle } from 'pixi.js'
import { Input, SoundManager } from 'rmmz-next'
import { sound } from '../managers/NightwardAudioManager'
import { back, colors, largeScale, out, phase, reducedMotion } from '../primitives/ui'
import { Sprite_NightwardHeading } from '../sprites/Sprite_NightwardHeading'
import { text, wrap } from '../sprites/Sprite_NightwardText'
import { box, icon, iconScale, sprite } from '../sprites/uiSprites'
import { panel } from './panel'
import { UiScreen } from './UiScreen'

interface Card {
  root: Container
  body: Container
  glow: NineSliceSprite
  frame: Window_NightwardPanel
  well: Sprite
  icon: Sprite
  name: Sprite_NightwardText
  tag: Sprite_NightwardText
  lines: Sprite_NightwardText[]
  flash: Sprite
  x: number
  y: number
  focus: number
  focusFrom: number
  focusTarget: number
  focusAge: number
  press: number
  pressFrom: number
  pressTarget: number
  pressAge: number
  pressed: boolean
  iconAge: number
  sent: boolean
}
interface RewardCallbacks { pick: (index: number) => void, fly: (reward: Reward, point: IconPoint) => void, done: () => void }
export class RewardScreen extends UiScreen {
  private dimmer = box(1, 1, 131850, 0)
  private heading: Sprite_NightwardHeading
  private cards: Card[] = []
  private cursorSprite = sprite('cursor')
  private selected = 0
  private chosen = -1
  private exitAge = -1
  private row = false
  private cardWidth = 236
  private cardHeight = 40
  private previous = 0
  constructor(private rewards: Reward[], readonly treasure: boolean, bandBottom: number, private callbacks: RewardCallbacks) {
    super()
    this.heading = new Sprite_NightwardHeading(treasure ? 'TREASURE!' : 'LEVEL UP!', treasure ? 3 : 1)
    this.heading.configure({ drop: 18, strength: 1.7 })
    this.cursorSprite.anchor.set(1, 0.5)
    this.content.addChild(this.dimmer, this.heading)
    rewards.forEach((reward) => {
      const root = new Container({ eventMode: 'static', cursor: treasure ? 'default' : 'pointer' })
      const body = new Container()
      const glow = panel(1, 1, 'softRect')
      const frame = panel(1, 1)
      const well = sprite('slot')
      const image = icon(reward.icon)
      const name = text(reward.name, 0, 0)
      const tag = text(reward.rank <= 1 ? 'NEW!' : `Lv ${reward.rank}`, 0, 0, reward.rank <= 1 ? 3 : 0, reward.rank <= 1 ? 0xFFFFFF : 10275071, 1)
      const lines = [text('', 0, 0, 0, colors.blue), text('', 0, 0, 0, colors.blue)]
      const flash = box(1, 1, 0xFFFFFF, 0, 3, 3)
      glow.position.set(-10, -10)
      glow.tint = colors.lantern
      image.anchor.set(0.5)
      body.addChild(glow, frame, well, image, name, tag, ...lines, flash)
      root.addChild(body)
      this.content.addChild(root)
      const card: Card = { root, body, glow, frame, well, icon: image, name, tag, lines, flash, x: 0, y: 0, focus: treasure ? 1 : 0, focusFrom: treasure ? 1 : 0, focusTarget: treasure ? 1 : 0, focusAge: 1, press: 0, pressFrom: 0, pressTarget: 0, pressAge: 1, pressed: false, iconAge: 1, sent: false }
      this.cards.push(card)
    })
    this.nativeWindow.cycle = true
    this.nativeWindow.onSelection = undefined
    this.nativeWindow.choices = this.cards.map((card, index) => ({
      node: card.root,
      get rect() { return card.root.hitArea as Rectangle },
      enabled: !treasure,
      selected: false,
      row: index,
      col: 0,
      focus: (focused: boolean) => {
        if (focused)
          this.select(index)
      },
      setPressed: (pressed: boolean) => { card.pressed = pressed },
      activate: () => this.choose(index),
    }))
    this.content.addChild(this.cursorSprite)
    this.place(bandBottom)
    this.nativeWindow.focusChoice(0)
  }

  override get accepting(): boolean { return !this.treasure && this.age >= 0.45 && this.exitAge < 0 }
  private place(bandBottom: number): void {
    const l = this.layout
    const band = Math.ceil(bandBottom / l.unit)
    const scale = largeScale(l.unit)
    const headerH = this.heading.layout(scale, l.unit, Math.floor(l.w / 2) - 8)
    const total = headerH + 16 + 3 * 40 + 12
    this.dimmer.width = l.width / l.unit
    this.dimmer.height = l.height / l.unit
    this.row = band + total + 8 > l.h
    let x: number
    let top: number
    let headerHeight = headerH
    if (!this.row) {
      const y = Math.max(8, Math.round(l.h * 0.47 - total / 2), band + 6)
      this.cardWidth = Math.min(236, l.w - 28)
      this.cardHeight = 40
      x = Math.round((l.w - this.cardWidth) / 2)
      top = y + headerHeight + 16
      this.heading.position.set(Math.round(l.w / 2), y)
    }
    else {
      headerHeight = this.heading.layout(l.unit, l.unit, Math.floor(l.w / 2) - 8)
      this.cardWidth = Math.floor((l.w - 8 - 12) / 3)
      this.cardHeight = 58
      x = Math.round((l.w - (this.cards.length * this.cardWidth + (this.cards.length - 1) * 6)) / 2)
      top = band + 4 + headerHeight + 10
      this.heading.position.set(Math.round(l.w / 2), band + 4)
    }
    this.cursorSprite.rotation = this.row ? -Math.PI / 2 : 0
    this.cards.forEach((card, i) => {
      card.x = x + (this.row ? i * (this.cardWidth + 6) : 0)
      card.y = top + (this.row ? 0 : i * 46)
      card.root.position.set(card.x, card.y)
      card.root.hitArea = new Rectangle(0, 0, this.cardWidth, this.cardHeight)
      card.body.pivot.set(Math.round(this.cardWidth / 2), Math.round(this.cardHeight / 2))
      card.body.position.copyFrom(card.body.pivot)
      card.frame.width = this.cardWidth
      card.frame.height = this.cardHeight
      card.glow.width = this.cardWidth + 20
      card.glow.height = this.cardHeight + 20
      card.flash.width = this.cardWidth - 6
      card.flash.height = this.cardHeight - 6
      card.well.position.set(this.row ? 6 : 8, this.row ? 6 : 10)
      card.icon.position.set(card.well.x + 10, card.well.y + 10)
      const left = this.row ? 6 : 35
      const available = this.row ? this.cardWidth - 12 : this.cardWidth - 40
      const lines = wrap(this.rewards[i]!.description, available, true)
      const two = lines.length > 1
      card.lines.forEach((line, n) => {
        line.text = lines[n] ?? ''
        line.position.set(left, this.row ? 32 + n * 11 : n === 0 ? two ? 17 : 23 : 26)
      })
      card.name.position.set(this.row ? 30 : 35, this.row ? 7 : two ? 6 : 9)
      card.tag.align = this.row ? 0 : 1
      card.tag.relayout()
      const half = Math.round(card.tag.textWidth / 2)
      card.tag.pivot.set(this.row ? half : -half, 4)
      card.tag.position.set(this.row ? 30 + half : this.cardWidth - 8 - half, (this.row ? 18 : card.name.y) + 4)
    })
  }

  private select(index: number): void {
    if (!this.accepting || index === this.selected)
      return
    this.selected = index
    this.cards[index]!.iconAge = 0
  }

  private choose(index: number): void {
    if (!this.accepting)
      return
    this.selected = index
    this.chosen = index
    this.exitAge = 0
    SoundManager.playOk()
    this.cards[index]!.press = this.cards[index]!.pressFrom = this.cards[index]!.pressTarget = 0
    this.cards[index]!.pressed = false
    this.callbacks.pick(index)
  }

  protected override handle(): void {
    for (let i = 0; i < this.cards.length; i++) {
      if (Input.isTriggered(`choice${i + 1}`)) {
        this.choose(i)
        return
      }
    }
    super.handle()
  }

  private send(card: Card, index: number): void {
    if (card.sent)
      return
    card.sent = true
    const point = card.icon.getGlobalPosition()
    const scale = this.layout.unit * card.body.scale.y * card.icon.scale.x
    this.callbacks.fly(this.rewards[index]!, { x: point.x, y: point.y, scale })
    card.icon.visible = false
  }

  protected animate(dt: number): void {
    const age = this.age
    const still = reducedMotion()
    this.heading.animate(age)
    this.dimmer.alpha = 0.64 * out(phase(age, 0, still ? 0.15 : 0.3))
    this.heading.halo.alpha = age > 0.3 ? 0.22 + 0.05 * Math.cos((age - 0.3) * Math.PI / 1.2) : this.heading.halo.alpha
    if (this.treasure && this.exitAge < 0 && age >= 1.6) {
      this.exitAge = 0
      this.chosen = this.cards.length
    }
    if (this.exitAge >= 0)
      this.exitAge += dt
    const exit = this.exitAge
    const leave = this.treasure ? 0.1 * this.cards.length + 0.2 : 0.22
    const duration = this.treasure ? 0.35 : 0.38
    this.content.alpha *= exit < 0 ? 1 : 1 - phase(exit, still ? 0 : leave, still ? 0.15 : duration) ** 3
    this.cards.forEach((card, i) => {
      const at = 0.12 + i * (this.treasure ? 0.15 : 0.07)
      const slide = still || this.treasure ? 1 : back(phase(age, at, 0.42), 1.4)
      const fade = phase(age, still ? 0 : at, still ? 0.15 : this.treasure ? 0.01 : 0.14)
      const flip = this.treasure && !still ? back(phase(age, at, 0.3), 1.6) : 1
      if (!this.treasure && i === this.selected && this.previous < 0.12 && age >= 0.12)
        card.iconAge = 0
      const focusTarget = this.treasure || (age >= 0.12 && i === this.selected) ? 1 : 0
      const pressTarget = card.pressed ? 1 : 0
      if (card.focusTarget !== focusTarget) {
        card.focusFrom = card.focus
        card.focusTarget = focusTarget
        card.focusAge = 0
      }
      if (card.pressTarget !== pressTarget) {
        card.pressFrom = card.press
        card.pressTarget = pressTarget
        card.pressAge = 0
      }
      card.focusAge += dt
      card.pressAge += dt
      card.iconAge += dt
      card.focus = card.focusFrom + (focusTarget - card.focusFrom) * out(phase(card.focusAge, 0, 0.14 * Math.max(0.01, Math.abs(focusTarget - card.focusFrom))))
      card.press = card.pressFrom + (pressTarget - card.pressFrom) * out(phase(card.pressAge, 0, 0.06 * Math.max(0.01, Math.abs(pressTarget - card.pressFrom))))
      const focus = still ? 0 : card.focus
      const away = exit >= 0 && !this.treasure && i !== this.chosen ? phase(exit, 0, 0.26) ** 4 : 0
      const punch = exit >= 0 && i === this.chosen ? Math.sin(phase(exit, 0, 0.3) * Math.PI) : 0
      card.body.position.set(card.body.pivot.x + Math.round(this.row ? 0 : 110 * (1 - slide) + 4 * focus - 70 * away), card.body.pivot.y + Math.round(this.row ? 40 * (1 - slide) - 3 * focus + 30 * away : 0))
      const scale = (1 + 0.02 * focus) * (1 - 0.03 * card.press) * (1 + 0.05 * punch)
      card.body.scale.set(scale * flip, scale)
      card.body.alpha = fade * (1 - away)
      card.glow.alpha = card.focus * (0.5 + 0.15 * Math.sin(age * Math.PI / 0.65))
      card.frame.highlighted = card.focus > 0.5
      card.icon.scale.set(iconScale(card.icon, 1 + (still ? 0 : 0.25 * Math.sin(phase(card.iconAge, 0, 0.2) * Math.PI))))
      const tagAt = this.treasure ? 0.3 + i * 0.15 : 0.45 + i * 0.07
      const tag = still ? 1 : back(phase(age, tagAt, 0.25), 3)
      card.tag.scale.set(tag)
      card.tag.rotation = -0.25 * (1 - tag)
      card.flash.alpha = exit >= 0 && i === this.chosen ? 0.85 * (1 - out(phase(exit, 0, 0.3))) : 0
      card.root.eventMode = this.live && !this.inputBlocked && this.accepting ? 'static' : 'none'
      if (this.previous < tagAt && age >= tagAt)
        sound('Tick', 25 + i * 8, 100 + 37.5 * (this.treasure ? (i + 1) / 3 : 0.4 + 0.3 * i))
      if (exit >= (still ? 0 : this.treasure ? i * 0.1 : 0.05) && (this.treasure || i === this.chosen))
        this.send(card, i)
    })
    const card = this.cards[this.selected]!
    const bob = still ? 0 : Math.round(1 - Math.cos(age * Math.PI / 0.45))
    this.cursorSprite.alpha = this.treasure ? 0 : out(phase(age, 0.4, 0.2), 2) * (exit < 0 ? 1 : 1 - phase(exit, 0, 0.15))
    this.cursorSprite.position.set(this.row ? card.x + card.body.x - card.body.pivot.x + this.cardWidth / 2 : card.x + card.body.x - card.body.pivot.x - 5 - bob, this.row ? card.y + card.body.y - card.body.pivot.y + this.cardHeight + 3 + bob : card.y + Math.round(this.cardHeight / 2))
    this.previous = age
    if (exit >= (still ? 0.15 : leave + duration)) {
      this.live = false
      this.callbacks.done()
    }
  }
}
