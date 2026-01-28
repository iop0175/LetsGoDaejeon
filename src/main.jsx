import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { LanguageProvider } from './context/LanguageContext'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import App from './App.jsx'
import './styles/index.css'

// 카카오맵 SDK 동적 로드
;(function loadKakaoMapSDK() {
  const kakaoScript = document.createElement('script')
  kakaoScript.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${import.meta.env.VITE_KAKAO_MAP_KEY}&autoload=false&libraries=services`
  kakaoScript.async = true
  kakaoScript.onload = function() {
    if (window.kakao && window.kakao.maps) {
      window.kakao.maps.load(function() {
        window.dispatchEvent(new Event('kakaoMapLoaded'))
      })
    }
  }
  document.head.appendChild(kakaoScript)
})()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>,
)
