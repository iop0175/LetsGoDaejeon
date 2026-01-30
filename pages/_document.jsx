import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="ko">
      <Head>
        {/* 기본 메타 태그 */}
        <meta charSet="UTF-8" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
        <meta name="author" content="대전으로" />
        <meta name="theme-color" content="#3b82f6" />
        
        {/* 네이버 사이트 소유 확인 */}
        <meta name="naver-site-verification" content="3dae5e0fb04d30964913bdedff8cea8116f3c850" />
        
        {/* Google Analytics */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-610JNHR72K" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-610JNHR72K');
            `,
          }}
        />
        
        {/* 폰트는 next/font/google에서 자동 최적화됨 (_app.jsx) */}
        
        {/* 카카오맵 SDK preconnect */}
        <link rel="preconnect" href="https://dapi.kakao.com" />
        <link rel="preconnect" href="https://t1.daumcdn.net" />
        <link rel="preconnect" href="https://t1.kakaocdn.net" />
      </Head>
      <body>
        <Main />
        <NextScript />
        
        {/* 카카오 JavaScript SDK (공유 기능용) - defer로 렌더링 차단 방지 */}
        <script 
          defer
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js" 
          integrity="sha384-TiCUE00h649CAMonG018J2ujOgDKW/kVWlChEuu4jK2vxfAAD0eZxzCKakxg55G4" 
          crossOrigin="anonymous"
        />
      </body>
    </Html>
  )
}
