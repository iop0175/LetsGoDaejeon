import { useState, useEffect } from 'react'
// CSS는 _app.jsx에서 import

// 카카오톡 채널 아이콘 SVG
const KakaoIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
    <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.47 1.607 4.647 4.042 5.877l-.992 3.682c-.052.194.017.4.175.514.158.114.37.123.537.023L10.1 17.77c.623.087 1.26.133 1.9.133 5.523 0 10-3.477 10-7.5S17.523 3 12 3z"/>
  </svg>
)

const KakaoChannelButton = ({ channelUrl = 'http://pf.kakao.com/_xnxgxkAX' }) => {
  const [isVisible, setIsVisible] = useState(true)
  const [showTooltip, setShowTooltip] = useState(false)

  // 스크롤 시 버튼 표시 여부 (선택적)
  useEffect(() => {
    const handleScroll = () => {
      // 항상 표시하거나, 특정 스크롤 위치 이후에만 표시하도록 설정 가능
      setIsVisible(true)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleClick = () => {
    window.open(channelUrl, '_blank', 'noopener,noreferrer')
  }

  if (!isVisible) return null

  return (
    <div className="kakao-channel-container">
      {showTooltip && (
        <div className="kakao-channel-tooltip">
          카카오톡 채널 문의
        </div>
      )}
      <button
        className="kakao-channel-button"
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label="카카오톡 채널 문의"
      >
        <KakaoIcon />
      </button>
    </div>
  )
}

export default KakaoChannelButton
