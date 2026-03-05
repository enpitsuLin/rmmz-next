import type { RGBA } from '../types'
import * as PIXI from 'pixi.js'
import fragment from './ColorFilter.frag'

/**
 * The color filter for WebGL.
 *
 * @class
 * @extends PIXI.Filter
 */
export class ColorFilter extends PIXI.Filter {
  constructor() {
    const _fragmentSrc = ColorFilter.prototype._fragmentSrc()
    super(undefined, _fragmentSrc)
    this.uniforms.hue = 0
    this.uniforms.colorTone = [0, 0, 0, 0]
    this.uniforms.blendColor = [0, 0, 0, 0]
    this.uniforms.brightness = 255
  }

  /**
   * Sets the hue rotation value.
   *
   * @param {number} hue - The hue value (-360, 360).
   */
  setHue(hue: number): void {
    this.uniforms.hue = Number(hue)
  }

  /**
   * Sets the color tone.
   *
   * @param {Array} tone - The color tone [r, g, b, gray].
   */
  setColorTone(tone: RGBA): void {
    if (!(Array.isArray(tone))) {
      throw new TypeError('Argument must be an array')
    }
    this.uniforms.colorTone = tone.clone()
  }

  /**
   * Sets the blend color.
   *
   * @param {Array} color - The blend color [r, g, b, a].
   */
  setBlendColor(color: RGBA): void {
    if (!(Array.isArray(color))) {
      throw new TypeError('Argument must be an array')
    }
    this.uniforms.blendColor = color.clone()
  }

  /**
   * Sets the brightness.
   *
   * @param {number} brightness - The brightness (0 to 255).
   */
  setBrightness(brightness: number): void {
    this.uniforms.brightness = Number(brightness)
  }

  _fragmentSrc(): string {
    return fragment
  }
}
