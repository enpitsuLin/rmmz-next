import { packParticleColor, ParticleContainer3D } from '@pixi/3d'
import { Color } from 'pixi.js'

const MAX_PARTICLES = 200
export const HALF_AREA = 3.2

function wrapCoord(value: number, center: number, halfSpan: number): number {
  const span = halfSpan * 2
  const rel = value - center
  return center + ((((rel + halfSpan) % span) + span) % span) - halfSpan
}

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
      particle.x = wrapCoord(particle.x + particle.drift * speed * settings.randomness, centerX, HALF_AREA)
      particle.y -= particle.rise * speed
      particle.z = wrapCoord(particle.z, centerZ, HALF_AREA)
      if (particle.y <= 0.05)
        particle.y = maxY
      object.writePacked(
        index,
        particle.x,
        particle.y,
        particle.z,
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
