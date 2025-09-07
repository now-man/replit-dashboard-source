import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: [
      // Replit의 모든 미리보기 주소를 허용하도록 추가
      '.replit.dev'
    ]
  }
})