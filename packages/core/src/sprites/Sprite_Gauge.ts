import type * as PIXI from 'pixi.js'
import type { Game_Battler } from '../objects'
import type { RGBA } from '../types'
import { Bitmap, Sprite } from '../core'
import { ColorManager, GlobalMananger, TextManager } from '../managers'

/**
 * Sprite_Gauge
 *
 * The sprite for displaying a status gauge.
 */
export class Sprite_Gauge extends Sprite {
  _battler!: null | Game_Battler
  _statusType!: string
  _value!: number
  _maxValue!: number
  _targetValue!: number
  _targetMaxValue!: number
  _duration!: number
  _flashingCount!: number

  constructor() {
    super()
    this.initMembers()
    this.createBitmap()
  }

  initMembers(): void {
    this._battler = null
    this._statusType = ''
    this._value = Number.NaN
    this._maxValue = Number.NaN
    this._targetValue = Number.NaN
    this._targetMaxValue = Number.NaN
    this._duration = 0
    this._flashingCount = 0
  }

  destroy(options?: PIXI.IDestroyOptions): void {
    this.bitmap?.destroy()
    super.destroy(options)
  }

  createBitmap(): void {
    const width = this.bitmapWidth()
    const height = this.bitmapHeight()
    this.bitmap = new Bitmap(width, height)
  }

  bitmapWidth(): number {
    return 128
  }

  bitmapHeight(): number {
    return 32
  }

  textHeight(): number {
    return 24
  }

  gaugeHeight(): number {
    return 12
  }

  gaugeX(): number {
    if (this._statusType === 'time') {
      return 0
    }
    else {
      return this.measureLabelWidth() + 6
    }
  }

  labelY(): number {
    return 3
  }

  labelFontFace(): string {
    return GlobalMananger.$gameSystem.mainFontFace()
  }

  labelFontSize(): number {
    return GlobalMananger.$gameSystem.mainFontSize() - 2
  }

  valueFontFace(): string {
    return GlobalMananger.$gameSystem.numberFontFace()
  }

  valueFontSize(): number {
    return GlobalMananger.$gameSystem.mainFontSize() - 6
  }

  setup(battler: Game_Battler, statusType: Sprite_Gauge.StatusType): void {
    this._battler = battler
    this._statusType = statusType
    this._value = this.currentValue()
    this._maxValue = this.currentMaxValue()
    this.updateBitmap()
  }

  update(): void {
    super.update()
    this.updateBitmap()
  }

  updateBitmap(): void {
    const value = this.currentValue()
    const maxValue = this.currentMaxValue()
    if (value !== this._targetValue || maxValue !== this._targetMaxValue) {
      this.updateTargetValue(value, maxValue)
    }
    this.updateGaugeAnimation()
    this.updateFlashing()
  }

  updateTargetValue(value: number, maxValue: number): void {
    this._targetValue = value
    this._targetMaxValue = maxValue
    if (Number.isNaN(this._value)) {
      this._value = value
      this._maxValue = maxValue
      this.redraw()
    }
    else {
      this._duration = this.smoothness()
    }
  }

  smoothness(): number {
    return this._statusType === 'time' ? 5 : 20
  }

  updateGaugeAnimation(): void {
    if (this._duration > 0) {
      const d = this._duration
      this._value = (this._value * (d - 1) + this._targetValue) / d
      this._maxValue = (this._maxValue * (d - 1) + this._targetMaxValue) / d
      this._duration--
      this.redraw()
    }
  }

  updateFlashing(): void {
    if (this._statusType === 'time') {
      this._flashingCount++
      if (this._battler?.isInputting()) {
        if (this._flashingCount % 30 < 15) {
          this.setBlendColor(this.flashingColor1())
        }
        else {
          this.setBlendColor(this.flashingColor2())
        }
      }
      else {
        this.setBlendColor([0, 0, 0, 0])
      }
    }
  }

  flashingColor1(): RGBA {
    return [255, 255, 255, 64]
  }

  flashingColor2(): RGBA {
    return [0, 0, 255, 48]
  }

  isValid(): boolean {
    if (this._battler) {
      if (this._statusType === 'tp' && !this._battler.isPreserveTp()) {
        return GlobalMananger.$gameParty.inBattle()
      }
      else {
        return true
      }
    }
    return false
  }

  currentValue(): number {
    if (this._battler) {
      switch (this._statusType) {
        case 'hp':
          return this._battler.hp
        case 'mp':
          return this._battler.mp
        case 'tp':
          return this._battler.tp
        case 'time':
          return this._battler.tpbChargeTime()
      }
    }
    return Number.NaN
  }

  currentMaxValue(): number {
    if (this._battler) {
      switch (this._statusType) {
        case 'hp':
          return this._battler.mhp
        case 'mp':
          return this._battler.mmp
        case 'tp':
          return this._battler.maxTp()
        case 'time':
          return 1
      }
    }
    return Number.NaN
  }

