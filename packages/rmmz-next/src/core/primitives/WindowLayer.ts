import type { Window } from './Window'
import * as PIXI from 'pixi.js'

/** The layer which contains game windows. */
export class WindowLayer extends PIXI.Container {
  children!: Window[]
  _windowMasks = new Map<Window, PIXI.Graphics>()

  constructor() {
    super()
    this.onRender = this._prepareRender.bind(this)
  }

  update(): void {
    for (const child of this.children) {
      child.update?.()
    }
  }

  _prepareRender(): void {
    const windows = this.children.filter(child => child._isWindow)
    for (const [win, mask] of this._windowMasks) {
      if (win.parent !== this) {
        if (!win.destroyed) {
          win.mask = null
        }
        mask.destroy()
        this._windowMasks.delete(win)
      }
    }

    for (let i = 0; i < windows.length; i++) {
      const win = windows[i]
      const occluders = windows.slice(i + 1)
        .filter(child => child.visible && child.openness > 0)
      let mask = this._windowMasks.get(win)
      if (occluders.length === 0) {
        win.mask = null
        if (mask) {
          mask.clear()
          mask.visible = false
        }
        continue
      }
      if (!mask) {
        mask = new PIXI.Graphics()
        this._windowMasks.set(win, mask)
        this.addChild(mask)
      }
      mask.visible = true
      mask.clear()
      for (const occluder of occluders) {
        occluder.drawShape(mask)
      }
      win.setMask({ mask, inverse: true })
    }
  }
}
