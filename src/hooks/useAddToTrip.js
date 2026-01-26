import { useState, useCallback } from 'react'
import { getUserTripPlans, addTripPlace, addTripDay } from '../services/tripService'

/**
 * 여행 계획에 장소 추가하는 커스텀 훅
 * @param {Object} user - 현재 로그인된 사용자 객체
 * @param {string} language - 현재 언어 ('ko' | 'en')
 * @returns {Object} 모달 상태 및 함수들
 */
export const useAddToTrip = (user, language = 'ko') => {
  // 모달 상태
  const [showModal, setShowModal] = useState(false)
  const [tripPlans, setTripPlans] = useState([])
  const [tripPlansLoading, setTripPlansLoading] = useState(false)
  const [selectedTripId, setSelectedTripId] = useState(null)
  const [selectedDayId, setSelectedDayId] = useState(null)
  const [currentPlace, setCurrentPlace] = useState(null)
  const [addingPlace, setAddingPlace] = useState(false)
  const [addSuccess, setAddSuccess] = useState(false)

  // 모달 열기 (여행 목록 로드)
  const openModal = useCallback(async (place) => {
    if (!user) {
      alert(language === 'ko' 
        ? '로그인이 필요합니다.' 
        : 'Please login first.')
      return false
    }

    setCurrentPlace(place)
    setShowModal(true)
    setSelectedTripId(null)
    setSelectedDayId(null)
    setAddSuccess(false)
    setTripPlansLoading(true)

    try {
      const result = await getUserTripPlans(user.id)
      if (result.success) {
        setTripPlans(result.plans || [])
      }
    } catch (err) {
      console.error('여행 계획 로드 실패:', err)
    } finally {
      setTripPlansLoading(false)
    }
    
    return true
  }, [user, language])

  // 모달 닫기
  const closeModal = useCallback(() => {
    setShowModal(false)
    setCurrentPlace(null)
    setSelectedTripId(null)
    setSelectedDayId(null)
    setAddSuccess(false)
  }, [])

  // 여행 계획 선택
  const selectTrip = useCallback((tripId) => {
    setSelectedTripId(tripId)
    setSelectedDayId(null)
  }, [])

  // 일정 선택
  const selectDay = useCallback((dayId) => {
    setSelectedDayId(dayId)
  }, [])

  // 장소 추가 실행
  const addPlace = useCallback(async () => {
    if (!selectedDayId || !currentPlace) {
      alert(language === 'ko' 
        ? '일정을 선택해주세요.' 
        : 'Please select a day.')
      return false
    }

    setAddingPlace(true)

    try {
      // 선택된 일정의 장소 개수 확인
      const selectedTrip = tripPlans.find(t => t.id === selectedTripId)
      const selectedDay = selectedTrip?.days?.find(d => d.id === selectedDayId)
      const orderIndex = selectedDay?.places?.length || 0

      const placeData = {
        placeName: currentPlace.title || currentPlace.name,
        placeType: currentPlace.type || 'travel',
        address: currentPlace.address || currentPlace.addr1,
        lat: currentPlace.lat || currentPlace.mapY || currentPlace.mapy,
        lng: currentPlace.lng || currentPlace.mapX || currentPlace.mapx,
        imageUrl: currentPlace.imageUrl || currentPlace.firstimage || currentPlace.image,
        contentId: currentPlace.contentId || currentPlace.contentid,
        orderIndex
      }

      const result = await addTripPlace(selectedDayId, placeData)
      
      if (result.success) {
        setAddSuccess(true)
        // 2초 후 모달 닫기
        setTimeout(() => {
          closeModal()
        }, 1500)
        return true
      } else {
        alert(result.error || (language === 'ko' ? '추가 실패' : 'Failed to add'))
        return false
      }
    } catch (err) {
      console.error('장소 추가 실패:', err)
      alert(language === 'ko' 
        ? '장소 추가에 실패했습니다.' 
        : 'Failed to add place.')
      return false
    } finally {
      setAddingPlace(false)
    }
  }, [selectedDayId, selectedTripId, currentPlace, tripPlans, language, closeModal])

  // 선택된 여행 계획 정보
  const selectedTrip = tripPlans.find(t => t.id === selectedTripId)

  return {
    // 상태
    showModal,
    tripPlans,
    tripPlansLoading,
    selectedTripId,
    selectedDayId,
    selectedTrip,
    currentPlace,
    addingPlace,
    addSuccess,
    
    // 함수
    openModal,
    closeModal,
    selectTrip,
    selectDay,
    addPlace,
    setSelectedDayId
  }
}

export default useAddToTrip
