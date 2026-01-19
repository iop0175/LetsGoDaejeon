import { Link } from 'react-router-dom'
import { FiMapPin, FiClock, FiArrowRight } from 'react-icons/fi'
import { useLanguage } from '../../context/LanguageContext'
import './TravelCard.css'

const DEFAULT_IMAGE = '/images/no-image.svg'

const TravelCard = ({ id, title, location, category, image, duration }) => {
  const { t } = useLanguage()

  const handleImageError = (e) => {
    e.target.src = DEFAULT_IMAGE
  }

  return (
    <Link to={`/travel/${id}`} className="travel-card">
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
}

export default TravelCard
