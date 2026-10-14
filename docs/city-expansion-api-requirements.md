# 도시 확장 API 필요 목록

작성일: 2026-10-14

대상: `대전으로`를 `서울으로`, `부산으로`, `제주로`처럼 다도시 구조로 확장할 때 필요한 API와 작업 범위.

## 요약

새 도시를 만들 때 API를 처음부터 많이 붙일 필요는 없다.

1차 확장은 기존 공통 API만으로 가능하다.

- TourAPI 국문/영문: 관광지, 문화시설, 레포츠, 숙박, 쇼핑, 음식점
- TourAPI 행사/축제: 축제와 행사
- Kakao Local/Route: 장소 검색, 주소 검색, 길찾기
- ODsay: 대중교통 경로
- KCISA 공연 API: 도시명 문자열 필터로 공연 수집

도시별로 새로 찾아야 하는 것은 생활 정보다.

- 주차장
- 의료기관
- 지역 특화 행사/축제
- 도시별 히어로 이미지, 브랜딩, SEO 보강 데이터

## 도시 설정

우선 API를 추가하기 전에 도시 설정 파일을 만든다.

후보 파일:

```text
src/config/cities.js
```

필수 필드:

```js
{
  key: 'seoul',
  siteName: '서울으로',
  englishName: "Let's Go Seoul",
  cityName: '서울',
  tourApiAreaCode: '1',
  center: { lat: 37.5665, lng: 126.9780 },
  seoKeywords: ['서울 여행', '서울 관광', 'Seoul travel'],
  officialDataPortal: 'https://data.seoul.go.kr'
}
```

현재 확장 후보:

- 대전: `대전으로`, TourAPI `areaCode=3`, 중심 좌표 `36.351, 127.385`
- 서울: `서울으로`, TourAPI `areaCode=1`, 중심 좌표 `37.5665, 126.9780`
- 부산: `부산으로`, TourAPI `areaCode=6`, 중심 좌표 `35.1796, 129.0756`
- 제주: `제주로`, TourAPI `areaCode=39`, 중심 좌표 `33.4996, 126.5312`

## 1차 공통 API

이 API들은 도시별 키를 새로 발급하지 않고 재사용한다.

### TourAPI KorService2

용도:

- 관광지
- 문화시설
- 레포츠
- 숙박
- 쇼핑
- 음식점

현재 코드:

- `src/services/api.js`
- `getTourApiSpots`
- Worker 경로: `/api/tour/areaBasedList2`

확장 방식:

- 기본값 `areaCode = '3'` 제거
- `city.tourApiAreaCode`를 넘긴다

국문 `contentTypeId`:

- `12`: 관광지
- `14`: 문화시설
- `15`: 행사/축제
- `28`: 레포츠
- `32`: 숙박
- `38`: 쇼핑
- `39`: 음식점

### TourAPI searchFestival2

용도:

- 축제/행사

현재 코드:

- `getTourApiFestivals`
- Worker 경로: `/api/tour/searchFestival2`

확장 방식:

- `areaCode`를 도시 설정에서 받는다
- `eventStartDate`는 현재/미래 행사 중심으로 보정한다
- 종료일 지난 행사는 저장 전에 제외한다

### TourAPI EngService2

용도:

- 외국인용 관광 데이터
- 영문 상세 페이지 또는 영문 필드 보강

현재 코드:

- `getTourApiSpotsEng`
- `getTourApiDetailEng`
- Worker 경로: `/api/tour-en/areaBasedList2`, `/api/tour-en/detailCommon2`

확장 방식:

- `areaCode`를 도시 설정에서 받는다
- 영문 `contentTypeId` 매핑을 재검증한다

주의:

- 현재 `CONTENT_TYPE_KOR_TO_ENG`는 주석과 값이 일부 어긋나 보인다.
- 도시 확장 전에 국문 타입과 영문 타입 매핑을 공식 응답으로 다시 확인해야 한다.

### Kakao Local/Route

용도:

- 주소 검색
- 키워드 검색
- 좌표 보정
- 자동차 길찾기

현재 코드:

- `src/services/kakaoMobilityService.js`
- Worker 경로: `/api/kakao/...`

확장 방식:

- `isDaejeonArea`를 `isWithinCityBounds(city, lat, lng)`로 바꾼다
- 키워드 검색 좌표 `x=127.385&y=36.351`을 `city.center`로 바꾼다
- 검색어에 `"대전"`을 붙이는 로직을 `city.cityName` 기반으로 바꾼다

