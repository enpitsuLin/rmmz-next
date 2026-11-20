import type { MainOptions } from './types'
import {
  GlobalMananger,
  initEffekseerRuntime,
  loadExternalLibs,
  PluginManager,
  Scene_Boot,
  SceneManager,
} from '@rmmz-lib/core'

interface NwWindow {
  on: (event: 'close', listener: () => void) => void
}

interface NwGlobal {
  App: { quit: () => void }
  Window: { get: () => NwWindow }
}

interface NodeLikeProcess {
  mainModule?: { filename?: string }
}

/**
 * Boots an RPG Maker MZ game in a bundled host.
 *
 * Everything project- or bundler-specific is injected through
 * {@link MainOptions}, so this class never imports Vite virtual modules.
 * The engine libraries (Effekseer, Vorbis decoder) are owned by core.
 */
export class Main {
  private error: Error | null = null
  private xhrSucceeded = false
  private ready: Promise<void> = Promise.resolve()

  private readonly plugins: PluginManager.PluginConfig[]
  private readonly loadPluginModules: (() => Promise<void>) | undefined

  constructor(options: MainOptions) {
    this.plugins = options.plugins ?? []
    this.loadPluginModules = options.loadPlugins
  }

  run(): this {
    void GlobalMananger.init()
    this.showLoadingSpinner()
    this.testXhr()
    this.hookNwjsClose()

    window.addEventListener('load', () => this.onWindowLoad())
    window.addEventListener('error', event => this.onWindowError(event))

    this.ready = this.loadRuntime()
    return this
  }

  private async loadRuntime(): Promise<void> {
    try {
      await loadExternalLibs()
      PluginManager.setup(this.plugins)
      await this.loadPluginModules?.()
    }
    catch (e) {
      this.error = e instanceof Error ? e : new Error(String(e))
    }
  }

  private showLoadingSpinner(): void {
    const loadingSpinner = document.createElement('div')
    const loadingSpinnerImage = document.createElement('div')
    loadingSpinner.id = 'loadingSpinner'
    loadingSpinnerImage.id = 'loadingSpinnerImage'
    loadingSpinner.appendChild(loadingSpinnerImage)
    document.body.appendChild(loadingSpinner)
  }

  private eraseLoadingSpinner(): void {
    const loadingSpinner = document.getElementById('loadingSpinner')
    if (loadingSpinner) {
      document.body.removeChild(loadingSpinner)
    }
  }

  private testXhr(): void {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', import.meta.url)
    xhr.onload = () => (this.xhrSucceeded = true)
    xhr.send()
  }

  private hookNwjsClose(): void {
    // [Note] When closing the window, the NW.js process sometimes does
    //   not terminate properly. This code is a workaround for that.
    const nw = (globalThis as { nw?: NwGlobal }).nw
    if (nw) {
      nw.Window.get().on('close', () => nw.App.quit())
    }
  }

  private onWindowLoad(): void {
    if (!this.xhrSucceeded) {
      const message = 'Your browser does not allow to read local files.'
      this.printError('Error', message)
    }
    else if (this.isPathRandomized()) {
      const message = 'Please move the Game.app to a different folder.'
      this.printError('Error', message)
    }
    else {
      void this.startRuntime()
    }
  }

  private async startRuntime(): Promise<void> {
    await this.ready
    if (this.error) {
      this.printError(this.error.name, this.error.message)
      return
    }
    try {
      await initEffekseerRuntime()
    }
    catch (e) {
      const error = e instanceof Error ? e : new Error(String(e))
      this.printError(error.name, error.message)
      return
    }
    this.startGame()
  }

  private onWindowError(event: ErrorEvent): void {
    if (!this.error) {
      this.error = event.error
    }
  }

  private isPathRandomized(): boolean {
    // [Note] We cannot save the game properly when Gatekeeper Path
    //   Randomization is in effect.
    // NW.js exposes Node's process on the global object.
    // eslint-disable-next-line node/prefer-global/process
    const nodeProcess = (globalThis as { process?: NodeLikeProcess }).process
    const filename = nodeProcess?.mainModule?.filename
    return filename?.startsWith('/private/var') ?? false
  }

  private startGame(): void {
    this.eraseLoadingSpinner()
    SceneManager.run(Scene_Boot)
  }

  private printError(name: string, message: string): void {
    this.eraseLoadingSpinner()
    if (!document.getElementById('errorPrinter')) {
      const errorPrinter = document.createElement('div')
      errorPrinter.id = 'errorPrinter'
      errorPrinter.innerHTML = this.makeErrorHtml(name, message)
      document.body.appendChild(errorPrinter)
    }
  }

  private makeErrorHtml(name: string, message: string): string {
    const nameDiv = document.createElement('div')
    const messageDiv = document.createElement('div')
    nameDiv.id = 'errorName'
    messageDiv.id = 'errorMessage'
    nameDiv.innerHTML = name
    messageDiv.innerHTML = message
    return nameDiv.outerHTML + messageDiv.outerHTML
  }
}
