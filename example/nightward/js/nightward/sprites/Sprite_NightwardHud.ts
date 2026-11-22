import type { NineSliceSprite, Sprite } from 'pixi.js'
import type { FamilyKey } from '../managers/NightwardDataManager'
import type { Game_NightwardRun, RunEvent } from '../objects/Game_NightwardRun'
import type { Reward } from '../objects/rewards'
import type { Point } from '../primitives/geometry'
import type { IconPoint } from '../primitives/ui'
import type { Spriteset_Nightward } from './Spriteset_Nightward'
import { Container } from 'pixi.js'
import { ConfigManager, Graphics, Input, TouchInput } from 'rmmz-next'
import { getAssets } from '../managers/NightwardAssetManager'
import { sound } from '../managers/NightwardAudioManager'
import { settings } from '../managers/NightwardConfigManager'
import { approach, back, clamp, clock, colors, fitScale, largeScale, mixColor, out, phase, reducedMotion, sine, snap, uiLayout } from '../primitives/ui'
import { panel } from '../windows/panel'
import { Window_NightwardSelectable } from '../windows/Window_NightwardSelectable'
import { Sprite_NightwardBuild } from './Sprite_NightwardBuild'
import { Sprite_NightwardButton } from './Sprite_NightwardButton'
import { Sprite_NightwardHeading } from './Sprite_NightwardHeading'
import { Sprite_NightwardText, text } from './Sprite_NightwardText'
import { box, icon, sprite } from './uiSprites'

