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
        drop_debugger: true, // debugger 제거
        pure_funcs: ['console.info', 'console.debug', 'console.warn'] // 추가 console 함수 제거
      },
      format: {
        comments: false  // 모든 주석 제거
      },
      mangle: {
        safari10: true // Safari 10 호환성
      }
    },
    // CSS 최적화
    cssMinify: true,
    // 청크 분리 최적화
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          icons: ['react-icons'],
          supabase: ['@supabase/supabase-js']
        }
      }
    },
    // 소스맵 비활성화 (프로덕션용)
    sourcemap: false,
    // 빌드 사이즈 경고 임계값
    chunkSizeWarningLimit: 1000
  }
})
