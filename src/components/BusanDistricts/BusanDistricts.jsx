import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '../../context/LanguageContext'
import { safeFetch } from '../../utils/fetchUtils'

const NAMES_EN = {
  강서구: 'Gangseo', 금정구: 'Geumjeong', 기장군: 'Gijang', 남구: 'Nam', 동구: 'Dong', 동래구: 'Dongnae',
  부산진구: 'Busanjin', 북구: 'Buk', 사상구: 'Sasang', 사하구: 'Saha', 서구: 'Seo', 수영구: 'Suyeong',
  연제구: 'Yeonje', 영도구: 'Yeongdo', 중구: 'Jung', 해운대구: 'Haeundae'
}

// 부산은 16개 구·군마다 분위기가 달라 구·군을 여행의 출발점으로 삼는다.
const BusanDistricts = () => {
  const { language } = useLanguage()
  const [districts, setDistricts] = useState(null)
  const ko = language === 'ko'

  useEffect(() => {
    safeFetch('/api/busan-districts', {}, 20000)
      .then(data => setDistricts(data.success ? data.items : []))
      .catch(() => setDistricts([]))
  }, [])

  if (districts && districts.length === 0) return null

  return (
    <section className="section busan-districts">
      <div className="container">
        <div className="busan-districts__head">
          <h2 className="section-title">{ko ? '구·군으로 만나는 부산' : 'Busan, district by district'}</h2>
          <p className="section-subtitle">
            {ko ? '해운대의 파도부터 기장의 바닷가, 영도의 골목까지' : 'From Haeundae’s waves to Gijang’s coast and Yeongdo’s lanes'}
          </p>
        </div>
        <div className="busan-districts__grid" aria-busy={!districts}>
          {(districts || Array.from({ length: 8 }, () => null)).map((district, index) => district ? (
            <Link key={district.name} href={`/travel?district=${encodeURIComponent(district.name)}`} className="busan-districts__item">
              {district.image && <img src={district.image} alt="" loading="lazy" />}
              <span className="busan-districts__shade" />
              <span className="busan-districts__text">
                <strong>{ko ? district.name : NAMES_EN[district.name] || district.name}</strong>
                <span>{ko ? `관광지 ${district.count}곳` : `${district.count} attractions`}</span>
              </span>
            </Link>
          ) : (
            <div key={index} className="busan-districts__item busan-districts__item--skeleton" />
          ))}
        </div>
      </div>
    </section>
  )
}

export default BusanDistricts
