import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // VITE_API_PROXY_TARGET lets you point the dev server's /api proxy at either
  // a locally running API (`sam local start-api`, default) or the deployed
  // cloud API (set VITE_API_PROXY_TARGET to the ApiUrl stack output).
  // Set it in frontend/.env.local (gitignored) — see .env.example.
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const target = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:3000'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
        },
      },
    },
  }
})
