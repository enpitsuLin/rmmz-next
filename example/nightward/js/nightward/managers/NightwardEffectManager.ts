import type { Frame } from './NightwardAssetManager'
import { EffectManager, Graphics } from 'rmmz-next'
import { loadResource } from '../primitives/resource'

interface EffectEntry { name: string, atlas: string, frame: Frame, mode: string }

const entries = new Map<string, string>()
const key = (atlas: string, frame: Frame, mode: string): string => `${atlas}:${frame.x},${frame.y},${frame.width},${frame.height}:${mode}`

export function getEffekseerEffectName(atlas: string, frame: Frame, mode: string): string | undefined {
  return entries.get(key(atlas, frame, mode))
}

export async function requestEffekseer(): Promise<void> {
  const { effects } = await loadResource<{ effects: EffectEntry[] }>('img/nightward/reference/effekseer.json')
  for (const entry of effects) {
    entries.set(key(entry.atlas, entry.frame, entry.mode), entry.name)
    EffectManager.load(`nightward/${entry.name}`)
  }
}

// Configure the one RMMZ context before any effects are loaded. No second WASM or canvas.
export function installEffekseer(): void {
  Graphics._createEffekseerContext = function (): void {
    this._effekseer = effekseer.createContext()
    this._effekseer.init(this.app.renderer.gl, { instanceMaxCount: 65536, squareMaxCount: 32768 })
    this._effekseer.setRestorationOfStatesFlag(false)
  }
}