interface Flight { image: Sprite, from: IconPoint, to: IconPoint, age: number, key: FamilyKey }
interface DamageNumber { text: Sprite_NightwardText, age: number, x: number, z: number, height: number, drift: number, push?: number }
interface Callout { node: Container, age: number, big: boolean }
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
    const l = uiLayout(); const max = slam ? 2 * l.unit : largeScale(l.unit); const titleScale = l.short ? l.unit : fitScale(new Sprite_NightwardText(main, style, 0.5, true).textWidth, l.width - 2 * l.margin - 40 * l.unit, max)
    this.heading = new Sprite_NightwardHeading(main, style); this.heading.configure({ halo: 0, lettersAt: 0.08, drop: 10, letterSeconds: 0.32, strength: 1.7, stagger: 0.03, rulesAt: 100, diamondsAt: 100, glintAt: Infinity })
    const titleH = this.heading.layout(titleScale, l.unit, l.w / 2, 0); const half = Math.ceil(this.heading.title.textWidth * titleScale / l.unit / 2)
    this.heading.y = 8; this.subtitle = text(sub, 0, 8 + titleH + 6, 0, colors.blue, 0.5)
    const width = (Math.max(half + 14, Math.ceil(this.subtitle.textWidth / 2)) + 12) * 2
    this.heightF = 16 + titleH + (sub ? 13 : 0); this.plate.width = width; this.plate.height = this.heightF; this.plate.pivot.set(width / 2, this.heightF / 2); this.plate.position.set(0, this.heightF / 2); this.plate.tint = 0; this.plate.alpha = 0.5
    this.diamonds.forEach((node, i) => { node.anchor.set(0.5); node.position.set((i ? 1 : -1) * (half + 10), 8 + Math.round(titleH / 2)); node.tint = style === 2 ? 16732224 : 0xFFFFFF })
    this.body.pivot.set(0, 8 + Math.round(titleH / 2)); this.body.position.copyFrom(this.body.pivot)
    this.body.addChild(this.heading, this.subtitle, ...this.diamonds); this.addChild(this.plate, this.body); this.scale.set(l.unit)
  }

  place(band: number): void {
    const l = uiLayout()
    this.position.set(Math.round(l.w / 2) * l.unit, (l.short ? l.h - 8 - this.heightF : Math.max(Math.ceil(band / l.unit) + 12, Math.round(l.h * 0.28))) * l.unit)
  }

  tick(dt: number): boolean {
    this.age += dt; const age = this.age; const still = reducedMotion(); const end = 0.4 + this.hold
    this.heading.animate(this.slam ? age + 2 : age)
    this.plate.scale.x = still ? 1 : out(phase(age, this.slam ? 0.16 : 0, 0.25), 4)
    this.subtitle.alpha = out(phase(age, 0.4, 0.3)); this.subtitle.y = 8 + this.heading.title.capHeight * this.heading.title.scale.y + 6 + Math.round((still ? 0 : this.slam ? 4 : 3) * (1 - out(phase(age, 0.4, 0.3))))
    this.diamonds.forEach((node) => { node.scale.set(still ? 1 : back(phase(age, 0.3, 0.2), 2.5)); node.alpha = 0.8 + 0.2 * Math.cos(age * Math.PI / 0.8) })
    this.body.scale.set(!still && this.slam ? 2.2 - 1.2 * phase(age, 0, 0.16) ** 5 : 1)
    this.body.alpha = this.slam && !still ? phase(age, 0, 0.06) : 1
    this.body.x = !still && this.slam && age >= 0.16 && age < 0.46 ? [1, -1, 1, -1, 1, 0][Math.round(phase(age, 0.16, 0.3) * 5)]! : 0
    this.alpha = still ? phase(age, 0, 0.15) * (1 - phase(age, 0.15 + this.hold, 0.15)) : 1 - phase(age, end, 0.35) ** 3
    return age >= (still ? this.hold + 0.3 : end + 0.35)
  }
}
export class Sprite_NightwardHud extends Container {
  readonly flights = new Container({ eventMode: 'none' })
  readonly build: Sprite_NightwardBuild
  bandBottom = 0
  private world = new Container({ eventMode: 'none' })
  private screen = new Container({ eventMode: 'passive' })
  private moments = new Container({ eventMode: 'none' })
  private xpBack = box(1, 1, 461596)
  private xpFill = sprite('xpFill')
  private xpEdge = box(1, 1, 15267583)
  private xpShine = box(1, 1, 0xFFFFFF, 0.35)
  private xpGlint = sprite('glow')
  private xpFlash = box(1, 1, 0xFFFFFF, 0)
  private xpFrame = panel(1, 13, 'barFrame')
  private level = text('', 0, 0, 0, 0xFFFFFF, 1)
  private xpSparkles = Array.from({ length: 5 }, () => sprite('sparkle'))
  private timer = text('00:00', 0, 0, 0, 0xFFFFFF, 0.5, true)
  private timerPlate = panel(1, 1, 'softRect')
  private pauseButton = new Sprite_NightwardButton(getAssets().ui.pauseBars!, 15, 15, null)
  private pauseWindow = new Window_NightwardSelectable(15, 15)
  private slotsFrame = panel(135, 62)
  private counterFrame = panel(1, 44)
  private counters = new Container()
  private killIcon = icon('kills')
  private coinIcon = icon('coin')
  private kills = text('', 0, 0, 0, 0xFFFFFF, 1)
  private gold = text('', 0, 0, 1, 0xFFFFFF, 1)
  private hp = new Container()
  private hpChip = box(20, 3, 16763040, 1, 1, 1)
  private hpFill = sprite('hpFill', 1, 1)
  private hpFlash = box(20, 3, 0xFFFFFF, 0, 1, 1)
  private hpAlpha = 0
  private chip = 1
  private lowHp = sprite('vignette')
  private boss = new Container()
  private bossBox = new Container()
  private bossName = text('GRAVE REAPER', 0, 0, 2, 0xFFFFFF, 0.5)
  private bossFrame = panel(1, 6, 'thinFrame')
  private bossBack = box(1, 1, 1836553)
  private bossChip = box(1, 1, 16763040)
  private bossFill = sprite('hpFill')
  private bossFlash = box(1, 1, 0xFFFFFF, 0)
  private bossArrow = sprite('cursor')
  private arrowGlow = sprite('glow')
  private bossHalves = [new Container(), new Container()]
  private bossHalfBase: { x: number, y: number }[] = []
  private bossNameY = 0
  private bossAge = -1
  private bossDeadAt = -1
  private bossShown = 0
  private bossHp = 0
  private bossHit = 0
  private previousLevel = 1
  private previousKills = 0
  private previousGold = 0
  private xpShown = 1
  private xpWidth = 0
  private xpX = 0
  private xpAge = 10
  private levelAge = 10
  private killAge = 10
  private skullAge = 10
  private killPeak = 1.18
  private goldAge = 10
  private goldPopAge = 10
  private timerAge = 10
  private timerWarning = false
  private goldY = 0
  private uiTime = 0
  private lowAlpha = 0
  private shown = { from: 0, to: 1, age: 0, duration: 0.4, delay: 0.15, value: 0 }
  private lastWidth = 0
  private lastHeight = 0
  private slotBottom = 0
  private timerBottom = 0
  private flightItems: Flight[] = []
  private numbers: DamageNumber[] = []
  private numberBudget = 6
  private callouts: Callout[] = []
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
  private stick = new Container()
  private stickRing = sprite('ring')
  private stickKnob = sprite('knob')
  private stickOrigin?: Point
  private stickDelta = { x: 0, z: 0 }
  private blockTouch = true
  private touchAlpha = 0
  private modal = false
  private touchSource = false
  private pointerSource = (event: PointerEvent): void => { this.touchSource = event.pointerType !== 'mouse' }
  constructor(private run: Game_NightwardRun, pause: () => void) {
    super({ eventMode: 'passive' })
    this.build = new Sprite_NightwardBuild(run.content)
    this.pauseButton.onActivate = pause
    this.pauseWindow.pointerOnly = true; this.pauseWindow.choices = [this.pauseButton]
    this.pauseWindow._clientArea!.addChild(this.pauseButton)
    this.timerPlate.tint = 0; this.timerPlate.alpha = 0.42
    this.xpGlint.anchor.set(0.5); this.xpGlint.tint = 10147583
    this.hpFill.height = 3
    this.hp.addChild(box(20, 3, 1836553, 1, 1, 1), this.hpChip, this.hpFill, this.hpFlash, panel(22, 5, 'thinFrame'))
    this.world.addChild(this.hp)
    this.lowHp.tint = 12588060; this.lowHp.alpha = 0
    this.killIcon.anchor.set(0.5); this.coinIcon.anchor.set(0.5)
    this.counters.addChild(this.counterFrame, this.killIcon, this.coinIcon, this.kills, this.gold)
    this.bossBox.addChild(this.bossBack, this.bossChip, this.bossFill, this.bossFlash, this.bossFrame)
    this.boss.addChild(...this.bossHalves, this.bossBox, this.bossName)
    this.bossArrow.anchor.set(0.5); this.bossArrow.tint = 16729654; this.arrowGlow.anchor.set(0.5); this.arrowGlow.tint = 16722460; this.arrowGlow.blendMode = 'add'
    this.xpSparkles.forEach(node => node.anchor.set(0.5))
    this.screen.addChild(this.xpBack, this.xpFill, this.xpShine, this.xpEdge, this.xpGlint, this.xpFlash, this.xpFrame, this.level, ...this.xpSparkles, this.timerPlate, this.timer, this.pauseWindow, this.slotsFrame, this.build, this.counters, this.boss)
    this.stickRing.anchor.set(0.5); this.stickKnob.anchor.set(0.5); this.stick.addChild(this.stickRing, this.stickKnob)
    this.addChild(this.world, this.lowHp, this.screen, this.arrowGlow, this.bossArrow, this.moments, this.stick)
    this.build.fill(run.build); this.layout()
    Graphics.app.canvas.addEventListener('pointerdown', this.pointerSource)
  }

