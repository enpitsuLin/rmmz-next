import { defineConfig } from 'tsdown'

export default defineConfig({
  workspace: ['packages/*'],
  entry: ['./src/index.ts'],
  target: 'es2020',
  clean: true,
  dts: true,
  exports: {
    enabled: true,
    async customExports(exports, context) {
      if (context.pkg.name === '@rmmz-lib/core') {
        if (context.isPublish) {
          exports['./types'] = './dist/types.d.ts'
        }
        else {
          exports['./types'] = './src/types.d.ts'
        }
      }
      return exports
    },
    devExports: true,
  },
  sourcemap: true,
  platform: 'neutral',
  copy: [
    { from: 'src/*.d.ts', to: 'dist' },
  ],
})
