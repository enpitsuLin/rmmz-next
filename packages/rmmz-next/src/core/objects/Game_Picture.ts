import type { RGBA } from '../types/utils'

/**
 * The game object class for a picture.
 */
class Game_Picture {
  _name!: string

  _origin!: number
  _x!: number
  _y!: number
  _scaleX!: number
  _scaleY!: number
  _opacity!: number
  _blendMode!: number

  _targetX!: number
  _targetY!: number
  _targetScaleX!: number
  _targetScaleY!: number
  _targetOpacity!: number
  _duration!: number
  _wholeDuration!: number
  _easingType!: number
  _easingExponent!: number

  _tone!: RGBA | null
  _toneTarget!: RGBA | null
  _toneDuration!: number

  _angle!: number
  _rotationSpeed!: number

  constructor() {
    this.initialize()
  }

  initialize(): void {
    this.initBasic()
    this.initTarget()
    this.initTone()
    this.initRotation()
  }

  name(): string {
    return this._name
  }

  origin(): number {
    return this._origin
  }

  x(): number {
    return this._x
  }

  y(): number {
    return this._y
  }

  scaleX(): number {
    return this._scaleX
  }

  scaleY(): number {
    return this._scaleY
  }

  opacity(): number {
    return this._opacity
  }

  blendMode(): number {
    return this._blendMode
  }

  tone(): RGBA | null {
    return this._tone
  }

  angle(): number {
    return this._angle
  }

  initBasic(): void {
    this._name = ''
    this._origin = 0
    this._x = 0
    this._y = 0
    this._scaleX = 100
    this._scaleY = 100
    this._opacity = 255
    this._blendMode = 0
  }

  initTarget(): void {
    this._targetX = this._x
    this._targetY = this._y
    this._targetScaleX = this._scaleX
    this._targetScaleY = this._scaleY
    this._targetOpacity = this._opacity
    this._duration = 0
    this._wholeDuration = 0
    this._easingType = 0
    this._easingExponent = 0
  }

  initTone(): void {
    this._tone = null
    this._toneTarget = null
    this._toneDuration = 0
  }

  initRotation(): void {
    this._angle = 0
    this._rotationSpeed = 0
  }

  show(
    name: string,
    origin: number,
    x: number,
    y: number,
    scaleX: number,
    scaleY: number,
    opacity: number,
    blendMode: number,
  ): void {
    this._name = name
    this._origin = origin
    this._x = x
    this._y = y
    this._scaleX = scaleX
    this._scaleY = scaleY
    this._opacity = opacity
    this._blendMode = blendMode
    this.initTarget()
    this.initTone()
    this.initRotation()
  }

  move(
    origin: number,
    x: number,
    y: number,
    scaleX: number,
    scaleY: number,
    opacity: number,
    blendMode: number,
    duration: number,
    easingType: number,
  ): void {
    this._origin = origin
    this._targetX = x
    this._targetY = y
    this._targetScaleX = scaleX
    this._targetScaleY = scaleY
    this._targetOpacity = opacity
    this._blendMode = blendMode
    this._duration = duration
    this._wholeDuration = duration
    this._easingType = easingType
    this._easingExponent = 2
  }

  rotate(speed: number): void {
    this._rotationSpeed = speed
  }

  tint(tone: RGBA, duration: number): void {
    if (!this._tone) {
      this._tone = [0, 0, 0, 0]
    }
    this._toneTarget = tone.clone() as RGBA
    this._toneDuration = duration
    if (this._toneDuration === 0) {
      this._tone = this._toneTarget.clone() as RGBA
    }
  }

  update(): void {
    this.updateMove()
    this.updateTone()
    this.updateRotation()
  }

  updateMove(): void {
    if (this._duration > 0) {
      this._x = this.applyEasing(this._x, this._targetX)
      this._y = this.applyEasing(this._y, this._targetY)
      this._scaleX = this.applyEasing(this._scaleX, this._targetScaleX)
      this._scaleY = this.applyEasing(this._scaleY, this._targetScaleY)
      this._opacity = this.applyEasing(this._opacity, this._targetOpacity)
      this._duration--
    }
  }

  updateTone(): void {
    if (this._toneDuration > 0) {
      const d = this._toneDuration
      for (let i = 0; i < 4; i++) {
        this._tone![i] = (this._tone![i] * (d - 1) + this._toneTarget![i]) / d
      }
      this._toneDuration--
    }
  }

  updateRotation(): void {
    if (this._rotationSpeed !== 0) {
      this._angle += this._rotationSpeed / 2
    }
  }

  applyEasing(current: number, target: number): number {
    const d = this._duration
    const wd = this._wholeDuration
    const lt = this.calcEasing((wd - d) / wd)
    const t = this.calcEasing((wd - d + 1) / wd)
    const start = (current - target * lt) / (1 - lt)
    return start + (target - start) * t
  }

  calcEasing(t: number): number {
    const exponent = this._easingExponent
    switch (this._easingType) {
      case 1: // Slow start
        return this.easeIn(t, exponent)
      case 2: // Slow end
        return this.easeOut(t, exponent)
      case 3: // Slow start and end
        return this.easeInOut(t, exponent)
      default:
        return t
    }
  }

  easeIn(t: number, exponent: number): number {
    return t ** exponent
  }

  easeOut(t: number, exponent: number): number {
    return 1 - (1 - t) ** exponent
  }

  easeInOut(t: number, exponent: number): number {
    if (t < 0.5) {
      return this.easeIn(t * 2, exponent) / 2
    }
    else {
      return this.easeOut(t * 2 - 1, exponent) / 2 + 0.5
    }
  }
}

export { Game_Picture }
