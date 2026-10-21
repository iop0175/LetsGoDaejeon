import { useRouter } from 'next/router'

export default function InfoTable({ children }) {
  const { locale } = useRouter()
  const en = locale === 'en'
  return (
    <div className="info-table">
      <p className="info-table__hint">{en ? 'Swipe the table to see all columns' : '표를 좌우로 밀어 전체 정보를 확인하세요'}</p>
      <div className="info-table__scroll" tabIndex={0} role="region" aria-label={en ? 'Scrollable information table' : '좌우로 이동할 수 있는 정보 표'}>
        <table className="bt-table">{children}</table>
      </div>
    </div>
  )
}
