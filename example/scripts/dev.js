#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { homedir, platform } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import cac from 'cac'
import { createLogger, createServer } from 'vite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const isWindows = platform() === 'win32'
const isLinux = platform() === 'linux'
const isMacOS = platform() === 'darwin'

// ============================================================================
// VDF Parser & Path Finding
// ============================================================================

function parseVDF(content) {
  const result = {}
  const stack = [result]
  const keyValueRegex = /^\s*"([^"]+)"\s*"([^"]*)"/
  const keyStartRegex = /^\s*"([^"]+)"\s*$/

  let currentKey = null

  for (const line of content.split('\n')) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('//'))
      continue

    if (trimmed === '{') {
      if (currentKey !== null) {
        const newObj = {}
        stack[stack.length - 1][currentKey] = newObj
        stack.push(newObj)
        currentKey = null
      }
      continue
    }

    if (trimmed === '}') {
      stack.pop()
      currentKey = null
      continue
    }

    const kvMatch = line.match(keyValueRegex)
    if (kvMatch) {
      const [, key, value] = kvMatch
      stack[stack.length - 1][key] = value
      continue
    }

    const keyMatch = line.match(keyStartRegex)
    if (keyMatch) {
      currentKey = keyMatch[1]
    }
  }

  return result
}

function getSteamConfigPaths() {
  const paths = []

  if (isMacOS) {
    paths.push(
      join(homedir(), 'Library', 'Application Support', 'Steam', 'config', 'libraryfolders.vdf'),
    )
  }
  else if (isWindows) {
    // Windows: Check both 64-bit and 32-bit default locations
    paths.push(
      join('C:\\Program Files (x86)\\Steam', 'config', 'libraryfolders.vdf'),
      join('C:\\Program Files\\Steam', 'config', 'libraryfolders.vdf'),
    )
    // Also check user-specific Steam path from registry
    const localAppData = process.env.LOCALAPPDATA
    const programData = process.env.PROGRAMDATA
    if (localAppData) {
      paths.push(join(localAppData, 'Steam', 'config', 'libraryfolders.vdf'))
    }
    if (programData) {
      paths.push(join(programData, 'Steam', 'config', 'libraryfolders.vdf'))
    }
  }
  else if (isLinux) {
    // Linux: ~/.steam/steam/config or ~/.steam/debian-installation/config or ~/.local/share/Steam
    paths.push(
      join(homedir(), '.steam', 'steam', 'config', 'libraryfolders.vdf'),
      join(homedir(), '.steam', 'config', 'libraryfolders.vdf'),
      join(homedir(), '.local', 'share', 'Steam', 'config', 'libraryfolders.vdf'),
      join(homedir(), '.steam', 'debian-installation', 'config', 'libraryfolders.vdf'),
    )
  }

  return paths
}

function getSteamLibraryFolders() {
  const paths = []
  const configPaths = getSteamConfigPaths()

  for (const configPath of configPaths) {
    if (!existsSync(configPath))
      continue

    try {
      const content = readFileSync(configPath, 'utf8')
      const parsed = parseVDF(content)
      const libraryFolders = parsed.libraryfolders

      if (!libraryFolders)
        continue

      for (const key of Object.keys(libraryFolders)) {
        if (!Number.isNaN(Number(key))) {
          const folder = libraryFolders[key]
          if (folder && folder.path) {
            paths.push(folder.path)
          }
        }
      }
      // Stop after first successful parse
      if (paths.length > 0)
        break
    }
    catch {
      // Continue to next config path
    }
  }

  return paths
}

function findRMMZPath(libraryFolders) {
  const appId = '1059510'
  const possibleNames = ['RPG Maker MZ', 'RPGMakerMZ']

  for (const libraryPath of libraryFolders) {
    for (const name of possibleNames) {
      const commonPath = join(libraryPath, 'steamapps', 'common', name)
      if (existsSync(commonPath))
        return commonPath
    }

    const manifestPath = join(libraryPath, 'steamapps', `appmanifest_${appId}.acf`)
    if (existsSync(manifestPath)) {
      try {
        const content = readFileSync(manifestPath, 'utf8')
        const parsed = parseVDF(content)
        const installDir = parsed?.AppState?.installdir
        if (installDir) {
          const gamePath = join(libraryPath, 'steamapps', 'common', installDir)
          if (existsSync(gamePath))
            return gamePath
        }
      }
      catch {
        // Continue
      }
    }
  }

  return null
}

