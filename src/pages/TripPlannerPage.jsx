import { useState } from 'react'
import Link from 'next/link'
import { 
  FiMapPin, FiCalendar, FiUsers, FiShare2, FiDownload, 
  FiNavigation, FiMap, FiClock, FiHeart, FiArrowRight,
  FiCheck, FiPlus, FiEdit3, FiPrinter
} from 'react-icons/fi'
import { 
  FaBus, FaCar, FaWalking, FaRoute, FaRegLightbulb,
  FaGoogle, FaApple, FaMicrosoft
} from 'react-icons/fa'
import { useLanguage } from '../context/LanguageContext'
// CSS는 pages/_app.jsx에서 import

const TripPlannerPage = () => {
  const { language, t } = useLanguage()
  const [activeFeature, setActiveFeature] = useState(0)

  // 주요 기능 목록
  const features = [
    {
      icon: <FiPlus />,
      title: language === 'ko' ? '장소 추가' : 'Add Places',
      description: language === 'ko' 
        ? '대전의 관광지, 맛집, 카페, 숙소를 검색하고 원클릭으로 일정에 추가하세요.'
        : 'Search for attractions, restaurants, cafes, and accommodations in Daejeon and add them to your itinerary with one click.',
      image: '/images/trip-planner/add-place.svg'
    },
    {
      icon: <FiCalendar />,
      title: language === 'ko' ? '일정 관리' : 'Schedule Management',
      description: language === 'ko'
        ? '드래그앤드롭으로 일정을 자유롭게 조정하세요. 일차별, 시간별로 체계적으로 관리할 수 있습니다.'
        : 'Freely adjust your schedule with drag-and-drop. Manage systematically by day and time.',
      image: '/images/trip-planner/schedule.svg'
    },
    {
      icon: <FiNavigation />,
      title: language === 'ko' ? '경로 안내' : 'Route Guidance',
      description: language === 'ko'
        ? '장소 간 이동 경로와 소요 시간을 자동으로 계산해드립니다. 대중교통, 자가용, 도보 모두 지원!'
        : 'Automatically calculate routes and travel times between places. Public transit, car, and walking supported!',
      image: '/images/trip-planner/route.svg'
    },
    {
      icon: <FiShare2 />,
      title: language === 'ko' ? '공유 & 협업' : 'Share & Collaborate',
      description: language === 'ko'
        ? '친구, 가족과 함께 여행 일정을 만들고 공유하세요. 실시간으로 함께 편집할 수 있습니다.'
        : 'Create and share travel plans with friends and family. Edit together in real-time.',
      image: '/images/trip-planner/share.svg'
    }
  ]

  // 사용 방법 단계
  const steps = [
    {
      number: '01',
      title: language === 'ko' ? '회원가입 / 로그인' : 'Sign Up / Login',
      description: language === 'ko'
        ? '카카오, 구글 계정으로 간편하게 시작하세요.'
        : 'Start easily with Kakao or Google account.'
    },
    {
      number: '02',
      title: language === 'ko' ? '새 여행 만들기' : 'Create New Trip',
      description: language === 'ko'
        ? '여행 이름과 날짜를 입력하고 새 여행을 시작하세요.'
        : 'Enter trip name and dates to start your new trip.'
    },
    {
      number: '03',
      title: language === 'ko' ? '장소 검색 & 추가' : 'Search & Add Places',
      description: language === 'ko'
        ? '원하는 장소를 검색하고 일정에 추가하세요.'
        : 'Search for places and add them to your itinerary.'
    },
    {
      number: '04',
      title: language === 'ko' ? '일정 조정' : 'Adjust Schedule',
      description: language === 'ko'
        ? '드래그앤드롭으로 순서와 시간을 조정하세요.'
        : 'Adjust order and time with drag-and-drop.'
    },
    {
      number: '05',
      title: language === 'ko' ? '공유하기' : 'Share',
      description: language === 'ko'
        ? '완성된 일정을 친구들과 공유하세요!'
        : 'Share your completed itinerary with friends!'
    }
  ]

  // 지원 기능 목록
  const supportedFeatures = [
    { icon: <FaBus />, text: language === 'ko' ? '대중교통 경로' : 'Public Transit Routes' },
    { icon: <FaCar />, text: language === 'ko' ? '자동차 경로' : 'Driving Routes' },
    { icon: <FaWalking />, text: language === 'ko' ? '도보 경로' : 'Walking Routes' },
    { icon: <FiMap />, text: language === 'ko' ? '지도 보기' : 'Map View' },
    { icon: <FiClock />, text: language === 'ko' ? '소요 시간 계산' : 'Travel Time Calculation' },
    { icon: <FiUsers />, text: language === 'ko' ? '협업 편집' : 'Collaborative Editing' },
    { icon: <FiDownload />, text: language === 'ko' ? '일정 내보내기' : 'Export Itinerary' },
    { icon: <FiPrinter />, text: language === 'ko' ? '인쇄용 보기' : 'Print View' },
  ]

  // FAQ 목록
  const faqs = [
    {
      q: language === 'ko' ? '무료로 사용할 수 있나요?' : 'Is it free to use?',
      a: language === 'ko' 
        ? '네! 대전으로의 여행 플래너는 완전 무료입니다. 회원가입 후 바로 사용하실 수 있습니다.'
        : 'Yes! The trip planner is completely free. You can use it right after signing up.'
    },
    {
      q: language === 'ko' ? '몇 개의 일정을 만들 수 있나요?' : 'How many trips can I create?',
      a: language === 'ko'
        ? '제한 없이 원하는 만큼 여행 일정을 만들 수 있습니다.'
        : 'You can create as many trip itineraries as you want without any limit.'
    },
    {
      q: language === 'ko' ? '다른 사람과 공유할 수 있나요?' : 'Can I share with others?',
      a: language === 'ko'
        ? '네! 일정을 공개로 설정하면 링크를 통해 누구나 볼 수 있고, 초대 코드로 함께 편집할 수도 있습니다.'
        : 'Yes! Set your trip to public to share via link, or use invite codes for collaborative editing.'
    },
    {
      q: language === 'ko' ? '모바일에서도 사용 가능한가요?' : 'Can I use it on mobile?',
      a: language === 'ko'
        ? '물론이죠! 모바일 브라우저에서도 최적화되어 있어 어디서든 편리하게 사용할 수 있습니다.'
        : 'Of course! It\'s optimized for mobile browsers so you can use it conveniently anywhere.'
    }
  ]

  return (
    <div className="trip-planner-page">
      {/* 히어로 섹션 */}
      <section className="planner-hero">
        <div className="container">
          <div className="hero-content">
            <h1>
              {language === 'ko' 
                ? <>나만의 <span className="highlight">대전 여행</span>을<br />쉽게 계획하세요</>
                : <>Plan Your <span className="highlight">Daejeon Trip</span><br />Easily</>
              }
            </h1>
            <p className="hero-subtitle">
              {language === 'ko'
                ? '대전의 인기 관광지, 맛집, 문화시설을 한눈에 보고 드래그앤드롭으로 나만의 여행 코스를 완성하세요.'
                : 'View popular attractions, restaurants, and cultural facilities in Daejeon at a glance and complete your own travel course with drag-and-drop.'
              }
            </p>
            <div className="hero-cta">
              <Link href="/my-trip" className="btn-primary">
                <FiPlus />
                {language === 'ko' ? '지금 시작하기' : 'Start Now'}
              </Link>
              <Link href="/shared-trips" className="btn-secondary">
                <FiHeart />
                {language === 'ko' ? '인기 여행 코스 보기' : 'View Popular Trips'}
              </Link>
            </div>
          </div>
          <div className="hero-visual">
            <div className="demo-card">
              <div className="demo-header">
                <span className="demo-dot red"></span>
                <span className="demo-dot yellow"></span>
                <span className="demo-dot green"></span>
              </div>
              <div className="demo-content">
                <div className="demo-trip-title">🗓️ 대전 2박 3일</div>
                <div className="demo-day">Day 1</div>
                <div className="demo-place">
                  <span className="place-num">1</span>
                  <span className="place-name">엑스포과학공원</span>
                </div>
                <div className="demo-place">
                  <span className="place-num">2</span>
                  <span className="place-name">대전 성심당 본점</span>
                </div>
                <div className="demo-place">
                  <span className="place-num">3</span>
                  <span className="place-name">한밭수목원</span>
                </div>
                <div className="demo-add">
                  <FiPlus /> 장소 추가
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 주요 기능 섹션 */}
      <section className="planner-features">
        <div className="container">
          <h2 className="section-title">
            {language === 'ko' ? '주요 기능' : 'Key Features'}
          </h2>
          <div className="features-grid">
            {features.map((feature, idx) => (
              <div 
                key={idx} 
                className={`feature-card ${activeFeature === idx ? 'active' : ''}`}
                onMouseEnter={() => setActiveFeature(idx)}
              >
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 사용 방법 섹션 */}
      <section className="planner-steps">
        <div className="container">
          <h2 className="section-title">
            {language === 'ko' ? '이렇게 사용하세요' : 'How to Use'}
          </h2>
          <div className="steps-timeline">
            {steps.map((step, idx) => (
              <div key={idx} className="step-item">
                <div className="step-number">{step.number}</div>
                <div className="step-content">
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 지원 기능 섹션 */}
      <section className="planner-supported">
        <div className="container">
          <h2 className="section-title">
            {language === 'ko' ? '이런 것들이 가능해요' : 'What You Can Do'}
          </h2>
          <div className="supported-grid">
            {supportedFeatures.map((item, idx) => (
              <div key={idx} className="supported-item">
                <span className="supported-icon">{item.icon}</span>
                <span className="supported-text">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 추천 코스 미리보기 */}
      <section className="planner-preview">
        <div className="container">
          <h2 className="section-title">
            {language === 'ko' ? '다른 여행자들의 코스' : 'Trips by Other Travelers'}
          </h2>
          <p className="section-subtitle">
            {language === 'ko'
              ? '다른 여행자들이 공유한 대전 여행 코스를 참고해보세요.'
              : 'Check out Daejeon travel courses shared by other travelers.'
            }
          </p>
          <div className="preview-cta">
            <Link href="/shared-trips" className="btn-outline">
              {language === 'ko' ? '공유된 여행 코스 보기' : 'View Shared Trips'}
              <FiArrowRight />
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ 섹션 */}
      <section className="planner-faq">
        <div className="container">
          <h2 className="section-title">
            {language === 'ko' ? '자주 묻는 질문' : 'FAQ'}
          </h2>
          <div className="faq-list">
            {faqs.map((faq, idx) => (
              <div key={idx} className="faq-item">
                <h3 className="faq-question">
                  <FaRegLightbulb />
                  {faq.q}
                </h3>
                <p className="faq-answer">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 최종 CTA 섹션 */}
      <section className="planner-final-cta">
        <div className="container">
          <h2>
            {language === 'ko' 
              ? '지금 바로 나만의 대전 여행을 계획해보세요!'
              : 'Start planning your Daejeon trip now!'
            }
          </h2>
          <p>
            {language === 'ko'
              ? '무료로, 쉽게, 빠르게!'
              : 'Free, Easy, Fast!'
            }
          </p>
          <Link href="/my-trip" className="btn-primary large">
            <FiPlus />
            {language === 'ko' ? '여행 계획 시작하기' : 'Start Planning'}
          </Link>
        </div>
      </section>

      {/* SEO용 텍스트 콘텐츠 섹션 */}
      <section className="planner-seo-content">
        <div className="container">
          <h2>대전 여행 플래너로 완벽한 대전 여행을 계획하세요</h2>
          
          <article>
            <h3>대전 여행 계획, 이제 쉽게 만들 수 있습니다</h3>
            <p>
              대전으로(Let's Go Daejeon)의 여행 플래너는 대전 여행을 계획하는 가장 쉬운 방법입니다. 
              대전의 인기 관광지인 엑스포과학공원, 국립중앙과학관, 한밭수목원부터 
              성심당, 대전 맛집, 카페까지 모든 장소를 검색하고 일정에 추가할 수 있습니다.
            </p>
          </article>
          
          <article>
            <h3>드래그앤드롭으로 쉽게 일정 관리</h3>
            <p>
              복잡한 여행 계획도 드래그앤드롭으로 간단하게! 
              장소의 순서를 바꾸고, 일차별로 정리하고, 방문 시간을 설정하세요. 
              대전 1박 2일, 2박 3일, 당일치기 여행 모두 쉽게 계획할 수 있습니다.
            </p>
          </article>
          
          <article>
            <h3>이동 경로와 시간을 자동으로 계산</h3>
            <p>
              장소 간 이동 경로와 소요 시간을 자동으로 계산해드립니다. 
              대전 시내버스, 지하철(대전 도시철도), 자가용 이동 시간을 확인하고 
              효율적인 여행 코스를 만들어보세요.
            </p>
          </article>
          
          <article>
            <h3>친구, 가족과 함께 여행 계획하기</h3>
            <p>
              여행은 함께할 때 더 즐겁습니다. 
              초대 코드로 친구나 가족을 초대하고 함께 여행 일정을 만들어보세요. 
              완성된 일정은 링크로 공유하거나 인쇄해서 가져갈 수 있습니다.
            </p>
          </article>
          
          <div className="seo-keywords">
            <p>
              <strong>관련 키워드:</strong> 대전 여행 계획, 대전 일정 만들기, 대전 여행 플래너, 
              대전 관광 코스, 대전 가볼만한곳, 대전 맛집 코스, 대전 데이트 코스, 
              대전 가족 여행, 대전 당일치기, 대전 2박3일 여행
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default TripPlannerPage
