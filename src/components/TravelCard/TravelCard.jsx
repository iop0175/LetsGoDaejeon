import { memo } from 'react'
import Link from 'next/link'
import { FiMapPin, FiClock, FiArrowRight } from 'react-icons/fi'
import { useLanguage } from '../../context/LanguageContext'
import { generateSlug } from '../../utils/slugUtils'
// CSS는 _app.jsx에서 import

const DEFAULT_IMAGE = '/images/no-image.svg'

const TravelCard = memo(({ id, contentId, title, location, category, image, duration }) => {
  const { t } = useLanguage()

  const handleImageError = (e) => {
    e.target.src = DEFAULT_IMAGE
  }

  // contentId가 있으면 상세 페이지로, 없으면 /travel/id로
  const linkTo = contentId ? `/spot/${generateSlug(title, contentId)}` : `/travel/${id}`

  return (
    <Link href={linkTo} className="travel-card">
      <div className="travel-card-image">
        <img 
          src={image || DEFAULT_IMAGE} 
          alt={title} 
          loading="lazy" 
          onError={handleImageError}
        />
        <span className="travel-card-category">{category}</span>
      </div>
      <div className="travel-card-content">
        <h3 className="travel-card-title">{title}</h3>
        <div className="travel-card-info">
          <span className="info-item">
            <FiMapPin />
            {location}
          </span>
          {duration && (
            <span className="info-item">
              <FiClock />
              {duration}
            </span>
          )}
        </div>
        <span className="travel-card-link">
          {t.common.viewDetails} <FiArrowRight />
        </span>
      </div>
    </Link>
  )
})

TravelCard.displayName = 'TravelCard'

export default TravelCard
