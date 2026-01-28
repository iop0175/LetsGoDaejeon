import Head from 'next/head'
import dynamic from 'next/dynamic'

// 클라이언트 전용 컴포넌트 (로그인 필요)
const ProfilePageContent = dynamic(
  () => import('../src/pages/ProfilePage'),
  { ssr: false, loading: () => <div className="loading-spinner"><div className="spinner"></div></div> }
)

export default function ProfilePage() {
  return (
    <>
      <Head>
        <title>내 프로필 | 대전으로</title>
        <meta name="robots" content="noindex" />
      </Head>

      <ProfilePageContent />
    </>
  )
}
