
/** 基础数据结构，包含所有数据库对象的通用字段 */
export interface BaseData {
  id: number
  name: string
  note: string
}

/** 音频配置 */
export interface AudioConfig {
  name: string
  pan: number
  pitch: number
  volume: number
}

/** 特性/特征 */
export interface Trait {
  code: number
  dataId: number
  value: number
}

/** 伤害计算配置 */
export interface DamageConfig {
  critical: boolean
  elementId: number
  formula: string
  type: number
  variance: number
}

/** 效果配置 */
export interface EffectConfig {
  code: number
  dataId: number
  value1: number
  value2: number
}

/** 敌人行动配置 */
export interface EnemyAction {
  conditionParam1: number
  conditionParam2: number
  conditionType: number
  rating: number
  skillId: number
}

/** 掉落物品配置 */
export interface DropItemConfig {
  dataId: number
  denominator: number
  kind: number
}

/** 高级系统设置 */
export interface AdvancedSettings {
  gameId: number
  screenWidth: number
  screenHeight: number
  uiAreaWidth: number
  uiAreaHeight: number
  numberFontFilename: string
  fallbackFonts: string
  fontSize: number
  mainFontFilename: string
  screenScale: number
  windowOpacity: number
  picturesUpperLimit: number
}

/** 载具配置 */
export interface VehicleConfig {
  bgm: AudioConfig
  characterIndex: number
  characterName: string
  startMapId: number
  startX: number
  startY: number
}

/** 攻击动作配置 */
export interface AttackMotionConfig {
  type: number
  weaponImageId: number
}

/** 游戏术语配置 */
export interface GameTerms {
  basic: string[]
  commands: (string | undefined)[]
  params: string[]
  messages: GameMessages
}

/** 游戏消息文本 */
export interface GameMessages {
  alwaysDash: string
  commandRemember: string
  touchUI: string
  bgmVolume: string
  bgsVolume: string
  meVolume: string
  seVolume: string
  possession: string
  expTotal: string
  expNext: string
  saveMessage: string
  loadMessage: string
  file: string
  autosave: string
  partyName: string
  emerge: string
  preemptive: string
  surprise: string
  escapeStart: string
  escapeFailure: string
  victory: string
  defeat: string
  obtainExp: string
  obtainGold: string
  obtainItem: string
  levelUp: string
  obtainSkill: string
  useItem: string
  criticalToEnemy: string
  criticalToActor: string
  actorDamage: string
  actorRecovery: string
  actorGain: string
  actorLoss: string
  actorDrain: string
  actorNoDamage: string
  actorNoHit: string
  enemyDamage: string
  enemyRecovery: string
  enemyGain: string
  enemyLoss: string
  enemyDrain: string
  enemyNoDamage: string
  enemyNoHit: string
  evasion: string
  magicEvasion: string
  magicReflection: string
  counterAttack: string
  substitute: string
  buffAdd: string
  debuffAdd: string
  buffRemove: string
  actionFailure: string
}

/** 测试战斗者配置 */
export interface TestBattlerConfig {
  actorId: number
  level: number
  equips: number[]
}

/** 标题命令窗口配置 */
export interface TitleCommandWindowConfig {
  background: number
  offsetX: number
  offsetY: number
}

/** 编辑器配置 */
export interface EditorConfig {
  messageWidth1: number
  messageWidth2: number
  jsonFormatLevel: number
}


/** 角色数据 */
export interface Actor extends BaseData {
  battlerName: string
  characterIndex: number
  characterName: string
  classId: number
  equips: number[]
  faceIndex: number
  faceName: string
  traits: Trait[]
  initialLevel: number
  maxLevel: number
  nickname: string
  profile: string
}

/** 物品数据 */
export interface Item extends BaseData {
  animationId: number
  consumable: boolean
  damage: DamageConfig
  description: string
  effects: EffectConfig[]
  hitType: number
  iconIndex: number
  itypeId: number
  occasion: number
  price: number
  repeats: number
  scope: number
  speed: number
  successRate: number
  tpGain: number
}

