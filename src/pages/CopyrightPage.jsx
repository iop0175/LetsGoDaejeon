import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowLeft, FiCopy, FiImage, FiCode, FiExternalLink, FiAlertTriangle, FiMail } from 'react-icons/fi'
import { useLanguage } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'
import './PolicyPage.css'

const CopyrightPage = () => {
  const { language } = useLanguage()
  const { isDarkMode } = useTheme()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const content = {
    ko: {
      title: '저작권 정책',
      lastUpdated: '최종 수정일: 2024년 1월 1일',
      intro: '대전으로는 저작권법 및 관련 법령을 준수하며, 콘텐츠의 적법한 이용을 위해 노력하고 있습니다. 본 페이지는 사이트에서 사용되는 데이터 및 콘텐츠의 저작권에 관한 정보를 안내합니다.',
      sections: [
        {
          icon: <FiCopy />,
          title: '공공데이터 이용',
          content: `본 사이트에서 제공하는 관광정보의 상당 부분은 공공데이터포털을 통해 제공받은 정보입니다.

• 대전광역시 공공데이터
  - 라이선스: 공공누리 제1유형 (출처표시)
  - 출처 표시 시 자유로운 이용 가능 (상업적 이용 포함)
  - 출처: 대전광역시 공공데이터포털

• 한국관광공사 Tour API
  - 한국관광공사에서 제공하는 관광정보 API
  - 이용조건: 한국관광공사 오픈API 이용약관에 따름
  - 출처: 한국관광공사`
        },
        {
          icon: <FiImage />,
          title: '이미지 저작권',
          content: `• 한국관광공사 Photo API를 통해 제공되는 이미지는 각 사진별로 저작권자가 다를 수 있습니다.
• 이미지의 상업적 이용 시 반드시 원작자 표시가 필요합니다.
• 각 이미지의 출처와 저작권 정보는 해당 이미지와 함께 표시됩니다.
• 일부 이미지는 별도의 이용 허락이 필요할 수 있습니다.`
        },
        {
          icon: <FiCode />,
          title: '지도 서비스',
          content: `• 본 사이트의 지도 서비스는 카카오맵 API를 사용합니다.
• 카카오맵의 저작권은 (주)카카오에 있습니다.
• 지도 이용 시 카카오맵 이용약관을 준수해야 합니다.
• 지도 데이터의 무단 복제, 배포는 금지됩니다.`
        },
        {
          icon: <FiExternalLink />,
          title: '제3자 콘텐츠',
          content: `• 외부 사이트로의 링크가 포함될 수 있으며, 해당 사이트의 콘텐츠는 각 사이트의 저작권 정책을 따릅니다.
• 사용자가 제공한 리뷰, 사진 등의 콘텐츠는 해당 사용자에게 저작권이 있습니다.
• 제3자의 저작물을 발견하신 경우 아래 연락처로 알려주시기 바랍니다.`
        },
        {
          icon: <FiAlertTriangle />,
          title: '저작권 침해 신고',
          content: `저작권 침해 사실을 발견하신 경우 아래 정보와 함께 연락해 주시기 바랍니다.

• 침해 콘텐츠의 위치 (URL)
• 저작권자임을 증명하는 자료
• 연락처 정보
• 침해 사실에 대한 설명

정당한 저작권 침해 신고 접수 시 신속히 조치하겠습니다.`
        },
        {
          icon: <FiMail />,
          title: '문의',
          content: `저작권 관련 문의사항이 있으시면 아래로 연락해 주세요.

• 이메일: copyright@letsgodaejeon.com
• 처리 기간: 영업일 기준 7일 이내`
        }
      ],
      dataSourceSection: {
        title: '데이터 출처 목록',
        sources: [
          {
            name: '대전광역시 공공데이터포털',
            url: 'https://data.daejeon.go.kr',
            license: '공공누리 제1유형'
          },
          {
            name: '한국관광공사 Tour API',
            url: 'https://api.visitkorea.or.kr',
            license: '한국관광공사 오픈API 이용약관'
          },
          {
            name: '카카오맵 API',
            url: 'https://developers.kakao.com',
            license: '카카오 API 이용약관'
          }
        ]
      },
      backToHome: '홈으로 돌아가기'
    },
    en: {
      title: 'Copyright Policy',
      lastUpdated: 'Last Updated: January 1, 2024',
      intro: 'To Daejeon complies with copyright laws and related regulations, and strives for the lawful use of content. This page provides information about the copyright of data and content used on this site.',
      sections: [
        {
          icon: <FiCopy />,
          title: 'Public Data Usage',
          content: `A significant portion of the tourism information provided on this site comes from public data portals.

• Daejeon Metropolitan City Public Data
  - License: KOGL Type 1 (Attribution)
  - Free use with attribution (including commercial use)
  - Source: Daejeon Metropolitan City Open Data Portal

• Korea Tourism Organization Tour API
  - Tourism information API provided by Korea Tourism Organization
  - Terms: Subject to KTO Open API Terms of Use
  - Source: Korea Tourism Organization`
        },
        {
          icon: <FiImage />,
          title: 'Image Copyright',
          content: `• Images provided through the Korea Tourism Organization Photo API may have different copyright holders.
• Commercial use of images requires proper attribution to original creators.
• Source and copyright information is displayed with each image.
• Some images may require separate permission for use.`
        },
        {
          icon: <FiCode />,
          title: 'Map Service',
          content: `• The map service on this site uses Kakao Maps API.
• Copyright for Kakao Maps belongs to Kakao Corp.
• Use of maps must comply with Kakao Maps Terms of Service.
• Unauthorized reproduction or distribution of map data is prohibited.`
        },
        {
          icon: <FiExternalLink />,
          title: 'Third-Party Content',
          content: `• Links to external sites may be included, and content on those sites follows their respective copyright policies.
• User-provided content such as reviews and photos are copyrighted by the respective users.
• If you discover third-party copyrighted material, please contact us using the information below.`
        },
        {
          icon: <FiAlertTriangle />,
          title: 'Copyright Infringement Report',
          content: `If you discover copyright infringement, please contact us with the following information:

• Location (URL) of infringing content
• Documentation proving copyright ownership
• Contact information
• Description of the infringement

We will take prompt action upon receiving a valid copyright infringement report.`
        },
        {
          icon: <FiMail />,
          title: 'Contact',
          content: `For copyright-related inquiries, please contact:

• Email: copyright@letsgodaejeon.com
• Processing time: Within 7 business days`
        }
      ],
      dataSourceSection: {
        title: 'Data Source List',
        sources: [
          {
            name: 'Daejeon Metropolitan City Open Data Portal',
            url: 'https://data.daejeon.go.kr',
            license: 'KOGL Type 1'
          },
          {
            name: 'Korea Tourism Organization Tour API',
            url: 'https://api.visitkorea.or.kr',
            license: 'KTO Open API Terms'
          },
          {
            name: 'Kakao Maps API',
            url: 'https://developers.kakao.com',
            license: 'Kakao API Terms'
          }
        ]
      },
      backToHome: 'Back to Home'
    }
  }

  const t = content[language] || content.ko

  return (
    <div className={`policy-page ${isDarkMode ? 'dark-theme' : ''}`}>
      <div className="policy-container">
        <Link to="/" className="back-link">
          <FiArrowLeft />
          <span>{t.backToHome}</span>
        </Link>

        <div className="policy-header">
          <FiCopy className="policy-icon" />
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

        {/* Data Source Table */}
        <div className="data-source-section">
          <h2>{t.dataSourceSection.title}</h2>
          <table className="source-table">
            <thead>
              <tr>
                <th>{language === 'ko' ? '데이터 출처' : 'Data Source'}</th>
                <th>{language === 'ko' ? '라이선스' : 'License'}</th>
                <th>{language === 'ko' ? '링크' : 'Link'}</th>
              </tr>
            </thead>
            <tbody>
              {t.dataSourceSection.sources.map((source, index) => (
                <tr key={index}>
                  <td>{source.name}</td>
                  <td>{source.license}</td>
                  <td>
                    <a href={source.url} target="_blank" rel="noopener noreferrer">
                      <FiExternalLink />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default CopyrightPage
