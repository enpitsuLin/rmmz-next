import { Graphics } from '../core'
import { GlobalMananger } from '../managers'
import { ImageManager } from '../managers/ImageManager'

/**
 * The superclass of Game_Character.
 *
 * It handles basic information, such as coordinates and images, shared by all characters.
 */
class Game_CharacterBase {
  _x!: number
  _y!: number
  _realX!: number
  _realY!: number
  _moveSpeed!: number
  _moveFrequency!: number
  _opacity!: number
  _blendMode!: number
  _direction!: Game_CharacterBase.CharacterDirection
  _pattern!: number
  _priorityType!: Game_CharacterBase.CharacterPriorityType
  _tileId!: number
  _characterName!: string
  _characterIndex!: number
  _isObjectCharacter!: boolean
  _walkAnime!: boolean
  _stepAnime!: boolean
  _directionFix!: boolean
  _through!: boolean
  _transparent!: boolean
  _bushDepth!: number
  _animationId!: number
  _balloonId!: number
  _animationPlaying!: boolean
  _balloonPlaying!: boolean
  _animationCount!: number
  _stopCount!: number
  _jumpCount!: number
  _jumpPeak!: number
  _movementSuccess!: boolean

  constructor() {
    this.initMembers()
  }

  initMembers(): void {
    this._x = 0
    this._y = 0
    this._realX = 0
    this._realY = 0
    this._moveSpeed = 4
    this._moveFrequency = 6
    this._opacity = 255
    this._blendMode = 0
    this._direction = 2
    this._pattern = 1
    this._priorityType = 1
    this._tileId = 0
    this._characterName = ''
    this._characterIndex = 0
    this._isObjectCharacter = false
    this._walkAnime = true
    this._stepAnime = false
    this._directionFix = false
    this._through = false
    this._transparent = false
    this._bushDepth = 0
    this._animationId = 0
    this._balloonId = 0
    this._animationPlaying = false
    this._balloonPlaying = false
    this._animationCount = 0
    this._stopCount = 0
    this._jumpCount = 0
    this._jumpPeak = 0
    this._movementSuccess = true
  }

  get x(): number {
    return this._x
  }

  get y(): number {
    return this._y
  }

  pos(x: number, y: number): boolean {
    return this._x === x && this._y === y
  }

  posNt(x: number, y: number): boolean {
    // No through
    return this.pos(x, y) && !this.isThrough()
  }

  moveSpeed(): number {
    return this._moveSpeed
  }

  setMoveSpeed(moveSpeed: number): void {
    this._moveSpeed = moveSpeed
  }

  moveFrequency(): number {
    return this._moveFrequency
  }

  setMoveFrequency(moveFrequency: number): void {
    this._moveFrequency = moveFrequency
  }

  opacity(): number {
    return this._opacity
  }

  setOpacity(opacity: number): void {
    this._opacity = opacity
  }

  blendMode(): number {
    return this._blendMode
  }

  setBlendMode(blendMode: number): void {
    this._blendMode = blendMode
  }

  isNormalPriority(): boolean {
    return this._priorityType === 1
  }

  setPriorityType(priorityType: Game_CharacterBase.CharacterPriorityType): void {
    this._priorityType = priorityType
  }

  isMoving(): boolean {
    return this._realX !== this._x || this._realY !== this._y
  }

  isJumping(): boolean {
    return this._jumpCount > 0
  }

  jumpHeight(): number {
    return (
      (this._jumpPeak * this._jumpPeak
        - Math.abs(this._jumpCount - this._jumpPeak) ** 2)
      / 2
    )
  }

  isStopping(): boolean {
    return !this.isMoving() && !this.isJumping()
  }

  checkStop(threshold: number): boolean {
    return this._stopCount > threshold
  }

  resetStopCount(): void {
    this._stopCount = 0
  }

  realMoveSpeed(): number {
    return this._moveSpeed + (this.isDashing() ? 1 : 0)
  }

  distancePerFrame(): number {
    return 2 ** this.realMoveSpeed() / 256
  }

  isDashing(): boolean {
    return false
  }

  isDebugThrough(): boolean {
    return false
  }

  straighten(): void {
    if (this.hasWalkAnime() || this.hasStepAnime()) {
      this._pattern = 1
    }
    this._animationCount = 0
  }

