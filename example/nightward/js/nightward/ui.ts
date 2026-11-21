import { Container, NineSliceSprite, Rectangle, Sprite } from 'pixi.js'
import type { Texture } from 'pixi.js'
import { Graphics, Input, TouchInput } from 'rmmz-next'
import { getAssets } from './assets'
import { settings, sound, toggleMute } from './audio'
import { NightwardSelectable, NightwardWindow } from './window-ui'
import type { WindowChoice } from './window-ui'

export const colors = { lantern: 16761944, lanternDeep: 16754744, text: 16773330, blue: 11845602, label: 12897258, edge: 6054008, dim: 9081784, rule: 14858336, gold: 16177288, night: 132108, death: 918023, dawn: 658456, page: 329231 }
export const clamp = (n: number): number => Math.max(0, Math.min(1, n))
export const phase = (time: number, at: number, seconds: number): number => clamp((time - at) / seconds)
export const out = (n: number, power = 3): number => 1 - (1 - n) ** power
export const back = (n: number, strength = 1.5): number => 1 + (strength + 1) * (n - 1) ** 3 + strength * (n - 1) ** 2
export const sine = (n: number): number => .5 - .5 * Math.cos(Math.PI * n)
export const approach = (a: number, b: number, speed: number, dt: number): number => a + (b - a) * (1 - Math.exp(-speed * dt))
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)')
const coarsePointer = matchMedia('(pointer: coarse)')
export const reducedMotion = (): boolean => motionPreference.matches
export const clock = (seconds: number): string => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
export function consumeInput(): void {
  // Keep held movement keys while consuming the menu's activation edge.
  Input._previousState = { ...Input._currentState }; Input._latestButton = null; Input._pressedTime = 0; Input._virtualButton = null
  TouchInput._currentState = TouchInput._createNewState(); TouchInput._newState = TouchInput._createNewState(); TouchInput._clicked = false
}
export function mixColor(a: number, b: number, k: number): number {
  return Math.round((a >> 16) + ((b >> 16) - (a >> 16)) * k) << 16 | Math.round((a >> 8 & 255) + ((b >> 8 & 255) - (a >> 8 & 255)) * k) << 8 | Math.round((a & 255) + ((b & 255) - (a & 255)) * k)
}
const uiDensity = (): number => Math.min(devicePixelRatio, 1.5)
export const snap = (value: number): number => Math.round(value * uiDensity()) / uiDensity()
export const largeScale = (unit: number): number => Math.max(2, Math.round(unit * uiDensity() * 1.5)) / uiDensity()
export interface UiLayout { width: number, height: number, unit: number, icon: number, resolution: number, w: number, h: number, margin: number, portrait: boolean, short: boolean, tap: number }
export function uiLayout(): UiLayout {
  const width = Graphics.width, height = Graphics.height, resolution = uiDensity(), pixelsW = Math.round(width * resolution), pixelsH = Math.round(height * resolution), pixelUnit = Math.max(2, Math.round(Math.min(pixelsW, pixelsH) / 290)), unit = pixelUnit / resolution
  return { width, height, unit, icon: Math.max(2, Math.round(pixelUnit * .7)) / resolution, resolution, w: Math.floor(pixelsW / pixelUnit), h: Math.floor(pixelsH / pixelUnit), margin: 4 * unit, portrait: height > width, short: Math.floor(pixelsH / pixelUnit) < 240, tap: coarsePointer.matches ? Math.ceil(44 / unit) : 0 }
}
export const fitScale = (texels: number, width: number, maximum: number): number => Math.max(1 / uiDensity(), Math.min(maximum, Math.floor(width * uiDensity() / Math.max(1, texels)) / uiDensity()))
export function sprite(part: string, x = 0, y = 0): Sprite {
  const node = new Sprite(getAssets().ui[part]!)
  node.position.set(x, y)
  return node
}
export function box(width: number, height: number, color: number, alpha = 1, x = 0, y = 0): Sprite {
  const node = sprite('white', x, y)
  node.width = width; node.height = height; node.tint = color; node.alpha = alpha
  return node
}
export function panel(width: number, height: number, part?: 'panel' | 'panelHot'): NightwardWindow
export function panel(width: number, height: number, part: 'softRect' | 'thinFrame' | 'barFrame' | 'keycap'): NineSliceSprite
export function panel(width: number, height: number, part = 'panel'): NightwardWindow | NineSliceSprite {
  if (part === 'panel' || part === 'panelHot') { const node = new NightwardWindow(width, height); node.highlighted = part === 'panelHot'; return node }
  const border = part === 'softRect' ? 18 : part === 'thinFrame' ? 1 : 3
  return new NineSliceSprite({ texture: getAssets().ui[part]!, leftWidth: border, rightWidth: border, topHeight: border, bottomHeight: part === 'keycap' ? 4 : border, width, height })
}
export function icon(key: string): Sprite { return new Sprite(getAssets().hudIcons[key]!) }

