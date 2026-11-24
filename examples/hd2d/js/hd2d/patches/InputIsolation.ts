import { Input, TouchInput } from 'rmmz-next'

function isInsideDebugPanel(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('.lil-gui'))
}

export function installInputIsolationPatch(): void {
  const originalMouseDown = TouchInput._onMouseDown
  TouchInput._onMouseDown = function (event: MouseEvent): void {
    if (isInsideDebugPanel(event.target))
      return
    originalMouseDown.call(this, event)
  }

  const originalMouseMove = TouchInput._onMouseMove
  TouchInput._onMouseMove = function (event: MouseEvent): void {
    if (isInsideDebugPanel(event.target))
      return
    originalMouseMove.call(this, event)
  }

  const originalWheel = TouchInput._onWheel
  TouchInput._onWheel = function (event: WheelEvent): void {
    if (isInsideDebugPanel(event.target))
      return
    originalWheel.call(this, event)
  }

  const originalTouchStart = TouchInput._onTouchStart
  TouchInput._onTouchStart = function (event: TouchEvent): void {
    if (isInsideDebugPanel(event.target))
      return
    originalTouchStart.call(this, event)
  }

  const originalKeyDown = Input._onKeyDown
  Input._onKeyDown = function (event: KeyboardEvent): void {
    if (isInsideDebugPanel(event.target))
      return
    originalKeyDown.call(this, event)
  }
}
