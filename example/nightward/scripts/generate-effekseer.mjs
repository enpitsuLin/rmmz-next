import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { premultiplyAtlas } from './effekseer/premultiply-atlas.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const reference = `${root}img/nightward/reference/`
const manifest = JSON.parse(readFileSync(`${reference}manifest.json`, 'utf8'))
const combat = JSON.parse(readFileSync(`${reference}combat-fx.json`, 'utf8'))
const effects = []
function add(name, atlas, frame, mode, nearest = false) {
  const png = readFileSync(`${reference}${atlas}.png`)
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20)
  effects.push({ name, atlas, texture: `effects/nightward/textures/${atlas}.png`, frame, mode, nearest, uv: [frame.x / width, frame.y / height, frame.width / width, frame.height / height] })
}
for (const [name, frame] of Object.entries(combat.frames)) {
  for (const mode of ['add', 'normal', 'multiply']) add(`combat-${name}-${mode}`, 'combat-fx', frame, mode)
  if (name === 'beam') for (const mode of ['beam-a', 'beam-b']) add(mode, 'combat-fx', frame, mode)
}
for (const name of ['tome', 'flask', 'brazier.fire']) {
  for (const [index, source] of manifest.animations[name].frames.entries()) {
    const size = Math.max(source.width, source.height)
    const frame = name === 'brazier.fire' ? source : { x: source.x + (source.width - size) / 2, y: source.y + (source.height - size) / 2, width: size, height: size }
    add(`${name.replace('.', '-')}-${index}`, 'actors-albedo', frame, name === 'brazier.fire' ? 'normal' : 'mask', true)
  }
}
add('brazier-afterglow', 'effects', { x: 1, y: 1, width: 126, height: 126 }, 'add')
mkdirSync(`${root}effects/nightward`, { recursive: true })
mkdirSync(`${root}effects/nightward/textures`, { recursive: true })
for (const atlas of ['combat-fx', 'actors-albedo', 'effects']) writeFileSync(`${root}effects/nightward/textures/${atlas}.png`, premultiplyAtlas(readFileSync(`${reference}${atlas}.png`)))
writeFileSync(`${reference}effekseer.json`, `${JSON.stringify({ exporter: 'Effekseer 1.70e', source: combat.source, effects }, null, 2)}\n`)

// The same GLSL is compiled for the vertex and fragment stages by Effekseer.
const common = `
float3 worldPositionOffset = float3(0.0, 0.0, 0.0);
float3 baseColor = float3(0.0, 0.0, 0.0);
float metallic = 0.0;
float roughness = 1.0;
float ambientOcclusion = 1.0;
float3 normalDir = float3(0.0, 0.0, 1.0);
float refraction = 0.0;
float3 emissive = float3(0.0, 0.0, 0.0);
float opacity = 1.0;
float opacityMask = 1.0;
`
for (const mode of ['sprite', 'mask', 'multiply', 'beam-a', 'beam-b']) {
  const beam = mode.startsWith('beam-')
  const beamUv = mode === 'beam-a' ? 'float2(uv2.x + 1.0 - uv2.y, 0.5)' : 'float2(uv2.y - uv2.x, 0.5)'
  const end = mode === 'beam-a' ? 'uv2.y' : '(1.0 - uv2.y)'
  const vertex = beam ? `
float3 other = mod(floor(customData1.x / float3(65536.0, 256.0, 1.0)), 256.0) / 255.0;
vcolor = mix(float4(pow(vcolor.rgb, float3(2.2)), vcolor.a), float4(pow(other, float3(2.2)), customData1.y), ${end});
` : `
float heat = customData1.x;
float3 fire = clamp(float3(heat * 2.5, (heat - 0.32) * 1.5, (heat - 0.72) * 3.6), 0.0, 1.0);
vcolor = float4(pow(vcolor.rgb * fire, float3(2.2)), vcolor.a * customData1.y);
`
  const code = `${common}
#ifndef FRAGCOLOR
${vertex}
#else
float2 atlasUv = atlasFrame.xy + ${beam ? beamUv : 'uv2'} * atlasFrame.zw;
float4 texel = $TEX_P0$atlasUv$TEX_S0$;
emissive = pow(texel.rgb / max(texel.a, 0.001), float3(2.2)) * vcolor.rgb * nightwardGlobals.x;
opacity = texel.a * vcolor.a;
${mode === 'mask' ? 'opacityMask = opacity - 0.5; opacity = 1.0;' : ''}
float fogDepth = v_PosP.w;
float fogD = nightwardFog.w * customData1.z * fogDepth;
float fogFactor = 1.0 - exp(-fogD * fogD);
emissive = mix(emissive, nightwardFog.rgb, fogFactor);
${mode === 'multiply' ? 'emissive = mix(float3(1.0), emissive, opacity); opacity = 1.0;' : ''}
${beam ? 'float pulledDepth = max(fogDepth - nightwardGlobals.w, 0.0001); float nearPlane = nightwardGlobals.y; float farPlane = nightwardGlobals.z; gl_FragDepth = 0.5 + 0.5 * ((farPlane + nearPlane) / (farPlane - nearPlane) - 2.0 * farPlane * nearPlane / ((farPlane - nearPlane) * pulledDepth));' : ''}
#endif
`
  writeFileSync(`${root}scripts/effekseer/${mode}.glsl`, code)
}
const editor = process.env.EFFEKSEER_EDITOR_DIR
if (!editor) throw new Error('Set EFFEKSEER_EDITOR_DIR to the official Effekseer 1.70e directory containing EffekseerCore.dll.')
const temporary = resolve(process.env.TMPDIR || '/tmp', 'nightward-effekseer-export')
mkdirSync(temporary, { recursive: true })
const options = { stdio: 'inherit', cwd: dirname(root), env: { ...process.env, DOTNET_CLI_HOME: `${temporary}/cli`, DOTNET_CLI_TELEMETRY_OPTOUT: '1' } }
const dotnet = process.env.DOTNET || 'dotnet'
const compilation = spawnSync(dotnet, ['build', `${root}scripts/effekseer/exporter.csproj`, `-p:EffekseerEditorDirectory=${resolve(editor)}`, `-p:RestoreSources=${temporary}`, `-p:BaseIntermediateOutputPath=${temporary}/obj/`, `-p:OutputPath=${temporary}/bin/`, '--nologo', '--verbosity', 'quiet'], options)
if (compilation.error) throw compilation.error
if (compilation.status !== 0) process.exit(compilation.status)
const exportResult = spawnSync(dotnet, [`${temporary}/bin/exporter.dll`, root], options)
if (exportResult.error) throw exportResult.error
if (exportResult.signal) throw new Error(`Effekseer exporter stopped: ${exportResult.signal}`)
process.exitCode = exportResult.status
