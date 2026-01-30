import { useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { LanguageProvider } from '../src/context/LanguageContext'
import { ThemeProvider } from '../src/context/ThemeContext'
import { AuthProvider } from '../src/context/AuthContext'

// SSR 호환성을 위해 클라이언트 전용 컴포넌트로 동적 임포트
const Header = dynamic(() => import('../src/components/Header/Header'), { ssr: false })
const Footer = dynamic(() => import('../src/components/Footer/Footer'), { ssr: false })

// 전역 CSS (Next.js에서는 _app에서만 import 가능)
import '../src/styles/index.css'
import '../src/styles/App.css'

// 컴포넌트 CSS
import '../src/components/Header/Header.css'
import '../src/components/Footer/Footer.css'
import '../src/components/HeroSection/HeroSection.css'
import '../src/components/QuickMenu/QuickMenu.css'
import '../src/components/PopularSpots/PopularSpots.css'
import '../src/components/FestivalSection/FestivalSection.css'
import '../src/components/FoodSection/FoodSection.css'
import '../src/components/TravelCourse/TravelCourse.css'
import '../src/components/TravelCard/TravelCard.css'
import '../src/components/WeatherWidget/WeatherWidget.css'
import '../src/components/KakaoChannelButton/KakaoChannelButton.css'
import '../src/components/common/LicenseBadge.css'

// 페이지 CSS
import '../src/pages/HomePage.css'
import '../src/pages/TravelPage.css'
import '../src/pages/FoodPage.css'
import '../src/pages/FestivalPage.css'
import '../src/pages/CulturePage.css'
import '../src/pages/AccommodationPage.css'
import '../src/pages/ShoppingPage.css'
import '../src/pages/LeisurePage.css'
import '../src/pages/MedicalPage.css'
import '../src/pages/ParkingPage.css'
import '../src/pages/MapPage.css'
import '../src/pages/MyTripPage.css'
import '../src/pages/SharedTripsPage.css'
import '../src/pages/SharedTripPage.css'
import '../src/pages/SearchPage.css'
import '../src/pages/SpotDetailPage.css'
import '../src/pages/AdminPage.css'
import '../src/pages/ProfilePage.css'
import '../src/pages/PolicyPage.css'

// 카카오맵 SDK 동적 로드 - 필요한 페이지에서만 로드
const loadKakaoMapSDK = (pathname) => {
  if (typeof window === 'undefined') return
  if (window.kakao?.maps) return
  
  // 지도가 필요한 페이지에서만 SDK 로드
  const mapPages = ['/map', '/my-trip', '/spot', '/shared-trip']
  const needsMap = mapPages.some(page => pathname.startsWith(page))
  if (!needsMap) return
  
  const kakaoScript = document.createElement('script')
  kakaoScript.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false&libraries=services`
  kakaoScript.async = true
  kakaoScript.onload = function() {
    if (window.kakao && window.kakao.maps) {
      window.kakao.maps.load(function() {
        window.dispatchEvent(new Event('kakaoMapLoaded'))
      })
    }
  }
  document.head.appendChild(kakaoScript)
}

// 카카오 SDK 초기화
const initKakaoSDK = () => {
  if (typeof window === 'undefined') return
  if (typeof window.Kakao !== 'undefined' && !window.Kakao.isInitialized()) {
    window.Kakao.init('1955386d457c60136d1e1d8209d658f7')
  }
}

export default function App({ Component, pageProps }) {
  const router = useRouter()
  const isAdminPage = router.pathname.startsWith('/admin')
  
  useEffect(() => {
    loadKakaoMapSDK(router.pathname)
    initKakaoSDK()
  }, [router.pathname])
  
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <div className="app">
              <SpeedInsights />
              {!isAdminPage && <Header />}
              <main className="main-content">
                <Component {...pageProps} />
              </main>
              {!isAdminPage && <Footer />}
            </div>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </>
  )
}
