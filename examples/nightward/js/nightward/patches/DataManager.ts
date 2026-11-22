import { DataManager } from 'rmmz-next'
import { NightwardDataManager } from '../managers/NightwardDataManager'

export function installDataManagerPatch(): void {
  const _onLoad = DataManager.onLoad
  DataManager.onLoad = function (object): void {
    _onLoad.call(this, object)
    NightwardDataManager.onDatabaseLoad()
  }
}
