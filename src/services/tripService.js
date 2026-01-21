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
  memo
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
            placeDescription,
            placeImage,
            orderIndex,
            visitTime,
            memo
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
        memo
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
        placeDescription: data.place_description,
        placeImage: data.place_image,
        orderIndex: data.order_index,
        visitTime: data.visit_time,
        memo: data.memo
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
