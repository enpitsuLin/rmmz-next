import localforage from 'localforage'
import pako from 'pako'
import { JsonEx, Utils } from '../core'

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

  static isLocalMode() {
    return Utils.isNwjs()
  }

  static saveObject<T>(saveName: string, object: T | null) {
    return this.objectToJson(object)
      .then(json => this.jsonToZip(json))
      .then(zip => this.saveZip(saveName, zip))
  }

  static loadObject<T>(saveName: string) {
    return this.loadZip(saveName)
      .then(zip => this.zipToJson(zip))
      .then(json => this.jsonToObject<T>(json))
  }

  static objectToJson(object: any) {
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

  static jsonToZip(json: string) {
    return new Promise<string>((resolve, reject) => {
      try {
        const zip = pako.deflate(json, { to: 'string', level: 1 })
        if (zip.length >= 50000) {
          console.warn('Save data is too big.')
        }
        resolve(zip)
      }
      catch (e) {
        reject(e)
      }
    })
  }

  static zipToJson(zip: string | null) {
    return new Promise<string>((resolve, reject) => {
      try {
        if (zip) {
          const json = pako.inflate(zip, { to: 'string' })
          resolve(json)
        }
        else {
          resolve('null')
        }
      }
      catch (e) {
        reject(e)
      }
    })
  }

  static saveZip(saveName: string, zip: string) {
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

  static exists(saveName: string) {
    if (this.isLocalMode()) {
      return this.localFileExists(saveName)
    }
    else {
      return this.forageExists(saveName)
    }
  }

  static remove(saveName: string) {
    if (this.isLocalMode()) {
      return this.removeLocalFile(saveName)
    }
    else {
      return this.removeForage(saveName)
    }
  }

  static saveToLocalFile(saveName: string, zip: string) {
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
          //
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

  static removeLocalFile(saveName: string) {
    this.fsUnlink(this.filePath(saveName))
  }

  static saveToForage(saveName: string, zip: string) {
    const key = this.forageKey(saveName)
    const testKey = this.forageTestKey()
    setTimeout(() => localforage.removeItem(testKey))
    return localforage
      .setItem(testKey, zip)
      .then(() => localforage.setItem(key, zip))
      .then(() => {
        this.updateForageKeys()
      })
  }

  static loadFromForage(saveName: string) {
    const key = this.forageKey(saveName)
    return localforage.getItem<string>(key)
  }

  static forageExists(saveName: string) {
    const key = this.forageKey(saveName)
    return this._forageKeys.includes(key)
  }

  static removeForage(saveName: string) {
    const key = this.forageKey(saveName)
    return localforage.removeItem(key).then(() => this.updateForageKeys())
  }

  static updateForageKeys() {
    this._forageKeysUpdated = false
    return localforage.keys().then((keys) => {
      this._forageKeys = keys
      this._forageKeysUpdated = true
      return 0
    })
  }

  static forageKeysUpdated() {
    return this._forageKeysUpdated
  }

  static fsMkdir(path: string) {
    const fs = require('fs')
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path)
    }
  }

  static fsRename(oldPath: string, newPath: string) {
    const fs = require('fs')
    if (fs.existsSync(oldPath)) {
      fs.renameSync(oldPath, newPath)
    }
  }

  static fsUnlink(path: string) {
    const fs = require('fs')
    if (fs.existsSync(path)) {
      fs.unlinkSync(path)
    }
  }

  static fsReadFile(path: string) {
    const fs = require('fs')
    if (fs.existsSync(path)) {
      return fs.readFileSync(path, { encoding: 'utf8' })
    }
    else {
      return null
    }
  }

  static fsWriteFile(path: string, data: string) {
    const fs = require('fs')
    fs.writeFileSync(path, data)
  }

  static fileDirectoryPath() {
    const path = require('path')
    // @ts-expect-error to fix
    // eslint-disable-next-line node/prefer-global/process
    const base = path.dirname(process.mainModule.filename)
    return path.join(base, 'save/')
  }

  static filePath(saveName: string) {
    const dir = this.fileDirectoryPath()
    return `${dir + saveName}.rmmzsave`
  }

  static forageKey(saveName: string) {
    const gameId = $dataSystem.advanced.gameId
    return `rmmzsave.${gameId}.${saveName}`
  }

  static forageTestKey() {
    return 'rmmzsave.test'
  }
}
