import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '../../context/LanguageContext'
import { safeFetch } from '../../utils/fetchUtils'

export default function BusanGuides({ full = false }) {
  const { language } = useLanguage()
  const ko = language === 'ko'
  const [type, setType] = useState('themes')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(false)
  const pageSize = full ? 12 : 6

  useEffect(() => {
    let active = true
    setResult(null)
    setError(false)
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ type, q: query, pageNo: page, numOfRows: pageSize })
      safeFetch(`/api/busan-guides?${params}`, {}, 30000).then(data => {
        if (!active) return
        if (!data.success) { setError(true); return }
        setResult(data)
      }).catch(() => { if (active) setError(true) })
    }, 250)
    return () => { active = false; clearTimeout(timer) }
  }, [type, query, page, pageSize])

  return (
    <section className="section busan-guides">
      <div className="container">
        <h2 className="section-title">{ko ? '부산이 들려주는 여행과 한 끼' : 'Busan stories and local tables'}</h2>
        <p className="section-subtitle">{ko ? '부산광역시·비짓부산의 공식 추천입니다. 원문은 한국어로 제공됩니다.' : 'Official recommendations from Busan and Visit Busan. Stories are provided in Korean.'}</p>
        <div className="busan-guides__controls">
          <div role="group" aria-label={ko ? '콘텐츠 종류' : 'Content type'}>
            {['themes', 'food'].map(value => <button key={value} type="button" aria-pressed={type === value} onClick={() => { setType(value); setPage(1) }}>{value === 'themes' ? (ko ? '추천 테마여행' : 'Travel themes') : (ko ? '부산 미식' : 'Local food')}</button>)}
          </div>
          {full ? <input aria-label={ko ? '추천 콘텐츠 검색' : 'Search recommendations'} placeholder={ko ? '구·군, 여행지, 음식 검색' : 'Search district, place or food'} value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} /> : <Link href="/busan-guide">{ko ? '전체 보기' : 'View all'}</Link>}
        </div>
        {error ? <p role="alert">{ko ? '추천 정보를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.' : 'Recommendations are unavailable. Please try again later.'}</p> : (
          <div className="busan-guides__grid" aria-busy={!result}>
            {(result?.items || []).map(item => <article key={item.id} className="busan-guides__card">
              <img src={item.image || '/images/no-image.svg'} alt="" loading="lazy" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/images/no-image.svg' }} />
              <span className="busan-guides__district">{item.district}</span>
              <h3>{item.title}</h3>
              <p>{item.intro}</p>
              <details>
                <summary>{ko ? '여행 정보 펼치기' : 'Show details (Korean)'}</summary>
                <p>{item.description}</p>
                {item.address && <p>{item.address}</p>}
                {item.hours && <p>{item.hours}</p>}
                {item.phone && <p>{item.phone}</p>}
                <a href={item.url} target="_blank" rel="noopener noreferrer">{ko ? '공식 홈페이지' : 'Official website'}</a>
              </details>
            </article>)}
          </div>
        )}
        {!result && !error && <p role="status">{ko ? '공식 추천을 불러오는 중입니다.' : 'Loading official recommendations.'}</p>}
        {result?.totalCount === 0 && <p>{ko ? '검색 결과가 없습니다.' : 'No results.'}</p>}
        {full && result && result.totalCount > pageSize && <nav className="busan-guides__pagination" aria-label={ko ? '추천 콘텐츠 페이지' : 'Recommendation pages'}>
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>{ko ? '이전' : 'Previous'}</button>
          <span>{page} / {Math.ceil(result.totalCount / pageSize)}</span>
          <button disabled={page * pageSize >= result.totalCount} onClick={() => setPage(page + 1)}>{ko ? '다음' : 'Next'}</button>
        </nav>}
      </div>
    </section>
  )
}
