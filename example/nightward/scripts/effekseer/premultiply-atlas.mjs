import { deflateSync, inflateSync } from 'node:zlib'

// Preserve Pixi's premultiplied filtering with Effekseer's straight-alpha uploader.
export function premultiplyAtlas(png) {
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20)
  if (png[24] !== 8 || png[25] !== 6 || png[28] !== 0) throw new Error('Nightward atlases must be non-interlaced RGBA8 PNGs.')
  const compressed = []
  for (let at = 8; at < png.length;) {
    const length = png.readUInt32BE(at)
    if (png.toString('ascii', at + 4, at + 8) === 'IDAT') compressed.push(png.subarray(at + 8, at + 8 + length))
    at += length + 12
  }
  const bytes = inflateSync(Buffer.concat(compressed)), stride = width * 4
  const pixels = Buffer.alloc(stride * height)
  const paeth = (a, b, c) => {
    const p = a + b - c, da = Math.abs(p - a), db = Math.abs(p - b), dc = Math.abs(p - c)
    return da <= db && da <= dc ? a : db <= dc ? b : c
  }
  for (let y = 0; y < height; y++) {
    const filter = bytes[y * (stride + 1)]
    for (let x = 0; x < stride; x++) {
      const at = y * stride + x, left = x >= 4 ? pixels[at - 4] : 0, up = y ? pixels[at - stride] : 0, diagonal = y && x >= 4 ? pixels[at - stride - 4] : 0
      const predictor = filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? up : filter === 3 ? Math.floor((left + up) / 2) : paeth(left, up, diagonal)
      pixels[at] = bytes[y * (stride + 1) + x + 1] + predictor & 255
    }
  }
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const from = y * stride + x * 4, to = y * (stride + 1) + 1 + x * 4, alpha = pixels[from + 3]
    for (let channel = 0; channel < 3; channel++) raw[to + channel] = Math.round(pixels[from + channel] * alpha / 255)
    raw[to + 3] = alpha
  }
  function chunk(type, data) {
    const name = Buffer.from(type), payload = Buffer.concat([name, data])
    let crc = 0xffffffff
    for (const byte of payload) {
      crc ^= byte
      for (let bit = 0; bit < 8; bit++) crc = crc >>> 1 ^ (crc & 1 ? 0xedb88320 : 0)
    }
    const result = Buffer.alloc(data.length + 12)
    result.writeUInt32BE(data.length); payload.copy(result, 4); result.writeUInt32BE((crc ^ 0xffffffff) >>> 0, result.length - 4)
    return result
  }
  return Buffer.concat([png.subarray(0, 8), chunk('IHDR', png.subarray(16, 29)), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}
