import { Graphics } from 'rmmz-next'

function switchFullscreen(): void {
  if (document.fullscreenElement)
    void document.exitFullscreen()
  else if (document.fullscreenEnabled)
    void document.documentElement.requestFullscreen()
}

export function installGraphicsPatch(): void {
  Graphics._isFullScreen = () => !!document.fullscreenElement
  Graphics._switchFullScreen = switchFullscreen
  // Configure the single RMMZ Effekseer context before any effects are loaded.
  Graphics._createEffekseerContext = function (): void {
    this._effekseer = effekseer.createContext()
    this._effekseer.init(this.app.renderer.gl, { instanceMaxCount: 65536, squareMaxCount: 32768 })
    this._effekseer.setRestorationOfStatesFlag(false)
  }
}

export function toggleFullscreen(): void {
  Graphics._switchFullScreen()
}
