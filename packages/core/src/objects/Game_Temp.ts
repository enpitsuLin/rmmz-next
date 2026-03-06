import type { MZ } from '@rmmz-lib/database-types'
import type { Game_Battler } from './Game_Battler'
import type { Game_CharacterBase } from './Game_CharacterBase'
import { Utils } from '../core'

interface AnimationRequest {
  targets: Game_CharacterBase[]
  animationId: number
  mirror: boolean
}

interface BalloonRequest {
  target: Game_CharacterBase
  balloonId: number
}

type TouchState = '' | 'select' | 'click'

/**
 * The game object class for temporary data that is not included in save data.
 */
class Game_Temp {
  _isPlaytest!: boolean
  _destinationX!: number | null
  _destinationY!: number | null
  _touchTarget!: Game_Battler | null
  _touchState!: TouchState
  _needsBattleRefresh!: boolean
  _commonEventQueue!: number[]
  _animationQueue!: AnimationRequest[]
  _balloonQueue!: BalloonRequest[]
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

  setTouchState(target: Game_Battler | null, state: TouchState): void {
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

  touchState(): TouchState {
    return this._touchState
  }

  requestBattleRefresh(): void {
    if ($gameParty.inBattle()) {
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
      return $dataCommonEvents[id] ?? undefined
    }
    return undefined
  }

  clearCommonEventReservation(): void {
    this._commonEventQueue.length = 0
  }

  isCommonEventReserved(): boolean {
    return this._commonEventQueue.length > 0
  }

  // prettier-ignore
  requestAnimation(
    targets: Game_CharacterBase[],
    animationId: number,
    mirror = false,
  ): void {
    if ($dataAnimations[animationId]) {
      const request: AnimationRequest = {
        targets,
        animationId,
        mirror,
      }
      this._animationQueue.push(request)
      for (const target of targets) {
        if (target.startAnimation) {
          target.startAnimation()
        }
      }
    }
  }

  retrieveAnimation(): AnimationRequest | undefined {
    return this._animationQueue.shift()
  }

  requestBalloon(target: Game_CharacterBase, balloonId: number): void {
    const request: BalloonRequest = { target, balloonId }
    this._balloonQueue.push(request)
    if (target.startBalloon) {
      target.startBalloon()
    }
  }

  retrieveBalloon(): BalloonRequest | undefined {
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

export { Game_Temp }