  setShown(to: boolean, duration = 0.2, delay = 0): void { this.shown = { from: this.shown.value, to: Number(to), age: 0, duration, delay, value: this.shown.value } }
  setModal(open: boolean): void {
    this.modal = open; if (open)
      this.blockPointer()
  }

  showMoveHint(hint: boolean): void {
    if (hint) {
      const l = uiLayout(); const root = new Container(); const body = new Container(); const sub = text('Your weapons fire on their own', 0, 25, 0, colors.blue, 0.5)
      const cap = (value: string): { node: Container, width: number } => {
        const node = new Container(); const line = text(value, 3, 2); const width = line.textWidth + 6; const frame = panel(width, 11, 'keycap')
        node.addChild(frame, line)
        if (value.length === 1)
          this.hintCaps.push({ frame, key: value.toLowerCase() })
        return { node, width }
      }
      const word = (value: string, tint = 0xFFFFFF): { node: Container, width: number } => { const node = text(value, 0, 2, 0, tint); return { node, width: node.textWidth } }
      const line = (parts: { node: Container, width: number }[], caps = 0): { node: Container, width: number } => {
        const node = new Container(); let x = 0
        parts.forEach((part, i) => { part.node.x = x; node.addChild(part.node); x += part.width + (i < caps - 1 ? 3 : 5) })
        node.pivot.x = Math.round((x - 5) / 2); node.y = 8; return { node, width: x - 5 }
      }
      const keys = line([...['W', 'A', 'S', 'D'].map(cap), word('or', colors.dim), word('arrows'), word('to move')], 4); const pad = line([cap('L STICK'), word('to move')]); const touchArt = new Container(); const ring = sprite('ring'); const knob = sprite('knob')
      ring.anchor.set(0.5); knob.anchor.set(0.5); ring.scale.set(0.5); knob.scale.set(0.5); ring.position.set(12, 12); knob.position.set(18, 12); touchArt.addChild(ring, knob); touchArt.y = -7
      const touch = line([{ node: touchArt, width: 26 }, word('Drag anywhere to move')]); const controller = [...navigator.getGamepads()].some(pad => pad?.connected && (pad.axes.some(value => Math.abs(value) > 0.2) || pad.buttons.some(button => button.pressed))); const selected = l.tap ? touch : controller ? pad : keys
      const width = Math.max(keys.width, pad.width, touch.width, sub.textWidth) + 24; const plate = panel(width, 40, 'softRect')
      for (const row of [keys, pad, touch]) row.node.visible = row === selected
      this.hintKnob = selected === touch ? knob : undefined
      plate.x = -Math.round(width / 2); plate.tint = 0; plate.alpha = 0.45; body.addChild(keys.node, pad.node, touch.node, sub); root.addChild(plate, body); root.scale.set(l.unit)
      this.hintY = Math.round(l.h * (l.portrait ? 0.78 : 0.74) - 20) * l.unit; root.position.set(Math.round(l.w / 2) * l.unit, this.hintY)
      this.hint = root; this.hintBody = body; this.moments.addChild(root)
    }
  }

  blockPointer(): void { this.blockTouch = true; this.stickOrigin = undefined }
  movement(): Point {
    let x = Number(Input.isPressed('right')) - Number(Input.isPressed('left')); let z = Number(Input.isPressed('down')) - Number(Input.isPressed('up'))
    const pad = [...navigator.getGamepads()].find(pad => pad?.connected)
    if (pad && !x && !z) { const px = pad.axes[0] ?? 0; const pz = pad.axes[1] ?? 0; const length = Math.hypot(px, pz); if (length > 0.2) { const strength = Math.min(1, (length - 0.2) / 0.8) / length; x = px * strength; z = pz * strength } }
    if (!TouchInput.isPressed()) { this.stickOrigin = undefined; this.blockTouch = false }
    if (this.touchSource && !this.blockTouch && TouchInput.isTriggered() && TouchInput.y > this.bandBottom)
      this.stickOrigin = { x: TouchInput.x, z: TouchInput.y }
    if (this.stickOrigin && TouchInput.isPressed()) {
      const limit = 22 * uiLayout().unit
      let dx = TouchInput.x - this.stickOrigin.x; let dz = TouchInput.y - this.stickOrigin.z; let length = Math.hypot(dx, dz)
      if (length > limit * 1.6) { const k = (length - limit * 1.6) / length; this.stickOrigin.x += dx * k; this.stickOrigin.z += dz * k; dx = TouchInput.x - this.stickOrigin.x; dz = TouchInput.y - this.stickOrigin.z; length = Math.hypot(dx, dz) }
      this.stickDelta = { x: dx, z: dz }
      const strength = clamp(length / limit); const gain = strength < 0.12 ? 0 : (strength - 0.12) / 0.88 / (length || 1)
      if (!x && !z) { x = dx * gain; z = dz * gain }
      this.stick.position.set(this.stickOrigin.x, this.stickOrigin.z)
    }
    if (this.hintAge >= 0.9 && Math.hypot(x, z) > 0.3)
      this.walked += 1 / 60
    return { x, z }
  }

  private items(): { key: FamilyKey, rank: number }[] { return this.run.result?.build ?? this.run.build }
  hold(reward: Reward): void {
    this.build.hold(reward.key, reward.rank - 1)
    this.build.fill(this.items())
    if (reward.weapon && (reward.rank === 1 || reward.rank === 5))
      this.toastQueue.push(reward)
  }

  fly(reward: Reward, from: IconPoint): void {
    this.build.fill(this.items())
    const to = this.build.point(reward.key)
    if (!to || reducedMotion()) { this.land(reward.key); return }
    const image = icon(reward.icon)
    image.anchor.set(0.5); image.position.set(from.x, from.y); image.scale.set(from.scale); this.flights.addChild(image)
    this.flightItems.push({ image, from, to, age: 0, key: reward.key })
  }

  private land(key: FamilyKey): void {
    this.build.release(key); this.build.fill(this.items(), true); sound('Tick', 45, 137.5)
  }

