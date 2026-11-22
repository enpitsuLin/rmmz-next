import type { Sprite_NightwardButton } from '../sprites/Sprite_NightwardButton'
import { Container } from 'pixi.js'
import { GlobalMananger as globals, Input, SoundManager } from 'rmmz-next'
import { NightwardRecordManager } from '../managers/NightwardRecordManager'
import { NightwardSound } from '../patches/AudioManager'
import { back, clock, colors, fitScale, out, phase, reducedMotion } from '../primitives/ui'
import { Sprite_NightwardHeading } from '../sprites/Sprite_NightwardHeading'
import { Sprite_NightwardSystemButtons } from '../sprites/Sprite_NightwardSystemButtons'
import { text, wrap } from '../sprites/Sprite_NightwardText'
import { box, sprite } from '../sprites/uiSprites'
import { Window_NightwardCommand } from './Window_NightwardCommand'

export class Window_NightwardTitle extends Window_NightwardCommand {
  private logo = new Sprite_NightwardHeading((globals.$dataSystem.gameTitle || 'Nightward').toUpperCase())
  private tagline = [text('', 0, 0, 0, colors.blue, 0.5), text('', 0, 0, 0, colors.blue, 0.5)]
  private footer = new Container({ eventMode: 'none' })
  private best = text('', 0, 0, 0, colors.dim, 0.5)
  private wins = text('', 0, 0, 1, 0xFFFFFF, 0.5)
  private credit = text('Made with PixiJS and PixiJS 3D', 0, 0, 0, colors.dim, 1)
  private corner = new Sprite_NightwardSystemButtons()
  private sparkles = [sprite('sparkle'), sprite('sparkle'), sprite('sparkle')]
  private menu: Sprite_NightwardButton[] = []
  private flash = box(1, 1, 0xFFFFFF, 0)
  private logoY = 0
  private taglineY: number[] = []
  private playAge = -1

  constructor(playTitleSe = true, skipIntro = false) {
    super()
    this.logo.configure({ halo: 0.26, haloSeconds: 0.8, haloSine: true, breath: 0.03, drop: 10, lettersAt: 0.1, letterSeconds: 0.45, strength: 1.6, stagger: 0.05, rulesAt: 0.55, diamondsAt: 0.7, diamondSeconds: 0.25, glintAt: 2 })
    this.makeCommandList()
    this.sparkles.forEach(node => node.anchor.set(0.5))
    this.footer.addChild(this.best, this.wins, this.credit)
    this.content.addChild(this.logo, ...this.sparkles, ...this.tagline, this.footer, this.flash, this.corner)
    this.place()
    if (skipIntro) {
      this.age = 1.2
      this.focusButton(this.menu[0]!)
    }
    if (playTitleSe)
      NightwardSound.playNightwardSe('Title', 45)
  }

  private makeCommandList(): void {
    const play = this.addCommand('PLAY', 'play', 120, 22, null, 0)
    play.onActivate = () => {
      this.live = false
      this.playAge = 0
      play.punch()
      SoundManager.playOk()
    }
    const howto = this.addCommand('HOW TO PLAY', 'howto', 120, 22, 'ok', 1)
    const options = this.addCommand('OPTIONS', 'options', 120, 22, 'ok', 2)
    this.menu = [play, howto, options]
  }

