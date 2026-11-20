import type * as PIXI from 'pixi.js'
import type { MZ } from '../../database-types'
import type { Game_Character } from '../objects/Game_Character'
import { GlobalMananger } from '../managers/GlobalManager'
import { ImageManager } from '../managers/ImageManager'
import { Graphics, Sprite, Tilemap, TilingSprite, Weather } from '../primitives'
import { Sprite_Balloon } from './Sprite_Balloon'
import { Sprite_Character } from './Sprite_Character'
import { Sprite_Destination } from './Sprite_Destination'
import { Spriteset_Base } from './Spriteset_Base'

/**
 * Spriteset_Map
 *
 * The set of sprites on the map screen.
 */
export class Spriteset_Map extends Spriteset_Base<Game_Character> {
  _balloonSprites: Sprite_Balloon[]
  _characterSprites!: Sprite_Character[]
  _parallax!: TilingSprite
  _tilemap!: Tilemap
  _effectsContainer!: Tilemap
  _tileset!: MZ.Tileset | null
  _shadowSprite!: Sprite
  _destinationSprite!: Sprite_Destination
  _weather!: Weather
  _parallaxName!: string

  constructor() {
    super()
    this._balloonSprites = []
  }

  destroy(options: PIXI.IDestroyOptions): void {
    this.removeAllBalloons()
    super.destroy(options)
  }

  loadSystemImages(): void {
    super.loadSystemImages()
    ImageManager.loadSystem('Balloon')
    ImageManager.loadSystem('Shadow1')
  }

  createLowerLayer(): void {
    super.createLowerLayer()
    this.createParallax()
    this.createTilemap()
    this.createCharacters()
    this.createShadow()
    this.createDestination()
    this.createWeather()
  }

  update(): void {
    super.update()
    this.updateTileset()
    this.updateParallax()
    this.updateTilemap()
    this.updateShadow()
    this.updateWeather()
    this.updateAnimations()
    this.updateBalloons()
  }

  hideCharacters(): void {
    for (const sprite of this._characterSprites) {
      if (!sprite.isTile() && !sprite.isObjectCharacter()) {
        sprite.hide()
      }
    }
  }

  createParallax(): void {
    this._parallax = new TilingSprite()
    this._parallax.move(0, 0, Graphics.width, Graphics.height)
    this._baseSprite.addChild(this._parallax)
  }

  createTilemap(): void {
    const tilemap = new Tilemap()
    tilemap.tileWidth = GlobalMananger.$gameMap.tileWidth()
    tilemap.tileHeight = GlobalMananger.$gameMap.tileHeight()
    tilemap.setData(GlobalMananger.$gameMap.width(), GlobalMananger.$gameMap.height(), GlobalMananger.$gameMap.data())
    tilemap.horizontalWrap = GlobalMananger.$gameMap.isLoopHorizontal()
    tilemap.verticalWrap = GlobalMananger.$gameMap.isLoopVertical()
    this._baseSprite.addChild(tilemap)
    this._effectsContainer = tilemap
    this._tilemap = tilemap
    this.loadTileset()
  }

  loadTileset(): void {
    this._tileset = GlobalMananger.$gameMap.tileset()
    if (this._tileset) {
      const bitmaps = []
      const tilesetNames = this._tileset.tilesetNames
      for (const name of tilesetNames) {
        bitmaps.push(ImageManager.loadTileset(name))
      }
      this._tilemap.setBitmaps(bitmaps)
      this._tilemap.flags = GlobalMananger.$gameMap.tilesetFlags()
    }
  }

  createCharacters(): void {
    this._characterSprites = []
    for (const event of GlobalMananger.$gameMap.events()) {
      this._characterSprites.push(new Sprite_Character(event))
    }
    for (const vehicle of GlobalMananger.$gameMap.vehicles()) {
      this._characterSprites.push(new Sprite_Character(vehicle))
    }
    for (const follower of GlobalMananger.$gamePlayer.followers().reverseData()) {
      this._characterSprites.push(new Sprite_Character(follower))
    }
    this._characterSprites.push(new Sprite_Character(GlobalMananger.$gamePlayer))
    for (const sprite of this._characterSprites) {
      this._tilemap.addChild(sprite)
    }
  }