  private layout(): void {
    const l = uiLayout(); const { width: w, height: h, unit: u, icon: s, margin: m } = l; const inner = w - m * 2
    this.lastWidth = w; this.lastHeight = h
    this.lowHp.width = w; this.lowHp.height = h
    this.xpFrame.position.set(m, m); this.xpFrame.width = Math.round(inner / s); this.xpFrame.height = 13; this.xpFrame.scale.set(s)
    this.xpX = m + 2 * s; this.xpWidth = Math.round(inner / s) * s - 4 * s
    for (const node of [this.xpBack, this.xpFlash]) { node.position.set(this.xpX, m + 2 * s); node.width = this.xpWidth; node.height = 9 * s }
    this.xpFill.position.set(this.xpX, m + 2 * s); this.xpFill.height = 9 * s
    this.xpEdge.position.set(0, m + 2 * s); this.xpEdge.width = s; this.xpEdge.height = 9 * s
    this.xpShine.y = m + 2 * s; this.xpShine.width = 3 * s; this.xpShine.height = 9 * s
    this.xpGlint.y = m + Math.round(6.5 * s); this.xpGlint.width = this.xpGlint.height = 10 * s
    this.level.pivot.y = 3.5; this.level.position.set(this.xpX + this.xpWidth - 3 * s, m + 6.5 * s); this.level.scale.set(s)
    this.xpSparkles.forEach((node, i) => { node.position.set(this.xpX + Math.round((0.1 + 0.2 * i) * this.xpWidth / s) * s, m + Math.round(6.5 * s)) })
    const f = m + 13 * s + 3 * u; const timerTop = f + (l.portrait ? 2 : 3) * u; const timerHeight = 14 * u; const timerWidth = this.timer.textWidth * u
    this.timer.scale.set(u); this.timer.pivot.y = 7; this.timer.position.set(Math.round(w / 2), timerTop + 7 * u); this.timerBottom = timerTop + timerHeight
    this.timerPlate.width = Math.round((timerWidth + 36 * u) / u); this.timerPlate.height = 36; this.timerPlate.scale.set(u); this.timerPlate.position.set(Math.round(w / 2 - (timerWidth + 36 * u) / 2), timerTop - 11 * u)
    this.pauseButton.setSize(15, 15, Math.max(27, Math.ceil(44 / u))); this.pauseWindow.scale.set(u); this.pauseWindow.position.set(Math.round(w / 2 + timerWidth / 2 + 10 * u), Math.round(timerTop + timerHeight / 2 - 7.5 * u))
    const slotY = l.portrait ? timerTop + timerHeight + 6 * u : f
    this.slotsFrame.position.set(m, slotY); this.slotsFrame.scale.set(s); this.build.layout(s, 1, Infinity, true); this.build.position.set(m, slotY); this.slotBottom = slotY + 62 * s
    const counterWidth = 31 + Math.ceil(36 * u / s); const counterX = w - m - counterWidth * s; const stacked = l.portrait && counterX < m + 135 * s + m
    this.counters.position.set(stacked ? m : counterX, stacked ? slotY + 62 * s + 2 * u : slotY)
    this.counterFrame.width = counterWidth; this.counterFrame.height = 44; this.counterFrame.scale.set(s)
    for (let i = 0; i < 2; i++) {
      const image = i ? this.coinIcon : this.killIcon; const value = i ? this.gold : this.kills; const y = (5 + i * 18) * s
      image.position.set(13 * s, y + 8 * s); image.scale.set(s)
      value.pivot.y = 4; value.position.set((counterWidth - 5) * s, Math.round(y + (16 * s - 7 * u) / 2) + 4 * u); value.scale.set(u)
    }
    this.goldY = this.gold.y; this.hp.scale.set(s)
    const bossHeight = 10 * u + 6 * s; const available = this.counters.x - (m + 135 * s) - 12 * u; const bossWidth = Math.max(60 * s, Math.min(Math.round(w * 0.32), available)); const bossY = l.portrait ? slotY + 6 * u : timerTop + timerHeight + 12 * u
    this.bandBottom = Math.max(this.slotBottom, this.counters.y + 44 * s, bossY + bossHeight)
    const center = stacked ? Math.round((m + counterWidth * s + 8 * u + w - m) / 2) : Math.round(w / 2); const top = stacked ? this.counters.y + 2 * u : bossY; const barY = top + 10 * u; const barW = Math.round((stacked ? w - m - (m + counterWidth * s + 8 * u) : bossWidth) / s); const left = Math.round(center - barW * s / 2); const width = (barW - 2) * s
    this.bossNameY = top; this.bossName.position.set(center, top); this.bossName.scale.set(u)
    this.bossFrame.position.set(left, barY); this.bossFrame.width = barW; this.bossFrame.height = 6; this.bossFrame.scale.set(s)
    for (const node of [this.bossBack, this.bossChip, this.bossFill, this.bossFlash]) { node.position.set(left + s, barY + s); node.width = width; node.height = 4 * s }
    this.bossBox.pivot.set(center, barY + 3 * s); this.bossBox.position.copyFrom(this.bossBox.pivot)
    this.bossHalves.forEach((node, i) => {
      for (const child of node.removeChildren()) child.destroy({ children: true })
      const halfW = (i ? barW - Math.floor(barW / 2) : Math.floor(barW / 2)) * s; const frame = panel(halfW / s, 6, 'thinFrame'); const fill = box(halfW - 2 * s, 4 * s, 0xFFFFFF, 1, s, s)
      frame.scale.set(s); node.addChild(box(halfW - 2 * s, 4 * s, 1836553, 1, s, s), fill, frame); node.pivot.set(Math.round(halfW / 2), 3 * s); node.position.set(left + (i ? Math.floor(barW / 2) * s : 0) + node.pivot.x, barY + 3 * s); node.visible = false
      this.bossHalfBase[i] = { x: node.x, y: node.y }
    })
    this.bossArrow.scale.set(2 * u); this.arrowGlow.width = this.arrowGlow.height = 40 * u
    this.banner?.place(this.bandBottom)
  }

