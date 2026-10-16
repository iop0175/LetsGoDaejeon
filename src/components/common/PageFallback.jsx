import { createContext, useContext } from 'react'
import Link from 'next/link'

// 클라이언트에서만 그려지는 페이지가 로딩되는 동안(그리고 서버가 만든 HTML 안에서) 보여 줄 실제 내용.
// 검색 로봇이 제목, 설명, 장소 링크를 JS 없이 읽을 수 있게 한다.
export const FallbackContext = createContext(null)

export default function PageFallback({ h1, intro, image, imageAlt, details = [], items = [], links = [] }) {
  return (
    <section className="page-fallback">
      <div className="container">
        {h1 && <h1>{h1}</h1>}
        {image && <img className="page-fallback__image" src={image} alt={imageAlt || h1 || ''} />}
        {intro && <p className="page-fallback__intro">{intro}</p>}
        {details.length > 0 && (
          <dl className="page-fallback__details">
            {details.map((row) => (
              <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>
            ))}
          </dl>
        )}
        {items.length > 0 && (
          <ul className="page-fallback__list">
            {items.map((item) => (
              <li key={item.path || item.name}>
                {item.path ? <Link href={item.path}>{item.name}</Link> : <strong>{item.name}</strong>}
                {item.period && <span className="page-fallback__sub"> · {item.period}</span>}
                {item.sub && <span className="page-fallback__sub"> · {item.sub}</span>}
              </li>
            ))}
          </ul>
        )}
        {links.length > 0 && (
          <ul className="page-fallback__list">
            {links.map((link) => (
              <li key={link.path}><Link href={link.path}>{link.name}</Link></li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

// next/dynamic의 loading 자리에 쓴다. 페이지가 FallbackContext로 내용을 넘긴다.
export function FallbackLoading() {
  const value = useContext(FallbackContext)
  if (!value) return <div className="loading-spinner"><div className="spinner"></div></div>
  return <PageFallback {...value} />
}
