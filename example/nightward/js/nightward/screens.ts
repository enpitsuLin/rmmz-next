import { Container, Sprite } from 'pixi.js'
import { ConfigManager, Input, TouchInput } from 'rmmz-next'
import { getAssets } from './assets'
import { settings, sound } from './audio'
import { BuildSlots } from './build-ui'
import type { RunSession } from './session'
import { records } from './records'
import type { Records, RunResult } from './records'
import type { Content, WeaponKey } from './content'
import { back, box, clock, colors, consumeInput, fitScale, fullscreen, Heading, icon, largeScale, out, panel, phase, reducedMotion, sprite, SystemButtons, text, UiButton, UiScreen, UiText, wrap } from './ui'

export const bestLine = (): string => `Best ${clock(records.bestTime)} · Lv ${records.bestLevel} · ${records.bestKills} kills`
const introAlpha = (age: number, at = 0): number => reducedMotion() ? phase(age, 0, .15) : phase(age, at, .3)

export class TitleScreen extends UiScreen {
  private logo = new Heading('NIGHTWARD')
  private tagline = [text('', 0, 0, 0, colors.blue, .5), text('', 0, 0, 0, colors.blue, .5)]
  private footer = new Container({ eventMode: 'none' })
  private best = text('', 0, 0, 0, colors.dim, .5)
  private wins = text('', 0, 0, 1, 0xffffff, .5)
  private credit = text('Made with PixiJS and PixiJS 3D', 0, 0, 0, colors.dim, 1)
  private corner = new SystemButtons()
  private sparkles = [sprite('sparkle'), sprite('sparkle'), sprite('sparkle')]
  private menu: UiButton[]
  private flash = box(1, 1, 0xffffff, 0)
  private logoY = 0
  private taglineY: number[] = []
  private playAge = -1
  private playDone?: () => void
  constructor(onPlay: () => void, onOpen: (kind: 'options' | 'howto') => void) {
    super()
    this.logo.configure({ halo: .26, haloSeconds: .8, haloSine: true, breath: .03, drop: 10, lettersAt: .1, letterSeconds: .45, strength: 1.6, stagger: .05, rulesAt: .55, diamondsAt: .7, diamondSeconds: .25, glintAt: 2 })
    this.menu = ['PLAY', 'HOW TO PLAY', 'OPTIONS'].map((name, i) => this.addButton(new UiButton(name, 120, 22, i ? 'Confirm' : null), i))
    this.menu[0]!.onActivate = () => { this.live = false; this.playAge = 0; this.playDone = onPlay; this.menu[0]!.punch(); sound('Confirm') }
    this.menu[1]!.onActivate = () => onOpen('howto'); this.menu[2]!.onActivate = () => onOpen('options')
    this.sparkles.forEach(node => node.anchor.set(.5))
    this.footer.addChild(this.best, this.wins, this.credit)
    this.content.addChild(this.logo, ...this.sparkles, ...this.tagline, this.footer, this.flash, this.corner)
    this.place(); sound('Title', 45)
  }
  protected place(): void {
    const l = this.layout, { w, h, unit: u, portrait } = l, center = Math.round(w / 2), band = Math.round(h * (portrait ? .05 : .06)), buttonH = Math.max(22, l.tap)
    const cornerWidth = this.corner.layout(l.tap)
    this.corner.position.set(w - 4 - cornerWidth, l.short || band < 17 ? 4 : Math.max(0, Math.round((band - 15) / 2)))
    const scale = fitScale(102, (l.short ? .5 : portrait ? .86 : .62) * l.width, 3 * u)
    const compact = portrait || l.short, logoH = this.logo.layout(scale, u, center - 6, compact ? 16 : 44, compact ? 12 : 24, 40)
    this.logoY = Math.max(band + 4, Math.round(h * (compact ? .13 : .15))); this.logo.position.set(center, this.logoY)
    const lines = wrap('Survive the night · slay the Reaper', w - 16)
    this.tagline.forEach((node, i) => { node.visible = !!lines[i]; node.text = lines[i] ?? ''; node.position.set(center, this.logoY + logoH + 8 + i * 10); this.taglineY[i] = node.y })
    this.best.text = bestLine(); this.best.visible = records.runs > 0 && !l.short
    this.wins.text = `Reaper slain · fastest ${clock(records.fastestWin ?? 0)}`; this.wins.visible = this.best.visible && records.wins > 0
    const footerLines = [this.best, this.wins, this.credit].filter(node => node.visible)
    const footerScale = fitScale(Math.max(...footerLines.map(node => node.textWidth)), l.width - l.margin * 2, l.icon) / u
    const recordRows = Number(this.best.visible) + Number(this.wins.visible)
    this.best.position.set(0, 0); this.wins.position.set(0, 12)
    this.credit.position.set(Math.floor((w - 8 - center) / footerScale), recordRows ? (recordRows - 1) * 12 + 17 : 0)
    const footerHeight = Math.ceil((this.credit.y + 9) * footerScale)
    this.footer.scale.set(footerScale); this.footer.position.set(center, h - 8 - footerHeight)
    // Reserve the footer before placing controls so records cannot run into credits.
    const gap = portrait ? 8 : 6, menuHeight = 3 * buttonH + 2 * gap
    const menuY = Math.min(Math.round(h * (portrait ? .64 : .58)), this.footer.y - 12 - menuHeight)
    const short = l.short || !portrait && menuY < this.logoY + logoH + 8 + lines.length * 10 + 14
    this.menu.forEach((button, i) => {
      const width = short ? 104 : portrait ? Math.min(160, w - 40) : 120
      button.setSize(width, buttonH, l.tap); button.showCursor = !short || i === 0
      button.position.set(short ? center - 164 + i * 112 : center - Math.round(width / 2), short ? this.footer.y - 12 - buttonH : menuY + i * (buttonH + gap))
    })
    const play = this.menu[0]!
    this.flash.position.set(play.x + 2, play.y + 2); this.flash.width = play.size.width - 4; this.flash.height = play.size.height - 4
    const positions = [1, 8, 2]
    this.sparkles.forEach((node, i) => {
      const glyph = this.logo.title.glyphs[positions[i]!]!, k = this.logo.title.scale.x, width = glyph.texture.frame.width
      node.position.set(Math.round(center + (glyph.x + (i === 1 ? width - 2 : width / 2)) * k), Math.round(this.logoY + (i === 0 ? -4 : i === 1 ? 1 : logoH + 3))); node.visible = !short || i < 2
    })
  }
  override get accepting(): boolean { return this.age >= .3 && this.playAge < 0 }
  protected override handle(): void {
    if (Input.isTriggered('ok') && this.age < 1.1) { this.age = 1.1; this.focus(this.menu[0]!); return }
    super.handle()
  }
  protected animate(dt: number): void {
    const still = reducedMotion(), age = still ? 10 : this.age
    this.logo.animate(this.age)
    this.logo.y = this.logoY
    this.tagline.forEach((node, i) => { node.y = this.taglineY[i]! + (still ? 0 : Math.round(4 * (1 - out(phase(age, .7, .4))))); node.alpha = out(phase(age, .7, .4)) })
    this.menu.forEach((button, i) => { button.motion.y = still ? 0 : Math.round(10 * (1 - back(phase(age, .85 + i * .07, .3)))); button.motion.alpha = out(phase(age, .85 + i * .07, .3), 2) })
    this.footer.alpha = out(phase(age, 1.1, .5), 2)
    this.corner.tick(dt, this.live && !this.inputBlocked && !this.dimmed && this.playAge < 0, age - 1.2)
    this.sparkles.forEach((node, i) => { const p = (this.age - 2) % (.9 + 2.1 + i * .7) / .9; node.scale.set(!still && this.age >= 2 && p < 1 ? Math.sin(p * Math.PI) : 0); node.rotation = p * Math.PI / 4 })
    if (!this.focused && age >= 1.1) this.focus(this.menu[0]!)
    if (this.playAge >= 0) {
      this.playAge += dt
      const t = this.playAge
      this.flash.alpha = .85 * (1 - out(phase(t, 0, .3)))
      this.menu.slice(1).forEach((button, i) => { const p = phase(t, .05 + i * .04, .22); button.motion.alpha *= 1 - p ** 3; button.motion.x = Math.round(-16 * p ** 3) })
      for (const node of [this.logo, ...this.tagline, this.footer, this.corner]) node.alpha = 1 - phase(t, .1, .35) ** 3
      this.logo.y -= Math.round(16 * phase(t, .1, .35) ** 3); this.menu[0]!.motion.alpha *= 1 - phase(t, .2, .25) ** 3
      if (t >= (still ? .15 : .3)) { const done = this.playDone; this.playDone = undefined; done?.() }
    }
  }
}

