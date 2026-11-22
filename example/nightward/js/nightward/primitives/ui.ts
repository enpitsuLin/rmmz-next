import { Graphics, Input, TouchInput } from 'rmmz-next'

export const colors = { lantern: 16761944, lanternDeep: 16754744, text: 16773330, blue: 11845602, label: 12897258, edge: 6054008, dim: 9081784, rule: 14858336, gold: 16177288, night: 132108, death: 918023, dawn: 658456, page: 329231 }
export const clamp = (n: number): number => Math.max(0, Math.min(1, n))
export const phase = (time: number, at: number, seconds: number): number => clamp((time - at) / seconds)
export const out = (n: number, power = 3): number => 1 - (1 - n) ** power
export const back = (n: number, strength = 1.5): number => 1 + (strength + 1) * (n - 1) ** 3 + strength * (n - 1) ** 2
export const sine = (n: number): number => .5 - .5 * Math.cos(Math.PI * n)
export const approach = (a: number, b: number, speed: number, dt: number): number => a + (b - a) * (1 - Math.exp(-speed * dt))
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)')
const coarsePointer = matchMedia('(pointer: coarse)')
export const reducedMotion = (): boolean => motionPreference.matches
export const clock = (seconds: number): string => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
export function consumeInput(): void {
  // Keep held movement keys while consuming the menu's activation edge.
  Input._previousState = { ...Input._currentState }; Input._latestButton = null; Input._pressedTime = 0; Input._virtualButton = null
  TouchInput._currentState = TouchInput._createNewState(); TouchInput._newState = TouchInput._createNewState(); TouchInput._clicked = false
}
export function mixColor(a: number, b: number, k: number): number {
  return Math.round((a >> 16) + ((b >> 16) - (a >> 16)) * k) << 16 | Math.round((a >> 8 & 255) + ((b >> 8 & 255) - (a >> 8 & 255)) * k) << 8 | Math.round((a & 255) + ((b & 255) - (a & 255)) * k)
}
const uiDensity = (): number => Math.min(devicePixelRatio, 1.5)
export const snap = (value: number): number => Math.round(value * uiDensity()) / uiDensity()
export const largeScale = (unit: number): number => Math.max(2, Math.round(unit * uiDensity() * 1.5)) / uiDensity()
export interface UiLayout { width: number, height: number, unit: number, icon: number, resolution: number, w: number, h: number, margin: number, portrait: boolean, short: boolean, tap: number }
export function uiLayout(): UiLayout {
  const width = Graphics.width, height = Graphics.height, resolution = uiDensity(), pixelsW = Math.round(width * resolution), pixelsH = Math.round(height * resolution), pixelUnit = Math.max(2, Math.round(Math.min(pixelsW, pixelsH) / 290)), unit = pixelUnit / resolution
  return { width, height, unit, icon: Math.max(2, Math.round(pixelUnit * .7)) / resolution, resolution, w: Math.floor(pixelsW / pixelUnit), h: Math.floor(pixelsH / pixelUnit), margin: 4 * unit, portrait: height > width, short: Math.floor(pixelsH / pixelUnit) < 240, tap: coarsePointer.matches ? Math.ceil(44 / unit) : 0 }
}
export const fitScale = (texels: number, width: number, maximum: number): number => Math.max(1 / uiDensity(), Math.min(maximum, Math.floor(width * uiDensity() / Math.max(1, texels)) / uiDensity()))

export function fullscreen(): void {
  if (document.fullscreenElement) void document.exitFullscreen()
  else if (document.fullscreenEnabled) void document.documentElement.requestFullscreen()
}

export interface IconPoint { x: number, y: number, scale: number }

export const introAlpha = (age: number, at = 0): number => reducedMotion() ? phase(age, 0, .15) : phase(age, at, .3)
