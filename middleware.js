import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const LOCALES = ['kr', 'en']

// 접두어 없는 주소에 쓸 언어: 저장된 선택 > 브라우저 선호 > 한국어
// 검색 로봇은 Accept-Language가 없어 한국어(/kr)로 가고, 영어 사용자는 /en으로 간다.
const pickLocale = (request) => {
  const saved = request.cookies.get('NEXT_LOCALE')?.value
  if (LOCALES.includes(saved)) return { locale: saved, saved: true }
  const first = (request.headers.get('accept-language') || '').split(',')[0].trim().toLowerCase()
  return { locale: first.startsWith('en') ? 'en' : 'kr', saved: false }
}

export async function middleware(request) {
  const { pathname, locale } = request.nextUrl

  // 접두어가 없는 모든 페이지 주소를 /kr 또는 /en으로 보낸다
  if (locale === 'default') {
    const picked = pickLocale(request)
    const target = new URL(`/${picked.locale}${pathname === '/' ? '' : pathname}`, request.url)
    target.search = request.nextUrl.search
    // 선택이 정해진 요청은 임시(307), 기본 한국어는 영구(308)로 보내 기존 색인 주소를 /kr로 옮긴다
    return NextResponse.redirect(target, picked.locale === 'kr' && !picked.saved ? 308 : 307)
  }

  // /spot/ 주소를 장소명-contentId 형식으로 정리
  if (!pathname.startsWith('/spot/')) {
    return NextResponse.next()
  }

  const slug = pathname.replace('/spot/', '')
  const decodedSlug = decodeURIComponent(slug)

  // 이미 올바른 형식 (장소명-contentId)
  if (/^.+-\d+$/.test(decodedSlug)) {
    return NextResponse.next()
  }

  const isContentIdOnly = /^\d+$/.test(decodedSlug)

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    let contentId = null
    let title = null

    const query = supabase.from('tour_spots').select('content_id, title')
    const { data, error } = isContentIdOnly
      ? await query.eq('content_id', decodedSlug).maybeSingle()
      : await query.eq('title', decodedSlug).maybeSingle()

    if (data && !error) {
      contentId = data.content_id
      title = data.title
    }

    if (contentId && title) {
      const url = request.nextUrl.clone()
      url.pathname = `/spot/${encodeURIComponent(`${title}-${contentId}`)}`
      return NextResponse.redirect(url, { status: 301 })
    }
  } catch (err) {
    console.error('Middleware error:', err)
  }

  return NextResponse.next()
}

export const config = {
  // API, 빌드 산출물, 확장자가 있는 정적 파일은 제외
  matcher: ['/', '/((?!api/|_next/|images/|.*\\..*).*)']
}
