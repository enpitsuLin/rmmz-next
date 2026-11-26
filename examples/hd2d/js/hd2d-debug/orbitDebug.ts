import type { View3D } from '@pixi/3d'
import type { FollowCamera } from '../hd2d/scene/camera'
import { OrbitCamera } from '@pixi/3d/extras'
import { setPointerCaptured } from './inputIsolation'

export interface OrbitDebugSettings {
  enabled: boolean
}

export interface OrbitDebug {
  settings: OrbitDebugSettings
  apply: () => void
  reset: () => void
  update: () => void
  destroy: () => void
}

const ROTATE_SPEED = 0.006
const ZOOM_STEP = 1.12

export function createOrbitDebug(view: View3D, followCamera: FollowCamera): OrbitDebug {
  const settings: OrbitDebugSettings = {
    enabled: false,
  }

  const orbit = new OrbitCamera({
    view,
    enabled: false,
    autoUpdate: false,
    enableDamping: true,
    dampingFactor: 0.14,
    minDistance: 0.8,
    maxDistance: 25,
    minPolarAngle: 0.05,
    maxPolarAngle: Math.PI * 0.495,
  })

  let active = false
  let dragMode: 'rotate' | 'pan' | null = null
  let lastX = 0
  let lastY = 0
  let activePointerId = -1

  const isInsideGui = (target: EventTarget | null): boolean => {
    return target instanceof Element && Boolean(target.closest('.lil-gui'))
  }

  const onPointerDown = (event: PointerEvent): void => {
    if (!active || isInsideGui(event.target))
      return
    if (event.button === 0)
      dragMode = event.shiftKey || event.ctrlKey || event.metaKey ? 'pan' : 'rotate'
    else if (event.button === 1 || event.button === 2)
      dragMode = 'pan'
    else
      return

    activePointerId = event.pointerId
    lastX = event.clientX
    lastY = event.clientY
    event.preventDefault()
  }

  const onPointerMove = (event: PointerEvent): void => {
    if (!active || !dragMode || event.pointerId !== activePointerId)
      return
    const dx = event.clientX - lastX
    const dy = event.clientY - lastY
    lastX = event.clientX
    lastY = event.clientY

    if (dragMode === 'rotate')
      orbit.rotate(dx * ROTATE_SPEED, dy * ROTATE_SPEED)
    else
      orbit.pan(dx, dy)
    event.preventDefault()
  }

  const onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== activePointerId)
      return
    dragMode = null
    activePointerId = -1
  }

  const onWheel = (event: WheelEvent): void => {
    if (!active || isInsideGui(event.target))
      return
    const factor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP
    orbit.zoom(factor)
    event.preventDefault()
  }

  const onContextMenu = (event: MouseEvent): void => {
    if (active && !isInsideGui(event.target))
      event.preventDefault()
  }

  const bindListeners = (): void => {
    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    document.addEventListener('wheel', onWheel, { passive: false })
    document.addEventListener('contextmenu', onContextMenu)
  }

  const unbindListeners = (): void => {
    document.removeEventListener('pointerdown', onPointerDown)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerUp)
    document.removeEventListener('wheel', onWheel)
    document.removeEventListener('contextmenu', onContextMenu)
    dragMode = null
    activePointerId = -1
  }

  const syncFromFollowCamera = (): void => {
    const target = followCamera.getTarget()
    orbit.target.set(target.x, target.y, target.z)
    orbit.update()
    orbit.saveState()
  }

  const apply = (): void => {
    if (settings.enabled === active)
      return
    active = settings.enabled

    if (active) {
      followCamera.setPaused(true)
      syncFromFollowCamera()
      setPointerCaptured(true)
      bindListeners()
    }
    else {
      unbindListeners()
      setPointerCaptured(false)
      followCamera.setPaused(false)
    }
  }

  const reset = (): void => {
    if (!active)
      return
    followCamera.setPaused(false)
    followCamera.setPaused(true)
    syncFromFollowCamera()
  }

  const update = (): void => {
    if (!active)
      return
    orbit.update()
  }

  const destroy = (): void => {
    if (active) {
      active = false
      unbindListeners()
      setPointerCaptured(false)
      followCamera.setPaused(false)
    }
    orbit.destroy()
  }

  return { settings, apply, reset, update, destroy }
}
