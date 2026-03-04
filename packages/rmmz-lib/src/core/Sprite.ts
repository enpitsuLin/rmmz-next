import * as PIXI from 'pixi.js'
import type { Bitmap } from './Bitmap'
import { ColorFilter } from './ColorFilter'
import { Rectangle } from './Rectangle'
import type { RGBA } from '../types'

/**
 * The basic object that is rendered to the game screen.
 *
 * @class
 * @extends PIXI.Sprite
 * @param {Bitmap} bitmap - The image for the sprite.
 */
export class Sprite extends PIXI.Sprite {

  spriteId!: number
  _bitmap: Bitmap | null = null
  _frame!: Rectangle
  _hue: number
  _blendColor: RGBA
  _colorTone: RGBA
  _colorFilter: ColorFilter | null = null
  _blendMode: number
  _hidden: boolean
  _refreshFrame!: boolean

  static _emptyBaseTexture: PIXI.BaseTexture | null = null
  static _counter: number = 0

  constructor(bitmap?: Bitmap | null) {
    super();

    if (!Sprite._emptyBaseTexture) {
      Sprite._emptyBaseTexture = new PIXI.BaseTexture();
      Sprite._emptyBaseTexture.setSize(1, 1);
    }

    const frame = new Rectangle();
    const texture = new PIXI.Texture(Sprite._emptyBaseTexture, frame);
    this.texture = texture;
    this.spriteId = Sprite._counter++;
    this._bitmap = bitmap ?? null;
    this._frame = frame;
    this._hue = 0;
    this._blendColor = [0, 0, 0, 0];
    this._colorTone = [0, 0, 0, 0];
    this._colorFilter = null;
    this._blendMode = PIXI.BLEND_MODES.NORMAL;
    this._hidden = false;
    this._onBitmapChange();
  }

  get bitmap(): Bitmap | null {
    return this._bitmap;
  }

  set bitmap(value: Bitmap | null) {
    if (this._bitmap !== value) {
      this._bitmap = value;
      this._onBitmapChange();
    }
  }

  get width(): number {
    return this._frame.width;
  }

  set width(value: number) {
    this._frame.width = value;
    this._refresh();
  }

  get height(): number {
    return this._frame.height;
  }

  set height(value: number) {
    this._frame.height = value;
    this._refresh();
  }

  get opacity(): number {
    return this.alpha * 255;
  }

  set opacity(value: number) {
    this.alpha = value.clamp(0, 255) / 255;
  }

  // PIXI.Sprite has blendMode as property; we override with accessor for ColorFilter sync
  // @ts-expect-error - overriding parent property with accessor is intentional
  get blendMode(): number {
    if (this._colorFilter) {
      return this._colorFilter.blendMode;
    } else {
      return this._blendMode;
    }
  }

  set blendMode(value: number) {
    this._blendMode = value;
    if (this._colorFilter) {
      this._colorFilter.blendMode = value;
    }
  }

  destroy(): void {
    const options: PIXI.IDestroyOptions = { children: true, texture: true };
    super.destroy(options);
  }

  // @ts-expect-error DisplayObject from "@pixi/display" use Omit cause ts(2425), ignore that
  update(): void {
    for (const child of this.children) {
      if (child.update) {
        child.update();
      }
    }
  }

  hide(): void {
    this._hidden = true;
    this.updateVisibility();
  }

  show(): void {
    this._hidden = false;
    this.updateVisibility();
  }

  updateVisibility(): void {
    this.visible = !this._hidden;
  }

  move(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  setFrame(x: number, y: number, width: number, height: number): void {
    this._refreshFrame = false;
    const frame = this._frame;
    if (
      x !== frame.x ||
      y !== frame.y ||
      width !== frame.width ||
      height !== frame.height
    ) {
      frame.x = x;
      frame.y = y;
      frame.width = width;
      frame.height = height;
      this._refresh();
    }
  }

  setHue(hue: number): void {
    if (this._hue !== Number(hue)) {
      this._hue = Number(hue);
      this._updateColorFilter();
    }
  }

  getBlendColor(): RGBA {
    return this._blendColor.clone() as RGBA;
  }

  setBlendColor(color: RGBA): void {
    if (!(color instanceof Array)) {
      throw new Error("Argument must be an array");
    }
    if (!this._blendColor.equals(color)) {
      this._blendColor = color.clone() as RGBA;
      this._updateColorFilter();
    }
  }

  getColorTone(): RGBA {
    return this._colorTone.clone() as RGBA;
  }

  setColorTone(tone: RGBA): void {
    if (!(tone instanceof Array)) {
      throw new Error("Argument must be an array");
    }
    if (!this._colorTone.equals(tone)) {
      this._colorTone = tone.clone() as RGBA;
      this._updateColorFilter();
    }
  }

  _onBitmapChange(): void {
    if (this._bitmap) {
      this._refreshFrame = true;
      this._bitmap.addLoadListener(this._onBitmapLoad.bind(this));
    } else {
      this._refreshFrame = false;
      this.texture.frame = new Rectangle();
    }
  }

  _onBitmapLoad(bitmapLoaded: Bitmap): void {
    if (bitmapLoaded === this._bitmap) {
      if (this._refreshFrame && this._bitmap) {
        this._refreshFrame = false;
        this._frame.width = this._bitmap.width;
        this._frame.height = this._bitmap.height;
      }
    }
    this._refresh();
  }

  _refresh(): void {
    const texture = this.texture;
    const frameX = Math.floor(this._frame.x);
    const frameY = Math.floor(this._frame.y);
    const frameW = Math.floor(this._frame.width);
    const frameH = Math.floor(this._frame.height);
    const baseTexture = this._bitmap ? this._bitmap.baseTexture : null;
    const baseTextureW = baseTexture ? baseTexture.width : 0;
    const baseTextureH = baseTexture ? baseTexture.height : 0;
    const realX = frameX.clamp(0, baseTextureW);
    const realY = frameY.clamp(0, baseTextureH);
    const realW = (frameW - realX + frameX).clamp(0, baseTextureW - realX);
    const realH = (frameH - realY + frameY).clamp(0, baseTextureH - realY);
    const frame = new Rectangle(realX, realY, realW, realH);
    if (texture) {
      this.pivot.x = frameX - realX;
      this.pivot.y = frameY - realY;
      if (baseTexture) {
        texture.baseTexture = baseTexture;
        try {
          texture.frame = frame;
        } catch (e) {
          texture.frame = new Rectangle();
        }
      }
      texture._updateID++;
    }
  }

  _createColorFilter(): void {
    this._colorFilter = new ColorFilter();
    if (!this.filters) {
      this.filters = [];
    }
    this.filters.push(this._colorFilter);
  }

  _updateColorFilter(): void {
    if (!this._colorFilter) {
      this._createColorFilter();
    }
    const filter = this._colorFilter!;
    filter.setHue(this._hue);
    // ColorFilter expects tuple types; RGBA is compatible at runtime
    filter.setBlendColor(this._blendColor);
    filter.setColorTone(this._colorTone);
  }
}
