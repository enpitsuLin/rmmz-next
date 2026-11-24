import type { Game_CharacterBase } from 'rmmz-next'

export interface TrailSample {
  x: number
  y: number
  direction: Game_CharacterBase.CharacterDirection
  distance: number
}

const MIN_SAMPLE_STEP = 0.04
const MAX_TRAIL_LENGTH = 8

export class MovementTrail {
  private samples: TrailSample[] = []
  private totalDistance = 0

  reset(x: number, y: number, direction: Game_CharacterBase.CharacterDirection): void {
    this.totalDistance = 0
    this.samples = [{ x, y, direction, distance: 0 }]
  }

  record(x: number, y: number, direction: Game_CharacterBase.CharacterDirection): void {
    const last = this.samples[this.samples.length - 1]
    if (!last) {
      this.reset(x, y, direction)
      return
    }
    const delta = Math.hypot(x - last.x, y - last.y)
    if (delta < MIN_SAMPLE_STEP)
      return
    this.totalDistance += delta
    this.samples.push({ x, y, direction, distance: this.totalDistance })

    const cutoff = this.totalDistance - MAX_TRAIL_LENGTH
    while (this.samples.length > 2 && this.samples[1]!.distance < cutoff) {
      this.samples.shift()
    }
  }

  sampleBehind(distanceBehind: number): TrailSample | null {
    if (this.samples.length === 0)
      return null
    const target = this.totalDistance - distanceBehind
    if (target <= this.samples[0]!.distance)
      return this.samples[0]!

    for (let i = this.samples.length - 1; i > 0; i--) {
      const next = this.samples[i]!
      const prev = this.samples[i - 1]!
      if (target >= prev.distance && target <= next.distance) {
        const span = Math.max(next.distance - prev.distance, 1e-6)
        const t = (target - prev.distance) / span
        return {
          x: prev.x + (next.x - prev.x) * t,
          y: prev.y + (next.y - prev.y) * t,
          direction: next.direction,
          distance: target,
        }
      }
    }
    return this.samples[this.samples.length - 1]!
  }
}