  reverseDir(d: Game_CharacterBase.CharacterDirection): Game_CharacterBase.CharacterDirection {
    return (10 - d) as Game_CharacterBase.CharacterDirection
  }

  canPass(x: number, y: number, d: number): boolean {
    const x2 = GlobalMananger.$gameMap.roundXWithDirection(x, d)
    const y2 = GlobalMananger.$gameMap.roundYWithDirection(y, d)
    if (!GlobalMananger.$gameMap.isValid(x2, y2)) {
      return false
    }
    if (this.isThrough() || this.isDebugThrough()) {
      return true
    }
    if (!this.isMapPassable(x, y, d)) {
      return false
    }
    if (this.isCollidedWithCharacters(x2, y2)) {
      return false
    }
    return true
  }

  canPassDiagonally(x: number, y: number, horz: number, vert: number): boolean {
    const x2 = GlobalMananger.$gameMap.roundXWithDirection(x, horz)
    const y2 = GlobalMananger.$gameMap.roundYWithDirection(y, vert)
    if (this.canPass(x, y, vert) && this.canPass(x, y2, horz)) {
      return true
    }
    if (this.canPass(x, y, horz) && this.canPass(x2, y, vert)) {
      return true
    }
    return false
  }

  isMapPassable(x: number, y: number, d: number): boolean {
    const x2 = GlobalMananger.$gameMap.roundXWithDirection(x, d)
    const y2 = GlobalMananger.$gameMap.roundYWithDirection(y, d)
    const d2 = this.reverseDir(d as Game_CharacterBase.CharacterDirection)
    return GlobalMananger.$gameMap.isPassable(x, y, d) && GlobalMananger.$gameMap.isPassable(x2, y2, d2)
  }

  isCollidedWithCharacters(x: number, y: number): boolean {
    return this.isCollidedWithEvents(x, y) || this.isCollidedWithVehicles(x, y)
  }

  isCollidedWithEvents(x: number, y: number): boolean {
    const events = GlobalMananger.$gameMap.eventsXyNt(x, y)
    return events.some(event => event.isNormalPriority())
  }

  isCollidedWithVehicles(x: number, y: number): boolean {
    return GlobalMananger.$gameMap.boat().posNt(x, y) || GlobalMananger.$gameMap.ship().posNt(x, y)
  }

  setPosition(x: number, y: number): void {
    this._x = Math.round(x)
    this._y = Math.round(y)
    this._realX = x
    this._realY = y
  }

  copyPosition(character: Game_CharacterBase): void {
    this._x = character._x
    this._y = character._y
    this._realX = character._realX
    this._realY = character._realY
    this._direction = character._direction
  }

  locate(x: number, y: number): void {
    this.setPosition(x, y)
    this.straighten()
    this.refreshBushDepth()
  }

  direction(): Game_CharacterBase.CharacterDirection {
    return this._direction
  }

  setDirection(d: number): void {
    if (!this.isDirectionFixed() && d) {
      this._direction = d as Game_CharacterBase.CharacterDirection
    }
    this.resetStopCount()
  }

  isTile(): boolean {
    return this._tileId > 0 && this._priorityType === 0
  }

  isObjectCharacter(): boolean {
    return this._isObjectCharacter
  }

  shiftY(): number {
    return this.isObjectCharacter() ? 0 : 6
  }

  scrolledX(): number {
    return GlobalMananger.$gameMap.adjustX(this._realX)
  }

  scrolledY(): number {
    return GlobalMananger.$gameMap.adjustY(this._realY)
  }

  screenX(): number {
    const tw = GlobalMananger.$gameMap.tileWidth()
    return Math.floor(this.scrolledX() * tw + tw / 2)
  }

  screenY(): number {
    const th = GlobalMananger.$gameMap.tileHeight()
    return Math.floor(
      this.scrolledY() * th + th - this.shiftY() - this.jumpHeight(),
    )
  }

  screenZ(): number {
    return this._priorityType * 2 + 1
  }

  isNearTheScreen(): boolean {
    const gw = Graphics.width
    const gh = Graphics.height
    const tw = GlobalMananger.$gameMap.tileWidth()
    const th = GlobalMananger.$gameMap.tileHeight()
    const px = this.scrolledX() * tw + tw / 2 - gw / 2
    const py = this.scrolledY() * th + th / 2 - gh / 2
    return px >= -gw && px <= gw && py >= -gh && py <= gh
  }