  showBanner(main: string, sub: string, style: number, hold: number, slam: boolean): void {
    this.banner?.destroy({ children: true })
    this.banner = new Banner(main, sub, style, hold, slam)
    this.banner.place(this.bandBottom)
    this.moments.addChild(this.banner)
  }

  showNotice(value: string): void {
    this.minute?.node.destroy({ children: true })
    const l = uiLayout(); const node = new Container(); const line = text(value, 0, 8, 0, colors.text, 0.5); const plate = panel(line.textWidth + 24, 23, 'softRect')
    plate.pivot.x = Math.round((line.textWidth + 24) / 2); plate.tint = 0; plate.alpha = 0.5; node.addChild(plate, line); node.scale.set(l.unit); node.position.set(Math.round(l.w / 2) * l.unit, l.short ? l.height - 27 * l.unit : this.timerBottom + 6 * l.unit)
    this.moments.addChild(node)
    this.minute = { node, age: 0 }
    this.timerAge = 0
  }

  setTimerWarning(enabled: boolean): void {
    this.timerWarning = enabled
    if (enabled)
      this.timerAge = 0
  }

  private callout(value: string, style: number, tint: number, big = false, heart = false): void {
    const node = new Container(); const l = uiLayout(); const line = text(value, 0, 0, style, tint, 0.5, big)
    if (big)
      line.scale.set(largeScale(l.unit) / l.unit)
    line.y = -Math.round(line.capHeight * line.scale.y)
    if (heart) { const image = icon('heart'); image.scale.set(Math.max(1, Math.round(l.unit * 0.55)) / l.unit); image.position.set(-Math.round((line.textWidth + image.width + 2) / 2), -Math.round(line.capHeight / 2 + image.height / 2)); line.x = Math.round((image.width + 2) / 2); node.addChild(image) }
    node.addChild(line); node.scale.set(l.unit); this.world.addChild(node); this.callouts.push({ node, age: 0, big })
  }

  private showToast({ icon: iconIndex, rank, name: label }: Pick<Reward, 'icon' | 'rank' | 'name'>): void {
    const l = uiLayout(); const node = new Container(); const well = sprite('slot', 4, 6); const image = icon(iconIndex); const title = text(rank === 5 ? 'MAXED!' : 'NEW WEAPON', 24, 5, rank === 5 ? 1 : 3); const name = text(label, 24, 15); const glint = text(title.text, 24, 5, 0, 16773312); const sparkles = Array.from({ length: 3 }, () => sprite('sparkle'))
    well.scale.set(l.icon / l.unit); image.anchor.set(0.5); image.position.set(4 + 10 * l.icon / l.unit, 6 + 10 * l.icon / l.unit)
    sparkles.forEach((spark, i) => { spark.anchor.set(0.5); spark.position.set(32 + i * 18, i === 1 ? 3 : 8); spark.visible = rank === 5 })
    glint.visible = rank === 5
    node.addChild(panel(116, 26), well, image, title, glint, name, ...sparkles); node.scale.set(l.unit); this.moments.addChild(node); this.toasts.push({ node, image, age: 0, title, glint, sparkles, y: this.toasts.length * 30 * l.unit }); sound('Cursor', 30)
  }

