import { DataManager, PluginManager, Scene_Boot, SceneManager } from '@rmmz-lib/core'
import { $plugins } from 'virtual:rmmz-plugins'

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

const availablePlugins = new Map(
  Object.entries(
    import.meta.glob<string>('../project/js/plugins/*.js', { eager: true, query: '?url', import: 'default' }),
  ).map(([url, mod]) => {
    const name = url.split('/').pop()?.replace(/\.js$/, '') ?? ''
    return [name, mod]
  }),
)

const allData = new Map(
  Object.entries(
    import.meta.glob<string>('../project/data/*.json', { eager: true, query: '?raw', import: 'default' }),
  ).map(([url, mod]) => {
    const name = url.split('/').pop() ?? ''
    return [name, mod]
  }),
)

PluginManager.loadScript = function (filename: string): void {
  if (availablePlugins.has(filename)) {
    import(availablePlugins.get(filename)!)
      .catch((_err) => {
        this.onError.bind(this)
      })
  }
}

DataManager.loadDataFile = function (name: string, src: string): void {
  if (allData.has(src)) {
    /// @ts-expect-error to fix
    window[name] = JSON.parse(allData.get(src)!)
    // @ts-expect-error to fix
    this.onLoad(window[name])
  }
}

const scriptUrls = [
  new URL('/project/js/libs/effekseer.min.js', import.meta.url).href,
  new URL('/project/js/libs/vorbisdecoder.js', import.meta.url).href,
]
const effekseerWasmUrl = new URL('/project/js/libs/effekseer.wasm', import.meta.url).href

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
      script.src = url
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
    effekseer.initRuntime(effekseerWasmUrl, onLoad, onError)
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
