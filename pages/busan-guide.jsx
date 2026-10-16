import SeoHead from '../src/components/common/SeoHead'
import BusanGuides from '../src/components/BusanDistricts/BusanGuides'
import { CITY } from '../src/config/cities'
import { useLanguage } from '../src/context/LanguageContext'

export default function BusanGuidePage() {
  const { language } = useLanguage()
  const title = language === 'ko' ? '부산 공식 추천여행과 맛집' : 'Official Busan travel and food guide'
  return <>
    <SeoHead
      title={`${title} | ${language === 'ko' ? CITY.name : CITY.englishName}`}
      description={language === 'ko' ? '부산 공식 추천여행 이야기와 맛집을 모아 소개합니다. 골목, 시장, 해변과 부산다운 한 끼를 만나보세요.' : 'Official Busan travel stories and food guides: alleys, markets, beaches and the taste of Busan.'}
      path="/busan-guide"
    />
    <div className="travel-hero"><div className="container"><h1>{title}</h1><p>{language === 'ko' ? '골목의 이야기부터 부산다운 한 끼까지' : 'Local stories and the taste of Busan'}</p></div></div>
    <BusanGuides full />
  </>
}

export function getServerSideProps() {
  return CITY.key === 'busan' ? { props: {} } : { notFound: true }
}
