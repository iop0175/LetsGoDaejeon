import Head from 'next/head'
import dynamic from 'next/dynamic'

// 클라이언트 전용 컴포넌트 (관리자 전용)
const AdminPageContent = dynamic(
  () => import('../src/pages/AdminPage'),
  { ssr: false, loading: () => <div className="loading-spinner"><div className="spinner"></div></div> }
)

export default function AdminPage() {
  return (
    <>
      <Head>
        <title>관리자 | 대전으로</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <AdminPageContent />
    </>
  )
}