/** 技能数据 */
export interface Skill extends BaseData {
  animationId: number
  damage: DamageConfig
  description: string
  effects: EffectConfig[]
  hitType: number
  iconIndex: number
  message1: string
  message2: string
  mpCost: number
  occasion: number
  repeats: number
  requiredWtypeId1: number
  requiredWtypeId2: number
  scope: number
  speed: number
  stypeId: number
  successRate: number
  tpCost: number
  tpGain: number
  messageType: number
}

/** 系统数据 */
export interface System {
  advanced: AdvancedSettings
  airship: VehicleConfig
  armorTypes: string[]
  attackMotions: AttackMotionConfig[]
  battleBgm: AudioConfig
  battleback1Name: string
  battleback2Name: string
  battlerHue: number
  battlerName: string
  battleSystem: number
  boat: VehicleConfig
  currencyUnit: string
  defeatMe: AudioConfig
  editMapId: number
  elements: string[]
  equipTypes: string[]
  gameTitle: string
  gameoverMe: AudioConfig
  itemCategories: boolean[]
  locale: string
  magicSkills: number[]
  menuCommands: boolean[]
  optAutosave: boolean
  optDisplayTp: boolean
  optDrawTitle: boolean
  optExtraExp: boolean
  optFloorDeath: boolean
  optFollowers: boolean
  optKeyItemsNumber: boolean
  optSideView: boolean
  optSlipDeath: boolean
  optTransparent: boolean
  partyMembers: number[]
  ship: VehicleConfig
  skillTypes: string[]
  sounds: AudioConfig[]
  startMapId: number
  startX: number
  startY: number
  switches: string[]
  terms: GameTerms
  testBattlers: TestBattlerConfig[]
  testTroopId: number
  title1Name: string
  title2Name: string
  titleBgm: AudioConfig
  titleCommandWindow: TitleCommandWindowConfig
  variables: string[]
  versionId: number
  victoryMe: AudioConfig
  weaponTypes: string[]
  windowTone: number[]
  editor: EditorConfig
  faceSize: number
  iconSize: number
  optSplashScreen: boolean
  optMessageSkip: boolean
  tileSize: number
}

/** 地图数据 */
export interface Map {
  autoplayBgm: boolean
  autoplayBgs: boolean
  battleback1Name: string
  battleback2Name: string
  bgm: AudioConfig
  bgs: AudioConfig
  disableDashing: boolean
  displayName: string
  encounterList: unknown[]
  encounterStep: number
  height: number
  note: string
  parallaxLoopX: boolean
  parallaxLoopY: boolean
  parallaxName: string
  parallaxShow: boolean
  parallaxSx: number
  parallaxSy: number
  scrollType: number
  specifyBattleback: boolean
  tilesetId: number
  width: number
  data: number[]
  events: unknown[]
}

/** 状态数据 */
export interface State {
  id: number
  autoRemovalTiming: number
  chanceByDamage: number
  iconIndex: number
  maxTurns: number
  message1: string
  message2: string
  message3: string
  message4: string
  minTurns: number
  motion: number
  name: string
  note: string
  overlay: number
  priority: number
  releaseByDamage: boolean
  removeAtBattleEnd: boolean
  removeByDamage: boolean
  removeByRestriction: boolean
  removeByWalking: boolean
  restriction: number
  stepsToRemove: number
  traits: Trait[]
  messageType: number
}

/** 武器数据 */
export interface Weapon {
  id: number
  animationId: number
  description: string
  etypeId: number
  traits: Trait[]
  iconIndex: number
  name: string
  note: string
  params: number[]
  price: number
  wtypeId: number
}

/** 防具数据 */
export interface Armor {
  id: number
  atypeId: number
  description: string
  etypeId: number
  traits: Trait[]
  iconIndex: number
  name: string
  note: string
  params: number[]
  price: number
}

/** 敌人数据 */
export interface Enemy {
  id: number
  actions: EnemyAction[]
  battlerHue: number
  battlerName: string
  dropItems: DropItemConfig[]
  exp: number
  traits: Trait[]
  gold: number
  name: string
  note: string
  params: number[]
}
