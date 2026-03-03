import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/index.ts',
  ],
  target: 'es2021',
  exports: true,
  copy: [
    'src/type.d.ts',
  ]
  // ...config options
})
