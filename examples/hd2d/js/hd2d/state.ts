import type { CameraSettings } from './scene/camera'
import type { DustSettings } from './scene/dust'
import type { FogSettings } from './scene/fog'
import type { PostProcessingSettings } from './scene/postProcessing'

export interface PersistedHd2dState {
  post?: PostProcessingSettings
  fog?: FogSettings
  dust?: DustSettings
  camera?: CameraSettings
}

export const persistedHd2dState: PersistedHd2dState = {}