// Original glyph metrics include their shadow and an independent, hand-rasterized 2x set.
export class UiText extends Container {
  readonly glyphs: Sprite[] = []
  textWidth = 0
  readonly capHeight: number
  private value = ''
  private fontStyle: number
  constructor(text = '', style = 0, public align = 0, readonly big = false) {
    super({ eventMode: 'none' })
    this.fontStyle = style; this.capHeight = big ? 14 : 7
    this.text = text
  }
  get text(): string { return this.value }
  set text(value: string) {
    if (value === this.value && this.glyphs.length) return
    this.value = value; this.relayout()
  }
  get font(): number { return this.fontStyle }
  set font(value: number) { if (value !== this.fontStyle) { this.fontStyle = value; this.relayout() } }
  measure(text: string): number {
    const assets = getAssets(), size = this.big ? 2 : 1
    return Math.max(0, [...text].reduce((sum, char) => sum + (assets.glyphs.get(char)?.advance ?? assets.uiData.space) * size, 0) - size)
  }
  relayout(): void {
    const assets = getAssets(), size = this.big ? 2 : 1
    let x = 0
    for (let i = 0; i < this.value.length; i++) {
      let node = this.glyphs[i]
      if (!node) { node = new Sprite(); this.glyphs.push(node); this.addChild(node) }
      const glyph = assets.glyphs.get(this.value[i]!)
      node.visible = !!glyph
      if (glyph) node.texture = (this.big ? glyph.big : glyph.small)[this.fontStyle]!
      node.position.set(x - 1, -1); node.alpha = 1; node.scale.set(1)
      x += (glyph?.advance ?? assets.uiData.space) * size
    }
    for (let i = this.value.length; i < this.glyphs.length; i++) this.glyphs[i]!.visible = false
    this.textWidth = Math.max(0, x - size)
    const offset = Math.round(this.textWidth * this.align)
    for (let i = 0; i < this.value.length; i++) this.glyphs[i]!.x -= offset
  }
}
export function text(value: string, x: number, y: number, style = 0, tint = 0xffffff, align = 0, big = false): UiText {
  const node = new UiText(value, style, align, big)
  node.position.set(x, y); node.tint = tint
  return node
}
export function wrap(value: string, maxWidth: number, balanced = false): string[] {
  const assets = getAssets()
  const measure = (line: string): number => Math.max(0, [...line].reduce((sum, char) => sum + (assets.glyphs.get(char)?.advance ?? assets.uiData.space), 0) - 1)
  const words = value.split(' '), lines: string[] = []
  let line = ''
  for (const word of words) {
    if (line && measure(`${line} ${word}`) > maxWidth) { lines.push(line); line = word }
    else line = line ? `${line} ${word}` : word
  }
  if (line) lines.push(line)
  if (balanced && lines.length === 2) {
    let width = Math.max(...lines.map(measure))
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' '), b = words.slice(i).join(' '), candidate = Math.max(measure(a), measure(b))
      if (candidate <= maxWidth && candidate < width) { lines[0] = a; lines[1] = b; width = candidate }
    }
  }
  return lines
}
export interface HeadingIntro { halo?: number, haloAt?: number, haloSeconds?: number, haloSine?: boolean, breath?: number, drop?: number, lettersAt?: number, letterSeconds?: number, letterFade?: number, strength?: number, stagger?: number, rulesAt?: number, diamondsAt?: number, diamondSeconds?: number, glintAt?: number, center?: boolean, scaleIn?: boolean }
export class Heading extends Container {
  readonly title: UiText
  readonly halo = sprite('glow')
  private glint: UiText
  private rules = [box(1, 1, colors.rule), box(1, 1, colors.rule)]
  private diamonds = [sprite('diamond'), sprite('diamond')]
  private ruleLength = 0
  private options: Required<HeadingIntro> = { halo: .22, haloAt: 0, haloSeconds: .3, haloSine: false, breath: 0, drop: 9, lettersAt: .05, letterSeconds: .32, letterFade: .1, strength: 1.8, stagger: .035, rulesAt: .3, diamondsAt: .4, diamondSeconds: .22, glintAt: .6, center: false, scaleIn: false }
  constructor(value: string, style = 1) {
    super({ eventMode: 'none' })
    this.title = new UiText(value, style, .5, true); this.glint = new UiText(value, 0, .5, true)
    this.glint.tint = 16773312
    this.halo.anchor.set(.5); this.halo.tint = colors.lanternDeep
    this.addChild(this.halo, ...this.rules, ...this.diamonds, this.title, this.glint)
    this.diamonds.forEach(node => node.anchor.set(.5))
  }
  configure(options: HeadingIntro): void { Object.assign(this.options, options) }
  layout(scale: number, unit: number, halfWidth: number, maxRule = 44, minRule = 24, halo = 60): number {
    const ratio = scale / unit, height = Math.ceil(14 * ratio), half = Math.ceil(this.title.textWidth * ratio / 2), available = halfWidth - half - 13
    this.title.scale.set(ratio); this.glint.scale.set(ratio)
    this.ruleLength = Math.min(maxRule, available) >= minRule ? Math.min(maxRule, available) : 0
    this.rules.forEach((node, i) => { node.anchor.set(i ? 0 : 1, 0); node.position.set((i ? 1 : -1) * (half + 6), Math.round(height / 2)); node.visible = this.ruleLength > 0 })
    this.diamonds.forEach((node, i) => { node.position.set((i ? 1 : -1) * (half + 9 + this.ruleLength), Math.round(height / 2)); node.visible = this.ruleLength > 0 })
    this.halo.position.set(0, Math.round(height / 2)); this.halo.width = half * 2 + halo; this.halo.height = height + halo * .66
    return height
  }
  animate(age: number): void {
    const o = this.options, still = reducedMotion(), time = still ? Infinity : age
    const haloP = phase(time, o.haloAt, o.haloSeconds)
    this.halo.alpha = o.halo * (o.haloSine ? Math.sin(haloP * Math.PI / 2) : out(haloP, 4))
    if (!still && time > o.glintAt) this.halo.alpha += o.breath * (1 - Math.cos((time - o.glintAt) * Math.PI / 1.6))
    const chars = this.title.text.length, half = (chars - 1) / 2
    const glintTime = (time - o.glintAt) % 2.6
    const sweep = -16 + glintTime / .75 * (this.title.textWidth + 32)
    for (let i = 0; i < chars; i++) {
      const order = o.center ? Math.abs(i - half) - (chars % 2 ? 0 : .5) : i, at = o.lettersAt + order * o.stagger
      const glyph = this.title.glyphs[i]!, overlay = this.glint.glyphs[i]!, p = phase(time, at, o.letterSeconds)
      glyph.y = Math.round(-1 - o.drop * (1 - back(p, o.strength))); glyph.alpha = out(phase(time, at, o.letterFade), 2)
      glyph.scale.set(o.scaleIn ? .6 + .4 * back(p, o.strength) : 1)
      overlay.y = glyph.y; overlay.scale.copyFrom(glyph.scale)
      const distance = Math.abs(glyph.x + Math.round(this.title.textWidth / 2) + 5 - sweep) / 13
      overlay.alpha = !still && time >= o.glintAt && glintTime < .75 ? glyph.alpha * Math.max(0, 1 - distance * distance) * .6 : 0
    }
    for (const node of this.rules) node.width = this.ruleLength * out(phase(time, o.rulesAt, .35), 4)
    for (const node of this.diamonds) node.scale.set(back(phase(time, o.diamondsAt, o.diamondSeconds), 3))
  }
}
export class UiButton extends Container implements WindowChoice {
  readonly motion = new Container()
  readonly body = new Container()
  readonly caption?: UiText
  readonly glyph?: Sprite
  private frame = panel(1, 1)
  private glow = panel(1, 1, 'softRect')
  private cursorSprite = sprite('cursor')
  enabled = true
  focused = false
  selected = false
  keyed = true
  showCursor = true
  row = 0
  col = 0
  onActivate?: () => void
  onFocus?: () => void
  step?: (direction: number) => void
  private pressed = false
  private pressScale = 1
  private pressFrom = 1
  private pressTarget = 1
  private pressAge = 1
  private punchAge = 10
  private time = 0
  private buttonWidth = 0
  private buttonHeight = 0
  constructor(caption: string | Texture, width: number, height = 22, readonly cue: string | null = 'Confirm') {
    super({ eventMode: 'static', cursor: 'pointer' })
    this.glow.tint = colors.lantern; this.cursorSprite.anchor.set(1, .5)
    if (typeof caption === 'string') this.caption = new UiText(caption, 0, .5)
    else { this.glyph = new Sprite(caption); this.glyph.anchor.set(.5); this.showCursor = false }
    this.body.addChild(this.glow, this.frame)
    if (this.caption) this.body.addChild(this.caption)
    if (this.glyph) this.body.addChild(this.glyph)
    this.motion.addChild(this.cursorSprite, this.body); this.addChild(this.motion)
    this.setSize(width, height)

  }
  setSize(width: number, height: number, tap = 0): void {
    this.buttonWidth = width; this.buttonHeight = height
    this.frame.width = width; this.frame.height = height
    this.glow.position.set(-12, -12); this.glow.width = width + 24; this.glow.height = height + 24
    this.body.pivot.set(width / 2, height / 2); this.body.position.copyFrom(this.body.pivot)
    this.caption?.position.set(Math.round(width / 2), Math.round((height - 7) / 2))
    this.glyph?.position.set(Math.round(width / 2), Math.round(height / 2))
    this.cursorSprite.y = Math.round(height / 2)
    this.hitArea = new Rectangle((width - Math.max(width, tap)) / 2, (height - Math.max(height, tap)) / 2, Math.max(width, tap), Math.max(height, tap))
  }
  get node(): Container { return this }
  get rect(): Rectangle { return this.hitArea as Rectangle }
  setPressed(pressed: boolean): void { this.pressed = pressed }
  activate(): void { if (this.enabled) { if (this.cue) sound(this.cue); this.onActivate?.() } }
  focus(focused: boolean, keyed = true): void {
    if (focused && !this.focused) { this.time = 0; this.onFocus?.() }
    this.focused = focused; this.keyed = keyed
  }
  punch(): void { this.punchAge = 0 }
  tick(dt: number, live = true): void {
    this.time += dt; this.punchAge += dt
    this.eventMode = live && this.enabled ? 'static' : 'none'
    const focused = this.focused && this.enabled, still = reducedMotion()
    this.frame.highlighted = focused || this.pressed || this.selected
    this.glow.visible = focused; this.glow.alpha = still ? .5 : .475 - .125 * Math.cos(this.time * Math.PI / 1.3)
    this.cursorSprite.visible = focused && this.keyed && this.showCursor
    this.cursorSprite.x = still ? -5 : Math.round(-6 + Math.cos(this.time * Math.PI / .45))
    const target = this.pressed ? .94 : 1
    if (target !== this.pressTarget) { this.pressFrom = this.pressScale; this.pressTarget = target; this.pressAge = 0 }
    this.pressAge += dt
    const pressP = phase(this.pressAge, 0, this.pressed ? .06 : .22)
    this.pressScale = this.pressFrom + (target - this.pressFrom) * (this.pressed ? out(pressP) : back(pressP, 3))
    let punch = 0
    if (this.punchAge < .08) punch = .08 * out(this.punchAge / .08)
    else if (this.punchAge < .26) punch = .08 * (1 - back((this.punchAge - .08) / .18, 3))
    this.body.scale.set(still ? 1 : this.pressScale + punch); this.body.alpha = this.enabled ? 1 : .45
    if (this.caption) { this.caption.font = this.selected ? 1 : 0; this.caption.tint = this.enabled ? focused || this.selected ? 0xffffff : colors.label : colors.edge }
  }
  get size(): { width: number, height: number } { return { width: this.buttonWidth, height: this.buttonHeight } }
}
export abstract class UiScreen extends Container {
  // Scene start can render before the first tick applies animation states.
  readonly content = new Container({ alpha: 0 })
  readonly buttons: UiButton[] = []
  readonly nativeWindow: NightwardSelectable
  age = 0
  live = true
  inputBlocked = false
  focused?: UiButton
  onBack?: () => void
  protected layout = uiLayout()
  protected closing = -1
  private closeDuration = .2
  private closeDone?: () => void
  private dim = 1
  dimmed = false
  constructor() {
    super({ eventMode: 'passive' })
    this.nativeWindow = new NightwardSelectable(this.layout.w, this.layout.h)
    this.nativeWindow.choices = this.buttons
    this.nativeWindow.onSelection = choice => { this.focused = choice as UiButton | undefined }
    this.nativeWindow._clientArea!.addChild(this.content)
    this.addChild(this.nativeWindow); this.scale.set(this.layout.unit)
  }
  protected addButton(button: UiButton, row = this.buttons.length, col = 0, parent = this.content): UiButton {
    button.row = row; button.col = col; parent.addChild(button); this.buttons.push(button)
    return button
  }
  focus(button: UiButton, audible = false, keyed = true): void {
    const index = this.buttons.indexOf(button)
    if (audible && this.nativeWindow.index() !== index) this.nativeWindow.playCursorSound()
    this.nativeWindow.focusChoice(index, keyed)
  }
  protected handle(): void {
    if (Input.isTriggered('pause') && this.onBack) { this.nativeWindow.processCancel(); return }
    this.nativeWindow.update()
  }
  tick(dt: number): void {
    this.age += dt
    this.dim = approach(this.dim, this.dimmed ? 0 : 1, 20, dt)
    this.content.alpha = this.dim
    if (this.closing >= 0) {
      this.closing += dt
      const p = phase(this.closing, 0, reducedMotion() ? .15 : this.closeDuration)
      this.content.alpha *= 1 - p ** 3; this.content.y = reducedMotion() ? 0 : Math.round(p ** 3 * 8)
      if (p === 1) { const done = this.closeDone; this.closeDone = undefined; done?.(); return }
    }
    this.animate(dt)
    if (this.destroyed) return
    const live = this.live && !this.inputBlocked && !this.dimmed && this.closing < 0 && this.accepting
    for (const button of this.buttons) button.tick(dt, live)
    this.nativeWindow.onCancel = this.onBack
    this.nativeWindow.setLive(live)
    if (live) this.handle()
  }
  get accepting(): boolean { return this.age >= .15 }
  close(done: () => void, seconds = .2): void { this.live = false; this.closing = 0; this.closeDuration = seconds; this.closeDone = done }
  protected abstract animate(dt: number): void
}
export function fullscreen(): void {
  if (document.fullscreenElement) void document.exitFullscreen()
  else if (document.fullscreenEnabled) void document.documentElement.requestFullscreen()
}
export class SystemButtons extends Container {
  readonly buttons: UiButton[]
  private nativeWindow: NightwardSelectable
  constructor() {
    super()
    const mute = new UiButton(getAssets().ui.speakerOn!, 15, 15, null)
    mute.onActivate = toggleMute
    this.buttons = [mute]
    if (document.fullscreenEnabled) { const full = new UiButton(getAssets().ui.fullscreenEnter!, 15, 15, 'Cursor'); full.onActivate = fullscreen; this.buttons.push(full) }
    this.nativeWindow = new NightwardSelectable(34, 15); this.nativeWindow.pointerOnly = true; this.nativeWindow.choices = this.buttons
    this.nativeWindow._clientArea!.addChild(...this.buttons); this.addChild(this.nativeWindow)
  }
  layout(tap: number): number {
    this.buttons.forEach((button, i) => { button.x = i * Math.max(19, tap); button.setSize(15, 15, tap) })
    const width = 15 + (this.buttons.length - 1) * Math.max(19, tap)
    this.nativeWindow.move(0, 0, width, 15); return width
  }
  tick(dt: number, live: boolean, age = Infinity): void {
    this.buttons[0]!.glyph!.texture = getAssets().ui[settings.muted ? 'speakerOff' : 'speakerOn']!
    if (this.buttons[1]) this.buttons[1].glyph!.texture = getAssets().ui[document.fullscreenElement ? 'fullscreenExit' : 'fullscreenEnter']!
    this.nativeWindow.setLive(live && age >= 0); this.nativeWindow.update()
    this.buttons.forEach((button, i) => { button.tick(dt, live && age >= 0); button.motion.pivot.set(7.5); button.motion.position.set(7.5); button.motion.alpha = phase(age, i * .06, .3); button.motion.scale.set(reducedMotion() ? 1 : .6 + .4 * back(phase(age, i * .06, .3), 3)) })
  }
}
export class PixelWipe extends Container {
  private draw = new Container()
  private cells: Sprite[] = []
  private time = 0
  private covering = false
  private duration = .4
  private done?: () => void
  private running = false
  constructor() { super({ eventMode: 'none' }); this.addChild(this.draw); this.visible = false }
  get busy(): boolean { return this.running }
  play(covering: boolean, seconds: number, done?: () => void): void { this.covering = covering; this.time = 0; this.duration = reducedMotion() ? .2 : seconds; this.done = done; this.running = true; this.visible = true }
  tick(dt: number): void {
    if (!this.running) return
    this.time += dt
    const layout = uiLayout(), cell = layout.unit * 8, columns = Math.ceil(layout.width / cell), rows = Math.ceil(layout.height / cell), p = sine(clamp(this.time / this.duration))
    if (reducedMotion()) {
      let node = this.cells[0]
      if (!node) { node = box(1, 1, colors.page); this.cells.push(node); this.draw.addChild(node) }
      this.cells.forEach((cell, i) => { cell.visible = i === 0 })
      node.position.set(0, 0); node.width = layout.width; node.height = layout.height; node.tint = colors.page; node.alpha = this.covering ? p : 1 - p
    }
    else {
      const count = columns * rows
      for (let i = 0; i < count; i++) {
        let node = this.cells[i]
        if (!node) { node = box(1, 1, colors.page); this.cells.push(node); this.draw.addChild(node) }
        const x = i % columns, y = Math.floor(i / columns), k = clamp((p - (x + y) / Math.max(1, columns + rows - 2) * .6) / .4), size = Math.round((this.covering ? k : 1 - k) * cell * layout.resolution / 2) * 2 / layout.resolution
        node.visible = size > 0; node.alpha = 1; node.tint = size >= cell ? colors.page : colors.gold
        node.position.set(x * cell + (cell - size) / 2, y * cell + (cell - size) / 2); node.width = size; node.height = size
      }
      for (let i = count; i < this.cells.length; i++) this.cells[i]!.visible = false
    }
    if (this.time >= this.duration) { this.running = false; this.visible = this.covering; const done = this.done; this.done = undefined; done?.() }
  }
}
