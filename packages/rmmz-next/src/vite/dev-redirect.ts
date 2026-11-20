import type { Plugin, ViteDevServer } from 'vite'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

/**
 * The RPG Maker MZ editor's playtest launches NW.js with the project directory
 * itself, so `index.html` is loaded over `file://` and the Vite entry module
 * (`/src/main.ts`) cannot be resolved. The project ships a loader script,
 * tagged with `data-rmmz-dev-redirect`, that follows the running dev server.
 *
 * The plugins below publish the dev server URL for that loader and strip it
 * from built output, where following localhost would be wrong.
 */

/** Published under `node_modules`; the loader in `index.html` reads it. */
const DEV_SERVER_FILE = 'node_modules/.cache/rmmz-dev-server.json'

const REDIRECT_TAG = 'data-rmmz-dev-redirect'
const REDIRECT_SCRIPT_RE = new RegExp(`\\s*<script[^>]*${REDIRECT_TAG}[^>]*>[\\s\\S]*?</script>`)

/**
 * Publishes the dev server URL under `node_modules/.cache` so the loader can
 * find it from disk, and removes it on shutdown so stale ports do not linger.
 */
export function devServerInfo(): Plugin {
  let root: string

  return {
    name: 'rmmz:dev-server-info',
    apply: 'serve',
    configResolved(config) {
      root = config.root
    },
    configureServer(server) {
      const file = join(root, DEV_SERVER_FILE)
      const publish = (): void => {
        void writeDevServerInfo(server, file)
      }

      server.httpServer?.once('listening', publish)
      server.httpServer?.once('close', () => {
        void rm(file, { force: true })
      })
    },
  }
}

/**
 * Drops the loader from the build: a packaged game must never redirect to a
 * local dev server.
 */
export function stripDevRedirect(): Plugin {
  return {
    name: 'rmmz:strip-dev-redirect',
    apply: 'build',
    transformIndexHtml: {
      order: 'pre',
      handler: html => html.replace(REDIRECT_SCRIPT_RE, ''),
    },
  }
}

async function writeDevServerInfo(server: ViteDevServer, file: string): Promise<void> {
  // `resolvedUrls` is populated right after the server starts listening, which
  // happens after the `listening` event is emitted.
  for (let attempt = 0; attempt < 20; attempt++) {
    const url = server.resolvedUrls?.local?.[0]
    if (url) {
      await mkdir(dirname(file), { recursive: true })
      await writeFile(file, JSON.stringify({ url }))
      return
    }
    await new Promise(resolve => setTimeout(resolve, 50))
  }
}
