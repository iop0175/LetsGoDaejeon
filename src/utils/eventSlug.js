import { generateSlug } from './slugUtils.js'

export const eventSlug = (event) => {
  const date = String(event.start_date || event.beginDate || '').replace(/\D/g, '').slice(0, 8) || 'event'
  return generateSlug(event.title || 'event', date)
}
