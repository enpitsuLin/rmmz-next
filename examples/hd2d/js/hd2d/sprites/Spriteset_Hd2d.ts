import type { DestroyOptions } from 'pixi.js'
import type { FollowCamera } from '../scene/camera'
import type { Dust } from '../scene/dust'
import type { Fog } from '../scene/fog'
import type { PostProcessing } from '../scene/postProcessing'
import type { StageData } from '../scene/stage'
import { View3D } from '@pixi/3d'
import { Container } from 'pixi.js'
import { GlobalMananger, Graphics } from 'rmmz-next'
import { TILE_UNIT, tileToWorld } from '../constants'
import { createFollowCamera } from '../scene/camera'
import { createDust } from '../scene/dust'
import { createFog } from '../scene/fog'
import { createPostProcessing } from '../scene/postProcessing'
import { applySkybox } from '../scene/sky'
import { createStage } from '../scene/stage'
import { persistedHd2dState } from '../state'
import { Sprite_Hd2dCharacter } from './Sprite_Hd2dCharacter'

export class Spriteset_Hd2d extends Container {
  readonly view: View3D
  readonly fog: Fog
  readonly dust: Dust
  readonly post: PostProcessing
  readonly followCamera: FollowCamera
  private readonly characters: Sprite_Hd2dCharacter[] = []
  private stageData: StageData | null = null
  private ready = false
  private destroyedFlag = false
  private elapsed = 0

  constructor() {
    super()

    this.view = new View3D({
      width: Graphics.width,
      height: Graphics.height,
      autoResize: false,
      shadowQuality: 'high',
      shadowFilter: 'pcf',
    })
    this.view.eventMode = 'none'
    this.addChild(this.view)

    this.fog = createFog(this.view)
    this.dust = createDust()
    this.post = createPostProcessing(this.view)

    const mapWidth = GlobalMananger.$gameMap.width()
    const mapHeight = GlobalMananger.$gameMap.height()
    const halfW = Math.max(0, (mapWidth * TILE_UNIT) * 0.5 - 1.4)
    const halfH = Math.max(0, (mapHeight * TILE_UNIT) * 0.5 - 1.2)
    this.followCamera = createFollowCamera(this.view.camera, {
      minX: -halfW,
      maxX: halfW,
      minZ: -halfH,
      maxZ: halfH,
    })

    this.restorePersistedSettings()
    this.createCharacters()
    this.view.root.addChild(this.dust.object)

    const playerPos = this.getPlayerWorldPos()
    this.followCamera.snapTo(playerPos.x, playerPos.z)

    void this.loadAsyncAssets()
  }

  isReady(): boolean {
    return this.ready
  }

  update(): void {
    if (this.destroyedFlag)
      return

    if (this.view.width !== Graphics.width || this.view.height !== Graphics.height) {
      this.view.width = Graphics.width
      this.view.height = Graphics.height
    }

    const rawDelta = (Graphics.app?.ticker?.deltaMS ?? 16.667) / 1000
    const delta = Math.min(Math.max(rawDelta, 0.001), 0.1)
    this.elapsed += delta

    const stage = this.stageData
    if (stage) {
      stage.update(this.elapsed)
    }

    const mapWidth = GlobalMananger.$gameMap.width()
    const mapHeight = GlobalMananger.$gameMap.height()
    const lights = stage?.getSpriteLights() ?? []
    for (const characterSprite of this.characters) {
      characterSprite.update(mapWidth, mapHeight, this.elapsed, lights)
    }

    const playerPos = this.getPlayerWorldPos()
    this.followCamera.update(playerPos.x, playerPos.z, delta)
    this.dust.update(delta, playerPos.x, playerPos.z)
  }

  override destroy(options?: DestroyOptions): void {
    if (this.destroyedFlag)
      return
    this.destroyedFlag = true
    this.savePersistedSettings()
    this.stageData?.destroy()
    this.stageData = null
    super.destroy(options ?? { children: true })
  }

  private async loadAsyncAssets(): Promise<void> {
    try {
      const [, stage] = await Promise.all([
        applySkybox(this.view),
        createStage(),
      ])
      if (this.destroyedFlag)
        return
      this.stageData = stage
      this.view.root.addChild(stage.object)
    }
    finally {
      this.ready = true
    }
  }

  private createCharacters(): void {
    const map = GlobalMananger.$gameMap
    const player = GlobalMananger.$gamePlayer
    const allCharacters = [
      ...map.events(),
      ...map.vehicles(),
      ...player.followers().reverseData(),
      player,
    ]

    allCharacters.forEach((character, index) => {
      const sprite = new Sprite_Hd2dCharacter(character, index * 1.3, index * 0.0008)
      this.characters.push(sprite)
      this.view.root.addChild(sprite.groundShadow, sprite.object)
    })
  }

  private getPlayerWorldPos(): { x: number, z: number } {
    const player = GlobalMananger.$gamePlayer
    const map = GlobalMananger.$gameMap
    return tileToWorld(player._realX, player._realY, map.width(), map.height())
  }

  private restorePersistedSettings(): void {
    if (persistedHd2dState.post) {
      Object.assign(this.post.settings.bloom, persistedHd2dState.post.bloom)
      Object.assign(this.post.settings.colorAverage, persistedHd2dState.post.colorAverage)
      Object.assign(this.post.settings.brightnessContrast, persistedHd2dState.post.brightnessContrast)
      Object.assign(this.post.settings.vignette, persistedHd2dState.post.vignette)
      Object.assign(this.post.settings.toneMapping, persistedHd2dState.post.toneMapping)
      Object.assign(this.post.settings.tiltShift, persistedHd2dState.post.tiltShift)
      this.post.apply()
    }
    if (persistedHd2dState.fog) {
      Object.assign(this.fog.settings, persistedHd2dState.fog)
      this.fog.apply()
    }
    if (persistedHd2dState.dust) {
      Object.assign(this.dust.settings, persistedHd2dState.dust)
      this.dust.apply()
    }
    if (persistedHd2dState.camera) {
      Object.assign(this.followCamera.settings, persistedHd2dState.camera)
      this.followCamera.apply()
    }
  }

  private savePersistedSettings(): void {
    persistedHd2dState.post = structuredClone(this.post.settings)
    persistedHd2dState.fog = { ...this.fog.settings }
    persistedHd2dState.dust = { ...this.dust.settings }
    persistedHd2dState.camera = { ...this.followCamera.settings }
  }
}
