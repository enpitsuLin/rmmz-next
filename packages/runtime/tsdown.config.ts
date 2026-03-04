import { defineConfig } from 'tsdown'

export default defineConfig({
  target: 'es2021',
  exports: {
    enabled: true,
    async customExports(exports, context) {
      if (context.isPublish) {
        exports['./types'] = './dist/types.d.ts'
      }
      else {
        exports['./types'] = './types.d.ts'
      }
      return exports
    },
    devExports: true,
  },
  platform: 'browser',
})
