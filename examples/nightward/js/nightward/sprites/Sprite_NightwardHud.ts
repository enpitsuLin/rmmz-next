import type { DestroyOptions, Sprite as PixiSprite } from 'pixi.js'
import type { FamilyKey } from '../managers/NightwardDataManager'
import type { Reward } from '../objects/Game_NightwardRewards'
import type { Game_NightwardRun } from '../objects/Game_NightwardRun'
import type { Point } from '../primitives/geometry'
import type { IconPoint } from '../primitives/ui'
import type { Spriteset_Nightward } from './Spriteset_Nightward'
import { Container } from 'pixi.js'
import { Sprite } from 'rmmz-next'
import { NightwardAssetManager } from '../managers/NightwardAssetManager'
import { NightwardSound } from '../patches/AudioManager'
import { NightwardConfig } from '../patches/ConfigManager'
import { approach, back, clock, colors, FRAME_DT, largeScale, mixColor, out, phase, reducedMotion, sine, snap, uiLayout } from '../primitives/ui'
import { panel } from '../windows/panel'
import { Window_NightwardSelectable } from '../windows/Window_NightwardSelectable'
import { Sprite_NightwardBossBar } from './Sprite_NightwardBossBar'
import { Sprite_NightwardBuild } from './Sprite_NightwardBuild'
import { Sprite_NightwardButton } from './Sprite_NightwardButton'
import { Sprite_NightwardMoments } from './Sprite_NightwardMoments'
import { Sprite_NightwardStick } from './Sprite_NightwardStick'
import { Sprite_NightwardText, text } from './Sprite_NightwardText'
import { box, icon, iconScale, sprite } from './uiSprites'

interface Flight { image: PixiSprite, from: IconPoint, to: IconPoint, age: number, key: FamilyKey }
interface DamageNumber { text: Sprite_NightwardText, age: number, x: number, z: number, height: number, drift: number, push?: number }
interface Callout { node: Container, age: number, big: boolean }

export class Sprite_NightwardHud extends Sprite {
  readonly flights = new Container({ eventMode: 'none' })
  readonly build: Sprite_NightwardBuild
  bandBottom = 0
  private world = new Container({ eventMode: 'none' })
  private screen = new Container({ eventMode: 'passive' })
  private moments = new Sprite_NightwardMoments()
  private stick = new Sprite_NightwardStick()
  private bossBar: Sprite_NightwardBossBar
  private xpBack = box(1, 1, 461596)
  private xpFill = sprite('xpFill')
  private xpEdge = box(1, 1, 15267583)
  private xpShine = box(1, 1, 0xFFFFFF, 0.35)
  private xpGlint = sprite('glow')
  private xpFlash = box(1, 1, 0xFFFFFF, 0)
  private xpFrame = panel(1, 13, 'barFrame')
  private level = text('', 0, 0, 0, 0xFFFFFF, 1)
  private xpSparkles = Array.from({ length: 5 }, () => sprite('sparkle'))
  private timer = text('00:00', 0, 0, 0, 0xFFFFFF, 0.5, true)
  private timerPlate = panel(1, 1, 'softRect')
  private pauseButton = new Sprite_NightwardButton(NightwardAssetManager.assets().ui.pauseBars!, 15, 15, null)
  private pauseWindow = new Window_NightwardSelectable(15, 15)
  private slotsFrame = panel(135, 62)
  private counterFrame = panel(1, 44)
  private counters = new Container()
  private killIcon: PixiSprite
  private coinIcon: PixiSprite
  private kills = text('', 0, 0, 0, 0xFFFFFF, 1)
  private gold = text('', 0, 0, 1, 0xFFFFFF, 1)
  private hp = new Container()
  private hpChip = box(20, 3, 16763040, 1, 1, 1)
  private hpFill = sprite('hpFill', 1, 1)
  private hpFlash = box(20, 3, 0xFFFFFF, 0, 1, 1)
  private hpAlpha = 0
  private chip = 1
  private lowHp = sprite('vignette')
  private previousLevel = 1
  private previousKills = 0
  private previousGold = 0
  private xpShown = 1
  private xpWidth = 0
  private xpX = 0
  private xpAge = 10
  private levelAge = 10
  private killAge = 10
  private skullAge = 10
  private killPeak = 1.18
  private goldAge = 10
  private goldPopAge = 10
  private timerAge = 10
  private timerWarning = false
  private goldY = 0
  private uiTime = 0
  private lowAlpha = 0
  private shown = { from: 0, to: 1, age: 0, duration: 0.4, delay: 0.15, value: 0 }
  private lastWidth = 0
  private lastHeight = 0
  private slotBottom = 0
  private timerBottom = 0
  private flightItems: Flight[] = []
  private numbers: DamageNumber[] = []
  private numberBudget = 6
  private callouts: Callout[] = []
  private modal = false

