import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    host: true // 네트워크에서 접근 가능하게 설정
  },
  build: {
    // 프로덕션 빌드 시 주석 및 console 제거
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,  // console.log 제거
        drop_debugger: true  // debugger 제거
      },
      format: {
        comments: false  // 모든 주석 제거
      }
    }
  }
})
