import type { MZ } from '@rmmz-lib/database-types'
import type { Game_Actor } from './Game_Actor'
import { DataManager } from '../managers/DataManager'
import { TextManager } from '../managers/TextManager'
import { Game_Item } from './Game_Item'
import { Game_Unit } from './Game_Unit'

/**
 * The game object class for the party.
 *
 * Information such as gold and items is included.
 */
class Game_Party extends Game_Unit<Game_Actor> {
  _gold: number
  _steps: number
  _lastItem: Game_Item
  _menuActorId: number
  _targetActorId: number
  _actors: number[]
  _items!: Game_Party.ItemContainer
  _weapons!: Game_Party.ItemContainer
  _armors!: Game_Party.ItemContainer

  constructor(_gameParty?: Game_Party) {
    super()
    this._gold = 0
    this._steps = 0
    this._lastItem = new Game_Item()
    this._menuActorId = 0
    this._targetActorId = 0
    this._actors = []
    this.initAllItems()
  }

  static ABILITY_ENCOUNTER_HALF = 0
  static ABILITY_ENCOUNTER_NONE = 1
  static ABILITY_CANCEL_SURPRISE = 2
  static ABILITY_RAISE_PREEMPTIVE = 3
  static ABILITY_GOLD_DOUBLE = 4
  static ABILITY_DROP_ITEM_DOUBLE = 5

  initAllItems(): void {
    this._items = {}
    this._weapons = {}
    this._armors = {}
  }

  exists(): boolean {
    return this._actors.length > 0
  }

  size(): number {
    return this.members().length
  }

  isEmpty(): boolean {
    return this.size() === 0
  }

  members(): Game_Actor[] {
    return this.inBattle() ? this.battleMembers() : this.allMembers()
  }

  allMembers(): Game_Actor[] {
    return this._actors.map(id => $gameActors.actor(id)).filter((a): a is Game_Actor => a !== null)
  }

  battleMembers(): Game_Actor[] {
    return this.allBattleMembers().filter(actor => actor.isAppeared())
  }

  hiddenBattleMembers(): Game_Actor[] {
    return this.allBattleMembers().filter(actor => actor.isHidden())
  }

  allBattleMembers(): Game_Actor[] {
    return this.allMembers().slice(0, this.maxBattleMembers())
  }

  maxBattleMembers(): number {
    return 4
  }

  leader(): Game_Actor | undefined {
    return this.battleMembers()[0]
  }

  removeInvalidMembers(): void {
    for (const actorId of this._actors) {
      if (!$dataActors[actorId]) {
        this._actors.splice(this._actors.indexOf(actorId), 1)
      }
    }
  }

  reviveBattleMembers(): void {
    for (const actor of this.battleMembers()) {
      if (actor.isDead()) {
        actor.setHp(1)
      }
    }
  }

  items(): MZ.Item[] {
    return Object.keys(this._items).map(id => $dataItems[Number(id)]).filter(x => !!x)
  }

  weapons(): MZ.Weapon[] {
    return Object.keys(this._weapons).map(id => $dataWeapons[Number(id)]).filter(x => !!x)
  }

  armors(): MZ.Armor[] {
    return Object.keys(this._armors).map(id => $dataArmors[Number(id)]).filter(x => !!x)
  }

  equipItems(): MZ.Equip[] {
    return (this.weapons() as MZ.Equip[]).concat(this.armors())
  }

  allItems(): MZ.GeneralItem[] {
    return (this.items() as MZ.GeneralItem[]).concat(this.equipItems())
  }

  itemContainer(item: MZ.GeneralItem | null): Game_Party.ItemContainer | null {
    if (!item) {
      return null
    }
    else if (DataManager.isItem(item)) {
      return this._items
    }
    else if (DataManager.isWeapon(item)) {
      return this._weapons
    }
    else if (DataManager.isArmor(item)) {
      return this._armors
    }
    else {
      return null
    }
  }

  setupStartingMembers(): void {
    this._actors = []
    for (const actorId of $dataSystem.partyMembers) {
      if ($gameActors.actor(actorId)) {
        this._actors.push(actorId)
      }
    }
  }

  name(): string {
    const numBattleMembers = this.battleMembers().length
    if (numBattleMembers === 0) {
      return ''
    }
    else if (numBattleMembers === 1) {
      return this.leader()!.name()
    }
    else {
      return TextManager.partyName.format(this.leader()!.name())
    }
  }

