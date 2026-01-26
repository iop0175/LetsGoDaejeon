import { memo } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import './LicenseBadge.css'

/**
 * 공공누리 저작권 라이선스 배지 컴포넌트
 * @param {Object} props
 * @param {string} props.type - 라이선스 유형 (1, 2, 3, 4, '1+3', 'kcisa', 'kto', 'daejeon')
 * @param {string} props.source - 출처 텍스트 (선택)
 */
const LicenseBadge = memo(({ type = '1', source = null }) => {
  const { language } = useLanguage()

  // 공공누리 유형별 정보 (로컬 이미지 사용)
  const koglTypes = {
    '1': {
      image: '/images/license/kogl-type1.png',
      name: { ko: '공공누리 제1유형: 출처표시', en: 'KOGL Type 1: Attribution' },
      link: 'https://www.kogl.or.kr/info/license.do#702'
    },
    '2': {
      image: '/images/license/kogl-type2.png',
      name: { ko: '공공누리 제2유형: 출처표시+상업적 이용금지', en: 'KOGL Type 2: Attribution + NonCommercial' },
      link: 'https://www.kogl.or.kr/info/license.do#702'
    },
    '3': {
      image: '/images/license/kogl-type3.png',
      name: { ko: '공공누리 제3유형: 출처표시+변경금지', en: 'KOGL Type 3: Attribution + NoDerivatives' },
      link: 'https://www.kogl.or.kr/info/license.do#702'
    },
    '4': {
      image: '/images/license/kogl-type4.png',
      name: { ko: '공공누리 제4유형: 출처표시+상업적 이용금지+변경금지', en: 'KOGL Type 4: Attribution + NonCommercial + NoDerivatives' },
      link: 'https://www.kogl.or.kr/info/license.do#702'
    },
    '1+3': {
      // 한국관광공사 TourAPI - 1유형과 3유형 혼합 제공
      images: ['/images/license/kogl-type1.png', '/images/license/kogl-type3.png'],
      name: { ko: '공공누리 제1유형/제3유형', en: 'KOGL Type 1/Type 3' },
      link: 'https://www.kogl.or.kr/info/license.do#702'
    }
  }

  // 특수 출처별 설정
  const sourceConfigs = {
    'kto': { // 한국관광공사 - 1유형과 3유형 혼합 제공
      type: '1+3',
      sourceText: { ko: '한국관광공사', en: 'Korea Tourism Organization' }
    },
    'kcisa': { // 문화정보원
      type: '1',
      sourceText: { ko: '문화정보원(KCISA)', en: 'KCISA' }
    },
    'daejeon': { // 대전시
      type: '1',
      sourceText: { ko: '대전광역시', en: 'Daejeon Metropolitan City' }
    }
  }

  // type이 특수 출처인 경우 처리
  let koglType = type
  let sourceText = source
  
  if (sourceConfigs[type]) {
    koglType = sourceConfigs[type].type
    sourceText = sourceText || sourceConfigs[type].sourceText[language]
  }

  const kogl = koglTypes[koglType] || koglTypes['1']

  // 다중 이미지 유형인 경우 (예: 1+3)
  if (kogl.images) {
    return (
      <div className="license-badge license-badge-multi">
        <a 
          href={kogl.link}
          target="_blank" 
          rel="noopener noreferrer"
          className="kogl-link"
          title={kogl.name[language]}
        >
          <div className="kogl-images">
            {kogl.images.map((img, idx) => (
              <img 
                key={idx}
                src={img}
                alt={`KOGL Type ${idx + 1}`}
                className="kogl-image"
              />
            ))}
          </div>
          <span className="license-text">
            {kogl.name[language]}
            {sourceText && <span className="license-source"> ({sourceText})</span>}
          </span>
        </a>
      </div>
    )
  }

  return (
    <div className="license-badge">
      <a 
        href={kogl.link}
        target="_blank" 
        rel="noopener noreferrer"
        className="kogl-link"
        title={kogl.name[language]}
      >
        <img 
          src={kogl.image}
          alt={kogl.name[language]}
          className="kogl-image"
        />
        <span className="license-text">
          {kogl.name[language]}
          {sourceText && <span className="license-source"> ({sourceText})</span>}
        </span>
      </a>
    </div>
  )
})

LicenseBadge.displayName = 'LicenseBadge'

export default LicenseBadge
