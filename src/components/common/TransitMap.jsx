import { useEffect, useRef, useState } from 'react'
import { CITY } from '../../config/cities'

const EMPTY_POINTS = []
const CENTERS = { daejeon: [36.3504, 127.3845], jeju: [33.38, 126.55] }

export default function TransitMap({ points = EMPTY_POINTS, traffic = false, label = '교통 지도' }) {
  const container = useRef(null)
  const mapRef = useRef(null)
  const fitted = useRef(false)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [showTraffic, setShowTraffic] = useState(traffic)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    let active = true
    const initialize = () => {
      if (!window.kakao?.maps?.Map || mapRef.current || !active) return
      const maps = window.kakao.maps
      const [lat, lon] = CENTERS[CITY.key] || CENTERS.daejeon
      mapRef.current = new maps.Map(container.current, { center: new maps.LatLng(lat, lon), level: CITY.key === 'jeju' ? 10 : 7 })
      mapRef.current.addControl(new maps.ZoomControl(), maps.ControlPosition.RIGHT)
      setReady(true)
      setFailed(false)
    }
    initialize()
    window.addEventListener('kakaoMapLoaded', initialize)
    const timer = setTimeout(() => { if (!mapRef.current) setFailed(true) }, 15000)
    const observer = new ResizeObserver(() => mapRef.current?.relayout())
    observer.observe(container.current)
    return () => {
      active = false
      clearTimeout(timer)
      observer.disconnect()
      window.removeEventListener('kakaoMapLoaded', initialize)
      mapRef.current = null
      fitted.current = false
    }
  }, [])

  useEffect(() => {
    if (!ready || !mapRef.current) return
    const maps = window.kakao.maps
    if (showTraffic) mapRef.current.addOverlayMapTypeId(maps.MapTypeId.TRAFFIC)
    else mapRef.current.removeOverlayMapTypeId(maps.MapTypeId.TRAFFIC)
  }, [ready, showTraffic])

  useEffect(() => {
    if (!ready || !mapRef.current) return
    const maps = window.kakao.maps
    const bounds = new maps.LatLngBounds()
    const overlays = points.filter((point) => Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lon)) && Number(point.lat) > 32 && Number(point.lat) < 39 && Number(point.lon) > 124 && Number(point.lon) < 132).map((point) => {
      const position = new maps.LatLng(Number(point.lat), Number(point.lon))
      const button = document.createElement('button')
      button.type = 'button'
      button.className = `transit-map__pin transit-map__pin--${['bus', 'event', 'place'].includes(point.kind) ? point.kind : 'stop'}`
      button.textContent = point.kind === 'bus' ? '버스' : point.kind === 'event' ? '!' : point.kind === 'place' ? '여기' : '●'
      button.setAttribute('aria-label', point.name)
      button.title = point.name
      button.onclick = () => setSelected(point)
      bounds.extend(position)
      return new maps.CustomOverlay({ map: mapRef.current, position, content: button, yAnchor: 1, zIndex: point.kind === 'bus' ? 3 : 1 })
    })
    if (overlays.length && !fitted.current) {
      mapRef.current.setBounds(bounds)
      if (overlays.length === 1) mapRef.current.setLevel(4)
      fitted.current = true
    }
    return () => overlays.forEach((overlay) => overlay.setMap(null))
  }, [ready, points])

  return (
    <div className="transit-map">
      <div className="transit-map__toolbar">
        <strong>{label}</strong>
        <label><input type="checkbox" checked={showTraffic} onChange={(event) => setShowTraffic(event.target.checked)} />도로 소통 색상</label>
      </div>
      <div ref={container} className="transit-map__canvas" role="region" aria-label={label} data-map-ready={ready} />
      {!ready && <p className="bt-note" role="status">{failed ? '지도를 불러오지 못했습니다. 아래 목록에서 정보를 확인해 주세요.' : '지도를 불러오는 중입니다.'}</p>}
      {selected && <p className="transit-map__selection" role="status"><strong>{selected.name}</strong>{selected.detail && ` · ${selected.detail}`}<button type="button" onClick={() => setSelected(null)} aria-label="선택 정보 닫기">닫기</button></p>}
      <p className="bt-note">도로 색상은 카카오맵 실시간 교통정보입니다. 초록 원활 · 노랑 서행 · 빨강 정체. 지도 표식을 누르면 상세 정보가 나옵니다.</p>
    </div>
  )
}
