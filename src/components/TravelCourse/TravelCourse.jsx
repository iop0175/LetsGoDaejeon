import { memo } from 'react'
import { FiArrowRight, FiClock } from 'react-icons/fi'
import { useLanguage } from '../../context/LanguageContext'
import './TravelCourse.css'

const courses = [
  {
    id: 1,
    title: { ko: '과학과 자연이 함께하는 대전 1일 코스', en: 'Science & Nature Day Trip' },
    spots: { 
      ko: ['국립중앙과학관', '한밭수목원', '유성온천'],
      en: ['National Science Museum', 'Hanbat Arboretum', 'Yuseong Spa']
    },
    duration: { ko: '1일', en: '1 day' },
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop',
    tag: { ko: '인기', en: 'Popular' }
  },
  {
    id: 2,
    title: { ko: '대전 맛집 투어 코스', en: 'Daejeon Food Tour' },
    spots: { 
      ko: ['성심당', '두부두루치기', '칼국수 골목', '유성 족발골목'],
      en: ['Sungsimdang', 'Dubu Duruchigi', 'Kalguksu Alley', 'Jokbal Alley']
    },
    duration: { ko: '1일', en: '1 day' },
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=400&fit=crop',
    tag: { ko: '미식', en: 'Gourmet' }
  },
  {
    id: 3,
    title: { ko: '대청호와 함께하는 힐링 코스', en: 'Healing at Daecheongho' },
    spots: { 
      ko: ['대청호 오백리길', '대청댐', '식장산'],
      en: ['Daecheongho Trail', 'Daecheong Dam', 'Sikjangsan']
    },
    duration: { ko: '1일', en: '1 day' },
    image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&h=400&fit=crop',
    tag: { ko: '자연', en: 'Nature' }
  }
]

const TravelCourse = memo(() => {
  const { language, t } = useLanguage()

  return (
    <section className="travel-course section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">{t.travelCourse.title}</h2>
          <p className="section-subtitle">{t.travelCourse.subtitle}</p>
        </div>
        
        <div className="course-grid">
          {courses.map((course) => (
            <a key={course.id} href={`/travel/course/${course.id}`} className="course-card">
              <div className="course-image">
                <img src={course.image} alt={course.title[language]} loading="lazy" />
                <span className="course-tag">{course.tag[language]}</span>
              </div>
              <div className="course-content">
                <h3 className="course-title">{course.title[language]}</h3>
                <div className="course-spots">
                  {course.spots[language].map((spot, idx) => (
                    <span key={idx} className="spot-badge">{spot}</span>
                  ))}
                </div>
                <div className="course-footer">
                  <span className="course-duration">
                    <FiClock />
                    {course.duration[language]}
                  </span>
                  <span className="course-link">
                    {t.travelCourse.viewCourse} <FiArrowRight />
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
})

TravelCourse.displayName = 'TravelCourse'

export default TravelCourse
