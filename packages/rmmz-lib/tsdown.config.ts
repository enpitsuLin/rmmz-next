import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/shim.ts',
  ],
  exports: true,
  // ...config options
})
