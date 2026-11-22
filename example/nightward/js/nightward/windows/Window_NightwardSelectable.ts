import type { Container } from 'pixi.js'
import { Bitmap, Rectangle, TouchInput, Window_Selectable } from 'rmmz-next'
import { sound } from '../managers/NightwardAudioManager'

export interface WindowChoice {
  readonly node: Container
  readonly rect: Rectangle.Shape
  readonly enabled: boolean
  readonly selected: boolean
  readonly row: number
  readonly col: number
  focus: (selected: boolean, keyed: boolean) => void
  setPressed: (pressed: boolean) => void
  activate: () => void
  step?: (direction: number) => void
}

export class Window_NightwardSelectable extends Window_Selectable {
  choices: readonly WindowChoice[] = []
  onSelection?: (choice: WindowChoice | undefined) => void
  onCancel?: () => void
  pointerOnly = false
  cycle = false
  private keyed = true
  private pressed = -1
  constructor(width: number, height: number) {
    super(new Rectangle(0, 0, width, height))
    this.padding = 0; this.opacity = 0; this.cursorVisible = false; this._canRepeat = false
    // Pixi glyph effects overflow item bounds; the scene viewport provides clipping.
    for (const filter of this._clientArea!.filters ?? []) filter.destroy()
    this._clientArea!.filters = null
    this.setHandler('ok', () => this.choices[this.index()]?.activate())
    this.setHandler('cancel', () => this.onCancel?.())
  }
  override updatePadding(): void { this.padding = 0 }
  override createContents(): void { this.destroyContents(); this.contents = new Bitmap(1, 1); this.contentsBack = new Bitmap(1, 1) }
  override maxItems(): number { return this.choices?.length ?? 0 }
  override maxVisibleItems(): number { return this.maxItems() }
  override overallHeight(): number { return this.innerHeight }
  override isScrollEnabled(): boolean { return false }
  override ensureCursorVisible(): void {}
  override cursorPageup(): void {}
  override cursorPagedown(): void {}
  override isCurrentItemEnabled(): boolean { return this.available(this.index()) }
  override isCancelEnabled(): boolean { return !!this.onCancel }
  override isTouchOkEnabled(): boolean { return this.isOkEnabled() }
  override playOkSound(): void {}
  override playCursorSound(): void { sound('Cursor') }
  override updateInputData(): void {}
  override processCancel(): void { this.deactivate(); this.callCancelHandler() }
  override _updateCursor(): void { super._updateCursor(); this._cursorSprite!.visible = false }
  override processCursorMove(): void { if (!this.pointerOnly) super.processCursorMove() }
  override processHandling(): void { if (!this.pointerOnly) super.processHandling() }
  override select(index: number): void {
    const previous = this.index()
    super.select(index)
    if (previous !== index) this.choices?.[previous]?.focus(false, this.keyed)
    const choice = this.choices?.[index]
    choice?.focus(true, this.keyed); this.onSelection?.(choice)
  }
  focusChoice(index: number, keyed = true): void { this.keyed = keyed; this.select(index) }
  private available(index: number): boolean {
    const choice = this.choices?.[index]
    if (!choice?.enabled) return false
    for (let node: Container | null = choice.node; node && node !== this; node = node.parent) if (!node.visible) return false
    return true
  }
  override itemRect(index: number): Rectangle {
    const choice = this.choices?.[index]
    if (!choice) return new Rectangle()
    const { x, y, width, height } = choice.rect, a = this.toLocal(choice.node.toGlobal({ x, y })), b = this.toLocal(choice.node.toGlobal({ x: x + width, y: y + height }))
    return new Rectangle(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y))
  }
  override hitTest(x: number, y: number): number {
    for (let i = 0; i < this.maxItems(); i++) if (this.available(i) && this.itemRect(i).contains(x, y)) return i
    return -1
  }
  private moveRow(direction: number): void {
    this.keyed = true
    const enabled = this.choices.map((choice, index) => ({ choice, index })).filter(({ index }) => this.available(index))
    if (!enabled.length) return
    if (this.cycle) {
      const current = enabled.findIndex(({ index }) => index === this.index()), next = (current + direction + enabled.length) % enabled.length
      this.select(enabled[next]!.index); return
    }
    const rows = [...new Set(enabled.map(({ choice }) => choice.row))].sort((a, b) => a - b), current = this.choices[this.index()], at = current ? rows.indexOf(current.row) : -1, row = rows[(at + direction + rows.length) % rows.length]!, candidates = enabled.filter(({ choice }) => choice.row === row)
    const next = candidates.find(({ choice }) => choice.selected) ?? candidates.reduce((best, item) => Math.abs(item.choice.col - (current?.col ?? 0)) < Math.abs(best.choice.col - (current?.col ?? 0)) ? item : best)
    this.select(next.index)
  }
  private moveColumn(direction: number): void {
    this.keyed = true
    if (this.cycle || this.index() < 0) { this.moveRow(direction); return }
    const current = this.choices[this.index()]!, row = this.choices.map((choice, index) => ({ choice, index })).filter(({ choice, index }) => choice.row === current.row && this.available(index)).sort((a, b) => a.choice.col - b.choice.col), at = row.findIndex(({ index }) => index === this.index())
    if (row.length > 1) this.select(row[Math.max(0, Math.min(row.length - 1, at + direction))]!.index)
    else current.step?.(direction)
  }
  override cursorDown(): void { this.moveRow(1) }
  override cursorUp(): void { this.moveRow(-1) }
  override cursorRight(): void { this.moveColumn(1) }
  override cursorLeft(): void { this.moveColumn(-1) }
  override onTouchSelect(trigger: boolean): void {
    const previous = this.index()
    this.keyed = false; super.onTouchSelect(trigger)
    if (!trigger && previous !== this.index()) this.playCursorSound()
    if (trigger) { this.pressed = this.hitIndex(); this.choices[this.pressed]?.setPressed(true) }
  }
  override onTouchOk(): void { if (this.hitIndex() === this.pressed && this.pressed >= 0) super.onTouchOk() }
  override processTouch(): void {
    super.processTouch()
    if (!TouchInput.isPressed() && this.pressed >= 0) { this.choices[this.pressed]?.setPressed(false); this.pressed = -1 }
  }
  setLive(live: boolean): void {
    if (live && !this.active) this.activate()
    else if (!live && this.active) { this.deactivate(); this.choices[this.pressed]?.setPressed(false); this.pressed = -1 }
  }
}
