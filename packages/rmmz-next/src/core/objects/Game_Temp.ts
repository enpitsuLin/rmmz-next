import type { MZ } from '../../database-types'
import type { Sprite_Balloon } from '../sprites'
import type { Game_Battler } from './Game_Battler'
import type { Game_Character } from './Game_Character'
import { GlobalMananger } from '../managers/GlobalManager'
import { Utils } from '../primitives/Utils'

/**
 * The game object class for temporary data that is not included in save data.
 */
export class Game_Temp {
  _isPlaytest!: boolean
  _destinationX!: number | null
  _destinationY!: number | null
  _touchTarget!: Game_Battler | null
  _touchState!: Game_Temp.TouchState
  _needsBattleRefresh!: boolean
  _commonEventQueue!: number[]
  _animationQueue!: Game_Temp.AnimationRequest[]
  _balloonQueue!: Sprite_Balloon.BalloonRequest[]
  _lastActionData!: number[]

  constructor() {
    this._isPlaytest = Utils.isOptionValid('test')
    this._destinationX = null
    this._destinationY = null
    this._touchTarget = null
    this._touchState = ''
    this._needsBattleRefresh = false
    this._commonEventQueue = []
    this._animationQueue = []
    this._balloonQueue = []
    this._lastActionData = [0, 0, 0, 0, 0, 0]
  }

  isPlaytest(): boolean {
    return this._isPlaytest
  }

  setDestination(x: number, y: number): void {
    this._destinationX = x
    this._destinationY = y
  }

  clearDestination(): void {
    this._destinationX = null
    this._destinationY = null
  }

  isDestinationValid(): boolean {
    return this._destinationX !== null
  }

  destinationX(): number | null {
    return this._destinationX
  }

  destinationY(): number | null {
    return this._destinationY
  }

  setTouchState(target: Game_Battler | null, state: Game_Temp.TouchState): void {
    this._touchTarget = target
    this._touchState = state
  }

  clearTouchState(): void {
    this._touchTarget = null
    this._touchState = ''
  }

  touchTarget(): Game_Battler | null {
    return this._touchTarget
  }

  touchState(): Game_Temp.TouchState {
    return this._touchState
  }

  requestBattleRefresh(): void {
    if (GlobalMananger.$gameParty.inBattle()) {
      this._needsBattleRefresh = true
    }
  }

  clearBattleRefreshRequest(): void {
    this._needsBattleRefresh = false
  }

  isBattleRefreshRequested(): boolean {
    return this._needsBattleRefresh
  }

  reserveCommonEvent(commonEventId: number): void {
    this._commonEventQueue.push(commonEventId)
  }

  retrieveCommonEvent(): MZ.CommonEvent | undefined {
    const id = this._commonEventQueue.shift()
    if (id != null) {
      return GlobalMananger.$dataCommonEvents[id] ?? undefined
    }
    return undefined
  }

  clearCommonEventReservation(): void {
    this._commonEventQueue.length = 0
  }

  isCommonEventReserved(): boolean {
    return this._commonEventQueue.length > 0
  }

  requestAnimation(
    targets: (Game_Battler | Game_Character)[],
    animationId: number,
    mirror = false,
  ): void {
    if (GlobalMananger.$dataAnimations[animationId]) {
      const request: Game_Temp.AnimationRequest = {
        targets,
        animationId,
        mirror,
      }
      this._animationQueue.push(request)
      for (const target of targets) {
        if ('startAnimation' in target && target.startAnimation) {
          target.startAnimation()
        }
      }
    }
  }

  retrieveAnimation(): Game_Temp.AnimationRequest | undefined {
    return this._animationQueue.shift()
  }

  requestBalloon(target: Game_Character, balloonId: number): void {
    const request: Sprite_Balloon.BalloonRequest = { target, balloonId }
    this._balloonQueue.push(request)
    if (target.startBalloon) {
      target.startBalloon()
    }
  }

  retrieveBalloon(): Sprite_Balloon.BalloonRequest | undefined {
    return this._balloonQueue.shift()
  }

  lastActionData(type: number): number {
    return this._lastActionData[type] || 0
  }

  setLastActionData(type: number, value: number): void {
    this._lastActionData[type] = value
  }

  setLastUsedSkillId(skillID: number): void {
    this.setLastActionData(0, skillID)
  }

  setLastUsedItemId(itemID: number): void {
    this.setLastActionData(1, itemID)
  }

  setLastSubjectActorId(actorID: number): void {
    this.setLastActionData(2, actorID)
  }

  setLastSubjectEnemyIndex(enemyIndex: number): void {
    this.setLastActionData(3, enemyIndex)
  }

  setLastTargetActorId(actorID: number): void {
    this.setLastActionData(4, actorID)
  }

  setLastTargetEnemyIndex(enemyIndex: number): void {
    this.setLastActionData(5, enemyIndex)
  }
}

export namespace Game_Temp {
  export interface AnimationRequest {
    targets: (Game_Battler | Game_Character)[]
    animationId: number
    mirror: boolean
  }

  export type TouchState = '' | 'select' | 'click'
}
