import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase 클라이언트 (서버사이드용)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function middleware(request) {
  const { pathname } = request.nextUrl
  
  // /spot/로 시작하는 URL만 처리
  if (!pathname.startsWith('/spot/')) {
    return NextResponse.next()
  }
  
  const slug = pathname.replace('/spot/', '')
  const decodedSlug = decodeURIComponent(slug)
  
  // 이미 올바른 형식 (장소명-contentId)인지 확인
  const correctFormat = /^.+-\d+$/.test(decodedSlug)
  if (correctFormat) {
    return NextResponse.next()
  }
  
  // contentId만 있는 경우 (/spot/2689761)
  const isContentIdOnly = /^\d+$/.test(decodedSlug)
  
  // 장소명만 있는 경우 (/spot/삼정생태공원)
  const isNameOnly = !isContentIdOnly && !correctFormat
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    let contentId = null
    let title = null
    
    if (isContentIdOnly) {
      // contentId로 장소 조회
      const { data, error } = await supabase
        .from('tour_spots')
        .select('content_id, title')
        .eq('content_id', decodedSlug)
        .maybeSingle()
      
      if (data && !error) {
        contentId = data.content_id
        title = data.title
      }
    } else if (isNameOnly) {
      // 장소명으로 검색
      const { data, error } = await supabase
        .from('tour_spots')
        .select('content_id, title')
        .eq('title', decodedSlug)
        .maybeSingle()
      
      if (data && !error) {
        contentId = data.content_id
        title = data.title
      }
    }
    
    if (contentId && title) {
      // 올바른 slug 형식으로 301 리다이렉트
      const newSlug = `${title}-${contentId}`
      const url = request.nextUrl.clone()
      url.pathname = `/spot/${encodeURIComponent(newSlug)}`
      
      return NextResponse.redirect(url, { status: 301 })
    }
  } catch (err) {
    console.error('Middleware error:', err)
  }
  
  // 리다이렉트 실패 시 원래 요청 계속 처리
  return NextResponse.next()
}

export const config = {
  matcher: '/spot/:path*'
}
