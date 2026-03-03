export interface DataActor {
  id: number,
  battlerName: string
  characterIndex: number,
  characterName: string
  classId: number,
  equips: number[],
  faceIndex: number,
  faceName: string,
  traits: DataActor.Trait[],
  initialLevel: number,
  maxLevel: number,
  name: string,
  nickname: string,
  note: string,
  profile: string
}

export namespace DataActor {
  export interface Trait {
    code: number,
    dataId: number,
    value: number
  }
}

export interface DataItem {
  id: number
  animationId: number
  consumable: boolean,
  damage: {
    critical: boolean,
    elementId: number
    formula: string
    type: number
    variance: number
  },
  description: string
  effects: DataItem.Effect[],
  hitType: number
  iconIndex: number
  itypeId: number
  name: string
  note: string
  occasion: number
  price: number
  repeats: number
  scope: number
  speed: number
  successRate: number
  tpGain: number
}

export namespace DataItem {
  export interface Effect {
    code: number
    dataId: number
    value1: number
    value2: number
  }
}

export interface DataSystem {
  advanced: DataSystem.Advanced
  airship: DataSystem.Vehicle
  armorTypes: string[]
  attackMotions: DataSystem.AttackMotion[]
  battleBgm: DataSystem.Audio
  battleback1Name: string
  battleback2Name: string
  battlerHue: number
  battlerName: string
  battleSystem: number
  boat: DataSystem.Vehicle
  currencyUnit: string
  defeatMe: DataSystem.Audio
  editMapId: number
  elements: string[]
  equipTypes: string[]
  gameTitle: string
  gameoverMe: DataSystem.Audio
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
  ship: DataSystem.Vehicle
  skillTypes: string[]
  sounds: DataSystem.Audio[]
  startMapId: number
  startX: number
  startY: number
  switches: string[]
  terms: DataSystem.Terms
  testBattlers: DataSystem.TestBattler[]
  testTroopId: number
  title1Name: string
  title2Name: string
  titleBgm: DataSystem.Audio
  titleCommandWindow: DataSystem.TitleCommandWindow
  variables: string[]
  versionId: number
  victoryMe: DataSystem.Audio
  weaponTypes: string[]
  windowTone: number[]
  editor: DataSystem.Editor
  faceSize: number
  iconSize: number
  optSplashScreen: boolean
  optMessageSkip: boolean
  tileSize: number
}

export namespace DataSystem {

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

}

export interface DataMap {
  autoplayBgm: boolean
  autoplayBgs: boolean
  battleback1Name: string
  battleback2Name: string
  bgm: DataSystem.Audio
  bgs: DataSystem.Audio
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
