import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import { rmmz } from './plugins/rmmz'

export default defineConfig({
  plugins: [
    rmmz({
      projectRoot: resolve(__dirname, 'project'),
      apiPath: "rmmz__"
    }),
  ],
  esbuild: {
    target: 'es2021',
  },
  build: {
    minify: false,
    target: 'es2021',
  },
})
