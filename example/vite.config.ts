import { defineConfig } from 'vite'
import { rmmz } from 'vite-plugin-rmmz'

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
