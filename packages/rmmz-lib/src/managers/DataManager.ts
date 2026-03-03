//-----------------------------------------------------------------------------
// DataManager
//

import { Graphics, Utils } from "../core";
import { Game_Actors, Game_Map, Game_Message, Game_Party, Game_Player, Game_Screen, Game_SelfSwitches, Game_Switches, Game_System, Game_Temp, Game_Timer, Game_Troop, Game_Variables } from "../objects";
import type { Database } from "../types";
import { BattleManager } from "./BattleManager";
import { StorageManager } from "./StorageManager";

// The static class that manages the database and game objects.
export class DataManager {
  constructor() {
    throw new Error("This is a static class");
  }

  static _restoreInstance(instance, data) {
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        const value = data[key];
        if (value == null) {
          instance[key] = null;
        } else if (Array.isArray(value)) {
          instance[key] = value.map(item => {
            if (item == null) return null;
            const ctorName =
              item["@"] ||
              (item.constructor !== Object
                ? item.constructor.name
                : instance[key]?.constructor.name || "Object");
            const ctor = item["@"]
              ? eval(ctorName)
              : item.constructor !== Object
                ? item.constructor
                : instance[key]?.constructor || Object;
            return typeof item === "object"
              ? DataManager._restoreInstance(new ctor(), item)
              : item;
          });
        } else if (typeof value === "object") {
          const ctorName =
            value["@"] ||
            (value.constructor !== Object ? value.constructor.name : "Object");
          const ctor = value["@"]
            ? eval(ctorName)
            : value.constructor !== Object
              ? value.constructor
              : instance[key]?.constructor || Object;
          instance[key] = DataManager._restoreInstance(new ctor(), value);
        } else {
          instance[key] = value;
        }
      }
    }
    return instance;
  }

  static _globalInfo = null;
  static _errors = [];
  static _databaseFiles = [
    { name: "$dataActors", src: "Actors.json" },
    { name: "$dataClasses", src: "Classes.json" },
    { name: "$dataSkills", src: "Skills.json" },
    { name: "$dataItems", src: "Items.json" },
    { name: "$dataWeapons", src: "Weapons.json" },
    { name: "$dataArmors", src: "Armors.json" },
    { name: "$dataEnemies", src: "Enemies.json" },
    { name: "$dataTroops", src: "Troops.json" },
    { name: "$dataStates", src: "States.json" },
    { name: "$dataAnimations", src: "Animations.json" },
    { name: "$dataTilesets", src: "Tilesets.json" },
    { name: "$dataCommonEvents", src: "CommonEvents.json" },
    { name: "$dataSystem", src: "System.json" },
    { name: "$dataMapInfos", src: "MapInfos.json" }
  ];

  static loadGlobalInfo() {
    StorageManager.loadObject("global")
      .then(a => {
        this._globalInfo = a;
        this.removeInvalidGlobalInfo();
        return 0;
      })
      .catch(() => {
        this._globalInfo = [];
      });
  }

  static removeInvalidGlobalInfo() {
    const a = this._globalInfo;
    for (const e of a) {
      const t = a.indexOf(e);
      if (!this.savefileExists(t)) {
        delete a[t];
      }
    }
  }

  static saveGlobalInfo() {
    StorageManager.saveObject("global", this._globalInfo);
  }

  static isGlobalInfoLoaded() {
    return !!this._globalInfo;
  }

  static loadDatabase() {
    const a = this.isBattleTest() || this.isEventTest() ? "Test_" : "";
    for (const e of this._databaseFiles) {
      this.loadDataFile(e.name, a + e.src);
    }
    if (this.isEventTest()) {
      this.loadDataFile("$testEvent", a + "Event.json");
    }
  }

  static loadDataFile(name, src) {
    const t = new XMLHttpRequest();
    const n = "data/" + src;
    window[name] = null;
    t.open("GET", n);
    t.overrideMimeType("application/json");
    t.onload = () => this.onXhrLoad(t, name, src, n);
    t.onerror = () => this.onXhrError(name, src, n);
    t.send();
  }

  static onXhrLoad(t, name, src, url) {
    if (t.status < 400) {
      window[name] = JSON.parse(t.responseText);
      this.onLoad(window[name]);
    } else {
      this.onXhrError(name, src, url);
    }
  }

  static onXhrError(name, src, url) {
    const n = { name: name, src: src, url: url };
    this._errors.push(n);
  }

  static isDatabaseLoaded() {
    this.checkError();
    for (const a of this._databaseFiles) {
      if (!window[a.name]) return false;
    }
    return true;
  }

  static loadMapData(mapId: number) {
    if (mapId > 0) {
      const e = "Map%1.json".format(mapId.padZero(3));
      this.loadDataFile("$dataMap", e);
    } else {
      this.makeEmptyMap();
    }
  }

  static makeEmptyMap() {
    $dataMap = {} as DataMap;
    $dataMap.data = [];
    $dataMap.events = [];
    $dataMap.width = 100;
    $dataMap.height = 100;
    $dataMap.scrollType = 3;
  }

  static isMapLoaded() {
    this.checkError();
    return !!$dataMap;
  }

  static onLoad(a) {
    if (this.isMapObject(a)) {
      this.extractMetadata(a);
      this.extractArrayMetadata(a.events);
    } else {
      this.extractArrayMetadata(a);
    }
  }

  static isMapObject(a) {
    return !(!a.data || !a.events);
  }

  static extractArrayMetadata(a) {
    if (Array.isArray(a)) {
      for (const e of a) {
        if (e && "note" in e) {
          this.extractMetadata(e);
        }
      }
    }
  }

  static extractMetadata(a) {
    const e = /<([^<>:]+)(:?)([^>]*)>/g;
    a.meta = {};
    for (; ;) {
      const t = e.exec(a.note);
      if (!t) break;
      if (t[2] === ":") {
        a.meta[t[1]] = t[3];
      } else {
        a.meta[t[1]] = true;
      }
    }
  }

  static checkError() {
    if (this._errors.length > 0) {
      const a = this._errors.shift();
      const e = () => { this.loadDataFile(a.name, a.src); };
      throw ["LoadError", a.url, e];
    }
  }

  static isBattleTest() {
    return Utils.isOptionValid("btest");
  }

  static isEventTest() {
    return Utils.isOptionValid("etest");
  }

  static isTitleSkip() {
    return Utils.isOptionValid("tskip");
  }

  static isSkill(a: Database.Item | Database.Weapon | Database.Armor | Database.Skill): a is Database.Skill {
    return a && $dataSkills.includes(a as Database.Skill);
  }

  static isItem(a: Database.Item | Database.Weapon | Database.Armor | Database.Skill): a is Database.Item {
    return a && $dataItems.includes(a as Database.Item);
  }

  static isWeapon(a: Database.Item | Database.Weapon | Database.Armor | Database.Skill): a is Database.Weapon {
    return a && $dataWeapons.includes(a as Database.Weapon);
  }

  static isArmor(a: Database.Item | Database.Weapon | Database.Armor | Database.Skill): a is Database.Armor {
    return a && $dataArmors.includes(a as Database.Armor);
  }

  static createGameObjects() {
    $gameTemp = new Game_Temp();
    $gameSystem = new Game_System();
    $gameScreen = new Game_Screen();
    $gameTimer = new Game_Timer();
    $gameMessage = new Game_Message();
    $gameSwitches = new Game_Switches();
    $gameVariables = new Game_Variables();
    $gameSelfSwitches = new Game_SelfSwitches();
    $gameActors = new Game_Actors();
    $gameParty = new Game_Party();
    $gameTroop = new Game_Troop();
    $gameMap = new Game_Map();
    $gamePlayer = new Game_Player();
  }

  static setupNewGame() {
    this.createGameObjects();
    this.selectSavefileForNewGame();
    $gameParty.setupStartingMembers();
    $gamePlayer.setupForNewGame();
    Graphics.frameCount = 0;
  }

  static setupBattleTest() {
    this.createGameObjects();
    $gameParty.setupBattleTest();
    BattleManager.setup($dataSystem.testTroopId, true, false);
    BattleManager.setBattleTest(true);
    BattleManager.playBattleBgm();
  }

  static setupEventTest() {
    this.createGameObjects();
    this.selectSavefileForNewGame();
    $gameParty.setupStartingMembers();
    $gamePlayer.reserveTransfer(-1, 8, 6);
    $gamePlayer.setTransparent(false);
  }

  static isAnySavefileExists() {
    return this._globalInfo.some(a => a);
  }

  static latestSavefileId() {
    const a = this._globalInfo;
    const e = a.slice(1).filter(a => a);
    const t = Math.max(...e.map(a => a.timestamp));
    const n = a.findIndex(a => a && a.timestamp === t);
    return n > 0 ? n : 0;
  }

  static earliestSavefileId() {
    const a = this._globalInfo;
    const e = a.slice(1).filter(a => a);
    const t = Math.min(...e.map(a => a.timestamp));
    const n = a.findIndex(a => a && a.timestamp === t);
    return n > 0 ? n : 0;
  }

  static emptySavefileId() {
    const a = this._globalInfo;
    const e = this.maxSavefiles();
    if (a.length < e) return Math.max(1, a.length);
    else {
      const idx = a.slice(1).findIndex(a => !a);
      return idx >= 0 ? idx + 1 : -1;
    }
  }

  static loadAllSavefileImages() {
    for (const a of this._globalInfo.filter(a => a)) {
      this.loadSavefileImages(a);
    }
  }

  static loadSavefileImages(a) {
    if (a.characters && Symbol.iterator in a.characters) {
      for (const e of a.characters) {
        ImageManager.loadCharacter(e[0]);
      }
    }
    if (a.faces && Symbol.iterator in a.faces) {
      for (const e of a.faces) {
        ImageManager.loadFace(e[0]);
      }
    }
  }

  static maxSavefiles() {
    return 20;
  }

  static savefileInfo(a) {
    const e = this._globalInfo;
    return e[a] ? e[a] : null;
  }

  static savefileExists(a) {
    const e = this.makeSavename(a);
    return StorageManager.exists(e);
  }

  static saveGame(a) {
    const e = this.makeSaveContents();
    const t = this.makeSavename(a);
    return StorageManager.saveObject(t, e).then(() => {
      this._globalInfo[a] = this.makeSavefileInfo();
      this.saveGlobalInfo();
      return 0;
    });
  }

  static loadGame(a) {
    const e = this.makeSavename(a);
    return StorageManager.loadObject(e).then(a => {
      this.createGameObjects();
      this.extractSaveContents(a);
      this.correctDataErrors();
      return 0;
    });
  }

  static makeSavename(a) {
    return "file%1".format(a);
  }

  static selectSavefileForNewGame() {
    const a = this.emptySavefileId();
    const e = this.earliestSavefileId();
    a > 0 ? $gameSystem.setSavefileId(a) : $gameSystem.setSavefileId(e);
  }

  static makeSavefileInfo() {
    const a = {};
    a.title = $dataSystem.gameTitle;
    a.characters = $gameParty.charactersForSavefile();
    a.faces = $gameParty.facesForSavefile();
    a.playtime = $gameSystem.playtimeText();
    a.timestamp = Date.now();
    return a;
  }

  static makeSaveContents() {
    const a = {};
    a.system = $gameSystem;
    a.screen = $gameScreen;
    a.timer = $gameTimer;
    a.switches = $gameSwitches;
    a.variables = $gameVariables;
    a.selfSwitches = $gameSelfSwitches;
    a.actors = $gameActors;
    a.party = $gameParty;
    a.map = $gameMap;
    a.player = $gamePlayer;
    return a;
  }

  static extractSaveContents(a) {
    try {
      $gameSystem = DataManager._restoreInstance(new Game_System(), a.system);
      $gameScreen = DataManager._restoreInstance(new Game_Screen(), a.screen);
      $gameTimer = DataManager._restoreInstance(new Game_Timer(), a.timer);
      $gameSwitches = DataManager._restoreInstance(new Game_Switches(), a.switches);
      $gameVariables = DataManager._restoreInstance(new Game_Variables(), a.variables);
      $gameSelfSwitches = DataManager._restoreInstance(new Game_SelfSwitches(), a.selfSwitches);
      $gameActors = DataManager._restoreInstance(new Game_Actors(), a.actors);
      $gameParty = DataManager._restoreInstance(new Game_Party(), a.party);
      $gameMap = DataManager._restoreInstance(new Game_Map(), a.map);
      $gamePlayer = DataManager._restoreInstance(new Game_Player(), a.player);
    } catch (e) {
      throw SceneManager.catchException(e), new Error("Cannot load savefile");
    }
  }

  static correctDataErrors() {
    $gameParty.removeInvalidMembers();
  }
}
