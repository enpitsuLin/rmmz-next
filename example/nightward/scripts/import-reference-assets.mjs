import { createHash } from 'node:crypto'
import { bakeReferenceMedia } from './bake-reference-media.mjs'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import { deflateSync } from 'node:zlib'
import { collectReference } from './reference-source.mjs'
import { capturePropWorld } from './capture-reference-props.mjs'
import { writePropAssets } from './prop-scene.mjs'
import { createDirtEdgeTilesets, createGroundTileset } from './ground-tileset.mjs'

// Compile the public reference's procedural assets into ordinary MZ resources.
// Only asset generators execute here; the reference game and engine never ship.
const sourceUrl = 'https://goodstuff.pixijs.io/nightward/assets/start-DZtWMAL3.js'
const root = fileURLToPath(new URL('../', import.meta.url))
const worldOnly = process.argv.includes('--world-only')
const source = process.env.NIGHTWARD_REFERENCE_SOURCE
  ? readFileSync(process.env.NIGHTWARD_REFERENCE_SOURCE, 'utf8')
  : await fetch(sourceUrl).then(response => { if (!response.ok) throw new Error(`Reference HTTP ${response.status}`); return response.text() })
const external = new Set(['U', 'Fe', 'kt', 'ts', 'fp'])
const loaderUrl = 'https://goodstuff.pixijs.io/nightward/assets/index-CSDXPW24.js'
const loaderSource = process.env.NIGHTWARD_REFERENCE_LOADER ? readFileSync(process.env.NIGHTWARD_REFERENCE_LOADER, 'utf8') : await fetch(loaderUrl).then(response => response.text())
const loaderCode = collectReference(loaderSource, ['x', 'T', 'A', 'S', 'J', 'b', 'y', 'N'])
const helpersCode = `(()=>{${loaderCode};return {y5:y,x5:J,w5:x,d_:A,f_:T,Ts:S,hn:N,Mx:b};})()`
const roots = ['_P', 'gP', 'NO', 'x9', 'hs', 'Bt', 'pe', 'hh', 'xs', 'cR', 'uR', 'dR', 'rt', 'xx', 'Y', 'gR', 'pz', 'qP', 'BP', 'X8', '$8', 'gx', '_f', 'j9', 'K9']
const code = collectReference(source, roots, external)
console.log(`Compiling original asset generators (${code.length} characters).`)
if (process.argv.includes('--ui-only') || process.argv.includes('--windowskin-only')) {
  await bakeReferenceMedia({ root, output: `${root}img/nightward/reference`, code, helpersCode, uiOnly: true, skinOnly: process.argv.includes('--windowskin-only') })
  process.exit(0)
}

