import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:9000',
      // Initiates the Google OAuth handshake; Google itself redirects the browser
      // straight to the backend port for the callback, bypassing this proxy.
      // Scoped to /authorization so /oauth2/redirect still falls through to the SPA.
      '/oauth2/authorization': 'http://localhost:9000',
    },
  },
})
