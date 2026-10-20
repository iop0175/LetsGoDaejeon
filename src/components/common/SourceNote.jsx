import { FiBookOpen } from 'react-icons/fi'
import { useLanguage } from '../../context/LanguageContext'

export default function SourceNote({ sources = [], children }) {
  const { language } = useLanguage()
  return (
    <aside className="content-source" aria-label={language === 'ko' ? '자료 출처' : 'Sources'}>
      <div className="content-source__title"><FiBookOpen aria-hidden="true" />{language === 'ko' ? '자료 출처' : 'Sources'}</div>
      <ul>{sources.map(({ name, url }) => <li key={`${name}-${url || ''}`}>{/^https?:\/\//i.test(url || '') ? <a href={url} target="_blank" rel="noopener noreferrer">{name}</a> : name}</li>)}</ul>
      {children && <p>{children}</p>}
      <p>{language === 'ko' ? '운영시간·요금·행사 일정은 변경될 수 있습니다. 방문 전 운영기관의 최신 안내를 확인해 주세요.' : 'Hours, fees and event schedules may change. Check the operator’s latest information before visiting.'}</p>
    </aside>
  )
}
