//=============================================================================
// rmmz_managers.js v1.9.0
//=============================================================================

$dataActors = null;
$dataClasses = null;
$dataSkills = null;
$dataItems = null;
$dataWeapons = null;
$dataArmors = null;
$dataEnemies = null;
$dataTroops = null;
$dataStates = null;
$dataAnimations = null;
$dataTilesets = null;
$dataCommonEvents = null;
$dataSystem = null;
$dataMapInfos = null;
$dataMap = null;
$gameTemp = null;
$gameSystem = null;
$gameScreen = null;
$gameTimer = null;
$gameMessage = null;
$gameSwitches = null;
$gameVariables = null;
$gameSelfSwitches = null;
$gameActors = null;
$gameParty = null;
$gameTroop = null;
$gameMap = null;
$gamePlayer = null;
$testEvent = null;

//-----------------------------------------------------------------------------
// DataManager
//
// The static class that manages the database and game objects.
class DataManager {
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

  static loadMapData(mapId) {
    if (mapId > 0) {
      const e = "Map%1.json".format(mapId.padZero(3));
      this.loadDataFile("$dataMap", e);
    } else {
      this.makeEmptyMap();
    }
  }

  static makeEmptyMap() {
    $dataMap = {};
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

  static isSkill(a) {
    return a && $dataSkills.includes(a);
  }

  static isItem(a) {
    return a && $dataItems.includes(a);
  }

  static isWeapon(a) {
    return a && $dataWeapons.includes(a);
  }

  static isArmor(a) {
    return a && $dataArmors.includes(a);
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

//-----------------------------------------------------------------------------
// ConfigManager
//
// The static class that manages the configuration data.
class ConfigManager {
  constructor() {
    throw new Error("This is a static class");
  }

  static get bgmVolume() {
    return AudioManager._bgmVolume;
  }
  static set bgmVolume(value) {
    AudioManager.bgmVolume = value;
  }

  static get bgsVolume() {
    return AudioManager.bgsVolume;
  }
  static set bgsVolume(value) {
    AudioManager.bgsVolume = value;
  }

  static get meVolume() {
    return AudioManager.meVolume;
  }
  static set meVolume(value) {
    AudioManager.meVolume = value;
  }

  static get seVolume() {
    return AudioManager.seVolume;
  }
  static set seVolume(value) {
    AudioManager.seVolume = value;
  }

  static load() {
    StorageManager.loadObject("config")
      .then((config) => this.applyData(config || {}))
      .catch(() => 0)
      .then(() => {
        this._isLoaded = true;
        return 0;
      })
      .catch(() => 0);
  }

  static save() {
    StorageManager.saveObject("config", this.makeData());
  }

  static isLoaded() {
    return this._isLoaded;
  }

  static makeData() {
    const config = {};
    config.alwaysDash = this.alwaysDash;
    config.commandRemember = this.commandRemember;
    config.touchUI = this.touchUI;
    config.bgmVolume = this.bgmVolume;
    config.bgsVolume = this.bgsVolume;
    config.meVolume = this.meVolume;
    config.seVolume = this.seVolume;
    return config;
  }

  static applyData(config) {
    this.alwaysDash = this.readFlag(config, "alwaysDash", false);
    this.commandRemember = this.readFlag(config, "commandRemember", false);
    this.touchUI = this.readFlag(config, "touchUI", true);
    this.bgmVolume = this.readVolume(config, "bgmVolume");
    this.bgsVolume = this.readVolume(config, "bgsVolume");
    this.meVolume = this.readVolume(config, "meVolume");
    this.seVolume = this.readVolume(config, "seVolume");
  }

  static readFlag(config, name, defaultValue) {
    if (name in config) {
      return !!config[name];
    } else {
      return defaultValue;
    }
  }

  static readVolume(config, name) {
    if (name in config) {
      return Number(config[name]).clamp(0, 100);
    } else {
      return 100;
    }
  }
}

ConfigManager.alwaysDash = false;
ConfigManager.commandRemember = false;
ConfigManager.touchUI = true;
ConfigManager._isLoaded = false;

//-----------------------------------------------------------------------------
// StorageManager
//
// The static class that manages storage for saving game data.
class StorageManager {
  constructor() {
    throw new Error("This is a static class");
  }

  static _forageKeys = [];
  static _forageKeysUpdated = false;

  static isLocalMode() {
    return Utils.isNwjs();
  }

  static saveObject(saveName, object) {
    return this.objectToJson(object)
      .then((json) => this.jsonToZip(json))
      .then((zip) => this.saveZip(saveName, zip));
  }

  static loadObject(saveName) {
    return this.loadZip(saveName)
      .then((zip) => this.zipToJson(zip))
      .then((json) => this.jsonToObject(json));
  }

  static objectToJson(object) {
    return new Promise((resolve, reject) => {
      try {
        const json = JsonEx.stringify(object);
        resolve(json);
      } catch (e) {
        reject(e);
      }
    });
  }

  static jsonToObject(json) {
    return new Promise((resolve, reject) => {
      try {
        const object = JsonEx.parse(json);
        resolve(object);
      } catch (e) {
        reject(e);
      }
    });
  }

  static jsonToZip(json) {
    return new Promise((resolve, reject) => {
      try {
        const zip = pako.deflate(json, { to: "string", level: 1 });
        if (zip.length >= 50000) {
          console.warn("Save data is too big.");
        }
        resolve(zip);
      } catch (e) {
        reject(e);
      }
    });
  }

  static zipToJson(zip) {
    return new Promise((resolve, reject) => {
      try {
        if (zip) {
          const json = pako.inflate(zip, { to: "string" });
          resolve(json);
        } else {
          resolve("null");
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  static saveZip(saveName, zip) {
    if (this.isLocalMode()) {
      return this.saveToLocalFile(saveName, zip);
    } else {
      return this.saveToForage(saveName, zip);
    }
  }

  static loadZip(saveName) {
    if (this.isLocalMode()) {
      return this.loadFromLocalFile(saveName);
    } else {
      return this.loadFromForage(saveName);
    }
  }

  static exists(saveName) {
    if (this.isLocalMode()) {
      return this.localFileExists(saveName);
    } else {
      return this.forageExists(saveName);
    }
  }

  static remove(saveName) {
    if (this.isLocalMode()) {
      return this.removeLocalFile(saveName);
    } else {
      return this.removeForage(saveName);
    }
  }

  static saveToLocalFile(saveName, zip) {
    const dirPath = this.fileDirectoryPath();
    const filePath = this.filePath(saveName);
    const backupFilePath = filePath + "_";
    return new Promise((resolve, reject) => {
      this.fsMkdir(dirPath);
      this.fsUnlink(backupFilePath);
      this.fsRename(filePath, backupFilePath);
      try {
        this.fsWriteFile(filePath, zip);
        this.fsUnlink(backupFilePath);
        resolve();
      } catch (e) {
        try {
          this.fsUnlink(filePath);
          this.fsRename(backupFilePath, filePath);
        } catch (e2) {
          //
        }
        reject(e);
      }
    });
  }

  static loadFromLocalFile(saveName) {
    const filePath = this.filePath(saveName);
    return new Promise((resolve, reject) => {
      const data = this.fsReadFile(filePath);
      if (data) {
        resolve(data);
      } else {
        reject(new Error("Savefile not found"));
      }
    });
  }

  static localFileExists(saveName) {
    const fs = require("fs");
    return fs.existsSync(this.filePath(saveName));
  }

  static removeLocalFile(saveName) {
    this.fsUnlink(this.filePath(saveName));
  }

  static saveToForage(saveName, zip) {
    const key = this.forageKey(saveName);
    const testKey = this.forageTestKey();
    setTimeout(() => localforage.removeItem(testKey));
    return localforage
      .setItem(testKey, zip)
      .then(() => localforage.setItem(key, zip))
      .then(() => this.updateForageKeys());
  }

  static loadFromForage(saveName) {
    const key = this.forageKey(saveName);
    return localforage.getItem(key);
  }

  static forageExists(saveName) {
    const key = this.forageKey(saveName);
    return this._forageKeys.includes(key);
  }

  static removeForage(saveName) {
    const key = this.forageKey(saveName);
    return localforage.removeItem(key).then(() => this.updateForageKeys());
  }

  static updateForageKeys() {
    this._forageKeysUpdated = false;
    return localforage.keys().then((keys) => {
      this._forageKeys = keys;
      this._forageKeysUpdated = true;
      return 0;
    });
  }

  static forageKeysUpdated() {
    return this._forageKeysUpdated;
  }

  static fsMkdir(path) {
    const fs = require("fs");
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path);
    }
  }

  static fsRename(oldPath, newPath) {
    const fs = require("fs");
    if (fs.existsSync(oldPath)) {
      fs.renameSync(oldPath, newPath);
    }
  }

  static fsUnlink(path) {
    const fs = require("fs");
    if (fs.existsSync(path)) {
      fs.unlinkSync(path);
    }
  }

  static fsReadFile(path) {
    const fs = require("fs");
    if (fs.existsSync(path)) {
      return fs.readFileSync(path, { encoding: "utf8" });
    } else {
      return null;
    }
  }

  static fsWriteFile(path, data) {
    const fs = require("fs");
    fs.writeFileSync(path, data);
  }

  static fileDirectoryPath() {
    const path = require("path");
    const base = path.dirname(process.mainModule.filename);
    return path.join(base, "save/");
  }

  static filePath(saveName) {
    const dir = this.fileDirectoryPath();
    return dir + saveName + ".rmmzsave";
  }

  static forageKey(saveName) {
    const gameId = $dataSystem.advanced.gameId;
    return "rmmzsave." + gameId + "." + saveName;
  }

  static forageTestKey() {
    return "rmmzsave.test";
  }
}

//-----------------------------------------------------------------------------
// FontManager
//
// The static class that loads font files.
class FontManager {
  constructor() {
    throw new Error("This is a static class");
  }

  static _urls = {};
  static _states = {};

  static load(family, filename) {
    if (this._states[family] !== "loaded") {
      if (filename) {
        const url = this.makeUrl(filename);
        this.startLoading(family, url);
      } else {
        this._urls[family] = "";
        this._states[family] = "loaded";
      }
    }
  }

  static isReady() {
    for (const family in this._states) {
      const state = this._states[family];
      if (state === "loading") {
        return false;
      }
      if (state === "error") {
        this.throwLoadError(family);
      }
    }
    return true;
  }

  static startLoading(family, url) {
    const source = "url(" + url + ")";
    const font = new FontFace(family, source);
    this._urls[family] = url;
    this._states[family] = "loading";
    font
      .load()
      .then(() => {
        document.fonts.add(font);
        this._states[family] = "loaded";
        return 0;
      })
      .catch(() => {
        this._states[family] = "error";
      });
  }

  static throwLoadError(family) {
    const url = this._urls[family];
    const retry = () => this.startLoading(family, url);
    throw ["LoadError", url, retry];
  }

  static makeUrl(filename) {
    return "fonts/" + Utils.encodeURI(filename);
  }
}

//-----------------------------------------------------------------------------
// ImageManager
//
// The static class that loads images, creates bitmap objects and retains them.
class ImageManager {
  constructor() {
    throw new Error("This is a static class");
  }

  static standardIconWidth = 32;
  static standardIconHeight = 32;
  static standardFaceWidth = 144;
  static standardFaceHeight = 144;

  static _cache = {};
  static _system = {};
  static _emptyBitmap = new Bitmap(1, 1);

  static get iconWidth() {
    return this.getIconSize();
  }

  static get iconHeight() {
    return this.getIconSize();
  }

  static get faceWidth() {
    return this.getFaceSize();
  }

  static get faceHeight() {
    return this.getFaceSize();
  }

  static getIconSize() {
    if ("iconSize" in $dataSystem) {
      return $dataSystem.iconSize;
    } else {
      return this.standardIconWidth;
    }
  }

  static getFaceSize() {
    if ("faceSize" in $dataSystem) {
      return $dataSystem.faceSize;
    } else {
      return this.standardFaceWidth;
    }
  }

  static loadAnimation(filename) {
    return this.loadBitmap("img/animations/", filename);
  }

  static loadBattleback1(filename) {
    return this.loadBitmap("img/battlebacks1/", filename);
  }

  static loadBattleback2(filename) {
    return this.loadBitmap("img/battlebacks2/", filename);
  }

  static loadEnemy(filename) {
    return this.loadBitmap("img/enemies/", filename);
  }

  static loadCharacter(filename) {
    return this.loadBitmap("img/characters/", filename);
  }

  static loadFace(filename) {
    return this.loadBitmap("img/faces/", filename);
  }

  static loadParallax(filename) {
    return this.loadBitmap("img/parallaxes/", filename);
  }

  static loadPicture(filename) {
    return this.loadBitmap("img/pictures/", filename);
  }

  static loadSvActor(filename) {
    return this.loadBitmap("img/sv_actors/", filename);
  }

  static loadSvEnemy(filename) {
    return this.loadBitmap("img/sv_enemies/", filename);
  }

  static loadSystem(filename) {
    return this.loadBitmap("img/system/", filename);
  }

  static loadTileset(filename) {
    return this.loadBitmap("img/tilesets/", filename);
  }

  static loadTitle1(filename) {
    return this.loadBitmap("img/titles1/", filename);
  }

  static loadTitle2(filename) {
    return this.loadBitmap("img/titles2/", filename);
  }

  static loadBitmap(folder, filename) {
    if (filename) {
      const url = folder + Utils.encodeURI(filename) + ".png";
      return this.loadBitmapFromUrl(url);
    } else {
      return this._emptyBitmap;
    }
  }

  static loadBitmapFromUrl(url) {
    const cache = url.includes("/system/") ? this._system : this._cache;
    if (!cache[url]) {
      cache[url] = Bitmap.load(url);
    }
    return cache[url];
  }

  static clear() {
    const cache = this._cache;
    for (const url in cache) {
      cache[url].destroy();
    }
    this._cache = {};
  }

  static isReady() {
    for (const cache of [this._cache, this._system]) {
      for (const url in cache) {
        const bitmap = cache[url];
        if (bitmap.isError()) {
          this.throwLoadError(bitmap);
        }
        if (!bitmap.isReady()) {
          return false;
        }
      }
    }
    return true;
  }

  static throwLoadError(bitmap) {
    const retry = bitmap.retry.bind(bitmap);
    throw ["LoadError", bitmap.url, retry];
  }

  static isObjectCharacter(filename) {
    const sign = Utils.extractFileName(filename).match(/^[!$]+/);
    return sign && sign[0].includes("!");
  }

  static isBigCharacter(filename) {
    const sign = Utils.extractFileName(filename).match(/^[!$]+/);
    return sign && sign[0].includes("$");
  }

  static isZeroParallax(filename) {
    return Utils.extractFileName(filename).charAt(0) === "!";
  }
}

//-----------------------------------------------------------------------------
// EffectManager
//
// The static class that loads Effekseer effects.
class EffectManager {
  constructor() {
    throw new Error("This is a static class");
  }

  static _cache = {};
  static _errorUrls = [];

  static load(filename) {
    if (filename) {
      const url = this.makeUrl(filename);
      const cache = this._cache;
      if (!cache[url] && Graphics.effekseer) {
        this.startLoading(url);
      }
      return cache[url];
    } else {
      return null;
    }
  }

  static startLoading(url) {
    const onLoad = () => this.onLoad(url);
    const onError = (message, url) => this.onError(url);
    const effect = Graphics.effekseer.loadEffect(url, 1, onLoad, onError);
    this._cache[url] = effect;
    return effect;
  }

  static clear() {
    for (const url in this._cache) {
      const effect = this._cache[url];
      Graphics.effekseer.releaseEffect(effect);
    }
    this._cache = {};
  }

  static onLoad(/*url*/) {
    //
  }

  static onError(url) {
    this._errorUrls.push(url);
  }

  static makeUrl(filename) {
    return "effects/" + Utils.encodeURI(filename) + ".efkefc";
  }

  static checkErrors() {
    const url = this._errorUrls.shift();
    if (url) {
      this.throwLoadError(url);
    }
  }

  static throwLoadError(url) {
    const retry = () => this.startLoading(url);
    throw ["LoadError", url, retry];
  }

  static isReady() {
    this.checkErrors();
    for (const url in this._cache) {
      const effect = this._cache[url];
      if (!effect.isLoaded) {
        return false;
      }
    }
    return true;
  }
}

//-----------------------------------------------------------------------------
// AudioManager
//
// The static class that handles BGM, BGS, ME and SE.
class AudioManager {
  constructor() {
    throw new Error("This is a static class");
  }

  static _bgmVolume = 100;
  static _bgsVolume = 100;
  static _meVolume = 100;
  static _seVolume = 100;
  static _currentBgm = null;
  static _currentBgs = null;
  static _bgmBuffer = null;
  static _bgsBuffer = null;
  static _meBuffer = null;
  static _seBuffers = [];
  static _staticBuffers = [];
  static _replayFadeTime = 0.5;
  static _path = "audio/";

  static get bgmVolume() {
    return this._bgmVolume;
  }
  static set bgmVolume(value) {
    this._bgmVolume = value;
    this.updateBgmParameters(this._currentBgm);
  }

  static get bgsVolume() {
    return this._bgsVolume;
  }
  static set bgsVolume(value) {
    this._bgsVolume = value;
    this.updateBgsParameters(this._currentBgs);
  }

  static get meVolume() {
    return this._meVolume;
  }
  static set meVolume(value) {
    this._meVolume = value;
    this.updateMeParameters(this._currentMe);
  }

  static get seVolume() {
    return this._seVolume;
  }
  static set seVolume(value) {
    this._seVolume = value;
  }

  static playBgm(bgm, pos) {
    if (this.isCurrentBgm(bgm)) {
      this.updateBgmParameters(bgm);
    } else {
      this.stopBgm();
      if (bgm.name) {
        this._bgmBuffer = this.createBuffer("bgm/", bgm.name);
        this.updateBgmParameters(bgm);
        if (!this._meBuffer) {
          this._bgmBuffer.play(true, pos || 0);
        }
      }
    }
    this.updateCurrentBgm(bgm, pos);
  }

  static replayBgm(bgm) {
    if (this.isCurrentBgm(bgm)) {
      this.updateBgmParameters(bgm);
    } else {
      this.playBgm(bgm, bgm.pos);
      if (this._bgmBuffer) {
        this._bgmBuffer.fadeIn(this._replayFadeTime);
      }
    }
  }

  static isCurrentBgm(bgm) {
    return (
      this._currentBgm &&
      this._bgmBuffer &&
      this._currentBgm.name === bgm.name
    );
  }

  static updateBgmParameters(bgm) {
    this.updateBufferParameters(this._bgmBuffer, this._bgmVolume, bgm);
  }

  static updateCurrentBgm(bgm, pos) {
    this._currentBgm = {
      name: bgm.name,
      volume: bgm.volume,
      pitch: bgm.pitch,
      pan: bgm.pan,
      pos: pos,
    };
  }

  static stopBgm() {
    if (this._bgmBuffer) {
      this._bgmBuffer.destroy();
      this._bgmBuffer = null;
      this._currentBgm = null;
    }
  }

  static fadeOutBgm(duration) {
    if (this._bgmBuffer && this._currentBgm) {
      this._bgmBuffer.fadeOut(duration);
      this._currentBgm = null;
    }
  }

  static fadeInBgm(duration) {
    if (this._bgmBuffer && this._currentBgm) {
      this._bgmBuffer.fadeIn(duration);
    }
  }

  static playBgs(bgs, pos) {
    if (this.isCurrentBgs(bgs)) {
      this.updateBgsParameters(bgs);
    } else {
      this.stopBgs();
      if (bgs.name) {
        this._bgsBuffer = this.createBuffer("bgs/", bgs.name);
        this.updateBgsParameters(bgs);
        this._bgsBuffer.play(true, pos || 0);
      }
    }
    this.updateCurrentBgs(bgs, pos);
  }

  static replayBgs(bgs) {
    if (this.isCurrentBgs(bgs)) {
      this.updateBgsParameters(bgs);
    } else {
      this.playBgs(bgs, bgs.pos);
      if (this._bgsBuffer) {
        this._bgsBuffer.fadeIn(this._replayFadeTime);
      }
    }
  }

  static isCurrentBgs(bgs) {
    return (
      this._currentBgs &&
      this._bgsBuffer &&
      this._currentBgs.name === bgs.name
    );
  }

  static updateBgsParameters(bgs) {
    this.updateBufferParameters(this._bgsBuffer, this._bgsVolume, bgs);
  }

  static updateCurrentBgs(bgs, pos) {
    this._currentBgs = {
      name: bgs.name,
      volume: bgs.volume,
      pitch: bgs.pitch,
      pan: bgs.pan,
      pos: pos,
    };
  }

  static stopBgs() {
    if (this._bgsBuffer) {
      this._bgsBuffer.destroy();
      this._bgsBuffer = null;
      this._currentBgs = null;
    }
  }

  static fadeOutBgs(duration) {
    if (this._bgsBuffer && this._currentBgs) {
      this._bgsBuffer.fadeOut(duration);
      this._currentBgs = null;
    }
  }

  static fadeInBgs(duration) {
    if (this._bgsBuffer && this._currentBgs) {
      this._bgsBuffer.fadeIn(duration);
    }
  }

  static playMe(me) {
    this.stopMe();
    if (me.name) {
      if (this._bgmBuffer && this._currentBgm) {
        this._currentBgm.pos = this._bgmBuffer.seek();
        this._bgmBuffer.stop();
      }
      this._meBuffer = this.createBuffer("me/", me.name);
      this.updateMeParameters(me);
      this._meBuffer.play(false);
      this._meBuffer.addStopListener(this.stopMe.bind(this));
    }
  }

  static updateMeParameters(me) {
    this.updateBufferParameters(this._meBuffer, this._meVolume, me);
  }

  static fadeOutMe(duration) {
    if (this._meBuffer) {
      this._meBuffer.fadeOut(duration);
    }
  }

  static stopMe() {
    if (this._meBuffer) {
      this._meBuffer.destroy();
      this._meBuffer = null;
      if (this._bgmBuffer && this._currentBgm && !this._bgmBuffer.isPlaying()) {
        this._bgmBuffer.play(true, this._currentBgm.pos);
        this._bgmBuffer.fadeIn(this._replayFadeTime);
      }
    }
  }

  static playSe(se) {
    if (se.name) {
      // [Note] Do not play the same sound in the same frame.
      const latestBuffers = this._seBuffers.filter(
        (buffer) => buffer.frameCount === Graphics.frameCount
      );
      if (latestBuffers.find((buffer) => buffer.name === se.name)) {
        return;
      }
      const buffer = this.createBuffer("se/", se.name);
      this.updateSeParameters(buffer, se);
      buffer.play(false);
      this._seBuffers.push(buffer);
      this.cleanupSe();
    }
  }

  static updateSeParameters(buffer, se) {
    this.updateBufferParameters(buffer, this._seVolume, se);
  }

  static cleanupSe() {
    for (const buffer of this._seBuffers) {
      if (!buffer.isPlaying()) {
        buffer.destroy();
      }
    }
    this._seBuffers = this._seBuffers.filter((buffer) => buffer.isPlaying());
  }

  static stopSe() {
    for (const buffer of this._seBuffers) {
      buffer.destroy();
    }
    this._seBuffers = [];
  }

  static playStaticSe(se) {
    if (se.name) {
      this.loadStaticSe(se);
      for (const buffer of this._staticBuffers) {
        if (buffer.name === se.name) {
          buffer.stop();
          this.updateSeParameters(buffer, se);
          buffer.play(false);
          break;
        }
      }
    }
  }

  static loadStaticSe(se) {
    if (se.name && !this.isStaticSe(se)) {
      const buffer = this.createBuffer("se/", se.name);
      this._staticBuffers.push(buffer);
    }
  }

  static isStaticSe(se) {
    for (const buffer of this._staticBuffers) {
      if (buffer.name === se.name) {
        return true;
      }
    }
    return false;
  }

  static stopAll() {
    this.stopMe();
    this.stopBgm();
    this.stopBgs();
    this.stopSe();
  }

  static saveBgm() {
    if (this._currentBgm) {
      const bgm = this._currentBgm;
      return {
        name: bgm.name,
        volume: bgm.volume,
        pitch: bgm.pitch,
        pan: bgm.pan,
        pos: this._bgmBuffer ? this._bgmBuffer.seek() : 0,
      };
    } else {
      return this.makeEmptyAudioObject();
    }
  }

  static saveBgs() {
    if (this._currentBgs) {
      const bgs = this._currentBgs;
      return {
        name: bgs.name,
        volume: bgs.volume,
        pitch: bgs.pitch,
        pan: bgs.pan,
        pos: this._bgsBuffer ? this._bgsBuffer.seek() : 0,
      };
    } else {
      return this.makeEmptyAudioObject();
    }
  }

  static makeEmptyAudioObject() {
    return { name: "", volume: 0, pitch: 0 };
  }

  static createBuffer(folder, name) {
    const ext = this.audioFileExt();
    const url = this._path + folder + Utils.encodeURI(name) + ext;
    const buffer = new WebAudio(url);
    buffer.name = name;
    buffer.frameCount = Graphics.frameCount;
    return buffer;
  }

  static updateBufferParameters(buffer, configVolume, audio) {
    if (buffer && audio) {
      buffer.volume = (configVolume * (audio.volume || 0)) / 10000;
      buffer.pitch = (audio.pitch || 0) / 100;
      buffer.pan = (audio.pan || 0) / 100;
    }
  }

  static audioFileExt() {
    return ".ogg";
  }

  static checkErrors() {
    const buffers = [this._bgmBuffer, this._bgsBuffer, this._meBuffer];
    buffers.push(...this._seBuffers);
    buffers.push(...this._staticBuffers);
    for (const buffer of buffers) {
      if (buffer && buffer.isError()) {
        this.throwLoadError(buffer);
      }
    }
  }

  static throwLoadError(webAudio) {
    const retry = webAudio.retry.bind(webAudio);
    throw ["LoadError", webAudio.url, retry];
  }
}

//-----------------------------------------------------------------------------
// SoundManager
//
// The static class that plays sound effects defined in the database.
class SoundManager {
  constructor() {
    throw new Error("This is a static class");
  }

  static preloadImportantSounds() {
    this.loadSystemSound(0);
    this.loadSystemSound(1);
    this.loadSystemSound(2);
    this.loadSystemSound(3);
  }

  static loadSystemSound(n) {
    if ($dataSystem) {
      AudioManager.loadStaticSe($dataSystem.sounds[n]);
    }
  }

  static playSystemSound(n) {
    if ($dataSystem) {
      AudioManager.playStaticSe($dataSystem.sounds[n]);
    }
  }

  static playCursor() {
    this.playSystemSound(0);
  }

  static playOk() {
    this.playSystemSound(1);
  }

  static playCancel() {
    this.playSystemSound(2);
  }

  static playBuzzer() {
    this.playSystemSound(3);
  }

  static playEquip() {
    this.playSystemSound(4);
  }

  static playSave() {
    this.playSystemSound(5);
  }

  static playLoad() {
    this.playSystemSound(6);
  }

  static playBattleStart() {
    this.playSystemSound(7);
  }

  static playEscape() {
    this.playSystemSound(8);
  }

  static playEnemyAttack() {
    this.playSystemSound(9);
  }

  static playEnemyDamage() {
    this.playSystemSound(10);
  }

  static playEnemyCollapse() {
    this.playSystemSound(11);
  }

  static playBossCollapse1() {
    this.playSystemSound(12);
  }

  static playBossCollapse2() {
    this.playSystemSound(13);
  }

  static playActorDamage() {
    this.playSystemSound(14);
  }

  static playActorCollapse() {
    this.playSystemSound(15);
  }

  static playRecovery() {
    this.playSystemSound(16);
  }

  static playMiss() {
    this.playSystemSound(17);
  }

  static playEvasion() {
    this.playSystemSound(18);
  }

  static playMagicEvasion() {
    this.playSystemSound(19);
  }

  static playReflection() {
    this.playSystemSound(20);
  }

  static playShop() {
    this.playSystemSound(21);
  }

  static playUseItem() {
    this.playSystemSound(22);
  }

  static playUseSkill() {
    this.playSystemSound(23);
  }
}

//-----------------------------------------------------------------------------
// TextManager
//
// The static class that handles terms and messages.
class TextManager {
  constructor() {
    throw new Error("This is a static class");
  }

  static basic(basicId) {
    return $dataSystem.terms.basic[basicId] || "";
  }

  static param(paramId) {
    return $dataSystem.terms.params[paramId] || "";
  }

  static command(commandId) {
    return $dataSystem.terms.commands[commandId] || "";
  }

  static message(messageId) {
    return $dataSystem.terms.messages[messageId] || "";
  }

  static getter(method, param) {
    return {
      get: function () {
        return this[method](param);
      },
      configurable: true,
    };
  }

  static get currencyUnit() {
    return $dataSystem.currencyUnit;
  }

  static get level() {
    return this.basic(0);
  }

  static get levelA() {
    return this.basic(1);
  }

  static get hp() {
    return this.basic(2);
  }

  static get hpA() {
    return this.basic(3);
  }

  static get mp() {
    return this.basic(4);
  }

  static get mpA() {
    return this.basic(5);
  }

  static get tp() {
    return this.basic(6);
  }

  static get tpA() {
    return this.basic(7);
  }

  static get exp() {
    return this.basic(8);
  }

  static get expA() {
    return this.basic(9);
  }

  static get fight() {
    return this.command(0);
  }

  static get escape() {
    return this.command(1);
  }

  static get attack() {
    return this.command(2);
  }

  static get guard() {
    return this.command(3);
  }

  static get item() {
    return this.command(4);
  }

  static get skill() {
    return this.command(5);
  }

  static get equip() {
    return this.command(6);
  }

  static get status() {
    return this.command(7);
  }

  static get formation() {
    return this.command(8);
  }

  static get save() {
    return this.command(9);
  }

  static get gameEnd() {
    return this.command(10);
  }

  static get options() {
    return this.command(11);
  }

  static get weapon() {
    return this.command(12);
  }

  static get armor() {
    return this.command(13);
  }

  static get keyItem() {
    return this.command(14);
  }

  static get equip2() {
    return this.command(15);
  }

  static get optimize() {
    return this.command(16);
  }

  static get clear() {
    return this.command(17);
  }

  static get newGame() {
    return this.command(18);
  }

  static get continue_() {
    return this.command(19);
  }

  static get toTitle() {
    return this.command(21);
  }

  static get cancel() {
    return this.command(22);
  }

  static get buy() {
    return this.command(24);
  }

  static get sell() {
    return this.command(25);
  }

  static get alwaysDash() {
    return this.message("alwaysDash");
  }

  static get commandRemember() {
    return this.message("commandRemember");
  }

  static get touchUI() {
    return this.message("touchUI");
  }

  static get bgmVolume() {
    return this.message("bgmVolume");
  }

  static get bgsVolume() {
    return this.message("bgsVolume");
  }

  static get meVolume() {
    return this.message("meVolume");
  }

  static get seVolume() {
    return this.message("seVolume");
  }

  static get possession() {
    return this.message("possession");
  }

  static get expTotal() {
    return this.message("expTotal");
  }

  static get expNext() {
    return this.message("expNext");
  }

  static get saveMessage() {
    return this.message("saveMessage");
  }

  static get loadMessage() {
    return this.message("loadMessage");
  }

  static get file() {
    return this.message("file");
  }

  static get autosave() {
    return this.message("autosave");
  }

  static get partyName() {
    return this.message("partyName");
  }

  static get emerge() {
    return this.message("emerge");
  }

  static get preemptive() {
    return this.message("preemptive");
  }

  static get surprise() {
    return this.message("surprise");
  }

  static get escapeStart() {
    return this.message("escapeStart");
  }

  static get escapeFailure() {
    return this.message("escapeFailure");
  }

  static get victory() {
    return this.message("victory");
  }

  static get defeat() {
    return this.message("defeat");
  }

  static get obtainExp() {
    return this.message("obtainExp");
  }

  static get obtainGold() {
    return this.message("obtainGold");
  }

  static get obtainItem() {
    return this.message("obtainItem");
  }

  static get levelUp() {
    return this.message("levelUp");
  }

  static get obtainSkill() {
    return this.message("obtainSkill");
  }

  static get useItem() {
    return this.message("useItem");
  }

  static get criticalToEnemy() {
    return this.message("criticalToEnemy");
  }

  static get criticalToActor() {
    return this.message("criticalToActor");
  }

  static get actorDamage() {
    return this.message("actorDamage");
  }

  static get actorRecovery() {
    return this.message("actorRecovery");
  }

  static get actorGain() {
    return this.message("actorGain");
  }

  static get actorLoss() {
    return this.message("actorLoss");
  }

  static get actorDrain() {
    return this.message("actorDrain");
  }

  static get actorNoDamage() {
    return this.message("actorNoDamage");
  }

  static get actorNoHit() {
    return this.message("actorNoHit");
  }

  static get enemyDamage() {
    return this.message("enemyDamage");
  }

  static get enemyRecovery() {
    return this.message("enemyRecovery");
  }

  static get enemyGain() {
    return this.message("enemyGain");
  }

  static get enemyLoss() {
    return this.message("enemyLoss");
  }

  static get enemyDrain() {
    return this.message("enemyDrain");
  }

  static get enemyNoDamage() {
    return this.message("enemyNoDamage");
  }

  static get enemyNoHit() {
    return this.message("enemyNoHit");
  }

  static get evasion() {
    return this.message("evasion");
  }

  static get magicEvasion() {
    return this.message("magicEvasion");
  }

  static get magicReflection() {
    return this.message("magicReflection");
  }

  static get counterAttack() {
    return this.message("counterAttack");
  }

  static get substitute() {
    return this.message("substitute");
  }

  static get buffAdd() {
    return this.message("buffAdd");
  }

  static get debuffAdd() {
    return this.message("debuffAdd");
  }

  static get buffRemove() {
    return this.message("buffRemove");
  }

  static get actionFailure() {
    return this.message("actionFailure");
  }
}

//-----------------------------------------------------------------------------
// ColorManager
//
// The static class that handles the window colors.
class ColorManager {
  constructor() {
    throw new Error("This is a static class");
  }

  static loadWindowskin() {
    this._windowskin = ImageManager.loadSystem("Window");
  }

  static textColor(n) {
    const px = 96 + (n % 8) * 12 + 6;
    const py = 144 + Math.floor(n / 8) * 12 + 6;
    return this._windowskin.getPixel(px, py);
  }

  static normalColor() {
    return this.textColor(0);
  }

  static systemColor() {
    return this.textColor(16);
  }

  static crisisColor() {
    return this.textColor(17);
  }

  static deathColor() {
    return this.textColor(18);
  }

  static gaugeBackColor() {
    return this.textColor(19);
  }

  static hpGaugeColor1() {
    return this.textColor(20);
  }

  static hpGaugeColor2() {
    return this.textColor(21);
  }

  static mpGaugeColor1() {
    return this.textColor(22);
  }

  static mpGaugeColor2() {
    return this.textColor(23);
  }

  static mpCostColor() {
    return this.textColor(23);
  }

  static powerUpColor() {
    return this.textColor(24);
  }

  static powerDownColor() {
    return this.textColor(25);
  }

  static ctGaugeColor1() {
    return this.textColor(26);
  }

  static ctGaugeColor2() {
    return this.textColor(27);
  }

  static tpGaugeColor1() {
    return this.textColor(28);
  }

  static tpGaugeColor2() {
    return this.textColor(29);
  }

  static tpCostColor() {
    return this.textColor(29);
  }

  static pendingColor() {
    return this._windowskin.getPixel(120, 120);
  }

  static hpColor(actor) {
    if (!actor) {
      return this.normalColor();
    } else if (actor.isDead()) {
      return this.deathColor();
    } else if (actor.isDying()) {
      return this.crisisColor();
    } else {
      return this.normalColor();
    }
  }

  static mpColor(/*actor*/) {
    return this.normalColor();
  }

  static tpColor(/*actor*/) {
    return this.normalColor();
  }

  static paramchangeTextColor(change) {
    if (change > 0) {
      return this.powerUpColor();
    } else if (change < 0) {
      return this.powerDownColor();
    } else {
      return this.normalColor();
    }
  }

  static damageColor(colorType) {
    switch (colorType) {
      case 0: // HP damage
        return "#ffffff";
      case 1: // HP recover
        return "#b9ffb5";
      case 2: // MP damage
        return "#ffff90";
      case 3: // MP recover
        return "#80b0ff";
      default:
        return "#808080";
    }
  }

  static outlineColor() {
    return "rgba(0, 0, 0, 0.6)";
  }

  static dimColor1() {
    return "rgba(0, 0, 0, 0.6)";
  }

  static dimColor2() {
    return "rgba(0, 0, 0, 0)";
  }

  static itemBackColor1() {
    return "rgba(32, 32, 32, 0.5)";
  }

  static itemBackColor2() {
    return "rgba(0, 0, 0, 0.5)";
  }
}

//-----------------------------------------------------------------------------
// SceneManager
//
// The static class that manages scene transitions.
class SceneManager {
  constructor() {
    throw new Error("This is a static class");
  }

  static _scene = null;
  static _nextScene = null;
  static _stack = [];
  static _exiting = false;
  static _previousScene = null;
  static _previousClass = null;
  static _backgroundBitmap = null;
  static _smoothDeltaTime = 1;
  static _elapsedTime = 0;

  static run(e) {
    try {
      this.initialize();
      this.goto(e);
      Graphics.startGameLoop();
    } catch (e) {
      this.catchException(e);
    }
  }

  static initialize() {
    this.checkBrowser();
    this.checkPluginErrors();
    this.initGraphics();
    this.initAudio();
    this.initVideo();
    this.initInput();
    this.setupEventHandlers();
  }

  static checkBrowser() {
    if (!Utils.canUseWebGL()) throw new Error("Your browser does not support WebGL.");
    if (!Utils.canUseWebAudioAPI()) throw new Error("Your browser does not support Web Audio API.");
    if (!Utils.canUseCssFontLoading()) throw new Error("Your browser does not support CSS Font Loading.");
    if (!Utils.canUseIndexedDB()) throw new Error("Your browser does not support IndexedDB.");
  }

  static checkPluginErrors() {
    PluginManager.checkErrors();
  }

  static initGraphics() {
    if (!Graphics.initialize()) throw new Error("Failed to initialize graphics.");
    Graphics.setTickHandler(this.update.bind(this));
  }

  static initAudio() {
    WebAudio.initialize();
  }

  static initVideo() {
    Video.initialize(Graphics.width, Graphics.height);
  }

  static initInput() {
    Input.initialize();
    TouchInput.initialize();
  }

  static setupEventHandlers() {
    window.addEventListener("error", this.onError.bind(this));
    window.addEventListener("unhandledrejection", this.onReject.bind(this));
    window.addEventListener("unload", this.onUnload.bind(this));
    document.addEventListener("keydown", this.onKeyDown.bind(this));
  }

  static update(e) {
    try {
      const n = this.determineRepeatNumber(e);
      for (let i = 0; i < n; i++) this.updateMain();
    } catch (e) {
      this.catchException(e);
    }
  }

  static determineRepeatNumber(e) {
    this._smoothDeltaTime *= 0.8;
    this._smoothDeltaTime += 0.2 * Math.min(e, 2);
    if (this._smoothDeltaTime >= 0.9) {
      this._elapsedTime = 0;
      return Math.round(this._smoothDeltaTime);
    } else {
      this._elapsedTime += e;
      return this._elapsedTime >= 1 ? (this._elapsedTime -= 1, 1) : 0;
    }
  }

  static terminate() {
    if (Utils.isNwjs()) nw.App.quit();
  }

  static onError(e) {
    console.error(e.message);
    console.error(e.filename, e.lineno);
    try {
      this.stop();
      Graphics.printError("Error", e.message, e);
      AudioManager.stopAll();
    } catch (e) { }
  }

  static onReject(e) {
    e.message = e.reason;
    this.onError(e);
  }

  static onUnload() {
    ImageManager.clear();
    EffectManager.clear();
    AudioManager.stopAll();
  }

  static onKeyDown(e) {
    if (!e.ctrlKey && !e.altKey) {
      switch (e.keyCode) {
        case 116:
          this.reloadGame();
          break;
        case 119:
          this.showDevTools();
          break;
      }
    }
  }

  static reloadGame() {
    if (Utils.isNwjs()) chrome.runtime.reload();
  }

  static showDevTools() {
    if (Utils.isNwjs() && Utils.isOptionValid("test")) nw.Window.get().showDevTools();
  }

  static catchException(e) {
    if (e instanceof Error) {
      this.catchNormalError(e);
    } else if (e instanceof Array && e[0] === "LoadError") {
      this.catchLoadError(e);
    } else {
      this.catchUnknownError(e);
    }
    this.stop();
  }

  static catchNormalError(e) {
    Graphics.printError(e.name, e.message, e);
    AudioManager.stopAll();
    console.error(e.stack);
  }

  static catchLoadError(e) {
    const n = e[1],
      t = e[2];
    Graphics.printError("Failed to load", n);
    if (t) {
      Graphics.showRetryButton(() => {
        t();
        SceneManager.resume();
      });
    } else {
      AudioManager.stopAll();
    }
  }

  static catchUnknownError(e) {
    Graphics.printError("UnknownError", String(e));
    AudioManager.stopAll();
  }

  static updateMain() {
    this.updateFrameCount();
    this.updateInputData();
    this.updateEffekseer();
    this.changeScene();
    this.updateScene();
  }

  static updateFrameCount() {
    Graphics.frameCount++;
  }

  static updateInputData() {
    Input.update();
    TouchInput.update();
  }

  static updateEffekseer() {
    if (Graphics.effekseer && this.isGameActive()) Graphics.effekseer.update();
  }

  static changeScene() {
    if (this.isSceneChanging() && !this.isCurrentSceneBusy()) {
      if (this._scene) {
        this._scene.terminate();
        this.onSceneTerminate();
      }
      this._scene = this._nextScene;
      this._nextScene = null;
      if (this._scene) {
        this._scene.create();
        this.onSceneCreate();
      }
      if (this._exiting) this.terminate();
    }
  }

  static updateScene() {
    if (this._scene) {
      if (this._scene.isStarted()) {
        if (this.isGameActive()) this._scene.update();
      } else if (this._scene.isReady()) {
        this.onBeforeSceneStart();
        this._scene.start();
        this.onSceneStart();
      }
    }
  }

  static isGameActive() {
    try {
      return window.top.document.hasFocus();
    } catch (e) {
      return true;
    }
  }

  static onSceneTerminate() {
    this._previousScene = this._scene;
    this._previousClass = this._scene.constructor;
    Graphics.setStage(null);
  }

  static onSceneCreate() {
    Graphics.startLoading();
  }

  static onBeforeSceneStart() {
    if (this._previousScene) {
      this._previousScene.destroy();
      this._previousScene = null;
    }
    if (Graphics.effekseer) Graphics.effekseer.stopAll();
  }

  static onSceneStart() {
    Graphics.endLoading();
    Graphics.setStage(this._scene);
  }

  static isSceneChanging() {
    return this._exiting || !!this._nextScene;
  }

  static isCurrentSceneBusy() {
    return this._scene && this._scene.isBusy();
  }

  static isNextScene(e) {
    return this._nextScene && this._nextScene.constructor === e;
  }

  static isPreviousScene(e) {
    return this._previousClass === e;
  }

  static goto(e) {
    if (e) {
      this._nextScene = new e();
    }
    if (this._scene) {
      this._scene.stop();
    }
  }

  static push(e) {
    this._stack.push(this._scene.constructor);
    this.goto(e);
  }

  static pop() {
    if (this._stack.length > 0) {
      this.goto(this._stack.pop());
    } else {
      this.exit();
    }
  }

  static exit() {
    this.goto(null);
    this._exiting = true;
  }

  static clearStack() {
    this._stack = [];
  }

  static stop() {
    Graphics.stopGameLoop();
  }

  static prepareNextScene(...args) {
    this._nextScene.prepare(...args);
  }

  static snap() {
    return Bitmap.snap(this._scene);
  }

  static snapForBackground() {
    if (this._backgroundBitmap) this._backgroundBitmap.destroy();
    this._backgroundBitmap = this.snap();
  }

  static backgroundBitmap() {
    return this._backgroundBitmap;
  }

  static resume() {
    TouchInput.update();
    Graphics.startGameLoop();
  }
}

//-----------------------------------------------------------------------------
// BattleManager
//
// The static class that manages battle progress.
class BattleManager {
  constructor() {
    throw new Error("This is a static class");
  }

  static setup(troopId, canEscape, canLose) {
    this.initMembers();
    this._canEscape = canEscape;
    this._canLose = canLose;
    $gameTroop.setup(troopId);
    $gameScreen.onBattleStart();
    this.makeEscapeRatio();
  }

  static initMembers() {
    this._phase = "";
    this._inputting = false;
    this._canEscape = false;
    this._canLose = false;
    this._battleTest = false;
    this._eventCallback = null;
    this._preemptive = false;
    this._surprise = false;
    this._currentActor = null;
    this._actionForcedBattler = null;
    this._mapBgm = null;
    this._mapBgs = null;
    this._actionBattlers = [];
    this._subject = null;
    this._action = null;
    this._targets = [];
    this._logWindow = null;
    this._spriteset = null;
    this._escapeRatio = 0;
    this._escaped = false;
    this._rewards = {};
    this._tpbNeedsPartyCommand = true;
  }

  static isTpb() {
    return $dataSystem.battleSystem >= 1;
  }

  static isActiveTpb() {
    return $dataSystem.battleSystem === 1;
  }

  static isBattleTest() {
    return this._battleTest;
  }

  static setBattleTest(battleTest) {
    this._battleTest = battleTest;
  }

  static setEventCallback(callback) {
    this._eventCallback = callback;
  }

  static setLogWindow(logWindow) {
    this._logWindow = logWindow;
  }

  static setSpriteset(spriteset) {
    this._spriteset = spriteset;
  }

  static onEncounter() {
    this._preemptive = Math.random() < this.ratePreemptive();
    this._surprise = Math.random() < this.rateSurprise() && !this._preemptive;
  }

  static ratePreemptive() {
    return $gameParty.ratePreemptive($gameTroop.agility());
  }

  static rateSurprise() {
    return $gameParty.rateSurprise($gameTroop.agility());
  }

  static saveBgmAndBgs() {
    this._mapBgm = AudioManager.saveBgm();
    this._mapBgs = AudioManager.saveBgs();
  }

  static playBattleBgm() {
    AudioManager.playBgm($gameSystem.battleBgm());
    AudioManager.stopBgs();
  }

  static playVictoryMe() {
    AudioManager.playMe($gameSystem.victoryMe());
  }

  static playDefeatMe() {
    AudioManager.playMe($gameSystem.defeatMe());
  }

  static replayBgmAndBgs() {
    if (this._mapBgm) {
      AudioManager.replayBgm(this._mapBgm);
    } else {
      AudioManager.stopBgm();
    }
    if (this._mapBgs) {
      AudioManager.replayBgs(this._mapBgs);
    }
  }

  static makeEscapeRatio() {
    this._escapeRatio = (0.5 * $gameParty.agility()) / $gameTroop.agility();
  }

  static update(timeActive) {
    if (!this.isBusy() && !this.updateEvent()) {
      this.updatePhase(timeActive);
    }
    if (this.isTpb()) {
      this.updateTpbInput();
    }
  }

  static updatePhase(timeActive) {
    switch (this._phase) {
      case "start":
        this.updateStart();
        break;
      case "turn":
        this.updateTurn(timeActive);
        break;
      case "action":
        this.updateAction();
        break;
      case "turnEnd":
        this.updateTurnEnd();
        break;
      case "battleEnd":
        this.updateBattleEnd();
        break;
    }
  }

  static updateEvent() {
    switch (this._phase) {
      case "start":
      case "turn":
      case "turnEnd":
        if (this.isActionForced()) {
          this.processForcedAction();
          return true;
        } else {
          return this.updateEventMain();
        }
    }
    return this.checkAbort();
  }

  static updateEventMain() {
    $gameTroop.updateInterpreter();
    $gameParty.requestMotionRefresh();
    if ($gameTroop.isEventRunning() || this.checkBattleEnd()) {
      return true;
    }
    $gameTroop.setupBattleEvent();
    if ($gameTroop.isEventRunning() || SceneManager.isSceneChanging()) {
      return true;
    }
    return false;
  }

  static isBusy() {
    return (
      $gameMessage.isBusy() ||
      this._spriteset.isBusy() ||
      this._logWindow.isBusy()
    );
  }

  static updateTpbInput() {
    if (this._inputting) {
      this.checkTpbInputClose();
    } else {
      this.checkTpbInputOpen();
    }
  }

  static checkTpbInputClose() {
    if (!this.isPartyTpbInputtable() || this.needsActorInputCancel()) {
      this.cancelActorInput();
      this._currentActor = null;
      this._inputting = false;
    }
  }

  static checkTpbInputOpen() {
    if (this.isPartyTpbInputtable()) {
      if (this._tpbNeedsPartyCommand) {
        this._inputting = true;
        this._tpbNeedsPartyCommand = false;
      } else {
        this.selectNextCommand();
      }
    }
  }

  static isPartyTpbInputtable() {
    return $gameParty.canInput() && this.isTpbMainPhase();
  }

  static needsActorInputCancel() {
    return this._currentActor && !this._currentActor.canInput();
  }

  static isTpbMainPhase() {
    return ["turn", "turnEnd", "action"].includes(this._phase);
  }

  static isInputting() {
    return this._inputting;
  }

  static isInTurn() {
    return this._phase === "turn";
  }

  static isTurnEnd() {
    return this._phase === "turnEnd";
  }

  static isAborting() {
    return this._phase === "aborting";
  }

  static isBattleEnd() {
    return this._phase === "battleEnd";
  }

  static canEscape() {
    return this._canEscape;
  }

  static canLose() {
    return this._canLose;
  }

  static isEscaped() {
    return this._escaped;
  }

  static actor() {
    return this._currentActor;
  }

  static startBattle() {
    this._phase = "start";
    $gameSystem.onBattleStart();
    $gameParty.onBattleStart(this._preemptive);
    $gameTroop.onBattleStart(this._surprise);
    this.displayStartMessages();
  }

  static displayStartMessages() {
    for (const name of $gameTroop.enemyNames()) {
      $gameMessage.add(TextManager.emerge.format(name));
    }
    if (this._preemptive) {
      $gameMessage.add(TextManager.preemptive.format($gameParty.name()));
    } else if (this._surprise) {
      $gameMessage.add(TextManager.surprise.format($gameParty.name()));
    }
  }

  static startInput() {
    this._phase = "input";
    this._inputting = true;
    $gameParty.makeActions();
    $gameTroop.makeActions();
    this._currentActor = null;
    if (this._surprise || !$gameParty.canInput()) {
      this.startTurn();
    }
  }

  static inputtingAction() {
    return this._currentActor ? this._currentActor.inputtingAction() : null;
  }

  static selectNextCommand() {
    if (this._currentActor) {
      if (this._currentActor.selectNextCommand()) {
        return;
      }
      this.finishActorInput();
    }
    this.selectNextActor();
  }

  static selectNextActor() {
    this.changeCurrentActor(true);
    if (!this._currentActor) {
      if (this.isTpb()) {
        this.changeCurrentActor(true);
      } else {
        this.startTurn();
      }
    }
  }

  static selectPreviousCommand() {
    if (this._currentActor) {
      if (this._currentActor.selectPreviousCommand()) {
        return;
      }
      this.cancelActorInput();
    }
    this.selectPreviousActor();
  }

  static selectPreviousActor() {
    if (this.isTpb()) {
      this.changeCurrentActor(true);
      if (!this._currentActor) {
        this._inputting = $gameParty.canInput();
      }
    } else {
      this.changeCurrentActor(false);
    }
  }

  static changeCurrentActor(forward) {
    const members = $gameParty.battleMembers();
    let actor = this._currentActor;
    while (true) {
      const currentIndex = members.indexOf(actor);
      actor = members[currentIndex + (forward ? 1 : -1)];
      if (!actor || actor.canInput()) break;
    }
    this._currentActor = actor ? actor : null;
    this.startActorInput();
  }

  static startActorInput() {
    if (this._currentActor) {
      this._currentActor.setActionState("inputting");
      this._inputting = true;
    }
  }

  static finishActorInput() {
    if (this._currentActor) {
      if (this.isTpb()) {
        this._currentActor.startTpbCasting();
      }
      this._currentActor.setActionState("waiting");
    }
  }

  static cancelActorInput() {
    if (this._currentActor) {
      this._currentActor.setActionState("undecided");
    }
  }

  static updateStart() {
    if (this.isTpb()) {
      this._phase = "turn";
    } else {
      this.startInput();
    }
  }

  static startTurn() {
    this._phase = "turn";
    $gameTroop.increaseTurn();
    $gameParty.requestMotionRefresh();
    if (!this.isTpb()) {
      this.makeActionOrders();
      this._logWindow.startTurn();
      this._inputting = false;
    }
  }

  static updateTurn(timeActive) {
    $gameParty.requestMotionRefresh();
    if (this.isTpb() && timeActive) {
      this.updateTpb();
    }
    if (!this._subject) {
      this._subject = this.getNextSubject();
    }
    if (this._subject) {
      this.processTurn();
    } else if (!this.isTpb()) {
      this.endTurn();
    }
  }

  static updateTpb() {
    $gameParty.updateTpb();
    $gameTroop.updateTpb();
    this.updateAllTpbBattlers();
    this.checkTpbTurnEnd();
  }

  static updateAllTpbBattlers() {
    for (const battler of this.allBattleMembers()) {
      this.updateTpbBattler(battler);
    }
  }

  static updateTpbBattler(battler) {
    if (battler.isTpbTurnEnd()) {
      battler.onTurnEnd();
      battler.startTpbTurn();
      this.displayBattlerStatus(battler, false);
    } else if (battler.isTpbReady()) {
      battler.startTpbAction();
      this._actionBattlers.push(battler);
    } else if (battler.isTpbTimeout()) {
      battler.onTpbTimeout();
      this.displayBattlerStatus(battler, true);
    }
  }

  static checkTpbTurnEnd() {
    if ($gameTroop.isTpbTurnEnd()) {
      this.endTurn();
    }
  }

  static processTurn() {
    const subject = this._subject;
    const action = subject.currentAction();
    if (action) {
      action.prepare();
      if (action.isValid()) {
        this.startAction();
      }
      subject.removeCurrentAction();
    } else {
      this.endAction();
      this._subject = null;
    }
  }

  static endBattlerActions(battler) {
    battler.setActionState(this.isTpb() ? "undecided" : "done");
    battler.onAllActionsEnd();
    battler.clearTpbChargeTime();
    this.displayBattlerStatus(battler, true);
  }

  static endTurn() {
    this._phase = "turnEnd";
    this._preemptive = false;
    this._surprise = false;
  }

  static updateTurnEnd() {
    if (this.isTpb()) {
      this.startTurn();
    } else {
      this.endAllBattlersTurn();
      this._phase = "start";
    }
  }

  static endAllBattlersTurn() {
    for (const battler of this.allBattleMembers()) {
      battler.onTurnEnd();
      this.displayBattlerStatus(battler, false);
    }
  }

  static displayBattlerStatus(battler, current) {
    this._logWindow.displayAutoAffectedStatus(battler);
    if (current) {
      this._logWindow.displayCurrentState(battler);
    }
    this._logWindow.displayRegeneration(battler);
  }

  static getNextSubject() {
    for (; ;) {
      const battler = this._actionBattlers.shift();
      if (!battler) {
        return null;
      }
      if (battler.isBattleMember() && battler.isAlive()) {
        return battler;
      }
    }
  }

  static allBattleMembers() {
    return $gameParty.battleMembers().concat($gameTroop.members());
  }

  static makeActionOrders() {
    const battlers = [];
    if (!this._surprise) {
      battlers.push(...$gameParty.battleMembers());
    }
    if (!this._preemptive) {
      battlers.push(...$gameTroop.members());
    }
    for (const battler of battlers) {
      battler.makeSpeed();
    }
    battlers.sort((a, b) => b.speed() - a.speed());
    this._actionBattlers = battlers;
  }

  static startAction() {
    const subject = this._subject;
    const action = subject.currentAction();
    const targets = action.makeTargets();
    this._phase = "action";
    this._action = action;
    this._targets = targets;
    subject.cancelMotionRefresh();
    subject.useItem(action.item());
    this._action.applyGlobal();
    this._logWindow.startAction(subject, action, targets);
  }

  static updateAction() {
    const target = this._targets.shift();
    if (target) {
      this.invokeAction(this._subject, target);
    } else {
      this.endAction();
    }
  }

  static endAction() {
    this._logWindow.endAction(this._subject);
    this._phase = "turn";
    if (this._subject.numActions() === 0) {
      this.endBattlerActions(this._subject);
      this._subject = null;
    }
  }

  static invokeAction(subject, target) {
    this._logWindow.push("pushBaseLine");
    if (Math.random() < this._action.itemCnt(target)) {
      this.invokeCounterAttack(subject, target);
    } else if (Math.random() < this._action.itemMrf(target)) {
      this.invokeMagicReflection(subject, target);
    } else {
      this.invokeNormalAction(subject, target);
    }
    subject.setLastTarget(target);
    this._logWindow.push("popBaseLine");
  }

  static invokeNormalAction(subject, target) {
    const realTarget = this.applySubstitute(target);
    this._action.apply(realTarget);
    this._logWindow.displayActionResults(subject, realTarget);
  }

  static invokeCounterAttack(subject, target) {
    const action = new Game_Action(target);
    action.setAttack();
    action.apply(subject);
    this._logWindow.displayCounter(target);
    this._logWindow.displayActionResults(target, subject);
  }

  static invokeMagicReflection(subject, target) {
    this._action._reflectionTarget = target;
    this._logWindow.displayReflection(target);
    this._action.apply(subject);
    this._logWindow.displayActionResults(target, subject);
  }

  static applySubstitute(target) {
    if (this.checkSubstitute(target)) {
      const substitute = target.friendsUnit().substituteBattler(target);
      if (substitute) {
        this._logWindow.displaySubstitute(substitute, target);
        return substitute;
      }
    }
    return target;
  }

  static checkSubstitute(target) {
    return target.isDying() && !this._action.isCertainHit();
  }

  static isActionForced() {
    return (
      !!this._actionForcedBattler &&
      !$gameParty.isAllDead() &&
      !$gameTroop.isAllDead()
    );
  }

  static forceAction(battler) {
    if (battler.numActions() > 0) {
      this._actionForcedBattler = battler;
      this._actionBattlers.remove(battler);
    }
  }

  static processForcedAction() {
    if (this._actionForcedBattler) {
      if (this._subject) {
        this.endBattlerActions(this._subject);
      }
      this._subject = this._actionForcedBattler;
      this._actionForcedBattler = null;
      this.startAction();
      this._subject.removeCurrentAction();
    }
  }

  static abort() {
    this._phase = "aborting";
  }

  static checkBattleEnd() {
    if (this._phase) {
      if ($gameParty.isEscaped()) {
        this.processPartyEscape();
        return true;
      } else if ($gameParty.isAllDead()) {
        this.processDefeat();
        return true;
      } else if ($gameTroop.isAllDead()) {
        this.processVictory();
        return true;
      }
    }
    return false;
  }

  static checkAbort() {
    if (this.isAborting()) {
      this.processAbort();
      return true;
    }
    return false;
  }

  static processVictory() {
    $gameParty.removeBattleStates();
    $gameParty.performVictory();
    this.playVictoryMe();
    this.replayBgmAndBgs();
    this.makeRewards();
    this.displayVictoryMessage();
    this.displayRewards();
    this.gainRewards();
    this.endBattle(0);
  }

  static processEscape() {
    $gameParty.performEscape();
    SoundManager.playEscape();
    const success = this._preemptive || Math.random() < this._escapeRatio;
    if (success) {
      this.onEscapeSuccess();
    } else {
      this.onEscapeFailure();
    }
    return success;
  }

  static onEscapeSuccess() {
    this.displayEscapeSuccessMessage();
    this._escaped = true;
    this.processAbort();
  }

  static onEscapeFailure() {
    $gameParty.onEscapeFailure();
    this.displayEscapeFailureMessage();
    this._escapeRatio += 0.1;
    if (!this.isTpb()) {
      this.startTurn();
    }
  }

  static processPartyEscape() {
    this._escaped = true;
    this.processAbort();
  }

  static processAbort() {
    $gameParty.removeBattleStates();
    this._logWindow.clear();
    this.replayBgmAndBgs();
    this.endBattle(1);
  }

  static processDefeat() {
    this.displayDefeatMessage();
    this.playDefeatMe();
    if (this._canLose) {
      this.replayBgmAndBgs();
    } else {
      AudioManager.stopBgm();
    }
    this.endBattle(2);
  }

  static endBattle(result) {
    this._phase = "battleEnd";
    this.cancelActorInput();
    this._inputting = false;
    if (this._eventCallback) {
      this._eventCallback(result);
    }
    if (result === 0) {
      $gameSystem.onBattleWin();
    } else if (this._escaped) {
      $gameSystem.onBattleEscape();
    }
    $gameTemp.clearCommonEventReservation();
  }

  static updateBattleEnd() {
    if (this.isBattleTest()) {
      AudioManager.stopBgm();
      SceneManager.exit();
    } else if (!this._escaped && $gameParty.isAllDead()) {
      if (this._canLose) {
        $gameParty.reviveBattleMembers();
        SceneManager.pop();
      } else {
        SceneManager.goto(Scene_Gameover);
      }
    } else {
      SceneManager.pop();
    }
    this._phase = "";
  }

  static makeRewards() {
    this._rewards = {
      gold: $gameTroop.goldTotal(),
      exp: $gameTroop.expTotal(),
      items: $gameTroop.makeDropItems(),
    };
  }

  static displayVictoryMessage() {
    $gameMessage.add(TextManager.victory.format($gameParty.name()));
  }

  static displayDefeatMessage() {
    $gameMessage.add(TextManager.defeat.format($gameParty.name()));
  }

  static displayEscapeSuccessMessage() {
    $gameMessage.add(TextManager.escapeStart.format($gameParty.name()));
  }

  static displayEscapeFailureMessage() {
    $gameMessage.add(TextManager.escapeStart.format($gameParty.name()));
    $gameMessage.add("\\." + TextManager.escapeFailure);
  }

  static displayRewards() {
    this.displayExp();
    this.displayGold();
    this.displayDropItems();
  }

  static displayExp() {
    const exp = this._rewards.exp;
    if (exp > 0) {
      const text = TextManager.obtainExp.format(exp, TextManager.exp);
      $gameMessage.add("\\." + text);
    }
  }

  static displayGold() {
    const gold = this._rewards.gold;
    if (gold > 0) {
      $gameMessage.add("\\." + TextManager.obtainGold.format(gold));
    }
  }

  static displayDropItems() {
    const items = this._rewards.items;
    if (items.length > 0) {
      $gameMessage.newPage();
      for (const item of items) {
        $gameMessage.add(TextManager.obtainItem.format(item.name));
      }
    }
  }

  static gainRewards() {
    this.gainExp();
    this.gainGold();
    this.gainDropItems();
  }

  static gainExp() {
    const exp = this._rewards.exp;
    for (const actor of $gameParty.allMembers()) {
      actor.gainExp(exp);
    }
  }

  static gainGold() {
    $gameParty.gainGold(this._rewards.gold);
  }

  static gainDropItems() {
    const items = this._rewards.items;
    for (const item of items) {
      $gameParty.gainItem(item, 1);
    }
  }
}

//-----------------------------------------------------------------------------
// PluginManager
//
// The static class that manages the plugins.
class PluginManager {
  constructor() {
    throw new Error("This is a static class");
  }

  static _scripts = [];
  static _errorUrls = [];
  static _parameters = {};
  static _commands = {};

  static setup(plugins) {
    for (const plugin of plugins) {
      const pluginName = Utils.extractFileName(plugin.name);
      if (plugin.status && !this._scripts.includes(pluginName)) {
        this.setParameters(pluginName, plugin.parameters);
        this.loadScript(plugin.name);
        this._scripts.push(pluginName);
      }
    }
  }

  static parameters(name) {
    return this._parameters[name.toLowerCase()] || {};
  }

  static setParameters(name, parameters) {
    this._parameters[name.toLowerCase()] = parameters;
  }

  static loadScript(filename) {
    const url = this.makeUrl(filename);
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = url;
    script.async = false;
    script.defer = true;
    script.onerror = this.onError.bind(this);
    script._url = url;
    document.body.appendChild(script);
  }

  static onError(e) {
    this._errorUrls.push(e.target._url);
  }

  static makeUrl(filename) {
    return "js/plugins/" + Utils.encodeURI(filename) + ".js";
  }

  static checkErrors() {
    const url = this._errorUrls.shift();
    if (url) {
      this.throwLoadError(url);
    }
  }

  static throwLoadError(url) {
    throw new Error("Failed to load: " + url);
  }

  static registerCommand(pluginName, commandName, func) {
    const key = `${pluginName}:${commandName}`;
    this._commands[key] = func;
  }

  static callCommand(self, pluginName, commandName, args) {
    const key = `${pluginName}:${commandName}`;
    const func = this._commands[key];
    if (typeof func === "function") {
      func.bind(self)(args);
    }
  }
}

//-----------------------------------------------------------------------------
