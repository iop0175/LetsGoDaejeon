import { memo } from 'react'
import { FiCloud, FiDatabase, FiActivity, FiRefreshCw, FiExternalLink } from 'react-icons/fi'

/**
 * Supabase 사용량 통계 컴포넌트
 */
const SupabaseUsageStats = memo(({
  usage,
  loading,
  onRefresh,
  language = 'ko',
  dashboardUrl = ''
}) => {
  return (
    <div className="supabase-usage-section">
      <div className="usage-header">
        <h3><FiCloud /> {language === 'ko' ? 'Supabase 사용량' : 'Supabase Usage'}</h3>
        <button onClick={onRefresh} className="refresh-btn" disabled={loading}>
          <FiRefreshCw className={loading ? 'spinning' : ''} />
        </button>
      </div>
      
      {loading ? (
        <div className="usage-loading">
          {language === 'ko' ? '로딩 중...' : 'Loading...'}
        </div>
      ) : usage ? (
        <>
          {/* 총 사용량 요약 */}
          <div className="usage-summary">
            <div className="usage-card">
              <div className="usage-icon"><FiDatabase /></div>
              <div className="usage-info">
                <span className="usage-label">{language === 'ko' ? '총 데이터 행 수' : 'Total Rows'}</span>
                <span className="usage-value">{usage.totalRows.toLocaleString()}</span>
                <div className="usage-bar-container">
                  <div 
                    className="usage-bar" 
                    style={{ width: `${Math.min(usage.usage.rowsPercent, 100)}%` }}
                  />
                </div>
                <span className="usage-limit">
                  / {usage.limits.rows.max.toLocaleString()} ({usage.usage.rowsPercent.toFixed(1)}%)
                </span>
              </div>
            </div>
            
            <div className="usage-card">
              <div className="usage-icon"><FiActivity /></div>
              <div className="usage-info">
                <span className="usage-label">{language === 'ko' ? '예상 저장 용량' : 'Est. Storage'}</span>
                <span className="usage-value">{usage.estimatedStorageMB.toFixed(2)} MB</span>
                <div className="usage-bar-container">
                  <div 
                    className="usage-bar storage" 
                    style={{ width: `${Math.min(usage.usage.storagePercent, 100)}%` }}
                  />
                </div>
                <span className="usage-limit">
                  / 500 MB ({usage.usage.storagePercent.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
          
          {/* 테이블별 사용량 */}
          <div className="table-usage-list">
            <h4>{language === 'ko' ? '테이블별 행 수' : 'Rows by Table'}</h4>
            <div className="table-usage-grid">
              {Object.entries(usage.tables).map(([tableName, info]) => (
                <div key={tableName} className="table-usage-item">
                  <span className="table-name">{tableName}</span>
                  <span className="table-rows">{info.rows.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Free Plan 안내 */}
          <div className="free-plan-notice">
            <span>ℹ️ </span>
            {language === 'ko' 
              ? 'Supabase Free Plan: 500MB DB 스토리지, 2GB 대역폭/월' 
              : 'Supabase Free Plan: 500MB DB storage, 2GB bandwidth/month'
            }
            {dashboardUrl && (
              <a href={dashboardUrl} target="_blank" rel="noopener noreferrer">
                <FiExternalLink /> {language === 'ko' ? '대시보드 열기' : 'Open Dashboard'}
              </a>
            )}
          </div>
        </>
      ) : (
        <div className="usage-empty">
          {language === 'ko' ? '사용량 정보를 불러올 수 없습니다.' : 'Unable to load usage information.'}
        </div>
      )}
    </div>
  )
})

SupabaseUsageStats.displayName = 'SupabaseUsageStats'

export default SupabaseUsageStats
