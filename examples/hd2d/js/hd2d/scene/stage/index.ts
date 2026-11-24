import type { Game_Event } from 'rmmz-next'
import type { AnimatedSprite } from '../animatedSprite'
import type { StreetLightProp } from './streetLight'
import type { TorchProp } from './torch'
import { Container3D, DirectionalLight, PointLight } from '@pixi/3d'
import { GlobalMananger } from 'rmmz-next'
import { tileToWorld } from '../../constants'
import { createBoard } from './board'
import { createGrass } from './grass'
import { createGround } from './ground'
import { createRocks } from './rock'
import { createStreetLight } from './streetLight'
import { createTorch } from './torch'
import { createTrees } from './tree'
import { createWood } from './wood'

export interface StageData {
  object: Container3D
  spriteLights: PointLight[]
  lampSwings: StreetLightProp['lampSwing'][]
  lightFlickers: TorchProp['lightFlicker'][]
  animatedSprites: AnimatedSprite[]
}

interface CustomLightConfig {
  color: number
  intensity: number
  range: number
  y: number
  castShadow: boolean
}

function parseCustomLight(note: string): CustomLightConfig | null {
  const match = /<hd2d-light([^>]*)>/i.exec(note)
  if (!match)
    return null
  const attrs = match[1] ?? ''
  const colorMatch = /color=["']?#?([0-9a-f]{6})["']?/i.exec(attrs)
  const intensityMatch = /intensity=["']?([\d.]+)["']?/i.exec(attrs)
  const rangeMatch = /range=["']?([\d.]+)["']?/i.exec(attrs)
  const yMatch = /y=["']?([\d.]+)["']?/i.exec(attrs)
  const shadowMatch = /shadow=["']?(true|false)["']?/i.exec(attrs)
  return {
    color: colorMatch ? Number.parseInt(colorMatch[1]!, 16) : 0xFFCC88,
    intensity: intensityMatch ? Number(intensityMatch[1]) : 8,
    range: rangeMatch ? Number(rangeMatch[1]) : 3,
    y: yMatch ? Number(yMatch[1]) : 0.85,
    castShadow: shadowMatch ? shadowMatch[1] === 'true' : false,
  }
}

function parseRotation(note: string, fallback: number): number {
  const match = /<hd2d-rot:(-?[\d.]+)>/i.exec(note)
  return match ? Number(match[1]) : fallback
}

function eventWorldPos(event: Game_Event, mapWidth: number, mapHeight: number): { x: number, z: number } {
  return tileToWorld(event._realX, event._realY, mapWidth, mapHeight)
}

export async function createStage(): Promise<StageData> {
  const map = GlobalMananger.$gameMap
  const dataMap = GlobalMananger.$dataMap
  const mapWidth = map.width()
  const mapHeight = map.height()
  const mapNote = dataMap?.note ?? ''
  const useClearingPreset = /<hd2d-preset:clearing>/i.test(mapNote)

  const group = new Container3D({ label: '场景' })
  const spriteLights: PointLight[] = []
  const lampSwings: StreetLightProp['lampSwing'][] = []
  const lightFlickers: TorchProp['lightFlicker'][] = []
  const animatedSprites: AnimatedSprite[] = []

  const ground = await createGround(mapWidth, mapHeight)
  group.addChild(ground)

  // Soft moonlight ensures every character casts a grounded silhouette across the entire map.
  const moonLight = new DirectionalLight({
    color: 0x9BB5D6,
    intensity: 0.55,
    castShadow: true,
    shadow: { cascades: 1, maxDistance: 12, bias: 0.0005 },
  })
  moonLight.position.set(-4, 7, 5)
  moonLight.lookAt({ x: 0, y: 0, z: 0 })
  group.addChild(moonLight)

  let hasEventBoard = false
  let hasEventStreetLight = false
  let hasEventTorch = false

  const eventPromises: Promise<void>[] = []
  for (const event of map.events()) {
    const note = event.event()?.note ?? ''
    const pos = eventWorldPos(event, mapWidth, mapHeight)

    if (/<hd2d-board>/i.test(note)) {
      hasEventBoard = true
      const rot = parseRotation(note, -0.35)
      eventPromises.push(
        createBoard(pos.x, pos.z, rot).then((board) => {
          group.addChild(board)
        }),
      )
    }

    if (/<hd2d-streetlight>/i.test(note)) {
      hasEventStreetLight = true
      const rot = parseRotation(note, 0.1)
      eventPromises.push(
        createStreetLight(pos.x, pos.z, rot).then((streetLight) => {
          group.addChild(streetLight.object)
          spriteLights.push(streetLight.spriteLight)
          lampSwings.push(streetLight.lampSwing)
        }),
      )
    }

    if (/<hd2d-torch>/i.test(note)) {
      hasEventTorch = true
      const rot = parseRotation(note, -0.35)
      eventPromises.push(
        createTorch(pos.x, pos.z, rot).then((torch) => {
          group.addChild(torch.object)
          spriteLights.push(torch.spriteLight)
          lightFlickers.push(torch.lightFlicker)
          animatedSprites.push(...torch.sprites)
        }),
      )
    }

    const customLight = parseCustomLight(note)
    if (customLight) {
      const light = new PointLight({
        color: customLight.color,
        intensity: customLight.intensity,
        range: customLight.range,
        decay: 0.5,
        position: { x: pos.x, y: customLight.y, z: pos.z },
        castShadow: customLight.castShadow,
      })
      group.addChild(light)
      spriteLights.push(light)
    }
  }

  if (useClearingPreset) {
    const [trees, grass, wood, rocks] = await Promise.all([
      createTrees(),
      createGrass(),
      createWood(),
      createRocks(),
    ])
    group.addChild(trees, grass, wood, rocks)

    if (!hasEventBoard) {
      eventPromises.push(createBoard().then((board) => {
        group.addChild(board)
      }))
    }
    if (!hasEventStreetLight) {
      eventPromises.push(createStreetLight().then((streetLight) => {
        group.addChild(streetLight.object)
        spriteLights.push(streetLight.spriteLight)
        lampSwings.push(streetLight.lampSwing)
      }))
    }
    if (!hasEventTorch) {
      eventPromises.push(createTorch().then((torch) => {
        group.addChild(torch.object)
        spriteLights.push(torch.spriteLight)
        lightFlickers.push(torch.lightFlicker)
        animatedSprites.push(...torch.sprites)
      }))
    }
  }

  await Promise.all(eventPromises)

  return {
    object: group,
    spriteLights,
    lampSwings,
    lightFlickers,
    animatedSprites,
  }
}
