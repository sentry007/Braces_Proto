import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    global: 'globalThis',
  },
  worker: {
    format: 'es',
  },
  build: {
    // Monaco and the tokenizer table are large by nature and load lazily
    chunkSizeWarningLimit: 4000,
  },
})
