import Document, { Html, Head, Main, NextScript } from 'next/document'

export default class AppDocument extends Document {
  render() {
    // Next가 로케일 코드(kr)를 그대로 lang에 넣으면 잘못된 언어 코드가 되므로 직접 지정한다
    const lang = this.props.__NEXT_DATA__?.locale === 'en' ? 'en' : 'ko'
    return (
      <Html lang={lang}>
        <Head>
          {/* 기본 메타 태그 */}
          <meta charSet="UTF-8" />
          <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
          <link rel="apple-touch-icon" href="/favicon.svg" />
          <meta name="theme-color" content="#3b82f6" />

          {/* 네이버 사이트 소유 확인 */}
          <meta name="naver-site-verification" content="3dae5e0fb04d30964913bdedff8cea8116f3c850" />
          {process.env.NEXT_PUBLIC_BING_VERIFICATION && (
            <meta name="msvalidate.01" content={process.env.NEXT_PUBLIC_BING_VERIFICATION} />
          )}
          {process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION && (
            <meta name="google-site-verification" content={process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION} />
          )}

          {/* Google AdSense - 사이트 승인 심사가 서버 렌더 HTML을 읽으므로 _app의 next/script 대신 여기에 둠 */}
          <script
            async
            src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8695235492188309"
            crossOrigin="anonymous"
          />

          {/* 카카오맵 SDK preconnect */}
          <link rel="preconnect" href="https://dapi.kakao.com" />
          <link rel="preconnect" href="https://t1.daumcdn.net" />
          <link rel="preconnect" href="https://t1.kakaocdn.net" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}
