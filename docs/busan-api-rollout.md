# 부산 페이지와 보강 API

확인일: 2026-10-15. 기존 Worker의 공공데이터 인증키로 신규 5종 API 실응답을 확인했다. 키 원문을 복사하거나 공개하지 않고 서버 Worker 안에서 재사용한다.

## 이번 공개 범위

- 부산 전용 바다색 테마, 대표 사진, 도시 전환, 구·군별 관광 탐색.
- 기존 TourAPI와 공유 DB의 부산(areaCode 6) 데이터 사용. 확인 시점 관광·문화·레저·숙박·쇼핑·음식점 합계 552곳, 영문명 26곳.
- 진행 중 행사는 기존 TourAPI·문화포털 수집과 날짜 필터를 사용한다. 외부 출처의 부산 행사 누락 가능성은 남는다.
- 주차·의료 검색을 연결했다. 부산 공영주차장 615곳, 전국 병의원 API의 부산 기관 5,569곳을 확인했다. 해당 병의원 API는 약국을 포함하지 않는다.
- 부산테마여행 246편과 맛집 437곳은 메인과 `/busan-guide`에서 검색·페이지 나누기·본문 펼치기를 제공한다. 한국어 원문임을 영어 화면에도 안내한다.
- 검색 노출은 다른 신규 도시처럼 noindex 상태다.

## 활용신청 우선순위

공공데이터포털의 인증키가 같더라도 각 서비스별 활용신청·승인은 별도로 필요하다. 사용자가 5종 신청 완료와 동일 키 사용을 확인했다. `/api/busan/{parking,themes,food,festivals,medical}` Worker 경로는 고정된 공식 엔드포인트만 호출하며 의료 요청은 부산광역시로 제한한다. 기존 `DAEJEON_API_KEY`를 사용하므로 Vercel에 `BUSAN_API_KEY`나 `NMC_API_KEY`를 추가할 필요가 없다. Worker의 `BUSAN_API_KEY`가 있으면 우선 사용한다.

| 우선순위 | 서비스 / 신청 페이지 | 서버 키 | 추가할 콘텐츠 |
| --- | --- | --- | --- |
| 1 | [부산 공영주차장 정보](https://www.data.go.kr/data/15004683/openapi.do) | `BUSAN_API_KEY` | 관광지 주변 공영주차장·요금·운영정보. 잔여 주차면 실시간 제공 여부는 실응답으로 확인 필요 |
| 2 | [부산테마여행정보](https://www.data.go.kr/data/15063506/openapi.do) | `BUSAN_API_KEY` | 공식 추천 여행 코스·테마 카드 |
| 3 | [부산맛집정보](https://www.data.go.kr/data/15063472/openapi.do) | `BUSAN_API_KEY` | 부산 미식 추천, 공식 설명과 사진, 다국어 정보 보강 |
| 4 | [부산축제정보](https://www.data.go.kr/data/15063500/openapi.do) | `BUSAN_API_KEY` | 축제 소개·장소·사진 보강. 아래 날짜 주의사항 필수 |
| 5 | [전국 병·의원 찾기](https://www.data.go.kr/data/15000736/openapi.do) | `NMC_API_KEY` | 부산 주소로 필터링한 병의원 검색. 실제 진료 여부는 기관 확인 안내 필요 |

### 공식 문서의 엔드포인트

- 주차: `https://apis.data.go.kr/6260000/BusanPblcPrkngInfoService/getPblcPrkngInfo`
- 테마여행: `https://apis.data.go.kr/6260000/RecommendedService/getRecommendedKr`
- 맛집: `https://apis.data.go.kr/6260000/FoodService/getFoodKr`
- 축제: `https://apis.data.go.kr/6260000/FestivalService/getFestivalKr`
- 병의원: `https://apis.data.go.kr/B552657/HsptlAsembySearchService/getHsptlMdcncListInfoInqire`

## 자동 행사 게시의 주의점

부산축제정보 문서는 운영기간을 `USAGE_DAY`, 이용시간을 `USAGE_DAY_WEEK_AND_TIME` 문자열로 제공한다. 연도가 포함된 시작일·종료일이 항상 제공된다고 보장할 수 없다. 따라서 이 API의 모든 항목을 오늘 진행 중인 행사로 게시하면 안 된다. 명확한 해당 연도 날짜를 확인한 경우만 자동 게시하고, 불명확한 항목은 축제 소개 자료로만 사용한다. 현재 자동 행사 흐름은 날짜가 있는 기존 출처를 유지한다.

부산축제 41건을 새 수집 출처로 추가했다. 연도·날짜 범위가 명확하고 실제 달력에 존재하는 일정만 수집하며, 매주·격주·매월 같은 반복 일정은 제외한다. 기존 행사 흐름에서 오늘 이전 시작·오늘 이후 종료 여부와 관리자 숨김을 적용한다. 지난 연도 일정에 현재 연도를 덮어쓰지 않는다. 10월 15일 실제 응답의 부산국제영화제 일정은 10월 6~15일이며, 10월 16일 시작 행사들은 15일 공개 목록에서 제외된다.

주차장 관리번호는 구별로 재사용된다. 관리 구청·관리번호·이름·주소 조합으로 구분하여 서로 다른 구의 주차장이 누락되지 않게 한다. 주차장 정보는 실시간 잔여 주차면이 아니고 일부 기준일이 오래됐으므로 현장 확인 안내를 표시한다. 의료정보도 방문 전 전화 확인이 필요하다.

## 사용자 설정

- 카카오 개발자 콘솔 웹 플랫폼에 `https://letsgobusan.vercel.app` 등록 필요. 실제 SDK 호출은 401 `domain mismatched!`를 반환했다. 지도 로딩은 등록 후 다시 확인한다.
- 인증키는 기존 Worker 시크릿을 재사용한다. 키 원문을 문서·소스·공개 화면에 남기지 않는다.
- 별도 도메인은 선택 사항이다. Vercel 주소로 먼저 사용 가능하다.

## 실행과 배포

- 테스트: `node scripts/testCities.mjs`, `node scripts/testEvents.mjs`, `node scripts/testBusanDistricts.mjs`.
- 신규 API 테스트: `node scripts/testBusanApi.mjs`. 실화면 검증: `PLAYWRIGHT_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node scripts/testBusanServices.mjs <부산 사이트 주소>`.
- 부산 Vercel 프로젝트: `letsgobusan`, ID `prj_fumaKhcdJpGBg1vuVQ7j6J0djSlR`.
- 부산 공개 주소: `https://letsgobusan.vercel.app`.
- 공용 Worker의 부산 Origin 허용 목록은 별도 배포한다.
