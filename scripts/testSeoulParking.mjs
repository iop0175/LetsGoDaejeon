import assert from 'node:assert/strict'
import { normalizeSeoulParking } from '../pages/api/parking.js'

const parking = normalizeSeoulParking({
  PKLT_NM: '테스트 공영주차장',
  PKLT_CD: 'P-1',
  ADDR: '서울특별시 종로구 세종대로 1',
  PKLT_KND_NM: '노외 주차장',
  TPKCT: 42,
  CHGD_FREE_NM: '유료',
  WD_OPER_BGNG_TM: '0900',
  WD_OPER_END_TM: '2400',
  PRK_HM: 5,
  PRK_CRG: 100,
  ADD_UNIT_TM_MNT: 5,
  ADD_CRG: 100,
  LAT: 37.57,
  LOT: 126.98
})

assert.deepEqual(
  {
    name: parking.name,
    type: parking.parkingType,
    category: parking.parkingCategory,
    capacity: parking.totalLot,
    open: parking.weekdayOpen,
    close: parking.weekdayClose,
    charge: parking.basicCharge,
    lat: parking.lat,
    lon: parking.lon
  },
  {
    name: '테스트 공영주차장',
    type: '공영',
    category: '노외 주차장',
    capacity: 42,
    open: '09:00',
    close: '24:00',
    charge: 100,
    lat: 37.57,
    lon: 126.98
  }
)

console.log('Seoul parking normalization: passed')
