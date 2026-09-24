import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// In local dev each shop is served at {slug}.localhost:5173. The browser calls the
// same-origin /api path and Vite forwards it to the API, keeping the shop's Host
// in X-Forwarded-Host. In production a Cloudflare Worker does the same job.
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:5080',
        changeOrigin: true,
        xfwd: true,
      },
    },
  },
})
