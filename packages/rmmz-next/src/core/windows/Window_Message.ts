import type { Bitmap, Rectangle } from '../primitives'
import type { Window_ChoiceList } from './Window_ChoiceList'
import type { Window_EventItem } from './Window_EventItem'
import type { Window_Gold } from './Window_Gold'
import type { Window_NameBox } from './Window_NameBox'
import type { Window_NumberInput } from './Window_NumberInput'
import { GlobalMananger } from '../managers/GlobalManager'
import { ImageManager } from '../managers/ImageManager'
import { Graphics, Input, TouchInput } from '../primitives'
import { Window_Base } from './Window_Base'

/**
 * Window_Message
 *
 * The window for displaying text messages.
 */
export class Window_Message extends Window_Base {
  _background: Window_Message.BackgroundType
  _positionType: number
  _waitCount: number
  _faceBitmap: Bitmap | null
  _textState: Window_Base.TextState | null
  _goldWindow: Window_Gold | null
  _nameBoxWindow: Window_NameBox | null
  _choiceListWindow: Window_ChoiceList | null
  _numberInputWindow: Window_NumberInput | null
  _eventItemWindow: Window_EventItem | null
  _showFast: boolean
  _lineShowFast: boolean
  _pauseSkip: boolean

  constructor(rect: Rectangle.Shape) {
    super(rect)
    this.openness = 0
    this._background = 0
    this._positionType = 2
    this._waitCount = 0
    this._faceBitmap = null
    this._textState = null
    this._goldWindow = null
    this._nameBoxWindow = null
    this._choiceListWindow = null
    this._numberInputWindow = null
    this._eventItemWindow = null
    this._showFast = false
    this._lineShowFast = false
    this._pauseSkip = false
    this.clearFlags()
  }

  initMembers(): void {
    this._background = 0
    this._positionType = 2
    this._waitCount = 0
    this._faceBitmap = null
    this._textState = null
    this._goldWindow = null
    this._nameBoxWindow = null
    this._choiceListWindow = null
    this._numberInputWindow = null
    this._eventItemWindow = null
    this.clearFlags()
  }

  setGoldWindow(goldWindow: Window_Gold): void {
    this._goldWindow = goldWindow
  }

  setNameBoxWindow(nameBoxWindow: Window_NameBox): void {
    this._nameBoxWindow = nameBoxWindow
  }

  setChoiceListWindow(choiceListWindow: Window_ChoiceList): void {
    this._choiceListWindow = choiceListWindow
  }

  setNumberInputWindow(numberInputWindow: Window_NumberInput): void {
    this._numberInputWindow = numberInputWindow
  }

  setEventItemWindow(eventItemWindow: Window_EventItem): void {
    this._eventItemWindow = eventItemWindow
  }

  clearFlags(): void {
    this._showFast = false
    this._lineShowFast = false
    this._pauseSkip = false
  }

  update(): void {
    this.checkToNotClose()
    super.update()
    this.synchronizeNameBox()
    while (!this.isOpening() && !this.isClosing()) {
      if (this.updateWait()) {
        return
      }
      else if (this.updateLoading()) {
        return
      }
      else if (this.updateInput()) {
        return
      }
      else if (this.updateMessage()) {
        return
      }
      else if (this.canStart()) {
        this.startMessage()
      }
      else {
        this.startInput()
        return
      }
    }
  }

  checkToNotClose(): void {
    if (this.isOpen() && this.isClosing() && this.doesContinue()) {
      this.open()
    }
  }

  synchronizeNameBox(): void {
    this._nameBoxWindow!.openness = this.openness
  }

  canStart(): boolean {
    return GlobalMananger.$gameMessage.hasText() && !GlobalMananger.$gameMessage.scrollMode()
  }

  startMessage(): void {
    const text = GlobalMananger.$gameMessage.allText()
    const textState = this.createTextState(text, 0, 0, 0)
    textState.x = this.newLineX(textState)
    textState.startX = textState.x
    this._textState = textState
    this.newPage(this._textState)
    this.updatePlacement()
    this.updateBackground()
    this.open()
    this._nameBoxWindow!.start()
  }

  newLineX(textState: Window_Base.TextState): number {
    const faceExists = GlobalMananger.$gameMessage.faceName() !== ''
    const faceWidth = ImageManager.standardFaceWidth
    const spacing = 20
    const margin = faceExists ? faceWidth + spacing : 4
    return textState.rtl ? this.innerWidth - margin : margin
  }

  updatePlacement(): void {
    const goldWindow = this._goldWindow
    this._positionType = GlobalMananger.$gameMessage.positionType()
    this.y = (this._positionType * (Graphics.boxHeight - this.height)) / 2
    if (goldWindow) {
      goldWindow.y = this.y > 0 ? 0 : Graphics.boxHeight - goldWindow.height
    }
  }

  updateBackground(): void {
    this._background = GlobalMananger.$gameMessage.background() as Window_Message.BackgroundType
    this.setBackgroundType(this._background)
  }

  terminateMessage(): void {
    this.close()
    this._goldWindow!.close()
    GlobalMananger.$gameMessage.clear()
  }

  updateWait(): boolean {
    if (this._waitCount > 0) {
      this._waitCount--
      return true
    }
    else {
      return false
    }
  }

  cancelWait(): void {
    if (GlobalMananger.$gameSystem.isMessageSkipEnabled()) {
      this._waitCount = 0
    }
  }

  updateLoading(): boolean {
    if (this._faceBitmap) {
      if (this._faceBitmap.isReady()) {
        this.drawMessageFace()
        this._faceBitmap = null
        return false
      }
      else {
        return true
      }
    }
    else {
      return false
    }
  }