### ODsay

용도:

- 대중교통 경로
- 버스/지하철 경로

현재 코드:

- `src/services/odsayService.js`
- Worker 경로: `/api/odsay/searchPubTransPathT`

확장 방식:

- 좌표 기반이라 도시별 API 변경은 필요 없다
- 서울, 부산, 제주에서 경로 품질만 테스트한다

### KCISA 공연 API

용도:

- 문화공연
- 공연 이미지와 장소

현재 코드:

- `pages/api/kcisa/[op].js`
- `getCulturalPerformances`
- `getDaejeonPerformances`

확장 방식:

- `isDaejeonPerformance`를 `isCityPerformance(item, city)`로 바꾼다
- 도시명과 alias를 같이 본다

예:

```js
function isCityPerformance(item, city) {
  const names = [city.cityName, ...(city.aliases || [])]
  return names.some((name) =>
    (item.eventSite || '').includes(name) ||
    (item.title || '').includes(`[${name}]`)
  )
}
```

주의:

- KCISA에는 지역 파라미터가 없다.
- 제목과 장소 문자열 필터가 필요하다.
- `초대전` 같은 오탐을 막기 위해 제목은 `[대전]`처럼 괄호 태그 위주로 본다.

## 도시별 필수 보강 API

### 주차장

현재 상태:

- 대전 전용 API에 묶여 있다.
- 현재 함수: `getDaejeonParking`
- 현재 Worker 경로: `/api/daejeon/parking`
- 현재 원천: `apis.data.go.kr/6300000/GetPakpListService1/getPakpList1`

도시별 필요 작업:

- 서울: 서울시 주차장 API 어댑터 필요
- 부산: 부산시 주차장 API 또는 전국 주차장 표준데이터 검토
- 제주: 제주 주차장 API 또는 전국 주차장 표준데이터 검토

권장 함수:

```js
getParkingFacilities({ cityKey, pageNo, numOfRows })
```

통일 반환 필드:

```js
{
  name,
  parkingId,
  lat,
  lon,
  addr,
  parkingType,
  parkingCategory,
  totalLot,
  chargeInfo,
  weekdayOpen,
  weekdayClose,
  referenceDate
}
```

### 의료기관

현재 상태:

- 대전 전용 API에 묶여 있다.
- 현재 함수: `getMedicalFacilities`
- 현재 Worker 경로: `/api/daejeon/medical`
- 현재 원천: `apis.data.go.kr/6300000/mdlcnst/getmdlcnst`

도시별 필요 작업:

- 서울: 병원, 약국, 응급의료 데이터 확인
- 부산: 병원, 약국 데이터 확인
- 제주: 병원, 약국 데이터 확인

권장 함수:

```js
getMedicalFacilities({ cityKey, pageNo, numOfRows })
```

통일 반환 필드:

```js
{
  name,
  type,
  address,
  phone,
  lat,
  lon,
  district
}
```

### 지역 특화 행사

1차는 TourAPI `searchFestival2`로 충분하다.

도시별 지자체 행사 API는 보강용이다.

붙이는 기준:

- 실제 최신 데이터가 있는가
- 시작일/종료일이 구조화되어 있는가
- 장소명, 주소, 좌표, 이미지가 있는가
- TourAPI와 중복 제거가 쉬운가

후보:

- 서울: 서울 열린데이터광장 문화/행사 API
- 부산: 부산 공공데이터포털 또는 부산문화관광 행사 API
- 제주: 제주데이터허브 또는 제주관광공사 행사 데이터

## 선택 보강 API

### 날씨

현재 날씨 위젯이 대전 기준이면 도시별 좌표 기반으로 바꿔야 한다.

필요 작업:

- 도시 중심 좌표 또는 구/군 좌표 사용
- 도시 전환 시 해당 도시 날씨 조회
- 캐시 적용

### 관광 사진

1차는 TourAPI 이미지로 충분하다.

보강 후보:

- 도시별 공식 관광 포털 이미지
- 자체 업로드 이미지
- Vercel Blob 또는 Supabase Storage

주의:

- 원격 이미지는 `next/image` 프록시에서 400/402가 날 수 있다.
- 카드 이미지는 일반 `img`가 더 안전하다.
- 저작권 유형은 `LicenseBadge`에 맞춰 표시한다.

### YouTube/SNS

지금은 필수 아님.

