import { useEffect } from 'react'
import Head from 'next/head'
import Script from 'next/script'
import Link from 'next/link'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Noto_Sans_KR, Noto_Serif_KR } from 'next/font/google'
import { LanguageProvider } from '../src/context/LanguageContext'
import { ThemeProvider } from '../src/context/ThemeContext'
import { AuthProvider } from '../src/context/AuthContext'
import { CITY, SITE_URL } from '../src/config/cities'
import { trackEvent, classifyLink } from '../src/utils/analytics'

// Google Analytics ID는 도시별 속성(src/config/cities.js의 gaId)
const GA_TRACKING_ID = CITY.gaId

// Next.js Font 최적화 - CLS 최소화를 위해 optional 사용
const notoSansKR = Noto_Sans_KR({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'optional', // swap → optional: 폰트 로딩 시 CLS 방지
  preload: true,
  variable: '--font-noto-sans-kr',
})

// 서울 제목용 명조. 서울에서만 쓰이므로 preload 하지 않아 다른 도시의 첫 로딩을 늘리지 않는다
const notoSerifKR = Noto_Serif_KR({
  weight: ['600', '700'],
  subsets: ['latin'],
  display: 'swap',
  preload: false,
  variable: '--font-noto-serif-kr',
})

// Header는 서버에서도 그려 메뉴 링크가 첫 HTML에 들어가게 한다
import Header from '../src/components/Header/Header'
// Footer는 SSR 활성화 (CLS 방지)
import Footer from '../src/components/Footer/Footer'

// 전역 CSS (Next.js에서는 _app에서만 import 가능)
import '../src/styles/index.css'
import '../src/styles/App.css'
import '../src/styles/cityThemes.css'
import '../src/styles/contentHub.css'
import '../src/styles/featurePages.css'
import '../src/components/SeoulCrowd/SeoulCrowd.css'
import '../src/components/BusanDistricts/BusanDistricts.css'
import '../src/components/BusanDistricts/BusanGuides.css'
import '../src/components/JejuThemes/JejuThemes.css'

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
import '../src/pages/TripPlannerPage.css'
import '../src/pages/DevCitiesPage.css'
import '../src/styles/contentPresentation.css'
import '../src/styles/travelInfo.css'

// 카카오맵 SDK 동적 로드 - 필요한 페이지에서만 로드
const loadKakaoMapSDK = (pathname) => {
  if (typeof window === 'undefined') return
  if (window.kakao?.maps) return
  
  // 지도가 필요한 페이지에서만 SDK 로드
  const mapPages = ['/map', '/my-trip', '/spot', '/shared-trip', '/trip-planner', '/traffic', '/bus']
  const needsMap = mapPages.some(page => pathname.startsWith(page))
  if (!needsMap) return
  if (document.querySelector('script[src*="dapi.kakao.com/v2/maps/sdk.js"]')) return
  
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
  }, [router.pathname])

  // 길찾기·전화 클릭은 링크 위임으로 한 번에 수집한다
  useEffect(() => {
    const onClick = (e) => {
      const link = e.target instanceof Element ? e.target.closest('a[href]') : null
      const name = link && classifyLink(link.getAttribute('href'))
      if (name) trackEvent(name, { ui_language: router.locale })
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [router.locale])

  // 장소 상세 조회
  useEffect(() => {
    if (router.pathname === '/spot/[slug]') {
      trackEvent('spot_view', { place_type: String(pageProps?.seoData?.contentTypeId || ''), ui_language: router.locale })
    }
  }, [router.asPath]) // eslint-disable-line react-hooks/exhaustive-deps
  
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
        {/* LCP 히어로 이미지 preload - fetchpriority=high */}
        {router.pathname === '/' && CITY.key === 'daejeon' && (
          <link
            rel="preload"
            as="image"
            href="/images/hero/hero-1.webp"
            fetchPriority="high"
            type="image/webp"
          />
        )}
      </Head>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <div data-city={CITY.key} className={`app ${notoSansKR.variable} ${notoSerifKR.variable}`} style={{ fontFamily: 'var(--font-noto-sans-kr), "Noto Sans KR", -apple-system, BlinkMacSystemFont, sans-serif' }}>
              <SpeedInsights />
              {!isAdminPage && <Header />}
              <main className="main-content">
                {CITY.key !== 'daejeon' && [
                  ...(CITY.parkingReady ? [] : ['/parking']),
                  ...(CITY.medicalReady ? [] : ['/medical']),
                  '/my-trip', '/shared-trip', '/shared-trips'
                ].some(path => router.pathname === path || router.pathname.startsWith(`${path}/`)) ? (
                  <>
                    <Head><title>{`${CITY.cityName} 지역 서비스 준비 중 | ${CITY.name}`}</title></Head>
                    <section className="city-service-pending"><h1>{CITY.cityName} 지역 서비스 준비 중</h1><p>지역 데이터 연결과 분리 검증 후 제공됩니다. 다른 도시 데이터는 표시하지 않습니다.</p><Link href="/travel">{CITY.cityName} 관광지 둘러보기</Link></section>
                  </>
                ) : <Component {...pageProps} />}
              </main>
              {!isAdminPage && <Footer />}
            </div>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </>
  )
}
