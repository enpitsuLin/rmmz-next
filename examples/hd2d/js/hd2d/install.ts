import { installInputIsolationPatch } from './patches/InputIsolation'
import { installSceneMapPatch } from './patches/Scene_Map'
import '@pixi/3d'

export function installHd2d(): void {
  installInputIsolationPatch()
  installSceneMapPatch()
}
