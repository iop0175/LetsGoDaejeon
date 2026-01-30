/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Turbopack 설정 (Next.js 16+)
  turbopack: {},
  
  // 이미지 최적화 설정
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'tong.visitkorea.or.kr',
      },
      {
        protocol: 'https',
        hostname: 'www.daejeon.go.kr',
      },
      {
        protocol: 'https',
        hostname: 'dapi.kakao.com',
      },
      {
        protocol: 'https',
        hostname: 't1.daumcdn.net',
      },
      {
        protocol: 'https',
        hostname: 'letsgodaejeon.kr',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'frqzcjaavws6yb7a.public.blob.vercel-storage.com',
      },
    ],
    unoptimized: false,
  },
  
  // 환경변수 설정 (클라이언트에서 사용할 변수)
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_KAKAO_MAP_KEY: process.env.NEXT_PUBLIC_KAKAO_MAP_KEY,
  },
  
  // 정적 내보내기 옵션 (Vercel 배포 시 자동 처리됨)
  // output: 'export', // 정적 HTML 내보내기 시 활성화
  
  // Trailing slash 설정
  trailingSlash: false,
  
  // 빌드 시 소스맵 비활성화 (프로덕션)
  productionBrowserSourceMaps: false,
  
  // 컴파일러 옵션
  compiler: {
    // 프로덕션에서 console 제거
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // 리다이렉트 설정
  async redirects() {
    return [
      // www 없는 도메인을 www로 리다이렉트
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'letsgodaejeon.kr',
          },
        ],
        destination: 'https://www.letsgodaejeon.kr/:path*',
        permanent: true,
      },
    ]
  },
  
  // 리라이트 설정 (API 프록시 등)
  async rewrites() {
    return []
  },
  
  // 헤더 설정
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
        ],
      },
    ]
  },
  
  // Webpack 설정 (필요시)
  webpack: (config, { isServer }) => {
    // 클라이언트 사이드에서 fs 모듈 무시
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    return config
  },
}

module.exports = nextConfig
