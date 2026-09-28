import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  return {
    plugins: [vue()],
    publicDir: 'public-assets',
    build: { outDir: 'dist-modern', emptyOutDir: true },
    server: {
      host: env.VITE_HOST || '0.0.0.0',
      port: Number(env.VITE_PORT) || 3030,
      open: env.VITE_OPEN_BROWSER === 'true',
      proxy: { '/api': { target: env.VITE_API_URL || 'http://localhost:3031', changeOrigin: true } },
    },
  }
})