  label(): string {
    switch (this._statusType) {
      case 'hp':
        return TextManager.hpA
      case 'mp':
        return TextManager.mpA
      case 'tp':
        return TextManager.tpA
      default:
        return ''
    }
  }

  gaugeBackColor(): string {
    return ColorManager.gaugeBackColor()
  }

  gaugeColor1(): string {
    switch (this._statusType) {
      case 'hp':
        return ColorManager.hpGaugeColor1()
      case 'mp':
        return ColorManager.mpGaugeColor1()
      case 'tp':
        return ColorManager.tpGaugeColor1()
      case 'time':
        return ColorManager.ctGaugeColor1()
      default:
        return ColorManager.normalColor()
    }
  }

  gaugeColor2(): string {
    switch (this._statusType) {
      case 'hp':
        return ColorManager.hpGaugeColor2()
      case 'mp':
        return ColorManager.mpGaugeColor2()
      case 'tp':
        return ColorManager.tpGaugeColor2()
      case 'time':
        return ColorManager.ctGaugeColor2()
      default:
        return ColorManager.normalColor()
    }
  }

  labelColor(): string {
    return ColorManager.systemColor()
  }

  labelOutlineColor(): string {
    return ColorManager.outlineColor()
  }

  labelOutlineWidth(): number {
    return 3
  }

  valueColor(): string {
    switch (this._statusType) {
      case 'hp':
        return ColorManager.hpColor(this._battler)
      case 'mp':
        return ColorManager.mpColor(this._battler)
      case 'tp':
        return ColorManager.tpColor(this._battler)
      default:
        return ColorManager.normalColor()
    }
  }

  valueOutlineColor(): string {
    return 'rgba(0, 0, 0, 1)'
  }

  valueOutlineWidth(): number {
    return 2
  }

  redraw(): void {
    this.bitmap?.clear()
    const currentValue = this.currentValue()
    if (!Number.isNaN(currentValue)) {
      this.drawGauge()
      if (this._statusType !== 'time') {
        this.drawLabel()
        if (this.isValid()) {
          this.drawValue()
        }
      }
    }
  }

  drawGauge(): void {
    const gaugeX = this.gaugeX()
    const gaugeY = this.textHeight() - this.gaugeHeight()
    const gaugewidth = this.bitmapWidth() - gaugeX
    const gaugeHeight = this.gaugeHeight()
    this.drawGaugeRect(gaugeX, gaugeY, gaugewidth, gaugeHeight)
  }

  drawGaugeRect(x: number, y: number, width: number, height: number): void {
    const rate = this.gaugeRate()
    const fillW = Math.floor((width - 2) * rate)
    const fillH = height - 2
    const color0 = this.gaugeBackColor()
    const color1 = this.gaugeColor1()
    const color2 = this.gaugeColor2()
    this.bitmap!.fillRect(x, y, width, height, color0)
    this.bitmap!.gradientFillRect(x + 1, y + 1, fillW, fillH, color1, color2)
  }

  gaugeRate(): number {
    if (this.isValid()) {
      const value = this._value
      const maxValue = this._maxValue
      return maxValue > 0 ? value / maxValue : 0
    }
    else {
      return 0
    }
  }

  drawLabel(): void {
    const label = this.label()
    const x = this.labelOutlineWidth() / 2
    const y = this.labelY()
    const width = this.bitmapWidth()
    const height = this.textHeight()
    this.setupLabelFont()
    this.bitmap!.paintOpacity = this.labelOpacity()
    this.bitmap!.drawText(label, x, y, width, height, 'left')
    this.bitmap!.paintOpacity = 255
  }

  setupLabelFont(): void {
    this.bitmap!.fontFace = this.labelFontFace()
    this.bitmap!.fontSize = this.labelFontSize()
    this.bitmap!.textColor = this.labelColor()
    this.bitmap!.outlineColor = this.labelOutlineColor()
    this.bitmap!.outlineWidth = this.labelOutlineWidth()
  }

  measureLabelWidth(): number {
    this.setupLabelFont()
    const labels = [TextManager.hpA, TextManager.mpA, TextManager.tpA]
    const widths = labels.map(str => this.bitmap!.measureTextWidth(str))
    return Math.ceil(Math.max(...widths))
  }

  labelOpacity(): number {
    return this.isValid() ? 255 : 160
  }

  drawValue(): void {
    const currentValue = this.currentValue()
    const width = this.bitmapWidth()
    const height = this.textHeight()
    this.setupValueFont()
    this.bitmap!.drawText(currentValue.toString(), 0, 0, width, height, 'right')
  }

  setupValueFont(): void {
    this.bitmap!.fontFace = this.valueFontFace()
    this.bitmap!.fontSize = this.valueFontSize()
    this.bitmap!.textColor = this.valueColor()
    this.bitmap!.outlineColor = this.valueOutlineColor()
    this.bitmap!.outlineWidth = this.valueOutlineWidth()
  }
}

export namespace Sprite_Gauge {
  export type StatusType = 'hp' | 'mp' | 'tp' | 'time' | ''
}
