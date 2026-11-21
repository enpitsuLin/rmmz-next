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
      exports['./global-types'] = {
        types: context.isPublish ? './dist/global-types.d.ts' : './src/core/global-types.d.ts',
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
