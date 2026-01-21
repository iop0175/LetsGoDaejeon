import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowLeft, FiFileText, FiCheck, FiAlertCircle, FiSlash, FiEdit3, FiRefreshCw } from 'react-icons/fi'
import { useLanguage } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'
import './PolicyPage.css'

const TermsPage = () => {
  const { language } = useLanguage()
  const { isDark } = useTheme()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const content = {
    ko: {
      title: '이용약관',
      lastUpdated: '최종 수정일: 2024년 1월 1일',
      intro: '대전으로 서비스 이용약관에 오신 것을 환영합니다. 본 약관은 대전으로(이하 "사이트")가 제공하는 서비스 이용에 관한 조건과 절차, 기타 필요한 사항을 규정합니다.',
      sections: [
        {
          icon: <FiFileText />,
          title: '제1조 (목적)',
          content: `이 약관은 대전으로가 제공하는 대전광역시 관광정보 서비스(이하 "서비스")의 이용에 관한 조건 및 절차, 
사이트와 이용자의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.`
        },
        {
          icon: <FiCheck />,
          title: '제2조 (서비스의 내용)',
          content: `사이트가 제공하는 서비스는 다음과 같습니다.

• 대전광역시 관광지 정보 제공
• 축제 및 행사 정보 제공
• 맛집 및 음식점 정보 제공
• 숙박, 쇼핑, 문화시설 정보 제공
• 지도 기반 위치 서비스
• 기타 대전 관광에 관련된 정보 서비스`
        },
        {
          icon: <FiAlertCircle />,
          title: '제3조 (이용자의 의무)',
          content: `이용자는 다음 행위를 해서는 안 됩니다.

• 타인의 정보 도용
• 사이트에 게시된 정보의 무단 변경
• 사이트가 허용하지 않은 정보의 수집, 저장, 공개
• 서비스 운영을 고의로 방해하는 행위
• 기타 관계 법령에 위배되는 행위`
        },
        {
          icon: <FiSlash />,
          title: '제4조 (면책조항)',
          content: `• 사이트는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력적인 사유로 인한 서비스 중단에 대해 책임을 지지 않습니다.
• 사이트에서 제공하는 정보는 참고용이며, 실제 정보와 다를 수 있습니다.
• 이용자가 사이트에서 얻은 정보로 인해 발생한 손해에 대해 사이트는 책임을 지지 않습니다.
• 관광지, 음식점 등의 운영시간, 가격 등은 실제와 다를 수 있으므로 방문 전 확인을 권장합니다.`
        },
        {
          icon: <FiEdit3 />,
          title: '제5조 (저작권)',
          content: `• 사이트가 작성한 저작물에 대한 저작권은 사이트에 귀속됩니다.
• 이용자는 사이트의 서비스를 이용하여 얻은 정보를 사이트의 사전 승낙 없이 복제, 송신, 출판, 배포, 방송 등의 방법으로 이용하거나 제3자에게 이용하게 하여서는 안 됩니다.
• 단, 공공데이터는 각 데이터 제공처의 이용약관을 따릅니다.`
        },
        {
          icon: <FiRefreshCw />,
          title: '제6조 (약관의 개정)',
          content: `• 사이트는 필요한 경우 약관을 개정할 수 있습니다.
• 약관이 개정되는 경우 사이트는 개정 약관을 공지합니다.
• 개정된 약관은 공지 후 7일이 경과한 날부터 효력이 발생합니다.`
        }
      ],
      backToHome: '홈으로 돌아가기'
    },
    en: {
      title: 'Terms of Service',
      lastUpdated: 'Last Updated: January 1, 2024',
      intro: 'Welcome to To Daejeon\'s Terms of Service. These terms govern your use of the services provided by To Daejeon (hereinafter referred to as "the Site").',
      sections: [
        {
          icon: <FiFileText />,
          title: 'Article 1 (Purpose)',
          content: `These terms define the conditions and procedures for using the Daejeon tourism information service 
provided by To Daejeon, as well as the rights, obligations, and responsibilities of the Site and its users.`
        },
        {
          icon: <FiCheck />,
          title: 'Article 2 (Service Content)',
          content: `The services provided by the Site include:

• Daejeon tourist attraction information
• Festival and event information
• Restaurant and food information
• Accommodation, shopping, and cultural facility information
• Map-based location services
• Other Daejeon tourism-related information services`
        },
        {
          icon: <FiAlertCircle />,
          title: 'Article 3 (User Obligations)',
          content: `Users must not:

• Misappropriate others' information
• Unauthorized modification of information posted on the Site
• Collect, store, or disclose information not permitted by the Site
• Intentionally interfere with service operations
• Engage in activities that violate relevant laws`
        },
        {
          icon: <FiSlash />,
          title: 'Article 4 (Disclaimer)',
          content: `• The Site is not responsible for service interruptions due to force majeure such as natural disasters, war, or telecommunications service interruptions.
• Information provided on the Site is for reference only and may differ from actual information.
• The Site is not responsible for damages resulting from information obtained through the Site.
• Operating hours, prices, etc. of tourist attractions and restaurants may differ from reality, so verification before visiting is recommended.`
        },
        {
          icon: <FiEdit3 />,
          title: 'Article 5 (Copyright)',
          content: `• Copyright for works created by the Site belongs to the Site.
• Users may not reproduce, transmit, publish, distribute, or broadcast information obtained through the Site without prior approval.
• However, public data is subject to the terms of use of each data provider.`
        },
        {
          icon: <FiRefreshCw />,
          title: 'Article 6 (Amendment of Terms)',
          content: `• The Site may amend these terms when necessary.
• When the terms are amended, the Site will announce the revised terms.
• Revised terms take effect 7 days after announcement.`
        }
      ],
      backToHome: 'Back to Home'
    }
  }

  const t = content[language] || content.ko

  return (
    <div className={`policy-page ${isDark ? 'dark-theme' : ''}`}>
      <div className="policy-container">
        <Link to="/" className="back-link">
          <FiArrowLeft />
          <span>{t.backToHome}</span>
        </Link>

        <div className="policy-header">
          <FiFileText className="policy-icon" />
          <h1>{t.title}</h1>
          <p className="last-updated">{t.lastUpdated}</p>
        </div>

        <p className="policy-intro">{t.intro}</p>

        <div className="policy-sections">
          {t.sections.map((section, index) => (
            <div key={index} className="policy-section">
              <div className="section-header">
                {section.icon}
                <h2>{section.title}</h2>
              </div>
              <p className="section-content">{section.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default TermsPage