function getNWJSPossiblePaths() {
  if (isMacOS) {
    return [
      'RPGMZ.app/Contents/Resources/nwjs-mac/nwjs.app/Contents/MacOS/nwjs',
      'RPG Maker MZ.app/Contents/Resources/nwjs-mac/nwjs.app/Contents/MacOS/nwjs',
      'nwjs-mac/nwjs.app/Contents/MacOS/nwjs',
      'nwjs/nwjs.app/Contents/MacOS/nwjs',
    ]
  }
  else if (isWindows) {
    return [
      'nwjs-win/nw.exe',
      'nwjs-win64/nw.exe',
      'nwjs/nw.exe',
      'nw.exe',
    ]
  }
  else if (isLinux) {
    return [
      'nwjs-linux/nw',
      'nwjs-linux64/nw',
      'nwjs/nw',
      'nw',
    ]
  }
  return []
}

function findNWJS(rmmzPath) {
  if (!rmmzPath)
    return null

  const possiblePaths = getNWJSPossiblePaths()

  for (const relativePath of possiblePaths) {
    const fullPath = join(rmmzPath, relativePath)
    if (existsSync(fullPath))
      return fullPath
  }

  return null
}

function getNWJSPath() {
  if (process.env.RMMZ_NW_PATH && existsSync(process.env.RMMZ_NW_PATH)) {
    return process.env.RMMZ_NW_PATH
  }

  const libraryFolders = getSteamLibraryFolders()
  const rmmzPath = findRMMZPath(libraryFolders)
  return findNWJS(rmmzPath)
}

function getProjectPath(customPath = null) {
  if (customPath && existsSync(customPath))
    return customPath

  const defaultPath = join(__dirname, '..', 'dist')
  if (existsSync(defaultPath))
    return defaultPath

  return null
}

// ============================================================================
// Command Functions
// ============================================================================

function commandFind() {
  console.log(`Searching for RPG Maker MZ on ${platform()}...`)

  const libraryFolders = getSteamLibraryFolders()
  if (libraryFolders.length === 0) {
    console.error('No Steam library folders found.')
    process.exit(1)
  }

  const rmmzPath = findRMMZPath(libraryFolders)
  if (!rmmzPath) {
    console.error('RPG Maker MZ not found in Steam libraries.')
    process.exit(1)
  }

  const nwjsPath = findNWJS(rmmzPath)
  if (!nwjsPath) {
    console.error('nwjs executable not found within RMMZ.')
    process.exit(1)
  }

  console.log('\n✅ Found nwjs at:')
  console.log(nwjsPath)
  console.log('\n📝 Environment variable:')
  if (isWindows) {
    console.log(`set RMMZ_NW_PATH=${nwjsPath}`)
  }
  else {
    console.log(`export RMMZ_NW_PATH="${nwjsPath}"`)
  }
}

function commandGame(options) {
  const nwjsPath = getNWJSPath()
  if (!nwjsPath) {
    console.error('Could not find nwjs executable.')
    process.exit(1)
  }

  const projectPath = getProjectPath(options.projectPath)
  if (!projectPath) {
    console.error('Game directory not found. Run "vite build" first.')
    process.exit(1)
  }

  console.log('Launching game...')
  console.log('  nwjs:', nwjsPath)
  console.log('  project:', projectPath)
  console.log()

  const child = spawn(nwjsPath, [projectPath], {
    stdio: 'inherit',
  })

  child.on('error', (err) => {
    console.error('Failed to start process:', err)
    process.exit(1)
  })

  child.on('exit', (code) => {
    process.exit(code ?? 0)
  })
}

