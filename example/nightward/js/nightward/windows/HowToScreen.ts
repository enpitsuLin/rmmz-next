import type { Sprite } from 'pixi.js'
import type { Content } from '../managers/NightwardDataManager'
import { Container } from 'pixi.js'
import { sound } from '../managers/NightwardAudioManager'
import { colors, introAlpha, out, phase, reducedMotion } from '../primitives/ui'
import { Sprite_NightwardButton } from '../sprites/Sprite_NightwardButton'
import { text, wrap } from '../sprites/Sprite_NightwardText'
import { icon, iconScale, keycap, sprite, touchHintArt } from '../sprites/uiSprites'
import { panel } from './panel'
import { SheetScreen } from './SheetScreen'

export class HowToScreen extends SheetScreen {
  private tabs: Sprite_NightwardButton[]
  private chips: Sprite_NightwardButton[]
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
  constructor(backToMenu: () => void, private data: Content) {
    super('HOW TO PLAY')
    this.onBack = backToMenu
    this.tabs = ['GOAL', 'CONTROLS', 'PICKUPS'].map((name, i) => {
      const button = this.addButton(new Sprite_NightwardButton(name, 60, 15, null), 0, i, this.sheet)
      button.showCursor = false
      button.onActivate = button.onFocus = () => this.showPage(i, this.scheme)
      return button
    })
    this.chips = ['KEYS', 'PAD', 'TOUCH'].map((name, i) => {
      const button = this.addButton(new Sprite_NightwardButton(name, 44, 15, null), 1, i, this.sheet)
      button.showCursor = false
      button.onActivate = button.onFocus = () => this.showPage(1, i)
      return button
    })
    const backButton = this.addButton(new Sprite_NightwardButton('BACK', 64, 22, null), 2, 0, this.sheet)
    backButton.onActivate = backToMenu
    this.sheet.addChild(this.page, ...this.dots)
    this.place()
    this.focus(this.tabs[0]!)
    sound('Swoosh', 40)
  }

  private showPage(page: number, scheme: number): void {
    if (page === this.pageIndex && scheme === this.scheme && this.pageItems.length)
      return
    this.retiring?.destroy({ children: true })
    this.direction = page === this.pageIndex ? Math.sign(scheme - this.scheme) || 1 : Math.sign(page - this.pageIndex) || 1
    this.retiring = new Container()
    this.retiring.position.copyFrom(this.page.position)
    this.retiringItems = this.page.removeChildren() as Container[]
    this.retiring.addChild(...this.retiringItems)
    this.sheet.addChild(this.retiring)
    this.pageIndex = page
    this.scheme = scheme
    this.changed = this.age
    this.place()
  }

