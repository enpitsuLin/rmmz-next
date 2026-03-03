export namespace database {

  export interface Action {
    conditionParam1: number
    conditionParam2: number
    conditionType: number
    rating: number
    skillId: number
  }

  export interface DropItem {
    dataId: number
    denominator: number
    kind: number
  }

  export interface Base {
    id: number

    name: string
    note: string
  }

  export interface Trait {
    code: number
    dataId: number
    value: number
  }

  export interface Damage {
    critical: boolean
    elementId: number
    formula: string
    type: number
    variance: number
  }

  export interface Effect {
    code: number
    dataId: number
    value1: number
    value2: number
  }

  export interface Advanced {
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

  export interface Audio {
    name: string
    pan: number
    pitch: number
    volume: number
  }

  export interface Vehicle {
    bgm: Audio
    characterIndex: number
    characterName: string
    startMapId: number
    startX: number
    startY: number
  }

  export interface AttackMotion {
    type: number
    weaponImageId: number
  }

  export interface Terms {
    basic: string[]
    commands: (string | undefined)[]
    params: string[]
    messages: Messages
  }

  export interface Messages {
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

  export interface TestBattler {
    actorId: number
    level: number
    equips: number[]
  }

  export interface TitleCommandWindow {
    background: number
    offsetX: number
    offsetY: number
  }

  export interface Editor {
    messageWidth1: number
    messageWidth2: number
    jsonFormatLevel: number
  }


  export type Actor = DataActor
  export type Item = DataItem
  export type Skill = DataSkill
}

export interface DataActor extends database.Base {
  battlerName: string
  characterIndex: number,
  characterName: string
  classId: number,
  equips: number[],
  faceIndex: number,
  faceName: string,
  traits: database.Trait[],
  initialLevel: number,
  maxLevel: number,
  nickname: string,
  profile: string
}

export interface DataItem extends database.Base {
  animationId: number
  consumable: boolean,
  damage: database.Damage,
  description: string
  effects: database.Effect[],
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

export interface DataSkill extends database.Base {
  id: number
  animationId: number
  damage: database.Damage
  description: string
  effects: database.Effect[]
  hitType: number
  iconIndex: number
  message1: string
  message2: string
  mpCost: number
  name: string
  note: string
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

export interface DataSystem {
  advanced: database.Advanced
  airship: database.Vehicle
  armorTypes: string[]
  attackMotions: database.AttackMotion[]
  battleBgm: database.Audio
  battleback1Name: string
  battleback2Name: string
  battlerHue: number
  battlerName: string
  battleSystem: number
  boat: database.Vehicle
  currencyUnit: string
  defeatMe: database.Audio
  editMapId: number
  elements: string[]
  equipTypes: string[]
  gameTitle: string
  gameoverMe: database.Audio
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
  ship: database.Vehicle
  skillTypes: string[]
  sounds: database.Audio[]
  startMapId: number
  startX: number
  startY: number
  switches: string[]
  terms: database.Terms
  testBattlers: database.TestBattler[]
  testTroopId: number
  title1Name: string
  title2Name: string
  titleBgm: database.Audio
  titleCommandWindow: database.TitleCommandWindow
  variables: string[]
  versionId: number
  victoryMe: database.Audio
  weaponTypes: string[]
  windowTone: number[]
  editor: database.Editor
  faceSize: number
  iconSize: number
  optSplashScreen: boolean
  optMessageSkip: boolean
  tileSize: number
}

export interface DataMap {
  autoplayBgm: boolean
  autoplayBgs: boolean
  battleback1Name: string
  battleback2Name: string
  bgm: database.Audio
  bgs: database.Audio
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

export interface DataState {
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
  traits: database.Trait[]
  messageType: number
}

export interface DataWeapon {
  id: number
  animationId: number
  description: string
  etypeId: number
  traits: database.Trait[]
  iconIndex: number
  name: string
  note: string
  params: number[]
  price: number
  wtypeId: number
}

export interface DataArmor {
  id: number
  atypeId: number
  description: string
  etypeId: number
  traits: database.Trait[]
  iconIndex: number
  name: string
  note: string
  params: number[]
  price: number
}

export interface DataEnemy {
  id: number
  actions: database.Action[]
  battlerHue: number
  battlerName: string
  dropItems: database.DropItem[]
  exp: number
  traits: database.Trait[]
  gold: number
  name: string
  note: string
  params: number[]
}
