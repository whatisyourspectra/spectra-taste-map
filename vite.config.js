import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Avoid localhost resolution edge-cases by defaulting to IPv4 loopback.
const proxyTarget = process.env.VITE_PROXY_TARGET || process.env.PROXY_TARGET || 'http://127.0.0.1:3001'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // This exposes the server to the local network explicitly
    port: 5173,
    strictPort: true,
    proxy: {
      // Let socket.io-client connect to the current host (5173) and proxy to backend.
      '/socket.io': {
        target: proxyTarget,
        ws: true,
        changeOrigin: true,
      },
      // Spotify API proxy (token + search stay on server, no client secret in browser)
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
      },
      // Auth endpoints for Spotify login
      '/auth': {
        target: proxyTarget,
        changeOrigin: true,
      },
    },
  }
})
