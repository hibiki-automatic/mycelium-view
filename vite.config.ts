import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MyceliumView',
      formats: ['es', 'cjs'],
      fileName: (format) => `mycelium-view.${format === 'es' ? 'es' : 'cjs'}.js`,
    },
    cssCodeSplit: false,
  },
})
