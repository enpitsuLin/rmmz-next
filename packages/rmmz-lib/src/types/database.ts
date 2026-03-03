export declare namespace MZ {
  interface Actor {
    // basic
    id: number;
    name: string;
    nickname: string;
    classId: number;
    initialLevel: number;
    maxLevel: number;
    profile: string;

    // image
    characterName: string;
    characterIndex: number;
    battlerName: string;
    faceIndex: number;
    faceName: string;

    // init equips
    equips: number[];

    // traits
    traits: Trait[];

    // note
    note: string;

    // meta
    meta: Meta;
  }

  interface Class {
    // basic
    id: number;
    name: string;
    expParams: ExpParams;

    // params
    params: number[][];

    // learnings
    learnings: Learning[];

    // traits
    traits: Trait[];

    // note
    note: string;

    // meta
    meta: Meta;
  }

  interface Skill {
    // basic
    id: number;
    name: string;
    iconIndex: number;
    description: string;
    stypeId: number;
    mpCost: number;
    tpCost: number;
    scope: number;
    occasion: number;

    // act
    speed: number;
    successRate: number;
    tpGain: number;
    repeats: number;
    hitType: number;
    animationId: number;

    // message

    // rquirement
    requiredWtypeId1: number;
    requiredWtypeId2: number;

    // damage
    damage: Damage;

    // effect
    effects: Effect[];

    // note
    note: string;

    // meta
    meta: Meta;
  }

  interface Item {
    // basic
    id: number;
    name: string;
    iconIndex: number;
    description: string;
    itypeId: number;
    price: number;
    consumable: boolean;
    scope: number;
    occasion: number;

    // act
    speed: number;
    successRate: number;
    repeats: number;
    tpGain: number;
    hitType: number;
    animationId: number;

    // damage
    damage: Damage;

    // effect
    effects: Effect[];

    // note
    note: string;

    // meta
    meta: Meta;

  }

  interface Weapon {
    id: number;
    iconIndex: number;
    name: string;
    price: number;
    description: string;

    etypeId: number;
    wtypeId: number;
    params: number[];
    animationId: number;

    // traits
    traits: Trait[];

    // note
    note: string;

    // meta
    meta: Meta;
  }

  interface Armor {
    id: number;
    iconIndex: number;
    name: string;
    price: number;
    description: string;

    etypeId: number;
    atypeId: number;
    params: number[];

    // traits
    traits: Trait[];

    // note
    note: string;

    // meta
    meta: Meta;
  }

  interface Enemy {
    // basic
    id: number;
    name: string;
    battlerName: string;
    battlerHue: number;
    params: number[];

    // reward
    exp: number;
    gold: number;

    // drop
    dropItems: DropItem[];

    // action
    actions: Action[];

    // traits
    traits: Trait[];

    // note
    note: string;

    // meta
    meta: Meta;

  }

  interface State {
    id: number;
    name: string;
    iconIndex: number;
    motion: number;
    overlay: number;

    priority: number;
    message1: string;
    message2: string;
    message3: string;
    message4: string;

    restriction: number;
    maxTurns: number;
    minTurns: number;
    removeByWalking: boolean;
    removeByDamage: boolean;
    chanceByDamage: number;
    removeAtBattleEnd: boolean;
    removeByRestriction: boolean;
    autoRemovalTiming: number;
    stepsToRemove: number;

    // traits
    traits: Trait[];

    // note
    note: string;

    // meta
    meta: Meta;
  }

  namespace Troop {
    interface Member {
      enemyId: number;
      x: number;
      y: number;
      hidden: boolean;
    }

    namespace Event {
      interface Page {
        conditions: Conditions;
        span: number;
        list: MZ.EventCommon.PageCommand[];
      }
      interface Conditions {
        turnEnding: boolean;
        turnValid: boolean;
        enemyValid: boolean;
        actorValid: boolean;
        switchValid: boolean;
        turnA: number;
        turnB: number;
        enemyIndex: number;
        enemyHp: number;
        actorId: number;
        actorHp: number;
        switchId: number;
      }
    }
  }

  interface Troop {
    id: number;
    name: string;
    members: Troop.Member[];
    pages: Troop.Event.Page[];

  }

  interface Tileset {
    id: number;
    flags: number[];
    mode: number;
    name: string;
    note: string;
    tilesetNames: string[];
  }

  interface System {
    // title
    gameTitle: string;

    // initial members
    partyMembers: number[];

    // currency
    currencyUnit: string;

    // windowtone
    windowTone: number[];

    // vehicle
    boat: System.Boat;
    ship: System.Ship;
    airship: System.Airship;

    // start place
    startMapId: number;
    startX: number;
    startY: number;

    // title secene
    advanced: System.Advanced;
    armorTypes: string[];
    attackMotions: System.AttackMotion[];
    battleBgm: AudioInfo;
    battleback1Name: string;
    battleback2Name: string;
    battlerHue: number;
    battlerName: string;
    battleSystem: number;

    defeatMe: AudioInfo;
    editMapId: number;
    elements: string[];
    equipTypes: string[];

    gameoverMe: AudioInfo;
    itemCategories: boolean[];
    locale: string;
    magicSkills: number[];
    menuCommands: boolean[];
    optAutosave: boolean;
    optDisplayTp: boolean;
    optDrawTitle: boolean;
    optExtraExp: boolean;
    optFloorDeath: boolean;
    optFollowers: boolean;
    optKeyItemsNumber: boolean;
    optSideView: boolean;
    optSlipDeath: boolean;
    optTransparent: boolean;

    skillTypes: string[];
    sounds: AudioInfo[];

    switches: string[];
    terms: System.Term;
    testBattlers: System.TestBattler[];
    testTroopId: number;
    title1Name: string;
    title2Name: string;
    titleBgm: AudioInfo;
    titleCommandWindow: System.TitleCommandWindow;
    variables: string[];
    versionId: number;
    victoryMe: AudioInfo;
    weaponTypes: string[];

    tileSize: number;

    hasEncryptedImages: boolean;
    hasEncryptedAudio: boolean;
    encryptionKey: string;
    optMessageSkip: boolean
  }

  interface CommonEvent {
    id: number;
    name: string;
    switchId: number;
    trigger: number;
    list: EventCommon.PageCommand[];
  }

  interface TraitObject {
    traits: Trait[];
  }
  interface DescriptionObject {
    description: string;
  }

  type Equip = Armor | Weapon;
  type EquipOrItem = Item | Armor | Weapon;
  type GeneralItem = Skill | Item | Armor | Weapon;
  type Meta = { [key: string]: string | number | boolean | undefined };
  // type TraitObject = Actor | Class | Weapon | Armor | State;


  type ExpParams = number[];

  interface Learning {
    skillId: number;
    level: number;
    note: string;
  }

  interface Damage {
    type: number;
    elementId: number;
    formula: string;
    variance: number;
    critical: boolean;
  }

  interface Trait {
    code: number;
    dataId: number;
    value: number;
  }

  interface Effect {
    code: number,
    dataId: number,
    value1: number,
    value2: number
  }

  interface Action {
    conditionParam1: number;
    conditionParam2: number;
    conditionType: number;
    rating: number;
    skillId: number;
  }

  interface DropItem {
    kind: number;
    dataId: number;
    denominator: number;
  }

  namespace EventCommon {
    interface PageCommand {
      code: EventCommandCode;
      indent: number;
      parameters: Array<any>;
    }

    interface MoveCommand {
      code: MoveCommandCode;
      parameters: Array<any>;
    }

    enum EventCommandCode {
    }
    enum MoveCommandCode {
    }
    namespace EventCommandParameter {
      type WeatherType = "none" | "rain" | "storm" | "snow";
    }

  }

  interface AudioInfo {
    name: string;
    volume: number;
    pitch: number;
    pan?: number;
    pos?: number;
  }

  namespace System {

    interface Advanced {
      gameId: number;
      screenWidth: number;
      screenHeight: number;
      uiAreaWidth: number;
      uiAreaHeight: number;
      numberFontFilename: string;
      fallbackFonts: string;
      fontSize: number;
      mainFontFilename: string;
      windowOpacity: number;
    }


    interface Airship {
      bgm: AudioInfo;
      characterIndex: number;
      characterName: string;
      startMapId: number;
      startX: number;
      startY: number;
    }

    interface AttackMotion {
      type: number;
      weaponImageId: number;
    }

    interface Boat {
      bgm: AudioInfo;
      characterIndex: number;
      characterName: string;
      startMapId: number;
      startX: number;
      startY: number;
    }

    interface Ship {
      bgm: AudioInfo;
      characterIndex: number;
      characterName: string;
      startMapId: number;
      startX: number;
      startY: number;
    }

    interface Message {
      alwaysDash: string;
      commandRemember: string;
      touchUI: string;
      bgmVolume: string;
      bgsVolume: string;
      meVolume: string;
      seVolume: string;
      possession: string;
      expTotal: string;
      expNext: string;
      saveMessage: string;
      loadMessage: string;
      file: string;
      autosave: string;
      partyName: string;
      emerge: string;
      preemptive: string;
      surprise: string;
      escapeStart: string;
      escapeFailure: string;
      victory: string;
      defeat: string;
      obtainExp: string;
      obtainGold: string;
      obtainItem: string;
      levelUp: string;
      obtainSkill: string;
      useItem: string;
      criticalToEnemy: string;
      criticalToActor: string;
      actorDamage: string;
      actorRecovery: string;
      actorGain: string;
      actorLoss: string;
      actorDrain: string;
      actorNoDamage: string;
      actorNoHit: string;
      enemyDamage: string;
      enemyRecovery: string;
      enemyGain: string;
      enemyLoss: string;
      enemyDrain: string;
      enemyNoDamage: string;
      enemyNoHit: string;
      evasion: string;
      magicEvasion: string;
      magicReflection: string;
      counterAttack: string;
      substitute: string;
      buffAdd: string;
      debuffAdd: string;
      buffRemove: string;
      actionFailure: string;
    }

    interface Term {
      basic: string[];
      commands: any[];
      params: string[];
      messages: Message;
    }

    interface TestBattler {
      actorId: number;
      level: number;
      equips: any[];
    }

    interface TitleCommandWindow {
      background: number;
      offsetX: number;
      offsetY: number;
    }
  }


  namespace Map {
    interface MapInfo {
      id: number;
      name: string;
    }
    interface EncounterList {
      troopId: number;
      weight: number;
      regionSet: number[];
    }
    // this Event is a type of Character, little different from namespace Event
    interface Event {
      id: number;
      name: string;
      note: string;
      pages: Event.Page[];
      x: number;
      y: number;
    }
    namespace Event {
      interface Conditions {
        actorId: number;
        actorValid: boolean;
        itemId: number;
        itemValid: boolean;
        selfSwitchCh: string;
        selfSwitchValid: boolean;
        switch1Id: number,
        switch1Valid: boolean,
        switch2Id: number,
        switch2Valid: boolean,
        variableId: number,
        variableValid: boolean,
        variableValue: number
      }

      interface MoveRoute {
        list: MZ.EventCommon.MoveCommand[],
        repeat: boolean,
        skippable: boolean,
        wait: boolean
      }

      interface Page {
        conditions: Conditions;
        directionFix: boolean;
        image: {
          tileId: number;
          characterName: string;
          characterIndex: number;
          direction: number;
          pattern: number;
        };
        list: MZ.EventCommon.PageCommand[];
        moveFrequency: number,
        moveRoute: MoveRoute,
        moveSpeed: number,
        moveType: number,
        priorityType: number,
        stepAnime: boolean,
        through: boolean,
        trigger: number,
        walkAnime: boolean
      }
    }
  }
  interface Map {
    autoplayBgm: boolean;
    autoplayBgs: boolean;
    battleback1Name: string;
    battleback2Name: string;
    bgm: AudioInfo;
    bgs: AudioInfo;
    disableDashing: boolean;
    displayName: string;
    encounterList: Map.EncounterList[];
    encounterStep: number;
    height: number;
    note: string;
    parallaxLoopX: boolean;
    parallaxLoopY: boolean;
    parallaxName: string;
    parallaxShow: boolean;
    parallaxSx: number;
    parallaxSy: number;
    scrollType: number;
    specifyBattleback: boolean;
    tilesetId: number;
    width: number;
    data: number[];
    events: (Map.Event | null)[];
  }
  interface MapInfo {
    id: number;
    expanded: boolean;
    name: string;
    order: number;
    parentId: number;
    scrollX: number;
    scrollY: number;
  }
}

