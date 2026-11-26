import type { DestroyOptions } from 'pixi.js'
import { Scene_Map, Spriteset_Base, Spriteset_Map } from 'rmmz-next'
import { Spriteset_Hd2d } from '../sprites/Spriteset_Hd2d'

interface Hd2dSpritesetMap extends Spriteset_Map {
  _hd2d?: Spriteset_Hd2d
}

export function installSceneMapPatch(): void {
  Spriteset_Map.prototype.createLowerLayer = function (this: Hd2dSpritesetMap): void {
    // Skip 2D parallax, tilemap, character sprites, airship shadow, and destination marker.
    Spriteset_Base.prototype.createLowerLayer.call(this)
    this._characterSprites = []
    this._effectsContainer = this._baseSprite as unknown as Spriteset_Map['_effectsContainer']
    this._hd2d = new Spriteset_Hd2d()
    this._baseSprite.addChild(this._hd2d)
    this.createWeather()
  }

  Spriteset_Map.prototype.update = function (this: Hd2dSpritesetMap): void {
    Spriteset_Base.prototype.update.call(this)
    this._hd2d?.update()
    this.updateWeather()
  }

  const originalDestroy = Spriteset_Map.prototype.destroy
  Spriteset_Map.prototype.destroy = function (this: Hd2dSpritesetMap, options: DestroyOptions): void {
    this._hd2d?.destroy({ children: true })
    this._hd2d = undefined
    originalDestroy.call(this, options)
  }

  const originalIsReady = Scene_Map.prototype.isReady
  Scene_Map.prototype.isReady = function (this: Scene_Map): boolean {
    if (!originalIsReady.call(this))
      return false
    const spriteset = this._spriteset as Hd2dSpritesetMap | undefined
    return spriteset?._hd2d ? spriteset._hd2d.isReady() : true
  }
}
