import Link from 'next/link'
import { feeText, hoursText, lotPath } from '../../utils/parkingFormat'

// 주차장 목록. 구 페이지, 주차장 상세, 관광지 상세의 "근처 주차장"이 함께 쓴다.
export default function LotList({ lots, en = false }) {
  return (
    <ul className="pk-list">
      {lots.map((lot) => {
        const meta = [
          lot.category && (en ? (lot.category === '노외' ? 'Off-street' : 'On-street') : lot.category),
          lot.isPublic ? (en ? 'Public' : '공영') : (en ? 'Private' : '민영'),
          lot.totalLot > 0 && (en ? `${lot.totalLot} spaces` : `${lot.totalLot}면`),
          lot.km !== undefined && `${lot.km}km`
        ].filter(Boolean)
        return (
          <li key={lot.id}>
            <Link href={lotPath(lot)}>{lot.name}</Link>
            <span className="pk-meta">{meta.join(' · ')}</span>
            <span className="pk-fee">{feeText(lot, en)}{hoursText(lot, en) ? ` · ${hoursText(lot, en)}` : ''}</span>
            {lot.addr && <span className="pk-addr">{lot.addr}</span>}
          </li>
        )
      })}
    </ul>
  )
}
