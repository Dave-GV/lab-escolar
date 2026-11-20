import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// El proxy hace que el navegador vea frontend y API en el mismo origen
// (http://localhost:5173). Por eso la cookie puede ser SameSite=Strict
// y no hace falta habilitar CORS en Express.
const API = 'http://localhost:3000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': API,
      '/uploads': API,
    },
  },
})
