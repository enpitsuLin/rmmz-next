import type GUI from 'lil-gui'
import type { DestroyOptions } from 'pixi.js'
import type { Spriteset_Hd2d } from '../hd2d/sprites/Spriteset_Hd2d'
import type { ColliderDebug, ColliderDebugSettings } from './colliderDebug'
import type { OrbitDebug } from './orbitDebug'
import { GlobalMananger, PluginManager, Spriteset_Map } from 'rmmz-next'
import { createColliderDebug } from './colliderDebug'
import { createDebugPanel } from './debugPanel'
import { installInputIsolationPatch } from './inputIsolation'
import { createOrbitDebug } from './orbitDebug'

interface DebugSpritesetMap extends Spriteset_Map {
  _hd2d?: Spriteset_Hd2d
  _hd2dDebugGui?: GUI | null
  _hd2dColliderDebug?: ColliderDebug | null
  _hd2dOrbitDebug?: OrbitDebug | null
}

let persistedColliderDebug: ColliderDebugSettings | null = null

function loadDebugConfig(): { openByDefault: boolean, showColliders: boolean } {
  const params = PluginManager.parameters('Hd2dDebug') as Record<string, string | undefined>
  return {
    openByDefault: params.openByDefault !== 'false',
    showColliders: params.showColliders === 'true',
  }
}

export function installHd2dDebug(): void {
  const config = loadDebugConfig()
  installInputIsolationPatch()

  const originalCreateLowerLayer = Spriteset_Map.prototype.createLowerLayer
  Spriteset_Map.prototype.createLowerLayer = function (this: DebugSpritesetMap): void {
    originalCreateLowerLayer.call(this)
    const hd2d = this._hd2d
    if (!hd2d)
      return

    const colliderDebug = createColliderDebug()
    if (persistedColliderDebug) {
      Object.assign(colliderDebug.settings, persistedColliderDebug)
    }
    else {
      colliderDebug.settings.enabled = config.showColliders
    }
    colliderDebug.apply()

    const orbitDebug = createOrbitDebug(hd2d.view, hd2d.followCamera)

    hd2d.view.root.addChild(colliderDebug.object)
    this._hd2dColliderDebug = colliderDebug
    this._hd2dOrbitDebug = orbitDebug
    this._hd2dDebugGui = createDebugPanel(
      hd2d.post,
      hd2d.fog,
      hd2d.dust,
      hd2d.followCamera,
      colliderDebug,
      orbitDebug,
      config.openByDefault,
    )
  }

  const originalUpdate = Spriteset_Map.prototype.update
  Spriteset_Map.prototype.update = function (this: DebugSpritesetMap): void {
    originalUpdate.call(this)
    if (this._hd2dColliderDebug) {
      const map = GlobalMananger.$gameMap
      this._hd2dColliderDebug.update(map.width(), map.height())
    }
    this._hd2dOrbitDebug?.update()
  }

  const originalDestroy = Spriteset_Map.prototype.destroy
  Spriteset_Map.prototype.destroy = function (this: DebugSpritesetMap, options: DestroyOptions): void {
    if (this._hd2dOrbitDebug) {
      this._hd2dOrbitDebug.destroy()
      this._hd2dOrbitDebug = null
    }
    if (this._hd2dColliderDebug) {
      persistedColliderDebug = { ...this._hd2dColliderDebug.settings }
      this._hd2dColliderDebug.destroy()
      this._hd2dColliderDebug = null
    }
    if (this._hd2dDebugGui) {
      this._hd2dDebugGui.destroy()
      this._hd2dDebugGui = null
    }
    originalDestroy.call(this, options)
  }
}
