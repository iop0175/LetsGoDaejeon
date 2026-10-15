export const getDirectionsUrl = (language, { name = '', address = '', lat, lng } = {}) => {
  const hasCoordinates = lat !== undefined && lat !== null && lat !== ''
    && lng !== undefined && lng !== null && lng !== ''
    && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
  const destination = hasCoordinates ? `${Number(lat)},${Number(lng)}` : address || name

  if (language === 'en') {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
  }

  return hasCoordinates && name
    ? `https://map.kakao.com/link/to/${encodeURIComponent(name)},${Number(lat)},${Number(lng)}`
    : `https://map.kakao.com/link/search/${encodeURIComponent(destination)}`
}
