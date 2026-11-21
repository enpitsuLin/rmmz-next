import { Container, Sprite } from 'pixi.js'
import type { NineSliceSprite } from 'pixi.js'
import { ConfigManager, Graphics, Input, TouchInput } from 'rmmz-next'
import type { Assets } from './assets'
import { getAssets } from './assets'
import { settings, sound } from './audio'
import { BuildSlots, upgradeNames } from './build-ui'
import type { FamilyKey, Point } from './content'
import type { Reward } from './rewards'
import type { RunEvent, RunSession } from './session'
import type { GraveyardView } from './view'
import type { IconPoint } from './upgrade-ui'
import { approach, back, box, clamp, clock, colors, fitScale, Heading, icon, largeScale, mixColor, out, panel, phase, reducedMotion, sine, snap, sprite, text, UiButton, uiLayout, UiText } from './ui'

interface Flight { image: Sprite, from: IconPoint, to: IconPoint, age: number, key: FamilyKey }
interface DamageNumber { text: UiText, age: number, x: number, z: number, height: number, drift: number, push?: number }
interface Callout { node: Container, age: number, big: boolean }
interface Toast { node: Container, image: Sprite, age: number, title: UiText, glint: UiText, sparkles: Sprite[], y: number }
class Banner extends Container {
  private heading: Heading
  private subtitle: UiText
  private plate = panel(1, 1, 'softRect')
  private body = new Container()
  private diamonds = [sprite('diamond'), sprite('diamond')]
  private age: number
  private heightF = 0
  constructor(main: string, sub: string, style: number, private hold: number, private slam = false, delay = 0) {
    super({ eventMode: 'none' }); this.age = -delay
    const l = uiLayout(), max = slam ? 2 * l.unit : largeScale(l.unit), titleScale = l.short ? l.unit : fitScale(new UiText(main, style, .5, true).textWidth, l.width - 2 * l.margin - 40 * l.unit, max)
    this.heading = new Heading(main, style); this.heading.configure({ halo: 0, lettersAt: .08, drop: 10, letterSeconds: .32, strength: 1.7, stagger: .03, rulesAt: 100, diamondsAt: 100, glintAt: Infinity })
    const titleH = this.heading.layout(titleScale, l.unit, l.w / 2, 0), half = Math.ceil(this.heading.title.textWidth * titleScale / l.unit / 2)
    this.heading.y = 8; this.subtitle = text(sub, 0, 8 + titleH + 6, 0, colors.blue, .5)
    const width = (Math.max(half + 14, Math.ceil(this.subtitle.textWidth / 2)) + 12) * 2
    this.heightF = 16 + titleH + (sub ? 13 : 0); this.plate.width = width; this.plate.height = this.heightF; this.plate.pivot.set(width / 2, this.heightF / 2); this.plate.position.set(0, this.heightF / 2); this.plate.tint = 0; this.plate.alpha = .5
    this.diamonds.forEach((node, i) => { node.anchor.set(.5); node.position.set((i ? 1 : -1) * (half + 10), 8 + Math.round(titleH / 2)); node.tint = style === 2 ? 16732224 : 0xffffff })
    this.body.pivot.set(0, 8 + Math.round(titleH / 2)); this.body.position.copyFrom(this.body.pivot)
    this.body.addChild(this.heading, this.subtitle, ...this.diamonds); this.addChild(this.plate, this.body); this.scale.set(l.unit)
  }
  place(band: number): void {
    const l = uiLayout()
    this.position.set(Math.round(l.w / 2) * l.unit, (l.short ? l.h - 8 - this.heightF : Math.max(Math.ceil(band / l.unit) + 12, Math.round(l.h * .28))) * l.unit)
  }
  tick(dt: number): boolean {
    const before = this.age
    this.age += dt; const age = this.age, still = reducedMotion(), end = .4 + this.hold
    if (before < 0 && age >= 0) sound('Swoosh', 40)
    this.visible = age >= 0; this.heading.animate(this.slam ? age + 2 : age)
    this.plate.scale.x = still ? 1 : out(phase(age, this.slam ? .16 : 0, .25), 4)
    this.subtitle.alpha = out(phase(age, .4, .3)); this.subtitle.y = 8 + this.heading.title.capHeight * this.heading.title.scale.y + 6 + Math.round((still ? 0 : this.slam ? 4 : 3) * (1 - out(phase(age, .4, .3))))
    this.diamonds.forEach(node => { node.scale.set(still ? 1 : back(phase(age, .3, .2), 2.5)); node.alpha = .8 + .2 * Math.cos(age * Math.PI / .8) })
    this.body.scale.set(!still && this.slam ? 2.2 - 1.2 * phase(age, 0, .16) ** 5 : 1)
    this.body.alpha = this.slam && !still ? phase(age, 0, .06) : 1
    this.body.x = !still && this.slam && age >= .16 && age < .46 ? [1, -1, 1, -1, 1, 0][Math.round(phase(age, .16, .3) * 5)]! : 0
    this.alpha = age < 0 ? 0 : still ? phase(age, 0, .15) * (1 - phase(age, .15 + this.hold, .15)) : 1 - phase(age, end, .35) ** 3
    return age >= (still ? this.hold + .3 : end + .35)
  }
}
export class Hud extends Container {
  readonly flights = new Container({ eventMode: 'none' })
  readonly build = new BuildSlots()
  bandBottom = 0
  private world = new Container({ eventMode: 'none' })
  private screen = new Container({ eventMode: 'passive' })
  private moments = new Container({ eventMode: 'none' })
  private xpBack = box(1, 1, 461596)
  private xpFill = sprite('xpFill')
  private xpEdge = box(1, 1, 15267583)
  private xpShine = box(1, 1, 0xffffff, .35)
  private xpGlint = sprite('glow')
  private xpFlash = box(1, 1, 0xffffff, 0)
  private xpFrame = panel(1, 13, 'barFrame')
  private level = text('', 0, 0, 0, 0xffffff, 1)
  private xpSparkles = Array.from({ length: 5 }, () => sprite('sparkle'))
  private timer = text('00:00', 0, 0, 0, 0xffffff, .5, true)
  private timerPlate = panel(1, 1, 'softRect')
  private pauseButton = new UiButton(getAssets().ui.pauseBars!, 15, 15, null)
  private slotsFrame = panel(135, 62)
  private counterFrame = panel(1, 44)
  private counters = new Container()
  private killIcon = icon('kills')
  private coinIcon = icon('coin')
  private kills = text('', 0, 0, 0, 0xffffff, 1)
  private gold = text('', 0, 0, 1, 0xffffff, 1)
  private hp = new Container()
  private hpChip = box(20, 3, 16763040, 1, 1, 1)
  private hpFill = sprite('hpFill', 1, 1)
  private hpFlash = box(20, 3, 0xffffff, 0, 1, 1)
  private hpAlpha = 0
  private chip = 1
  private lowHp = sprite('vignette')
  private boss = new Container()
  private bossBox = new Container()
  private bossName = text('GRAVE REAPER', 0, 0, 2, 0xffffff, .5)
  private bossFrame = panel(1, 6, 'thinFrame')
  private bossBack = box(1, 1, 1836553)
  private bossChip = box(1, 1, 16763040)
  private bossFill = sprite('hpFill')
  private bossFlash = box(1, 1, 0xffffff, 0)
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
  private previousTime = 0
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
  private goldY = 0
  private uiTime = 0
  private lowAlpha = 0
  private shown = { from: 0, to: 1, age: 0, duration: .4, delay: .15, value: 0 }
  private lastWidth = 0
  private lastHeight = 0
  private slotBottom = 0
  private timerBottom = 0
  private flightItems: Flight[] = []
  private numbers: DamageNumber[] = []
  private numberBudget = 6
  private callouts: Callout[] = []
  private toastQueue: { key: FamilyKey, rank: number }[] = []
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
  constructor(private run: RunSession, private assets: Assets, pause: () => void) {
    super({ eventMode: 'passive' })
    this.pauseButton.onActivate = pause
    this.timerPlate.tint = 0; this.timerPlate.alpha = .42
    this.xpGlint.anchor.set(.5); this.xpGlint.tint = 10147583
    this.hpFill.height = 3
    this.hp.addChild(box(20, 3, 1836553, 1, 1, 1), this.hpChip, this.hpFill, this.hpFlash, panel(22, 5, 'thinFrame'))
    this.world.addChild(this.hp)
    this.lowHp.tint = 12588060; this.lowHp.alpha = 0
    this.killIcon.anchor.set(.5); this.coinIcon.anchor.set(.5)
    this.counters.addChild(this.counterFrame, this.killIcon, this.coinIcon, this.kills, this.gold)
    this.bossBox.addChild(this.bossBack, this.bossChip, this.bossFill, this.bossFlash, this.bossFrame)
    this.boss.addChild(...this.bossHalves, this.bossBox, this.bossName)
    this.bossArrow.anchor.set(.5); this.bossArrow.tint = 16729654; this.arrowGlow.anchor.set(.5); this.arrowGlow.tint = 16722460; this.arrowGlow.blendMode = 'add'
    this.xpSparkles.forEach(node => node.anchor.set(.5))
    this.screen.addChild(this.xpBack, this.xpFill, this.xpShine, this.xpEdge, this.xpGlint, this.xpFlash, this.xpFrame, this.level, ...this.xpSparkles, this.timerPlate, this.timer, this.pauseButton, this.slotsFrame, this.build, this.counters, this.boss)
    this.stickRing.anchor.set(.5); this.stickKnob.anchor.set(.5); this.stick.addChild(this.stickRing, this.stickKnob)
    this.addChild(this.world, this.lowHp, this.screen, this.arrowGlow, this.bossArrow, this.moments, this.stick)
    this.build.fill(run.buildOrder.map(key => ({ key, rank: run.rank(key) }))); this.layout()
    Graphics.app.canvas.addEventListener('pointerdown', this.pointerSource)
  }
  setShown(to: boolean, duration = .2, delay = 0): void { this.shown = { from: this.shown.value, to: Number(to), age: 0, duration, delay, value: this.shown.value } }
  setModal(open: boolean): void { this.modal = open; if (open) this.blockPointer() }
  playIntro(hint: boolean): void {
    this.showBanner('SURVIVE THE NIGHT', 'The Grave Reaper rises at 3:00', 1, 2, false, .5)
    if (hint) {
      const l = uiLayout(), root = new Container(), body = new Container(), sub = text('Your weapons fire on their own', 0, 25, 0, colors.blue, .5)
      const cap = (value: string): { node: Container, width: number } => {
        const node = new Container(), line = text(value, 3, 2), width = line.textWidth + 6, frame = panel(width, 11, 'keycap')
        node.addChild(frame, line)
        if (value.length === 1) this.hintCaps.push({ frame, key: value.toLowerCase() })
        return { node, width }
      }
      const word = (value: string, tint = 0xffffff): { node: Container, width: number } => { const node = text(value, 0, 2, 0, tint); return { node, width: node.textWidth } }
      const line = (parts: { node: Container, width: number }[], caps = 0): { node: Container, width: number } => {
        const node = new Container(); let x = 0
        parts.forEach((part, i) => { part.node.x = x; node.addChild(part.node); x += part.width + (i < caps - 1 ? 3 : 5) })
        node.pivot.x = Math.round((x - 5) / 2); node.y = 8; return { node, width: x - 5 }
      }
      const keys = line([...['W', 'A', 'S', 'D'].map(cap), word('or', colors.dim), word('arrows'), word('to move')], 4), pad = line([cap('L STICK'), word('to move')]), touchArt = new Container(), ring = sprite('ring'), knob = sprite('knob')
      ring.anchor.set(.5); knob.anchor.set(.5); ring.scale.set(.5); knob.scale.set(.5); ring.position.set(12, 12); knob.position.set(18, 12); touchArt.addChild(ring, knob); touchArt.y = -7
      const touch = line([{ node: touchArt, width: 26 }, word('Drag anywhere to move')]), controller = [...navigator.getGamepads()].some(pad => pad?.connected && (pad.axes.some(value => Math.abs(value) > .2) || pad.buttons.some(button => button.pressed))), selected = l.tap ? touch : controller ? pad : keys
      const width = Math.max(keys.width, pad.width, touch.width, sub.textWidth) + 24, plate = panel(width, 40, 'softRect')
      for (const row of [keys, pad, touch]) row.node.visible = row === selected
      this.hintKnob = selected === touch ? knob : undefined
      plate.x = -Math.round(width / 2); plate.tint = 0; plate.alpha = .45; body.addChild(keys.node, pad.node, touch.node, sub); root.addChild(plate, body); root.scale.set(l.unit)
      this.hintY = Math.round(l.h * (l.portrait ? .78 : .74) - 20) * l.unit; root.position.set(Math.round(l.w / 2) * l.unit, this.hintY)
      this.hint = root; this.hintBody = body; this.moments.addChild(root)
    }
  }
  blockPointer(): void { this.blockTouch = true; this.stickOrigin = undefined }
  movement(): Point {
    let x = Number(Input.isPressed('right')) - Number(Input.isPressed('left')), z = Number(Input.isPressed('down')) - Number(Input.isPressed('up'))
    const pad = [...navigator.getGamepads()].find(pad => pad?.connected)
    if (pad && !x && !z) { const px = pad.axes[0] ?? 0, pz = pad.axes[1] ?? 0, length = Math.hypot(px, pz); if (length > .2) { const strength = Math.min(1, (length - .2) / .8) / length; x = px * strength; z = pz * strength } }
    if (!TouchInput.isPressed()) { this.stickOrigin = undefined; this.blockTouch = false }
    if (this.touchSource && !this.blockTouch && TouchInput.isTriggered() && TouchInput.y > this.bandBottom) this.stickOrigin = { x: TouchInput.x, z: TouchInput.y }
    if (this.stickOrigin && TouchInput.isPressed()) {
      const limit = 22 * uiLayout().unit
      let dx = TouchInput.x - this.stickOrigin.x, dz = TouchInput.y - this.stickOrigin.z, length = Math.hypot(dx, dz)
      if (length > limit * 1.6) { const k = (length - limit * 1.6) / length; this.stickOrigin.x += dx * k; this.stickOrigin.z += dz * k; dx = TouchInput.x - this.stickOrigin.x; dz = TouchInput.y - this.stickOrigin.z; length = Math.hypot(dx, dz) }
      this.stickDelta = { x: dx, z: dz }
      const strength = clamp(length / limit), gain = strength < .12 ? 0 : (strength - .12) / .88 / (length || 1)
      if (!x && !z) { x = dx * gain; z = dz * gain }
      this.stick.position.set(this.stickOrigin.x, this.stickOrigin.z)
    }
    if (this.hintAge >= .9 && Math.hypot(x, z) > .3) this.walked += 1 / 60
    return { x, z }
  }
  private items(): { key: FamilyKey, rank: number }[] { return this.run.result?.build ?? this.run.buildOrder.map(key => ({ key, rank: this.run.rank(key) })) }
  hold(reward: Reward): void {
    this.build.hold(reward.key, reward.rank - 1)
    this.build.fill(this.items())
    if (reward.weapon && (reward.rank === 1 || reward.rank === 5)) this.toastQueue.push({ key: reward.key, rank: reward.rank })
  }
  fly(reward: Reward, from: IconPoint): void {
    this.build.fill(this.items())
    const to = this.build.point(reward.key)
    if (!to || reducedMotion()) { this.land(reward.key); return }
    const image = new Sprite(this.assets.hudIcons[reward.key]!)
    image.anchor.set(.5); image.position.set(from.x, from.y); image.scale.set(from.scale); this.flights.addChild(image)
    this.flightItems.push({ image, from, to, age: 0, key: reward.key })
  }
  private land(key: FamilyKey): void {
    this.build.release(key); this.build.fill(this.items(), true); sound('Tick', 45, 137.5)
  }
  private layout(): void {
    const l = uiLayout(), { width: w, height: h, unit: u, icon: s, margin: m } = l, inner = w - m * 2
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
    this.xpSparkles.forEach((node, i) => { node.position.set(this.xpX + Math.round((.1 + .2 * i) * this.xpWidth / s) * s, m + Math.round(6.5 * s)) })
    const f = m + 13 * s + 3 * u, timerTop = f + (l.portrait ? 2 : 3) * u, timerHeight = 14 * u, timerWidth = this.timer.textWidth * u
    this.timer.scale.set(u); this.timer.pivot.y = 7; this.timer.position.set(Math.round(w / 2), timerTop + 7 * u); this.timerBottom = timerTop + timerHeight
    this.timerPlate.width = Math.round((timerWidth + 36 * u) / u); this.timerPlate.height = 36; this.timerPlate.scale.set(u); this.timerPlate.position.set(Math.round(w / 2 - (timerWidth + 36 * u) / 2), timerTop - 11 * u)
    this.pauseButton.scale.set(u); this.pauseButton.setSize(15, 15, Math.max(27, Math.ceil(44 / u))); this.pauseButton.position.set(Math.round(w / 2 + timerWidth / 2 + 10 * u), Math.round(timerTop + timerHeight / 2 - 7.5 * u))
    const slotY = l.portrait ? timerTop + timerHeight + 6 * u : f
    this.slotsFrame.position.set(m, slotY); this.slotsFrame.scale.set(s); this.build.layout(s, 1, Infinity, true); this.build.position.set(m, slotY); this.slotBottom = slotY + 62 * s
    const counterWidth = 31 + Math.ceil(36 * u / s), counterX = w - m - counterWidth * s, stacked = l.portrait && counterX < m + 135 * s + m
    this.counters.position.set(stacked ? m : counterX, stacked ? slotY + 62 * s + 2 * u : slotY)
    this.counterFrame.width = counterWidth; this.counterFrame.height = 44; this.counterFrame.scale.set(s)
    for (let i = 0; i < 2; i++) {
      const image = i ? this.coinIcon : this.killIcon, value = i ? this.gold : this.kills, y = (5 + i * 18) * s
      image.position.set(13 * s, y + 8 * s); image.scale.set(s)
      value.pivot.y = 4; value.position.set((counterWidth - 5) * s, Math.round(y + (16 * s - 7 * u) / 2) + 4 * u); value.scale.set(u)
    }
    this.goldY = this.gold.y; this.hp.scale.set(s)
    const bossHeight = 10 * u + 6 * s, available = this.counters.x - (m + 135 * s) - 12 * u, bossWidth = Math.max(60 * s, Math.min(Math.round(w * .32), available)), bossY = l.portrait ? slotY + 6 * u : timerTop + timerHeight + 12 * u
    this.bandBottom = Math.max(this.slotBottom, this.counters.y + 44 * s, bossY + bossHeight)
    const center = stacked ? Math.round((m + counterWidth * s + 8 * u + w - m) / 2) : Math.round(w / 2), top = stacked ? this.counters.y + 2 * u : bossY, barY = top + 10 * u, barW = Math.round((stacked ? w - m - (m + counterWidth * s + 8 * u) : bossWidth) / s), left = Math.round(center - barW * s / 2), width = (barW - 2) * s
    this.bossNameY = top; this.bossName.position.set(center, top); this.bossName.scale.set(u)
    this.bossFrame.position.set(left, barY); this.bossFrame.width = barW; this.bossFrame.height = 6; this.bossFrame.scale.set(s)
    for (const node of [this.bossBack, this.bossChip, this.bossFill, this.bossFlash]) { node.position.set(left + s, barY + s); node.width = width; node.height = 4 * s }
    this.bossBox.pivot.set(center, barY + 3 * s); this.bossBox.position.copyFrom(this.bossBox.pivot)
    this.bossHalves.forEach((node, i) => {
      for (const child of node.removeChildren()) child.destroy({ children: true })
      const halfW = (i ? barW - Math.floor(barW / 2) : Math.floor(barW / 2)) * s, frame = panel(halfW / s, 6, 'thinFrame'), fill = box(halfW - 2 * s, 4 * s, 0xffffff, 1, s, s)
      frame.scale.set(s); node.addChild(box(halfW - 2 * s, 4 * s, 1836553, 1, s, s), fill, frame); node.pivot.set(Math.round(halfW / 2), 3 * s); node.position.set(left + (i ? Math.floor(barW / 2) * s : 0) + node.pivot.x, barY + 3 * s); node.visible = false
      this.bossHalfBase[i] = { x: node.x, y: node.y }
    })
    this.bossArrow.scale.set(2 * u); this.arrowGlow.width = this.arrowGlow.height = 40 * u
    this.banner?.place(this.bandBottom)
  }
  private showBanner(main: string, sub: string, style: number, hold: number, slam = false, delay = 0): void {
    this.banner?.destroy({ children: true }); this.banner = new Banner(main, sub, style, hold, slam, delay); this.banner.place(this.bandBottom); this.moments.addChild(this.banner)
    if (!delay) sound('Swoosh', 40)
  }
  private showMinute(value: string): void {
    this.minute?.node.destroy({ children: true })
    const l = uiLayout(), node = new Container(), line = text(value, 0, 8, 0, colors.text, .5), plate = panel(line.textWidth + 24, 23, 'softRect')
    plate.pivot.x = Math.round((line.textWidth + 24) / 2); plate.tint = 0; plate.alpha = .5; node.addChild(plate, line); node.scale.set(l.unit); node.position.set(Math.round(l.w / 2) * l.unit, l.short ? l.height - 27 * l.unit : this.timerBottom + 6 * l.unit)
    this.moments.addChild(node); this.minute = { node, age: 0 }; this.timerAge = 0; sound('Swoosh', 35)
  }
  private callout(value: string, style: number, tint: number, big = false, heart = false): void {
    const node = new Container(), l = uiLayout(), line = text(value, 0, 0, style, tint, .5, big)
    if (big) line.scale.set(largeScale(l.unit) / l.unit)
    line.y = -Math.round(line.capHeight * line.scale.y)
    if (heart) { const image = icon('heart'); image.scale.set(Math.max(1, Math.round(l.unit * .55)) / l.unit); image.position.set(-Math.round((line.textWidth + image.width + 2) / 2), -Math.round(line.capHeight / 2 + image.height / 2)); line.x = Math.round((image.width + 2) / 2); node.addChild(image) }
    node.addChild(line); node.scale.set(l.unit); this.world.addChild(node); this.callouts.push({ node, age: 0, big })
  }
  private showToast(key: FamilyKey, rank: number): void {
    const l = uiLayout(), node = new Container(), well = sprite('slot', 4, 6), image = icon(key), title = text(rank === 5 ? 'MAXED!' : 'NEW WEAPON', 24, 5, rank === 5 ? 1 : 3), name = text(upgradeNames[key], 24, 15), glint = text(title.text, 24, 5, 0, 16773312), sparkles = Array.from({ length: 3 }, () => sprite('sparkle'))
    well.scale.set(l.icon / l.unit); image.anchor.set(.5); image.position.set(4 + 10 * l.icon / l.unit, 6 + 10 * l.icon / l.unit)
    sparkles.forEach((spark, i) => { spark.anchor.set(.5); spark.position.set(32 + i * 18, i === 1 ? 3 : 8); spark.visible = rank === 5 })
    glint.visible = rank === 5
    node.addChild(panel(116, 26), well, image, title, glint, name, ...sparkles); node.scale.set(l.unit); this.moments.addChild(node); this.toasts.push({ node, image, age: 0, title, glint, sparkles, y: this.toasts.length * 30 * l.unit }); sound('Cursor', 30)
  }
  tick(events: RunEvent[], view: GraveyardView, dt: number): void {
    const run = this.run, l = uiLayout(), { unit: u, icon: s } = l, still = reducedMotion(), active = run.state === 'running' && !this.modal, worldDt = active ? dt : 0
    if (l.width !== this.lastWidth || l.height !== this.lastHeight) this.layout()
    this.uiTime += dt; this.shown.age += dt
    this.shown.value = this.shown.from + (this.shown.to - this.shown.from) * out(phase(this.shown.age, this.shown.delay, Math.max(.001, this.shown.duration)), 2)
    this.screen.alpha = this.world.alpha = this.moments.alpha = this.shown.value
    this.moments.visible = !this.modal; this.pauseButton.visible = !this.modal; this.pauseButton.tick(dt, active && this.shown.to > 0)
    for (const event of events) {
      if (event.kind === 'pickup') {
        if (event.pickup?.startsWith('gem')) this.xpAge = 0
        if (event.pickup === 'chicken') this.callout('+30 HP', 0, 9105568, false, true)
        if (event.pickup === 'vacuum') this.callout('VACUUM!', 0, 10147583)
        if (event.pickup === 'relic') this.callout('RELIC!', 3, 0xffffff, true)
      }
      if (event.kind === 'chest' && !event.value) { this.callout('+100 GOLD', 1, 0xffffff); this.goldPopAge = 0 }
      if (event.kind === 'boss') { this.bossAge = 0; this.showBanner('GRAVE REAPER', 'Slay him to win the night', 2, 2.2, true) }
      if (event.kind === 'bossDeath') this.bossDeadAt = 0
      if (event.kind === 'hit' && settings.damageNumbers && this.numberBudget >= 1) {
        this.numberBudget--; const crit = event.value! >= 30, node = new UiText(String(Math.max(1, Math.round(event.value!))), crit ? 3 : 0, .5, crit)
        this.world.addChild(node); this.numbers.push({ text: node, age: 0, x: event.x + (Math.random() - .5) * .5, z: event.z, height: .9 + Math.random() * .3, drift: Math.random() - .5 })
      }
    }
    this.numberBudget = Math.min(6, this.numberBudget + worldDt * 18)
    if (run.actor.level > this.previousLevel) { this.levelAge = 0; sound('Level', 50) }
    if (run.kills > this.previousKills) {
      if (Math.floor(run.kills / 100) > Math.floor(this.previousKills / 100)) { this.killAge = this.skullAge = 0; this.killPeak = 1.4; sound('Cursor', 30) }
      else if (this.killAge > .15) { this.killAge = 0; this.killPeak = 1.18 }
    }
    if (run.party.gold() > this.previousGold && this.goldAge > .12) this.goldAge = 0
    for (const at of [60, 120]) if (this.previousTime < at && run.time >= at) this.showMinute(at === 60 ? 'The horde grows' : 'One minute till the Reaper')
    if (this.previousTime < 170 && run.time >= 170) this.showBanner('THE CRYPT STIRS', 'Ready yourself', 2, 2.6)
    if (run.time >= 170 && run.time < 180 && Math.floor(run.time) !== Math.floor(this.previousTime)) { this.timerAge = 0; sound('Tick', 20); if ([170, 171, 172].includes(Math.floor(run.time))) sound('Warn', 50) }
    this.previousTime = run.time; this.previousLevel = run.actor.level; this.previousKills = run.kills; this.previousGold = run.party.gold()
    this.xpAge += dt; this.levelAge += dt; this.killAge += dt; this.skullAge += dt; this.goldAge += dt; this.goldPopAge += dt; this.timerAge += dt
    const exp = run.actor.currentExp() - run.actor.expForLevel(run.actor.level), next = 5 + (run.actor.level - 1) * 10, target = run.actor.level + Math.min(.999, exp / next)
    this.xpShown = this.xpShown > target ? target : approach(this.xpShown, target, 7, dt)
    const filled = Math.round(this.xpWidth * (this.xpShown - Math.floor(this.xpShown)) / s) * s
    this.xpFill.width = filled; this.xpFill.visible = filled > 0; this.xpEdge.x = this.xpX + filled - s; this.xpEdge.visible = filled > s
    this.xpGlint.x = this.xpX + Math.max(s, filled); this.xpGlint.alpha = .8 * (1 - out(phase(this.xpAge, 0, .25)))
    const shine = this.uiTime % 3.2 / 1.1, shineX = Math.round(shine * (filled + 6 * s) / s) * s - 3 * s
    this.xpShine.visible = shine < 1 && shineX > 0 && shineX + 3 * s < filled; this.xpShine.x = this.xpX + shineX
    this.xpFlash.alpha = (still ? .34 : .85) * (1 - out(phase(this.levelAge, 0, .6)))
    this.level.text = `LV ${run.actor.level}`; this.level.tint = mixColor(16767336, 0xffffff, out(phase(this.levelAge, 0, .5))); this.level.scale.set(s * (still ? 1 : 1.7 - .7 * back(phase(this.levelAge, 0, .4), 3)))
    this.xpSparkles.forEach((node, i) => { const p = phase(this.levelAge, i * .05, .5); node.scale.set(!still && p < 1 ? Math.sin(p * Math.PI) * 1.2 * s : 0); node.rotation = p * Math.PI / 4 })
    this.timer.text = clock(run.time); this.timer.tint = run.time >= 170 && run.time < 180 ? 16743014 : mixColor(colors.gold, 0xffffff, out(phase(this.timerAge, 0, .5))); this.timer.scale.set(u * (still ? 1 : 1.25 - .25 * back(phase(this.timerAge, 0, .3), 3)))
    this.kills.text = String(run.kills); this.kills.scale.set(u * (still ? 1 : this.killPeak - (this.killPeak - 1) * (this.killPeak === 1.18 ? out(phase(this.killAge, 0, .18)) : back(phase(this.killAge, 0, .3), 3))))
    this.kills.tint = mixColor(16767336, 0xffffff, out(phase(this.skullAge, 0, .4))); this.killIcon.scale.set(s * (still ? 1 : 1.5 - .5 * back(phase(this.skullAge, 0, .3), 3)))
    this.gold.text = String(run.party.gold()); this.gold.y = this.goldY - (still ? 0 : Math.round(2 * Math.sin(phase(this.goldAge, 0, .25) * Math.PI)) * u); this.coinIcon.scale.x = s * (still ? 1 : 1 - .85 * Math.sin(phase(this.goldAge, 0, .2) * Math.PI))
    this.gold.scale.set(u * (still ? 1 : 1.4 - .4 * back(phase(this.goldPopAge, 0, .3), 3)))
    this.build.fill(run.buildOrder.map(key => ({ key, rank: run.rank(key) })), true); this.build.tick(dt)
    const hp = run.actor.hpRate(), on = !run.actor.isDead() && hp < .999
    this.hpAlpha = approach(this.hpAlpha, on ? 1 : 0, on ? 10 : 3, dt); this.chip = this.chip < hp ? hp : approach(this.chip, hp, 3, dt)
    const foot = view.view.worldToScreen({ x: run.hero.x, y: 0, z: run.hero.z })
    this.hp.alpha = this.hpAlpha; this.hp.visible = !!foot && this.hpAlpha > .01
    if (foot) this.hp.position.set(snap(foot.x - 11 * s), snap(foot.y + 5 * s))
    this.hpFill.width = Math.round(20 * hp); this.hpChip.width = Math.round(20 * this.chip); this.hpFlash.alpha = .85 * run.invulnerable ** 2
    const low = hp < .25 && !run.actor.isDead(), beat = this.uiTime % .8 / .8
    this.lowAlpha = approach(this.lowAlpha, low ? still ? .3 : .18 + .24 * Math.sin(beat * Math.PI) ** 2 : 0, low ? 10 : 4, dt); this.lowHp.alpha = this.lowAlpha * this.shown.value
    this.updateBoss(view, dt)
    this.updateNumbers(view, worldDt)
    this.callouts = this.callouts.filter(callout => {
      callout.age += worldDt
      if (callout.age >= 1) { callout.node.destroy({ children: true }); return false }
      const point = view.view.worldToScreen({ x: run.hero.x, y: 2, z: run.hero.z }), age = callout.age
      callout.node.visible = !!point
      if (point) callout.node.position.set(Math.round(point.x), Math.round(point.y - (still ? 0 : 18 * u * out(phase(age, 0, .9)))))
      callout.node.alpha = 1 - phase(age, .75, .25) ** 2; callout.node.scale.set(u * (still ? 1 : age < .12 ? .4 + .75 * back(phase(age, 0, .12), 3) : 1.15 - .15 * out(phase(age, .12, .1))))
      return true
    })
    this.flightItems = this.flightItems.filter(flight => {
      flight.age += dt
      const p = phase(flight.age, 0, .45), first = p < .5, k = sine(first ? p * 2 : p * 2 - 1), midX = (flight.from.x + flight.to.x) / 2, top = flight.from.y - 14 * u
      flight.image.position.set(Math.round(first ? flight.from.x + (midX - flight.from.x) * k : midX + (flight.to.x - midX) * k), Math.round(first ? flight.from.y + (top - flight.from.y) * k : top + (flight.to.y - top) * k)); flight.image.scale.set(flight.from.scale + (flight.to.scale - flight.from.scale) * sine(p))
      if (p < 1) return true
      flight.image.destroy(); this.land(flight.key); return false
    })
    if (this.banner?.tick(worldDt)) { this.banner.destroy({ children: true }); this.banner = undefined }
    if (this.minute) { this.minute.age += worldDt; const age = this.minute.age; this.minute.node.alpha = phase(age, .05, .2) * (1 - phase(age, 2.05, .3) ** 3); this.minute.node.children[0]!.scale.x = out(phase(age, 0, .2), 4); if (age > 2.35) { this.minute.node.destroy({ children: true }); this.minute = undefined } }
    this.updateToasts(worldDt, active)
    if (this.hint) {
      this.hintAge += worldDt
      const exit = this.walked >= .25 || this.hintAge > 8.9, age = this.hintAge
      this.hint.alpha = phase(age, .9, .4) * (exit ? 1 - phase(this.walked >= .25 ? this.walked - .25 : age - 8.9, 0, .3) : 1)
      this.hint.y = this.hintY + (still ? 0 : Math.round(6 * (1 - out(phase(age, .9, .4))) + (exit ? 6 * phase(this.walked >= .25 ? this.walked - .25 : age - 8.9, 0, .3) ** 3 : 0)) * u)
      this.hintBody!.y = still || age < 1.3 ? 0 : Math.round(-1 + Math.cos((age - 1.3) * Math.PI / 1.2))
      const pressed = { w: Input.isPressed('up'), a: Input.isPressed('left'), s: Input.isPressed('down'), d: Input.isPressed('right') }
      this.hintCaps.forEach(({ frame, key }) => { frame.tint = pressed[key as keyof typeof pressed] ? colors.lantern : 0xffffff })
      if (this.hintKnob) this.hintKnob.position.set(Math.round(12 + 6 * Math.cos(age * Math.PI * 2 / 1.6)), Math.round(12 + 6 * Math.sin(age * Math.PI * 2 / 1.6)))
      if (exit && this.hint.alpha <= .001) { this.hint.destroy({ children: true }); this.hint = undefined; if (this.walked >= .25) { settings.seenMoveHint = true; ConfigManager.save() } }
    }
    this.touchAlpha = approach(this.touchAlpha, this.stickOrigin && active ? 1 : 0, this.stickOrigin ? 20 : 8, dt); this.stick.alpha = this.touchAlpha
    const limit = 22 * u, length = Math.hypot(this.stickDelta.x, this.stickDelta.z), strength = length > limit ? limit / length : 1
    this.stickRing.scale.set(u * (.85 + .15 * this.touchAlpha)); this.stickKnob.scale.set(u); this.stickKnob.position.set(Math.round(this.stickDelta.x * strength), Math.round(this.stickDelta.z * strength))
  }
  private updateBoss(view: GraveyardView, dt: number): void {
    const l = uiLayout(), u = l.unit, s = l.icon, enemy = this.run.boss, still = reducedMotion()
    if (this.bossAge >= 0) this.bossAge += dt
    const age = this.bossAge, hp = enemy?.battler.hpRate() ?? 0
    if (hp < this.bossHp) this.bossHit = .8
    this.bossHp = hp; this.bossHit = approach(this.bossHit, 0, 14, dt)
    const shown = Math.min(hp, out(phase(age, .2, 1.2), 4)); this.bossShown = this.bossShown < shown ? shown : approach(this.bossShown, shown, 2.5, dt)
    const width = this.bossBack.width
    this.bossFill.width = Math.round(width * shown / s) * s; this.bossChip.width = Math.round(width * this.bossShown / s) * s; this.bossFlash.alpha = this.bossHit
    this.boss.alpha = phase(age, 0, .3) * this.shown.value; this.boss.visible = age >= 0
    this.bossBox.scale.x = still ? 1 : out(phase(age, 0, .4), 4)
    this.bossName.glyphs.forEach((glyph, i) => { glyph.alpha = phase(age, .15 + i * .03, .1); glyph.y = still ? -1 : Math.round(-7 + 6 * back(phase(age, .15 + i * .03, .3), 1.8)) })
    this.bossName.tint = hp < .3 ? mixColor(16729654, 0xffffff, sine(this.uiTime % 1.2 / .6)) : 0xffffff
    if (this.bossDeadAt >= 0) {
      this.bossDeadAt += dt; const t = this.bossDeadAt
      this.bossBox.visible = t < .1; this.bossFlash.alpha = 1; this.bossName.alpha = 1 - phase(t, .1, .3) ** 3; this.bossName.y = this.bossNameY - 4 * u * phase(t, .1, .3) ** 3
      this.bossHalves.forEach((half, i) => { const k = phase(t, .1, .5), side = i ? 1 : -1, base = this.bossHalfBase[i]!; half.visible = t >= .1 && t < .6; half.alpha = 1 - k ** 3; half.rotation = side * .15 * k ** 3; half.position.set(base.x + side * 6 * u * out(k), base.y + 8 * u * k ** 3); (half.children[1] as Sprite).alpha = 1 - phase(t, .1, .25) })
      if (t >= .6) this.boss.visible = false
    }
    this.bossArrow.visible = this.arrowGlow.visible = false
    if (!enemy || enemy.dead) return
    const point = view.view.worldToScreen({ x: enemy.x, y: Math.max(0, enemy.data.hover) + 1.6, z: enemy.z })
    if (!point || point.x >= 0 && point.x <= l.width && point.y >= 0 && point.y <= l.height) return
    const margin = l.margin + 14 * u, cx = l.width / 2, cy = l.height / 2, dx = point.x - cx, dy = point.y - cy, top = Math.max(this.bandBottom + 6 * u, margin) - cy
    let k = Infinity
    if (dx) k = Math.min(k, (cx - margin) / Math.abs(dx))
    if (dy < 0) k = Math.min(k, top / dy)
    else if (dy > 0) k = Math.min(k, (l.height - margin - cy) / dy)
    this.bossArrow.visible = this.arrowGlow.visible = true; this.bossArrow.position.set(Math.round(cx + dx * k), Math.round(cy + dy * k)); this.arrowGlow.position.copyFrom(this.bossArrow.position); this.bossArrow.rotation = Math.atan2(dy, dx); this.bossArrow.alpha = .75 + .25 * sine(this.uiTime % .6 / .3); this.arrowGlow.alpha = .35 + .35 * sine(this.uiTime % .6 / .3)
  }
  private updateNumbers(view: GraveyardView, dt: number): void {
    const run = this.run, u = uiLayout().unit, foot = view.view.worldToScreen({ x: run.hero.x, y: 0, z: run.hero.z }), edge = view.view.worldToScreen({ x: run.hero.x + 1, y: 0, z: run.hero.z }), worldUnit = foot && edge ? Math.abs(foot.x - edge.x) : 0, left = foot ? foot.x - .42 * worldUnit - 2 * u : 0, right = foot ? foot.x + .42 * worldUnit + 2 * u : -1, top = foot ? foot.y - 1.5 * worldUnit - 2 * u : 0, bottom = foot ? foot.y + 2 * u : 0
    this.numbers = this.numbers.filter(item => {
      item.age += dt; const age = item.age, node = item.text
      if (age > .75) { node.destroy({ children: true }); return false }
      const point = view.view.worldToScreen({ x: item.x, y: item.height, z: item.z })
      node.visible = !!point && settings.damageNumbers
      if (!point) return true
      const density = uiLayout().resolution, p = age / .75, scale = Math.max(1 / density, Math.round(u * density * (1.9 - .9 * back(phase(age, 0, .16), 1.70158)) * 2) / 2 / density), half = node.textWidth * scale / 2, height = node.capHeight * scale, baseY = point.y - (node.big ? 10 : 6) * u
      let x = point.x + item.drift * 10 * u * p
      const y = baseY - out(p) * 14 * u
      if (item.push === undefined) { const reach = half + Math.abs(item.drift) * 10 * u, overlaps = right > left && x + reach > left && x - reach < right && baseY + height > top && baseY - 14 * u < bottom; item.push = overlaps ? x >= (left + right) / 2 ? right - x + reach : left - x - reach : 0 }
      x += item.push
      if (right > left && x + half > left && x - half < right && y + height > top && y < bottom) node.visible = false
      node.position.set(snap(x), snap(y)); node.scale.set(scale); node.alpha = 1 - phase(p, .62, .38)
      return true
    })
  }
  private updateToasts(dt: number, active: boolean): void {
    const l = uiLayout(), u = l.unit, still = reducedMotion()
    if (active && this.toasts.length < 2 && this.toastQueue.length) { const next = this.toastQueue.shift()!; this.showToast(next.key, next.rank) }
    this.toasts = this.toasts.filter((toast, i) => {
      toast.age += dt; const age = toast.age
      toast.y = still ? i * 30 * u : approach(toast.y, i * 30 * u, 20, dt)
      toast.node.position.set((l.portrait ? Math.round((l.w - 116) / 2) : 4) * u + (still ? 0 : Math.round(-40 * (1 - back(phase(age, 0, .3))) - 20 * phase(age, 2.5, .2) ** 3) * u), (l.portrait ? this.bandBottom + 6 * u : this.slotBottom + 6 * u) + Math.round(toast.y))
      toast.node.alpha = phase(age, 0, .12) * (1 - phase(age, 2.5, .2) ** 3); toast.image.scale.set(16 / toast.image.texture.frame.width * l.icon / u * (still ? 1 : back(phase(age, .1, .25), 3)))
      toast.sparkles.forEach((node, index) => { const p = phase(age, .2 + index * .08, .5); node.scale.set(still ? 0 : Math.sin(p * Math.PI) * 1.2); node.rotation = p * Math.PI / 4 })
      const sweep = -16 + phase(age, .2, .75) * (toast.title.textWidth + 32)
      toast.glint.glyphs.forEach((glyph, index) => { const distance = Math.abs(toast.title.glyphs[index]!.x + 5 - sweep) / 13; glyph.alpha = !still && age >= .2 && age < .95 ? Math.max(0, 1 - distance * distance) * .6 : 0 })
      if (age < 2.7) return true
      toast.node.destroy({ children: true }); return false
    })
  }
  override destroy(): void { Graphics.app.canvas.removeEventListener('pointerdown', this.pointerSource); this.flights.destroy({ children: true }); super.destroy({ children: true }) }
}
