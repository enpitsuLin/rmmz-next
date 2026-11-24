import type { View3D } from '@pixi/3d'

export interface FogSettings {
  enabled: boolean
  color: string
  density: number
}

export interface Fog {
  settings: FogSettings
  apply: () => void
}

export function createFog(view: View3D): Fog {
  const settings: FogSettings = { enabled: true, color: '#0f1b1a', density: 0.06 }

  const apply = (): void => {
    view.fog = settings.enabled ? { type: 'exp2', color: settings.color, density: settings.density } : null
  }

  apply()
  return { settings, apply }
}
