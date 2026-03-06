/// <reference types="./shim-global-variables.d.ts" />
/// <reference types="./shim-global.d.ts" />
/// <reference types="nw.js" />

interface HTMLScriptElement {
  _url?: string
}

interface Window {
  /** Vendor-prefixed AudioContext for older WebKit browsers */
  webkitAudioContext?: typeof AudioContext
  /** Vendor-prefixed IndexedDB for older Firefox browsers */
  mozIndexedDB?: IDBFactory
  /** Vendor-prefixed IndexedDB for older WebKit browsers */
  webkitIndexedDB?: IDBFactory
}
