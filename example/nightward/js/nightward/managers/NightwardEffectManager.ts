import type { Frame } from './NightwardAssetManager'
import { EffectManager, Graphics } from 'rmmz-next'

interface EffectEntry { name: string, atlas: string, frame: Frame, mode: string }

const entries = new Map<string, string>()
const key = (atlas: string, frame: Frame, mode: string): string => `${atlas}:${frame.x},${frame.y},${frame.width},${frame.height}:${mode}`

export function getEffekseerEffectName(atlas: string, frame: Frame, mode: string): string | undefined {
  return entries.get(key(atlas, frame, mode))
}

export function requestEffekseer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('GET', 'img/nightward/reference/effekseer.json')
    request.responseType = 'json'
    request.onload = () => {
      if (request.status >= 400) { reject(new Error(`Nightward effects (${request.status})`)); return }
      for (const entry of (request.response as { effects: EffectEntry[] }).effects) {
        entries.set(key(entry.atlas, entry.frame, entry.mode), entry.name)
        EffectManager.load(`nightward/${entry.name}`)
      }
      resolve()
    }
    request.onerror = () => reject(new Error('Nightward effects: effekseer.json'))
    request.send()
  })
}

// Configure the one RMMZ context before any effects are loaded. No second WASM or canvas.
export function installEffekseer(): void {
  Graphics._createEffekseerContext = function (): void {
    this._effekseer = effekseer.createContext()
    this._effekseer.init(this.app.renderer.gl, { instanceMaxCount: 65536, squareMaxCount: 32768 })
    this._effekseer.setRestorationOfStatesFlag(false)
  }
}
