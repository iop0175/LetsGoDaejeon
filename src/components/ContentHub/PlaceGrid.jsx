import Image from 'next/image'
import Link from 'next/link'
import { generateLocalizedSlug } from '../../utils/slugUtils'
import { getReliableImageUrl } from '../../utils/imageUtils'

export default function PlaceGrid({ items = [], locale = 'kr' }) {
  if (!items.length) return null
  return (
    <div className="content-hub__places">
      {items.map((item, index) => {
        const name = locale === 'en' ? (item.nameEn || item.name) : item.name
        const address = locale === 'en' ? (item.addressEn || item.address) : item.address
        const slug = generateLocalizedSlug({ title: item.name, titleEn: item.nameEn, contentId: item.contentId }, locale)
        return (
          <Link href={`/spot/${slug}`} className="content-hub__place" key={item.contentId || index}>
            <div className="content-hub__place-image">
              <Image src={getReliableImageUrl(item.image, '/images/no-image.svg')} alt={name || ''} fill sizes="(max-width: 720px) 100vw, 33vw" />
            </div>
            <div className="content-hub__place-copy">
              <span className="content-hub__number">{String(index + 1).padStart(2, '0')}</span>
              <h3>{name}</h3>
              {address && <p>{address}</p>}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
