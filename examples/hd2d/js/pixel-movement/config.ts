import { PluginManager } from 'rmmz-next'

export interface PixelMovementConfig {
  colliderRadius: number
  speedScale: number
  cornerSlide: number
  interactRange: number
  followSpacing: number
  enableWasd: boolean
}

function readNumber(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

function readBoolean(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined)
    return fallback
  return raw !== 'false' && raw !== '0'
}

export function loadPixelMovementConfig(): PixelMovementConfig {
  const params = PluginManager.parameters('PixelMovement') as Record<string, string | undefined>
  return {
    colliderRadius: readNumber(params.colliderRadius, 0.28),
    speedScale: readNumber(params.speedScale, 1),
    cornerSlide: readNumber(params.cornerSlide, 0.35),
    interactRange: readNumber(params.interactRange, 0.78),
    followSpacing: readNumber(params.followSpacing, 0.75),
    enableWasd: readBoolean(params.enableWasd, true),
  }
}
