/**
 * Libraries load as classic scripts from the project's js/libs. The editor
 * reads Effekseer there, and Vorbis spawns its worker from document.currentScript.src.
 */
export const libUrls = {
  effekseer: 'js/libs/effekseer.min.js',
  vorbisDecoder: 'js/libs/vorbisdecoder.js',
  effekseerWasm: 'js/libs/effekseer.wasm',
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
 * Injects the Effekseer and Vorbis decoder scripts. Safe to call more
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
 * Boots the Effekseer runtime from the project's js/libs wasm binary.
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
