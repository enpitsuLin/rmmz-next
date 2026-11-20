import type { MZ } from '../../database-types'
import type { Game_Action } from './Game_Action'
import type { Game_Party } from './Game_Party'
import type { Game_Troop } from './Game_Troop'
import { GlobalMananger, SoundManager } from '../managers'
import { Game_Battler } from './Game_Battler'

/**
 * The game object class for an enemy.
 */
export class Game_Enemy extends Game_Battler<MZ.Enemy> {
  _enemyId!: number
  _letter!: string
  _plural!: boolean
  _screenX!: number
  _screenY!: number

  constructor(enemyId: number, x: number, y: number) {
    super()
    this.setup(enemyId, x, y)
  }

  initMembers(): void {
    super.initMembers()
    this._enemyId = 0
    this._letter = ''
    this._plural = false
    this._screenX = 0
    this._screenY = 0
  }

  setup(enemyId: number, x: number, y: number): void {
    this._enemyId = enemyId
    this._screenX = x
    this._screenY = y
    this.recoverAll()
  }

  isEnemy(): this is this {
    return true
  }

  friendsUnit(): Game_Troop {
    return GlobalMananger.$gameTroop
  }

  opponentsUnit(): Game_Party {
    return GlobalMananger.$gameParty
  }

  index(): number {
    return GlobalMananger.$gameTroop.members().indexOf(this)
  }

  isBattleMember(): boolean {
    return this.index() >= 0
  }

  enemyId(): number {
    return this._enemyId
  }

  enemy(): MZ.Enemy {
    return GlobalMananger.$dataEnemies[this._enemyId] as MZ.Enemy
  }

  traitObjects(): MZ.Enemy[] {
    return super.traitObjects().concat(this.enemy())
  }

  paramBase(paramId: number): number {
    return this.enemy().params[paramId]
  }

  exp(): number {
    return this.enemy().exp
  }

  gold(): number {
    return this.enemy().gold
  }

  makeDropItems(): MZ.EquipOrItem[] {
    const rate = this.dropItemRate()
    return this.enemy().dropItems.reduce((r, di) => {
      if (di.kind > 0 && Math.random() * di.denominator < rate) {
        return r.concat(this.itemObject(di.kind, di.dataId)!)
      }
      else {
        return r
      }
    }, [] as MZ.EquipOrItem[])
  }

  dropItemRate(): number {
    return GlobalMananger.$gameParty.hasDropItemDouble() ? 2 : 1
  }

  itemObject(kind: number, dataId: number): MZ.EquipOrItem | null {
    if (kind === 1) {
      return GlobalMananger.$dataItems[dataId]
    }
    else if (kind === 2) {
      return GlobalMananger.$dataWeapons[dataId]
    }
    else if (kind === 3) {
      return GlobalMananger.$dataArmors[dataId]
    }
    else {
      return null
    }
  }

  isSpriteVisible(): boolean {
    return true
  }

  screenX(): number {
    return this._screenX
  }

  screenY(): number {
    return this._screenY
  }

  battlerName(): string {
    return this.enemy().battlerName
  }

  battlerHue(): number {
    return this.enemy().battlerHue
  }

  originalName(): string {
    return this.enemy().name
  }

  name(): string {
    return this.originalName() + (this._plural ? this._letter : '')
  }

  isLetterEmpty(): boolean {
    return this._letter === ''
  }

  setLetter(letter: string): void {
    this._letter = letter
  }

  setPlural(plural: boolean): void {
    this._plural = plural
  }

  performActionStart(action: Game_Action): void {
    super.performActionStart(action)
    this.requestEffect('whiten')
  }

  performAction(action: Game_Action): void {
    super.performAction(action)
  }

  performActionEnd(): void {
    super.performActionEnd()
  }

  performDamage(): void {
    super.performDamage()
    SoundManager.playEnemyDamage()
    this.requestEffect('blink')
  }

  performCollapse(): void {
    super.performCollapse()
    switch (this.collapseType()) {
      case 0:
        this.requestEffect('collapse')
        SoundManager.playEnemyCollapse()
        break
      case 1:
        this.requestEffect('bossCollapse')
        SoundManager.playBossCollapse1()
        break
      case 2:
        this.requestEffect('instantCollapse')
        break
    }
  }

  transform(enemyId: number): void {
    const name = this.originalName()
    this._enemyId = enemyId
    if (this.originalName() !== name) {
      this._letter = ''
      this._plural = false
    }
    this.refresh()
    if (this.numActions() > 0) {
      this.makeActions()
    }
  }

  meetsCondition(action: MZ.Action): boolean {
    const param1 = action.conditionParam1
    const param2 = action.conditionParam2
    switch (action.conditionType) {
      case 1:
        return this.meetsTurnCondition(param1, param2)
      case 2:
        return this.meetsHpCondition(param1, param2)
      case 3:
        return this.meetsMpCondition(param1, param2)
      case 4:
        return this.meetsStateCondition(param1)
      case 5:
        return this.meetsPartyLevelCondition(param1)
      case 6:
        return this.meetsSwitchCondition(param1)
      default:
        return true
    }
  }

  meetsTurnCondition(param1: number, param2: number): boolean {
    const n = this.turnCount()
    if (param2 === 0) {
      return n === param1
    }
    else {
      return n > 0 && n >= param1 && n % param2 === param1 % param2
    }
  }

  meetsHpCondition(param1: number, param2: number): boolean {
    return this.hpRate() >= param1 && this.hpRate() <= param2
  }

  meetsMpCondition(param1: number, param2: number): boolean {
    return this.mpRate() >= param1 && this.mpRate() <= param2
  }

  meetsStateCondition(param: number): boolean {
    return this.isStateAffected(param)
  }

  meetsPartyLevelCondition(param: number): boolean {
    return GlobalMananger.$gameParty.highestLevel() >= param
  }

  meetsSwitchCondition(param: number): boolean {
    return GlobalMananger.$gameSwitches.value(param)
  }

  isActionValid(action: MZ.Action): boolean {
    return (
      this.meetsCondition(action) && this.canUse(GlobalMananger.$dataSkills[action.skillId]!)
    )
  }

  selectAction(actionList: MZ.Action[], ratingZero: number): null | MZ.Action | undefined {
    const sum = actionList.reduce((r, a) => r + a.rating - ratingZero, 0)
    if (sum > 0) {
      let value = Math.randomInt(sum)
      for (const action of actionList) {
        value -= action.rating - ratingZero
        if (value < 0) {
          return action
        }
      }
    }
    else {
      return null
    }
  }

  selectAllActions(actionList: MZ.Action[]): void {
    const ratingMax = Math.max(...actionList.map(a => a.rating))
    const ratingZero = ratingMax - 3
    actionList = actionList.filter(a => a.rating > ratingZero)
    for (let i = 0; i < this.numActions(); i++) {
      this.action(i).setEnemyAction(this.selectAction(actionList, ratingZero))
    }
  }

  makeActions(): void {
    super.makeActions()
    if (this.numActions() > 0) {
      const actionList = this.enemy().actions.filter(a =>
        this.isActionValid(a),
      )
      if (actionList.length > 0) {
        this.selectAllActions(actionList)
      }
    }
    this.setActionState('waiting')
  }
}

export namespace Game_Enemy {
  export type EffectType = Game_Battler.EffectType | 'appear' | 'disappear'
}
