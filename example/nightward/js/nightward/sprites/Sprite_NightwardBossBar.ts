import type { Sprite } from 'pixi.js'
import type { Game_NightwardRun } from '../objects/Game_NightwardRun'
import type { Sprite_NightwardText } from './Sprite_NightwardText'
import type { Spriteset_Nightward } from './Spriteset_Nightward'
import { Container } from 'pixi.js'
import { approach, back, mixColor, out, phase, reducedMotion, sine, uiLayout } from '../primitives/ui'
import { panel } from '../windows/panel'
import { text } from './Sprite_NightwardText'
import { box, sprite } from './uiSprites'

export class Sprite_NightwardBossBar extends Container {
  readonly arrowLayer = new Container({ eventMode: 'none' })
  private boxNode = new Container()
  private nameText: Sprite_NightwardText
  private frame = panel(1, 6, 'thinFrame')
  private backBar = box(1, 1, 1836553)
  private chipBar = box(1, 1, 16763040)
  private fillBar = sprite('hpFill')
  private flashBar = box(1, 1, 0xFFFFFF, 0)
  private arrow = sprite('cursor')
  private arrowGlow = sprite('glow')
  private halves = [new Container(), new Container()]
  private halfBase: { x: number, y: number }[] = []
  private nameY = 0
  private age = -1
  private deadAt = -1
  private shown = 0
  private hp = 0
  private hit = 0

  constructor(name: string) {
    super({ eventMode: 'none' })
    this.nameText = text(name.toUpperCase(), 0, 0, 2, 0xFFFFFF, 0.5)
    this.boxNode.addChild(this.backBar, this.chipBar, this.fillBar, this.flashBar, this.frame)
    this.addChild(...this.halves, this.boxNode, this.nameText)
    this.arrow.anchor.set(0.5)
    this.arrow.tint = 16729654
    this.arrowGlow.anchor.set(0.5)
    this.arrowGlow.tint = 16722460
    this.arrowGlow.blendMode = 'add'
    this.arrowLayer.addChild(this.arrowGlow, this.arrow)
  }

  onSpawn(): void {
    this.age = 0
  }

  onDefeat(): void {
    this.deadAt = 0
  }

  layout(stacked: boolean, counterX: number, counterY: number, counterWidth: number, slotY: number, timerTop: number, timerHeight: number): number {
    const l = uiLayout()
    const { width: w, unit: u, icon: s, margin: m } = l
    const bossHeight = 10 * u + 6 * s
    const available = counterX - (m + 135 * s) - 12 * u
    const bossWidth = Math.max(60 * s, Math.min(Math.round(w * 0.32), available))
    const bossY = l.portrait ? slotY + 6 * u : timerTop + timerHeight + 12 * u
    const center = stacked ? Math.round((m + counterWidth * s + 8 * u + w - m) / 2) : Math.round(w / 2)
    const top = stacked ? counterY + 2 * u : bossY
    const barY = top + 10 * u
    const barW = Math.round((stacked ? w - m - (m + counterWidth * s + 8 * u) : bossWidth) / s)
    const left = Math.round(center - barW * s / 2)
    const width = (barW - 2) * s
    this.nameY = top
    this.nameText.position.set(center, top)
    this.nameText.scale.set(u)
    this.frame.position.set(left, barY)
    this.frame.width = barW
    this.frame.height = 6
    this.frame.scale.set(s)
    for (const node of [this.backBar, this.chipBar, this.fillBar, this.flashBar]) {
      node.position.set(left + s, barY + s)
      node.width = width
      node.height = 4 * s
    }
    this.boxNode.pivot.set(center, barY + 3 * s)
    this.boxNode.position.copyFrom(this.boxNode.pivot)
    this.halves.forEach((node, i) => {
      for (const child of node.removeChildren()) child.destroy({ children: true })
      const halfW = (i ? barW - Math.floor(barW / 2) : Math.floor(barW / 2)) * s
      const frame = panel(halfW / s, 6, 'thinFrame')
      const fill = box(halfW - 2 * s, 4 * s, 0xFFFFFF, 1, s, s)
      frame.scale.set(s)
      node.addChild(box(halfW - 2 * s, 4 * s, 1836553, 1, s, s), fill, frame)
      node.pivot.set(Math.round(halfW / 2), 3 * s)
      node.position.set(left + (i ? Math.floor(barW / 2) * s : 0) + node.pivot.x, barY + 3 * s)
      node.visible = false
      this.halfBase[i] = { x: node.x, y: node.y }
    })
    this.arrow.scale.set(2 * u)
    this.arrowGlow.width = this.arrowGlow.height = 40 * u
    return bossY + bossHeight
  }