  tick(events: RunEvent[], view: Spriteset_Nightward, dt: number): void {
    const run = this.run; const l = uiLayout(); const { unit: u, icon: s } = l; const still = reducedMotion(); const active = run.state === 'running' && !this.modal; const worldDt = active ? dt : 0
    if (l.width !== this.lastWidth || l.height !== this.lastHeight)
      this.layout()
    this.uiTime += dt; this.shown.age += dt
    this.shown.value = this.shown.from + (this.shown.to - this.shown.from) * out(phase(this.shown.age, this.shown.delay, Math.max(0.001, this.shown.duration)), 2)
    this.screen.alpha = this.world.alpha = this.moments.alpha = this.shown.value
    this.moments.visible = !this.modal; this.pauseWindow.visible = !this.modal; this.pauseButton.tick(dt, active && this.shown.to > 0)
    this.pauseWindow.setLive(active && this.shown.to > 0); this.pauseWindow.update()
    for (const event of events) {
      if (event.kind === 'pickup') {
        if (event.pickup?.startsWith('gem'))
          this.xpAge = 0
        if (event.pickup === 'chicken')
          this.callout('+30 HP', 0, 9105568, false, true)
        if (event.pickup === 'vacuum')
          this.callout('VACUUM!', 0, 10147583)
        if (event.pickup === 'relic')
          this.callout('RELIC!', 3, 0xFFFFFF, true)
      }
      if (event.kind === 'chest' && !event.value) { this.callout('+100 GOLD', 1, 0xFFFFFF); this.goldPopAge = 0 }
      if (event.kind === 'boss')
        this.bossAge = 0
      if (event.kind === 'bossDeath')
        this.bossDeadAt = 0
      if (event.kind === 'hit' && settings.damageNumbers && this.numberBudget >= 1) {
        this.numberBudget--; const crit = event.value! >= 30; const node = new Sprite_NightwardText(String(Math.max(1, Math.round(event.value!))), crit ? 3 : 0, 0.5, crit)
        this.world.addChild(node); this.numbers.push({ text: node, age: 0, x: event.x + (Math.random() - 0.5) * 0.5, z: event.z, height: 0.9 + Math.random() * 0.3, drift: Math.random() - 0.5 })
      }
    }
    this.numberBudget = Math.min(6, this.numberBudget + worldDt * 18)
    if (run.actor.level > this.previousLevel) { this.levelAge = 0; sound('Level', 50) }
    if (run.kills > this.previousKills) {
      if (Math.floor(run.kills / 100) > Math.floor(this.previousKills / 100)) { this.killAge = this.skullAge = 0; this.killPeak = 1.4; sound('Cursor', 30) }
      else if (this.killAge > 0.15) { this.killAge = 0; this.killPeak = 1.18 }
    }
    if (run.party.gold() > this.previousGold && this.goldAge > 0.12)
      this.goldAge = 0
    this.previousLevel = run.actor.level
    this.previousKills = run.kills
    this.previousGold = run.party.gold()
    this.xpAge += dt; this.levelAge += dt; this.killAge += dt; this.skullAge += dt; this.goldAge += dt; this.goldPopAge += dt; this.timerAge += dt
    const levelStart = run.actor.currentLevelExp()
    const exp = run.actor.currentExp() - levelStart
    const levelSpan = run.actor.nextLevelExp() - levelStart
    const target = run.actor.level + Math.min(0.999, exp / levelSpan)
    this.xpShown = this.xpShown > target ? target : approach(this.xpShown, target, 7, dt)
    const filled = Math.round(this.xpWidth * (this.xpShown - Math.floor(this.xpShown)) / s) * s
    this.xpFill.width = filled; this.xpFill.visible = filled > 0; this.xpEdge.x = this.xpX + filled - s; this.xpEdge.visible = filled > s
    this.xpGlint.x = this.xpX + Math.max(s, filled); this.xpGlint.alpha = 0.8 * (1 - out(phase(this.xpAge, 0, 0.25)))
    const shine = this.uiTime % 3.2 / 1.1; const shineX = Math.round(shine * (filled + 6 * s) / s) * s - 3 * s
    this.xpShine.visible = shine < 1 && shineX > 0 && shineX + 3 * s < filled; this.xpShine.x = this.xpX + shineX
    this.xpFlash.alpha = (still ? 0.34 : 0.85) * (1 - out(phase(this.levelAge, 0, 0.6)))
    this.level.text = `LV ${run.actor.level}`; this.level.tint = mixColor(16767336, 0xFFFFFF, out(phase(this.levelAge, 0, 0.5))); this.level.scale.set(s * (still ? 1 : 1.7 - 0.7 * back(phase(this.levelAge, 0, 0.4), 3)))
    this.xpSparkles.forEach((node, i) => { const p = phase(this.levelAge, i * 0.05, 0.5); node.scale.set(!still && p < 1 ? Math.sin(p * Math.PI) * 1.2 * s : 0); node.rotation = p * Math.PI / 4 })
    this.timer.text = clock(run.time); this.timer.tint = this.timerWarning ? 16743014 : mixColor(colors.gold, 0xFFFFFF, out(phase(this.timerAge, 0, 0.5))); this.timer.scale.set(u * (still ? 1 : 1.25 - 0.25 * back(phase(this.timerAge, 0, 0.3), 3)))
    this.kills.text = String(run.kills); this.kills.scale.set(u * (still ? 1 : this.killPeak - (this.killPeak - 1) * (this.killPeak === 1.18 ? out(phase(this.killAge, 0, 0.18)) : back(phase(this.killAge, 0, 0.3), 3))))
    this.kills.tint = mixColor(16767336, 0xFFFFFF, out(phase(this.skullAge, 0, 0.4))); this.killIcon.scale.set(s * (still ? 1 : 1.5 - 0.5 * back(phase(this.skullAge, 0, 0.3), 3)))
    this.gold.text = String(run.party.gold()); this.gold.y = this.goldY - (still ? 0 : Math.round(2 * Math.sin(phase(this.goldAge, 0, 0.25) * Math.PI)) * u); this.coinIcon.scale.x = s * (still ? 1 : 1 - 0.85 * Math.sin(phase(this.goldAge, 0, 0.2) * Math.PI))
    this.gold.scale.set(u * (still ? 1 : 1.4 - 0.4 * back(phase(this.goldPopAge, 0, 0.3), 3)))
    this.build.fill(run.build, true); this.build.tick(dt)
    const hp = run.actor.hpRate(); const on = !run.actor.isDead() && hp < 0.999
    this.hpAlpha = approach(this.hpAlpha, on ? 1 : 0, on ? 10 : 3, dt); this.chip = this.chip < hp ? hp : approach(this.chip, hp, 3, dt)
    const foot = view.view.worldToScreen({ x: run.hero.x, y: 0, z: run.hero.z })
    this.hp.alpha = this.hpAlpha; this.hp.visible = !!foot && this.hpAlpha > 0.01
    if (foot)
      this.hp.position.set(snap(foot.x - 11 * s), snap(foot.y + 5 * s))
    this.hpFill.width = Math.round(20 * hp); this.hpChip.width = Math.round(20 * this.chip); this.hpFlash.alpha = 0.85 * run.invulnerable ** 2
    const low = hp < 0.25 && !run.actor.isDead(); const beat = this.uiTime % 0.8 / 0.8
    this.lowAlpha = approach(this.lowAlpha, low ? still ? 0.3 : 0.18 + 0.24 * Math.sin(beat * Math.PI) ** 2 : 0, low ? 10 : 4, dt); this.lowHp.alpha = this.lowAlpha * this.shown.value
    this.updateBoss(view, dt)
    this.updateNumbers(view, worldDt)
    this.callouts = this.callouts.filter((callout) => {
      callout.age += worldDt
      if (callout.age >= 1) { callout.node.destroy({ children: true }); return false }
      const point = view.view.worldToScreen({ x: run.hero.x, y: 2, z: run.hero.z }); const age = callout.age
      callout.node.visible = !!point
      if (point)
        callout.node.position.set(Math.round(point.x), Math.round(point.y - (still ? 0 : 18 * u * out(phase(age, 0, 0.9)))))
      callout.node.alpha = 1 - phase(age, 0.75, 0.25) ** 2; callout.node.scale.set(u * (still ? 1 : age < 0.12 ? 0.4 + 0.75 * back(phase(age, 0, 0.12), 3) : 1.15 - 0.15 * out(phase(age, 0.12, 0.1))))
      return true
    })
    this.flightItems = this.flightItems.filter((flight) => {
      flight.age += dt
      const p = phase(flight.age, 0, 0.45); const first = p < 0.5; const k = sine(first ? p * 2 : p * 2 - 1); const midX = (flight.from.x + flight.to.x) / 2; const top = flight.from.y - 14 * u
      flight.image.position.set(Math.round(first ? flight.from.x + (midX - flight.from.x) * k : midX + (flight.to.x - midX) * k), Math.round(first ? flight.from.y + (top - flight.from.y) * k : top + (flight.to.y - top) * k)); flight.image.scale.set(flight.from.scale + (flight.to.scale - flight.from.scale) * sine(p))
      if (p < 1)
        return true
      flight.image.destroy(); this.land(flight.key); return false
    })
    if (this.banner?.tick(worldDt)) { this.banner.destroy({ children: true }); this.banner = undefined }
    if (this.minute) { this.minute.age += worldDt; const age = this.minute.age; this.minute.node.alpha = phase(age, 0.05, 0.2) * (1 - phase(age, 2.05, 0.3) ** 3); this.minute.node.children[0]!.scale.x = out(phase(age, 0, 0.2), 4); if (age > 2.35) { this.minute.node.destroy({ children: true }); this.minute = undefined } }
    this.updateToasts(worldDt, active)
    if (this.hint) {
      this.hintAge += worldDt
      const exit = this.walked >= 0.25 || this.hintAge > 8.9; const age = this.hintAge
      this.hint.alpha = phase(age, 0.9, 0.4) * (exit ? 1 - phase(this.walked >= 0.25 ? this.walked - 0.25 : age - 8.9, 0, 0.3) : 1)
      this.hint.y = this.hintY + (still ? 0 : Math.round(6 * (1 - out(phase(age, 0.9, 0.4))) + (exit ? 6 * phase(this.walked >= 0.25 ? this.walked - 0.25 : age - 8.9, 0, 0.3) ** 3 : 0)) * u)
      this.hintBody!.y = still || age < 1.3 ? 0 : Math.round(-1 + Math.cos((age - 1.3) * Math.PI / 1.2))
      const pressed = { w: Input.isPressed('up'), a: Input.isPressed('left'), s: Input.isPressed('down'), d: Input.isPressed('right') }
      this.hintCaps.forEach(({ frame, key }) => { frame.tint = pressed[key as keyof typeof pressed] ? colors.lantern : 0xFFFFFF })
      if (this.hintKnob)
        this.hintKnob.position.set(Math.round(12 + 6 * Math.cos(age * Math.PI * 2 / 1.6)), Math.round(12 + 6 * Math.sin(age * Math.PI * 2 / 1.6)))
      if (exit && this.hint.alpha <= 0.001) { this.hint.destroy({ children: true }); this.hint = undefined; if (this.walked >= 0.25) { settings.seenMoveHint = true; ConfigManager.save() } }
    }
    this.touchAlpha = approach(this.touchAlpha, this.stickOrigin && active ? 1 : 0, this.stickOrigin ? 20 : 8, dt); this.stick.alpha = this.touchAlpha
    const limit = 22 * u; const length = Math.hypot(this.stickDelta.x, this.stickDelta.z); const strength = length > limit ? limit / length : 1
    this.stickRing.scale.set(u * (0.85 + 0.15 * this.touchAlpha)); this.stickKnob.scale.set(u); this.stickKnob.position.set(Math.round(this.stickDelta.x * strength), Math.round(this.stickDelta.z * strength))
  }

