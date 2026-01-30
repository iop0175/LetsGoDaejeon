import { useState, useEffect, memo, useMemo, useCallback } from 'react'
import Image from 'next/image'
import { FiArrowRight, FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { useLanguage } from '../../context/LanguageContext'
import { getHeroSlides } from '../../services/dbService'
import { getReliableImageUrl } from '../../utils/imageUtils'
// CSS는 _app.jsx에서 import

const HeroSection = memo(({ initialSlides = [] }) => {
  const { t, language } = useLanguage()
  const [slides, setSlides] = useState(initialSlides)
  const [loading, setLoading] = useState(initialSlides.length === 0)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // 기본 슬라이드 (DB에 데이터가 없을 때 사용)
  const defaultSlides = useMemo(() => [
    {
      id: 1,
      title_ko: t.hero.slide1.title,
      title_en: t.hero.slide1.title,
      subtitle_ko: t.hero.slide1.subtitle,
      subtitle_en: t.hero.slide1.subtitle,
      description_ko: t.hero.slide1.description,
      description_en: t.hero.slide1.description,
      imageUrl: '/images/hero/hero-1.webp',
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
      imageUrl: '/images/hero/hero-2.webp',
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
      imageUrl: '/images/hero/hero-3.webp',
      link: '/food'
    }
  ], [t])

  useEffect(() => {
    if (initialSlides.length > 0) {
      setLoading(false)
      return
    }
    
    const fetchSlides = async () => {
      try {
        const result = await getHeroSlides(true)
        if (result.success && result.items.length > 0) {
          setSlides(result.items)
        } else {
          setSlides(defaultSlides)
        }
      } catch (err) {
        console.warn('Hero slides fetch error:', err)
        setSlides(defaultSlides)
      }
      setLoading(false)
    }

    fetchSlides()
  }, [defaultSlides, initialSlides])

  // 자동 슬라이드 (5초마다)
  useEffect(() => {
    if (slides.length <= 1) return
    
    const interval = setInterval(() => {
      setIsTransitioning(true)
      setCurrentIndex(prev => (prev + 1) % slides.length)
      setTimeout(() => setIsTransitioning(false), 500)
    }, 5000)

    return () => clearInterval(interval)
  }, [slides.length])

  const goToSlide = useCallback((index) => {
    if (isTransitioning || index === currentIndex) return
    setIsTransitioning(true)
    setCurrentIndex(index)
    setTimeout(() => setIsTransitioning(false), 500)
  }, [isTransitioning, currentIndex])

  const goToPrev = useCallback(() => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setCurrentIndex(prev => (prev - 1 + slides.length) % slides.length)
    setTimeout(() => setIsTransitioning(false), 500)
  }, [isTransitioning, slides.length])

  const goToNext = useCallback(() => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setCurrentIndex(prev => (prev + 1) % slides.length)
    setTimeout(() => setIsTransitioning(false), 500)
  }, [isTransitioning, slides.length])

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

  const activeSlides = slides.length > 0 ? slides : defaultSlides

  return (
    <section className="hero">
      <div className="hero-slider">
        {activeSlides.map((slide, index) => (
          <div 
            key={slide.id}
            className={`hero-slide ${index === currentIndex ? 'active' : ''}`}
            aria-hidden={index !== currentIndex}
          >
            <Image
              src={getReliableImageUrl(slide.imageUrl)}
              alt={getLocalizedText(slide, 'subtitle')}
              fill
              priority={index === 0}
              sizes="100vw"
              style={{ objectFit: 'cover' }}
              quality={85}
            />
            <div className="hero-overlay" />
            <div className="hero-content">
              <span className="hero-badge">{getLocalizedText(slide, 'title')}</span>
              <h2 className="hero-title">{getLocalizedText(slide, 'subtitle')}</h2>
              <p className="hero-description">{getLocalizedText(slide, 'description')}</p>
              <a 
                href={slide.link || '/'} 
                className="hero-btn"
                aria-label={`${getLocalizedText(slide, 'subtitle')} - ${t.hero.viewMore}`}
              >
                {t.hero.viewMore}
                <FiArrowRight />
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* 네비게이션 버튼 */}
      {activeSlides.length > 1 && (
        <>
          <button 
            className="hero-nav hero-nav-prev" 
            onClick={goToPrev}
            aria-label="이전 슬라이드"
          >
            <FiChevronLeft />
          </button>
          <button 
            className="hero-nav hero-nav-next" 
            onClick={goToNext}
            aria-label="다음 슬라이드"
          >
            <FiChevronRight />
          </button>
        </>
      )}

      {/* 페이지네이션 */}
      {activeSlides.length > 1 && (
        <div className="hero-pagination">
          {activeSlides.map((_, index) => (
            <button
              key={index}
              className={`hero-dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
              aria-label={`슬라이드 ${index + 1}로 이동`}
            />
          ))}
        </div>
      )}
    </section>
  )
})

HeroSection.displayName = 'HeroSection'

export default HeroSection
