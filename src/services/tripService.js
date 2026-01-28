import { supabase } from './supabase'
import { deleteImage } from './blobService'
import { toSecureUrl } from '../utils/imageUtils'

// ===== 여행 계획 (Trip Plans) =====

// 특정 여행 계획 상세 정보 가져오기 (실시간 동기화용)
export const getTripPlanWithDetails = async (planId) => {
  try {
    const { data, error } = await supabase
      .from('trip_plans')
      .select(`
        *,
        trip_days (
          *,
          trip_places (*)
        )
      `)
      .eq('id', planId)
      .single()
    
    if (error) throw error
    
    // 데이터 형식 변환
    const plan = {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      startDate: data.start_date,
      endDate: data.end_date,
      description: data.description,
      accommodationName: data.accommodation_name,
      accommodationAddress: data.accommodation_address,
      createdAt: data.created_at,
      isPublished: data.is_published,
      sharedId: data.shared_id,
      days: data.trip_days?.sort((a, b) => a.day_number - b.day_number).map(day => ({
        id: day.id,
        planId: day.plan_id,
        dayNumber: day.day_number,
        date: day.date,
        places: day.trip_places?.sort((a, b) => a.order_index - b.order_index).map(place => ({
          id: place.id,
          dayId: place.day_id,
          placeType: place.place_type,
          placeName: place.place_name,
          placeAddress: place.place_address,
          placeDescription: place.place_description,
          placeImage: place.place_image,
          orderIndex: place.order_index,
          visitTime: place.visit_time,
          memo: place.memo,
          transportToNext: place.transport_to_next
        })) || []
      })) || []
    }
    
    return { success: true, plan }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// 사용자의 여행 계획 목록 가져오기
export const getUserTripPlans = async (userId) => {
  try {
    // 익명 사용자인 경우 로컬스토리지에서 가져오기
    if (!userId || userId === 'anonymous') {
      const localPlans = JSON.parse(localStorage.getItem('tripPlans') || '[]')
      return { success: true, plans: localPlans }
    }
    
    const { data, error } = await supabase
      .from('trip_plans')
      .select(`
        *,
        trip_days (
          *,
          trip_places (*)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    // 데이터 형식 변환
    const plans = data.map(plan => ({
      id: plan.id,
      userId: plan.user_id,
      title: plan.title,
      startDate: plan.start_date,
      endDate: plan.end_date,
      description: plan.description,
      accommodationName: plan.accommodation_name,
      accommodationAddress: plan.accommodation_address,
      createdAt: plan.created_at,
      days: plan.trip_days?.map(day => ({
        id: day.id,
        planId: day.plan_id,
        dayNumber: day.day_number,
        date: day.date,
        places: day.trip_places?.map(place => ({
          id: place.id,
          dayId: place.day_id,
          placeType: place.place_type,
          placeName: place.place_name,
          placeAddress: place.place_address,
          placeDescription: place.place_description,
          placeImage: place.place_image,
          orderIndex: place.order_index,
          visitTime: place.visit_time,
          memo: place.memo,
          transportToNext: place.transport_to_next
        })) || []
      })) || []
    }))
    
    return { success: true, plans }
  } catch (err) {

    return { success: false, error: err.message }
  }
}

// 여행 계획 생성
export const createTripPlan = async ({ userId, title, startDate, endDate, description }) => {
  try {
    // 익명 사용자인 경우 로컬스토리지에 저장
    if (!userId || userId === 'anonymous') {
      const localPlans = JSON.parse(localStorage.getItem('tripPlans') || '[]')
      const newPlan = {
        id: `local_${Date.now()}`,
        userId: 'anonymous',
        title,
        startDate,
        endDate,
        description,
        createdAt: new Date().toISOString(),
        days: []
      }
      localPlans.unshift(newPlan)
      localStorage.setItem('tripPlans', JSON.stringify(localPlans))
      return { success: true, plan: newPlan }
    }
    
    const { data, error } = await supabase
      .from('trip_plans')
      .insert({
        user_id: userId,
        title,
        start_date: startDate,
        end_date: endDate,
        description
      })
      .select()
      .single()
    
    if (error) throw error
    
    return {
      success: true,
      plan: {
        id: data.id,
        userId: data.user_id,
        title: data.title,
        startDate: data.start_date,
        endDate: data.end_date,
        description: data.description,
        createdAt: data.created_at,
        days: []
      }
    }
  } catch (err) {

    return { success: false, error: err.message }
  }
}

// 여행 계획 수정
export const updateTripPlan = async (planId, updates) => {
  try {
    // 로컬 데이터인 경우
    if (planId.toString().startsWith('local_')) {
      const localPlans = JSON.parse(localStorage.getItem('tripPlans') || '[]')
      const idx = localPlans.findIndex(p => p.id === planId)
      if (idx !== -1) {
        localPlans[idx] = { ...localPlans[idx], ...updates }
        localStorage.setItem('tripPlans', JSON.stringify(localPlans))
        return { success: true, plan: localPlans[idx] }
      }
      return { success: false, error: 'Plan not found' }
    }
    
    // 업데이트할 필드만 추출
    const updateData = {}
    if (updates.title !== undefined) updateData.title = updates.title
    if (updates.startDate !== undefined) updateData.start_date = updates.startDate
    if (updates.endDate !== undefined) updateData.end_date = updates.endDate
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.accommodationName !== undefined) updateData.accommodation_name = updates.accommodationName
    if (updates.accommodationAddress !== undefined) updateData.accommodation_address = updates.accommodationAddress
    
    const { data, error } = await supabase
      .from('trip_plans')
      .update(updateData)
      .eq('id', planId)
      .select()
      .single()
    
    if (error) throw error
    
    return { success: true, plan: data }
  } catch (err) {

    return { success: false, error: err.message }
  }
}

// 여행 계획 삭제
export const deleteTripPlan = async (planId) => {
  try {
    // 로컬 데이터인 경우
    if (planId.toString().startsWith('local_')) {
      const localPlans = JSON.parse(localStorage.getItem('tripPlans') || '[]')
      const filtered = localPlans.filter(p => p.id !== planId)
      localStorage.setItem('tripPlans', JSON.stringify(filtered))
      return { success: true }
    }
    
    const { error } = await supabase
      .from('trip_plans')
      .delete()
      .eq('id', planId)
    
    if (error) throw error
    
    return { success: true }
  } catch (err) {

    return { success: false, error: err.message }
  }
}

// ===== 여행 일정 (Trip Days) =====

// 일정 추가
export const addTripDay = async ({ planId, dayNumber, date }) => {
  try {
    // 로컬 데이터인 경우
    if (planId.toString().startsWith('local_')) {
      const localPlans = JSON.parse(localStorage.getItem('tripPlans') || '[]')
      const planIdx = localPlans.findIndex(p => p.id === planId)
      if (planIdx !== -1) {
        const newDay = {
          id: `local_day_${Date.now()}_${dayNumber}`,
          planId,
          dayNumber,
          date,
          places: []
        }
        localPlans[planIdx].days.push(newDay)
        localStorage.setItem('tripPlans', JSON.stringify(localPlans))
        return { success: true, day: newDay }
      }
      return { success: false, error: 'Plan not found' }
    }
    
    const { data, error } = await supabase
      .from('trip_days')
      .insert({
        plan_id: planId,
        day_number: dayNumber,
        date
      })
      .select()
      .single()
    
    if (error) throw error
    
    return {
      success: true,
      day: {
        id: data.id,
        planId: data.plan_id,
        dayNumber: data.day_number,
        date: data.date,
        places: []
      }
    }
  } catch (err) {

    return { success: false, error: err.message }
  }
}

// 일정 수정
export const updateTripDay = async (dayId, updates) => {
  try {
    // 로컬 데이터인 경우
    if (dayId.toString().startsWith('local_day_')) {
      const localPlans = JSON.parse(localStorage.getItem('tripPlans') || '[]')
      for (const plan of localPlans) {
        const dayIdx = plan.days?.findIndex(d => d.id === dayId)
        if (dayIdx !== -1) {
          plan.days[dayIdx] = { ...plan.days[dayIdx], ...updates }
          localStorage.setItem('tripPlans', JSON.stringify(localPlans))
          return { success: true, day: plan.days[dayIdx] }
        }
      }
      return { success: false, error: 'Day not found' }
    }
    
    const { data, error } = await supabase
      .from('trip_days')
      .update({
        day_number: updates.dayNumber,
        date: updates.date
      })
      .eq('id', dayId)
      .select()
      .single()
    
    if (error) throw error
    
    return { success: true, day: data }
  } catch (err) {

    return { success: false, error: err.message }
  }
}

// 일정 삭제
export const deleteTripDay = async (dayId) => {
  try {
    // 로컬 데이터인 경우
    if (dayId.toString().startsWith('local_day_')) {
      const localPlans = JSON.parse(localStorage.getItem('tripPlans') || '[]')
      for (const plan of localPlans) {
        plan.days = plan.days?.filter(d => d.id !== dayId) || []
      }
      localStorage.setItem('tripPlans', JSON.stringify(localPlans))
      return { success: true }
    }
    
    const { error } = await supabase
      .from('trip_days')
      .delete()
      .eq('id', dayId)
    
    if (error) throw error
    
    return { success: true }
  } catch (err) {

    return { success: false, error: err.message }
  }
}

// ===== 여행 장소 (Trip Places) =====

// 장소 추가
export const addTripPlace = async ({
  dayId,
  placeType,
  placeName,
  placeAddress,
  placeDescription,
  placeImage,
  orderIndex,
  visitTime,
  memo,
  lat,
  lng,
  stayDuration
}) => {
  try {
    // 로컬 데이터인 경우
    if (dayId.toString().startsWith('local_day_')) {
      const localPlans = JSON.parse(localStorage.getItem('tripPlans') || '[]')
      for (const plan of localPlans) {
        const day = plan.days?.find(d => d.id === dayId)
        if (day) {
          const newPlace = {
            id: `local_place_${Date.now()}`,
            dayId,
            placeType,
            placeName,
            placeAddress,
            address: placeAddress,
            placeDescription,
            placeImage,
            orderIndex,
            visitTime,
            memo,
            lat,
            lng,
            stayDuration
          }
          day.places = day.places || []
          day.places.push(newPlace)
          localStorage.setItem('tripPlans', JSON.stringify(localPlans))
          return { success: true, place: newPlace }
        }
      }
      return { success: false, error: 'Day not found' }
    }
    
    const { data, error } = await supabase
      .from('trip_places')
      .insert({
        day_id: dayId,
        place_type: placeType,
        place_name: placeName,
        place_address: placeAddress,
        place_description: placeDescription,
        place_image: placeImage,
        order_index: orderIndex,
        visit_time: visitTime,
        memo,
        lat,
        lng,
        stay_duration: stayDuration
      })
      .select()
      .single()
    
    if (error) throw error
    
    return {
      success: true,
      place: {
        id: data.id,
        dayId: data.day_id,
        placeType: data.place_type,
        placeName: data.place_name,
        placeAddress: data.place_address,
        address: data.place_address,
        placeDescription: data.place_description,
        placeImage: data.place_image,
        orderIndex: data.order_index,
        visitTime: data.visit_time,
        memo: data.memo,
        lat: data.lat,
        lng: data.lng,
        stayDuration: data.stay_duration
      }
    }
  } catch (err) {

    return { success: false, error: err.message }
  }
}

// 장소 수정
export const updateTripPlace = async (placeId, updates) => {
  try {
    // 로컬 데이터인 경우
    if (placeId.toString().startsWith('local_place_')) {
      const localPlans = JSON.parse(localStorage.getItem('tripPlans') || '[]')
      for (const plan of localPlans) {
        for (const day of plan.days || []) {
          const placeIdx = day.places?.findIndex(p => p.id === placeId)
          if (placeIdx !== -1) {
            day.places[placeIdx] = { ...day.places[placeIdx], ...updates }
            localStorage.setItem('tripPlans', JSON.stringify(localPlans))
            return { success: true, place: day.places[placeIdx] }
          }
        }
      }
      return { success: false, error: 'Place not found' }
    }
    
    // 업데이트할 필드만 포함하는 객체 생성
    const updateData = {}
    if (updates.placeType !== undefined) updateData.place_type = updates.placeType
    if (updates.placeName !== undefined) updateData.place_name = updates.placeName
    if (updates.placeAddress !== undefined) updateData.place_address = updates.placeAddress
    if (updates.placeDescription !== undefined) updateData.place_description = updates.placeDescription
    if (updates.placeImage !== undefined) updateData.place_image = updates.placeImage
    if (updates.orderIndex !== undefined) updateData.order_index = updates.orderIndex
    if (updates.visitTime !== undefined) updateData.visit_time = updates.visitTime
    if (updates.memo !== undefined) updateData.memo = updates.memo
    if (updates.transportToNext !== undefined) updateData.transport_to_next = updates.transportToNext
    if (updates.transitToNext !== undefined) updateData.transit_to_next = updates.transitToNext
    
    const { data, error } = await supabase
      .from('trip_places')
      .update(updateData)
      .eq('id', placeId)
      .select()
      .single()
    
    if (error) throw error
    
    return { success: true, place: data }
  } catch (err) {

    return { success: false, error: err.message }
  }
}

// 장소 삭제
export const deleteTripPlace = async (placeId) => {
  try {
    // 로컬 데이터인 경우
    if (placeId.toString().startsWith('local_place_')) {
      const localPlans = JSON.parse(localStorage.getItem('tripPlans') || '[]')
      for (const plan of localPlans) {
        for (const day of plan.days || []) {
          day.places = day.places?.filter(p => p.id !== placeId) || []
        }
      }
      localStorage.setItem('tripPlans', JSON.stringify(localPlans))
      return { success: true }
    }
    
    const { error } = await supabase
      .from('trip_places')
      .delete()
      .eq('id', placeId)
    
    if (error) throw error
    
    return { success: true }
  } catch (err) {

    return { success: false, error: err.message }
  }
}

/**
 * 장소의 대중교통 정보 업데이트
 * @param {number} placeId - 장소 ID
 * @param {Object} transitInfo - 대중교통 정보
 * @param {Object} transitInfo.bus - 버스 정보 {totalTime, routes: []}
 * @param {Object} transitInfo.subway - 지하철 정보 {totalTime, lines: []}
 */
export const updatePlaceTransitInfo = async (placeId, transitInfo) => {
  try {
    // 로컬 데이터인 경우
    if (placeId.toString().startsWith('local_place_')) {
      const localPlans = JSON.parse(localStorage.getItem('tripPlans') || '[]')
      for (const plan of localPlans) {
        for (const day of plan.days || []) {
          const place = day.places?.find(p => p.id === placeId)
          if (place) {
            place.transitToNext = transitInfo
            localStorage.setItem('tripPlans', JSON.stringify(localPlans))
            return { success: true }
          }
        }
      }
      return { success: false, error: 'Place not found' }
    }
    
    const { error } = await supabase
      .from('trip_places')
      .update({ transit_to_next: transitInfo })
      .eq('id', placeId)
    
    if (error) throw error
    
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// ===== 여행 계획 게시 (Publish) =====

/**
 * 여행 계획 게시하기
 * @param {string} planId - 여행 계획 ID
 * @param {Object} options - 게시 옵션
 * @param {string} options.authorNickname - 작성자 닉네임
 * @param {string} options.thumbnailUrl - 썸네일 이미지 URL
 */
export const publishTripPlan = async (planId, { authorNickname, thumbnailUrl } = {}) => {
  try {
    const { data, error } = await supabase
      .from('trip_plans')
      .update({
        is_published: true,
        published_at: new Date().toISOString(),
        author_nickname: authorNickname || '익명',
        thumbnail_url: thumbnailUrl || null
      })
      .eq('id', planId)
      .select()
      .single()
    
    if (error) throw error
    
    return { success: true, plan: data }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * 여행 계획 게시 취소
 * @param {string} planId - 여행 계획 ID
 */
export const unpublishTripPlan = async (planId) => {
  try {
    // 먼저 현재 여행 계획 정보를 가져와서 썸네일 URL 확인
    const { data: currentPlan, error: fetchError } = await supabase
      .from('trip_plans')
      .select('thumbnail_url')
      .eq('id', planId)
      .single()
    
    if (fetchError) throw fetchError
    
    // Vercel Blob에 업로드된 이미지인 경우 삭제
    if (currentPlan?.thumbnail_url && 
        (currentPlan.thumbnail_url.includes('vercel-storage.com') || 
         currentPlan.thumbnail_url.includes('blob.vercel-storage.com'))) {
      try {
        await deleteImage(currentPlan.thumbnail_url)
      } catch (deleteErr) {
        console.warn('썸네일 이미지 삭제 실패:', deleteErr.message)
        // 이미지 삭제 실패해도 게시 취소는 계속 진행
      }
    }
    
    const { data, error } = await supabase
      .from('trip_plans')
      .update({
        is_published: false,
        published_at: null,
        thumbnail_url: null // 썸네일 URL도 초기화
      })
      .eq('id', planId)
      .select()
      .single()
    
    if (error) throw error
    
    return { success: true, plan: data }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * 게시된 여행 계획 목록 가져오기
 * @param {Object} options - 조회 옵션
 * @param {number} options.limit - 조회 개수 (기본 10)
 * @param {number} options.offset - 오프셋 (기본 0)
 * @param {string} options.orderBy - 정렬 기준 (published_at, view_count, like_count)
 */
export const getPublishedTripPlans = async ({ limit = 10, offset = 0, orderBy = 'published_at' } = {}) => {
  try {
    const { data, error, count } = await supabase
      .from('trip_plans')
      .select(`
        *,
        trip_days (
          *,
          trip_places (*)
        )
      `, { count: 'exact' })
      .eq('is_published', true)
      .order(orderBy, { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (error) throw error
    
    // 데이터 형식 변환
    const plans = data.map(plan => ({
      id: plan.id,
      userId: plan.user_id,
      title: plan.title,
      startDate: plan.start_date,
      endDate: plan.end_date,
      description: plan.description,
      accommodationName: plan.accommodation_name,
      accommodationAddress: plan.accommodation_address,
      isPublished: plan.is_published,
      publishedAt: plan.published_at,
      viewCount: plan.view_count || 0,
      likeCount: plan.like_count || 0,
      thumbnailUrl: plan.thumbnail_url,
      authorNickname: plan.author_nickname || '익명',
      createdAt: plan.created_at,
      days: plan.trip_days?.map(day => ({
        id: day.id,
        planId: day.plan_id,
        dayNumber: day.day_number,
        date: day.date,
        places: day.trip_places?.map(place => ({
          id: place.id,
          dayId: place.day_id,
          placeType: place.place_type,
          placeName: place.place_name,
          placeAddress: place.place_address,
          placeDescription: place.place_description,
          placeImage: place.place_image,
          orderIndex: place.order_index,
          visitTime: place.visit_time,
          memo: place.memo,
          transportToNext: place.transport_to_next
        })).sort((a, b) => a.orderIndex - b.orderIndex) || []
      })).sort((a, b) => a.dayNumber - b.dayNumber) || []
    }))
    
    return { success: true, plans, totalCount: count }
  } catch (err) {
    return { success: false, error: err.message, plans: [] }
  }
}

/**
 * 게시된 여행 계획 상세 조회 (조회수 증가)
 * @param {string} planId - 여행 계획 ID
 */
export const getPublishedTripPlanDetail = async (planId) => {
  try {
    // 현재 조회수 조회
    const { data: currentPlan } = await supabase
      .from('trip_plans')
      .select('view_count')
      .eq('id', planId)
      .eq('is_published', true)
      .single()
    
    // 조회수 증가
    if (currentPlan) {
      await supabase
        .from('trip_plans')
        .update({ view_count: (currentPlan.view_count || 0) + 1 })
        .eq('id', planId)
        .eq('is_published', true)
    }
    
    // 상세 조회 (정렬 포함)
    const { data, error } = await supabase
      .from('trip_plans')
      .select(`
        *,
        trip_days (
          *,
          trip_places (*)
        )
      `)
      .eq('id', planId)
      .eq('is_published', true)
      .order('day_number', { foreignTable: 'trip_days', ascending: true })
      .order('order_index', { foreignTable: 'trip_days.trip_places', ascending: true })
      .single()
    
    if (error) throw error
    
    if (!data) {
      return { success: false, error: '게시된 여행 계획을 찾을 수 없습니다.' }
    }
    
    // 데이터 형식 변환
    const plan = {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      startDate: data.start_date,
      endDate: data.end_date,
      description: data.description,
      accommodationName: data.accommodation_name,
      accommodationAddress: data.accommodation_address,
      isPublished: data.is_published,
      publishedAt: data.published_at,
      viewCount: data.view_count || 0,
      likeCount: data.like_count || 0,
      thumbnailUrl: data.thumbnail_url,
      authorNickname: data.author_nickname || '익명',
      createdAt: data.created_at,
      days: data.trip_days?.map(day => ({
        id: day.id,
        planId: day.plan_id,
        dayNumber: day.day_number,
        date: day.date,
        places: day.trip_places?.map(place => ({
          id: place.id,
          dayId: place.day_id,
          placeType: place.place_type,
          placeName: place.place_name,
          address: place.place_address,
          placeAddress: place.place_address,
          placeDescription: place.place_description,
          placeImage: place.place_image,
          orderIndex: place.order_index,
          visitTime: place.visit_time,
          stayDuration: place.stay_duration,
          memo: place.memo,
          transportToNext: place.transport_to_next,
          transitToNext: place.transit_to_next,
          lat: place.lat,
          lng: place.lng
        })).sort((a, b) => a.orderIndex - b.orderIndex) || []
      })).sort((a, b) => a.dayNumber - b.dayNumber) || []
    }
    
    return { success: true, plan }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * 여행 계획 좋아요 토글
 * @param {string} planId - 여행 계획 ID
 * @param {string} userId - 사용자 ID (없으면 세션 ID 사용)
 */
export const toggleTripLike = async (planId, userId = null) => {
  try {
    const sessionId = !userId ? (localStorage.getItem('tripSessionId') || `session_${Date.now()}`) : null
    
    if (!userId && sessionId) {
      localStorage.setItem('tripSessionId', sessionId)
    }
    
    // 좋아요 확인
    let query = supabase
      .from('trip_likes')
      .select('id')
      .eq('trip_id', planId)
    
    if (userId) {
      query = query.eq('user_id', userId)
    } else {
      query = query.eq('session_id', sessionId)
    }
    
    const { data: existing } = await query.maybeSingle()
    
    if (existing) {
      // 좋아요 취소
      await supabase
        .from('trip_likes')
        .delete()
        .eq('id', existing.id)
      
      // like_count 감소 (현재 값 조회 후 업데이트)
      const { data: plan } = await supabase
        .from('trip_plans')
        .select('like_count')
        .eq('id', planId)
        .single()
      
      if (plan) {
        await supabase
          .from('trip_plans')
          .update({ like_count: Math.max((plan.like_count || 0) - 1, 0) })
          .eq('id', planId)
      }
      
      return { success: true, liked: false }
    } else {
      // 좋아요 추가
      await supabase
        .from('trip_likes')
        .insert({
          trip_id: planId,
          user_id: userId || null,
          session_id: sessionId
        })
      
      // like_count 증가 (현재 값 조회 후 업데이트)
      const { data: plan } = await supabase
        .from('trip_plans')
        .select('like_count')
        .eq('id', planId)
        .single()
      
      if (plan) {
        await supabase
          .from('trip_plans')
          .update({ like_count: (plan.like_count || 0) + 1 })
          .eq('id', planId)
      }
      
      return { success: true, liked: true }
    }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * 좋아요 여부 확인
 * @param {string} planId - 여행 계획 ID
 * @param {string} userId - 사용자 ID
 */
export const checkTripLiked = async (planId, userId = null) => {
  try {
    const sessionId = !userId ? localStorage.getItem('tripSessionId') : null
    
    if (!userId && !sessionId) {
      return { success: true, liked: false }
    }
    
    let query = supabase
      .from('trip_likes')
      .select('id')
      .eq('trip_id', planId)
    
    if (userId) {
      query = query.eq('user_id', userId)
    } else {
      query = query.eq('session_id', sessionId)
    }
    
    const { data, error } = await query.maybeSingle()
    
    if (error) {
      return { success: true, liked: false }
    }
    
    return { success: true, liked: !!data }
  } catch (err) {
    return { success: true, liked: false }
  }
}

// ===== 관리자용 함수들 =====

/**
 * 관리자용 - 모든 게시된 여행 계획 가져오기 (관리용)
 * @param {Object} options - 조회 옵션
 */
export const getAdminPublishedTrips = async ({ limit = 50, offset = 0 } = {}) => {
  try {
    const { data, error, count } = await supabase
      .from('trip_plans')
      .select(`
        id,
        title,
        description,
        start_date,
        end_date,
        is_published,
        published_at,
        view_count,
        like_count,
        thumbnail_url,
        author_nickname,
        created_at,
        user_id
      `, { count: 'exact' })
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (error) throw error
    
    const trips = data.map(trip => ({
      id: trip.id,
      title: trip.title,
      description: trip.description,
      startDate: trip.start_date,
      endDate: trip.end_date,
      isPublished: trip.is_published,
      publishedAt: trip.published_at,
      viewCount: trip.view_count || 0,
      likeCount: trip.like_count || 0,
      thumbnailUrl: trip.thumbnail_url,
      authorNickname: trip.author_nickname || '익명',
      createdAt: trip.created_at,
      userId: trip.user_id
    }))
    
    return { success: true, trips, totalCount: count }
  } catch (err) {
    return { success: false, error: err.message, trips: [] }
  }
}

/**
 * 관리자용 - 여행 계획 게시 상태 변경
 * @param {string} planId - 여행 계획 ID
 * @param {boolean} isPublished - 게시 상태
 */
export const adminUpdateTripPublishStatus = async (planId, isPublished) => {
  try {
    const updates = {
      is_published: isPublished,
      published_at: isPublished ? new Date().toISOString() : null
    }
    
    const { error } = await supabase
      .from('trip_plans')
      .update(updates)
      .eq('id', planId)
    
    if (error) throw error
    
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * 관리자용 - 여행 계획 정보 수정
 * @param {string} planId - 여행 계획 ID
 * @param {Object} updates - 수정할 데이터
 */
export const adminUpdateTrip = async (planId, updates) => {
  try {
    const updateData = {}
    
    if (updates.title !== undefined) updateData.title = updates.title
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.thumbnailUrl !== undefined) updateData.thumbnail_url = updates.thumbnailUrl
    if (updates.authorNickname !== undefined) updateData.author_nickname = updates.authorNickname
    
    const { error } = await supabase
      .from('trip_plans')
      .update(updateData)
      .eq('id', planId)
    
    if (error) throw error
    
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * 관리자용 - 여행 계획 삭제
 * @param {string} planId - 여행 계획 ID
 */
export const adminDeleteTrip = async (planId) => {
  try {
    // trip_likes 먼저 삭제 (외래키 제약)
    await supabase
      .from('trip_likes')
      .delete()
      .eq('trip_id', planId)
    
    // trip_places 삭제 (trip_days를 통해)
    const { data: days } = await supabase
      .from('trip_days')
      .select('id')
      .eq('plan_id', planId)
    
    if (days && days.length > 0) {
      const dayIds = days.map(d => d.id)
      await supabase
        .from('trip_places')
        .delete()
        .in('day_id', dayIds)
    }
    
    // trip_days 삭제
    await supabase
      .from('trip_days')
      .delete()
      .eq('plan_id', planId)
    
    // trip_plans 삭제
    const { error } = await supabase
      .from('trip_plans')
      .delete()
      .eq('id', planId)
    
    if (error) throw error
    
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * 게시된 여행 계획 통계
 */
export const getPublishedTripStats = async () => {
  try {
    const { count: totalCount } = await supabase
      .from('trip_plans')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true)
    
    const { data: topViewed } = await supabase
      .from('trip_plans')
      .select('id, title, view_count')
      .eq('is_published', true)
      .order('view_count', { ascending: false })
      .limit(1)
      .single()
    
    const { data: topLiked } = await supabase
      .from('trip_plans')
      .select('id, title, like_count')
      .eq('is_published', true)
      .order('like_count', { ascending: false })
      .limit(1)
      .single()
    
    // 총 조회수, 좋아요 합계
    const { data: statsData } = await supabase
      .from('trip_plans')
      .select('view_count, like_count')
      .eq('is_published', true)
    
    const totalViews = statsData?.reduce((sum, t) => sum + (t.view_count || 0), 0) || 0
    const totalLikes = statsData?.reduce((sum, t) => sum + (t.like_count || 0), 0) || 0
    
    return {
      success: true,
      stats: {
        totalCount: totalCount || 0,
        totalViews,
        totalLikes,
        topViewed: topViewed || null,
        topLiked: topLiked || null
      }
    }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * 장소 타입별 테이블에서 상세 정보 가져오기
 * @param {string} placeType - 장소 타입 (travel, food, culture 등)
 * @param {string} placeName - 장소 이름
 * @returns {Promise<Object>} { success, detail }
 */
export const getPlaceDetail = async (placeType, placeName) => {
  if (!placeType || !placeName) {
    return { success: false, error: '장소 정보가 없습니다.' }
  }
  
  // placeType에 따른 테이블 매핑
  const tableMap = {
    travel: { table: 'tour_spots', nameField: 'title' },
    food: { table: 'tour_spots', nameField: 'title' },
    culture: { table: 'tour_spots', nameField: 'title' },
    festival: { table: 'tour_festivals', nameField: 'title' },
    accommodation: { table: 'tour_spots', nameField: 'title' },
    shopping: { table: 'tour_spots', nameField: 'title' },
    leisure: { table: 'tour_spots', nameField: 'title' },
    medical: { table: 'medical_facilities', nameField: 'hsptlNm' }
  }
  
  const config = tableMap[placeType]
  if (!config) {
    return { success: false, error: `지원하지 않는 장소 타입입니다: ${placeType}` }
  }
  
  try {
    // 정확한 이름 매칭 시도
    let { data, error } = await supabase
      .from(config.table)
      .select('*')
      .eq(config.nameField, placeName)
      .limit(1)
      .maybeSingle()
    
    // 정확한 매칭 실패 시 부분 매칭 시도
    if (!data) {
      const { data: fuzzyData, error: fuzzyError } = await supabase
        .from(config.table)
        .select('*')
        .ilike(config.nameField, `%${placeName}%`)
        .limit(1)
        .maybeSingle()
      
      if (fuzzyError) throw fuzzyError
      data = fuzzyData
    }
    
    if (!data) {
      return { success: false, error: '장소 정보를 찾을 수 없습니다.' }
    }
    
    // 테이블 타입별 필드 매핑
    let mappedDetail = {
      id: data.id,
      type: placeType
    }
    
    if (placeType === 'travel' || placeType === 'food' || placeType === 'culture' || 
        placeType === 'accommodation' || placeType === 'shopping' || placeType === 'leisure') {
      // tour_spots 테이블 공통 매핑
      mappedDetail = {
        ...mappedDetail,
        name: data.title,
        address: data.addr1 || data.addr2,
        description: data.overview,
        tel: data.tel,
        homepage: data.homepage,
        imageUrl: data.firstimage || data.firstimage2,
        lat: data.mapy,
        lng: data.mapx,
        contentId: data.content_id,
        contentTypeId: data.content_type_id
      }
    } else if (placeType === 'festival') {
      // tour_festivals 테이블 매핑
      mappedDetail = {
        ...mappedDetail,
        name: data.title,
        address: data.addr1 || data.addr2 || data.eventplace,
        description: data.overview,
        tel: data.tel,
        homepage: data.homepage,
        period: `${data.event_start_date || ''} ~ ${data.event_end_date || ''}`,
        place: data.eventplace,
        imageUrl: data.firstimage || data.firstimage2,
        lat: data.mapy,
        lng: data.mapx,
        contentId: data.content_id
      }
    } else if (placeType === 'medical') {
      // medical_facilities 테이블 매핑
      mappedDetail = {
        ...mappedDetail,
        name: data.hsptlNm,
        address: data.locplc,
        description: data.hsptlKnd,
        tel: data.telno,
        imageUrl: data.imageUrl,
        lat: data.lat,
        lng: data.lng
      }
    } else {
      // 기타 타입
      mappedDetail = {
        ...mappedDetail,
        name: placeName,
        address: data.addr1 || data.address,
        description: data.overview || data.description,
        tel: data.tel,
        homepage: data.homepage,
        imageUrl: data.firstimage || data.firstimage2 || data.imageUrl,
        lat: data.mapy || data.lat,
        lng: data.mapx || data.lng
      }
    }
    
    return { success: true, detail: mappedDetail }
  } catch (err) {
    console.error('getPlaceDetail error:', err)
    return { success: false, error: err.message }
  }
}

// ===== 여행 계획 협업 기능 =====

// 초대 코드 생성 (랜덤 8자리)
const generateInviteCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// 초대 링크 생성
export const createTripInvite = async (planId, permission = 'edit') => {
  try {
    const inviteCode = generateInviteCode()
    
    // 기존 활성 초대 비활성화 (선택적)
    // await supabase.from('trip_invites').update({ is_active: false }).eq('plan_id', planId)
    
    const { data, error } = await supabase
      .from('trip_invites')
      .insert({
        plan_id: planId,
        invite_code: inviteCode,
        permission,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single()
    
    if (error) throw error
    
    return { 
      success: true, 
      invite: data,
      inviteUrl: `${window.location.origin}/my-trip?invite=${inviteCode}`
    }
  } catch (err) {
    console.error('createTripInvite error:', err)
    return { success: false, error: err.message }
  }
}

// 초대 코드로 초대 정보 조회
export const getTripInviteByCode = async (inviteCode) => {
  try {
    // 1단계: 초대 정보만 조회
    const { data: invite, error: inviteError } = await supabase
      .from('trip_invites')
      .select('*')
      .eq('invite_code', inviteCode)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single()
    
    if (inviteError) throw inviteError
    
    // 사용 횟수 확인
    if (invite.max_uses && invite.use_count >= invite.max_uses) {
      return { success: false, error: '초대 링크 사용 횟수가 초과되었습니다.' }
    }
    
    // 2단계: 여행 계획 정보 조회 (RLS 우회)
    const { data: plan, error: planError } = await supabase
      .from('trip_plans')
      .select('id, title, start_date, end_date, description, user_id')
      .eq('id', invite.plan_id)
      .single()
    
    if (planError) {
      console.warn('Plan fetch error (may be RLS):', planError)
      // RLS 정책 때문에 접근 못할 수 있으므로 기본 정보로 대체
      invite.trip_plans = {
        id: invite.plan_id,
        title: '여행 계획',
        start_date: null,
        end_date: null,
        description: null,
        user_id: invite.created_by
      }
    } else {
      invite.trip_plans = plan
    }
    
    return { success: true, invite }
  } catch (err) {
    console.error('getTripInviteByCode error:', err)
    return { success: false, error: '유효하지 않은 초대 링크입니다.' }
  }
}

// 초대 수락 (협업자로 등록)
export const acceptTripInvite = async (inviteCode) => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' }
    }
    
    // 초대 정보 조회
    const inviteResult = await getTripInviteByCode(inviteCode)
    if (!inviteResult.success) {
      return inviteResult
    }
    
    const invite = inviteResult.invite
    
    // 자기 자신의 여행인지 확인
    if (invite.trip_plans.user_id === user.id) {
      return { success: false, error: '자신의 여행에는 참여할 수 없습니다.' }
    }
    
    // 이미 협업자인지 확인
    const { data: existingCollab } = await supabase
      .from('trip_collaborators')
      .select('id')
      .eq('plan_id', invite.plan_id)
      .eq('user_id', user.id)
      .single()
    
    if (existingCollab) {
      return { success: false, error: '이미 참여 중인 여행입니다.' }
    }
    
    // 협업자로 등록
    const { error: collabError } = await supabase
      .from('trip_collaborators')
      .insert({
        plan_id: invite.plan_id,
        user_id: user.id,
        permission: invite.permission,
        invited_by: invite.created_by,
        accepted_at: new Date().toISOString()
      })
    
    if (collabError) throw collabError
    
    // 초대 사용 횟수 증가
    await supabase
      .from('trip_invites')
      .update({ use_count: invite.use_count + 1 })
      .eq('id', invite.id)
    
    return { 
      success: true, 
      planId: invite.plan_id,
      planTitle: invite.trip_plans.title
    }
  } catch (err) {
    console.error('acceptTripInvite error:', err)
    return { success: false, error: err.message }
  }
}

// 여행 계획의 협업자 목록 조회
export const getTripCollaborators = async (planId) => {
  try {
    const { data, error } = await supabase
      .from('trip_collaborators')
      .select(`
        *,
        users:user_id (
          id,
          raw_user_meta_data
        )
      `)
      .eq('plan_id', planId)
    
    if (error) throw error
    
    // 사용자 정보 매핑
    const collaborators = data.map(collab => ({
      id: collab.id,
      planId: collab.plan_id,
      userId: collab.user_id,
      permission: collab.permission,
      invitedAt: collab.invited_at,
      acceptedAt: collab.accepted_at,
      // Kakao 사용자 정보
      userName: collab.users?.raw_user_meta_data?.name || collab.users?.raw_user_meta_data?.full_name || '알 수 없음',
      userAvatar: toSecureUrl(collab.users?.raw_user_meta_data?.avatar_url || collab.users?.raw_user_meta_data?.picture)
    }))
    
    return { success: true, collaborators }
  } catch (err) {
    console.error('getTripCollaborators error:', err)
    return { success: false, error: err.message }
  }
}

// 협업자 권한 변경
export const updateCollaboratorPermission = async (collaboratorId, permission) => {
  try {
    const { error } = await supabase
      .from('trip_collaborators')
      .update({ permission })
      .eq('id', collaboratorId)
    
    if (error) throw error
    
    return { success: true }
  } catch (err) {
    console.error('updateCollaboratorPermission error:', err)
    return { success: false, error: err.message }
  }
}

// 협업자 제거
export const removeCollaborator = async (collaboratorId) => {
  try {
    const { error } = await supabase
      .from('trip_collaborators')
      .delete()
      .eq('id', collaboratorId)
    
    if (error) throw error
    
    return { success: true }
  } catch (err) {
    console.error('removeCollaborator error:', err)
    return { success: false, error: err.message }
  }
}

// 협업자 스스로 나가기
export const leaveTrip = async (planId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' }
    }
    
    const { error } = await supabase
      .from('trip_collaborators')
      .delete()
      .eq('plan_id', planId)
      .eq('user_id', user.id)
    
    if (error) throw error
    
    return { success: true }
  } catch (err) {
    console.error('leaveTrip error:', err)
    return { success: false, error: err.message }
  }
}

// 초대 링크 비활성화
export const deactivateTripInvite = async (inviteId) => {
  try {
    const { error } = await supabase
      .from('trip_invites')
      .update({ is_active: false })
      .eq('id', inviteId)
    
    if (error) throw error
    
    return { success: true }
  } catch (err) {
    console.error('deactivateTripInvite error:', err)
    return { success: false, error: err.message }
  }
}

// 여행 계획의 활성 초대 목록 조회
export const getTripInvites = async (planId) => {
  try {
    const { data, error } = await supabase
      .from('trip_invites')
      .select('*')
      .eq('plan_id', planId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    return { success: true, invites: data }
  } catch (err) {
    console.error('getTripInvites error:', err)
    return { success: false, error: err.message }
  }
}

// 사용자가 협업 중인 여행 목록 조회 (내가 만든 것이 아닌 공유받은 여행)
// RLS 순환 참조 방지를 위해 2단계 쿼리로 변경
export const getCollaboratedTrips = async (userId) => {
  try {
    if (!userId) {
      return { success: true, plans: [] }
    }
    
    // 1단계: 내가 협업 중인 plan_id 목록만 조회
    const { data: collaborations, error: collabError } = await supabase
      .from('trip_collaborators')
      .select('plan_id, permission')
      .eq('user_id', userId)
    
    if (collabError) throw collabError
    
    if (!collaborations || collaborations.length === 0) {
      return { success: true, plans: [] }
    }
    
    // 2단계: 해당 plan_id들의 상세 정보 조회
    const planIds = collaborations.map(c => c.plan_id)
    const { data: plans, error: plansError } = await supabase
      .from('trip_plans')
      .select(`
        *,
        trip_days (
          *,
          trip_places (*)
        )
      `)
      .in('id', planIds)
      .order('created_at', { ascending: false })
    
    if (plansError) throw plansError
    
    // 권한 정보 매핑
    const permissionMap = {}
    collaborations.forEach(c => {
      permissionMap[c.plan_id] = c.permission
    })
    
    // 데이터 형식 변환
    const formattedPlans = (plans || []).map(plan => ({
      id: plan.id,
      userId: plan.user_id,
      title: plan.title,
      startDate: plan.start_date,
      endDate: plan.end_date,
      description: plan.description,
      accommodationName: plan.accommodation_name,
      accommodationAddress: plan.accommodation_address,
      createdAt: plan.created_at,
      isCollaborated: true, // 협업 여행 표시
      myPermission: permissionMap[plan.id] || 'view', // 내 권한
      days: plan.trip_days?.sort((a, b) => a.day_number - b.day_number).map(day => ({
        id: day.id,
        planId: day.plan_id,
        dayNumber: day.day_number,
        date: day.date,
        places: day.trip_places?.sort((a, b) => a.order_index - b.order_index).map(place => ({
          id: place.id,
          dayId: place.day_id,
          placeType: place.place_type,
          placeName: place.place_name,
          placeAddress: place.place_address,
          placeDescription: place.place_description,
          placeImage: place.place_image,
          orderIndex: place.order_index,
          visitTime: place.visit_time,
          memo: place.memo,
          transportToNext: place.transport_to_next
        })) || []
      })) || []
    }))
    
    return { success: true, plans: formattedPlans }
  } catch (err) {
    console.error('getCollaboratedTrips error:', err)
    return { success: false, error: err.message }
  }
}

// 내 여행 + 협업 여행 모두 조회
export const getAllMyTrips = async (userId) => {
  try {
    if (!userId || userId === 'anonymous') {
      const localPlans = JSON.parse(localStorage.getItem('tripPlans') || '[]')
      return { success: true, plans: localPlans, collaboratedPlans: [] }
    }
    
    // 내 여행과 협업 여행 동시 조회
    const [myTripsResult, collabTripsResult] = await Promise.all([
      getUserTripPlans(userId),
      getCollaboratedTrips(userId)
    ])
    
    return {
      success: true,
      plans: myTripsResult.success ? myTripsResult.plans : [],
      collaboratedPlans: collabTripsResult.success ? collabTripsResult.plans : []
    }
  } catch (err) {
    console.error('getAllMyTrips error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * 특정 장소가 포함된 게시된 여행 코스 찾기
 * @param {string} placeName - 장소 이름
 * @param {string} contentId - 장소 contentId (선택)
 * @param {number} limit - 최대 개수 (기본 5)
 */
export const getTripsContainingPlace = async (placeName, contentId = null, limit = 5) => {
  try {
    // 1. trip_places에서 해당 장소가 포함된 day_id 찾기
    let query = supabase
      .from('trip_places')
      .select('day_id, place_name, place_address')
    
    // contentId가 있으면 place_name에 contentId 포함 여부로 검색 (정확한 매칭)
    // 없으면 place_name으로 검색
    if (contentId) {
      // place_name에 contentId가 포함되어 있거나, 이름이 일치하는 경우
      query = query.or(`place_name.ilike.%${placeName}%,place_address.ilike.%${contentId}%`)
    } else {
      query = query.ilike('place_name', `%${placeName}%`)
    }
    
    const { data: placesData, error: placesError } = await query
    
    if (placesError) throw placesError
    if (!placesData || placesData.length === 0) {
      return { success: true, trips: [] }
    }
    
    // 2. day_id로 trip_days에서 plan_id 찾기
    const dayIds = [...new Set(placesData.map(p => p.day_id))]
    
    const { data: daysData, error: daysError } = await supabase
      .from('trip_days')
      .select('plan_id')
      .in('id', dayIds)
    
    if (daysError) throw daysError
    if (!daysData || daysData.length === 0) {
      return { success: true, trips: [] }
    }
    
    // 3. 게시된 여행 계획만 가져오기
    const planIds = [...new Set(daysData.map(d => d.plan_id))]
    
    const { data: plansData, error: plansError } = await supabase
      .from('trip_plans')
      .select(`
        id,
        title,
        description,
        thumbnail_url,
        author_nickname,
        view_count,
        like_count,
        published_at,
        trip_days (
          id,
          day_number,
          trip_places (
            place_name,
            place_image
          )
        )
      `)
      .in('id', planIds)
      .eq('is_published', true)
      .order('view_count', { ascending: false })
      .limit(limit)
    
    if (plansError) throw plansError
    
    // 데이터 변환
    const trips = (plansData || []).map(plan => {
      const allPlaces = plan.trip_days?.flatMap(day => 
        (day.trip_places || []).map(p => p.place_name)
      ) || []
      
      return {
        id: plan.id,
        title: plan.title,
        description: plan.description,
        thumbnailUrl: plan.thumbnail_url,
        authorNickname: plan.author_nickname || '익명',
        viewCount: plan.view_count || 0,
        likeCount: plan.like_count || 0,
        publishedAt: plan.published_at,
        daysCount: plan.trip_days?.length || 0,
        placesPreview: allPlaces.slice(0, 4)
      }
    })
    
    return { success: true, trips }
  } catch (err) {
    console.error('getTripsContainingPlace error:', err)
    return { success: false, error: err.message, trips: [] }
  }
}