import { PIXI } from '../pixi'

/**
 * The root object of the display tree.
 *
 * @class
 * @extends PIXI.Container
 */
export class Stage extends PIXI.Container {
  constructor() {
    super()
  }

  /**
   * Destroys the stage.
   */
  destroy(): void {
    const options = { children: true, texture: true }
    super.destroy(options)
  }
}
