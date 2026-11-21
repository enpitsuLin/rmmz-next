import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { bakeReferenceMedia } from './bake-reference-media.mjs'
import { collectReference } from './reference-source.mjs'

const sourceUrl = 'https://goodstuff.pixijs.io/nightward/assets/start-DZtWMAL3.js'
const root = fileURLToPath(new URL('../', import.meta.url))
const source = process.env.NIGHTWARD_REFERENCE_SOURCE
  ? readFileSync(process.env.NIGHTWARD_REFERENCE_SOURCE, 'utf8')
  : await fetch(sourceUrl).then(response => {
      if (!response.ok) throw new Error(`Reference HTTP ${response.status}`)
      return response.text()
    })
const sourceHash = createHash('sha256').update(source).digest('hex')
const external = new Set(['ce', 'yi', 'dh', 'U', 'kt', 'eu', 'gn', 'mI', 'gI'])
let runtime = collectReference(source, ['PD', 'aR', 'lR', 'g0'], external)
runtime = runtime.replace(/(class PD \{[\s\S]*?constructor\(t, e, s, i)\)/, '$1, atlas)')
runtime = runtime.replace('o = mI()', 'o = atlas')
const generated = `// Generated from the official Nightward combat presentation; regenerate with scripts/import-reference-combat.mjs.
// Source: ${sourceUrl}
// SHA-256: ${sourceHash}
import { Container3D as ce, ParticleContainer3D as yi, PointLight as dh, PostEffect as eu } from '@pixi/3d'
import { Texture as U, Rectangle as kt, UniformGroup as gn } from 'pixi.js'
// Atlas textures belong to ImageManager and survive scene teardown.
const gI = () => {}
${runtime}
export { PD as ReferenceCombat, aR as ReferenceLensPass, lR as ReferenceLensState, g0 as lensNoise }
`
mkdirSync(`${root}js/nightward/reference`, { recursive: true })
writeFileSync(`${root}js/nightward/reference/combat.js`, generated)
console.log(`Compiled the original combat presentation (${runtime.length} characters).`)
const code = collectReference(source, ['yI', 'Le'], new Set(['U', 'Fe', 'kt']))
await bakeReferenceMedia({ root, output: `${root}img/nightward/reference`, code, helpersCode: '{}', combatOnly: true, source: { url: sourceUrl, sha256: sourceHash } })
