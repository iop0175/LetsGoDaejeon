import { useState, useEffect, memo } from 'react'
import TravelCard from '../TravelCard/TravelCard'
import { FiArrowRight, FiLoader } from 'react-icons/fi'
import { useLanguage } from '../../context/LanguageContext'
import { getTourSpots as getTourSpotsDb } from '../../services/dbService'
import { getReliableImageUrl } from '../../utils/imageUtils'
import './PopularSpots.css'

// 기본 이미지 (이미지 없을 때 사용)
const DEFAULT_IMAGE = '/images/no-image.svg';

// 기본 관광지 데이터 (API 실패 시 폴백)
const defaultSpots = [
  {
    id: 1,
    title: { ko: '대전 엑스포 과학공원', en: 'Daejeon Expo Science Park' },
    location: { ko: '유성구', en: 'Yuseong-gu' },
    category: { ko: '과학/문화', en: 'Science/Culture' },
    image: DEFAULT_IMAGE,
    duration: { ko: '2-3시간', en: '2-3 hours' }
  },
  {
    id: 2,
    title: { ko: '한밭수목원', en: 'Hanbat Arboretum' },
    location: { ko: '서구', en: 'Seo-gu' },
    category: { ko: '자연/공원', en: 'Nature/Parks' },
    image: DEFAULT_IMAGE,
    duration: { ko: '1-2시간', en: '1-2 hours' }
  },
  {
    id: 3,
    title: { ko: '유성온천', en: 'Yuseong Hot Springs' },
    location: { ko: '유성구', en: 'Yuseong-gu' },
    category: { ko: '휴양/온천', en: 'Spa/Hot Springs' },
    image: DEFAULT_IMAGE,
    duration: { ko: '반나절', en: 'Half day' }
  },
  {
    id: 4,
    title: { ko: '대청호 오백리길', en: 'Daecheongho 500-ri Trail' },
    location: { ko: '대덕구', en: 'Daedeok-gu' },
    category: { ko: '자연/트레킹', en: 'Nature/Trekking' },
    image: DEFAULT_IMAGE,
    duration: { ko: '3-4시간', en: '3-4 hours' }
  },
  {
    id: 5,
    title: { ko: '국립중앙과학관', en: 'National Science Museum' },
    location: { ko: '유성구', en: 'Yuseong-gu' },
    category: { ko: '과학/교육', en: 'Science/Education' },
    image: DEFAULT_IMAGE,
    duration: { ko: '2-3시간', en: '2-3 hours' }
  },
  {
    id: 6,
    title: { ko: '보문산', en: 'Bomunsan Mountain' },
    location: { ko: '중구', en: 'Jung-gu' },
    category: { ko: '자연/공원', en: 'Nature/Parks' },
    image: DEFAULT_IMAGE,
    duration: { ko: '1-2시간', en: '1-2 hours' }
  },
  {
    id: 7,
    title: { ko: '뿌리공원', en: 'Ppuri Park' },
    location: { ko: '중구', en: 'Jung-gu' },
    category: { ko: '문화/역사', en: 'Culture/History' },
    image: DEFAULT_IMAGE,
    duration: { ko: '1-2시간', en: '1-2 hours' }
  },
  {
    id: 8,
    title: { ko: '장태산자연휴양림', en: 'Jangtaesan Natural Recreation Forest' },
    location: { ko: '서구', en: 'Seo-gu' },
    category: { ko: '자연/트레킹', en: 'Nature/Trekking' },
    image: DEFAULT_IMAGE,
    duration: { ko: '2-3시간', en: '2-3 hours' }
  }
]

// 주소에서 구 추출
const extractDistrict = (address) => {
  if (!address) return '대전'
  const match = address.match(/대전\s*(시|광역시)?\s*(\S+구)/)
  return match ? match[2] : '대전'
}

const PopularSpots = memo(() => {
  const { language, t } = useLanguage()
  const [spots, setSpots] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSpots()
  }, [])

  const fetchSpots = async () => {
    try {
      // tour_spots에서 관광지(12) 데이터 가져오기 (더 많이 가져와서 랜덤 선택)
      const tourResult = await getTourSpotsDb('12', 1, 30)
      
      if (tourResult.success && tourResult.items.length > 0) {
        // 랜덤으로 섞기
        const shuffled = [...tourResult.items].sort(() => Math.random() - 0.5)
        // 랜덤으로 9개 선택
        const selected = shuffled.slice(0, 9)
        
        const formattedSpots = selected.map((item, idx) => ({
          id: idx + 1,
          contentId: item.content_id,
          title: { ko: item.title, en: item.title },
          location: { ko: extractDistrict(item.addr1), en: extractDistrict(item.addr1) },
          category: { ko: '관광지', en: 'Attraction' },
          image: getReliableImageUrl(item.firstimage || item.firstimage2, DEFAULT_IMAGE),
          duration: { ko: '1-2시간', en: '1-2 hours' },
          summary: item.overview
        }))
        setSpots(formattedSpots)
      } else {
        // tour_spots에 데이터가 없으면 기본 데이터 사용
        setSpots(defaultSpots)
      }
    } catch (error) {
      console.error('관광지 데이터 로드 실패:', error)
      setSpots(defaultSpots)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="popular-spots section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">{t.popularSpots.title}</h2>
          <p className="section-subtitle">{t.popularSpots.subtitle}</p>
        </div>
        {loading ? (
          <div className="spots-loading">
            <FiLoader className="loading-spinner" />
          </div>
        ) : (
          <div className="spots-grid">
            {spots.map((spot) => (
              <TravelCard 
                key={spot.id} 
                id={spot.id}
                contentId={spot.contentId}
                title={spot.title[language] || spot.title.ko}
                location={spot.location[language] || spot.location.ko}
                category={spot.category[language] || spot.category.ko}
                image={spot.image}
                duration={spot.duration[language] || spot.duration.ko}
              />
            ))}
          </div>
        )}
        <div className="section-more">
          <a href="/travel" className="btn btn-secondary">
            {t.popularSpots.viewMore}
            <FiArrowRight />
          </a>
        </div>
      </div>
    </section>
  )
})

PopularSpots.displayName = 'PopularSpots'

export default PopularSpots