  updateInput(): boolean {
    if (this.isAnySubWindowActive()) {
      return true
    }
    if (this.pause) {
      if (this.isTriggered()) {
        Input.update()
        this.pause = false
        if (!this._textState) {
          this.terminateMessage()
        }
      }
      return true
    }
    return false
  }

  isAnySubWindowActive(): boolean {
    return (
      this._choiceListWindow!.active
      || this._numberInputWindow!.active
      || this._eventItemWindow!.active
    )
  }

  updateMessage(): boolean {
    const textState = this._textState
    if (textState) {
      while (!this.isEndOfText(textState)) {
        if (this.needsNewPage(textState)) {
          this.newPage(textState)
        }
        this.updateShowFast()
        this.processCharacter(textState)
        if (this.shouldBreakHere(textState)) {
          break
        }
      }
      this.flushTextState(textState)
      if (this.isEndOfText(textState) && !this.isWaiting()) {
        this.onEndOfText()
      }
      return true
    }
    else {
      return false
    }
  }

  shouldBreakHere(textState: Window_Base.TextState): boolean {
    if (this.canBreakHere(textState)) {
      if (!this._showFast && !this._lineShowFast) {
        return true
      }
      if (this.isWaiting()) {
        return true
      }
    }
    return false
  }

  canBreakHere(textState: Window_Base.TextState): boolean {
    if (!this.isEndOfText(textState)) {
      const c = textState.text[textState.index]
      if (c.charCodeAt(0) >= 0xDC00 && c.charCodeAt(0) <= 0xDFFF) {
        // surrogate pair
        return false
      }
      if (textState.rtl && c.charCodeAt(0) > 0x20) {
        return false
      }
    }
    return true
  }

  onEndOfText(): void {
    if (!this.startInput()) {
      if (!this._pauseSkip) {
        this.startPause()
      }
      else {
        this.terminateMessage()
      }
    }
    this._textState = null
  }

  startInput(): boolean {
    if (GlobalMananger.$gameMessage.isChoice()) {
      this._choiceListWindow!.start()
      return true
    }
    else if (GlobalMananger.$gameMessage.isNumberInput()) {
      this._numberInputWindow!.start()
      return true
    }
    else if (GlobalMananger.$gameMessage.isItemChoice()) {
      this._eventItemWindow!.start()
      return true
    }
    else {
      return false
    }
  }

  isTriggered(): boolean {
    return (
      Input.isRepeated('ok')
      || Input.isRepeated('cancel')
      || TouchInput.isRepeated()
    )
  }

  doesContinue(): boolean {
    return (
      GlobalMananger.$gameMessage.hasText()
      && !GlobalMananger.$gameMessage.scrollMode()
      && !this.areSettingsChanged()
    )
  }

  areSettingsChanged(): boolean {
    return (
      this._background !== GlobalMananger.$gameMessage.background()
      || this._positionType !== GlobalMananger.$gameMessage.positionType()
    )
  }

  updateShowFast(): void {
    if (this.isTriggered()) {
      this._showFast = true
    }
  }

  newPage(textState: Window_Base.TextState): void {
    this.contents.clear()
    this.resetFontSettings()
    this.clearFlags()
    this.updateSpeakerName()
    this.loadMessageFace()
    textState.x = textState.startX
    textState.y = 0
    textState.height = this.calcTextHeight(textState)
  }

  updateSpeakerName(): void {
    this._nameBoxWindow!.setName(GlobalMananger.$gameMessage.speakerName())
  }

  loadMessageFace(): void {
    this._faceBitmap = ImageManager.loadFace(GlobalMananger.$gameMessage.faceName())
  }

  drawMessageFace(): void {
    const faceName = GlobalMananger.$gameMessage.faceName()
    const faceIndex = GlobalMananger.$gameMessage.faceIndex()
    const rtl = GlobalMananger.$gameMessage.isRTL()
    const width = ImageManager.standardFaceWidth
    const height = this.innerHeight
    const x = rtl ? this.innerWidth - width - 4 : 4
    this.drawFace(faceName, faceIndex, x, 0, width, height)
  }

  processControlCharacter(textState: Window_Base.TextState, c: string): void {
    super.processControlCharacter(textState, c)
    if (c === '\f') {
      this.processNewPage(textState)
    }
  }

  processNewLine(textState: Window_Base.TextState): void {
    this._lineShowFast = false
    super.processNewLine(textState)
    if (this.needsNewPage(textState)) {
      this.startPause()
    }
  }

  processNewPage(textState: Window_Base.TextState): void {
    if (textState.text[textState.index] === '\n') {
      textState.index++
    }
    textState.y = this.contents.height
    this.startPause()
  }

  isEndOfText(textState: Window_Base.TextState): boolean {
    return textState.index >= textState.text.length
  }

  needsNewPage(textState: Window_Base.TextState): boolean {
    return (
      !this.isEndOfText(textState)
      && textState.y + textState.height > this.contents.height
    )
  }

  processEscapeCharacter(code: string, textState: Window_Base.TextState): void {
    switch (code) {
      case '$':
        this._goldWindow!.open()
        break
      case '.':
        this.startWait(15)
        break
      case '|':
        this.startWait(60)
        break
      case '!':
        this.startPause()
        break
      case '>':
        this._lineShowFast = true
        break
      case '<':
        this._lineShowFast = false
        break
      case '^':
        this._pauseSkip = true
        break
      default:
        super.processEscapeCharacter(code, textState)
        break
    }
  }

  startWait(count: number): void {
    this._waitCount = count
  }

  startPause(): void {
    this.startWait(10)
    this.pause = true
  }

  isWaiting(): boolean {
    return this.pause || this._waitCount > 0
  }
}

export namespace Window_Message {
  export type BackgroundType = 0 | 1 | 2
}
