import { useState, useEffect } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Autoplay } from 'swiper/modules'
import { FiArrowRight, FiArrowLeft, FiCalendar, FiMapPin, FiLoader } from 'react-icons/fi'
import { useLanguage } from '../../context/LanguageContext'
import { getAllDbData } from '../../services/dbService'
import 'swiper/css'
import 'swiper/css/navigation'
import './FestivalSection.css'

// 기본 축제 데이터 (API 실패 시 폴백)
const defaultFestivals = [
  {
    id: 1,
    title: { ko: '대전 사이언스 페스티벌', en: 'Daejeon Science Festival' },
    period: '2026.04.15 - 04.20',
    location: { ko: '엑스포과학공원', en: 'Expo Science Park' },
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&h=500&fit=crop'
  },
  {
    id: 2,
    title: { ko: '대전 빵축제', en: 'Daejeon Bread Festival' },
    period: '2026.05.01 - 05.05',
    location: { ko: '중앙로 일대', en: 'Jungang-ro Area' },
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&h=500&fit=crop'
  },
  {
    id: 3,
    title: { ko: '유성온천 문화축제', en: 'Yuseong Hot Spring Festival' },
    period: '2026.06.10 - 06.15',
    location: { ko: '유성온천 일대', en: 'Yuseong Spa Area' },
    image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=500&fit=crop'
  },
  {
    id: 4,
    title: { ko: '대전 국제 와인 페어', en: 'Daejeon International Wine Fair' },
    period: '2026.09.20 - 09.25',
    location: { ko: '대전컨벤션센터', en: 'Daejeon Convention Center' },
    image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&h=500&fit=crop'
  },
  {
    id: 5,
    title: { ko: '계족산 맨발걷기 대회', en: 'Gyejoksan Barefoot Walking' },
    period: '2026.05.15 - 05.16',
    location: { ko: '계족산 황톳길', en: 'Gyejoksan Yellow Soil Path' },
    image: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800&h=500&fit=crop'
  }
]

// 축제 이미지 매핑
const festivalImages = {
  '국화': 'https://images.unsplash.com/photo-1508610048659-a06b669e3321?w=800&h=500&fit=crop',
  '벚꽃': 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=800&h=500&fit=crop',
  '힐링': 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=500&fit=crop',
  '맨발': 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800&h=500&fit=crop',
  '온천': 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&h=500&fit=crop',
  '효': 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&h=500&fit=crop',
  '뮤직': 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=500&fit=crop',
  '사이언스': 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&h=500&fit=crop',
  '과학': 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&h=500&fit=crop',
  '와인': 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&h=500&fit=crop',
  'default': 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&h=500&fit=crop'
}

const getFestivalImage = (name) => {
  for (const [keyword, imageUrl] of Object.entries(festivalImages)) {
    if (name && name.includes(keyword)) {
      return imageUrl
    }
  }
  return festivalImages.default
}

const FestivalSection = () => {
  const { language, t } = useLanguage()
  const [festivals, setFestivals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFestivals()
  }, [])

  const fetchFestivals = async () => {
    try {
      // DB에서 가져오기
      const dbResult = await getAllDbData('festival');
      if (dbResult.success && dbResult.items.length > 0) {
        const formattedFestivals = dbResult.items.slice(0, 10).map((item, idx) => ({
          id: idx + 1,
          title: { ko: item.festvNm, en: item.festvNm },
          period: item.festvPrid || '',
          location: { ko: item.festvPlcNm || item.festvDtlAddr || '', en: item.festvPlcNm || item.festvDtlAddr || '' },
          image: item.imageUrl || getFestivalImage(item.festvNm),
          summary: item.festvSumm,
          host: item.festvHostNm,
          tel: item.refadNo
        }))
        setFestivals(formattedFestivals)
      } else {
        // DB에 데이터가 없으면 기본 데이터 사용
        setFestivals(defaultFestivals)
      }
    } catch (error) {
      console.error('축제 데이터 로딩 실패:', error)
      setFestivals(defaultFestivals)
    }
    setLoading(false)
  }

  return (
    <section className="festival-section">
      <div className="container">
        <div className="festival-header">
          <div className="festival-title-area">
            <h2 className="section-title">{t.festivalSection.title}</h2>
            <p className="section-subtitle">{t.festivalSection.subtitle}</p>
          </div>
          <div className="festival-nav">
            <button className="nav-btn prev-btn" aria-label="이전">
              <FiArrowLeft />
            </button>
            <button className="nav-btn next-btn" aria-label="다음">
              <FiArrowRight />
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="festival-loading">
            <FiLoader className="loading-spinner" />
          </div>
        ) : (
          <Swiper
            modules={[Navigation, Autoplay]}
            spaceBetween={24}
            slidesPerView={3}
            navigation={{
              prevEl: '.prev-btn',
              nextEl: '.next-btn'
            }}
            autoplay={{ delay: 4000, disableOnInteraction: false }}
            breakpoints={{
              320: { slidesPerView: 1 },
              640: { slidesPerView: 2 },
              1024: { slidesPerView: 3 }
            }}
            className="festival-swiper"
          >
            {festivals.map((festival) => (
              <SwiperSlide key={festival.id}>
                <a href={`/festival`} className="festival-card">
                  <div className="festival-image">
                    <img src={festival.image} alt={festival.title[language] || festival.title.ko} loading="lazy" />
                    <span className="festival-status">{festival.host || t.festivalSection.upcoming}</span>
                  </div>
                  <div className="festival-content">
                    <h3 className="festival-name">{festival.title[language] || festival.title.ko}</h3>
                    <div className="festival-info">
                      {festival.period && (
                        <span className="info-row">
                          <FiCalendar />
                          {festival.period}
                        </span>
                      )}
                      {(festival.location[language] || festival.location.ko) && (
                        <span className="info-row">
                          <FiMapPin />
                          {festival.location[language] || festival.location.ko}
                        </span>
                      )}
                    </div>
                  </div>
                </a>
              </SwiperSlide>
            ))}
          </Swiper>
        )}
        
        <div className="section-more">
          <a href="/festival" className="btn btn-primary">
            {t.festivalSection.viewAll}
            <FiArrowRight />
          </a>
        </div>
      </div>
    </section>
  )
}

export default FestivalSection
