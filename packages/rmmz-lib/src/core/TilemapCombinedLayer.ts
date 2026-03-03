import * as PIXI from 'pixi.js'
import { TilemapLayer } from './TilemapLayer'

/**
 * Internal class for the tilemap combined layer.
 *
 * @class
 * @extends PIXI.Container
 */
export class TilemapCombinedLayer extends PIXI.Container<TilemapLayer> {

  constructor() {
    super();
    for (let i = 0; i < 2; i++) {
      this.addChild(new TilemapLayer());
    }
  }

  destroy(options = { children: true, texture: true }) {
    super.destroy(options);
  }

  setBitmaps(bitmaps) {
    for (const child of this.children) {
      child.setBitmaps(bitmaps);
    }
  }

  clear() {
    for (const child of this.children) {
      child.clear();
    }
  }

  size() {
    return this.children.reduce((r, child) => r + child.size(), 0);
  }

  // prettier-ignore
  addRect(setNumber, sx, sy, dx, dy, w, h) {
    for (const child of this.children) {
      if (child.size() < TilemapLayer.MAX_SIZE) {
        child.addRect(setNumber, sx, sy, dx, dy, w, h);
        break;
      }
    }
  }

  isReady() {
    return this.children.every((child) => child.isReady());
  }
}
