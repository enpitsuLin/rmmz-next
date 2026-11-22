import { Container, Sprite } from 'pixi.js'
import { NightwardAssetManager } from '../managers/NightwardAssetManager'

// Original glyph metrics include their shadow and an independent, hand-rasterized 2x set.
export class Sprite_NightwardText extends Container {
  readonly glyphs: Sprite[] = []
  textWidth = 0
  readonly capHeight: number
  private value = ''
  private fontStyle: number
  constructor(text = '', style = 0, public align = 0, readonly big = false) {
    super({ eventMode: 'none' })
    this.fontStyle = style
    this.capHeight = big ? 14 : 7
    this.text = text
  }

  get text(): string { return this.value }
  set text(value: string) {
    if (value === this.value && this.glyphs.length)
      return
    this.value = value
    this.relayout()
  }

  get font(): number { return this.fontStyle }
  set font(value: number) {
    if (value !== this.fontStyle) {
      this.fontStyle = value
      this.relayout()
    }
  }

  measure(text: string): number {
    const assets = NightwardAssetManager.assets()
    const size = this.big ? 2 : 1
    return Math.max(0, [...text].reduce((sum, char) => sum + (assets.glyphs.get(char)?.advance ?? assets.uiData.space) * size, 0) - size)
  }

  relayout(): void {
    const assets = NightwardAssetManager.assets()
    const size = this.big ? 2 : 1
    let x = 0
    for (let i = 0; i < this.value.length; i++) {
      let node = this.glyphs[i]
      if (!node) {
        node = new Sprite()
        this.glyphs.push(node)
        this.addChild(node)
      }
      const glyph = assets.glyphs.get(this.value[i]!)
      node.visible = !!glyph
      if (glyph)
        node.texture = (this.big ? glyph.big : glyph.small)[this.fontStyle]!
      node.position.set(x - 1, -1)
      node.alpha = 1
      node.scale.set(1)
      x += (glyph?.advance ?? assets.uiData.space) * size
    }
    for (let i = this.value.length; i < this.glyphs.length; i++) this.glyphs[i]!.visible = false
    this.textWidth = Math.max(0, x - size)
    const offset = Math.round(this.textWidth * this.align)
    for (let i = 0; i < this.value.length; i++) this.glyphs[i]!.x -= offset
  }
}
export function text(value: string, x: number, y: number, style = 0, tint = 0xFFFFFF, align = 0, big = false): Sprite_NightwardText {
  const node = new Sprite_NightwardText(value, style, align, big)
  node.position.set(x, y)
  node.tint = tint
  return node
}
export function wrap(value: string, maxWidth: number, balanced = false): string[] {
  const assets = NightwardAssetManager.assets()
  const measure = (line: string): number => Math.max(0, [...line].reduce((sum, char) => sum + (assets.glyphs.get(char)?.advance ?? assets.uiData.space), 0) - 1)
  const words = value.split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    if (line && measure(`${line} ${word}`) > maxWidth) {
      lines.push(line)
      line = word
    }
    else {
      line = line ? `${line} ${word}` : word
    }
  }
  if (line)
    lines.push(line)
  if (balanced && lines.length === 2) {
    let width = Math.max(...lines.map(measure))
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' ')
      const b = words.slice(i).join(' ')
      const candidate = Math.max(measure(a), measure(b))
      if (candidate <= maxWidth && candidate < width) {
        lines[0] = a
        lines[1] = b
        width = candidate
      }
    }
  }
  return lines
}
