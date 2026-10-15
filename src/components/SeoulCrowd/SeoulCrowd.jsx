import { useEffect, useState } from 'react'
import { FiUsers, FiClock } from 'react-icons/fi'
import { useLanguage } from '../../context/LanguageContext'
import { safeFetch } from '../../utils/fetchUtils'

const LEVEL_EN = ['Quiet', 'Moderate', 'Busy', 'Crowded']

// 3천~3천처럼 같은 값이 반복되지 않게, 1만 미만은 천 단위로 보여준다
const formatCount = (count, ko) => ko
  ? (count >= 10000 ? `${(count / 10000).toFixed(1)}만` : `${Math.round(count / 1000)}천`)
  : `${Math.round(count / 1000)}k`

export const formatRange = (min, max, ko) => {
  const [low, high] = [formatCount(min, ko), formatCount(max, ko)]
  const range = low === high ? `${ko ? '약 ' : 'about '}${low}` : `${low}~${high}`
  return ko ? `${range} 명` : `${range} people`
}

// 서울 주요 관광지 실시간 혼잡도. 데이터는 /api/seoul-crowd (서울 실시간 도시데이터)
const SeoulCrowd = () => {
  const { language } = useLanguage()
  const [areas, setAreas] = useState(null)

  useEffect(() => {
    safeFetch('/api/seoul-crowd', {}, 15000)
      .then(data => setAreas(data.success ? data.items : []))
      .catch(() => setAreas([]))
  }, [])

  if (areas && areas.length === 0) return null
  const ko = language === 'ko'
  const updated = areas?.[0]?.time?.slice(11, 16)

  return (
    <section className="section seoul-crowd">
      <div className="container">
        <div className="seoul-crowd__head">
          <div>
            <h2 className="section-title">{ko ? '지금 서울, 얼마나 붐빌까' : 'How busy is Seoul right now'}</h2>
            <p className="section-subtitle">
              {ko ? '주요 관광지의 실시간 인구와 앞으로 3시간 예보' : 'Live crowd levels at major spots, with a 3-hour forecast'}
            </p>
          </div>
          {updated && (
            <span className="seoul-crowd__time"><FiClock /> {ko ? `${updated} 기준` : `As of ${updated}`}</span>
          )}
        </div>

        <ul className="seoul-crowd__list" aria-busy={!areas}>
          {(areas || Array.from({ length: 8 }, () => null)).map((area, index) => (
            <li key={area?.name || index} className="seoul-crowd__item">
              {area ? (
                <>
                  <div className="seoul-crowd__name">{ko ? area.name : area.nameEn}</div>
                  <span className={`seoul-crowd__level seoul-crowd__level--${area.level}`}>
                    {ko ? area.label : LEVEL_EN[area.level]}
                  </span>
                  <div className="seoul-crowd__people">
                    <FiUsers /> {formatRange(area.min, area.max, ko)}
                  </div>
                  <div className="seoul-crowd__forecast" aria-label={ko ? '3시간 예보' : '3-hour forecast'}>
                    {area.forecast.map(slot => (
                      <span key={slot.time} className={`seoul-crowd__dot seoul-crowd__level--${slot.level}`} title={`${slot.time} ${ko ? ['여유', '보통', '약간 붐빔', '붐빔'][slot.level] : LEVEL_EN[slot.level]}`}>
                        {slot.time}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <div className="seoul-crowd__skeleton" />
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default SeoulCrowd
