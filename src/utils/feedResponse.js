// getServerSideProps에서 텍스트/XML 응답을 직접 내려보낸다 (i18n이 켜져도 접두어 없는 주소 그대로 쓰기 위함)
export const sendFeed = (res, contentType, body, cacheControl = 'public, s-maxage=3600, stale-while-revalidate=86400') => {
  res.setHeader('Content-Type', contentType)
  res.setHeader('Cache-Control', cacheControl)
  res.write(body)
  res.end()
  return { props: {} }
}
