import type { Sprite } from 'pixi.js'
import type { Game_NightwardRun } from '../objects/Game_NightwardRun'
import type { Sprite_NightwardText } from '../sprites/Sprite_NightwardText'
import { Container } from 'pixi.js'
import { SoundManager } from 'rmmz-next'
import { sound } from '../managers/NightwardAudioManager'
import { back, clock, colors, introAlpha, largeScale, out, phase, reducedMotion } from '../primitives/ui'
import { Sprite_NightwardBuild } from '../sprites/Sprite_NightwardBuild'
import { Sprite_NightwardButton } from '../sprites/Sprite_NightwardButton'
import { Sprite_NightwardHeading } from '../sprites/Sprite_NightwardHeading'
import { Sprite_NightwardSystemButtons } from '../sprites/Sprite_NightwardSystemButtons'
import { text } from '../sprites/Sprite_NightwardText'
import { box, icon } from '../sprites/uiSprites'
import { panel } from './panel'
import { UiScreen } from './UiScreen'

export type PauseAction = 'resume' | 'options' | 'howto' | 'restart' | 'title'
export class PauseScreen extends UiScreen {
  private shade = box(1, 1, colors.night)
  private heading = new Sprite_NightwardHeading('PAUSED')
  private menu = new Container()
  private menuFrame = panel(1, 1)
  private runPanel = new Container()
  private runFrame = panel(1, 1)
  private build: Sprite_NightwardBuild
  private buildLabel = text('BUILD', 0, 0, 1)
  private stats: { image: Sprite, value: Sprite_NightwardText }[] = []
  private corner = new Sprite_NightwardSystemButtons()
  private hint = text('Esc to resume', 0, 0, 0, colors.dim, 1)
  private ask = new Container()
  private asking?: 'restart' | 'title'
  private askAge = -1
  private returningAge = -1
  private menuButtons: Sprite_NightwardButton[] = []
  private yes: Sprite_NightwardButton
  private no: Sprite_NightwardButton
  private menuY = 0
  private runY = 0
  private headerY = 0
  constructor(run: Game_NightwardRun, private action: (action: PauseAction) => void) {
    super()
    this.build = new Sprite_NightwardBuild(run.content)
    this.menu.addChild(this.menuFrame)
    this.runPanel.addChild(this.runFrame)
    const actions: PauseAction[] = ['resume', 'options', 'howto', 'restart', 'title']
    this.menuButtons = ['RESUME', 'OPTIONS', 'HOW TO PLAY', 'RESTART', 'QUIT TO TITLE'].map((name, i) => {
      const button = this.addButton(new Sprite_NightwardButton(name, 110, 22, i ? 'ok' : null), i, 0, this.menu)
      button.onActivate = () => {
        const kind = actions[i]!
        if (kind === 'restart' || kind === 'title')
          this.askFor(kind)
        else action(kind)
      }
      return button
    })
    this.yes = this.addButton(new Sprite_NightwardButton('YES', 44, 22), 6, 0, this.ask)
    this.no = this.addButton(new Sprite_NightwardButton('NO', 44, 22, null), 6, 1, this.ask)
    this.yes.showCursor = this.no.showCursor = false
    this.yes.onActivate = () => {
      if (this.asking)
        action(this.asking)
    }
    this.no.onActivate = () => this.cancelAsk()
    this.ask.addChild(text('Abandon this run?', 75, 16, 0, 0xFFFFFF, 0.5), text('Your progress', 75, 32, 0, colors.blue, 0.5), text('will be lost.', 75, 42, 0, colors.blue, 0.5))
    this.menu.addChild(this.ask)
    this.ask.visible = false
    this.yes.enabled = this.no.enabled = false
    const values = [clock(run.time), `Lv ${run.actor.level}`, String(run.kills), String(run.party.gold())]
    const icons = [run.content.config.icons.clock, run.content.items.get('gemSmall')!.iconIndex, run.content.config.icons.kills, run.content.items.get('coin')!.iconIndex]
    for (const [i, iconIndex] of icons.entries()) {
      const image = icon(iconIndex)
      const value = text(values[i]!, 0, 0, i === 3 ? 1 : 0)
      this.runPanel.addChild(image, value)
      this.stats.push({ image, value })
    }
    this.build.fill(run.build)
    this.runPanel.addChild(this.buildLabel, this.build)
    this.content.addChild(this.heading, this.menu, this.runPanel, this.corner, this.hint)
    this.addChildAt(this.shade, 0)
    this.onBack = () => this.asking ? this.cancelAsk() : action('resume')
    this.place()
    this.focus(this.menuButtons[0]!)
    sound('Swoosh', 40)
  }

  private askFor(kind: 'restart' | 'title'): void {
    this.asking = kind
    this.ask.visible = true
    this.askAge = 0
    this.returningAge = -1
    this.menuButtons.forEach((button) => {
      button.enabled = false
    })
    this.yes.enabled = this.no.enabled = true
    this.focus(this.no, false)
  }

  private cancelAsk(): void {
    SoundManager.playCancel()
    const previous = this.asking
    this.asking = undefined
    this.returningAge = 0
    this.askAge = -1
    this.yes.enabled = this.no.enabled = false
    this.menuButtons.forEach((button) => {
      button.visible = button.enabled = true
    })
    this.focus(this.menuButtons[previous === 'title' ? 4 : 3]!)
  }

