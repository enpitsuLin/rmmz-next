import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    'index': './src/core/index.ts',
    'database-types': './src/database-types/index.ts',
    'runtime': './src/runtime/index.ts',
    'vite': './src/vite/index.ts',
  },
  target: 'es2020',
  clean: true,
  dts: true,
  exports: {
    enabled: true,
    async customExports(exports, context) {
      const base = context.isPublish ? './dist' : './src'
      exports['./client'] = { types: `${base}/vite/client.d.ts` }
      exports['./types'] = {
        types: context.isPublish ? './dist/types.d.ts' : './src/core/types.d.ts',
      }
      exports['./globals'] = {
        types: context.isPublish ? './dist/globals.d.ts' : './src/core/globals.d.ts',
      }
      return exports
    },
    devExports: true,
  },
  sourcemap: true,
  platform: 'neutral',
  copy: [
    { from: 'src/core/*.d.ts', to: 'dist' },
    { from: 'src/vite/*.d.ts', to: 'dist/vite' },
  ],
  inputOptions: {
    checks: {
      eval: false,
      unresolvedImport: false,
    },
  },
})
