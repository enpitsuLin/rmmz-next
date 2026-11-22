import type { Sprite } from 'rmmz-next'
import { ImageManager, Rectangle, Window } from 'rmmz-next'

export class Window_NightwardPanel extends Window {
  private hot = false
  constructor(width: number, height: number) {
    super()
    this.padding = 0; this.margin = 0; this.cursorVisible = false; this.active = false
    this.windowskin = ImageManager.loadSystem('Window')
    this.windowskin.smooth = false
    this.backOpacity = 255
    for (const filter of this._clientArea!.filters ?? []) filter.destroy()
    this._clientArea!.filters = null
    this.move(0, 0, width, height)
  }
  get highlighted(): boolean { return this.hot }
  set highlighted(value: boolean) {
    if (this.hot === value) return
    this.hot = value; this._refreshBack(); this._refreshFrame()
  }
  private skinRect(): Rectangle {
    return this.hot ? new Rectangle(96, 96, 48, 48) : new Rectangle(96, 0, 96, 96)
  }
  override _refreshBack(): void {
    if (!this._windowskin) return
    const rect = this.hot ? new Rectangle(101, 101, 38, 38) : new Rectangle(0, 0, 95, 95), back = this._backSprite!, size = rect.width
    back.bitmap = this.windowskin; back.setFrame(rect.x, rect.y, size, size); back.move(5, 5)
    back.scale.set(Math.max(0, this.width - 10) / size, Math.max(0, this.height - 10) / size)
    back.children[0]!.visible = false
  }
  override _refreshFrame(): void {
    if (!this._windowskin) return
    for (const child of this._frameSprite!.children as Sprite[]) child.bitmap = this.windowskin
    this._setRectPartsGeometry(this._frameSprite!, this.skinRect(), new Rectangle(0, 0, this.width, this.height), 5)
  }
}
