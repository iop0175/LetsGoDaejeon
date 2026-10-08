import Head from 'next/head'
import { FiArrowRight, FiCheckCircle, FiDatabase, FiMapPin, FiTool } from 'react-icons/fi'

const cities = [
  {
    key: 'daejeon',
    name: '대전으로',
    englishName: "Let's Go Daejeon",
    cityName: '대전',
    areaCode: '3',
    route: '/',
    image: '/images/hero/hero-1.webp',
    status: '운영 중',
    nextStep: '현재 기준 사이트'
  },
  {
    key: 'seoul',
    name: '서울으로',
    englishName: "Let's Go Seoul",
    cityName: '서울',
    areaCode: '1',
    route: '/dev-cities?city=seoul',
    image: '/images/hero/hero-2.webp',
    status: '개발 후보',
    nextStep: '주차장/의료/지역 행사 소스 확인'
  },
  {
    key: 'busan',
    name: '부산으로',
    englishName: "Let's Go Busan",
    cityName: '부산',
    areaCode: '6',
    route: '/dev-cities?city=busan',
    image: '/images/hero/hero-3.webp',
    status: '개발 후보',
    nextStep: '해변/축제/교통 특화 데이터 확인'
  },
  {
    key: 'jeju',
    name: '제주로',
    englishName: "Let's Go Jeju",
    cityName: '제주',
    areaCode: '39',
    route: '/dev-cities?city=jeju',
    image: '/images/travel-placeholder.svg',
    status: '개발 후보',
    nextStep: '렌터카/자연관광/숙박 데이터 우선 확인'
  }
]

const sharedApis = [
  ['TourAPI 국문', '관광지, 음식점, 숙박, 쇼핑, 축제', '지역코드만 교체'],
  ['TourAPI 영문', '외국인용 기본 관광 데이터', '지역코드만 교체'],
  ['Kakao Local/Route', '장소 검색, 지오코딩, 길찾기', '전국 사용 가능'],
  ['ODsay', '대중교통 경로', '전국 사용 가능'],
  ['KCISA 공연', '공연/전시', '지역명 필터 확장']
]

const localApis = [
  ['주차장', '현재 대전시 API 의존', '도시별 공공데이터 소스 필요'],
  ['의료기관', '현재 대전시 API 의존', '도시별 공공데이터 소스 필요'],
  ['지역 행사', 'TourAPI로 시작 가능', '지자체 행사 API는 보강용'],
  ['도시별 브랜딩', '문구/SEO/히어로 이미지', '도시 설정 파일로 분리 필요']
]

export default function DevCitiesPage() {
  return (
    <>
      <Head>
        <title>내부 개발용 도시 확장 | 대전으로</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="description" content="서울으로, 부산으로, 제주로 확장 검토용 내부 개발 페이지" />
      </Head>

      <div className="dev-cities-page">
        <section className="dev-cities-hero">
          <div className="dev-cities-hero-copy">
            <span className="dev-badge">Internal Dev</span>
            <h1>도시 확장 개발 보드</h1>
            <p>대전으로 구조를 서울·부산·제주로 넓힐 때 공통으로 재사용할 API와 도시별로 새로 붙일 데이터를 나눠 보는 내부용 페이지입니다.</p>
          </div>
          <div className="dev-cities-summary">
            <div>
              <strong>4</strong>
              <span>도시 후보</span>
            </div>
            <div>
              <strong>5</strong>
              <span>공통 API</span>
            </div>
            <div>
              <strong>2</strong>
              <span>지역별 필수 보강</span>
            </div>
          </div>
        </section>

        <section className="dev-section">
          <div className="dev-section-header">
            <FiMapPin />
            <div>
              <h2>도시별 사이트 후보</h2>
              <p>초기 버전은 TourAPI 지역코드만 바꿔도 관광/맛집/숙박/축제 기본 화면을 만들 수 있습니다.</p>
            </div>
          </div>
          <div className="city-prototype-grid">
            {cities.map((city) => (
              <article className="city-prototype-card" key={city.key}>
                <div className="city-prototype-image">
                  <img src={city.image} alt={`${city.cityName} 개발 후보`} />
                  <span>{city.status}</span>
                </div>
                <div className="city-prototype-content">
                  <h3>{city.name}</h3>
                  <p>{city.englishName}</p>
                  <dl>
                    <div>
                      <dt>TourAPI areaCode</dt>
                      <dd>{city.areaCode}</dd>
                    </div>
                    <div>
                      <dt>다음 확인</dt>
                      <dd>{city.nextStep}</dd>
                    </div>
                  </dl>
                  <a href={city.route}>
                    {city.key === 'daejeon' ? '운영 사이트 보기' : '개발 후보 보기'}
                    <FiArrowRight />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="dev-columns">
          <div className="dev-panel">
            <div className="dev-panel-title">
              <FiCheckCircle />
              <h2>그대로 재사용 가능</h2>
            </div>
            <div className="dev-table">
              {sharedApis.map(([name, scope, note]) => (
                <div className="dev-table-row" key={name}>
                  <strong>{name}</strong>
                  <span>{scope}</span>
                  <em>{note}</em>
                </div>
              ))}
            </div>
          </div>

          <div className="dev-panel">
            <div className="dev-panel-title">
              <FiDatabase />
              <h2>도시별로 보강 필요</h2>
            </div>
            <div className="dev-table">
              {localApis.map(([name, current, need]) => (
                <div className="dev-table-row" key={name}>
                  <strong>{name}</strong>
                  <span>{current}</span>
                  <em>{need}</em>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="dev-section dev-roadmap">
          <div className="dev-section-header">
            <FiTool />
            <div>
              <h2>구현 순서</h2>
              <p>새 API를 먼저 늘리기보다 도시 설정을 먼저 분리하는 쪽이 유지보수에 유리합니다.</p>
            </div>
          </div>
          <ol>
            <li>도시 설정 파일 생성: 이름, 영문명, TourAPI 지역코드, 좌표, SEO 문구</li>
            <li>관광지/맛집/숙박/축제 수집 로직을 `city.areaCode` 기반으로 전환</li>
            <li>도시별 주차장/의료기관 API는 별도 어댑터로 추가</li>
            <li>내부 페이지에서 품질 확인 후 공개 라우트나 별도 도메인으로 분리</li>
          </ol>
        </section>
      </div>
    </>
  )
}
