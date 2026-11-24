import { packParticleColor, ParticleContainer3D } from '@pixi/3d'
import { Color } from 'pixi.js'

const MAX_PARTICLES = 200
export const HALF_AREA = 3.2

export interface DustSettings {
  enabled: boolean
  size: number
  randomness: number
  speed: number
  count: number
  color: string
}

export interface DustParticle {
  x: number
  y: number
  z: number
  drift: number
  rise: number
}

export interface Dust {
  settings: DustSettings
  object: ParticleContainer3D
  apply: () => void
  update: (delta: number, centerX: number, centerZ: number) => void
}

export function createDust(): Dust {
  const settings: DustSettings = {
    enabled: true,
    size: 0.008,
    randomness: 3,
    speed: 0.005,
    count: 60,
    color: '#ffD39B',
  }
  const object = new ParticleContainer3D({ capacity: MAX_PARTICLES })
  const particles: DustParticle[] = Array.from({ length: MAX_PARTICLES }, () => ({
    x: (Math.random() * 2 - 1) * HALF_AREA,
    y: Math.random() * HALF_AREA * 1.4,
    z: (Math.random() * 2 - 1) * HALF_AREA,
    drift: (Math.random() - 0.5) / 5,
    rise: Math.random() / 5,
  }))

  const color = new Color()
  let tint = 0
  let visibleCount = 0

  const apply = (): void => {
    object.visible = settings.enabled
    tint = packParticleColor(color.setValue(settings.color).toNumber(), 0.8)
    if (settings.count < visibleCount)
      object.clear()
    visibleCount = settings.count
  }

  const update = (delta: number, centerX: number, centerZ: number): void => {
    if (!settings.enabled)
      return

    const speed = settings.speed * delta * 60
    const maxY = HALF_AREA * 1.4
    for (let index = 0; index < settings.count; index++) {
      const particle = particles[index]!
      particle.x += particle.drift * speed * settings.randomness
      particle.y -= particle.rise * speed
      if (Math.abs(particle.x) >= HALF_AREA)
        particle.x *= -1
      if (particle.y <= 0.05)
        particle.y = maxY
      object.writePacked(
        index,
        centerX + particle.x,
        particle.y,
        centerZ + particle.z,
        settings.size,
        0,
        tint,
      )
    }
    object.upload()
  }

  apply()
  return { settings, object, apply, update }
}
