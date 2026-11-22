import type { Frame } from './NightwardAssetManager'
import { EffectManager } from 'rmmz-next'
import { loadResource } from '../primitives/resource'

interface EffectEntry { name: string, atlas: string, frame: Frame, mode: string }

/**
 * The static class that registers and resolves Nightward Effekseer effect names.
 */
export class NightwardEffectManager {
  static _entries = new Map<string, string>()

  constructor() {
    throw new Error('This is a static class')
  }

  private static key(atlas: string, frame: Frame, mode: string): string {
    return `${atlas}:${frame.x},${frame.y},${frame.width},${frame.height}:${mode}`
  }

  static effectName(atlas: string, frame: Frame, mode: string): string | undefined {
    return this._entries.get(this.key(atlas, frame, mode))
  }

  static async load(): Promise<void> {
    const { effects } = await loadResource<{ effects: EffectEntry[] }>('img/nightward/reference/effekseer.json')
    for (const entry of effects) {
      this._entries.set(this.key(entry.atlas, entry.frame, entry.mode), entry.name)
      EffectManager.load(`nightward/${entry.name}`)
    }
  }

  static isReady(): boolean {
    return EffectManager.isReady()
  }
}