  constructor(private run: Game_NightwardRun, private view: Spriteset_Nightward, onPause: () => void) {
    super()
    this.eventMode = 'passive'
    this.build = new Sprite_NightwardBuild(run.content)
    this.killIcon = icon(run.content.config.icons.kills)
    this.coinIcon = icon(run.content.items.get('coin')!.iconIndex)
    this.bossBar = new Sprite_NightwardBossBar(run.content.enemies.get('reaper')!.name)
    this.pauseButton.onActivate = onPause
    this.pauseWindow.pointerOnly = true
    this.pauseWindow.choices = [this.pauseButton]
    this.pauseWindow._clientArea!.addChild(this.pauseButton)
    this.timerPlate.tint = 0
    this.timerPlate.alpha = 0.42
    this.xpGlint.anchor.set(0.5)
    this.xpGlint.tint = 10147583
    this.hpFill.height = 3
    this.hp.addChild(box(20, 3, 1836553, 1, 1, 1), this.hpChip, this.hpFill, this.hpFlash, panel(22, 5, 'thinFrame'))
    this.world.addChild(this.hp)
    this.lowHp.tint = 12588060
    this.lowHp.alpha = 0
    this.killIcon.anchor.set(0.5)
    this.coinIcon.anchor.set(0.5)
    this.counters.addChild(this.counterFrame, this.killIcon, this.coinIcon, this.kills, this.gold)
    this.xpSparkles.forEach(node => node.anchor.set(0.5))
    this.screen.addChild(this.xpBack, this.xpFill, this.xpShine, this.xpEdge, this.xpGlint, this.xpFlash, this.xpFrame, this.level, ...this.xpSparkles, this.timerPlate, this.timer, this.pauseWindow, this.slotsFrame, this.build, this.counters, this.bossBar)
    this.addChild(this.world, this.lowHp, this.screen, this.bossBar.arrowLayer, this.moments, this.stick)
    this.build.fill(run.build)
    this.layout()
  }

  setPauseHandler(onPause: () => void): void {
    this.pauseButton.onActivate = onPause
  }

  setShown(to: boolean, duration = 0.2, delay = 0): void {
    this.shown = { from: this.shown.value, to: Number(to), age: 0, duration, delay, value: this.shown.value }
  }

  setModal(open: boolean): void {
    this.modal = open
    if (open)
      this.blockPointer()
  }

  showMoveHint(hint: boolean): void {
    this.moments.showMoveHint(hint)
  }

  blockPointer(): void {
    this.stick.blockPointer()
  }

  movement(): Point {
    const point = this.stick.movement(this.bandBottom)
    this.moments.recordMovement(point.x, point.z)
    return point
  }

  private items(): { key: FamilyKey, rank: number }[] { return this.run.result?.build ?? this.run.build }

  hold(reward: Reward): void {
    this.build.hold(reward.key, reward.rank - 1)
    this.build.fill(this.items())
    if (reward.weapon && (reward.rank === 1 || reward.rank === 5))
      this.moments.queueToast(reward)
  }

  fly(reward: Reward, from: IconPoint): void {
    this.build.fill(this.items())
    const to = this.build.point(reward.key)
    if (!to || reducedMotion()) {
      this.land(reward.key)
      return
    }
    const image = icon(reward.icon)
    image.anchor.set(0.5)
    image.position.set(from.x, from.y)
    image.scale.set(from.scale)
    this.flights.addChild(image)
    this.flightItems.push({ image, from, to, age: 0, key: reward.key })
  }

  private land(key: FamilyKey): void {
    this.build.release(key)
    this.build.fill(this.items(), true)
    NightwardSound.playNightwardSe('Tick', 45, 137.5)
  }

