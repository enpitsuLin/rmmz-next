import type * as PIXI from 'pixi.js'
import type { MV, MZ } from '../../database-types'
import type { Game_Battler, Game_Character, Game_Temp } from '../objects'
import type { Tilemap } from '../primitives'
import { GlobalMananger } from '../managers'
import { ColorFilter, Graphics, Rectangle, ScreenSprite, Sprite } from '../primitives'
import { Sprite_Animation } from './Sprite_Animation'
import { Sprite_AnimationMV } from './Sprite_AnimationMV'
import { Sprite_Picture } from './Sprite_Picture'
import { Sprite_Timer } from './Sprite_Timer'

/**
 * Spriteset_Base
 *
 * The superclass of Spriteset_Map and Spriteset_Battle.
 */
export abstract class Spriteset_Base<
  Target extends Game_Battler | Game_Character,
> extends Sprite {
  _animationSprites: (Sprite_Animation | Sprite_AnimationMV)[]
  _baseSprite!: Sprite
  _blackScreen!: ScreenSprite
  _baseColorFilter!: ColorFilter
  _pictureContainer!: Sprite
  _timerSprite!: Sprite_Timer
  _overallColorFilter!: ColorFilter
  abstract _effectsContainer: Sprite | Tilemap

  constructor() {
    super()
    this.setFrame(0, 0, Graphics.width, Graphics.height)
    this.loadSystemImages()
    this.createLowerLayer()
    this.createUpperLayer()
    this._animationSprites = []
  }

  destroy(options: PIXI.IDestroyOptions): void {
    this.removeAllAnimations()
    super.destroy(options)
  }

  loadSystemImages(): void {
    //
  }

  createLowerLayer(): void {
    this.createBaseSprite()
    this.createBaseFilters()
  }

  createUpperLayer(): void {
    this.createPictures()
    this.createTimer()
    this.createOverallFilters()
  }

  update(): void {
    super.update()
    this.updateBaseFilters()
    this.updateOverallFilters()
    this.updatePosition()
    this.updateAnimations()
  }

  createBaseSprite(): void {
    this._baseSprite = new Sprite()
    this._blackScreen = new ScreenSprite()
    this._blackScreen.opacity = 255
    this.addChild(this._baseSprite)
    this._baseSprite.addChild(this._blackScreen)
  }

  createBaseFilters(): void {
    this._baseSprite.filters = []
    this._baseColorFilter = new ColorFilter()
    this._baseSprite.filters.push(this._baseColorFilter)
  }

  createPictures(): void {
    const rect = this.pictureContainerRect()
    this._pictureContainer = new Sprite()
    this._pictureContainer.setFrame(rect.x, rect.y, rect.width, rect.height)
    for (let i = 1; i <= GlobalMananger.$gameScreen.maxPictures(); i++) {
      this._pictureContainer.addChild(new Sprite_Picture(i))
    }
    this.addChild(this._pictureContainer)
  }

  pictureContainerRect(): Rectangle {
    return new Rectangle(0, 0, Graphics.width, Graphics.height)
  }

  createTimer(): void {
    this._timerSprite = new Sprite_Timer()
    this.addChild(this._timerSprite)
  }

  createOverallFilters(): void {
    this.filters = []
    this._overallColorFilter = new ColorFilter()
    this.filters.push(this._overallColorFilter)
  }

  updateBaseFilters(): void {
    const filter = this._baseColorFilter
    filter.setColorTone(GlobalMananger.$gameScreen.tone())
  }

  updateOverallFilters(): void {
    const filter = this._overallColorFilter
    filter.setBlendColor(GlobalMananger.$gameScreen.flashColor())
    filter.setBrightness(GlobalMananger.$gameScreen.brightness())
  }

  updatePosition(): void {
    const screen = GlobalMananger.$gameScreen
    const scale = screen.zoomScale()
    this.scale.x = scale
    this.scale.y = scale
    this.x = Math.round(-screen.zoomX() * (scale - 1))
    this.y = Math.round(-screen.zoomY() * (scale - 1))
    this.x += Math.round(screen.shake())
  }

  findTargetSprite(_target?: Target): Sprite | null | undefined {
    return null
  }

  updateAnimations(): void {
    for (const sprite of this._animationSprites) {
      if (!sprite.isPlaying()) {
        this.removeAnimation(sprite)
      }
    }
    this.processAnimationRequests()
  }

  processAnimationRequests(): void {
    for (; ;) {
      const request = GlobalMananger.$gameTemp.retrieveAnimation()
      if (request) {
        this.createAnimation(request)
      }
      else {
        break
      }
    }
  }

  createAnimation(request: Game_Temp.AnimationRequest): void {
    const animation = GlobalMananger.$dataAnimations[request.animationId]
    const targets = request.targets as Target[]
    const mirror = request.mirror
    let delay = this.animationBaseDelay()
    const nextDelay = this.animationNextDelay()
    if (this.isAnimationForEach(animation!)) {
      for (const target of targets) {
        this.createAnimationSprite([target], animation!, mirror, delay)
        delay += nextDelay
      }
    }
    else {
      this.createAnimationSprite(targets, animation!, mirror, delay)
    }
  }

  createAnimationSprite(
    targets: Target[],
    animation: MZ.Animation | MV.Animation,
    mirror: boolean,
    delay: number,
  ): void {
    const mv = this.isMVAnimation(animation)
    const sprite = new (mv ? Sprite_AnimationMV : Sprite_Animation)()
    const targetSprites = this.makeTargetSprites(targets)
    const baseDelay = this.animationBaseDelay()
    const previous = delay > baseDelay ? this.lastAnimationSprite() : null
    if (this.animationShouldMirror(targets[0])) {
      mirror = !mirror
    }
    // @ts-expect-error to fix
    sprite.targetObjects = targets
    if (mv)
      (sprite as Sprite_AnimationMV).setup(targetSprites, animation, mirror, delay)
    else
      (sprite as Sprite_Animation).setup(targetSprites, animation, mirror, delay, previous as Sprite_Animation)

    this._effectsContainer.addChild(sprite)
    this._animationSprites.push(sprite)
  }

  isMVAnimation(animation: MZ.Animation | MV.Animation): animation is MV.Animation {
    return !!(animation as MV.Animation).frames
  }

  makeTargetSprites(targets: Target[]): Sprite[] {
    const targetSprites = []
    for (const target of targets) {
      const targetSprite = this.findTargetSprite(target)
      if (targetSprite) {
        targetSprites.push(targetSprite)
      }
    }
    return targetSprites
  }

  lastAnimationSprite(): Sprite_Animation | Sprite_AnimationMV {
    return this._animationSprites[this._animationSprites.length - 1]
  }

  isAnimationForEach(animation: MZ.Animation): boolean {
    const mv = this.isMVAnimation(animation)
    return mv ? animation.position !== 3 : animation.displayType === 0
  }

  animationBaseDelay(): number {
    return 8
  }

  animationNextDelay(): number {
    return 12
  }

  animationShouldMirror(target: Target): boolean {
    return target && 'isActor' in target && target.isActor()
  }

  removeAnimation(sprite: Sprite_Animation | Sprite_AnimationMV): void {
    this._animationSprites.remove(sprite)
    this._effectsContainer.removeChild(sprite)
    // @ts-expect-error to fix this
    for (const target of sprite.targetObjects) {
      if (target.endAnimation) {
        target.endAnimation()
      }
    }
    sprite.destroy()
  }

  removeAllAnimations(): void {
    for (const sprite of this._animationSprites.clone()) {
      this.removeAnimation(sprite)
    }
  }

  isAnimationPlaying(): boolean {
    return this._animationSprites.length > 0
  }
}