  protected place(): void {
    const l = this.layout
    const center = Math.round(l.w / 2)
    const portrait = l.portrait && !l.short
    const height = Math.max(22, l.tap)
    const gap = portrait && l.tap > 22 ? 8 : 6
    const menuW = portrait ? Math.min(200, l.w - 32) : 150
    const runW = portrait ? Math.min(240, l.w - 16) : l.short ? Math.min(170, Math.floor((l.w - 28) / 2)) : 170
    const headerH = this.heading.layout(l.short ? l.unit : largeScale(l.unit), l.unit, center - 8)
    const iconSize = Math.ceil(16 * l.icon / l.unit)
    const colWidth = Math.floor((runW - 20) / 2)
    const statH = Math.max(iconSize, 11) + 4
    this.stats.forEach(({ image, value }, i) => {
      const x = 10 + i % 2 * colWidth
      const y = 10 + Math.floor(i / 2) * statH
      image.scale.set(16 / image.texture.frame.width * l.icon / l.unit)
      image.position.set(x, y)
      value.position.set(x + iconSize + 5, y + Math.round((iconSize - 7) / 2))
    })
    const buildY = 10 + statH * 2 + 4
    this.buildLabel.position.set(10, buildY)
    this.build.layout(l.icon, l.unit, runW - 20)
    this.build.position.set(10, buildY + 12)
    const runH = buildY + 12 + this.build.measuredHeight + 10
    const menuH = this.menuButtons.length * height + (this.menuButtons.length - 1) * gap
    const panelH = portrait ? runH : Math.max(20 + menuH, runH)
    const totalH = headerH + 12 + (portrait ? runH + 10 + menuH + 10 + 15 : panelH + 30)
    this.headerY = l.short ? 4 : Math.max(4, Math.round((l.h - totalH) / 2))
    this.heading.position.set(center, this.headerY)
    const left = center - Math.round((menuW + 12 + runW) / 2)
    const panelY = this.headerY + headerH + (l.short ? 6 : 12)
    this.menuY = portrait ? panelY + runH + 10 : panelY
    this.runY = panelY
    this.menu.position.set(portrait ? center - Math.round(menuW / 2) : left, this.menuY)
    this.runPanel.position.set(portrait ? center - Math.round(runW / 2) : left + menuW + 12, this.runY)
    this.menuFrame.visible = !portrait
    this.menuFrame.width = menuW
    this.menuFrame.height = panelH
    this.runFrame.width = runW
    this.runFrame.height = panelH
    this.menuButtons.forEach((button, i) => {
      button.setSize(portrait ? menuW : 110, height, l.tap)
      button.position.set(portrait ? 0 : 20, (portrait ? 0 : 10) + i * (height + gap))
    })
    this.ask.x = Math.round((menuW - 150) / 2)
    this.yes.position.set(27, 64)
    this.no.position.set(79, 64)
    const cornerW = this.corner.layout(l.tap)
    this.corner.position.set(portrait ? center - Math.round(cornerW / 2) : l.short ? l.w - 4 - cornerW : this.menu.x, portrait ? this.menuY + menuH + 10 : l.short ? 4 : this.menuY + panelH + 6)
    this.hint.position.set(l.w - 4, l.h - 11)
    this.hint.visible = !l.short
    this.shade.width = l.width / l.unit
    this.shade.height = l.height / l.unit
  }

  protected animate(dt: number): void {
    this.heading.animate(this.age * 1.4)
    this.shade.alpha = 0.62 * out(phase(this.age, 0, reducedMotion() ? 0.15 : 0.2), 2)
    if (this.closing >= 0)
      this.shade.alpha *= 1 - phase(this.closing, 0, 0.2)
    this.menu.y = this.menuY + (reducedMotion() ? 0 : Math.round(12 * (1 - back(phase(this.age, 0.08, 0.3)))))
    this.runPanel.y = this.runY + (reducedMotion() ? 0 : Math.round(12 * (1 - back(phase(this.age, 0.14, 0.3)))))
    this.menu.alpha = introAlpha(this.age, 0.08)
    this.runPanel.alpha = introAlpha(this.age, 0.14)
    this.menuButtons.forEach((button, i) => {
      button.motion.x = reducedMotion() ? 0 : Math.round(10 * (1 - out(phase(this.age, 0.14 + i * 0.04, 0.22))))
      button.motion.alpha = introAlpha(this.age, 0.14 + i * 0.04)
    })
    this.hint.alpha = introAlpha(this.age, 0.3)
    this.corner.tick(dt, this.live && !this.inputBlocked && !this.dimmed && this.closing < 0, this.age - 0.3)
    this.build.tick(dt)
    if (this.askAge >= 0) {
      this.askAge += dt
      this.menuButtons.forEach((button, i) => {
        button.motion.alpha *= 1 - phase(this.askAge, i * 0.02, 0.15) ** 3
        button.motion.x -= Math.round(12 * phase(this.askAge, i * 0.02, 0.15) ** 3)
      })
      this.ask.alpha = phase(this.askAge, 0.15, 0.2)
      this.ask.x = Math.round((this.menuFrame.width - 150) / 2) + (reducedMotion() ? 0 : Math.round(12 * (1 - out(phase(this.askAge, 0.15, 0.2)))))
    }
    if (this.returningAge >= 0) {
      this.returningAge += dt
      this.ask.alpha = 1 - phase(this.returningAge, 0, 0.12)
      this.menuButtons.forEach((button, i) => {
        const p = phase(this.returningAge, 0.08 + i * 0.02, 0.2)
        button.motion.alpha *= p
        button.motion.x -= Math.round(12 * (1 - out(p)))
      })
      if (this.returningAge >= 0.4) {
        this.returningAge = -1
        this.ask.visible = false
      }
    }
  }
}