  protected place(): void {
    const l = this.layout
    const { w, h, unit: u, portrait } = l
    const center = Math.round(w / 2)
    const band = Math.round(h * (portrait ? 0.05 : 0.06))
    const buttonH = Math.max(22, l.tap)
    const cornerWidth = this.corner.layout(l.tap)
    this.corner.position.set(w - 4 - cornerWidth, l.short || band < 17 ? 4 : Math.max(0, Math.round((band - 15) / 2)))
    const scale = fitScale(102, (l.short ? 0.5 : portrait ? 0.86 : 0.62) * l.width, 3 * u)
    const compact = portrait || l.short
    const logoH = this.logo.layout(scale, u, center - 6, compact ? 16 : 44, compact ? 12 : 24, 40)
    this.logoY = Math.max(band + 4, Math.round(h * (compact ? 0.13 : 0.15)))
    this.logo.position.set(center, this.logoY)
    const lines = wrap('Survive the night · slay the Reaper', w - 16)
    this.tagline.forEach((node, i) => {
      node.visible = !!lines[i]
      node.text = lines[i] ?? ''
      node.position.set(center, this.logoY + logoH + 8 + i * 10)
      this.taglineY[i] = node.y
    })
    const records = NightwardRecordManager.records()
    this.best.text = NightwardRecordManager.bestLine()
    this.best.visible = records.runs > 0 && !l.short
    this.wins.text = `Reaper slain · fastest ${clock(records.fastestWin ?? 0)}`
    this.wins.visible = this.best.visible && records.wins > 0
    const footerLines = [this.best, this.wins, this.credit].filter(node => node.visible)
    const footerScale = fitScale(Math.max(...footerLines.map(node => node.textWidth)), l.width - l.margin * 2, l.icon) / u
    const recordRows = Number(this.best.visible) + Number(this.wins.visible)
    this.best.position.set(0, 0)
    this.wins.position.set(0, 12)
    this.credit.position.set(Math.floor((w - 8 - center) / footerScale), recordRows ? (recordRows - 1) * 12 + 17 : 0)
    const footerHeight = Math.ceil((this.credit.y + 9) * footerScale)
    this.footer.scale.set(footerScale)
    this.footer.position.set(center, h - 8 - footerHeight)
    const gap = portrait ? 8 : 6
    const menuHeight = 3 * buttonH + 2 * gap
    const menuY = Math.min(Math.round(h * (portrait ? 0.64 : 0.58)), this.footer.y - 12 - menuHeight)
    const short = l.short || (!portrait && menuY < this.logoY + logoH + 8 + lines.length * 10 + 14)
    this.menu.forEach((button, i) => {
      const width = short ? 104 : portrait ? Math.min(160, w - 40) : 120
      button.setSize(width, buttonH, l.tap)
      button.showCursor = !short || i === 0
      button.position.set(short ? center - 164 + i * 112 : center - Math.round(width / 2), short ? this.footer.y - 12 - buttonH : menuY + i * (buttonH + gap))
    })
    const play = this.menu[0]!
    this.flash.position.set(play.x + 2, play.y + 2)
    this.flash.width = play.size.width - 4
    this.flash.height = play.size.height - 4
    const positions = [1, 8, 2]
    const glyphs = this.logo.title.glyphs
    this.sparkles.forEach((node, i) => {
      const glyph = glyphs[Math.min(positions[i]!, glyphs.length - 1)]
      if (!glyph) {
        node.visible = false
        return
      }
      const k = this.logo.title.scale.x
      const width = glyph.texture.frame.width
      node.position.set(Math.round(center + (glyph.x + (i === 1 ? width - 2 : width / 2)) * k), Math.round(this.logoY + (i === 0 ? -4 : i === 1 ? 1 : logoH + 3)))
      node.visible = !short || i < 2
    })
  }

  override get accepting(): boolean { return this.age >= 0.3 && this.playAge < 0 }

  protected override handleInput(): void {
    if (Input.isTriggered('ok') && this.age < 1.1) {
      this.age = 1.1
      this.focusButton(this.menu[0]!)
      return
    }
    super.handleInput()
  }

  protected animate(dt: number): void {
    const still = reducedMotion()
    const age = still ? 10 : this.age
    this.logo.animate(this.age)
    this.logo.y = this.logoY
    this.tagline.forEach((node, i) => {
      node.y = this.taglineY[i]! + (still ? 0 : Math.round(4 * (1 - out(phase(age, 0.7, 0.4)))))
      node.alpha = out(phase(age, 0.7, 0.4))
    })
    this.menu.forEach((button, i) => {
      button.motion.y = still ? 0 : Math.round(10 * (1 - back(phase(age, 0.85 + i * 0.07, 0.3))))
      button.motion.alpha = out(phase(age, 0.85 + i * 0.07, 0.3), 2)
    })
    this.footer.alpha = out(phase(age, 1.1, 0.5), 2)
    this.corner.tick(dt, this.live && !this.inputBlocked && !this.dimmed && this.playAge < 0, age - 1.2)
    this.sparkles.forEach((node, i) => {
      const p = (this.age - 2) % (0.9 + 2.1 + i * 0.7) / 0.9
      node.scale.set(!still && this.age >= 2 && p < 1 ? Math.sin(p * Math.PI) : 0)
      node.rotation = p * Math.PI / 4
    })
    if (!this.focused && age >= 1.1)
      this.focusButton(this.menu[0]!)
    if (this.playAge >= 0) {
      this.playAge += dt
      const t = this.playAge
      this.flash.alpha = 0.85 * (1 - out(phase(t, 0, 0.3)))
      this.menu.slice(1).forEach((button, i) => {
        const p = phase(t, 0.05 + i * 0.04, 0.22)
        button.motion.alpha *= 1 - p ** 3
        button.motion.x = Math.round(-16 * p ** 3)
      })
      for (const node of [this.logo, ...this.tagline, this.footer, this.corner])
        node.alpha = 1 - phase(t, 0.1, 0.35) ** 3
      this.logo.y -= Math.round(16 * phase(t, 0.1, 0.35) ** 3)
      this.menu[0]!.motion.alpha *= 1 - phase(t, 0.2, 0.25) ** 3
      if (t >= (still ? 0.15 : 0.3)) {
        this.playAge = -1
        this.callCommandHandler('play')
      }
    }
  }
}
