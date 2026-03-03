import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/index.ts',
  ],
  target: 'es2021',
  exports: {
    enabled: true,
    async customExports(exports) {
      exports['./types'] = './dist/types.d.ts'
      return exports
    },
  },
  platform: "browser",
  copy: [
    '*.d.ts',
  ]
  // ...config options
})
