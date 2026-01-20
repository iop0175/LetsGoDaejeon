import { useState, useEffect } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination, EffectFade } from 'swiper/modules'
import { FiArrowRight } from 'react-icons/fi'
import { useLanguage } from '../../context/LanguageContext'
import { getHeroSlides } from '../../services/dbService'
import { getReliableImageUrl } from '../../utils/imageUtils'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/effect-fade'
import './HeroSection.css'

const HeroSection = () => {
  const { t, language } = useLanguage()
  const [slides, setSlides] = useState([])
  const [loading, setLoading] = useState(true)

  // 기본 슬라이드 (DB에 데이터가 없을 때 사용)
  const defaultSlides = [
    {
      id: 1,
      title_ko: t.hero.slide1.title,
      title_en: t.hero.slide1.title,
      subtitle_ko: t.hero.slide1.subtitle,
      subtitle_en: t.hero.slide1.subtitle,
      description_ko: t.hero.slide1.description,
      description_en: t.hero.slide1.description,
      imageUrl: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=1920&h=1080&fit=crop',
      link: '/travel'
    },
    {
      id: 2,
      title_ko: t.hero.slide2.title,
      title_en: t.hero.slide2.title,
      subtitle_ko: t.hero.slide2.subtitle,
      subtitle_en: t.hero.slide2.subtitle,
      description_ko: t.hero.slide2.description,
      description_en: t.hero.slide2.description,
      imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&h=1080&fit=crop',
      link: '/travel'
    },
    {
      id: 3,
      title_ko: t.hero.slide3.title,
      title_en: t.hero.slide3.title,
      subtitle_ko: t.hero.slide3.subtitle,
      subtitle_en: t.hero.slide3.subtitle,
      description_ko: t.hero.slide3.description,
      description_en: t.hero.slide3.description,
      imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1920&h=1080&fit=crop',
      link: '/food'
    }
  ]

  useEffect(() => {
    const fetchSlides = async () => {
      try {
        const result = await getHeroSlides(true) // 활성화된 슬라이드만 가져오기
        if (result.success && result.items.length > 0) {
          setSlides(result.items)
        } else {
          setSlides(defaultSlides)
        }
      } catch (err) {
        console.error('히어로 슬라이드 로딩 실패:', err)
        setSlides(defaultSlides)
      }
      setLoading(false)
    }

    fetchSlides()
  }, [])

  // 언어에 따른 텍스트 가져오기
  const getLocalizedText = (slide, field) => {
    const langField = `${field}_${language}`
    return slide[langField] || slide[`${field}_ko`] || ''
  }

  if (loading) {
    return (
      <section className="hero hero-loading">
        <div className="loading-spinner"></div>
      </section>
    )
  }

  return (
    <section className="hero">
      <Swiper
        modules={[Autoplay, Pagination, EffectFade]}
        effect="fade"
        pagination={{ clickable: true }}
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        loop={true}
        className="hero-swiper"
      >
        {slides.map((slide) => (
          <SwiperSlide key={slide.id}>
            <div 
              className="hero-slide"
              style={{ backgroundImage: `url(${getReliableImageUrl(slide.imageUrl)})` }}
            >
              <div className="hero-overlay" />
              <div className="hero-content">
                <span className="hero-badge">{getLocalizedText(slide, 'title')}</span>
                <h1 className="hero-title">{getLocalizedText(slide, 'subtitle')}</h1>
                <p className="hero-description">{getLocalizedText(slide, 'description')}</p>
                <a href={slide.link || '/'} className="hero-btn">
                  {t.hero.viewMore}
                  <FiArrowRight />
                </a>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  )
}

export default HeroSection