  private updateBoss(view: Spriteset_Nightward, dt: number): void {
    const l = uiLayout(); const u = l.unit; const s = l.icon; const enemy = this.run.boss; const still = reducedMotion()
    if (this.bossAge >= 0)
      this.bossAge += dt
    const age = this.bossAge; const hp = enemy?.battler.hpRate() ?? 0
    if (hp < this.bossHp)
      this.bossHit = 0.8
    this.bossHp = hp; this.bossHit = approach(this.bossHit, 0, 14, dt)
    const shown = Math.min(hp, out(phase(age, 0.2, 1.2), 4)); this.bossShown = this.bossShown < shown ? shown : approach(this.bossShown, shown, 2.5, dt)
    const width = this.bossBack.width
    this.bossFill.width = Math.round(width * shown / s) * s; this.bossChip.width = Math.round(width * this.bossShown / s) * s; this.bossFlash.alpha = this.bossHit
    this.boss.alpha = phase(age, 0, 0.3) * this.shown.value; this.boss.visible = age >= 0
    this.bossBox.scale.x = still ? 1 : out(phase(age, 0, 0.4), 4)
    this.bossName.glyphs.forEach((glyph, i) => { glyph.alpha = phase(age, 0.15 + i * 0.03, 0.1); glyph.y = still ? -1 : Math.round(-7 + 6 * back(phase(age, 0.15 + i * 0.03, 0.3), 1.8)) })
    this.bossName.tint = hp < 0.3 ? mixColor(16729654, 0xFFFFFF, sine(this.uiTime % 1.2 / 0.6)) : 0xFFFFFF
    if (this.bossDeadAt >= 0) {
      this.bossDeadAt += dt; const t = this.bossDeadAt
      this.bossBox.visible = t < 0.1; this.bossFlash.alpha = 1; this.bossName.alpha = 1 - phase(t, 0.1, 0.3) ** 3; this.bossName.y = this.bossNameY - 4 * u * phase(t, 0.1, 0.3) ** 3
      this.bossHalves.forEach((half, i) => { const k = phase(t, 0.1, 0.5); const side = i ? 1 : -1; const base = this.bossHalfBase[i]!; half.visible = t >= 0.1 && t < 0.6; half.alpha = 1 - k ** 3; half.rotation = side * 0.15 * k ** 3; half.position.set(base.x + side * 6 * u * out(k), base.y + 8 * u * k ** 3); (half.children[1] as Sprite).alpha = 1 - phase(t, 0.1, 0.25) })
      if (t >= 0.6)
        this.boss.visible = false
    }
    this.bossArrow.visible = this.arrowGlow.visible = false
    if (!enemy || enemy.dead)
      return
    const point = view.view.worldToScreen({ x: enemy.x, y: Math.max(0, enemy.data.hover) + 1.6, z: enemy.z })
    if (!point || point.x >= 0 && point.x <= l.width && point.y >= 0 && point.y <= l.height)
      return
    const margin = l.margin + 14 * u; const cx = l.width / 2; const cy = l.height / 2; const dx = point.x - cx; const dy = point.y - cy; const top = Math.max(this.bandBottom + 6 * u, margin) - cy
    let k = Infinity
    if (dx)
      k = Math.min(k, (cx - margin) / Math.abs(dx))
    if (dy < 0)
      k = Math.min(k, top / dy)
    else if (dy > 0)
      k = Math.min(k, (l.height - margin - cy) / dy)
    this.bossArrow.visible = this.arrowGlow.visible = true; this.bossArrow.position.set(Math.round(cx + dx * k), Math.round(cy + dy * k)); this.arrowGlow.position.copyFrom(this.bossArrow.position); this.bossArrow.rotation = Math.atan2(dy, dx); this.bossArrow.alpha = 0.75 + 0.25 * sine(this.uiTime % 0.6 / 0.3); this.arrowGlow.alpha = 0.35 + 0.35 * sine(this.uiTime % 0.6 / 0.3)
  }

