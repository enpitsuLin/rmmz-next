import { rmmz } from 'rmmz-next/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  plugins: [
    rmmz(),
  ],
  esbuild: {
    target: 'es2021',
  },
  build: {
    minify: false,
    target: 'es2021',
  },
})
