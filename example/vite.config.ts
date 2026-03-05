import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import { rmmz } from './plugins/rmmz'
 
export default defineConfig({
  plugins: [
    rmmz({ projectRoot: resolve(__dirname, 'project') }),
  ],
  esbuild: {
    target: 'es2021',
  },
  build: {
    target: 'es2021',
  },
})