  private updateNumbers(view: Spriteset_Nightward, dt: number): void {
    const run = this.run; const u = uiLayout().unit; const foot = view.view.worldToScreen({ x: run.hero.x, y: 0, z: run.hero.z }); const edge = view.view.worldToScreen({ x: run.hero.x + 1, y: 0, z: run.hero.z }); const worldUnit = foot && edge ? Math.abs(foot.x - edge.x) : 0; const left = foot ? foot.x - 0.42 * worldUnit - 2 * u : 0; const right = foot ? foot.x + 0.42 * worldUnit + 2 * u : -1; const top = foot ? foot.y - 1.5 * worldUnit - 2 * u : 0; const bottom = foot ? foot.y + 2 * u : 0
    this.numbers = this.numbers.filter((item) => {
      item.age += dt; const age = item.age; const node = item.text
      if (age > 0.75) { node.destroy({ children: true }); return false }
      const point = view.view.worldToScreen({ x: item.x, y: item.height, z: item.z })
      node.visible = !!point && settings.damageNumbers
      if (!point)
        return true
      const density = uiLayout().resolution; const p = age / 0.75; const scale = Math.max(1 / density, Math.round(u * density * (1.9 - 0.9 * back(phase(age, 0, 0.16), 1.70158)) * 2) / 2 / density); const half = node.textWidth * scale / 2; const height = node.capHeight * scale; const baseY = point.y - (node.big ? 10 : 6) * u
      let x = point.x + item.drift * 10 * u * p
      const y = baseY - out(p) * 14 * u
      if (item.push === undefined) { const reach = half + Math.abs(item.drift) * 10 * u; const overlaps = right > left && x + reach > left && x - reach < right && baseY + height > top && baseY - 14 * u < bottom; item.push = overlaps ? x >= (left + right) / 2 ? right - x + reach : left - x - reach : 0 }
      x += item.push
      if (right > left && x + half > left && x - half < right && y + height > top && y < bottom)
        node.visible = false
      node.position.set(snap(x), snap(y)); node.scale.set(scale); node.alpha = 1 - phase(p, 0.62, 0.38)
      return true
    })
  }

  private updateToasts(dt: number, active: boolean): void {
    const l = uiLayout(); const u = l.unit; const still = reducedMotion()
    if (active && this.toasts.length < 2 && this.toastQueue.length)
      this.showToast(this.toastQueue.shift()!)
    this.toasts = this.toasts.filter((toast, i) => {
      toast.age += dt; const age = toast.age
      toast.y = still ? i * 30 * u : approach(toast.y, i * 30 * u, 20, dt)
      toast.node.position.set((l.portrait ? Math.round((l.w - 116) / 2) : 4) * u + (still ? 0 : Math.round(-40 * (1 - back(phase(age, 0, 0.3))) - 20 * phase(age, 2.5, 0.2) ** 3) * u), (l.portrait ? this.bandBottom + 6 * u : this.slotBottom + 6 * u) + Math.round(toast.y))
      toast.node.alpha = phase(age, 0, 0.12) * (1 - phase(age, 2.5, 0.2) ** 3); toast.image.scale.set(16 / toast.image.texture.frame.width * l.icon / u * (still ? 1 : back(phase(age, 0.1, 0.25), 3)))
      toast.sparkles.forEach((node, index) => { const p = phase(age, 0.2 + index * 0.08, 0.5); node.scale.set(still ? 0 : Math.sin(p * Math.PI) * 1.2); node.rotation = p * Math.PI / 4 })
      const sweep = -16 + phase(age, 0.2, 0.75) * (toast.title.textWidth + 32)
      toast.glint.glyphs.forEach((glyph, index) => { const distance = Math.abs(toast.title.glyphs[index]!.x + 5 - sweep) / 13; glyph.alpha = !still && age >= 0.2 && age < 0.95 ? Math.max(0, 1 - distance * distance) * 0.6 : 0 })
      if (age < 2.7)
        return true
      toast.node.destroy({ children: true }); return false
    })
  }

  override destroy(): void { Graphics.app.canvas.removeEventListener('pointerdown', this.pointerSource); this.flights.destroy({ children: true }); super.destroy({ children: true }) }
}
