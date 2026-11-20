/**
 * Effekseer and the Vorbis decoder are classic scripts: they publish globals and
 * `vorbisdecoder.js` even spawns its worker from `document.currentScript.src`.
 * They therefore cannot be imported as ES modules, but they are still owned by
 * core and shipped inside the package.
 */
export const libUrls = {
  effekseer: new URL('./vendor/effekseer.min.js', import.meta.url).href,
  vorbisDecoder: new URL('./vendor/vorbisdecoder.js', import.meta.url).href,
  effekseerWasm: new URL('./vendor/effekseer.wasm', import.meta.url).href,
}

function loadClassicScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = url
    script.async = false
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load: ${url}`))
    document.head.appendChild(script)
  })
}

let externalLibsPromise: Promise<void> | null = null

/**
 * Injects the bundled Effekseer and Vorbis decoder scripts. Safe to call more
 * than once; the scripts are only loaded on the first call.
 */
export function loadExternalLibs(): Promise<void> {
  externalLibsPromise ??= Promise.all([
    loadClassicScript(libUrls.effekseer),
    loadClassicScript(libUrls.vorbisDecoder),
  ]).then(() => {})
  return externalLibsPromise
}

/**
 * Boots the Effekseer runtime from the wasm binary bundled with core.
 */
export function initEffekseerRuntime(): Promise<void> {
  return new Promise((resolve, reject) => {
    const effekseer = window.effekseer
    if (!effekseer) {
      reject(new Error('Effekseer is not loaded'))
      return
    }
    effekseer.initRuntime(
      libUrls.effekseerWasm,
      () => resolve(),
      () => reject(new Error(`Failed to load: ${libUrls.effekseerWasm}`)),
    )
  })
}