  update(): void {
    if (this.isStopping()) {
      this.updateStop()
    }
    if (this.isJumping()) {
      this.updateJump()
    }
    else if (this.isMoving()) {
      this.updateMove()
    }
    this.updateAnimation()
  }

  updateStop(): void {
    this._stopCount++
  }

  updateJump(): void {
    this._jumpCount--
    this._realX
      = (this._realX * this._jumpCount + this._x) / (this._jumpCount + 1.0)
    this._realY
      = (this._realY * this._jumpCount + this._y) / (this._jumpCount + 1.0)
    this.refreshBushDepth()
    if (this._jumpCount === 0) {
      this._realX = this._x = GlobalMananger.$gameMap.roundX(this._x)
      this._realY = this._y = GlobalMananger.$gameMap.roundY(this._y)
    }
  }

  updateMove(): void {
    if (this._x < this._realX) {
      this._realX = Math.max(this._realX - this.distancePerFrame(), this._x)
    }
    if (this._x > this._realX) {
      this._realX = Math.min(this._realX + this.distancePerFrame(), this._x)
    }
    if (this._y < this._realY) {
      this._realY = Math.max(this._realY - this.distancePerFrame(), this._y)
    }
    if (this._y > this._realY) {
      this._realY = Math.min(this._realY + this.distancePerFrame(), this._y)
    }
    if (!this.isMoving()) {
      this.refreshBushDepth()
    }
  }

  updateAnimation(): void {
    this.updateAnimationCount()
    if (this._animationCount >= this.animationWait()) {
      this.updatePattern()
      this._animationCount = 0
    }
  }

  animationWait(): number {
    return (9 - this.realMoveSpeed()) * 3
  }

  updateAnimationCount(): void {
    if (this.isMoving() && this.hasWalkAnime()) {
      this._animationCount += 1.5
    }
    else if (this.hasStepAnime() || !this.isOriginalPattern()) {
      this._animationCount++
    }
  }

  updatePattern(): void {
    if (!this.hasStepAnime() && this._stopCount > 0) {
      this.resetPattern()
    }
    else {
      this._pattern = (this._pattern + 1) % this.maxPattern()
    }
  }

  maxPattern(): number {
    return 4
  }

  pattern(): number {
    return this._pattern < 3 ? this._pattern : 1
  }

  setPattern(pattern: number): void {
    this._pattern = pattern
  }

  isOriginalPattern(): boolean {
    return this.pattern() === 1
  }

  resetPattern(): void {
    this.setPattern(1)
  }

  refreshBushDepth(): void {
    if (
      this.isNormalPriority()
      && !this.isObjectCharacter()
      && this.isOnBush()
      && !this.isJumping()
    ) {
      if (!this.isMoving()) {
        this._bushDepth = GlobalMananger.$gameMap.bushDepth()
      }
    }
    else {
      this._bushDepth = 0
    }
  }

  isOnLadder(): boolean {
    return GlobalMananger.$gameMap.isLadder(this._x, this._y)
  }

  isOnBush(): boolean {
    return GlobalMananger.$gameMap.isBush(this._x, this._y)
  }

  terrainTag(): number {
    return GlobalMananger.$gameMap.terrainTag(this._x, this._y)
  }

  regionId(): number {
    return GlobalMananger.$gameMap.regionId(this._x, this._y)
  }

  increaseSteps(): void {
    if (this.isOnLadder()) {
      this.setDirection(8)
    }
    this.resetStopCount()
    this.refreshBushDepth()
  }

  tileId(): number {
    return this._tileId
  }

  characterName(): string {
    return this._characterName
  }

  characterIndex(): number {
    return this._characterIndex
  }

  setImage(characterName: string, characterIndex: number): void {
    this._tileId = 0
    this._characterName = characterName
    this._characterIndex = characterIndex
    this._isObjectCharacter = ImageManager.isObjectCharacter(characterName)
  }

  setTileImage(tileId: number): void {
    this._tileId = tileId
    this._characterName = ''
    this._characterIndex = 0
    this._isObjectCharacter = true
  }

  checkEventTriggerTouchFront(d: number): void {
    const x2 = GlobalMananger.$gameMap.roundXWithDirection(this._x, d)
    const y2 = GlobalMananger.$gameMap.roundYWithDirection(this._y, d)
    this.checkEventTriggerTouch(x2, y2)
  }

  checkEventTriggerTouch(_x: number, _y: number): void {
    throw new TypeError('Method not implemented in Game_CharacterBase.')
  }

