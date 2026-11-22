import type { Sprite } from 'pixi.js'
import type { Sprite_NightwardText } from '../sprites/Sprite_NightwardText'
import { Container } from 'pixi.js'
import { ConfigManager } from 'rmmz-next'
import { getAssets } from '../managers/NightwardAssetManager'
import { sound } from '../managers/NightwardAudioManager'
import { settings } from '../managers/NightwardConfigManager'
import { back, colors, fullscreen, out, phase, reducedMotion } from '../primitives/ui'
import { Sprite_NightwardButton } from '../sprites/Sprite_NightwardButton'
import { text } from '../sprites/Sprite_NightwardText'
import { box, sprite } from '../sprites/uiSprites'
import { SheetScreen } from './SheetScreen'

class OptionRow extends Sprite_NightwardButton {
  readonly control = new Container()
  private title: Sprite_NightwardText
  private valueText = text('', 0, 0, 0, 0xFFFFFF, 0.5)
  private band = box(1, 1, 1517134, 0.85)
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
      for (let i = 0; i < 10; i++) { const pip = sprite('pipOff'); pip.anchor.set(0.5); this.pips.push(pip); this.control.addChild(pip) }
      this.control.addChild(this.valueText); this.valueText.align = 1
    }
    this.on('pointerdown', (event) => {
      const x = event.getLocalPosition(this.control).x
      this.pointerGesture = true
      if (this.values) { this.pointerStep = x < -6 || x > 66 ? 0 : x < 30 ? -1 : 1; return }
      const width = 40 * this.pipScale + 9
      if (x > width + 4 && x <= width + 21) { this.change(this.read() >= 10 ? -10 : 1); return }
      if (x < -8 || x > width + 4)
        return
      this.dragging = true; this.fromPointer(x)
    })
    this.on('globalpointermove', (event) => {
      if (this.dragging)
        this.fromPointer(event.getLocalPosition(this.control).x)
    })
    this.on('pointerup', () => { this.dragging = false }); this.on('pointerupoutside', () => { this.dragging = false; this.pointerGesture = false })
  }

  override activate(): void {
    if (this.pointerGesture) {
      this.pointerGesture = false; if (this.values && this.pointerStep)
        this.change(this.pointerStep); return
    }
    this.change(1)
  }

  private change(direction: number): void {
    const current = this.read(); const next = this.values ? (current + direction + this.values.length) % this.values.length : Math.max(0, Math.min(10, current + direction))
    if (next === current)
      return
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
    const pipSize = 4 * this.pipScale; const pipWidth = 10 * pipSize + 9; const controlWidth = this.values ? 60 : Math.ceil(pipWidth + 15)
    this.control.position.set(width - 10 - controlWidth, Math.round((height - Math.max(7, this.values ? 11 : pipSize)) / 2))
    this.pips.forEach((pip, i) => { pip.scale.set(this.pipScale); pip.position.set(i * (pipSize + 1) + pipSize / 2, Math.max(pipSize, 7) / 2) })
    if (!this.values)
      this.valueText.position.set(pipWidth + 15, Math.round((Math.max(pipSize, 7) - 7) / 2))
  }

  override tick(dt: number, live = true): void {
    super.tick(dt, live); this.changeAge += dt
    this.band.visible = this.focused; this.title.tint = this.focused ? 0xFFFFFF : colors.label
    const value = this.read()
    if (value !== this.shown) { this.shown = value; this.valueText.text = this.values?.[value] ?? String(value); this.pips.forEach((pip, i) => { pip.texture = getAssets().ui[i < value ? 'pipOn' : 'pipOff']! }) }
    if (this.values) { this.valueText.alpha = phase(this.changeAge, 0.05, 0.15); this.valueText.x = 30 + (reducedMotion() ? 0 : Math.round(6 * this.direction * (1 - out(phase(this.changeAge, 0.05, 0.15))))) }
    else {
      this.valueText.scale.set(reducedMotion() ? 1 : 1.25 - 0.25 * back(phase(this.changeAge, 0, 0.18), 3))
    }
  }
}
export class OptionsScreen extends SheetScreen {
  private rows: OptionRow[]
  constructor(backToMenu: () => void) {
    super('OPTIONS'); this.onBack = backToMenu
    const save = (): void => { ConfigManager.save() }
    this.rows = [
      new OptionRow('Music', () => Math.round(ConfigManager.bgmVolume / 10), (value) => { ConfigManager.bgmVolume = value * 10; save() }),
      new OptionRow('Sound', () => Math.round(ConfigManager.seVolume / 10), (value) => { ConfigManager.seVolume = value * 10; ConfigManager.meVolume = value * 10; sound('Pickup', 35); save() }),
      new OptionRow('Screen shake', () => settings.shake === 0.5 ? 1 : settings.shake ? 0 : 2, (value) => { settings.shake = [1, 0.5, 0][value]!; save() }, ['FULL', 'LOW', 'OFF']),
      new OptionRow('Damage numbers', () => settings.damageNumbers ? 0 : 1, (value) => { settings.damageNumbers = value === 0; save() }, ['ON', 'OFF']),
    ]
    if (document.fullscreenEnabled)
      this.rows.push(new OptionRow('Fullscreen', () => document.fullscreenElement ? 0 : 1, () => fullscreen(), ['ON', 'OFF']))
    this.rows.forEach((row, i) => this.addButton(row, i, 0, this.sheet))
    const button = this.addButton(new Sprite_NightwardButton('BACK', 64, 22, null), this.rows.length, 0, this.sheet); button.onActivate = backToMenu
    this.place(); this.focus(this.rows[0]!); sound('Swoosh', 40)
  }

  protected place(): void {
    const l = this.layout; const width = Math.min(260, l.w - 16); const rowH = Math.max(18, l.tap); const buttonH = Math.max(22, l.tap)
    this.rows.forEach((row, i) => { row.layoutRow(width - 24, l.icon, l.unit, l.tap); row.position.set(12, 10 + i * (rowH + 4)) })
    const bottom = 10 + this.rows.length * (rowH + 4) - 4 + 10; const button = this.buttons[this.buttons.length - 1]!
    button.setSize(64, buttonH, l.tap); button.position.set(Math.round((width - 64) / 2), bottom)
    this.placeSheet(width, bottom + buttonH + 10)
  }
}