class Canvas {
  width = 0
  height = 0
  pixels = new Uint8ClampedArray()
  getContext() { return this }
  createImageData(width, height) { return { width, height, data: new Uint8ClampedArray(width * height * 4) } }
  putImageData(image, dx, dy) {
    if (this.pixels.length !== this.width * this.height * 4) this.pixels = new Uint8ClampedArray(this.width * this.height * 4)
    for (let y = 0; y < image.height; y++) this.pixels.set(image.data.subarray(y * image.width * 4, (y + 1) * image.width * 4), ((y + dy) * this.width + dx) * 4)
  }
}
class TextureSource { constructor(options) { Object.assign(this, options) } update() {} }
class Texture { constructor(options) { Object.assign(this, options); this.frame ??= { x: 0, y: 0, width: this.source.resource.width, height: this.source.resource.height }; this.orig = this.frame } }
class Rectangle { constructor(x, y, width, height) { Object.assign(this, { x, y, width, height }) } }
class Geometry { constructor(options) { Object.assign(this, options) } }
const context = vm.createContext({ console, Math, Map, Set, Float32Array, Uint32Array, Uint16Array, Int16Array, Int32Array, Uint8Array, Uint8ClampedArray, ArrayBuffer, document: { createElement: () => new Canvas() }, U: Texture, Fe: TextureSource, kt: Rectangle, ts: Geometry, fp: () => {} })
Object.assign(context, vm.runInContext(helpersCode, context))
vm.runInContext(`${code}\n globalThis.reference = { actors: _P({upscale:1}), icons: gP(1), world: NO(), makeWorld:x9, Builder:hs, braziers:Bt, crypt:pe, glassFrames:hh, definitions:vd, look:{play:xs,title:cR,boss:uR,dawn:dR}, palette:rt, skyRadius:xx, lights:{heroColor:X8,heroRange:$8,fireY:gx,fireColor:_f,fireIntensity:j9,fireRange:K9} };`, context)
const reference = context.reference
const output = `${root}img/nightward/reference`
mkdirSync(output, { recursive: true })
const previousReference = existsSync(`${output}/manifest.json`) ? JSON.parse(readFileSync(`${output}/manifest.json`, 'utf8')) : {}
const crcTable = Array.from({ length: 256 }, (_, value) => { for (let i = 0; i < 8; i++) value = value & 1 ? 0xedb88320 ^ value >>> 1 : value >>> 1; return value >>> 0 })
function chunk(name, data) {
  const type = Buffer.from(name), size = Buffer.alloc(4), crc = Buffer.alloc(4)
  size.writeUInt32BE(data.length)
  let value = 0xffffffff
  for (const byte of Buffer.concat([type, data])) value = crcTable[(value ^ byte) & 255] ^ value >>> 8
  crc.writeUInt32BE((value ^ 0xffffffff) >>> 0)
  return Buffer.concat([size, type, data, crc])
}
function png(name, canvas) {
  if (worldOnly) return
  const { width, height, pixels } = canvas, header = Buffer.alloc(13), raw = Buffer.alloc(height * (width * 4 + 1))
  header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6
  for (let y = 0; y < height; y++) Buffer.from(pixels.subarray(y * width * 4, (y + 1) * width * 4)).copy(raw, y * (width * 4 + 1) + 1)
  writeFileSync(`${output}/${name}.png`, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]))
}
function writeGroundTileset() {
  const ground = createGroundTileset(reference.world)
  png('../../tilesets/NightwardGround', ground.albedo)
  png('../../tilesets/NightwardGround-normal', ground.normal)
  for (const [index, sheet] of createDirtEdgeTilesets(ground).entries()) {
    const name = `../../tilesets/NightwardDirtEdges${String.fromCharCode(66 + index)}`
    png(name, sheet.albedo)
    png(`${name}-normal`, sheet.normal)
  }
}
if (process.argv.includes('--ground-only')) {
  writeGroundTileset()
  console.log('Wrote the native A5 ground tileset and matching normals at the original world scale.')
  process.exit(0)
}
const frame = texture => ({ x: texture.frame.x, y: texture.frame.y, width: texture.frame.width, height: texture.frame.height })
const animations = {}
for (const name of Object.keys(reference.definitions)) {
  const animation = reference.actors.frames(name)
  animations[name] = { fps: animation.fps, width: animation.width, height: animation.height, frames: animation.textures.map(frame) }
}
for (const name of ['albedo', 'normal', 'glow']) png(`actors-${name}`, reference.actors[name].source.resource)
png('icons', reference.icons.canvas)
const iconKeys = ['lash', 'wand', 'tomes', 'storm', 'ward', 'flask', 'might', 'haste', 'lodestone', 'cinder', 'gem', 'coin', 'kills', 'heart', 'clock', 'chest', 'relic', 'chicken', 'vacuum']
const icons = Object.fromEntries(iconKeys.map(name => [name, reference.icons.rect(name)]))
const iconSheet = new Canvas()
iconSheet.width=512;iconSheet.height=256;iconSheet.pixels=new Uint8ClampedArray(512*256*4)
const mzIcons=['lash','wand','tomes','storm','ward','flask','might','haste','lodestone','cinder','gem','gem','gem','coin','chicken','vacuum','relic','chest','kills','heart','clock']
for(const [index,name] of mzIcons.entries()){
  const rect=reference.icons.rect(name), tint=index===11?[.65,1,.7]:index===12?[1,.5,.55]:[1,1,1]
  for(let y=0;y<32;y++)for(let x=0;x<32;x++){
    const from=((rect.y+Math.floor(y/2))*reference.icons.canvas.width+rect.x+Math.floor(x/2))*4,to=((Math.floor((index+96)/16)*32+y)*512+(index+96)%16*32+x)*4
    for(let c=0;c<4;c++)iconSheet.pixels[to+c]=reference.icons.canvas.pixels[from+c]*(c<3?tint[c]:1)
  }
}
png('../../system/IconSet',iconSheet)
function crop(texture){
  const image=new Canvas(),rect=texture.frame,source=texture.source.resource
  image.width=rect.width;image.height=rect.height;image.pixels=new Uint8ClampedArray(image.width*image.height*4)
  for(let y=0;y<image.height;y++)image.pixels.set(source.pixels.subarray(((rect.y+y)*source.width+rect.x)*4,((rect.y+y)*source.width+rect.x+rect.width)*4),y*image.width*4)
  return image
}
for(const [kind,name] of Object.entries({bat:'bat.fly',skeleton:'skeleton.walk',ghoul:'ghoul.walk',wraith:'wraith.float',skull:'skull.fly',reaper:'reaper.walk'}))png(`../../enemies/Nightward_${kind}`,crop(reference.actors.frames(name).textures[0]))
const hero=new Canvas(),heroFrames=reference.actors.frames('hero.walk').textures.map(crop)
hero.width=heroFrames[0].width*3;hero.height=heroFrames[0].height*4;hero.pixels=new Uint8ClampedArray(hero.width*hero.height*4)
for(let row=0;row<4;row++)for(let column=0;column<3;column++){
  const cell=heroFrames[column]
  // MZ rows are down, left, right, up; the reference mirrors its right-facing frames.
  for(let y=0;y<cell.height;y++)for(let x=0;x<cell.width;x++){
    const from=(y*cell.width+(row===1?cell.width-1-x:x))*4
    const to=((row*cell.height+y)*hero.width+column*cell.width+x)*4
    hero.pixels.set(cell.pixels.subarray(from,from+4),to)
  }
}
png('../../characters/$NightwardHero',hero)
const surfaces = {}
for (const [name, surface] of Object.entries(reference.world)) if (surface.albedo) {
  if (name !== 'grass') {
    png(`${name}-albedo`, surface.albedo.source.resource)
    if (surface.normal) png(`${name}-normal`, surface.normal.source.resource)
    if (surface.emissive) png(`${name}-emissive`, surface.emissive.source.resource)
  }
  surfaces[name] = { tile: surface.tile ?? 1, normal: !!surface.normal, emissive: !!surface.emissive }
}
png('sky', reference.world.sky.source.resource)
png('effects', reference.world.sprites[0].source.resource)
png('leaves', reference.world.leaves[0].source.resource)
png('mist', reference.world.mist.source.resource)
writeGroundTileset()
const builders = Object.fromEntries(Object.entries(surfaces).map(([name, surface]) => [name, new reference.Builder(surface.tile)]))
const propWorld = capturePropWorld(context, builders, reference.makeWorld)
const { details } = propWorld
const meshes = []
for (const [material, builder] of Object.entries(builders)) {
  const geometry = builder.build()
  if (geometry) meshes.push({ material, ...geometry })
}
const door=details.door,doorBuilder=new reference.Builder(surfaces.grave.tile)
doorBuilder.ao=.3;doorBuilder.color=7762558
doorBuilder.box(door.width/2,0,0,door.width,door.height,door.thickness)
doorBuilder.box(door.width/2,.25,door.thickness/2,door.width-.3,1,.05,{faces:{back:false}})
doorBuilder.box(door.width/2,1.45,door.thickness/2,door.width-.3,1,.05,{faces:{back:false}})
const doorGeometry=doorBuilder.build()
propWorld.models.crypt.meshes.push({ material: 'grave', kind: 'door', ...doorGeometry })
const skyBuilder=new reference.Builder(1),radius=reference.skyRadius
skyBuilder.ao=0
for(let i=0;i<=48;i++){const angle=i/48*Math.PI*2,x=Math.cos(angle)*radius,z=Math.sin(angle)*radius;skyBuilder.vertex(x,-20,z,-Math.cos(angle),0,-Math.sin(angle),i/48*4,1);skyBuilder.vertex(x,150,z,-Math.cos(angle),0,-Math.sin(angle),i/48*4,0)}
for(let i=0;i<48;i++){const at=i*2;skyBuilder.triangle(at,at+3,at+1);skyBuilder.triangle(at,at+2,at+3)}
const skyGeometry=skyBuilder.build()
meshes.push({ material: 'sky', kind: 'sky', ...skyGeometry })
writePropAssets({ root, surfaces, environment: meshes, models: propWorld.models, layout: propWorld.layout, aliases: propWorld.aliases, previousReference, resetLayout: process.argv.includes('--reset-layout') })
writeFileSync(`${output}/manifest.json`, `${JSON.stringify({ source: { url: sourceUrl, sha256: createHash('sha256').update(source).digest('hex') }, animations, icons, surfaces: Object.fromEntries(Object.entries(surfaces).filter(([name]) => name !== 'grass')), details, braziers: reference.braziers, crypt: reference.crypt, glassFrames: reference.glassFrames, look:reference.look, palette:reference.palette, skyRadius:reference.skyRadius, lights:reference.lights })}\n`)
console.log(`Wrote ${meshes.length} environment meshes and ${Object.keys(propWorld.models).length} standard GLB Prop models.`)

if (!worldOnly) {
  await bakeReferenceMedia({ root, output, code, helpersCode })
  await import('./import-reference-combat.mjs')
}