  private layout(): void {
    const l = uiLayout()
    const { width: w, height: h, unit: u, icon: s, margin: m } = l
    const inner = w - m * 2
    this.lastWidth = w
    this.lastHeight = h
    this.lowHp.width = w
    this.lowHp.height = h
    this.xpFrame.position.set(m, m)
    this.xpFrame.width = Math.round(inner / s)
    this.xpFrame.height = 13
    this.xpFrame.scale.set(s)
    this.xpX = m + 2 * s
    this.xpWidth = Math.round(inner / s) * s - 4 * s
    for (const node of [this.xpBack, this.xpFlash]) {
      node.position.set(this.xpX, m + 2 * s)
      node.width = this.xpWidth
      node.height = 9 * s
    }
    this.xpFill.position.set(this.xpX, m + 2 * s)
    this.xpFill.height = 9 * s
    this.xpEdge.position.set(0, m + 2 * s)
    this.xpEdge.width = s
    this.xpEdge.height = 9 * s
    this.xpShine.y = m + 2 * s
    this.xpShine.width = 3 * s
    this.xpShine.height = 9 * s
    this.xpGlint.y = m + Math.round(6.5 * s)
    this.xpGlint.width = this.xpGlint.height = 10 * s
    this.level.pivot.y = 3.5
    this.level.position.set(this.xpX + this.xpWidth - 3 * s, m + 6.5 * s)
    this.level.scale.set(s)
    this.xpSparkles.forEach((node, i) => {
      node.position.set(this.xpX + Math.round((0.1 + 0.2 * i) * this.xpWidth / s) * s, m + Math.round(6.5 * s))
    })
    const f = m + 13 * s + 3 * u
    const timerTop = f + (l.portrait ? 2 : 3) * u
    const timerHeight = 14 * u
    const timerWidth = this.timer.textWidth * u
    this.timer.scale.set(u)
    this.timer.pivot.y = 7
    this.timer.position.set(Math.round(w / 2), timerTop + 7 * u)
    this.timerBottom = timerTop + timerHeight
    this.timerPlate.width = Math.round((timerWidth + 36 * u) / u)
    this.timerPlate.height = 36
    this.timerPlate.scale.set(u)
    this.timerPlate.position.set(Math.round(w / 2 - (timerWidth + 36 * u) / 2), timerTop - 11 * u)
    this.pauseButton.setSize(15, 15, Math.max(27, Math.ceil(44 / u)))
    this.pauseWindow.scale.set(u)
    this.pauseWindow.position.set(Math.round(w / 2 + timerWidth / 2 + 10 * u), Math.round(timerTop + timerHeight / 2 - 7.5 * u))
    const slotY = l.portrait ? timerTop + timerHeight + 6 * u : f
    this.slotsFrame.position.set(m, slotY)
    this.slotsFrame.scale.set(s)
    this.build.layout(s, 1, Infinity, true)
    this.build.position.set(m, slotY)
    this.slotBottom = slotY + 62 * s
    const counterWidth = 31 + Math.ceil(36 * u / s)
    const counterX = w - m - counterWidth * s
    const stacked = l.portrait && counterX < m + 135 * s + m
    this.counters.position.set(stacked ? m : counterX, stacked ? slotY + 62 * s + 2 * u : slotY)
    this.counterFrame.width = counterWidth
    this.counterFrame.height = 44
    this.counterFrame.scale.set(s)
    for (let i = 0; i < 2; i++) {
      const image = i ? this.coinIcon : this.killIcon
      const value = i ? this.gold : this.kills
      const y = (5 + i * 18) * s
      image.position.set(13 * s, y + 8 * s)
      image.scale.set(iconScale(image, s))
      value.pivot.y = 4
      value.position.set((counterWidth - 5) * s, Math.round(y + (16 * s - 7 * u) / 2) + 4 * u)
      value.scale.set(u)
    }
    this.goldY = this.gold.y
    this.hp.scale.set(s)
    const bossBottom = this.bossBar.layout(stacked, this.counters.x, this.counters.y, counterWidth, slotY, timerTop, timerHeight)
    this.bandBottom = Math.max(this.slotBottom, this.counters.y + 44 * s, bossBottom)
    this.moments.placeBanner(this.bandBottom)
  }

  showBanner(main: string, sub: string, style: number, hold: number, slam: boolean): void {
    this.moments.showBanner(main, sub, style, hold, slam, this.bandBottom)
  }

  showNotice(value: string): void {
    this.moments.showNotice(value, this.timerBottom)
    this.timerAge = 0
  }

  setTimerWarning(enabled: boolean): void {
    this.timerWarning = enabled
    if (enabled)
      this.timerAge = 0
  }