  tick(run: Game_NightwardRun, view: Spriteset_Nightward, dt: number, uiTime: number, shownAlpha: number, bandBottom: number): void {
    const l = uiLayout()
    const u = l.unit
    const s = l.icon
    const enemy = run.boss
    const still = reducedMotion()
    if (this.age >= 0)
      this.age += dt
    const age = this.age
    const hp = enemy?.battler.hpRate() ?? 0
    if (hp < this.hp)
      this.hit = 0.8
    this.hp = hp
    this.hit = approach(this.hit, 0, 14, dt)
    const shown = Math.min(hp, out(phase(age, 0.2, 1.2), 4))
    this.shown = this.shown < shown ? shown : approach(this.shown, shown, 2.5, dt)
    const width = this.backBar.width
    this.fillBar.width = Math.round(width * shown / s) * s
    this.chipBar.width = Math.round(width * this.shown / s) * s
    this.flashBar.alpha = this.hit
    this.alpha = phase(age, 0, 0.3) * shownAlpha
    this.visible = age >= 0
    this.boxNode.scale.x = still ? 1 : out(phase(age, 0, 0.4), 4)
    this.nameText.glyphs.forEach((glyph, i) => {
      glyph.alpha = phase(age, 0.15 + i * 0.03, 0.1)
      glyph.y = still ? -1 : Math.round(-7 + 6 * back(phase(age, 0.15 + i * 0.03, 0.3), 1.8))
    })
    this.nameText.tint = hp < 0.3 ? mixColor(16729654, 0xFFFFFF, sine(uiTime % 1.2 / 0.6)) : 0xFFFFFF
    if (this.deadAt >= 0) {
      this.deadAt += dt
      const t = this.deadAt
      this.boxNode.visible = t < 0.1
      this.flashBar.alpha = 1
      this.nameText.alpha = 1 - phase(t, 0.1, 0.3) ** 3
      this.nameText.y = this.nameY - 4 * u * phase(t, 0.1, 0.3) ** 3
      this.halves.forEach((half, i) => {
        const k = phase(t, 0.1, 0.5)
        const side = i ? 1 : -1
        const base = this.halfBase[i]!
        half.visible = t >= 0.1 && t < 0.6
        half.alpha = 1 - k ** 3
        half.rotation = side * 0.15 * k ** 3
        half.position.set(base.x + side * 6 * u * out(k), base.y + 8 * u * k ** 3);
        (half.children[1] as Sprite).alpha = 1 - phase(t, 0.1, 0.25)
      })
      if (t >= 0.6)
        this.visible = false
    }
    this.arrow.visible = this.arrowGlow.visible = false
    if (!enemy || enemy.dead)
      return
    const point = view.view.worldToScreen({ x: enemy.x, y: Math.max(0, enemy.data.hover) + 1.6, z: enemy.z })
    if (!point || (point.x >= 0 && point.x <= l.width && point.y >= 0 && point.y <= l.height))
      return
    const margin = l.margin + 14 * u
    const cx = l.width / 2
    const cy = l.height / 2
    const dx = point.x - cx
    const dy = point.y - cy
    const top = Math.max(bandBottom + 6 * u, margin) - cy
    let k = Infinity
    if (dx)
      k = Math.min(k, (cx - margin) / Math.abs(dx))
    if (dy < 0)
      k = Math.min(k, top / dy)
    else if (dy > 0)
      k = Math.min(k, (l.height - margin - cy) / dy)
    this.arrow.visible = this.arrowGlow.visible = true
    this.arrow.position.set(Math.round(cx + dx * k), Math.round(cy + dy * k))
    this.arrowGlow.position.copyFrom(this.arrow.position)
    this.arrow.rotation = Math.atan2(dy, dx)
    this.arrow.alpha = 0.75 + 0.25 * sine(uiTime % 0.6 / 0.3)
    this.arrowGlow.alpha = 0.35 + 0.35 * sine(uiTime % 0.6 / 0.3)
  }
}
