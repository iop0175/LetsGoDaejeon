// 제주 테마별 여행지. tags는 제주 교통정보센터 관광지 자료의 태그와 맞춘다. slug가 주소가 된다.
export const THEMES = [
  { slug: '커플', tags: ['커플'], title: '제주 커플 여행지', lead: '둘이서 걷고 사진 찍기 좋은 곳' },
  { slug: '친구', tags: ['친구'], title: '제주 친구 여행 가볼 만한 곳', lead: '친구들과 함께 가기 좋은 명소' },
  { slug: '아이와', tags: ['아이'], title: '제주 아이와 가볼 만한 곳', lead: '아이와 함께 다녀오기 좋은 곳' },
  { slug: '혼자', tags: ['혼자'], title: '제주 혼자 여행 가볼 만한 곳', lead: '혼자 여행하기 좋은 명소' },
  { slug: '부모님', tags: ['부모'], title: '제주 부모님 모시고 가볼 만한 곳', lead: '부모님과 편하게 다녀오기 좋은 곳' },
  { slug: '오름', tags: ['오름'], title: '제주 오름 추천', lead: '제주를 대표하는 오름' },
  { slug: '걷기', tags: ['걷기/등산'], title: '제주 걷기 좋은 곳·등산 코스', lead: '걷고 오르기 좋은 길과 산' },
  { slug: '포토스팟', tags: ['경관/포토'], title: '제주 포토스팟 사진 명소', lead: '사진 찍기 좋은 경관 명소' },
  { slug: '문화유적', tags: ['문화유적지'], title: '제주 문화유적지', lead: '제주의 역사와 문화를 만나는 곳' },
  { slug: '액티비티', tags: ['액티비티'], title: '제주 액티비티·체험 명소', lead: '몸으로 즐기는 제주' },
  { slug: '해변', tags: ['해변'], title: '제주 해변 추천', lead: '바다가 아름다운 해변' },
  { slug: '힐링', tags: ['휴식/힐링', '휴식/치유'], title: '제주 힐링 여행지', lead: '쉬어가기 좋은 힐링 명소' },
  { slug: '비오는날', tags: ['비.눈', '실내'], title: '제주 비 오는 날 가볼 만한 곳', lead: '날씨가 궂어도 즐길 수 있는 실내·우천 명소' },
  { slug: '실내', tags: ['실내'], title: '제주 실내 관광지', lead: '실내에서 즐기는 제주' },
  { slug: '일몰', tags: ['일몰'], title: '제주 일몰 명소', lead: '해 질 녘이 아름다운 곳' },
  { slug: '일출', tags: ['일출'], title: '제주 일출 명소', lead: '아침 해를 맞이하기 좋은 곳' },
  { slug: '드라이브', tags: ['드라이브'], title: '제주 드라이브 코스', lead: '차로 달리기 좋은 길' },
  { slug: '올레길', tags: ['올레'], title: '제주 올레길 명소', lead: '제주 올레길에서 만나는 명소' },
  { slug: '4.3유적', tags: ['4.3'], title: '제주 4·3 유적지', lead: '제주 4·3의 기억을 담은 곳' },
  { slug: '체험', tags: ['체험관광'], title: '제주 체험 관광지', lead: '직접 해보는 제주 체험' },
  { slug: '테마파크', tags: ['테마공원'], title: '제주 테마파크·테마공원', lead: '하루 종일 즐기는 테마공원' },
  { slug: '박물관', tags: ['미술/박물관'], title: '제주 박물관·미술관', lead: '전시와 문화를 즐기는 곳' },
  { slug: '캠핑', tags: ['캠핑장', '야영장'], title: '제주 캠핑장·야영장', lead: '자연 속에서 하룻밤' },
  { slug: '봄', tags: ['봄'], title: '제주 봄 여행지', lead: '유채꽃과 벚꽃의 계절에 가볼 만한 곳' },
  { slug: '여름', tags: ['여름'], title: '제주 여름 여행지', lead: '바다와 숲이 반가운 여름 명소' },
  { slug: '가을', tags: ['가을'], title: '제주 가을 여행지', lead: '억새와 단풍의 계절에 가볼 만한 곳' },
  { slug: '겨울', tags: ['겨울'], title: '제주 겨울 여행지', lead: '동백과 설경을 만나는 겨울 명소' }
]

export const findTheme = (slug) => THEMES.find((theme) => theme.slug === slug) || null
export const spotsOf = (theme, spots) => spots.filter((spot) => theme.tags.some((tag) => spot.tags.includes(tag)))
