import { memo } from 'react'
import { FiExternalLink, FiCloud, FiDatabase } from 'react-icons/fi'

/**
 * 대시보드 통계 카드 컴포넌트
 * @param {string} title - 카드 제목
 * @param {number} value - API 데이터 개수
 * @param {number} dbValue - DB 데이터 개수
 * @param {Component} icon - 아이콘 컴포넌트
 * @param {string} color - 테마 색상
 * @param {boolean} loading - 로딩 상태
 * @param {boolean} apiNotLoaded - API 조회 전 여부
 * @param {Function} onClick - 클릭 핸들러
 */
const StatCard = memo(({ title, value, dbValue, icon: Icon, color, loading, apiNotLoaded, onClick }) => (
  <div 
    className={`stat-card ${onClick ? 'clickable' : ''}`}
    onClick={onClick}
  >
    <div className="stat-icon" style={{ background: `${color}20`, color }}>
      <Icon />
    </div>
    <div className="stat-info">
      <span className="stat-label">{title}</span>
      <div className="stat-values">
        <div className="stat-row api">
          <FiCloud className="stat-type-icon" />
          <span className="stat-type-label">API</span>
          <span className={`stat-value ${apiNotLoaded ? 'not-loaded' : ''}`}>
            {loading ? '...' : apiNotLoaded ? '-' : (value || 0).toLocaleString()}
          </span>
        </div>
        <div className="stat-row db">
          <FiDatabase className="stat-type-icon" />
          <span className="stat-type-label">DB</span>
          <span className="stat-value">
            {loading ? '...' : (dbValue || 0).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
    {onClick && <FiExternalLink className="stat-link" />}
  </div>
))

StatCard.displayName = 'StatCard'

export default StatCard
