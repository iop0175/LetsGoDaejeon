import Head from 'next/head'
import { useRouter } from 'next/router'
import { CITY, SITE_URL, IS_CITY_PREVIEW } from '../../config/cities'
import { getPageSeo } from '../../config/pageSeo'
import {
  HREFLANG, OG_LOCALE, OTHER_LOCALE, absoluteImage, absoluteUrl, siteName,
  breadcrumbLd, websiteLd, organizationLd
} from '../../utils/seo'

/**
 * 모든 공개 페이지의 메타 태그를 한 곳에서 만든다.
 * - canonical은 언어별 주소(/kr, /en)를 가리키고, hreflang으로 두 언어를 서로 연결한다.
 * - 영어 자료가 없는 상세 페이지는 hasEnglish={false}로 영어판을 색인에서 뺀다.
 *
 * page: pageSeo.js의 키. title/description/keywords를 직접 넘기면 그 값이 우선한다.
 * path: 로케일을 뺀 경로 (예: '/travel', '/spot/성심당-123')
 */
export default function SeoHead({
  page,
  count,
  title,
  description,
  keywords,
  path = '/',
  paths,
  image,
  imageAlt,
  type = 'website',
  noindex,
  hasEnglish = true,
  crumbs,
  ld = [],
  includeSiteLd = false
}) {
  const router = useRouter()
  const locale = router.locale === 'en' ? 'en' : 'kr'
  const base = page ? getPageSeo(page, locale, { count }) : {}

  const finalTitle = title || base.title
  const finalDescription = description || base.description
  const finalKeywords = keywords || base.keywords
  const hideFromIndex = Boolean(noindex ?? base.noindex) || IS_CITY_PREVIEW || (locale === 'en' && !hasEnglish)

  // 언어마다 주소가 다른 페이지(영문 slug 등)는 paths={{ kr, en }}로 넘긴다
  const pathByLocale = { kr: paths?.kr || path, en: paths?.en || path }
  const canonical = absoluteUrl(locale, pathByLocale[locale])
  const ogImage = absoluteImage(image)
  const alternates = hasEnglish
    ? [
        { lang: HREFLANG.kr, href: absoluteUrl('kr', pathByLocale.kr) },
        { lang: HREFLANG.en, href: absoluteUrl('en', pathByLocale.en) },
        { lang: 'x-default', href: absoluteUrl('kr', pathByLocale.kr) }
      ]
    : []

  const jsonLd = [
    ...(includeSiteLd ? [websiteLd(locale), organizationLd(locale)] : []),
    ...(crumbs?.length ? [breadcrumbLd(locale, crumbs)] : []),
    ...ld
  ].filter(Boolean)

  return (
    <Head>
      <title key="title">{finalTitle}</title>
      <meta key="description" name="description" content={finalDescription} />
      {finalKeywords && <meta key="keywords" name="keywords" content={finalKeywords} />}
      <meta key="author" name="author" content={siteName(locale)} />
      <meta
        key="robots"
        name="robots"
        content={hideFromIndex ? 'noindex, follow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'}
      />
      <link key="canonical" rel="canonical" href={canonical} />
      {alternates.map(({ lang, href }) => (
        <link key={`alt-${lang}`} rel="alternate" hrefLang={lang} href={href} />
      ))}

      <meta key="og:type" property="og:type" content={type} />
      <meta key="og:url" property="og:url" content={canonical} />
      <meta key="og:title" property="og:title" content={finalTitle} />
      <meta key="og:description" property="og:description" content={finalDescription} />
      <meta key="og:image" property="og:image" content={ogImage} />
      {imageAlt && <meta key="og:image:alt" property="og:image:alt" content={imageAlt} />}
      <meta key="og:site_name" property="og:site_name" content={siteName(locale)} />
      <meta key="og:locale" property="og:locale" content={OG_LOCALE[locale]} />
      {hasEnglish && <meta key="og:locale:alternate" property="og:locale:alternate" content={OG_LOCALE[OTHER_LOCALE[locale]]} />}

      <meta key="twitter:card" name="twitter:card" content="summary_large_image" />
      <meta key="twitter:title" name="twitter:title" content={finalTitle} />
      <meta key="twitter:description" name="twitter:description" content={finalDescription} />
      <meta key="twitter:image" name="twitter:image" content={ogImage} />

      {jsonLd.map((item, index) => (
        <script
          key={`ld-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </Head>
  )
}
