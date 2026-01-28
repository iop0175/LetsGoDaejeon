import { useState, useEffect, memo } from 'react'
import { FiArrowRight, FiStar, FiLoader } from 'react-icons/fi'
import { useLanguage } from '../../context/LanguageContext'
import { getTourSpots as getTourSpotsDb } from '../../services/dbService'
import { getReliableImageUrl } from '../../utils/imageUtils'
// CSS는 _app.jsx에서 import

// 기본 맛집 데이터 (API 실패 시 폴백)
const defaultFoods = [
  {
    id: 1,
    name: { ko: '성심당', en: 'Sungsimdang Bakery' },
    category: { ko: '베이커리', en: 'Bakery' },
    description: { 
      ko: '대전의 명물! 튀김소보로와 부추빵으로 유명한 전국구 빵집',
      en: 'Famous bakery known for fried soboro and chive bread'
    },
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&h=400&fit=crop',
    location: { ko: '중구 대종로', en: 'Daejong-ro, Jung-gu' }
  },
  {
    id: 2,
    name: { ko: '두부두루치기', en: 'Dubu Duruchigi' },
    category: { ko: '한식', en: 'Korean' },
    description: { 
      ko: '대전 3대 명물 음식! 매콤하고 부드러운 두부두루치기',
      en: 'Daejeon\'s famous spicy stir-fried tofu dish'
    },
    rating: 4.5,
    image: 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=600&h=400&fit=crop',
    location: { ko: '중구 으능정이로', en: 'Eunungjeong-ro, Jung-gu' }
  },
  {
    id: 3,
    name: { ko: '칼국수 골목', en: 'Kalguksu Alley' },
    category: { ko: '한식', en: 'Korean' },
    description: { 
      ko: '구수한 맛의 손칼국수와 수제비로 유명한 맛집 골목',
      en: 'Famous alley for handmade noodles and dough soup'
    },
    rating: 4.6,
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&h=400&fit=crop',
    location: { ko: '동구 판암동', en: 'Panam-dong, Dong-gu' }
  },
  {
    id: 4,
    name: { ko: '유성 족발골목', en: 'Yuseong Jokbal Alley' },
    category: { ko: '한식', en: 'Korean' },
    description: { 
      ko: '쫄깃하고 담백한 족발의 성지, 유성 족발골목',
      en: 'The holy land of chewy and savory pig\'s trotters'
    },
    rating: 4.4,
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop',
    location: { ko: '유성구 봉명동', en: 'Bongmyeong-dong, Yuseong-gu' }
  }
]

// 음식 종류에 따른 이미지 매핑
const foodImages = {
  '빵': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&h=400&fit=crop',
  '베이커리': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&h=400&fit=crop',
  '칼국수': 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&h=400&fit=crop',
  '국수': 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&h=400&fit=crop',
  '두부': 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=600&h=400&fit=crop',
  '족발': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop',
  '고기': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop',
  '삼겹': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop',
  '치킨': 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&h=400&fit=crop',
  '카페': 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=400&fit=crop',
  '커피': 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=400&fit=crop',
  '한식': 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=600&h=400&fit=crop',
  'default': 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop'
}

const getFoodImage = (name, menu) => {
  const searchText = `${name} ${menu || ''}`
  for (const [keyword, imageUrl] of Object.entries(foodImages)) {
    if (searchText.includes(keyword)) {
      return imageUrl
    }
  }
  return foodImages.default
}

// 주소에서 구 추출
const extractDistrict = (address) => {
  if (!address) return '대전'
  const match = address.match(/대전\s*(시|광역시)?\s*(\S+구)/)
  return match ? match[2] : '대전'
}

const FoodSection = memo(() => {
  const { language, t } = useLanguage()
  const [foods, setFoods] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFoods()
  }, [])

  const fetchFoods = async () => {
    try {
      // tour_spots에서 음식점(39) 데이터 가져오기 (더 많이 가져와서 랜덤 선택)
      const tourResult = await getTourSpotsDb('39', 1, 20)
      
      if (tourResult.success && tourResult.items.length > 0) {
        // 랜덤으로 섞기
        const shuffled = [...tourResult.items].sort(() => Math.random() - 0.5)
        // 랜덤으로 4개 선택
        const selected = shuffled.slice(0, 4)
        
        const formattedFoods = selected.map((item, idx) => ({
          id: idx + 1,
          contentId: item.content_id,
          name: { ko: item.title, en: item.title_en || item.title },
          category: { ko: '맛집', en: 'Restaurant' },
          description: { 
            ko: item.overview?.slice(0, 60) || `${item.title}의 맛있는 음식을 즐겨보세요`,
            en: (item.overview_en?.slice(0, 60) || item.overview?.slice(0, 60)) || `Enjoy delicious food at ${item.title_en || item.title}`
          },
          rating: (4 + Math.random() * 0.9).toFixed(1),
          image: getReliableImageUrl(item.firstimage || item.firstimage2, getFoodImage(item.title, '')),
          location: { ko: extractDistrict(item.addr1), en: extractDistrict(item.addr1_en || item.addr1) }
        }))
        setFoods(formattedFoods)
      } else {
        // tour_spots에 데이터가 없으면 기본 데이터 사용
        setFoods(defaultFoods)
      }
    } catch (error) {
      console.error('맛집 데이터 로드 실패:', error)
      setFoods(defaultFoods)
    }
    setLoading(false)
  }

  return (
    <section className="food-section section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">{t.foodSection.title}</h2>
          <p className="section-subtitle">{t.foodSection.subtitle}</p>
        </div>
        
        {loading ? (
          <div className="food-loading">
            <FiLoader className="loading-spinner" />
          </div>
        ) : (
          <div className="food-grid">
            {foods.map((food) => (
              <a key={food.id} href={food.contentId ? `/spot/${food.contentId}` : '/food'} className="food-card">
                <div className="food-image">
                  <img src={food.image} alt={food.name[language] || food.name.ko} loading="lazy" />
                  <div className="food-rating">
                    <FiStar />
                    {food.rating}
                  </div>
                </div>
                <div className="food-content">
                  <div className="food-header">
                    <span className="food-category">{food.category[language] || food.category.ko}</span>
                    <h3 className="food-name">{food.name[language] || food.name.ko}</h3>
                  </div>
                  <p className="food-description">{food.description[language] || food.description.ko}</p>
                  <span className="food-location">{food.location[language] || food.location.ko}</span>
                </div>
              </a>
            ))}
          </div>
        )}
        
        <div className="section-more">
          <a href="/food" className="btn btn-secondary">
            {t.foodSection.viewMore}
            <FiArrowRight />
          </a>
        </div>
      </div>
    </section>
  )
})

FoodSection.displayName = 'FoodSection'

export default FoodSection
