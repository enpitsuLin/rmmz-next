import type { Sprite } from 'pixi.js'
import { Container } from 'pixi.js'
import { clamp, colors, reducedMotion, sine, uiLayout } from '../primitives/ui'
import { box } from './uiSprites'

export class Sprite_NightwardWipe extends Container {
  private draw = new Container()
  private cells: Sprite[] = []
  private time = 0
  private covering = false
  private duration = 0.4
  private done?: () => void
  private running = false
  constructor() { super({ eventMode: 'none' }); this.addChild(this.draw); this.visible = false }
  get busy(): boolean { return this.running }
  play(covering: boolean, seconds: number, done?: () => void): void { this.covering = covering; this.time = 0; this.duration = reducedMotion() ? 0.2 : seconds; this.done = done; this.running = true; this.visible = true }
  tick(dt: number): void {
    if (!this.running)
      return
    this.time += dt
    const layout = uiLayout(); const cell = layout.unit * 8; const columns = Math.ceil(layout.width / cell); const rows = Math.ceil(layout.height / cell); const p = sine(clamp(this.time / this.duration))
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
        const x = i % columns; const y = Math.floor(i / columns); const k = clamp((p - (x + y) / Math.max(1, columns + rows - 2) * 0.6) / 0.4); const size = Math.round((this.covering ? k : 1 - k) * cell * layout.resolution / 2) * 2 / layout.resolution
        node.visible = size > 0; node.alpha = 1; node.tint = size >= cell ? colors.page : colors.gold
        node.position.set(x * cell + (cell - size) / 2, y * cell + (cell - size) / 2); node.width = size; node.height = size
      }
      for (let i = count; i < this.cells.length; i++) this.cells[i]!.visible = false
    }
    if (this.time >= this.duration) { this.running = false; this.visible = this.covering; const done = this.done; this.done = undefined; done?.() }
  }
}
