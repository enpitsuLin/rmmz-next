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
  setPaused: (paused: boolean) => void
  getTarget: () => { x: number, y: number, z: number }
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
  let paused = false

  const getTarget = (): { x: number, y: number, z: number } => ({
    x: settings.follow ? focusX : 0,
    y: settings.lookAtY,
    z: settings.follow ? focusZ : 0,
  })

  const applyTransform = (): void => {
    camera.fov = settings.fov
    camera.near = 0.1
    camera.far = 100
    if (paused)
      return
    const target = getTarget()
    camera.position.set(
      target.x + settings.offsetX,
      settings.offsetY,
      target.z + settings.offsetZ,
    )
    camera.lookAt(target)
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

  const setPaused = (nextPaused: boolean): void => {
    paused = nextPaused
    if (!paused)
      applyTransform()
  }

  applyTransform()
  return {
    settings,
    apply: applyTransform,
    snapTo,
    update,
    setPaused,
    getTarget,
  }
}
