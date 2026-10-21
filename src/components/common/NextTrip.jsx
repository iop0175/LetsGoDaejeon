import { useEffect, useState } from 'react'
import { CITIES, CITY } from '../../config/cities'
import { useLanguage } from '../../context/LanguageContext'
import { trackEvent } from '../../utils/analytics'

// 도시별 카드 사진, 색, 한 줄 소개. 사진은 모든 도시 배포에 같이 들어 있다.
const LOOK = {
  daejeon: { image: '/images/hero/hero-1.jpg', color: '#0066cc', ko: '과학과 빵의 도시', en: 'Science and bakeries' },
  seoul: { image: '/images/hero/seoul.jpg', color: '#9b303b', ko: '골목과 문화 사이', en: 'Culture around every corner' },
  busan: { image: '/images/hero/busan.jpg', color: '#0b5f9e', ko: '파도 너머의 바다 도시', en: 'Beyond the waves' },
  jeju: { image: '/images/hero/jeju.jpg', color: '#007b77', ko: '바람 따라 섬의 속도로', en: 'At the island’s pace' }
}

const shuffle = (list) => {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export default function NextTrip() {
  const { language } = useLanguage()
  const [cities, setCities] = useState([])
  // 무작위 순서는 서버 HTML과 달라 hydration 오류가 나므로 마운트 뒤에만 정한다
  useEffect(() => { setCities(shuffle(Object.values(CITIES).filter((city) => city.key !== CITY.key))) }, [])
  if (cities.length === 0) return null
  const ko = language === 'ko'
  const prefix = ko ? '/kr' : '/en'
  return (
    <section className="next-trip" aria-label={ko ? '다음 여행지 추천' : 'Next trip ideas'}>
      <h2 className="next-trip__title">{ko ? `다음 여행지는 ${cities[0].cityName} 어때요?` : `How about ${cities[0].cityNameEn} next?`}</h2>
      <div className="next-trip__list">
        {cities.map((city) => {
          const look = LOOK[city.key]
          return (
            <a key={city.key} className="next-trip__card" href={`${city.publicUrl}${prefix}`} style={{ '--next-color': look.color }}
              onClick={() => trackEvent('next_trip_click', { to_city: city.key })}>
              <img src={look.image} alt="" loading="lazy" width="120" height="120" />
              <span><strong>{ko ? city.cityName : city.cityNameEn}</strong><em>{ko ? look[ 'ko' ] : look.en}</em></span>
              <b aria-hidden="true">→</b>
            </a>
          )
        })}
      </div>
    </section>
  )
}