  private callout(value: string, style: number, tint: number, big = false, heart = false): void {
    const node = new Container()
    const l = uiLayout()
    const line = text(value, 0, 0, style, tint, 0.5, big)
    if (big)
      line.scale.set(largeScale(l.unit) / l.unit)
    line.y = -Math.round(line.capHeight * line.scale.y)
    if (heart) {
      const image = icon(this.run.content.config.icons.heart)
      image.scale.set(iconScale(image, Math.max(1, Math.round(l.unit * 0.55)) / l.unit))
      image.position.set(-Math.round((line.textWidth + image.width + 2) / 2), -Math.round(line.capHeight / 2 + image.height / 2))
      line.x = Math.round((image.width + 2) / 2)
      node.addChild(image)
    }
    node.addChild(line)
    node.scale.set(l.unit)
    this.world.addChild(node)
    this.callouts.push({ node, age: 0, big })
  }

  override update(): void {
    super.update()
    const dt = FRAME_DT
    const run = this.run
    const view = this.view
    const events = run.drainHudEvents()
    const l = uiLayout()
    const { unit: u, icon: s } = l
    const still = reducedMotion()
    const active = run.state === 'running' && !this.modal
    const worldDt = active ? dt : 0
    if (l.width !== this.lastWidth || l.height !== this.lastHeight)
      this.layout()
    this.uiTime += dt
    this.shown.age += dt
    this.shown.value = this.shown.from + (this.shown.to - this.shown.from) * out(phase(this.shown.age, this.shown.delay, Math.max(0.001, this.shown.duration)), 2)
    this.screen.alpha = this.world.alpha = this.moments.alpha = this.shown.value
    this.moments.visible = !this.modal
    this.pauseWindow.visible = !this.modal
    this.pauseButton.tick(dt, active && this.shown.to > 0)
    this.pauseWindow.setLive(active && this.shown.to > 0)
    this.pauseWindow.update()
    for (const event of events) {
      if (event.kind === 'pickup') {
        if (event.pickup?.startsWith('gem'))
          this.xpAge = 0
        if (event.value && event.value > 0)
          this.callout(`+${event.value} HP`, 0, 9105568, false, true)
        if (event.pickup === 'vacuum')
          this.callout('VACUUM!', 0, 10147583)
        if (event.pickup === 'relic')
          this.callout('RELIC!', 3, 0xFFFFFF, true)
      }
      if (event.kind === 'chest' && !event.value) {
        this.callout(`+${run.content.config.chestGold} GOLD`, 1, 0xFFFFFF)
        this.goldPopAge = 0
      }
      if (event.kind === 'boss')
        this.bossBar.onSpawn()
      if (event.kind === 'bossDeath')
        this.bossBar.onDefeat()
      if (event.kind === 'hit' && NightwardConfig.nightwardDamageNumbers && this.numberBudget >= 1) {
        this.numberBudget--
        const crit = event.value! >= 30
        const node = new Sprite_NightwardText(String(Math.max(1, Math.round(event.value!))), crit ? 3 : 0, 0.5, crit)
        this.world.addChild(node)
        this.numbers.push({ text: node, age: 0, x: event.x + (Math.random() - 0.5) * 0.5, z: event.z, height: 0.9 + Math.random() * 0.3, drift: Math.random() - 0.5 })
      }
    }
    this.numberBudget = Math.min(6, this.numberBudget + worldDt * 18)
    if (run.actor.level > this.previousLevel) {
      this.levelAge = 0
      NightwardSound.playNightwardSe(run.content.config.sounds.level, 50)
    }
    if (run.kills > this.previousKills) {
      if (Math.floor(run.kills / 100) > Math.floor(this.previousKills / 100)) {
        this.killAge = this.skullAge = 0
        this.killPeak = 1.4
        NightwardSound.playNightwardSe('Cursor', 30)
      }
      else if (this.killAge > 0.15) {
        this.killAge = 0
        this.killPeak = 1.18
      }
    }
    if (run.party.gold() > this.previousGold && this.goldAge > 0.12)
      this.goldAge = 0
    this.previousLevel = run.actor.level
    this.previousKills = run.kills
    this.previousGold = run.party.gold()
    this.xpAge += dt
    this.levelAge += dt
    this.killAge += dt
    this.skullAge += dt
    this.goldAge += dt
    this.goldPopAge += dt
    this.timerAge += dt
    const levelStart = run.actor.currentLevelExp()
    const exp = run.actor.currentExp() - levelStart
    const levelSpan = run.actor.nextLevelExp() - levelStart
    const target = run.actor.level + Math.min(0.999, exp / levelSpan)
    this.xpShown = this.xpShown > target ? target : approach(this.xpShown, target, 7, dt)
    const filled = Math.round(this.xpWidth * (this.xpShown - Math.floor(this.xpShown)) / s) * s
    this.xpFill.width = filled
    this.xpFill.visible = filled > 0
    this.xpEdge.x = this.xpX + filled - s
    this.xpEdge.visible = filled > s
    this.xpGlint.x = this.xpX + Math.max(s, filled)
    this.xpGlint.alpha = 0.8 * (1 - out(phase(this.xpAge, 0, 0.25)))
    const shine = this.uiTime % 3.2 / 1.1
    const shineX = Math.round(shine * (filled + 6 * s) / s) * s - 3 * s
    this.xpShine.visible = shine < 1 && shineX > 0 && shineX + 3 * s < filled
    this.xpShine.x = this.xpX + shineX
    this.xpFlash.alpha = (still ? 0.34 : 0.85) * (1 - out(phase(this.levelAge, 0, 0.6)))
    this.level.text = `LV ${run.actor.level}`
    this.level.tint = mixColor(16767336, 0xFFFFFF, out(phase(this.levelAge, 0, 0.5)))
    this.level.scale.set(s * (still ? 1 : 1.7 - 0.7 * back(phase(this.levelAge, 0, 0.4), 3)))
    this.xpSparkles.forEach((node, i) => {
      const p = phase(this.levelAge, i * 0.05, 0.5)
      node.scale.set(!still && p < 1 ? Math.sin(p * Math.PI) * 1.2 * s : 0)
      node.rotation = p * Math.PI / 4
    })
    this.timer.text = clock(run.time)
    this.timer.tint = this.timerWarning ? 16743014 : mixColor(colors.gold, 0xFFFFFF, out(phase(this.timerAge, 0, 0.5)))
    this.timer.scale.set(u * (still ? 1 : 1.25 - 0.25 * back(phase(this.timerAge, 0, 0.3), 3)))
    this.kills.text = String(run.kills)
    this.kills.scale.set(u * (still ? 1 : this.killPeak - (this.killPeak - 1) * (this.killPeak === 1.18 ? out(phase(this.killAge, 0, 0.18)) : back(phase(this.killAge, 0, 0.3), 3))))
    this.kills.tint = mixColor(16767336, 0xFFFFFF, out(phase(this.skullAge, 0, 0.4)))
    this.killIcon.scale.set(iconScale(this.killIcon, s * (still ? 1 : 1.5 - 0.5 * back(phase(this.skullAge, 0, 0.3), 3))))
    this.gold.text = String(run.party.gold())
    this.gold.y = this.goldY - (still ? 0 : Math.round(2 * Math.sin(phase(this.goldAge, 0, 0.25) * Math.PI)) * u)
    this.coinIcon.scale.x = iconScale(this.coinIcon, s * (still ? 1 : 1 - 0.85 * Math.sin(phase(this.goldAge, 0, 0.2) * Math.PI)))
    this.gold.scale.set(u * (still ? 1 : 1.4 - 0.4 * back(phase(this.goldPopAge, 0, 0.3), 3)))
    this.build.fill(run.build, true)
    this.build.tick(dt)
    const hp = run.actor.hpRate()
    const on = !run.actor.isDead() && hp < 0.999
    this.hpAlpha = approach(this.hpAlpha, on ? 1 : 0, on ? 10 : 3, dt)
    this.chip = this.chip < hp ? hp : approach(this.chip, hp, 3, dt)
    const foot = view.worldToScreen({ x: run.hero.x, y: 0, z: run.hero.z })
    this.hp.alpha = this.hpAlpha
    this.hp.visible = !!foot && this.hpAlpha > 0.01
    if (foot)
      this.hp.position.set(snap(foot.x - 11 * s), snap(foot.y + 5 * s))
    this.hpFill.width = Math.round(20 * hp)
    this.hpChip.width = Math.round(20 * this.chip)
    this.hpFlash.alpha = 0.85 * run.invulnerable ** 2
    const low = hp < 0.25 && !run.actor.isDead()
    const beat = this.uiTime % 0.8 / 0.8
    this.lowAlpha = approach(this.lowAlpha, low ? still ? 0.3 : 0.18 + 0.24 * Math.sin(beat * Math.PI) ** 2 : 0, low ? 10 : 4, dt)
    this.lowHp.alpha = this.lowAlpha * this.shown.value
    this.bossBar.tick(run, view, dt, this.uiTime, this.shown.value, this.bandBottom)
    this.updateNumbers(view, worldDt)
    this.callouts = this.callouts.filter((callout) => {
      callout.age += worldDt
      if (callout.age >= 1) {
        callout.node.destroy({ children: true })
        return false
      }
      const point = view.worldToScreen({ x: run.hero.x, y: 2, z: run.hero.z })
      const age = callout.age
      callout.node.visible = !!point
      if (point)
        callout.node.position.set(Math.round(point.x), Math.round(point.y - (still ? 0 : 18 * u * out(phase(age, 0, 0.9)))))
      callout.node.alpha = 1 - phase(age, 0.75, 0.25) ** 2
      callout.node.scale.set(u * (still ? 1 : age < 0.12 ? 0.4 + 0.75 * back(phase(age, 0, 0.12), 3) : 1.15 - 0.15 * out(phase(age, 0.12, 0.1))))
      return true
    })
    this.flightItems = this.flightItems.filter((flight) => {
      flight.age += dt
      const p = phase(flight.age, 0, 0.45)
      const first = p < 0.5
      const k = sine(first ? p * 2 : p * 2 - 1)
      const midX = (flight.from.x + flight.to.x) / 2
      const top = flight.from.y - 14 * u
      flight.image.position.set(Math.round(first ? flight.from.x + (midX - flight.from.x) * k : midX + (flight.to.x - midX) * k), Math.round(first ? flight.from.y + (top - flight.from.y) * k : top + (flight.to.y - top) * k))
      flight.image.scale.set(flight.from.scale + (flight.to.scale - flight.from.scale) * sine(p))
      if (p < 1)
        return true
      flight.image.destroy()
      this.land(flight.key)
      return false
    })
    this.moments.tick(worldDt, active, this.bandBottom, this.slotBottom)
    this.stick.tick(active, dt)
  }

