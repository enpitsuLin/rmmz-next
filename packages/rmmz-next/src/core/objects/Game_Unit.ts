import type { Game_Battler } from './Game_Battler'
import { Database } from '../managers/Database'

/**
 * The superclass of Game_Party and Game_Troop.
 */
class Game_Unit<Member extends Game_Battler = Game_Battler> {
  _inBattle: boolean

  constructor() {
    this._inBattle = false
  }

  inBattle(): boolean {
    return this._inBattle
  }

  members(): Member[] {
    return []
  }

  aliveMembers(): Member[] {
    return this.members().filter(member => member.isAlive())
  }

  deadMembers(): Member[] {
    return this.members().filter(member => member.isDead())
  }

  movableMembers(): Member[] {
    return this.members().filter(member => member.canMove())
  }

  clearActions(): void {
    for (const member of this.members()) {
      member.clearActions()
    }
  }

  agility(): number {
    const members = this.members()
    const sum = members.reduce((r, member) => r + member.agi, 0)
    return Math.max(1, sum / Math.max(1, members.length))
  }

  tgrSum(): number {
    return this.aliveMembers().reduce((r, member) => r + member.tgr, 0)
  }

  randomTarget(): Member {
    let tgrRand = Math.random() * this.tgrSum()
    let target = null
    for (const member of this.aliveMembers()) {
      tgrRand -= member.tgr
      if (tgrRand <= 0 && !target) {
        target = member
      }
    }
    return target!
  }

  randomDeadTarget(): Member | null {
    const members = this.deadMembers()
    return members.length ? members[Math.randomInt(members.length)] : null
  }

  smoothTarget(index: number): Member {
    const member = this.members()[Math.max(0, index)]
    return member && member.isAlive() ? member : this.aliveMembers()[0]
  }

  smoothDeadTarget(index: number): Member {
    const member = this.members()[Math.max(0, index)]
    return member && member.isDead() ? member : this.deadMembers()[0]
  }

  clearResults(): void {
    for (const member of this.members()) {
      member.clearResult()
    }
  }

  onBattleStart(advantageous: boolean): void {
    for (const member of this.members()) {
      member.onBattleStart(advantageous)
    }
    this._inBattle = true
  }

  onBattleEnd(): void {
    this._inBattle = false
    for (const member of this.members()) {
      member.onBattleEnd()
    }
  }

  makeActions(): void {
    for (const member of this.members()) {
      member.makeActions()
    }
  }

  select(activeMember: Member): void {
    for (const member of this.members()) {
      if (member === activeMember) {
        member.select()
      }
      else {
        member.deselect()
      }
    }
  }

  isAllDead(): boolean {
    return this.aliveMembers().length === 0
  }

  substituteBattler(target: Member): Member | null {
    for (const member of this.members()) {
      if (member.isSubstitute() && member !== target) {
        return member
      }
    }
    return null
  }

  tpbBaseSpeed(): number {
    const members = this.members()
    return Math.max(...members.map(member => member.tpbBaseSpeed()))
  }

  tpbReferenceTime(): number {
    return Database.isActiveTpb() ? 240 : 60
  }

  updateTpb(): void {
    for (const member of this.members()) {
      member.updateTpb()
    }
  }
}

export { Game_Unit }