나중에 핫플/트렌드 기능을 만들 때만 검토한다.

- YouTube Data API: 스폿명 기반 영상 연결 가능. 쿼터 캐싱 필수
- Instagram Graph API: 장소 수집용으로 부적합. 해시태그 제한이 큼
- Google Places: 중복/과금 위험. Kakao + TourAPI 우선
- Foursquare/Yelp: 한국 커버리지 불확실. 우선순위 낮음

## 환경변수와 시크릿

현재 재사용 가능한 값:

- `TOURAPI_KEY`: TourAPI 국문/영문
- `KAKAO_REST_API_KEY`: Kakao Local/Route
- `ODSAY_API_KEY`: 대중교통
- `KCISA_API_KEY`: 공연 API
- `NEXT_PUBLIC_WORKERS_API_URL`: Worker 프록시 URL
- `NEXT_PUBLIC_SITE_URL`: canonical/SEO

대전 전용 값:

- `DAEJEON_API_KEY`: 대전 주차장/의료 API

도시별 API를 추가하면 다음처럼 분리한다.

- `SEOUL_API_KEY`
- `BUSAN_API_KEY`
- `JEJU_API_KEY`

규칙:

- 공통 API 키는 도시별로 복제하지 않는다.
- 비밀키는 `NEXT_PUBLIC_*`에 넣지 않는다.
- 원 API 호출은 Worker 또는 Next API route에서만 한다.

## 구현 순서

### 1단계: 설정 분리

- `src/config/cities.js` 생성
- 도시명, 영문명, TourAPI 지역코드, 중심 좌표, SEO 문구 정의
- 기존 대전 하드코딩을 `cityConfig.daejeon`으로 이동

### 2단계: TourAPI 도시화

대상:

- `getTourApiSpots`
- `getTourApiFestivals`
- `getTourApiSpotsEng`
- 관리자 TourAPI 동기화 UI

변경:

- 기본값 `areaCode = '3'` 제거
- 호출부에서 `city.tourApiAreaCode` 전달

### 3단계: Kakao 도시화

대상:

- `kakaoMobilityService.js`

변경:

- `isDaejeonArea` -> `isWithinCityBounds`
- 대전 중심 좌표 -> `city.center`
- `"대전"` 검색어 보강 -> `city.cityName`

### 4단계: 공연 필터 도시화

대상:

- `getDaejeonPerformances`
- `isDaejeonPerformance`

변경:

- `getCityPerformances(city)`
- `isCityPerformance(item, city)`

### 5단계: 생활 API 어댑터

주차장:

```js
const parkingAdapters = {
  daejeon: getDaejeonParking,
  seoul: getSeoulParking,
  busan: getBusanParking,
  jeju: getJejuParking
}
```

의료기관도 같은 방식으로 분리한다.

## 우선순위

MVP:

1. 도시 설정 파일
2. TourAPI 국문/영문 지역코드 전환
3. Kakao 중심 좌표 전환
4. 도시별 랜딩/SEO 문구
5. 내부 개발 페이지에서 도시 전환 확인

2차:

1. KCISA 공연 도시 필터
2. ODsay 경로 도시별 확인
3. 도시별 주차장 API
4. 도시별 의료기관 API

3차:

1. 지역 행사 API 보강
2. 이미지/히어로 데이터 보강
3. YouTube 등 콘텐츠 연계
4. 별도 도메인 또는 하위 경로 공개 전략 결정

## 공개 전략

선택지:

- 단일 사이트 + 도시 선택: `/city/seoul`
- 도시별 하위 경로: `/seoul`, `/busan`, `/jeju`
- 도시별 도메인: `letsgoseoul.kr` 등

권장:

- 초기 개발은 `/dev-cities`와 내부 라우트에서 검증
- 공개 전 SEO/도메인 전략 다시 결정

## 결정 필요

- 첫 번째 확장 도시: 서울, 부산, 제주 중 선택
- 공개 방식: 단일 사이트 안의 도시 선택 vs 별도 브랜드/도메인
- 주차장/의료기관을 1차에 포함할지, TourAPI 중심으로 먼저 열지
- DB 구조: 기존 테이블에 `city_key` 추가 vs 도시별 테이블 분리

권장 결정:

1. 첫 확장 도시는 `서울`
2. DB는 기존 테이블에 `city_key` 추가
3. 1차는 TourAPI + Kakao + KCISA만 사용
4. 주차장/의료기관은 2차로 분리