async function commandDev() {
  const nwjsPath = getNWJSPath()
  if (!nwjsPath) {
    console.error('Could not find nwjs executable.')
    process.exit(1)
  }

  let gameProcess = null

  // Create prefixed logger for Vite
  const createPrefixedLogger = (prefix) => {
    const logger = createLogger()
    const prefixOutput = fn => (msg, ...args) => {
      const lines = msg.split('\n').filter(Boolean)
      for (const line of lines) {
        fn(`[${prefix}] ${line}`, ...args)
      }
    }
    return {
      ...logger,
      info: prefixOutput(logger.info),
      warn: prefixOutput(logger.warn),
      error: prefixOutput(logger.error),
    }
  }

  // Start Vite dev server with JavaScript API
  console.log('[vite] Starting...')
  const viteServer = await createServer({
    root: join(__dirname, '..'),
    customLogger: createPrefixedLogger('vite'),
  })

  await viteServer.listen()

  const serverUrl = viteServer.resolvedUrls?.local?.[0]
  if (!serverUrl) {
    console.error('Vite dev server did not expose a local URL.')
    await viteServer.close()
    process.exit(1)
  }

  // NW.js expects an app directory as its argument, not a URL. Generate a tiny
  // app that redirects to the dev server, and keep Node APIs enabled in the
  // remote page so the game behaves like a packaged build.
  const rootDir = join(__dirname, '..')
  const rootManifest = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'))
  // Reuse one app directory across runs: the runtime saves next to the app, so a
  // throwaway directory would lose every save when the process exits.
  const devAppDir = join(rootDir, '.rmmz-dev')
  await mkdir(devAppDir, { recursive: true })
  await writeFile(
    join(devAppDir, 'package.json'),
    JSON.stringify({
      'name': 'rmmz-next-dev',
      'main': 'index.html',
      'node-remote': rootManifest['node-remote'] ?? new URL(serverUrl).origin,
      'chromium-args': rootManifest['chromium-args'],
      'window': rootManifest.window,
    }, null, 2),
  )
  await writeFile(
    join(devAppDir, 'index.html'),
    `<!doctype html><meta charset="utf-8"><script>location.replace(${JSON.stringify(serverUrl)})</script>`,
  )

  // Launch game after Vite is ready. The Vite root is the game project root,
  // so relative asset paths just work once the page is served by Vite.
  setTimeout(() => {
    console.log('[game] Starting...')
    gameProcess = spawn(nwjsPath, [devAppDir], {
      cwd: rootDir,
      stdio: 'pipe',
    })

    const prefixOutput = (prefix, fn) => (data) => {
      const lines = data.toString().split('\n').filter(Boolean)
      for (const line of lines) {
        fn(`[${prefix}] ${line}`)
      }
    }

    gameProcess.stdout?.on('data', prefixOutput('game', console.log))
    gameProcess.stderr?.on('data', prefixOutput('game', console.error))

    gameProcess.on('error', (err) => {
      console.error('[game] Failed to start:', err)
    })

    gameProcess.on('exit', async (code) => {
      console.log(`[game] Exited with code ${code}`)
      await viteServer.close()
      process.exit(code ?? 0)
    })
  }, 1000)

  // Handle shutdown signals
  const shutdown = async () => {
    console.log('\nShutting down...')
    if (gameProcess && !gameProcess.killed) {
      gameProcess.kill('SIGTERM')
      setTimeout(() => {
        if (!gameProcess.killed)
          gameProcess.kill('SIGKILL')
      }, 2000)
    }
    await viteServer.close()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  // Windows uses SIGBREAK for Ctrl+C
  if (isWindows) {
    process.on('SIGBREAK', shutdown)
  }
}

// ============================================================================
// Setup CLI with cac
// ============================================================================

const cli = cac('rmmz-dev')

cli
  .command('dev', 'Start Vite dev server + game')
  .action(async () => {
    await commandDev()
  })

cli
  .command('game [dir]', 'Run a built game directory with nwjs (default: dist)')
  .action((dir) => {
    commandGame({ projectPath: dir })
  })

cli
  .command('find', 'Find and display nwjs path')
  .action(() => {
    commandFind()
  })

cli.help()
cli.parse()

if (!cli.matchedCommand && !cli.options.help) {
  if (cli.args[0]) {
    console.error(`Unknown command: ${cli.args[0]}`)
    process.exit(1)
  }
  await commandDev()
}