  isMovementSucceeded(): boolean {
    return this._movementSuccess
  }

  setMovementSuccess(success: boolean): void {
    this._movementSuccess = success
  }

  moveStraight(d: number): void {
    this.setMovementSuccess(this.canPass(this._x, this._y, d))
    if (this.isMovementSucceeded()) {
      this.setDirection(d)
      this._x = GlobalMananger.$gameMap.roundXWithDirection(this._x, d)
      this._y = GlobalMananger.$gameMap.roundYWithDirection(this._y, d)
      this._realX = GlobalMananger.$gameMap.xWithDirection(this._x, this.reverseDir(d as Game_CharacterBase.CharacterDirection))
      this._realY = GlobalMananger.$gameMap.yWithDirection(this._y, this.reverseDir(d as Game_CharacterBase.CharacterDirection))
      this.increaseSteps()
    }
    else {
      this.setDirection(d)
      this.checkEventTriggerTouchFront(d)
    }
  }

  moveDiagonally(horz: number, vert: number): void {
    this.setMovementSuccess(
      this.canPassDiagonally(this._x, this._y, horz, vert),
    )
    if (this.isMovementSucceeded()) {
      this._x = GlobalMananger.$gameMap.roundXWithDirection(this._x, horz)
      this._y = GlobalMananger.$gameMap.roundYWithDirection(this._y, vert)
      this._realX = GlobalMananger.$gameMap.xWithDirection(this._x, this.reverseDir(horz as Game_CharacterBase.CharacterDirection))
      this._realY = GlobalMananger.$gameMap.yWithDirection(this._y, this.reverseDir(vert as Game_CharacterBase.CharacterDirection))
      this.increaseSteps()
    }
    if (this._direction === this.reverseDir(horz as Game_CharacterBase.CharacterDirection)) {
      this.setDirection(horz)
    }
    if (this._direction === this.reverseDir(vert as Game_CharacterBase.CharacterDirection)) {
      this.setDirection(vert)
    }
  }

  jump(xPlus: number, yPlus: number): void {
    if (Math.abs(xPlus) > Math.abs(yPlus)) {
      if (xPlus !== 0) {
        this.setDirection(xPlus < 0 ? 4 : 6)
      }
    }
    else {
      if (yPlus !== 0) {
        this.setDirection(yPlus < 0 ? 8 : 2)
      }
    }
    this._x += xPlus
    this._y += yPlus
    const distance = Math.round(Math.sqrt(xPlus ** 2 + yPlus ** 2))
    this._jumpPeak = 10 + distance - this._moveSpeed
    this._jumpCount = this._jumpPeak * 2
    this.resetStopCount()
    this.straighten()
  }

  hasWalkAnime(): boolean {
    return this._walkAnime
  }

  setWalkAnime(walkAnime: boolean): void {
    this._walkAnime = walkAnime
  }

  hasStepAnime(): boolean {
    return this._stepAnime
  }

  setStepAnime(stepAnime: boolean): void {
    this._stepAnime = stepAnime
  }

  isDirectionFixed(): boolean {
    return this._directionFix
  }

  setDirectionFix(directionFix: boolean): void {
    this._directionFix = directionFix
  }

  isThrough(): boolean {
    return this._through
  }

  setThrough(through: boolean): void {
    this._through = through
  }

  isTransparent(): boolean {
    return this._transparent
  }

  bushDepth(): number {
    return this._bushDepth
  }

  setTransparent(transparent: boolean): void {
    this._transparent = transparent
  }

  startAnimation(): void {
    this._animationPlaying = true
  }

  startBalloon(): void {
    this._balloonPlaying = true
  }

  isAnimationPlaying(): boolean {
    return this._animationPlaying
  }

  isBalloonPlaying(): boolean {
    return this._balloonPlaying
  }

  endAnimation(): void {
    this._animationPlaying = false
  }

  endBalloon(): void {
    this._balloonPlaying = false
  }
}

namespace Game_CharacterBase {
  /** Cardinal directions in RPG Maker (2=Down, 4=Left, 6=Right, 8=Up) */
  export type CharacterDirection = 2 | 4 | 6 | 8
  /** Event/character priority layer (0=Below, 1=Normal, 2=Above) */
  export type CharacterPriorityType = 0 | 1 | 2
}

export { Game_CharacterBase }