  setupBattleTest(): void {
    this.setupBattleTestMembers()
    this.setupBattleTestItems()
  }

  setupBattleTestMembers(): void {
    for (const battler of $dataSystem.testBattlers) {
      const actor = $gameActors.actor(battler.actorId)
      if (actor) {
        actor.changeLevel(battler.level, false)
        actor.initEquips(battler.equips)
        actor.recoverAll()
        this.addActor(battler.actorId)
      }
    }
  }

  setupBattleTestItems(): void {
    for (const item of $dataItems) {
      if (item && item.name.length > 0) {
        this.gainItem(item, this.maxItems(item))
      }
    }
  }

  highestLevel(): number {
    return Math.max(...this.members().map(actor => actor.level))
  }

  addActor(actorId: number): void {
    if (!this._actors.includes(actorId)) {
      this._actors.push(actorId)
      $gamePlayer.refresh()
      $gameMap.requestRefresh()
      $gameTemp.requestBattleRefresh()
      if (this.inBattle()) {
        const actor = $gameActors.actor(actorId)
        // TODO improve this
        if (this.battleMembers().includes(actor!)) {
          // TODO improve this
          actor!.onBattleStart()
        }
      }
    }
  }

  removeActor(actorId: number): void {
    if (this._actors.includes(actorId)) {
      const actor = $gameActors.actor(actorId)
      const wasBattleMember = actor !== null && this.battleMembers().includes(actor)
      this._actors.splice(this._actors.indexOf(actorId), 1)
      $gamePlayer.refresh()
      $gameMap.requestRefresh()
      $gameTemp.requestBattleRefresh()
      if (this.inBattle() && wasBattleMember && actor) {
        actor.onBattleEnd()
      }
    }
  }

  gold(): number {
    return this._gold
  }

  gainGold(amount: number): void {
    this._gold = Math.min(Math.max(this._gold + amount, 0), this.maxGold())
  }

  loseGold(amount: number): void {
    this.gainGold(-amount)
  }

  maxGold(): number {
    return 99999999
  }

  steps(): number {
    return this._steps
  }

  increaseSteps(): void {
    this._steps++
  }

  numItems(item: MZ.EquipOrItem | null): number {
    const container = this.itemContainer(item)
    return container ? container[item!.id] || 0 : 0
  }

  maxItems(_item: MZ.EquipOrItem): number {
    return 99
  }

  hasMaxItems(item: MZ.EquipOrItem): boolean {
    return this.numItems(item) >= this.maxItems(item)
  }

  hasItem(item: MZ.EquipOrItem | null, includeEquip?: boolean): boolean {
    if (this.numItems(item) > 0) {
      return true
    }
    else if (includeEquip && this.isAnyMemberEquipped(item as MZ.Equip)) {
      return true
    }
    else {
      return false
    }
  }

  isAnyMemberEquipped(item: MZ.Equip): boolean {
    return this.members().some(actor => actor.equips().includes(item))
  }

  gainItem(
    item: MZ.EquipOrItem | null,
    amount: number,
    includeEquip?: boolean,
  ): void {
    const container = this.itemContainer(item)
    if (container) {
      const lastNumber = this.numItems(item)
      const newNumber = lastNumber + amount
      container[item!.id] = Math.min(Math.max(newNumber, 0), this.maxItems(item!))
      if (container[item!.id] === 0) {
        delete container[item!.id]
      }
      if (includeEquip && newNumber < 0) {
        this.discardMembersEquip(item as MZ.Equip, -newNumber)
      }
      $gameMap.requestRefresh()
    }
  }

  discardMembersEquip(item: MZ.Equip, amount: number): void {
    let n = amount
    for (const actor of this.members()) {
      while (n > 0 && actor.isEquipped(item)) {
        actor.discardEquip(item)
        n--
      }
    }
  }

  loseItem(
    item: MZ.EquipOrItem | null,
    amount: number,
    includeEquip?: boolean,
  ): void {
    this.gainItem(item, -amount, includeEquip)
  }

  consumeItem(item: MZ.EquipOrItem): void {
    if (DataManager.isItem(item) && item.consumable) {
      this.loseItem(item, 1)
    }
  }

  canUse(item: MZ.Item | MZ.Skill): boolean {
    return this.members().some(actor => actor.canUse(item))
  }

  canInput(): boolean {
    return this.members().some(actor => actor.canInput())
  }

  isAllDead(): boolean {
    if (super.isAllDead()) {
      return this.inBattle() || !this.isEmpty()
    }
    else {
      return false
    }
  }

