import { useEffect } from 'react'
import Head from 'next/head'
import Script from 'next/script'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Noto_Sans_KR } from 'next/font/google'
import { LanguageProvider } from '../src/context/LanguageContext'
import { ThemeProvider } from '../src/context/ThemeContext'
import { AuthProvider } from '../src/context/AuthContext'

// Google Analytics ID
const GA_TRACKING_ID = 'G-610JNHR72K'

// Next.js Font 최적화 - 빌드 시 자동 인라인, FOUT/CLS 최소화
const notoSansKR = Noto_Sans_KR({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-noto-sans-kr',
})

// Header는 클라이언트 전용 (인터랙션 필요)
const Header = dynamic(() => import('../src/components/Header/Header'), { ssr: false })
// Footer는 SSR 활성화 (CLS 방지)
import Footer from '../src/components/Footer/Footer'

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
  
  // canonical URL 생성
  const getCanonicalUrl = () => {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.letsgodaejeon.kr'
    const path = router.asPath.split('?')[0].split('#')[0] // 쿼리스트링, 해시 제거
    return path === '/' ? baseUrl : `${baseUrl}${path}`
  }
  
  useEffect(() => {
    loadKakaoMapSDK(router.pathname)
  }, [router.pathname])
  
  return (
    <>
      {/* Google Analytics - lazyOnload로 초기 로딩 성능 개선 */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
        strategy="lazyOnload"
      />
      <Script id="google-analytics" strategy="lazyOnload">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_TRACKING_ID}', {
            page_path: window.location.pathname,
          });
        `}
      </Script>
      
      {/* 카카오 JavaScript SDK (공유 기능용) - lazyOnload로 초기 성능 개선 */}
      <Script
        src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js"
        integrity="sha384-TiCUE00h649CAMonG018J2ujOgDKW/kVWlChEuu4jK2vxfAAD0eZxzCKakxg55G4"
        crossOrigin="anonymous"
        strategy="lazyOnload"
        onLoad={() => initKakaoSDK()}
      />
      
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="canonical" href={getCanonicalUrl()} />
        <meta name="robots" content="index, follow" />
        {/* LCP 히어로 이미지 preload - fetchpriority=high */}
        {router.pathname === '/' && (
          <link
            rel="preload"
            as="image"
            href="/_next/image?url=%2Fimages%2Fhero%2Fhero-1.webp&w=640&q=75"
            fetchPriority="high"
            type="image/webp"
            imageSrcSet="/_next/image?url=%2Fimages%2Fhero%2Fhero-1.webp&w=640&q=75 640w, /_next/image?url=%2Fimages%2Fhero%2Fhero-1.webp&w=750&q=75 750w, /_next/image?url=%2Fimages%2Fhero%2Fhero-1.webp&w=828&q=75 828w, /_next/image?url=%2Fimages%2Fhero%2Fhero-1.webp&w=1080&q=75 1080w, /_next/image?url=%2Fimages%2Fhero%2Fhero-1.webp&w=1200&q=75 1200w, /_next/image?url=%2Fimages%2Fhero%2Fhero-1.webp&w=1920&q=75 1920w"
            imageSizes="100vw"
          />
        )}
      </Head>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <div className={`app ${notoSansKR.variable}`} style={{ fontFamily: 'var(--font-noto-sans-kr), "Noto Sans KR", -apple-system, BlinkMacSystemFont, sans-serif' }}>
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