  private updateNumbers(view: Spriteset_Nightward, dt: number): void {
    const run = this.run
    const u = uiLayout().unit
    const foot = view.worldToScreen({ x: run.hero.x, y: 0, z: run.hero.z })
    const edge = view.worldToScreen({ x: run.hero.x + 1, y: 0, z: run.hero.z })
    const worldUnit = foot && edge ? Math.abs(foot.x - edge.x) : 0
    const left = foot ? foot.x - 0.42 * worldUnit - 2 * u : 0
    const right = foot ? foot.x + 0.42 * worldUnit + 2 * u : -1
    const top = foot ? foot.y - 1.5 * worldUnit - 2 * u : 0
    const bottom = foot ? foot.y + 2 * u : 0
    this.numbers = this.numbers.filter((item) => {
      item.age += dt
      const age = item.age
      const node = item.text
      if (age > 0.75) {
        node.destroy({ children: true })
        return false
      }
      const point = view.worldToScreen({ x: item.x, y: item.height, z: item.z })
      node.visible = !!point && NightwardConfig.nightwardDamageNumbers
      if (!point)
        return true
      const density = uiLayout().resolution
      const p = age / 0.75
      const scale = Math.max(1 / density, Math.round(u * density * (1.9 - 0.9 * back(phase(age, 0, 0.16), 1.70158)) * 2) / 2 / density)
      const half = node.textWidth * scale / 2
      const height = node.capHeight * scale
      const baseY = point.y - (node.big ? 10 : 6) * u
      let x = point.x + item.drift * 10 * u * p
      const y = baseY - out(p) * 14 * u
      if (item.push === undefined) {
        const reach = half + Math.abs(item.drift) * 10 * u
        const overlaps = right > left && x + reach > left && x - reach < right && baseY + height > top && baseY - 14 * u < bottom
        item.push = overlaps ? x >= (left + right) / 2 ? right - x + reach : left - x - reach : 0
      }
      x += item.push
      if (right > left && x + half > left && x - half < right && y + height > top && y < bottom)
        node.visible = false
      node.position.set(snap(x), snap(y))
      node.scale.set(scale)
      node.alpha = 1 - phase(p, 0.62, 0.38)
      return true
    })
  }

  override destroy(options: DestroyOptions = { children: true }): void {
    this.flights.destroy({ children: true })
    super.destroy(options)
  }
}
