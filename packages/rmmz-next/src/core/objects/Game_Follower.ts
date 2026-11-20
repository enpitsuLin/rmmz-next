import type { Game_Actor } from './Game_Actor'
import { GlobalMananger } from '../managers/GlobalManager'
import { Game_Character } from './Game_Character'

/**
 * The game object class for a follower.
 *
 * A follower is an allied character, other than the front character, displayed in the party.
 */
class Game_Follower extends Game_Character {
  _memberIndex: number

  constructor(memberIndex: number) {
    super()
    this._memberIndex = memberIndex
    this.setTransparent(GlobalMananger.$dataSystem.optTransparent)
    this.setThrough(true)
  }

  refresh(): void {
    const characterName = this.isVisible() ? this.actor().characterName() : ''
    const characterIndex = this.isVisible() ? this.actor().characterIndex() : 0
    this.setImage(characterName, characterIndex)
  }

  actor(): Game_Actor {
    return GlobalMananger.$gameParty.battleMembers()[this._memberIndex]
  }

  isVisible(): boolean {
    return this.actor() && GlobalMananger.$gamePlayer.followers().isVisible()
  }

  isGathered(): boolean {
    return !this.isMoving() && this.pos(GlobalMananger.$gamePlayer.x, GlobalMananger.$gamePlayer.y)
  }

  update(): void {
    super.update()
    this.setMoveSpeed(GlobalMananger.$gamePlayer.realMoveSpeed())
    this.setOpacity(GlobalMananger.$gamePlayer.opacity())
    this.setBlendMode(GlobalMananger.$gamePlayer.blendMode())
    this.setWalkAnime(GlobalMananger.$gamePlayer.hasWalkAnime())
    this.setStepAnime(GlobalMananger.$gamePlayer.hasStepAnime())
    this.setDirectionFix(GlobalMananger.$gamePlayer.isDirectionFixed())
    this.setTransparent(GlobalMananger.$gamePlayer.isTransparent())
  }

  chaseCharacter(character: Game_Character): void {
    const sx = this.deltaXFrom(character.x)
    const sy = this.deltaYFrom(character.y)
    if (sx !== 0 && sy !== 0) {
      this.moveDiagonally(sx > 0 ? 4 : 6, sy > 0 ? 8 : 2)
    }
    else if (sx !== 0) {
      this.moveStraight(sx > 0 ? 4 : 6)
    }
    else if (sy !== 0) {
      this.moveStraight(sy > 0 ? 8 : 2)
    }
    this.setMoveSpeed(GlobalMananger.$gamePlayer.realMoveSpeed())
  }
}

export { Game_Follower }
