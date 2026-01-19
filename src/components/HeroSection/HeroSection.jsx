import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination, EffectFade } from 'swiper/modules'
import { FiArrowRight } from 'react-icons/fi'
import { useLanguage } from '../../context/LanguageContext'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/effect-fade'
import './HeroSection.css'

const HeroSection = () => {
  const { t } = useLanguage()

  const slides = [
    {
      id: 1,
      title: t.hero.slide1.title,
      subtitle: t.hero.slide1.subtitle,
      description: t.hero.slide1.description,
      image: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=1920&h=1080&fit=crop',
      link: '/travel'
    },
    {
      id: 2,
      title: t.hero.slide2.title,
      subtitle: t.hero.slide2.subtitle,
      description: t.hero.slide2.description,
      image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&h=1080&fit=crop',
      link: '/travel'
    },
    {
      id: 3,
      title: t.hero.slide3.title,
      subtitle: t.hero.slide3.subtitle,
      description: t.hero.slide3.description,
      image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1920&h=1080&fit=crop',
      link: '/food'
    }
  ]

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
              style={{ backgroundImage: `url(${slide.image})` }}
            >
              <div className="hero-overlay" />
              <div className="hero-content">
                <span className="hero-badge">{slide.title}</span>
                <h1 className="hero-title">{slide.subtitle}</h1>
                <p className="hero-description">{slide.description}</p>
                <a href={slide.link} className="hero-btn">
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