  createShadow(): void {
    this._shadowSprite = new Sprite()
    this._shadowSprite.bitmap = ImageManager.loadSystem('Shadow1')
    this._shadowSprite.anchor.x = 0.5
    this._shadowSprite.anchor.y = 1
    this._shadowSprite.z = 6
    this._tilemap.addChild(this._shadowSprite)
  }

  createDestination(): void {
    this._destinationSprite = new Sprite_Destination()
    this._destinationSprite.z = 9
    this._tilemap.addChild(this._destinationSprite)
  }

  createWeather(): void {
    this._weather = new Weather()
    this.addChild(this._weather)
  }

  updateTileset(): void {
    if (this._tileset !== GlobalMananger.$gameMap.tileset()) {
      this.loadTileset()
    }
  }

  updateParallax(): void {
    if (this._parallaxName !== GlobalMananger.$gameMap.parallaxName()) {
      this._parallaxName = GlobalMananger.$gameMap.parallaxName()
      this._parallax.bitmap = ImageManager.loadParallax(this._parallaxName)
    }
    if (this._parallax.bitmap) {
      const bitmap = this._parallax.bitmap
      this._parallax.origin.x = GlobalMananger.$gameMap.parallaxOx() % bitmap.width
      this._parallax.origin.y = GlobalMananger.$gameMap.parallaxOy() % bitmap.height
    }
  }

  updateTilemap(): void {
    this._tilemap.origin.x = GlobalMananger.$gameMap.displayX() * GlobalMananger.$gameMap.tileWidth()
    this._tilemap.origin.y = GlobalMananger.$gameMap.displayY() * GlobalMananger.$gameMap.tileHeight()
  }

  updateShadow(): void {
    const airship = GlobalMananger.$gameMap.airship()
    this._shadowSprite.x = airship.shadowX()
    this._shadowSprite.y = airship.shadowY()
    this._shadowSprite.opacity = airship.shadowOpacity()
  }

  updateWeather(): void {
    this._weather.type = GlobalMananger.$gameScreen.weatherType() as Weather.WeatherType
    this._weather.power = GlobalMananger.$gameScreen.weatherPower()
    this._weather.origin.x = GlobalMananger.$gameMap.displayX() * GlobalMananger.$gameMap.tileWidth()
    this._weather.origin.y = GlobalMananger.$gameMap.displayY() * GlobalMananger.$gameMap.tileHeight()
  }

  updateBalloons(): void {
    for (const sprite of this._balloonSprites) {
      if (!sprite.isPlaying()) {
        this.removeBalloon(sprite)
      }
    }
    this.processBalloonRequests()
  }

  processBalloonRequests(): void {
    for (; ;) {
      const request = GlobalMananger.$gameTemp.retrieveBalloon()
      if (request) {
        this.createBalloon(request)
      }
      else {
        break
      }
    }
  }

  createBalloon(request: Sprite_Balloon.BalloonRequest): void {
    const targetSprite = this.findTargetSprite(request.target)
    if (targetSprite) {
      const sprite = new Sprite_Balloon()
      sprite.targetObject = request.target
      sprite.setup(targetSprite, request.balloonId)
      this._effectsContainer.addChild(sprite)
      this._balloonSprites.push(sprite)
    }
  }

  removeBalloon(sprite: Sprite_Balloon): void {
    this._balloonSprites.remove(sprite)
    this._effectsContainer.removeChild(sprite)
    if (sprite.targetObject?.endBalloon) {
      sprite.targetObject.endBalloon()
    }
    sprite.destroy()
  }

  removeAllBalloons(): void {
    for (const sprite of this._balloonSprites.clone()) {
      this.removeBalloon(sprite)
    }
  }

  findTargetSprite(target: Game_Character): Sprite_Character | undefined {
    return this._characterSprites.find(sprite => sprite.checkCharacter(target))
  }

  animationBaseDelay(): number {
    return 0
  }
}