  isEscaped(): boolean {
    return this.isAllDead() && this.hiddenBattleMembers().length > 0
  }

  onPlayerWalk(): void {
    for (const actor of this.members()) {
      actor.onPlayerWalk()
    }
  }

  menuActor(): Game_Actor {
    let actor = $gameActors.actor(this._menuActorId)
    if (!actor || !this.members().includes(actor)) {
      actor = this.members()[0]
    }
    return actor!
  }

  setMenuActor(actor: Game_Actor): void {
    this._menuActorId = actor.actorId()
  }

  makeMenuActorNext(): void {
    const index = this.members().indexOf(this.menuActor())
    if (index >= 0) {
      const nextIndex = (index + 1) % this.members().length
      this.setMenuActor(this.members()[nextIndex])
    }
    else {
      this.setMenuActor(this.members()[0])
    }
  }

  makeMenuActorPrevious(): void {
    const index = this.members().indexOf(this.menuActor())
    if (index >= 0) {
      const prevIndex = (index + this.members().length - 1) % this.members().length
      this.setMenuActor(this.members()[prevIndex])
    }
    else {
      this.setMenuActor(this.members()[0])
    }
  }

  targetActor(): Game_Actor {
    let actor = $gameActors.actor(this._targetActorId)
    if (!actor || !this.members().includes(actor)) {
      actor = this.members()[0]
    }
    return actor!
  }

  setTargetActor(actor: Game_Actor): void {
    this._targetActorId = actor.actorId()
  }

  lastItem(): MZ.GeneralItem | null {
    return this._lastItem.object()
  }

  setLastItem(item: MZ.GeneralItem | null): void {
    this._lastItem.setObject(item as MZ.GeneralItem)
  }

  swapOrder(index1: number, index2: number): void {
    const temp = this._actors[index1]
    this._actors[index1] = this._actors[index2]
    this._actors[index2] = temp
    $gamePlayer.refresh()
  }

  charactersForSavefile(): [string, number][] {
    return this.battleMembers().map(actor => [
      actor.characterName(),
      actor.characterIndex(),
    ])
  }

  facesForSavefile(): [string, number][] {
    return this.battleMembers().map(actor => [
      actor.faceName(),
      actor.faceIndex(),
    ])
  }

  partyAbility(abilityId: number): boolean {
    return this.battleMembers().some(actor => actor.partyAbility(abilityId))
  }

  hasEncounterHalf(): boolean {
    return this.partyAbility(Game_Party.ABILITY_ENCOUNTER_HALF)
  }

  hasEncounterNone(): boolean {
    return this.partyAbility(Game_Party.ABILITY_ENCOUNTER_NONE)
  }

  hasCancelSurprise(): boolean {
    return this.partyAbility(Game_Party.ABILITY_CANCEL_SURPRISE)
  }

  hasRaisePreemptive(): boolean {
    return this.partyAbility(Game_Party.ABILITY_RAISE_PREEMPTIVE)
  }

  hasGoldDouble(): boolean {
    return this.partyAbility(Game_Party.ABILITY_GOLD_DOUBLE)
  }

  hasDropItemDouble(): boolean {
    return this.partyAbility(Game_Party.ABILITY_DROP_ITEM_DOUBLE)
  }

  ratePreemptive(troopAgi: number): number {
    let rate = this.agility() >= troopAgi ? 0.05 : 0.03
    if (this.hasRaisePreemptive()) {
      rate *= 4
    }
    return rate
  }

  rateSurprise(troopAgi: number): number {
    let rate = this.agility() >= troopAgi ? 0.03 : 0.05
    if (this.hasCancelSurprise()) {
      rate = 0
    }
    return rate
  }

  performVictory(): void {
    for (const actor of this.members()) {
      actor.performVictory()
    }
  }

  performEscape(): void {
    for (const actor of this.members()) {
      actor.performEscape()
    }
  }

  removeBattleStates(): void {
    for (const actor of this.members()) {
      actor.removeBattleStates()
    }
  }

  requestMotionRefresh(): void {
    for (const actor of this.members()) {
      actor.requestMotionRefresh()
    }
  }

  onEscapeFailure(): void {
    for (const actor of this.members()) {
      actor.onEscapeFailure()
    }
  }
}

namespace Game_Party {
  /** Item container: itemId -> count */
  export type ItemContainer = Record<number, number>
}

export { Game_Party }
