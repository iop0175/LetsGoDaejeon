import Head from 'next/head'
import dynamic from 'next/dynamic'

// 클라이언트 전용 컴포넌트
const CopyrightPageContent = dynamic(
  () => import('../src/pages/CopyrightPage'),
  { ssr: false }
)

export default function CopyrightPage() {
  return (
    <>
      <Head>
        <title>저작권 정보 | 대전으로</title>
        <meta name="description" content="대전으로 서비스 저작권 및 라이선스 정보" />
        <link rel="canonical" href="https://lets-go-daejeon.vercel.app/copyright" />
      </Head>

      <CopyrightPageContent />
    </>
  )
}
