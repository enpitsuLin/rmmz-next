import { JsonEx, Utils } from '../primitives'
import { GlobalMananger } from './GlobalManager'

type Forage = typeof import('localforage')
type Pako = typeof import('pako')

// Save data and browser storage are only needed when the player actually
// saves or loads, so keep both libraries out of the boot chunk.
let foragePromise: Promise<Forage> | undefined
let pakoPromise: Promise<Pako> | undefined

function loadForage(): Promise<Forage> {
  foragePromise ??= import('localforage').then(module => (module as { default?: Forage }).default ?? (module as unknown as Forage))
  return foragePromise
}

function loadPako(): Promise<Pako> {
  pakoPromise ??= import('pako').then(module => (module as { default?: Pako }).default ?? (module as unknown as Pako))
  return pakoPromise
}

/**
 * StorageManager
 *
 * The static class that manages storage for saving game data.
 */
export class StorageManager {
  constructor() {
    throw new Error('This is a static class')
  }

  static _forageKeys: string[] = []
  static _forageKeysUpdated = false

  static isLocalMode(): boolean {
    return Utils.isNwjs()
  }

  static saveObject<T>(saveName: string, object: T | null): Promise<void> {
    return this.objectToJson(object)
      .then(json => this.jsonToZip(json))
      .then(zip => this.saveZip(saveName, zip))
  }

  static loadObject<T>(saveName: string): Promise<T> {
    return this.loadZip(saveName)
      .then(zip => this.zipToJson(zip))
      .then(json => this.jsonToObject<T>(json))
  }

  static objectToJson(object: unknown): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      try {
        const json = JsonEx.stringify(object)
        resolve(json)
      }
      catch (e) {
        reject(e)
      }
    })
  }

  static jsonToObject<T>(json: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      try {
        const object = JsonEx.parse(json)
        resolve(object as T)
      }
      catch (e) {
        reject(e)
      }
    })
  }

  static async jsonToZip(json: string): Promise<string> {
    const pako = await loadPako()
    const zip = pako.deflate(json, { to: 'string', level: 1 })
    if (zip.length >= 50000) {
      console.warn('Save data is too big.')
    }
    return zip
  }

  static async zipToJson(zip: string | null): Promise<string> {
    if (!zip) {
      return 'null'
    }
    const pako = await loadPako()
    return pako.inflate(zip, { to: 'string' })
  }

  static saveZip(saveName: string, zip: string): Promise<void> {
    if (this.isLocalMode()) {
      return this.saveToLocalFile(saveName, zip)
    }
    else {
      return this.saveToForage(saveName, zip)
    }
  }

  static loadZip(saveName: string): Promise<string | null> {
    if (this.isLocalMode()) {
      return this.loadFromLocalFile(saveName)
    }
    else {
      return this.loadFromForage(saveName)
    }
  }

  static exists(saveName: string): boolean {
    if (this.isLocalMode()) {
      return this.localFileExists(saveName)
    }
    else {
      return this.forageExists(saveName)
    }
  }

  static remove(saveName: string): void {
    if (this.isLocalMode()) {
      return this.removeLocalFile(saveName)
    }
    else {
      this.removeForage(saveName)
    }
  }

  static saveToLocalFile(saveName: string, zip: string): Promise<void> {
    const dirPath = this.fileDirectoryPath()
    const filePath = this.filePath(saveName)
    const backupFilePath = `${filePath}_`
    return new Promise<void>((resolve, reject) => {
      this.fsMkdir(dirPath)
      this.fsUnlink(backupFilePath)
      this.fsRename(filePath, backupFilePath)
      try {
        this.fsWriteFile(filePath, zip)
        this.fsUnlink(backupFilePath)
        resolve()
      }
      catch (e) {
        try {
          this.fsUnlink(filePath)
          this.fsRename(backupFilePath, filePath)
        }
        catch (e2) {
          console.error(e2)
        }
        reject(e)
      }
    })
  }

  static loadFromLocalFile(saveName: string): Promise<string> {
    const filePath = this.filePath(saveName)
    return new Promise<string>((resolve, reject) => {
      const data = this.fsReadFile(filePath)
      if (data) {
        resolve(data)
      }
      else {
        reject(new Error('Savefile not found'))
      }
    })
  }

  static localFileExists(saveName: string): boolean {
    const fs = require('fs')
    return fs.existsSync(this.filePath(saveName))
  }

  static removeLocalFile(saveName: string): void {
    this.fsUnlink(this.filePath(saveName))
  }

  static async saveToForage(saveName: string, zip: string): Promise<void> {
    const forage = await loadForage()
    const key = this.forageKey(saveName)
    const testKey = this.forageTestKey()
    setTimeout(() => forage.removeItem(testKey))
    await forage.setItem(testKey, zip)
    await forage.setItem(key, zip)
    this.updateForageKeys()
  }

  static async loadFromForage(saveName: string): Promise<string | null> {
    const forage = await loadForage()
    const key = this.forageKey(saveName)
    return forage.getItem<string>(key)
  }

  static forageExists(saveName: string): boolean {
    const key = this.forageKey(saveName)
    return this._forageKeys.includes(key)
  }

  static async removeForage(saveName: string): Promise<void> {
    const forage = await loadForage()
    const key = this.forageKey(saveName)
    await forage.removeItem(key)
    this.updateForageKeys()
  }

  static async updateForageKeys(): Promise<number> {
    this._forageKeysUpdated = false
    const forage = await loadForage()
    this._forageKeys = await forage.keys()
    this._forageKeysUpdated = true
    return 0
  }

  static forageKeysUpdated(): boolean {
    return this._forageKeysUpdated
  }

  static fsMkdir(path: string): void {
    const fs = require('fs')
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path)
    }
  }

  static fsRename(oldPath: string, newPath: string): void {
    const fs = require('fs')
    if (fs.existsSync(oldPath)) {
      fs.renameSync(oldPath, newPath)
    }
  }

  static fsUnlink(path: string): void {
    const fs = require('fs')
    if (fs.existsSync(path)) {
      fs.unlinkSync(path)
    }
  }

  static fsReadFile(path: string): string | null {
    const fs = require('fs')
    if (fs.existsSync(path)) {
      return fs.readFileSync(path, { encoding: 'utf8' })
    }
    else {
      return null
    }
  }

  static fsWriteFile(path: string, data: string): void {
    const fs = require('fs')
    fs.writeFileSync(path, data)
  }

  static fileDirectoryPath(): string {
    const path = require('path')
    // @ts-expect-error to fix
    // eslint-disable-next-line node/prefer-global/process
    const base = path.dirname(process.mainModule.filename)
    return path.join(base, 'save/')
  }

  static filePath(saveName: string): string {
    const dir = this.fileDirectoryPath()
    return `${dir + saveName}.rmmzsave`
  }

  static forageKey(saveName: string): string {
    const gameId = GlobalMananger.$dataSystem.advanced.gameId
    return `rmmzsave.${gameId}.${saveName}`
  }

  static forageTestKey(): string {
    return 'rmmzsave.test'
  }
}