abstract class SheetScreen extends UiScreen {
  protected heading: Heading
  protected sheet = new Container()
  protected frame = panel(1, 1)
  protected sheetY = 0
  protected headingY = 0
  constructor(title: string) {
    super(); this.heading = new Heading(title); this.sheet.addChild(this.frame); this.content.addChild(this.heading, this.sheet)
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

class OptionRow extends UiButton {
  readonly control = new Container()
  private title: UiText
  private valueText = text('', 0, 0, 0, 0xffffff, .5)
  private band = box(1, 1, 1517134, .85)
  private pips: Sprite[] = []
  private arrows = [sprite('cursor'), sprite('cursor')]
  private changeAge = 1
  private direction = 1
  private shown = -1
  private dragging = false
  private pointerGesture = false
  private pointerStep = 0
  private pipScale = 1
  constructor(name: string, private read: () => number, private write: (value: number) => void, private values?: string[]) {
    super('', 230, 18, null)
    this.title = text(name, 10, 6, 0, colors.label)
    this.body.visible = false
    this.motion.addChild(this.band, this.title, this.control)
    this.step = direction => this.change(direction)
    if (values) {
      this.arrows[0]!.scale.x = -1; this.arrows[0]!.x = 8
      this.arrows[1]!.x = 52; this.valueText.position.set(30, 2)
      this.control.addChild(...this.arrows, this.valueText)
    }
    else {
      for (let i = 0; i < 10; i++) { const pip = sprite('pipOff'); pip.anchor.set(.5); this.pips.push(pip); this.control.addChild(pip) }
      this.control.addChild(this.valueText); this.valueText.align = 1
    }
    this.on('pointerdown', event => {
      const x = event.getLocalPosition(this.control).x
      this.pointerGesture = true
      if (this.values) { this.pointerStep = x < -6 || x > 66 ? 0 : x < 30 ? -1 : 1; return }
      const width = 40 * this.pipScale + 9
      if (x > width + 4 && x <= width + 21) { this.change(this.read() >= 10 ? -10 : 1); return }
      if (x < -8 || x > width + 4) return
      this.dragging = true; this.fromPointer(x)
    })
    this.on('globalpointermove', event => { if (this.dragging) this.fromPointer(event.getLocalPosition(this.control).x) })
    this.on('pointerup', () => { this.dragging = false }); this.on('pointerupoutside', () => { this.dragging = false; this.pointerGesture = false })
  }
  override activate(): void {
    if (this.pointerGesture) { this.pointerGesture = false; if (this.values && this.pointerStep) this.change(this.pointerStep); return }
    this.change(1)
  }
  private change(direction: number): void {
    const current = this.read(), next = this.values ? (current + direction + this.values.length) % this.values.length : Math.max(0, Math.min(10, current + direction))
    if (next === current) return
    this.direction = direction; this.changeAge = 0; this.write(next); sound('Tick', 35, 100 + 37.5 * next / (this.values ? this.values.length - 1 : 10))
  }
  private fromPointer(x: number): void {
    const next = x < 0 ? 0 : Math.min(10, Math.floor(x / (4 * this.pipScale + 1)) + 1)
    if (next !== this.read()) { this.changeAge = 0; this.write(next); sound('Tick', 25, 100 + 37.5 * next / 10) }
  }
  layoutRow(width: number, iconUnit: number, unit: number, tap: number): void {
    const height = Math.max(18, tap)
    this.setSize(width, height, tap); this.band.width = width - 4; this.band.height = height; this.band.x = 2
    this.title.y = Math.round((height - 7) / 2)
    this.pipScale = 2 * iconUnit / unit
    const pipSize = 4 * this.pipScale, pipWidth = 10 * pipSize + 9, controlWidth = this.values ? 60 : Math.ceil(pipWidth + 15)
    this.control.position.set(width - 10 - controlWidth, Math.round((height - Math.max(7, this.values ? 11 : pipSize)) / 2))
    this.pips.forEach((pip, i) => { pip.scale.set(this.pipScale); pip.position.set(i * (pipSize + 1) + pipSize / 2, Math.max(pipSize, 7) / 2) })
    if (!this.values) this.valueText.position.set(pipWidth + 15, Math.round((Math.max(pipSize, 7) - 7) / 2))
  }
  override tick(dt: number, live = true): void {
    super.tick(dt, live); this.changeAge += dt
    this.band.visible = this.focused; this.title.tint = this.focused ? 0xffffff : colors.label
    const value = this.read()
    if (value !== this.shown) { this.shown = value; this.valueText.text = this.values?.[value] ?? String(value); this.pips.forEach((pip, i) => { pip.texture = getAssets().ui[i < value ? 'pipOn' : 'pipOff']! }) }
    if (this.values) { this.valueText.alpha = phase(this.changeAge, .05, .15); this.valueText.x = 30 + (reducedMotion() ? 0 : Math.round(6 * this.direction * (1 - out(phase(this.changeAge, .05, .15))))) }
    else this.valueText.scale.set(reducedMotion() ? 1 : 1.25 - .25 * back(phase(this.changeAge, 0, .18), 3))
  }
}
export class OptionsScreen extends SheetScreen {
  private rows: OptionRow[]
  constructor(backToMenu: () => void) {
    super('OPTIONS'); this.onBack = backToMenu
    const save = (): void => { ConfigManager.save() }
    this.rows = [
      new OptionRow('Music', () => Math.round(ConfigManager.bgmVolume / 10), value => { ConfigManager.bgmVolume = value * 10; save() }),
      new OptionRow('Sound', () => Math.round(ConfigManager.seVolume / 10), value => { ConfigManager.seVolume = value * 10; ConfigManager.meVolume = value * 10; sound('Pickup', 35); save() }),
      new OptionRow('Screen shake', () => settings.shake === .5 ? 1 : settings.shake ? 0 : 2, value => { settings.shake = [1, .5, 0][value]!; save() }, ['FULL', 'LOW', 'OFF']),
      new OptionRow('Damage numbers', () => settings.damageNumbers ? 0 : 1, value => { settings.damageNumbers = value === 0; save() }, ['ON', 'OFF']),
    ]
    if (document.fullscreenEnabled) this.rows.push(new OptionRow('Fullscreen', () => document.fullscreenElement ? 0 : 1, () => fullscreen(), ['ON', 'OFF']))
    this.rows.forEach((row, i) => this.addButton(row, i, 0, this.sheet))
    const button = this.addButton(new UiButton('BACK', 64, 22, null), this.rows.length, 0, this.sheet); button.onActivate = backToMenu
    this.place(); this.focus(this.rows[0]!); sound('Swoosh', 40)
  }
  protected place(): void {
    const l = this.layout, width = Math.min(260, l.w - 16), rowH = Math.max(18, l.tap), buttonH = Math.max(22, l.tap)
    this.rows.forEach((row, i) => { row.layoutRow(width - 24, l.icon, l.unit, l.tap); row.position.set(12, 10 + i * (rowH + 4)) })
    const bottom = 10 + this.rows.length * (rowH + 4) - 4 + 10, button = this.buttons[this.buttons.length - 1]!
    button.setSize(64, buttonH, l.tap); button.position.set(Math.round((width - 64) / 2), bottom)
    this.placeSheet(width, bottom + buttonH + 10)
  }
}

export class HowToScreen extends SheetScreen {
  private tabs: UiButton[]
  private chips: UiButton[]
  private page = new Container()
  private pageIndex = 0
  private scheme = 0
  private changed = 0
  private pageItems: Container[] = []
  private retiring?: Container
  private retiringItems: Container[] = []
  private direction = 1
  private touchKnob?: Sprite
  private dots = [sprite('diamond'), sprite('diamond'), sprite('diamond')]
  constructor(backToMenu: () => void) {
    super('HOW TO PLAY'); this.onBack = backToMenu
    this.tabs = ['GOAL', 'CONTROLS', 'PICKUPS'].map((name, i) => { const button = this.addButton(new UiButton(name, 60, 15, null), 0, i, this.sheet); button.showCursor = false; button.onActivate = button.onFocus = () => this.showPage(i, this.scheme); return button })
    this.chips = ['KEYS', 'PAD', 'TOUCH'].map((name, i) => { const button = this.addButton(new UiButton(name, 44, 15, null), 1, i, this.sheet); button.showCursor = false; button.onActivate = button.onFocus = () => this.showPage(1, i); return button })
    const backButton = this.addButton(new UiButton('BACK', 64, 22, null), 2, 0, this.sheet); backButton.onActivate = backToMenu
    this.sheet.addChild(this.page, ...this.dots); this.place(); this.focus(this.tabs[0]!); sound('Swoosh', 40)
  }
  private showPage(page: number, scheme: number): void {
    if (page === this.pageIndex && scheme === this.scheme && this.pageItems.length) return
    this.retiring?.destroy({ children: true })
    this.direction = page === this.pageIndex ? Math.sign(scheme - this.scheme) || 1 : Math.sign(page - this.pageIndex) || 1
    this.retiring = new Container(); this.retiring.position.copyFrom(this.page.position); this.retiringItems = this.page.removeChildren() as Container[]
    this.retiring.addChild(...this.retiringItems); this.sheet.addChild(this.retiring)
    this.pageIndex = page; this.scheme = scheme; this.changed = this.age
    this.place()
  }
  protected place(): void {
    const l = this.layout, width = Math.min(300, l.w - 16), inner = width - 20, tabH = Math.max(15, Math.min(l.tap, 22)), tabW = Math.floor((width - 28) / 3)
    this.tabs.forEach((button, i) => { button.setSize(tabW, tabH, l.tap); button.position.set(10 + i * (tabW + 4), 10); button.selected = i === this.pageIndex })
    this.chips.forEach((button, i) => { button.setSize(44, tabH, l.tap); button.position.set(10 + i * 48, 18 + tabH); button.visible = button.enabled = this.pageIndex === 1; button.selected = i === this.scheme })
    for (const node of this.page.removeChildren()) node.destroy({ children: true })
    this.pageItems = []
    this.touchKnob = undefined
    this.page.position.set(10, 18 + tabH + (this.pageIndex === 1 ? tabH + 8 : 0))
    const ratio = l.icon / l.unit, iconSize = Math.ceil(16 * ratio)
    let y = 0
    if (this.pageIndex === 1) {
      type Part = { node: Container, width: number, height: number, cap?: boolean }
      const cap = (value: string): Part => { const node = new Container(), line = text(value, 3, 2), width = line.textWidth + 6; node.addChild(panel(width, 11, 'keycap'), line); return { node, width, height: 11, cap: true } }
      const word = (value: string, tint = 0xffffff): Part => { const node = text(value, 0, 2, 0, tint); return { node, width: node.textWidth + 1, height: 11 } }
      const or = (): Part => word('or', colors.dim)
      const badge = (part: string): Part => { const node = new Container(), frame = panel(13, 13), image = sprite(part); frame.y = -1; image.anchor.set(.5); image.position.set(6.5, 5.5); image.scale.set(image.texture.frame.width > 9 ? .8 : 1); node.addChild(frame, image); return { node, width: 13, height: 11 } }
      const touchArt = new Container(), ring = sprite('ring'), knob = sprite('knob')
      ring.anchor.set(.5); knob.anchor.set(.5); ring.scale.set(.5); knob.scale.set(.5); ring.position.set(12, 12); knob.position.set(18, 12); touchArt.addChild(ring, knob)
      const rows: [string, Part[]][] = this.scheme === 0 ? [
        ['Move', [cap('W'), cap('A'), cap('S'), cap('D'), or(), word('arrows')]], ['Pick', [cap('1'), cap('2'), cap('3'), or(), word('arrows and'), cap('Enter')]], ['Pause', [cap('Esc'), or(), cap('P')]], ['Mute', [cap('M')]],
      ] : this.scheme === 1 ? [['Move', [cap('L STICK'), or(), cap('D-PAD')]], ['Pick', [cap('D-PAD'), word('and'), cap('A')]], ['Pause', [cap('START')]], ['Back', [cap('B')]]] : [['Move', [{ node: touchArt, width: 26, height: 24 }, word('Drag anywhere')]], ['Pick', [word('Tap a card')]], ['Pause', [badge('pauseBars'), word('Top of the screen')]], ['Mute', [badge('speakerOn'), word('Title and pause menu')]]]
      if (this.scheme === 0 && document.fullscreenEnabled) rows.push(['Fullscreen', [cap('F')]])
      if (this.scheme === 2) this.touchKnob = knob
      for (const [name, parts] of rows) {
        const row = new Container(), rowLabel = text(name, 0, 0, 0, colors.label); row.y = y; row.addChild(rowLabel)
        const rowHeight = Math.max(15, ...parts.map(part => part.height + 4))
        rowLabel.y = Math.round((rowHeight - 4 - 7) / 2)
        let x = 64, line = 0
        parts.forEach((part, i) => { if (x > 64 && x + part.width > inner) { x = 64; line++ }; part.node.position.set(x, line * rowHeight + Math.round((rowHeight - 4 - part.height) / 2)); x += part.width + (part.cap && !parts[i + 1]?.cap ? 5 : 3); row.addChild(part.node) })
        this.page.addChild(row); this.pageItems.push(row); y += (line + 1) * rowHeight + 2
      }
      y -= 2
    }
    else {
      const rows = this.pageIndex === 0 ? [['clock', 'Survive the night. The horde grows every minute.'], ['lash', 'You only move. Your weapons fire on their own.'], ['gem', 'Gems fill your XP bar. Each level, pick one of three upgrades.'], ['kills', 'At 3:00 the Grave Reaper rises. Slay him to win.']] : [['gem', 'XP gems fill your bar. Bigger gems give more.'], ['coin', 'Gold adds to your score.'], ['chicken', 'Roast chicken heals 30 HP.'], ['vacuum', 'The vacuum pulls in every gem.'], ['relic', 'The relic destroys every foe on screen.']]
      if (this.pageIndex === 2) { const note = text('Break braziers to find them.', 0, y, 0, colors.dim); this.page.addChild(note); this.pageItems.push(note); y += 14 }
      for (const [key, value] of rows) {
        const row = new Container(), image = icon(key!), lines = wrap(value!, inner - iconSize - 6)
        row.y = y; image.scale.set(ratio); row.addChild(image)
        lines.forEach((line, i) => row.addChild(text(line, iconSize + 6, i * 10 + Math.max(0, Math.round((iconSize - 7) / 2) - (lines.length > 1 ? 4 : 0)))))
        this.page.addChild(row); this.pageItems.push(row); y += Math.max(iconSize, lines.length * 10 - 3) + 8
      }
      y -= 8
    }
    const itemPageHeight = (values: string[], note = false): number => (note ? 14 : 0) + values.reduce((height, value) => height + Math.max(iconSize, wrap(value, inner - iconSize - 6).length * 10 - 3) + 8, 0) - 8
    const goalH = itemPageHeight(['Survive the night. The horde grows every minute.', 'You only move. Your weapons fire on their own.', 'Gems fill your XP bar. Each level, pick one of three upgrades.', 'At 3:00 the Grave Reaper rises. Slay him to win.']), pickupH = itemPageHeight(['XP gems fill your bar. Bigger gems give more.', 'Gold adds to your score.', 'Roast chicken heals 30 HP.', 'The vacuum pulls in every gem.', 'The relic destroys every foe on screen.'], true)
    const contentH = Math.max(goalH, pickupH, (document.fullscreenEnabled ? 83 : 79) + tabH + 8, y + (this.pageIndex === 1 ? tabH + 8 : 0))
    const bottom = 18 + tabH + contentH + 10, button = this.buttons[this.buttons.length - 1]!, buttonH = Math.max(22, l.tap)
    button.setSize(64, buttonH, l.tap); button.position.set(width - 74, bottom)
    this.dots.forEach((node, i) => { node.anchor.set(.5); node.position.set(14 + i * 11, bottom + Math.round(buttonH / 2)); node.tint = i === this.pageIndex ? 0xffffff : colors.edge })
    this.placeSheet(width, bottom + buttonH + 10)
  }
  protected override animate(dt: number): void {
    super.animate(dt)
    const age = this.age - this.changed
    this.pageItems.forEach((node, i) => { node.alpha = introAlpha(age, .12 + i * .04); node.x = reducedMotion() ? 0 : Math.round(12 * this.direction * (1 - out(phase(age, .12 + i * .04, .22)))) })
    if (this.retiring) { this.retiringItems.forEach(node => { node.alpha = 1 - phase(age, 0, .15) ** 3; node.x = reducedMotion() ? 0 : Math.round(-12 * this.direction * phase(age, 0, .15) ** 3) }); if (age >= .15) { this.retiring.destroy({ children: true }); this.retiring = undefined; this.retiringItems = [] } }
    if (this.touchKnob && !reducedMotion()) this.touchKnob.position.set(Math.round(12 + 6 * Math.cos(this.age * Math.PI * 2 / 1.6)), Math.round(12 + 6 * Math.sin(this.age * Math.PI * 2 / 1.6)))
  }
}

export type PauseAction = 'resume' | 'options' | 'howto' | 'restart' | 'title'
export class PauseScreen extends UiScreen {
  private shade = box(1, 1, colors.night)
  private heading = new Heading('PAUSED')
  private menu = new Container()
  private menuFrame = panel(1, 1)
  private runPanel = new Container()
  private runFrame = panel(1, 1)
  private build = new BuildSlots()
  private buildLabel = text('BUILD', 0, 0, 1)
  private stats: { image: Sprite, value: UiText }[] = []
  private corner = new SystemButtons()
  private hint = text('Esc to resume', 0, 0, 0, colors.dim, 1)
  private ask = new Container()
  private asking?: 'restart' | 'title'
  private askAge = -1
  private returningAge = -1
  private menuButtons: UiButton[] = []
  private yes: UiButton
  private no: UiButton
  private menuY = 0
  private runY = 0
  private headerY = 0
  constructor(run: RunSession, private action: (action: PauseAction) => void) {
    super()
    this.menu.addChild(this.menuFrame); this.runPanel.addChild(this.runFrame)
    const actions: PauseAction[] = ['resume', 'options', 'howto', 'restart', 'title']
    this.menuButtons = ['RESUME', 'OPTIONS', 'HOW TO PLAY', 'RESTART', 'QUIT TO TITLE'].map((name, i) => {
      const button = this.addButton(new UiButton(name, 110, 22, i ? 'Confirm' : null), i, 0, this.menu)
      button.onActivate = () => { const kind = actions[i]!; if (kind === 'restart' || kind === 'title') this.askFor(kind); else action(kind) }
      return button
    })
    this.yes = this.addButton(new UiButton('YES', 44, 22), 6, 0, this.ask); this.no = this.addButton(new UiButton('NO', 44, 22, null), 6, 1, this.ask)
    this.yes.showCursor = this.no.showCursor = false; this.yes.onActivate = () => { if (this.asking) action(this.asking) }; this.no.onActivate = () => this.cancelAsk()
    this.ask.addChild(text('Abandon this run?', 75, 16, 0, 0xffffff, .5), text('Your progress', 75, 32, 0, colors.blue, .5), text('will be lost.', 75, 42, 0, colors.blue, .5))
    this.menu.addChild(this.ask); this.ask.visible = false; this.yes.enabled = this.no.enabled = false
    const values = [clock(run.time), `Lv ${run.actor.level}`, String(run.kills), String(run.party.gold())]
    for (const [i, key] of ['clock', 'gem', 'kills', 'coin'].entries()) {
      const image = icon(key), value = text(values[i]!, 0, 0, i === 3 ? 1 : 0)
      this.runPanel.addChild(image, value); this.stats.push({ image, value })
    }
    this.build.fill(run.build); this.runPanel.addChild(this.buildLabel, this.build)
    this.content.addChild(this.heading, this.menu, this.runPanel, this.corner, this.hint); this.addChildAt(this.shade, 0)
    this.onBack = () => this.asking ? this.cancelAsk() : action('resume')
    this.place(); this.focus(this.menuButtons[0]!); sound('Swoosh', 40)
  }
  private askFor(kind: 'restart' | 'title'): void {
    this.asking = kind; this.ask.visible = true; this.askAge = 0; this.returningAge = -1
    this.menuButtons.forEach(button => { button.enabled = false })
    this.yes.enabled = this.no.enabled = true; this.focus(this.no, false)
  }
  private cancelAsk(): void {
    sound('Cancel'); const previous = this.asking; this.asking = undefined; this.returningAge = 0; this.askAge = -1; this.yes.enabled = this.no.enabled = false
    this.menuButtons.forEach(button => { button.visible = button.enabled = true }); this.focus(this.menuButtons[previous === 'title' ? 4 : 3]!)
  }
  protected place(): void {
    const l = this.layout, center = Math.round(l.w / 2), portrait = l.portrait && !l.short, height = Math.max(22, l.tap), gap = portrait && l.tap > 22 ? 8 : 6, menuW = portrait ? Math.min(200, l.w - 32) : 150, runW = portrait ? Math.min(240, l.w - 16) : l.short ? Math.min(170, Math.floor((l.w - 28) / 2)) : 170
    const headerH = this.heading.layout(l.short ? l.unit : largeScale(l.unit), l.unit, center - 8)
    const iconSize = Math.ceil(16 * l.icon / l.unit), colWidth = Math.floor((runW - 20) / 2), statH = Math.max(iconSize, 11) + 4
    this.stats.forEach(({ image, value }, i) => { const x = 10 + i % 2 * colWidth, y = 10 + Math.floor(i / 2) * statH; image.scale.set(l.icon / l.unit); image.position.set(x, y); value.position.set(x + iconSize + 5, y + Math.round((iconSize - 7) / 2)) })
    const buildY = 10 + statH * 2 + 4
    this.buildLabel.position.set(10, buildY); this.build.layout(l.icon, l.unit, runW - 20); this.build.position.set(10, buildY + 12)
    const runH = buildY + 12 + this.build.measuredHeight + 10, menuH = this.menuButtons.length * height + (this.menuButtons.length - 1) * gap, panelH = portrait ? runH : Math.max(20 + menuH, runH), totalH = headerH + 12 + (portrait ? runH + 10 + menuH + 10 + 15 : panelH + 30)
    this.headerY = l.short ? 4 : Math.max(4, Math.round((l.h - totalH) / 2)); this.heading.position.set(center, this.headerY)
    const left = center - Math.round((menuW + 12 + runW) / 2), panelY = this.headerY + headerH + (l.short ? 6 : 12)
    this.menuY = portrait ? panelY + runH + 10 : panelY; this.runY = panelY
    this.menu.position.set(portrait ? center - Math.round(menuW / 2) : left, this.menuY); this.runPanel.position.set(portrait ? center - Math.round(runW / 2) : left + menuW + 12, this.runY)
    this.menuFrame.visible = !portrait; this.menuFrame.width = menuW; this.menuFrame.height = panelH; this.runFrame.width = runW; this.runFrame.height = panelH
    this.menuButtons.forEach((button, i) => { button.setSize(portrait ? menuW : 110, height, l.tap); button.position.set(portrait ? 0 : 20, (portrait ? 0 : 10) + i * (height + gap)) })
    this.ask.x = Math.round((menuW - 150) / 2)
    this.yes.position.set(27, 64); this.no.position.set(79, 64)
    const cornerW = this.corner.layout(l.tap)
    this.corner.position.set(portrait ? center - Math.round(cornerW / 2) : l.short ? l.w - 4 - cornerW : this.menu.x, portrait ? this.menuY + menuH + 10 : l.short ? 4 : this.menuY + panelH + 6)
    this.hint.position.set(l.w - 4, l.h - 11); this.hint.visible = !l.short
    this.shade.width = l.width / l.unit; this.shade.height = l.height / l.unit
  }
  protected animate(dt: number): void {
    this.heading.animate(this.age * 1.4)
    this.shade.alpha = .62 * out(phase(this.age, 0, reducedMotion() ? .15 : .2), 2)
    if (this.closing >= 0) this.shade.alpha *= 1 - phase(this.closing, 0, .2)
    this.menu.y = this.menuY + (reducedMotion() ? 0 : Math.round(12 * (1 - back(phase(this.age, .08, .3)))))
    this.runPanel.y = this.runY + (reducedMotion() ? 0 : Math.round(12 * (1 - back(phase(this.age, .14, .3)))))
    this.menu.alpha = introAlpha(this.age, .08); this.runPanel.alpha = introAlpha(this.age, .14)
    this.menuButtons.forEach((button, i) => { button.motion.x = reducedMotion() ? 0 : Math.round(10 * (1 - out(phase(this.age, .14 + i * .04, .22)))); button.motion.alpha = introAlpha(this.age, .14 + i * .04) })
    this.hint.alpha = introAlpha(this.age, .3); this.corner.tick(dt, this.live && !this.inputBlocked && !this.dimmed && this.closing < 0, this.age - .3); this.build.tick(dt)
    if (this.askAge >= 0) {
      this.askAge += dt
      this.menuButtons.forEach((button, i) => { button.motion.alpha *= 1 - phase(this.askAge, i * .02, .15) ** 3; button.motion.x -= Math.round(12 * phase(this.askAge, i * .02, .15) ** 3) })
      this.ask.alpha = phase(this.askAge, .15, .2); this.ask.x = Math.round((this.menuFrame.width - 150) / 2) + (reducedMotion() ? 0 : Math.round(12 * (1 - out(phase(this.askAge, .15, .2)))))
    }
    if (this.returningAge >= 0) {
      this.returningAge += dt; this.ask.alpha = 1 - phase(this.returningAge, 0, .12)
      this.menuButtons.forEach((button, i) => { const p = phase(this.returningAge, .08 + i * .02, .2); button.motion.alpha *= p; button.motion.x -= Math.round(12 * (1 - out(p))) })
      if (this.returningAge >= .4) { this.returningAge = -1; this.ask.visible = false }
    }
  }
}

interface StatRow { root: Container, motion: Container, value: UiText, stamp: Container, target: number, best: boolean }
interface DamageRow { root: Container, bar: Container, value: UiText, target: number }
export class ResultsScreen extends UiScreen {
  private shade = box(1, 1, colors.death, 0)
  private heading: Heading
  private subtitle = text('The Grave Reaper is slain', 0, 0, 0, colors.blue, .5)
  private subtitleY = 0
  private runPanel = new Container()
  private damagePanel = new Container()
  private buildPanel = new Container()
  private build = new BuildSlots()
  private best = text('', 0, 0, 0, colors.dim, .5)
  private stats: StatRow[] = []
  private damageRows: DamageRow[] = []
  private runY = 0
  private damageY = 0
  private buildY = 0
  private ready = false
  private sparks: { sprite: Sprite, at: number, x: number, y: number, angle: number, distance: number }[] = []
  private previous = 0
  private tickAt = 0
  private waiting = true
  constructor(private result: RunResult, before: Records, content: Content, retry: () => void, title: () => void) {
    super()
    const won = result.won, l = this.layout, ratio = l.icon / l.unit, portrait = l.portrait && !l.short, width = portrait ? Math.min(240, l.w - 16) : Math.min(180, Math.floor((l.w - 28) / 2)), pad = l.short ? 6 : 10, gap = l.short ? 3 : 5, iconSize = Math.ceil(16 * ratio)
    const damage = Object.entries(result.damage).filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1]) as [WeaponKey, number][], max = damage[0]?.[1] ?? 1
    const titleWidth = new UiText(won ? 'VICTORY!' : 'YOU FELL', won ? 1 : 2, .5, true).textWidth, large = fitScale(titleWidth, l.width - l.margin * 2, 2 * l.unit), buildHeight = (215 * ratio <= width - 2 * pad ? 25 : 52) * ratio
    const candidates = l.short ? [{ stat: 12, damage: 11, best: false, scale: l.unit, rows: 4 }] : [{ stat: 16, damage: 13, best: true, scale: large, rows: 6 }, { stat: 13, damage: 11, best: true, scale: large, rows: 6 }, { stat: 13, damage: 11, best: false, scale: large, rows: 6 }, { stat: 13, damage: 11, best: false, scale: l.unit, rows: 6 }, { stat: 13, damage: 11, best: false, scale: l.unit, rows: 4 }]
    const measure = (c: typeof candidates[number]): number => {
      const title = Math.ceil(14 * c.scale / l.unit) + (won && !l.short ? 12 : 0) + 10, stats = pad + 7 + gap + c.stat * 4 + pad, build = 7 + gap + buildHeight, chart = pad + 7 + gap + Math.max(1, Math.min(c.rows, damage.length)) * Math.max(c.damage, iconSize + 1) + pad, controls = Math.max(22, l.tap) + (c.best ? 15 : 0)
      return title + (portrait ? stats + 6 + pad + build + pad + 6 + chart : Math.max(stats + 6 + build, chart)) + 10 + controls
    }
    const config = candidates.find(candidate => measure(candidate) <= l.h - 8) ?? candidates[candidates.length - 1]!
    this.shade.tint = won ? colors.dawn : colors.death; this.heading = new Heading(won ? 'VICTORY!' : 'YOU FELL', won ? 1 : 2)
    this.heading.configure({ halo: won ? .24 : 0, haloAt: won ? 1.9 : 0, haloSeconds: .6, breath: won ? .04 : 0, drop: won ? 20 : 16, lettersAt: won ? 1.9 : .6, letterSeconds: won ? .45 : .4, letterFade: .12, strength: won ? 2 : 1.8, stagger: .05, rulesAt: 100, diamondsAt: 100, glintAt: won ? 2.6 : Infinity, center: won, scaleIn: won })
    const highs = [won ? before.wins > 0 && result.time < (before.fastestWin ?? Infinity) : before.runs > 0 && Math.floor(result.time) > Math.floor(before.bestTime), before.runs > 0 && result.level > before.bestLevel, before.runs > 0 && result.kills > before.bestKills, before.runs > 0 && result.gold > before.bestGold]
    const values = [result.time, result.level, result.kills, result.gold], names = [won ? 'Slain at' : 'Survived', 'Level', 'Kills', 'Gold'], icons = ['clock', 'gem', 'kills', 'coin'], rowH = config.stat
    const stampText = width - 2 * pad - 60 >= new UiText('NEW BEST', 3).textWidth + 54 ? 'NEW BEST' : 'NEW!', stampWidth = new UiText(stampText, 3).textWidth + 8, valueX = width - 2 * pad - (highs.some(Boolean) ? stampWidth + 6 : 0)
    const runFrame = panel(width, 1)
    this.runPanel.addChild(runFrame, text('RUN', pad, pad, 1))
    let y = pad + 7 + gap
    for (let i = 0; i < 4; i++) {
      const root = new Container(), motion = new Container(), image = icon(icons[i]!), value = text('', valueX, Math.round((rowH - 7) / 2), i === 3 ? 1 : 0, 0xffffff, 1), stamp = new Container()
      image.scale.set(ratio); image.y = Math.round((rowH - iconSize) / 2)
      const stampHeight = Math.min(13, rowH - 1), frame = panel(stampWidth, stampHeight, 'barFrame'), plate = box(stampWidth - 2, stampHeight - 2, 2755078, .85, 1, 1)
      frame.position.set(-stampWidth / 2, -stampHeight / 2); plate.position.set(-stampWidth / 2 + 1, -stampHeight / 2 + 1)
      stamp.addChild(plate, frame, text(stampText, 0, -4, 3, 0xffffff, .5)); stamp.position.set(valueX + 6 + Math.ceil(stampWidth / 2), Math.round(rowH / 2)); stamp.rotation = -.12
      motion.addChild(image, text(names[i]!, iconSize + 6, Math.round((rowH - 7) / 2), 0, colors.label), value, stamp); root.addChild(motion); root.position.set(pad, y)
      this.runPanel.addChild(root); this.stats.push({ root, motion, value, stamp, target: values[i]!, best: highs[i]! }); y += rowH
    }
    this.build.fill(result.build); this.build.layout(l.icon, l.unit, width - 2 * pad)
    let runH = y + pad, buildH = 0
    if (portrait) {
      buildH = pad + 7 + gap + this.build.measuredHeight + pad
      this.buildPanel.addChild(panel(width, buildH), text('BUILD', pad, pad, 1), this.build); this.build.position.set(pad, pad + 7 + gap)
    }
    else {
      y += gap + 1; this.runPanel.addChild(text('BUILD', pad, y, 1), this.build); this.build.position.set(pad, y + 7 + gap); runH = y + 7 + gap + this.build.measuredHeight + pad
    }
    const damageH = Math.max(config.damage, iconSize + 1), chartH = pad + 7 + gap + Math.max(1, Math.min(config.rows, damage.length)) * damageH + pad, panelH = Math.max(runH, chartH)
    runFrame.height = portrait ? runH : panelH
    this.damagePanel.addChild(panel(width, portrait ? chartH : panelH), text('DAMAGE', pad, pad, 1))
    const barX = iconSize + 4 + 60, barW = Math.max(12, width - 2 * pad - barX - 28 - 4)
    damage.slice(0, config.rows).forEach(([key, amount], i) => {
      const rank = result.build.find(item => item.key === key)!.rank, name = content.weapons.get(key)![rank - 1]!.name
      const root = new Container(), image = icon(key), bar = new Container(), fill = sprite('dmgFill'), frame = panel(barW, 5, 'thinFrame'), value = text('', width - 2 * pad, Math.round((damageH - 1 - 7) / 2), 0, 0xffffff, 1)
      image.scale.set(ratio); image.y = Math.round((damageH - 1 - iconSize) / 2); frame.position.set(barX, Math.round((damageH - 1 - 5) / 2))
      fill.width = Math.max(1, Math.round((barW - 2) * amount / max)); fill.height = 3; bar.position.set(barX + 1, frame.y + 1); bar.addChild(fill)
      root.addChild(image, text(name, iconSize + 4, value.y, 0, colors.label), bar, frame, value); root.position.set(pad, pad + 7 + gap + i * damageH)
      this.damagePanel.addChild(root); this.damageRows.push({ root, bar, value, target: amount })
    })
    if (!damage.length) this.damagePanel.addChild(text('No damage dealt', pad, pad + 7 + gap + 2, 0, colors.dim))
    const headerH = this.heading.layout(config.scale, l.unit, Math.floor(l.w / 2) - 8, 0), totalH = measure(config), top = l.short ? 4 : Math.max(4, Math.min(Math.round(l.h * .1), Math.round((l.h - totalH) / 2))), center = Math.round(l.w / 2), left = center - Math.round((width * 2 + 12) / 2)
    this.heading.position.set(center, top); this.subtitleY = top + headerH + 5; this.subtitle.position.set(center, this.subtitleY); this.subtitle.visible = won && !l.short
    this.runY = top + headerH + (won && !l.short ? 12 : 0) + (l.short ? 4 : 10)
    this.buildY = this.runY + runH + 6; this.damageY = portrait ? this.buildY + buildH + 6 : this.runY
    this.runPanel.position.set(portrait ? center - Math.round(width / 2) : left, this.runY); this.damagePanel.position.set(portrait ? this.runPanel.x : left + width + 12, this.damageY); this.buildPanel.position.set(this.runPanel.x, this.buildY); this.buildPanel.visible = portrait
    const buttonY = portrait ? this.damageY + chartH + 10 : this.runY + panelH + (l.short ? 6 : 10), buttonW = portrait ? Math.floor(width / 2) - 4 : 72, buttonH = Math.max(22, l.tap)
    const retryButton = this.addButton(new UiButton('RETRY', buttonW, buttonH), 0, 0), titleButton = this.addButton(new UiButton('TITLE', buttonW, buttonH, 'Cancel'), 0, 1)
    retryButton.showCursor = titleButton.showCursor = false; retryButton.position.set(center - 6 - buttonW, buttonY); titleButton.position.set(center + 6, buttonY); retryButton.onActivate = retry; titleButton.onActivate = title
    this.best.position.set(center, buttonY + buttonH + 8); this.best.visible = config.best
    this.shade.width = l.width / l.unit; this.shade.height = l.height / l.unit
    this.content.addChildAt(this.shade, 0); this.content.addChild(this.heading, this.subtitle, this.runPanel, this.buildPanel, this.damagePanel, this.best)
    this.stats.forEach((row, i) => { if (row.best) for (let p = 0; p < 6; p++) this.addSpark(this.runPanel.x + row.root.x + row.stamp.x, this.runY + row.root.y + row.stamp.y, i, p) })
    if (won) for (let p = 0; p < 8; p++) this.addSpark(center, top + Math.round(headerH / 2), -1, p)
  }
  setSaved(error = false): void { this.waiting = false; this.best.text = error ? 'Record could not be saved.' : bestLine() }
  private addSpark(x: number, y: number, row: number, index: number): void {
    const node = sprite('sparkle'); node.anchor.set(.5); this.content.addChild(node)
    const value = row < 0 ? 0 : this.stats[row]!.target, countTime = Math.max(.4, Math.min(1.2, .4 + .25 * Math.log10(value + 1)))
    this.sparks.push({ sprite: node, at: row < 0 ? 2 + index * .03 : (this.result.won ? 1.5 : 0) + 1.25 + .3 * row + countTime + .22 + index * .02, x, y, angle: index / (row < 0 ? 8 : 6) * Math.PI * 2 + (row < 0 ? .3 : 0), distance: row < 0 ? 40 + index % 3 * 15 : 10 })
  }
  override get accepting(): boolean { return this.ready && !this.waiting }
  override tick(dt: number): void {
    if (!this.ready && this.age >= (this.result.won ? 2.9 : 1.4) && (Input.isTriggered('ok') || TouchInput.isTriggered())) { this.age = this.result.won ? 6 : 4.5; consumeInput() }
    super.tick(dt)
  }
  protected animate(dt: number): void {
    const won = this.result.won, still = reducedMotion(), age = this.age, delay = won ? 1.5 : 0, time = still && age > (won ? 2 : 1) ? 10 : age
    this.heading.animate(time)
    this.shade.alpha = (won ? .6 : .78) * out(phase(age, won ? 1.6 : .2, still ? .15 : .8))
    this.subtitle.alpha = out(phase(age, 2.3, .4)); this.subtitle.y = this.subtitleY + (still ? 0 : 4 * (1 - out(phase(age, 2.3, .4))))
    const panels = this.buildPanel.visible ? [this.runPanel, this.buildPanel, this.damagePanel] : [this.runPanel, this.damagePanel]
    panels.forEach((node, i) => { const p = phase(time, delay + 1 + i * .1, .45); node.alpha = out(p, 4); node.y = (node === this.runPanel ? this.runY : node === this.buildPanel ? this.buildY : this.damageY) + (still ? 0 : Math.round(16 * (1 - out(p, 4)))) })
    this.stats.forEach((row, i) => {
      row.motion.alpha = introAlpha(time, delay + 1.15 + i * .08); row.motion.x = still ? 0 : Math.round(-8 * (1 - out(phase(time, delay + 1.15 + i * .08, .3))))
      const duration = Math.max(.4, Math.min(1.2, .4 + .25 * Math.log10(row.target + 1))), at = delay + 1.25 + .3 * i, count = out(phase(time, at, duration)), value = Math.floor(row.target * count)
      row.value.text = i === 0 ? clock(value) : String(value)
      const landed = time - at - duration
      row.value.scale.set(still ? 1 : 1.25 - .25 * back(phase(landed, 0, .2), 3))
      row.stamp.visible = row.best && landed >= 0; row.stamp.alpha = phase(landed, 0, .08)
      row.stamp.scale.set(still ? 1 : 2.4 - 1.4 * phase(landed, 0, .22) ** 5)
      const stampP = phase(landed, .22, .3), elastic = stampP === 0 || stampP === 1 ? stampP : 2 ** (-10 * stampP) * Math.sin((stampP - .1) * Math.PI * 5) + 1
      row.stamp.rotation = still ? -.12 : -.2 + .08 * elastic
      if (!still && landed >= .22 && landed < .4) row.motion.x += Math.floor((landed - .22) / .03) % 2 ? 0 : 2
      if (row.best && this.previous < at + duration + .22 && time >= at + duration + .22) sound('Stamp', 55)
      if (count > 0 && count < 1 && age - this.tickAt >= .05) { this.tickAt = age; sound('Tick', 18, 100 + 37.5 * value / Math.max(1, row.target)) }
    })
    this.build.slots.forEach((slot, i) => { slot.reveal = still ? 1 : back(phase(time, delay + 1.6 + i * .04, .3), 2.2) }); this.build.tick(dt)
    this.damageRows.forEach((row, i) => { const p = out(phase(time, delay + 1.7 + i * .08, .6), 4), value = Math.round(row.target * p); row.root.alpha = phase(time, delay + 1.7 + i * .08, .3); row.bar.scale.x = p; row.value.text = value <= 9999 ? String(value) : `${(value / 1000).toFixed(1)}k` })
    this.buttons.forEach((button, i) => { button.motion.alpha = phase(time, delay + 2.9 + i * .07, .3); button.motion.y = still ? 0 : Math.round(10 * (1 - back(phase(time, delay + 2.9 + i * .07, .3)))) })
    this.best.alpha = phase(time, delay + 3.1, .4)
    this.sparks.forEach(({ sprite: node, at, x, y, angle, distance }) => { const p = phase(age, at, distance > 10 ? .7 : .5); node.visible = !still && age >= at && p < 1; node.position.set(x + Math.cos(angle) * distance * out(p), y + Math.sin(angle) * distance * out(p) * (distance > 10 ? .6 : 1)); node.scale.set((distance > 10 ? 1.2 : 1) * (1 - out(p))); node.rotation = p * Math.PI / 2 })
    if (!this.ready && time >= delay + 2.9) { this.ready = true; this.focus(this.buttons[0]!) }
    this.previous = time
  }
}
