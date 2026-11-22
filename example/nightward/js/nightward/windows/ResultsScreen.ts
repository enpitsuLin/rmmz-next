import type { Sprite } from 'pixi.js'
import type { Content, WeaponKey } from '../managers/NightwardDataManager'
import type { Records, RunResult } from '../managers/NightwardRecordManager'
import { Container } from 'pixi.js'
import { Input, TouchInput } from 'rmmz-next'
import { sound } from '../managers/NightwardAudioManager'
import { back, clock, colors, consumeInput, fitScale, introAlpha, out, phase, reducedMotion } from '../primitives/ui'
import { Sprite_NightwardBuild } from '../sprites/Sprite_NightwardBuild'
import { Sprite_NightwardButton } from '../sprites/Sprite_NightwardButton'
import { Sprite_NightwardHeading } from '../sprites/Sprite_NightwardHeading'
import { Sprite_NightwardText, text } from '../sprites/Sprite_NightwardText'
import { box, icon, iconScale, sprite } from '../sprites/uiSprites'
import { panel } from './panel'
import { bestLine } from './recordText'
import { UiScreen } from './UiScreen'

interface StatRow { root: Container, motion: Container, value: Sprite_NightwardText, stamp: Container, target: number, best: boolean }
interface DamageRow { root: Container, bar: Container, value: Sprite_NightwardText, target: number }
export class ResultsScreen extends UiScreen {
  private shade = box(1, 1, colors.death, 0)
  private heading: Sprite_NightwardHeading
  private subtitle: Sprite_NightwardText
  private subtitleY = 0
  private runPanel = new Container()
  private damagePanel = new Container()
  private buildPanel = new Container()
  private build: Sprite_NightwardBuild
  private best = text('', 0, 0, 0, colors.dim, 0.5)
  private stats: StatRow[] = []
  private damageRows: DamageRow[] = []
  private runY = 0
  private damageY = 0
  private buildY = 0
  private ready = false
  private sparks: { sprite: Sprite, at: number, x: number, y: number, angle: number, distance: number }[] = []
  private previous = 0
  private tickAt = 0
  private waiting = true
  constructor(private result: RunResult, before: Records, content: Content, retry: () => void, title: () => void) {
    super()
    this.subtitle = text(`The ${content.enemies.get('reaper')!.name} is slain`, 0, 0, 0, colors.blue, 0.5)
    this.build = new Sprite_NightwardBuild(content)
    const won = result.won
    const l = this.layout
    const ratio = l.icon / l.unit
    const portrait = l.portrait && !l.short
    const width = portrait ? Math.min(240, l.w - 16) : Math.min(180, Math.floor((l.w - 28) / 2))
    const pad = l.short ? 6 : 10
    const gap = l.short ? 3 : 5
    const iconSize = Math.ceil(16 * ratio)
    const damage = Object.entries(result.damage).filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1]) as [WeaponKey, number][]
    const max = damage[0]?.[1] ?? 1
    const titleWidth = new Sprite_NightwardText(won ? 'VICTORY!' : 'YOU FELL', won ? 1 : 2, 0.5, true).textWidth
    const large = fitScale(titleWidth, l.width - l.margin * 2, 2 * l.unit)
    const buildHeight = (215 * ratio <= width - 2 * pad ? 25 : 52) * ratio
    const candidates = l.short ? [{ stat: 12, damage: 11, best: false, scale: l.unit, rows: 4 }] : [{ stat: 16, damage: 13, best: true, scale: large, rows: 6 }, { stat: 13, damage: 11, best: true, scale: large, rows: 6 }, { stat: 13, damage: 11, best: false, scale: large, rows: 6 }, { stat: 13, damage: 11, best: false, scale: l.unit, rows: 6 }, { stat: 13, damage: 11, best: false, scale: l.unit, rows: 4 }]
    const measure = (c: typeof candidates[number]): number => {
      const title = Math.ceil(14 * c.scale / l.unit) + (won && !l.short ? 12 : 0) + 10
      const stats = pad + 7 + gap + c.stat * 4 + pad
      const build = 7 + gap + buildHeight
      const chart = pad + 7 + gap + Math.max(1, Math.min(c.rows, damage.length)) * Math.max(c.damage, iconSize + 1) + pad
      const controls = Math.max(22, l.tap) + (c.best ? 15 : 0)
      return title + (portrait ? stats + 6 + pad + build + pad + 6 + chart : Math.max(stats + 6 + build, chart)) + 10 + controls
    }
    const config = candidates.find(candidate => measure(candidate) <= l.h - 8) ?? candidates[candidates.length - 1]!
    this.shade.tint = won ? colors.dawn : colors.death
    this.heading = new Sprite_NightwardHeading(won ? 'VICTORY!' : 'YOU FELL', won ? 1 : 2)
    this.heading.configure({ halo: won ? 0.24 : 0, haloAt: won ? 1.9 : 0, haloSeconds: 0.6, breath: won ? 0.04 : 0, drop: won ? 20 : 16, lettersAt: won ? 1.9 : 0.6, letterSeconds: won ? 0.45 : 0.4, letterFade: 0.12, strength: won ? 2 : 1.8, stagger: 0.05, rulesAt: 100, diamondsAt: 100, glintAt: won ? 2.6 : Infinity, center: won, scaleIn: won })
    const highs = [won ? before.wins > 0 && result.time < (before.fastestWin ?? Infinity) : before.runs > 0 && Math.floor(result.time) > Math.floor(before.bestTime), before.runs > 0 && result.level > before.bestLevel, before.runs > 0 && result.kills > before.bestKills, before.runs > 0 && result.gold > before.bestGold]
    const values = [result.time, result.level, result.kills, result.gold]
    const names = [won ? 'Slain at' : 'Survived', 'Level', 'Kills', 'Gold']
    const icons = [content.config.icons.clock, content.items.get('gemSmall')!.iconIndex, content.config.icons.kills, content.items.get('coin')!.iconIndex]
    const rowH = config.stat
    const stampText = width - 2 * pad - 60 >= new Sprite_NightwardText('NEW BEST', 3).textWidth + 54 ? 'NEW BEST' : 'NEW!'
    const stampWidth = new Sprite_NightwardText(stampText, 3).textWidth + 8
    const valueX = width - 2 * pad - (highs.some(Boolean) ? stampWidth + 6 : 0)
    const runFrame = panel(width, 1)
    this.runPanel.addChild(runFrame, text('RUN', pad, pad, 1))
    let y = pad + 7 + gap
    for (let i = 0; i < 4; i++) {
      const root = new Container()
      const motion = new Container()
      const image = icon(icons[i]!)
      const value = text('', valueX, Math.round((rowH - 7) / 2), i === 3 ? 1 : 0, 0xFFFFFF, 1)
      const stamp = new Container()
      image.scale.set(iconScale(image, ratio))
      image.y = Math.round((rowH - iconSize) / 2)
      const stampHeight = Math.min(13, rowH - 1)
      const frame = panel(stampWidth, stampHeight, 'barFrame')
      const plate = box(stampWidth - 2, stampHeight - 2, 2755078, 0.85, 1, 1)
      frame.position.set(-stampWidth / 2, -stampHeight / 2)
      plate.position.set(-stampWidth / 2 + 1, -stampHeight / 2 + 1)
      stamp.addChild(plate, frame, text(stampText, 0, -4, 3, 0xFFFFFF, 0.5))
      stamp.position.set(valueX + 6 + Math.ceil(stampWidth / 2), Math.round(rowH / 2))
      stamp.rotation = -0.12
      motion.addChild(image, text(names[i]!, iconSize + 6, Math.round((rowH - 7) / 2), 0, colors.label), value, stamp)
      root.addChild(motion)
      root.position.set(pad, y)
      this.runPanel.addChild(root)
      this.stats.push({ root, motion, value, stamp, target: values[i]!, best: highs[i]! })
      y += rowH
    }
    this.build.fill(result.build)
    this.build.layout(l.icon, l.unit, width - 2 * pad)
    let runH = y + pad
    let buildH = 0
    if (portrait) {
      buildH = pad + 7 + gap + this.build.measuredHeight + pad
      this.buildPanel.addChild(panel(width, buildH), text('BUILD', pad, pad, 1), this.build)
      this.build.position.set(pad, pad + 7 + gap)
    }
    else {
      y += gap + 1
      this.runPanel.addChild(text('BUILD', pad, y, 1), this.build)
      this.build.position.set(pad, y + 7 + gap)
      runH = y + 7 + gap + this.build.measuredHeight + pad
    }
    const damageH = Math.max(config.damage, iconSize + 1)
    const chartH = pad + 7 + gap + Math.max(1, Math.min(config.rows, damage.length)) * damageH + pad
    const panelH = Math.max(runH, chartH)
    runFrame.height = portrait ? runH : panelH
    this.damagePanel.addChild(panel(width, portrait ? chartH : panelH), text('DAMAGE', pad, pad, 1))
    const barX = iconSize + 4 + 60
    const barW = Math.max(12, width - 2 * pad - barX - 28 - 4)
    damage.slice(0, config.rows).forEach(([key, amount], i) => {
      const rank = result.build.find(item => item.key === key)!.rank
      const weapon = content.weapons.get(key)![rank - 1]!
      const root = new Container()
      const image = icon(weapon.iconIndex)
      const bar = new Container()
      const fill = sprite('dmgFill')
      const frame = panel(barW, 5, 'thinFrame')
      const value = text('', width - 2 * pad, Math.round((damageH - 1 - 7) / 2), 0, 0xFFFFFF, 1)
      image.scale.set(iconScale(image, ratio))
      image.y = Math.round((damageH - 1 - iconSize) / 2)
      frame.position.set(barX, Math.round((damageH - 1 - 5) / 2))
      fill.width = Math.max(1, Math.round((barW - 2) * amount / max))
      fill.height = 3
      bar.position.set(barX + 1, frame.y + 1)
      bar.addChild(fill)
      root.addChild(image, text(weapon.name, iconSize + 4, value.y, 0, colors.label), bar, frame, value)
      root.position.set(pad, pad + 7 + gap + i * damageH)
      this.damagePanel.addChild(root)
      this.damageRows.push({ root, bar, value, target: amount })
    })
    if (!damage.length)
      this.damagePanel.addChild(text('No damage dealt', pad, pad + 7 + gap + 2, 0, colors.dim))
    const headerH = this.heading.layout(config.scale, l.unit, Math.floor(l.w / 2) - 8, 0)
    const totalH = measure(config)
    const top = l.short ? 4 : Math.max(4, Math.min(Math.round(l.h * 0.1), Math.round((l.h - totalH) / 2)))
    const center = Math.round(l.w / 2)
    const left = center - Math.round((width * 2 + 12) / 2)
    this.heading.position.set(center, top)
    this.subtitleY = top + headerH + 5
    this.subtitle.position.set(center, this.subtitleY)
    this.subtitle.visible = won && !l.short
    this.runY = top + headerH + (won && !l.short ? 12 : 0) + (l.short ? 4 : 10)
    this.buildY = this.runY + runH + 6
    this.damageY = portrait ? this.buildY + buildH + 6 : this.runY
    this.runPanel.position.set(portrait ? center - Math.round(width / 2) : left, this.runY)
    this.damagePanel.position.set(portrait ? this.runPanel.x : left + width + 12, this.damageY)
    this.buildPanel.position.set(this.runPanel.x, this.buildY)
    this.buildPanel.visible = portrait
    const buttonY = portrait ? this.damageY + chartH + 10 : this.runY + panelH + (l.short ? 6 : 10)
    const buttonW = portrait ? Math.floor(width / 2) - 4 : 72
    const buttonH = Math.max(22, l.tap)
    const retryButton = this.addButton(new Sprite_NightwardButton('RETRY', buttonW, buttonH), 0, 0)
    const titleButton = this.addButton(new Sprite_NightwardButton('TITLE', buttonW, buttonH, 'cancel'), 0, 1)
    retryButton.showCursor = titleButton.showCursor = false
    retryButton.position.set(center - 6 - buttonW, buttonY)
    titleButton.position.set(center + 6, buttonY)
    retryButton.onActivate = retry
    titleButton.onActivate = title
    this.best.position.set(center, buttonY + buttonH + 8)
    this.best.visible = config.best
    this.shade.width = l.width / l.unit
    this.shade.height = l.height / l.unit
    this.content.addChildAt(this.shade, 0)
    this.content.addChild(this.heading, this.subtitle, this.runPanel, this.buildPanel, this.damagePanel, this.best)
    this.stats.forEach((row, i) => {
      if (row.best) {
        for (let p = 0; p < 6; p++) this.addSpark(this.runPanel.x + row.root.x + row.stamp.x, this.runY + row.root.y + row.stamp.y, i, p)
      }
    })
    if (won) {
      for (let p = 0; p < 8; p++) this.addSpark(center, top + Math.round(headerH / 2), -1, p)
    }
  }

  setSaved(error = false): void {
    this.waiting = false
    this.best.text = error ? 'Record could not be saved.' : bestLine()
  }

  private addSpark(x: number, y: number, row: number, index: number): void {
    const node = sprite('sparkle')
    node.anchor.set(0.5)
    this.content.addChild(node)
    const value = row < 0 ? 0 : this.stats[row]!.target
    const countTime = Math.max(0.4, Math.min(1.2, 0.4 + 0.25 * Math.log10(value + 1)))
    this.sparks.push({ sprite: node, at: row < 0 ? 2 + index * 0.03 : (this.result.won ? 1.5 : 0) + 1.25 + 0.3 * row + countTime + 0.22 + index * 0.02, x, y, angle: index / (row < 0 ? 8 : 6) * Math.PI * 2 + (row < 0 ? 0.3 : 0), distance: row < 0 ? 40 + index % 3 * 15 : 10 })
  }

  override get accepting(): boolean { return this.ready && !this.waiting }
  override tick(dt: number): void {
    if (!this.ready && this.age >= (this.result.won ? 2.9 : 1.4) && (Input.isTriggered('ok') || TouchInput.isTriggered())) {
      this.age = this.result.won ? 6 : 4.5
      consumeInput()
    }
    super.tick(dt)
  }

  protected animate(dt: number): void {
    const won = this.result.won
    const still = reducedMotion()
    const age = this.age
    const delay = won ? 1.5 : 0
    const time = still && age > (won ? 2 : 1) ? 10 : age
    this.heading.animate(time)
    this.shade.alpha = (won ? 0.6 : 0.78) * out(phase(age, won ? 1.6 : 0.2, still ? 0.15 : 0.8))
    this.subtitle.alpha = out(phase(age, 2.3, 0.4))
    this.subtitle.y = this.subtitleY + (still ? 0 : 4 * (1 - out(phase(age, 2.3, 0.4))))
    const panels = this.buildPanel.visible ? [this.runPanel, this.buildPanel, this.damagePanel] : [this.runPanel, this.damagePanel]
    panels.forEach((node, i) => {
      const p = phase(time, delay + 1 + i * 0.1, 0.45)
      node.alpha = out(p, 4)
      node.y = (node === this.runPanel ? this.runY : node === this.buildPanel ? this.buildY : this.damageY) + (still ? 0 : Math.round(16 * (1 - out(p, 4))))
    })
    this.stats.forEach((row, i) => {
      row.motion.alpha = introAlpha(time, delay + 1.15 + i * 0.08)
      row.motion.x = still ? 0 : Math.round(-8 * (1 - out(phase(time, delay + 1.15 + i * 0.08, 0.3))))
      const duration = Math.max(0.4, Math.min(1.2, 0.4 + 0.25 * Math.log10(row.target + 1)))
      const at = delay + 1.25 + 0.3 * i
      const count = out(phase(time, at, duration))
      const value = Math.floor(row.target * count)
      row.value.text = i === 0 ? clock(value) : String(value)
      const landed = time - at - duration
      row.value.scale.set(still ? 1 : 1.25 - 0.25 * back(phase(landed, 0, 0.2), 3))
      row.stamp.visible = row.best && landed >= 0
      row.stamp.alpha = phase(landed, 0, 0.08)
      row.stamp.scale.set(still ? 1 : 2.4 - 1.4 * phase(landed, 0, 0.22) ** 5)
      const stampP = phase(landed, 0.22, 0.3)
      const elastic = stampP === 0 || stampP === 1 ? stampP : 2 ** (-10 * stampP) * Math.sin((stampP - 0.1) * Math.PI * 5) + 1
      row.stamp.rotation = still ? -0.12 : -0.2 + 0.08 * elastic
      if (!still && landed >= 0.22 && landed < 0.4)
        row.motion.x += Math.floor((landed - 0.22) / 0.03) % 2 ? 0 : 2
      if (row.best && this.previous < at + duration + 0.22 && time >= at + duration + 0.22)
        sound('Stamp', 55)
      if (count > 0 && count < 1 && age - this.tickAt >= 0.05) {
        this.tickAt = age
        sound('Tick', 18, 100 + 37.5 * value / Math.max(1, row.target))
      }
    })
    this.build.slots.forEach((slot, i) => {
      slot.reveal = still ? 1 : back(phase(time, delay + 1.6 + i * 0.04, 0.3), 2.2)
    })
    this.build.tick(dt)
    this.damageRows.forEach((row, i) => {
      const p = out(phase(time, delay + 1.7 + i * 0.08, 0.6), 4)
      const value = Math.round(row.target * p)
      row.root.alpha = phase(time, delay + 1.7 + i * 0.08, 0.3)
      row.bar.scale.x = p
      row.value.text = value <= 9999 ? String(value) : `${(value / 1000).toFixed(1)}k`
    })
    this.buttons.forEach((button, i) => {
      button.motion.alpha = phase(time, delay + 2.9 + i * 0.07, 0.3)
      button.motion.y = still ? 0 : Math.round(10 * (1 - back(phase(time, delay + 2.9 + i * 0.07, 0.3))))
    })
    this.best.alpha = phase(time, delay + 3.1, 0.4)
    this.sparks.forEach(({ sprite: node, at, x, y, angle, distance }) => {
      const p = phase(age, at, distance > 10 ? 0.7 : 0.5)
      node.visible = !still && age >= at && p < 1
      node.position.set(x + Math.cos(angle) * distance * out(p), y + Math.sin(angle) * distance * out(p) * (distance > 10 ? 0.6 : 1))
      node.scale.set((distance > 10 ? 1.2 : 1) * (1 - out(p)))
      node.rotation = p * Math.PI / 2
    })
    if (!this.ready && time >= delay + 2.9) {
      this.ready = true
      this.focus(this.buttons[0]!)
    }
    this.previous = time
  }
}
