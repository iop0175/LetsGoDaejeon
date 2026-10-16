import { useState } from 'react'
import { useRouter } from 'next/router'
import { FiShare2, FiLink } from 'react-icons/fi'

export default function ShareButtons({ title, text }) {
  const { locale } = useRouter()
  const en = locale === 'en'
  const [copied, setCopied] = useState(false)
  const share = async () => {
    const url = window.location.href
    if (navigator.share) {
      try { await navigator.share({ title, text, url }); return } catch {}
    }
    await navigator.clipboard.writeText(url)
    setCopied(true)
  }
  const copy = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
  }
  return (
    <div className="content-hub__share">
      <button type="button" onClick={share}><FiShare2 /> {en ? 'Share' : '공유'}</button>
      <button type="button" onClick={copy}><FiLink /> {copied ? (en ? 'Copied' : '복사됨') : (en ? 'Copy link' : '링크 복사')}</button>
    </div>
  )
}
