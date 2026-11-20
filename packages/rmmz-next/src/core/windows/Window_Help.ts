import type { MZ } from '../../database-types'
import type { Rectangle } from '../primitives'
import { Window_Base } from './Window_Base'

/**
 * Window_Help
 *
 * The window for displaying the description of the selected item.
 */
export class Window_Help extends Window_Base {
  _text: string

  constructor(rect: Rectangle.Shape) {
    super(rect)
    this._text = ''
  }

  setText(text: string): void {
    if (this._text !== text) {
      this._text = text
      this.refresh()
    }
  }

  clear(): void {
    this.setText('')
  }

  setItem(item: MZ.GeneralItem | null): void {
    this.setText(item ? item.description : '')
  }

  refresh(): void {
    const rect = this.baseTextRect()
    this.contents.clear()
    this.drawTextEx(this._text, rect.x, rect.y, rect.width)
  }
}