  protected place(): void {
    const l = this.layout
    const width = Math.min(300, l.w - 16)
    const inner = width - 20
    const tabH = Math.max(15, Math.min(l.tap, 22))
    const tabW = Math.floor((width - 28) / 3)
    this.tabs.forEach((button, i) => {
      button.setSize(tabW, tabH, l.tap)
      button.position.set(10 + i * (tabW + 4), 10)
      button.selected = i === this.pageIndex
    })
    this.chips.forEach((button, i) => {
      button.setSize(44, tabH, l.tap)
      button.position.set(10 + i * 48, 18 + tabH)
      button.visible = button.enabled = this.pageIndex === 1
      button.selected = i === this.scheme
    })
    for (const node of this.page.removeChildren()) node.destroy({ children: true })
    this.pageItems = []
    this.touchKnob = undefined
    this.page.position.set(10, 18 + tabH + (this.pageIndex === 1 ? tabH + 8 : 0))
    const ratio = l.icon / l.unit
    const iconSize = Math.ceil(16 * ratio)
    let y = 0
    const goalRows: [number, string][] = [
      [this.data.config.icons.clock, 'Survive the night. The horde grows every minute.'],
      [this.data.weapons.get('lash')![0]!.iconIndex, 'You only move. Your weapons fire on their own.'],
      [this.data.items.get('gemSmall')!.iconIndex, 'Gems fill your XP bar. Each level, pick one of three upgrades.'],
      [this.data.config.icons.kills, `At 3:00 the ${this.data.enemies.get('reaper')!.name} rises. Slay him to win.`],
    ]
    const pickupRows: [number, string][] = (['gemSmall', 'coin', 'chicken', 'vacuum', 'relic'] as const).map((key) => {
      const item = this.data.items.get(key)!
      return [item.iconIndex, `${item.name}: ${item.description}`]
    })
    if (this.pageIndex === 1) {
      interface Part { node: Container, width: number, height: number, cap?: boolean }
      const cap = (value: string): Part => {
        const { node, width } = keycap(value)
        return { node, width, height: 11, cap: true }
      }
      const word = (value: string, tint = 0xFFFFFF): Part => {
        const node = text(value, 0, 2, 0, tint)
        return { node, width: node.textWidth + 1, height: 11 }
      }
      const or = (): Part => word('or', colors.dim)
      const badge = (part: string): Part => {
        const node = new Container()
        const frame = panel(13, 13)
        const image = sprite(part)
        frame.y = -1
        image.anchor.set(0.5)
        image.position.set(6.5, 5.5)
        image.scale.set(image.texture.frame.width > 9 ? 0.8 : 1)
        node.addChild(frame, image)
        return { node, width: 13, height: 11 }
      }
      const { node: touchArt, knob } = touchHintArt()
      const rows: [string, Part[]][] = this.scheme === 0
        ? [
            ['Move', [cap('W'), cap('A'), cap('S'), cap('D'), or(), word('arrows')]],
            ['Pick', [cap('1'), cap('2'), cap('3'), or(), word('arrows and'), cap('Enter')]],
            ['Pause', [cap('Esc'), or(), cap('P')]],
            ['Mute', [cap('M')]],
          ]
        : this.scheme === 1 ? [['Move', [cap('L STICK'), or(), cap('D-PAD')]], ['Pick', [cap('D-PAD'), word('and'), cap('A')]], ['Pause', [cap('START')]], ['Back', [cap('B')]]] : [['Move', [{ node: touchArt, width: 26, height: 24 }, word('Drag anywhere')]], ['Pick', [word('Tap a card')]], ['Pause', [badge('pauseBars'), word('Top of the screen')]], ['Mute', [badge('speakerOn'), word('Title and pause menu')]]]
      if (this.scheme === 0 && document.fullscreenEnabled)
        rows.push(['Fullscreen', [cap('F')]])
      if (this.scheme === 2)
        this.touchKnob = knob
      for (const [name, parts] of rows) {
        const row = new Container()
        const rowLabel = text(name, 0, 0, 0, colors.label)
        row.y = y
        row.addChild(rowLabel)
        const rowHeight = Math.max(15, ...parts.map(part => part.height + 4))
        rowLabel.y = Math.round((rowHeight - 4 - 7) / 2)
        let x = 64
        let line = 0
        parts.forEach((part, i) => {
          if (x > 64 && x + part.width > inner) {
            x = 64
            line++
          }
          ;
          part.node.position.set(x, line * rowHeight + Math.round((rowHeight - 4 - part.height) / 2))
          x += part.width + (part.cap && !parts[i + 1]?.cap ? 5 : 3)
          row.addChild(part.node)
        })
        this.page.addChild(row)
        this.pageItems.push(row)
        y += (line + 1) * rowHeight + 2
      }
      y -= 2
    }
    else {
      const rows = this.pageIndex === 0 ? goalRows : pickupRows
      if (this.pageIndex === 2) {
        const note = text('Break braziers to find them.', 0, y, 0, colors.dim)
        this.page.addChild(note)
        this.pageItems.push(note)
        y += 14
      }
      for (const [iconIndex, value] of rows) {
        const row = new Container()
        const image = icon(iconIndex)
        const lines = wrap(value, inner - iconSize - 6)
        row.y = y
        image.scale.set(iconScale(image, ratio))
        row.addChild(image)
        lines.forEach((line, i) => row.addChild(text(line, iconSize + 6, i * 10 + Math.max(0, Math.round((iconSize - 7) / 2) - (lines.length > 1 ? 4 : 0)))))
        this.page.addChild(row)
        this.pageItems.push(row)
        y += Math.max(iconSize, lines.length * 10 - 3) + 8
      }
      y -= 8
    }
    const itemPageHeight = (values: string[], note = false): number => (note ? 14 : 0) + values.reduce((height, value) => height + Math.max(iconSize, wrap(value, inner - iconSize - 6).length * 10 - 3) + 8, 0) - 8
    const goalH = itemPageHeight(goalRows.map(([, value]) => value))
    const pickupH = itemPageHeight(pickupRows.map(([, value]) => value), true)
    const contentH = Math.max(goalH, pickupH, (document.fullscreenEnabled ? 83 : 79) + tabH + 8, y + (this.pageIndex === 1 ? tabH + 8 : 0))
    const bottom = 18 + tabH + contentH + 10
    const button = this.buttons[this.buttons.length - 1]!
    const buttonH = Math.max(22, l.tap)
    button.setSize(64, buttonH, l.tap)
    button.position.set(width - 74, bottom)
    this.dots.forEach((node, i) => {
      node.anchor.set(0.5)
      node.position.set(14 + i * 11, bottom + Math.round(buttonH / 2))
      node.tint = i === this.pageIndex ? 0xFFFFFF : colors.edge
    })
    this.placeSheet(width, bottom + buttonH + 10)
  }

  protected override animate(dt: number): void {
    super.animate(dt)
    const age = this.age - this.changed
    this.pageItems.forEach((node, i) => {
      node.alpha = introAlpha(age, 0.12 + i * 0.04)
      node.x = reducedMotion() ? 0 : Math.round(12 * this.direction * (1 - out(phase(age, 0.12 + i * 0.04, 0.22))))
    })
    if (this.retiring) {
      this.retiringItems.forEach((node) => {
        node.alpha = 1 - phase(age, 0, 0.15) ** 3
        node.x = reducedMotion() ? 0 : Math.round(-12 * this.direction * phase(age, 0, 0.15) ** 3)
      })
      if (age >= 0.15) {
        this.retiring.destroy({ children: true })
        this.retiring = undefined
        this.retiringItems = []
      }
    }
    if (this.touchKnob && !reducedMotion())
      this.touchKnob.position.set(Math.round(12 + 6 * Math.cos(this.age * Math.PI * 2 / 1.6)), Math.round(12 + 6 * Math.sin(this.age * Math.PI * 2 / 1.6)))
  }
}
