import { PIXI } from '../pixi'

/**
 * The rectangle class.
 */
export class Rectangle extends PIXI.Rectangle implements Rectangle.Shape {
  constructor(x?: number, y?: number, width?: number, height?: number) {
    super(x, y, width, height)
  }
}

export namespace Rectangle {
  /**
   * interface Shape of Rectangle
   */
  export interface Shape {
    x: number
    y: number
    width: number
    height: number
  }
}
