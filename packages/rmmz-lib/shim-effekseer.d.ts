declare const effekseer: {
  createContext: () => {
    init: (gl: WebGLRenderingContext) => void
    setRestorationOfStatesFlag: (flag: boolean) => void
  } | null
}

interface Window {
  effekseer: typeof effekseer
}
