import { useEffect, useState } from 'react'
import { FiArrowUpRight } from 'react-icons/fi'
import { useLanguage } from '../../context/LanguageContext'
import { safeFetch } from '../../utils/fetchUtils'

// 비짓제주 테마여행. 철에 맞는 글을 /api/jeju-themes가 골라 준다. 원문은 비짓제주로 연결한다.
const JejuThemes = () => {
  const { language } = useLanguage()
  const [themes, setThemes] = useState(null)
  const ko = language === 'ko'

  useEffect(() => {
    setThemes(null)
    safeFetch(`/api/jeju-themes?locale=${ko ? 'kr' : 'en'}`, {}, 20000)
      .then(data => setThemes(data.success ? data.items : []))
      .catch(() => setThemes([]))
  }, [ko])

  if (themes && themes.length === 0) return null

  return (
    <section className="section jeju-themes">
      <div className="container">
        <div className="jeju-themes__head">
          <h2 className="section-title">{ko ? '이번 철 제주 테마여행' : 'Jeju themes for this season'}</h2>
          <p className="section-subtitle">
            {ko ? '제주관광공사 비짓제주가 추천하는 여행 이야기' : 'Travel stories recommended by Visit Jeju'}
          </p>
        </div>

        <div className="jeju-themes__grid" aria-busy={!themes}>
          {(themes || Array.from({ length: 6 }, () => null)).map((theme, index) => theme ? (
            <a key={theme.id} href={theme.url} target="_blank" rel="noopener noreferrer" className="jeju-themes__item">
              <div className="jeju-themes__image">
                <img src={theme.image} alt="" loading="lazy" />
              </div>
              <h3>{theme.title}</h3>
              {theme.intro && <p>{theme.intro}</p>}
              <span className="jeju-themes__link">
                {ko ? '비짓제주에서 읽기' : 'Read on Visit Jeju'} <FiArrowUpRight />
              </span>
            </a>
          ) : (
            <div key={index} className="jeju-themes__item jeju-themes__item--skeleton" />
          ))}
        </div>
      </div>
    </section>
  )
}

export default JejuThemes
