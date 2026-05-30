import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Proxy API calls to the Express backend so the frontend can use
    // relative '/api/...' URLs with no CORS handling needed in dev.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
