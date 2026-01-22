import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowLeft, FiShield, FiUser, FiDatabase, FiLock, FiMail, FiClock } from 'react-icons/fi'
import { useLanguage } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'
import './PolicyPage.css'

const PrivacyPage = () => {
  const { language } = useLanguage()
  const { isDark } = useTheme()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const content = {
    ko: {
      title: '개인정보처리방침',
      lastUpdated: '최종 수정일: 2025년 6월 16일',
      intro: '대전으로(이하 "사이트")는 이용자의 개인정보를 중요시하며, 「개인정보 보호법」을 준수하고 있습니다.',
      sections: [
        {
          icon: <FiDatabase />,
          title: '1. 수집하는 개인정보 항목',
          content: `본 사이트는 최소한의 개인정보만을 수집합니다.

• 필수 수집 항목: 없음 (비로그인 서비스)
• 선택 수집 항목: 이메일 주소 (소셜 로그인 시), 프로필 정보
• 자동 수집 항목: 방문 기록, 접속 IP, 쿠키, 브라우저 정보

본 사이트는 관광 정보 제공을 목적으로 하며, 일반 이용자의 회원가입 없이도 대부분의 서비스를 이용하실 수 있습니다. 나만의 여행 코스 저장/공유 기능은 소셜 로그인을 통해 이용 가능합니다.`
        },
        {
          icon: <FiUser />,
          title: '2. 개인정보의 수집 및 이용 목적',
          content: `수집된 개인정보는 다음의 목적을 위해 활용됩니다.

• 서비스 제공 및 운영
• 나만의 여행 코스 저장 및 공유 기능 제공
• 사이트 이용 통계 분석
• 서비스 개선 및 신규 서비스 개발
• 문의사항 응대`
        },
        {
          icon: <FiClock />,
          title: '3. 개인정보의 보유 및 이용 기간',
          content: `• 방문 기록: 1년간 보관 후 파기
• 관리자 계정 정보: 계정 삭제 시까지
• 관련 법령에 따른 보존 의무가 있는 경우 해당 기간 동안 보관`
        },
        {
          icon: <FiLock />,
          title: '4. 개인정보의 제3자 제공',
          content: `본 사이트는 이용자의 개인정보를 원칙적으로 제3자에게 제공하지 않습니다. 
다만, 다음의 경우에는 예외로 합니다.

• 이용자가 사전에 동의한 경우
• 법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우`
        },
        {
          icon: <FiShield />,
          title: '5. 개인정보의 안전성 확보 조치',
          content: `본 사이트는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.

• 개인정보 암호화
• 해킹 등에 대비한 보안 시스템 운영
• 접근 권한의 제한`
        },
        {
          icon: <FiMail />,
          title: '6. 개인정보 보호책임자',
          content: `개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.

• 담당부서: 관리팀
• 연락처: tour@daejeon.go.kr`
        }
      ],
      backToHome: '홈으로 돌아가기'
    },
    en: {
      title: 'Privacy Policy',
      lastUpdated: 'Last Updated: June 16, 2025',
      intro: 'To Daejeon (hereinafter referred to as "the Site") values the privacy of its users and complies with the Personal Information Protection Act.',
      sections: [
        {
          icon: <FiDatabase />,
          title: '1. Personal Information Collected',
          content: `This site collects only minimal personal information.

• Required: None (No login required for general use)
• Optional: Email address (for social login), profile information
• Automatically collected: Visit logs, IP address, cookies, browser information

This site aims to provide tourism information. Most services are available without registration. Social login is available for saving and sharing personal travel courses.`
        },
        {
          icon: <FiUser />,
          title: '2. Purpose of Collection and Use',
          content: `Collected personal information is used for the following purposes:

• Service provision and operation
• Personal travel course saving and sharing features
• Site usage statistics analysis
• Service improvement and new service development
• Responding to inquiries`
        },
        {
          icon: <FiClock />,
          title: '3. Retention Period',
          content: `• Visit records: Retained for 1 year then destroyed
• Administrator account information: Until account deletion
• Information required to be retained by relevant laws will be kept for the required period`
        },
        {
          icon: <FiLock />,
          title: '4. Disclosure to Third Parties',
          content: `This site does not disclose personal information to third parties in principle.
Exceptions include:

• When the user has given prior consent
• When required by law or when requested by investigative agencies according to procedures prescribed by law`
        },
        {
          icon: <FiShield />,
          title: '5. Security Measures',
          content: `This site takes the following measures to ensure the security of personal information:

• Encryption of personal information
• Security systems against hacking
• Restriction of access rights`
        },
        {
          icon: <FiMail />,
          title: '6. Privacy Officer',
          content: `For inquiries regarding personal information processing:

• Department: Management Team
• Contact: tour@daejeon.go.kr`
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
          <FiShield className="policy-icon" />
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

export default PrivacyPage
