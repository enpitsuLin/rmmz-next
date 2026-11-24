import type { Camera3D } from '@pixi/3d'

export interface CameraSettings {
  follow: boolean
  fov: number
  offsetX: number
  offsetY: number
  offsetZ: number
  lookAtY: number
  damping: number
}

export interface CameraBounds {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export interface FollowCamera {
  settings: CameraSettings
  apply: () => void
  snapTo: (targetX: number, targetZ: number) => void
  update: (targetX: number, targetZ: number, delta: number) => void
}

function clamp(value: number, min: number, max: number): number {
  if (min >= max)
    return (min + max) * 0.5
  return Math.max(min, Math.min(max, value))
}

export function createFollowCamera(camera: Camera3D, bounds: CameraBounds): FollowCamera {
  const settings: CameraSettings = {
    follow: true,
    fov: 45,
    offsetX: -0.25,
    offsetY: 1.72,
    offsetZ: 5.52,
    lookAtY: 0.15,
    damping: 7,
  }

  let focusX = 0
  let focusZ = 0

  const applyTransform = (): void => {
    camera.fov = settings.fov
    camera.near = 0.1
    camera.far = 100
    const anchorX = settings.follow ? focusX : 0
    const anchorZ = settings.follow ? focusZ : 0
    camera.position.set(
      anchorX + settings.offsetX,
      settings.offsetY,
      anchorZ + settings.offsetZ,
    )
    camera.lookAt({ x: anchorX, y: settings.lookAtY, z: anchorZ })
  }

  const snapTo = (targetX: number, targetZ: number): void => {
    focusX = clamp(targetX, bounds.minX, bounds.maxX)
    focusZ = clamp(targetZ, bounds.minZ, bounds.maxZ)
    applyTransform()
  }

  const update = (targetX: number, targetZ: number, delta: number): void => {
    const clampedX = clamp(targetX, bounds.minX, bounds.maxX)
    const clampedZ = clamp(targetZ, bounds.minZ, bounds.maxZ)
    const alpha = 1 - Math.exp(-Math.max(settings.damping, 0.01) * delta)
    focusX += (clampedX - focusX) * alpha
    focusZ += (clampedZ - focusZ) * alpha
    applyTransform()
  }

  applyTransform()
  return {
    settings,
    apply: applyTransform,
    snapTo,
    update,
  }
}
