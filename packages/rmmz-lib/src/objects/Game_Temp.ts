import { Utils } from "../core";
import type { Game_Actor } from "./Game_Actor";
import type { Game_Enemy } from "./Game_Enemy";

/**
 * The game object class for temporary data that is not included in save data.
 */
class Game_Temp {
  _isPlaytest!: boolean;
  _destinationX!: number | null;
  _destinationY!: number | null;
  _touchTarget!: Game_Actor | Game_Enemy | null;
  _touchState!: string;
  _needsBattleRefresh!: boolean;
  _commonEventQueue!: number[];
  _animationQueue!: { targets: Game_Actor | Game_Enemy[]; animationId: number; mirror: boolean }[];
  _balloonQueue!: { target: Game_Actor | Game_Enemy; balloonId: number }[];
  _lastActionData!: number[];

  constructor() {
    this._isPlaytest = Utils.isOptionValid("test");
    this._destinationX = null;
    this._destinationY = null;
    this._touchTarget = null;
    this._touchState = "";
    this._needsBattleRefresh = false;
    this._commonEventQueue = [];
    this._animationQueue = [];
    this._balloonQueue = [];
    this._lastActionData = [0, 0, 0, 0, 0, 0];
  }

  isPlaytest() {
    return this._isPlaytest;
  }

  setDestination(x: number, y: number) {
    this._destinationX = x;
    this._destinationY = y;
  }

  clearDestination() {
    this._destinationX = null;
    this._destinationY = null;
  }

  isDestinationValid() {
    return this._destinationX !== null;
  }

  destinationX() {
    return this._destinationX;
  }

  destinationY() {
    return this._destinationY;
  }

  setTouchState(target: Game_Actor | Game_Enemy, state: string) {
    this._touchTarget = target;
    this._touchState = state;
  }

  clearTouchState() {
    this._touchTarget = null;
    this._touchState = "";
  }

  touchTarget() {
    return this._touchTarget;
  }

  touchState() {
    return this._touchState;
  }

  requestBattleRefresh() {
    if ($gameParty.inBattle()) {
      this._needsBattleRefresh = true;
    }
  }

  clearBattleRefreshRequest() {
    this._needsBattleRefresh = false;
  }

  isBattleRefreshRequested() {
    return this._needsBattleRefresh;
  }

  reserveCommonEvent(commonEventId: number) {
    this._commonEventQueue.push(commonEventId);
  }

  retrieveCommonEvent() {
    // @ts-expect-error to fix
    return $dataCommonEvents[this._commonEventQueue.shift()];
  }

  clearCommonEventReservation() {
    this._commonEventQueue.length = 0;
  }

  isCommonEventReserved() {
    return this._commonEventQueue.length > 0;
  }

  // prettier-ignore
  requestAnimation(
    targets: Game_Actor[] | Game_Enemy[],
    animationId: number,
    mirror = false
  ) {
    if ($dataAnimations[animationId]) {
      const request = {
        targets: targets,
        animationId: animationId,
        mirror: mirror
      };
      this._animationQueue.push(request);
      for (const target of targets) {
        if (target.startAnimation) {
          target.startAnimation();
        }
      }
    }
  }

  retrieveAnimation() {
    return this._animationQueue.shift();
  }

  requestBalloon(target, balloonId) {
    const request = { target: target, balloonId: balloonId };
    this._balloonQueue.push(request);
    if (target.startBalloon) {
      target.startBalloon();
    }
  }

  retrieveBalloon() {
    return this._balloonQueue.shift();
  }

  lastActionData(type) {
    return this._lastActionData[type] || 0;
  }

  setLastActionData(type, value) {
    this._lastActionData[type] = value;
  }

  setLastUsedSkillId(skillID) {
    this.setLastActionData(0, skillID);
  }

  setLastUsedItemId(itemID) {
    this.setLastActionData(1, itemID);
  }

  setLastSubjectActorId(actorID) {
    this.setLastActionData(2, actorID);
  }

  setLastSubjectEnemyIndex(enemyIndex) {
    this.setLastActionData(3, enemyIndex);
  }

  setLastTargetActorId(actorID) {
    this.setLastActionData(4, actorID);
  }

  setLastTargetEnemyIndex(enemyIndex) {
    this.setLastActionData(5, enemyIndex);
  }
}

export { Game_Temp };
