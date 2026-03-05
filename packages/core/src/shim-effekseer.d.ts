interface EffekseerEffect {
  isLoaded: boolean
}

interface Effekseer {
  init: (gl: WebGLRenderingContext) => void
  setRestorationOfStatesFlag: (flag: boolean) => void
  loadEffect: (url: string, scale: number, onLoad: () => void, onError: (message: string, url: string) => void) => EffekseerEffect
  releaseEffect: (effect: EffekseerEffect) => void
  stopAll: () => void
  update: () => void
  play: (effect: EffekseerEffect) => EffekseerHandle | null
}

interface EffekseerHandle {
  setLocation: (x: number, y: number, z: number) => void
  setRotation: (x: number, y: number, z: number) => void
  setScale: (x: number, y: number, z: number) => void
  setSpeed: (speed: number) => void
  exists: boolean
}

declare const effekseer: {
  createContext: () => Effekseer | null
  initRuntime: (wasmUrl: string, onLoad: () => void, onError: () => void) => void
}

interface Window {
  effekseer: typeof effekseer
}
