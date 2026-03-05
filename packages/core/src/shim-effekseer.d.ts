interface Effekseer {
  init: (gl: WebGLRenderingContext) => void
  setRestorationOfStatesFlag: (flag: boolean) => void
  loadEffect: (url: string, flag, onLoad: () => void, onError: () => void) => void
}

declare const effekseer: {
  createContext: () => Effekseer | null
  initRuntime: (wasmUrl: string, onLoad: () => void, onError: () => void) => void
}

interface Window {
  effekseer: typeof effekseer
}
