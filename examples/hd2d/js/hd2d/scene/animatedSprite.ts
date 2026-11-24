import type { BaseMaterial3D } from '@pixi/3d'
import { Sprite3D } from '@pixi/3d'
import { Rectangle, Texture } from 'pixi.js'
import { hd2dAssetUrl } from '../constants'
import { loadPixelTexture } from '../utils/texture'
import { addSpriteShadow } from './spriteShadow'

const PIXELS_TO_WORLD = 0.01

export interface AtlasFrame {
  name: string
  texture: Texture
}

export interface AtlasJson {
  frames: Record<string, { frame: { x: number, y: number, w: number, h: number } }>
}

export type AnimationDefinitions = Record<string, string>

type Clips = Record<string, AtlasFrame[]>

export interface AnimatedSpriteOptions {
  image: string
  atlas: string
  definitions: AnimationDefinitions
  animation: string
  fps: number
  material?: BaseMaterial3D
  castShadow?: boolean
  loop?: boolean
}

export interface AnimatedSprite {
  sprite: Sprite3D
  clips: Clips
  clip: AtlasFrame[]
  frameIndex: number
  cooldown: number
  fps: number
  loop: boolean
  updateShadow?: (texture: Texture) => void
}

const TRAILING_DIGITS = /\d+$/
const TRAILING_INDEX = /_*\d+$/

function expandDefinition(definition: string): number[] {
  const indices: number[] = []

  for (const step of definition.split(',')) {
    const match = /^\s*(\d+)(?:\s*-\s*(\d+))?(?:\s*\(\s*(\d+)\s*\))?\s*$/.exec(step)
    if (!match)
      throw new Error(`Invalid animation definition step "${step}" in "${definition}"`)

    const start = Number(match[1])
    const end = match[2] === undefined ? start : Number(match[2])
    const duration = match[3] === undefined ? 1 : Number(match[3])
    const delta = Math.sign(end - start)

    for (let index = start; ; index += delta) {
      for (let repeat = 0; repeat < duration; repeat++)
        indices.push(index)
      if (index === end)
        break
    }
  }

  return indices
}

function buildClips(atlas: AtlasJson, baseTexture: Texture, definitions: AnimationDefinitions): Clips {
  const buckets: Record<string, AtlasFrame[]> = {}

  for (const [name, entry] of Object.entries(atlas.frames)) {
    const clipName = name.replace(TRAILING_INDEX, '')
    const { x, y, w, h } = entry.frame
    const texture = new Texture({ source: baseTexture.source, frame: new Rectangle(x, y, w, h) })
    ;(buckets[clipName] ??= []).push({ name, texture })
  }

  for (const frames of Object.values(buckets)) {
    frames.sort((a, b) => Number(TRAILING_DIGITS.exec(a.name)?.[0] ?? 0) - Number(TRAILING_DIGITS.exec(b.name)?.[0] ?? 0))
  }

  const clips: Clips = {}
  for (const [name, definition] of Object.entries(definitions)) {
    const frames = buckets[name]
    if (!frames)
      throw new Error(`Missing atlas frames for clip "${name}"`)
    clips[name] = expandDefinition(definition).map((index) => {
      const frame = frames[index]
      if (!frame)
        throw new Error(`Frame index ${index} out of range for clip "${name}"`)
      return frame
    })
  }

  return clips
}

export async function createAnimatedSprite(options: AnimatedSpriteOptions): Promise<AnimatedSprite> {
  const [baseTexture, atlasResponse] = await Promise.all([
    loadPixelTexture(options.image),
    fetch(hd2dAssetUrl(options.atlas)),
  ])
  if (!atlasResponse.ok)
    throw new Error(`Failed to load atlas: ${options.atlas} (${atlasResponse.status})`)

  const atlas = (await atlasResponse.json()) as AtlasJson
  const clips = buildClips(atlas, baseTexture, options.definitions)
  const clip = clips[options.animation]
  if (!clip || clip.length === 0)
    throw new Error(`Missing initial animation "${options.animation}"`)

  const first = clip[0]!
  const sprite = new Sprite3D({
    texture: first.texture,
    pixelSize: PIXELS_TO_WORLD,
    billboardMode: 'none',
    material: options.material,
    receiveShadow: true,
  })
  const updateShadow = options.castShadow ? addSpriteShadow(sprite) : undefined

  return {
    sprite,
    clips,
    clip,
    frameIndex: 0,
    cooldown: 0,
    fps: options.fps,
    loop: options.loop ?? true,
    updateShadow,
  }
}

export function stepAnimatedSprite(anim: AnimatedSprite, delta: number): void {
  if (anim.clip.length <= 1)
    return

  const frameDuration = 1 / anim.fps
  anim.cooldown += delta
  if (anim.cooldown < frameDuration)
    return

  const steps = Math.floor(anim.cooldown / frameDuration)
  anim.cooldown -= steps * frameDuration
  const nextIndex = anim.loop
    ? (anim.frameIndex + steps) % anim.clip.length
    : Math.min(anim.frameIndex + steps, anim.clip.length - 1)

  if (nextIndex !== anim.frameIndex) {
    anim.frameIndex = nextIndex
    const texture = anim.clip[nextIndex]!.texture
    anim.sprite.texture = texture
    anim.updateShadow?.(texture)
  }
}
