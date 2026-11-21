/* eslint-disable test/no-import-node-test */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { it } from 'node:test'
import { fileURLToPath } from 'node:url'

const packageRoot = resolve(fileURLToPath(new URL('../', import.meta.url)))
const repositoryRoot = resolve(packageRoot, '../..')
const resourceProject = join(repositoryRoot, 'example/basic')
const cli = join(packageRoot, 'bin/cli.js')

async function createProject(t) {
  const root = await mkdtemp(join(tmpdir(), 'rmmz-next init-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const resourceDirectories = ['audio', 'css', 'data', 'effects', 'fonts', 'icon', 'img', 'movies', 'js/libs', 'js/plugins']
  for (const directory of resourceDirectories) {
    const source = join(resourceProject, directory)
    if (existsSync(source))
      await cp(source, join(root, directory), { recursive: true })
  }
  await cp(join(packageRoot, 'test/fixtures/original-project'), root, { recursive: true })
  return root
}

function run(cwd, args) {
  return spawnSync(process.execPath, args, {
    cwd,
    encoding: 'utf8',
    timeout: 60000,
    maxBuffer: 4 * 1024 * 1024,
  })
}

it('init migrates the original project and produces a build with runtime libraries', async (t) => {
  const root = await createProject(t)
  const originalManifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
  originalManifest.scripts = { custom: 'node custom.js', postinstall: 'node setup.js' }
  await writeFile(join(root, 'package.json'), JSON.stringify(originalManifest))
  const plugins = [
    { name: 'AltMenuScreen', status: true, description: 'Alternative menu screen layout.', parameters: {} },
    { name: 'ButtonPicture', status: false, description: 'Picture buttons', parameters: { button: 'Custom' } },
  ]
  await writeFile(join(root, 'js/plugins.js'), `var $plugins = ${JSON.stringify(plugins)};\n`)
  await writeFile(join(root, '.gitignore'), 'custom-output\n')
  const mainBefore = await readFile(join(root, 'js/main.js'), 'utf8')
  const manifestBefore = await readFile(join(root, 'package.json'), 'utf8')
  const systemBefore = await readFile(join(root, 'data/System.json'))
  const pluginBefore = await readFile(join(root, 'js/plugins/AltMenuScreen.js'))

  const result = run(repositoryRoot, [cli, 'init', root])
  assert.equal(result.status, 0, result.stderr)
  const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
  assert.equal(manifest.type, 'module')
  assert.equal(manifest.private, true)
  assert.equal(manifest.main, 'index.html')
  assert.equal(manifest.name, originalManifest.name)
  assert.deepEqual(manifest.window, originalManifest.window)
  assert.equal(manifest['chromium-args'], originalManifest['chromium-args'])
  assert.equal(manifest.scripts.custom, originalManifest.scripts.custom)
  assert.equal(manifest.scripts.postinstall, 'node setup.js && rmmz-next protect')
  assert.equal(manifest.scripts.dev, 'rmmz-next dev')
  assert.equal(manifest.scripts['dev:server'], 'vite')
  assert.equal(manifest.scripts.build, 'vite build')
  assert.equal(manifest.scripts.typecheck, 'tsc --noEmit')
  assert.equal(resolve(root, manifest.dependencies['rmmz-next'].slice('link:'.length)), packageRoot)
  assert.ok(manifest.devDependencies.typescript)
  assert.ok(manifest.devDependencies.vite)
  assert.ok(manifest.devDependencies['@types/node'])
  assert.doesNotMatch(JSON.stringify(manifest), /catalog:/)
  assert.ok(manifest['node-remote'].includes('http://localhost:*'))

  const html = await readFile(join(root, 'index.html'), 'utf8')
  assert.match(html, /<title>Playable Tutorial<\/title>/)
  assert.match(html, /<script type="module" src="\/js\/main.js">/)
  assert.match(html, /data-rmmz-dev-redirect/)
  const nextPlugins = JSON.parse((await readFile(join(root, 'js/plugins.js'), 'utf8')).split('var $plugins =')[1].trim().replace(/;$/, ''))
  assert.equal(nextPlugins[0].name, 'RmmzGlobals')
  assert.equal(nextPlugins[0].status, true)
  assert.deepEqual(nextPlugins.slice(1), plugins)
  assert.deepEqual(await readFile(join(root, 'data/System.json')), systemBefore)
  assert.deepEqual(await readFile(join(root, 'js/plugins/AltMenuScreen.js')), pluginBefore)
  assert.equal(await readFile(join(root, '.rmmz-next-backup/js/main.js'), 'utf8'), mainBefore)
  assert.equal(await readFile(join(root, '.rmmz-next-backup/package.json'), 'utf8'), manifestBefore)
  assert.ok(existsSync(join(root, '.rmmz-next-backup/js/rmmz_core.js')))
  assert.ok(!existsSync(join(root, 'js/rmmz_core.js')))
  assert.ok(!existsSync(join(root, 'js/libs/pixi.js')))
  assert.match(await readFile(join(root, '.gitignore'), 'utf8'), /^custom-output\n/)

  // Reuse installed dependencies without a network install or postinstall side effects.
  await mkdir(join(root, 'node_modules/@types'), { recursive: true })
  for (const [name, source] of [
    ['rmmz-next', packageRoot],
    ['vite', join(packageRoot, 'node_modules/vite')],
    ['typescript', join(repositoryRoot, 'node_modules/typescript')],
    ['@types/node', join(repositoryRoot, 'node_modules/@types/node')],
  ]) {
    await symlink(source, join(root, 'node_modules', name), 'junction')
  }
  const typecheck = run(root, [join(repositoryRoot, 'node_modules/typescript/bin/tsc'), '--noEmit'])
  assert.equal(typecheck.status, 0, typecheck.stdout + typecheck.stderr)
  const build = run(root, [join(packageRoot, 'node_modules/vite/bin/vite.js'), 'build'])
  assert.equal(build.status, 0, build.stdout + build.stderr)
  assert.doesNotMatch(await readFile(join(root, 'dist/index.html'), 'utf8'), /data-rmmz-dev-redirect/)
  assert.deepEqual(await readFile(join(root, 'dist/data/System.json')), systemBefore)
  for (const file of ['effekseer.min.js', 'effekseer.wasm', 'vorbisdecoder.js']) {
    assert.deepEqual(
      await readFile(join(root, 'dist/js/libs', file)),
      await readFile(join(resourceProject, 'js/libs', file)),
    )
  }
})

it('init defaults to the current directory and refuses to overwrite a migrated project', async (t) => {
  const root = await createProject(t)
  const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
  manifest.dependencies = { 'rmmz-next': 'workspace:*' }
  await writeFile(join(root, 'package.json'), JSON.stringify(manifest))

  const result = run(root, [cli, 'init'])
  assert.equal(result.status, 0, result.stderr)
  const nextManifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
  assert.equal(nextManifest.dependencies['rmmz-next'], 'workspace:*')
  const customMain = '// User changes after migration\n'
  await writeFile(join(root, 'js/main.js'), customMain)
  const repeated = run(root, [cli, 'init'])
  assert.equal(repeated.status, 1)
  assert.match(repeated.stderr, /请勿重复初始化/)
  assert.equal(await readFile(join(root, 'js/main.js'), 'utf8'), customMain)
})

it('init rejects a directory without an MZ project before writing files', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'rmmz-next-invalid-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const result = run(root, [cli, 'init'])
  assert.equal(result.status, 1)
  assert.match(result.stderr, /不是 RPG Maker MZ 工程/)
  assert.ok(!existsSync(join(root, 'package.json')))
  assert.ok(!existsSync(join(root, '.rmmz-next-backup')))
})
