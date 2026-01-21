import { supabase } from './supabase'

// ===== 여행 계획 (Trip Plans) =====

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
    const { data, error } = await supabase
      .from('trip_plans')
      .update({
        is_published: false,
        published_at: null
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
    
    // 상세 조회
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
    travel: { table: 'travel_spots', nameField: 'tourspotNm' },
    food: { table: 'restaurants', nameField: 'restrntNm' },
    culture: { table: 'cultural_facilities', nameField: 'fcltyNm' },
    festival: { table: 'festivals', nameField: 'title' },
    accommodation: { table: 'accommodations', nameField: 'romsNm' },
    shopping: { table: 'shopping_places', nameField: 'shppgNm' },
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
    
    // raw_data가 있으면 그것을 사용, 없으면 원본 데이터 사용
    const detail = data.raw_data || data
    
    // 테이블 타입별 필드 매핑
    let mappedDetail = {
      id: data.id,
      type: placeType
    }
    
    if (placeType === 'travel') {
      mappedDetail = {
        ...mappedDetail,
        name: detail.tourspotNm,
        address: detail.roadAddr || detail.addr || detail.address,
        description: detail.mainFclty || detail.description,
        tel: detail.telNo,
        homepage: detail.homepage,
        operatingHours: detail.operTime,
        closedDays: detail.clsInfo || detail.closedDays,
        fee: detail.fee || detail.useFee,
        imageUrl: data.imageUrl || detail.imgUrl || detail.imageUrl,
        lat: detail.lat,
        lng: detail.lng
      }
    } else if (placeType === 'food') {
      mappedDetail = {
        ...mappedDetail,
        name: detail.restrntNm,
        address: detail.roadAddr || detail.addr,
        description: detail.restrntTypeSpcl || detail.description,
        tel: detail.telNo,
        menu: detail.menuNm,
        operatingHours: detail.operTime,
        closedDays: detail.closedDays,
        price: detail.avgPrice,
        imageUrl: data.imageUrl || detail.imgUrl || detail.imageUrl,
        lat: detail.lat,
        lng: detail.lng
      }
    } else if (placeType === 'culture') {
      mappedDetail = {
        ...mappedDetail,
        name: detail.fcltyNm,
        address: detail.roadAddr || detail.addr,
        description: detail.description,
        tel: detail.telNo,
        homepage: detail.homepage,
        operatingHours: detail.operTime,
        closedDays: detail.closedDays,
        fee: detail.fee || detail.useFee,
        imageUrl: data.imageUrl || detail.imgUrl || detail.imageUrl,
        lat: detail.lat,
        lng: detail.lng
      }
    } else if (placeType === 'festival') {
      mappedDetail = {
        ...mappedDetail,
        name: detail.title,
        address: detail.roadAddr || detail.addr || detail.eventplace,
        description: detail.summary || detail.description,
        tel: detail.telNo || detail.eventhomepage,
        period: detail.opar,
        place: detail.eventplace,
        imageUrl: data.imageUrl || detail.imgUrl || detail.imageUrl,
        lat: detail.lat,
        lng: detail.lng
      }
    } else {
      // 기타 타입 (accommodation, shopping, medical 등)
      mappedDetail = {
        ...mappedDetail,
        name: placeName,
        address: detail.roadAddr || detail.addr || detail.address,
        description: detail.description,
        tel: detail.telNo,
        homepage: detail.homepage,
        operatingHours: detail.operTime,
        imageUrl: data.imageUrl || detail.imgUrl || detail.imageUrl,
        lat: detail.lat,
        lng: detail.lng
      }
    }
    
    return { success: true, detail: mappedDetail }
  } catch (err) {
    console.error('getPlaceDetail error:', err)
    return { success: false, error: err.message }
  }
}