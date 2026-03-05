import { AudioManager, Bitmap, DataManager, FontManager, Graphics, ImageManager, PluginManager, Scene_Boot, SceneManager, Utils, WebAudio } from '@rmmz-lib/core'
import { projectRoot, fileurl } from 'virtual:rmmz-project'

globalThis.$plugins = [
  { "name": "TestPlugin", "status": true, "description": "", "parameters": {} }
];
globalThis.$dataActors = null
globalThis.$dataClasses = null
globalThis.$dataSkills = null
globalThis.$dataItems = null
globalThis.$dataWeapons = null
globalThis.$dataArmors = null
globalThis.$dataEnemies = null
globalThis.$dataTroops = null
globalThis.$dataStates = null
globalThis.$dataAnimations = null
globalThis.$dataTilesets = null
globalThis.$dataCommonEvents = null
globalThis.$dataSystem = null
globalThis.$dataMapInfos = null
globalThis.$dataMap = null
globalThis.$gameTemp = null
globalThis.$gameSystem = null
globalThis.$gameScreen = null
globalThis.$gameTimer = null
globalThis.$gameMessage = null
globalThis.$gameSwitches = null
globalThis.$gameVariables = null
globalThis.$gameSelfSwitches = null
globalThis.$gameActors = null
globalThis.$gameParty = null
globalThis.$gameTroop = null
globalThis.$gameMap = null
globalThis.$gamePlayer = null
globalThis.$testEvent = null


ImageManager.loadBitmapFromUrl = function (url) {
  const cache = url.includes('/system/') ? this._system : this._cache
  if (!cache[url]) {
    cache[url] = Bitmap.load(fileurl(url))
  }
  return cache[url]
}

PluginManager.loadScript = function (filename: string): void {
  const url = this.makeUrl(filename)

  const script = document.createElement('script')
  // script.type = 'text/javascript'
  script.type = 'module'
  script.src = '@fs' + projectRoot + '/' + url
  script.async = false
  script.defer = true
  // @ts-expect-error to fix this
  script.onerror = this.onError.bind(this)
  script._url = url
  document.body.appendChild(script)
}

DataManager.loadDataFile = function (name: string, src: string): void {
  const t = new XMLHttpRequest()
  const n = fileurl(`data/${src}`)
  // @ts-expect-error to fix
  window[name] = null
  t.open('GET', n)
  t.overrideMimeType('application/json')
  t.onload = () => this.onXhrLoad(t, name, src, n)
  t.onerror = () => this.onXhrError(name, src, n)
  t.send()
}

FontManager.load = function (family, filename) {
  if (this._states[family] !== 'loaded') {
    if (filename) {
      const url = fileurl(this.makeUrl(filename))
      this.startLoading(family, url)
    }
    else {
      this._urls[family] = ''
      this._states[family] = 'loaded'
    }
  }
}

AudioManager.createBuffer = function (folder, name) {
  const ext = this.audioFileExt()
  const url = fileurl(this._path + folder + Utils.encodeURI(name) + ext)
  const buffer = new WebAudio(url)
  buffer.name = name
  buffer.frameCount = Graphics.frameCount
  return buffer
}

const scriptUrls = [
  'js/libs/effekseer.min.js',
  'js/libs/vorbisdecoder.js',
]
const effekseerWasmUrl = 'js/libs/effekseer.wasm'

class Main {
  error: Error | null = null
  xhrSucceeded: boolean = false
  loadCount: number = 0

  numScripts: number | undefined

  constructor() {
    this.xhrSucceeded = false
    this.loadCount = 0
    this.error = null
  }

  run(): void {
    this.showLoadingSpinner()
    this.testXhr()
    this.hookNwjsClose()
    this.loadMainScripts()
  }

  showLoadingSpinner(): void {
    const loadingSpinner = document.createElement('div')
    const loadingSpinnerImage = document.createElement('div')
    loadingSpinner.id = 'loadingSpinner'
    loadingSpinnerImage.id = 'loadingSpinnerImage'
    loadingSpinner.appendChild(loadingSpinnerImage)
    document.body.appendChild(loadingSpinner)
  }

  eraseLoadingSpinner(): void {
    const loadingSpinner = document.getElementById('loadingSpinner')
    if (loadingSpinner) {
      document.body.removeChild(loadingSpinner)
    }
  }

  testXhr(): void {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', import.meta.url)
    xhr.onload = () => (this.xhrSucceeded = true)
    xhr.send()
  }

  hookNwjsClose(): void {
    // [Note] When closing the window, the NW.js process sometimes does
    //   not terminate properly. This code is a workaround for that.
    if (typeof nw === 'object') {
      nw.Window.get().on('close', () => nw.App.quit())
    }
  }

  loadMainScripts(): void {
    for (const url of scriptUrls) {
      const script = document.createElement('script')
      script.type = 'text/javascript'
      script.src = fileurl(url)
      script.async = false
      script.defer = true
      script.onload = this.onScriptLoad.bind(this)
      // @ts-expect-error to fix this
      script.onerror = this.onScriptError.bind(this)
      script._url = url
      document.body.appendChild(script)
    }
    this.numScripts = scriptUrls.length
    window.addEventListener('load', this.onWindowLoad.bind(this))
    window.addEventListener('error', this.onWindowError.bind(this))
  }

  onScriptLoad(): void {
    if (++this.loadCount === this.numScripts) {
      PluginManager.setup($plugins)
    }
  }

  onScriptError(e: ErrorEvent): void {
    this.printError('Failed to load', (e.target as HTMLScriptElement)._url!)
  }

  printError(name: string, message: string): void {
    this.eraseLoadingSpinner()
    if (!document.getElementById('errorPrinter')) {
      const errorPrinter = document.createElement('div')
      errorPrinter.id = 'errorPrinter'
      errorPrinter.innerHTML = this.makeErrorHtml(name, message)
      document.body.appendChild(errorPrinter)
    }
  }

  makeErrorHtml(name: string, message: string): string {
    const nameDiv = document.createElement('div')
    const messageDiv = document.createElement('div')
    nameDiv.id = 'errorName'
    messageDiv.id = 'errorMessage'
    nameDiv.innerHTML = name
    messageDiv.innerHTML = message
    return nameDiv.outerHTML + messageDiv.outerHTML
  }

  onWindowLoad(): void {
    if (!this.xhrSucceeded) {
      const message = 'Your browser does not allow to read local files.'
      this.printError('Error', message)
    }
    else if (this.isPathRandomized()) {
      const message = 'Please move the Game.app to a different folder.'
      this.printError('Error', message)
    }
    else if (this.error) {
      this.printError(this.error.name, this.error.message)
    }
    else {
      this.initEffekseerRuntime()
    }
  }

  onWindowError(event: ErrorEvent): void {
    if (!this.error) {
      this.error = event.error
    }
  }

  isPathRandomized(): boolean {
    // [Note] We cannot save the game properly when Gatekeeper Path
    //   Randomization is in effect.
    return (
      typeof process === 'object'
      && process.mainModule.filename.startsWith('/private/var')
    )
  }

  initEffekseerRuntime(): void {
    const onLoad = this.onEffekseerLoad.bind(this)
    const onError = this.onEffekseerError.bind(this)
    effekseer.initRuntime(fileurl(effekseerWasmUrl), onLoad, onError)
  }

  onEffekseerLoad(): void {
    this.eraseLoadingSpinner()
    SceneManager.run(Scene_Boot)
  }

  onEffekseerError(): void {
    this.printError('Failed to load', effekseerWasmUrl)
  }
}

const main = new Main()
main.run()
