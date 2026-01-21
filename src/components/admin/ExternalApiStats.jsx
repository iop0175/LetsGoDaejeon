import { memo, useState, useEffect } from 'react'
import { FiActivity, FiRefreshCw, FiTrendingUp, FiAlertCircle, FiCheckCircle, FiDatabase, FiCloud, FiZap } from 'react-icons/fi'
import { FaMap, FaBus } from 'react-icons/fa'
import { getKakaoApiStats } from '../../services/kakaoMobilityService'
import { getOdsayApiStats } from '../../services/odsayService'
import { getTodayApiStats, getApiCallSummary, getApiStatsByPeriod, API_TYPES } from '../../services/dbService'

/**
 * 외부 API 사용량 통계 컴포넌트 (카카오, ODsay)
 * DB 기반 통계 + 로컬 메모리 통계 모두 표시
 */
const ExternalApiStats = memo(({ language = 'ko' }) => {
  const [kakaoStats, setKakaoStats] = useState(null)
  const [odsayStats, setOdsayStats] = useState(null)
  const [dbStats, setDbStats] = useState(null)
  const [dbSummary, setDbSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  
  const loadStats = async () => {
    setLoading(true)
    try {
      // 로컬 메모리 통계
      const kakao = getKakaoApiStats()
      const odsay = getOdsayApiStats()
      setKakaoStats(kakao)
      setOdsayStats(odsay)
      
      // DB 기반 통계
      const todayStats = await getTodayApiStats()
      const summary = await getApiCallSummary()
      setDbStats(todayStats)
      setDbSummary(summary)
    } catch (err) {
      console.error('API 통계 로드 실패:', err)
    }
    setLoading(false)
  }
  
  useEffect(() => {
    loadStats()
    // 30초마다 자동 새로고침
    const interval = setInterval(loadStats, 30000)
    return () => clearInterval(interval)
  }, [])
  
  const getUsageLevel = (percent) => {
    if (percent >= 90) return 'critical'
    if (percent >= 70) return 'warning'
    return 'normal'
  }
  
  return (
    <div className="external-api-stats-section">
      <div className="api-stats-header">
        <h3>
          <FiActivity />
          {language === 'ko' ? '외부 API 사용량' : 'External API Usage'}
        </h3>
        <button onClick={loadStats} className="refresh-btn" disabled={loading}>
          <FiRefreshCw className={loading ? 'spinning' : ''} />
        </button>
      </div>
      
      {/* DB 기반 통계 요약 */}
      {dbSummary?.success && (
        <div className="db-stats-summary">
          <div className="db-summary-card">
            <FiCloud className="summary-icon" />
            <div className="summary-content">
              <span className="summary-label">{language === 'ko' ? '오늘 총 호출' : "Today's Total"}</span>
              <span className="summary-value">{dbSummary.today?.totalCalls || 0}</span>
            </div>
          </div>
          <div className="db-summary-card">
            <FiDatabase className="summary-icon cache" />
            <div className="summary-content">
              <span className="summary-label">{language === 'ko' ? '캐시 히트' : 'Cache Hits'}</span>
              <span className="summary-value">{dbSummary.today?.cacheHits || 0}</span>
            </div>
          </div>
          <div className="db-summary-card">
            <FiZap className="summary-icon actual" />
            <div className="summary-content">
              <span className="summary-label">{language === 'ko' ? '실제 API 호출' : 'Actual API Calls'}</span>
              <span className="summary-value highlight">{dbSummary.today?.actualApiCalls || 0}</span>
            </div>
          </div>
          <div className="db-summary-card">
            <FiTrendingUp className="summary-icon rate" />
            <div className="summary-content">
              <span className="summary-label">{language === 'ko' ? '캐시 히트율' : 'Cache Hit Rate'}</span>
              <span className={`summary-value ${(dbSummary.today?.cacheHitRate || 0) >= 50 ? 'success' : ''}`}>
                {dbSummary.today?.cacheHitRate || 0}%
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* 7일간 통계 */}
      {dbSummary?.success && dbSummary.week && (
        <div className="week-stats-bar">
          <span className="week-label">📊 {language === 'ko' ? '최근 7일' : 'Last 7 Days'}:</span>
          <span className="week-stat">{language === 'ko' ? '총' : 'Total'} <strong>{dbSummary.week.totalCalls}</strong></span>
          <span className="week-stat">{language === 'ko' ? '캐시' : 'Cache'} <strong>{dbSummary.week.cacheHits}</strong></span>
          <span className="week-stat">{language === 'ko' ? '실제' : 'Actual'} <strong>{dbSummary.week.actualApiCalls}</strong></span>
          <span className="week-stat">{language === 'ko' ? '히트율' : 'Hit'} <strong>{dbSummary.week.cacheHitRate}%</strong></span>
        </div>
      )}
      
      {/* API별 상세 통계 (DB) */}
      {dbStats?.success && Object.keys(dbStats.stats).length > 0 && (
        <div className="db-api-details">
          <h4><FiDatabase /> {language === 'ko' ? 'API별 오늘 통계 (DB)' : "Today's Stats by API (DB)"}</h4>
          <div className="api-details-grid">
            {Object.entries(dbStats.stats).map(([apiType, stat]) => (
              <div key={apiType} className={`api-detail-card ${apiType.replace('_', '-')}`}>
                <div className="api-detail-header">
                  <span className="api-type-name">
                    {apiType === 'kakao_geocoding' && '🗺️ Kakao 좌표'}
                    {apiType === 'kakao_route' && '🚗 Kakao 경로'}
                    {apiType === 'odsay_transit' && '🚌 ODsay 대중교통'}
                    {apiType === 'tour_api' && '🏛️ 관광 API'}
                    {apiType === 'kto_photo' && '📸 사진 API'}
                    {!['kakao_geocoding', 'kakao_route', 'odsay_transit', 'tour_api', 'kto_photo'].includes(apiType) && apiType}
                  </span>
                </div>
                <div className="api-detail-stats">
                  <div className="detail-stat">
                    <span className="detail-label">{language === 'ko' ? '총' : 'Total'}</span>
                    <span className="detail-value">{stat.total}</span>
                  </div>
                  <div className="detail-stat">
                    <span className="detail-label">{language === 'ko' ? '성공' : 'Success'}</span>
                    <span className="detail-value success">{stat.success}</span>
                  </div>
                  <div className="detail-stat">
                    <span className="detail-label">{language === 'ko' ? '실패' : 'Fail'}</span>
                    <span className={`detail-value ${stat.fail > 0 ? 'fail' : ''}`}>{stat.fail}</span>
                  </div>
                  <div className="detail-stat">
                    <span className="detail-label">{language === 'ko' ? '캐시' : 'Cache'}</span>
                    <span className="detail-value cache">{stat.cacheHits}</span>
                  </div>
                  {stat.avgTime && (
                    <div className="detail-stat">
                      <span className="detail-label">{language === 'ko' ? '평균' : 'Avg'}</span>
                      <span className="detail-value">{stat.avgTime}ms</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="api-stats-grid">
        {/* 카카오 API 통계 */}
        <div className="api-stat-card kakao">
          <div className="api-card-header">
            <FaMap className="api-icon kakao" />
            <h4>Kakao Maps API</h4>
          </div>
          
          {kakaoStats ? (
            <div className="api-card-body">
              <div className="stat-row">
                <span className="stat-label">
                  {language === 'ko' ? '오늘 호출' : 'Today Calls'}
                </span>
                <span className="api-stat-value">{kakaoStats.todayCalls.toLocaleString()}</span>
              </div>
              
              <div className="stat-row">
                <span className="stat-label">
                  {language === 'ko' ? '일일 한도' : 'Daily Limit'}
                </span>
                <span className="api-stat-value">{kakaoStats.dailyLimit.toLocaleString()}</span>
              </div>
              
              <div className="usage-bar-wrapper">
                <div 
                  className={`usage-bar ${getUsageLevel((kakaoStats.todayCalls / kakaoStats.dailyLimit) * 100)}`}
                  style={{ width: `${Math.min((kakaoStats.todayCalls / kakaoStats.dailyLimit) * 100, 100)}%` }}
                />
              </div>
              
              <div className="stat-row highlight">
                <span className="stat-label">
                  {language === 'ko' ? '남은 호출' : 'Remaining'}
                </span>
                <span className={`api-stat-value ${kakaoStats.remainingToday < 10000 ? 'warning' : ''}`}>
                  {kakaoStats.remainingToday.toLocaleString()}
                </span>
              </div>
              
              <div className="stat-row small">
                <span className="stat-label">
                  {language === 'ko' ? '최근 1시간' : 'Last Hour'}
                </span>
                <span className="api-stat-value">{kakaoStats.lastHourCalls}</span>
              </div>
              
              <div className="stat-row small">
                <span className="stat-label">
                  {language === 'ko' ? '성공률' : 'Success Rate'}
                </span>
                <span className={`api-stat-value ${kakaoStats.successRate < 90 ? 'warning' : 'success'}`}>
                  {kakaoStats.successRate >= 90 ? <FiCheckCircle /> : <FiAlertCircle />}
                  {kakaoStats.successRate}%
                </span>
              </div>
              
              {kakaoStats.endpointStats && Object.keys(kakaoStats.endpointStats).length > 0 && (
                <div className="endpoint-stats">
                  <span className="endpoint-title">
                    {language === 'ko' ? '엔드포인트별' : 'By Endpoint'}
                  </span>
                  {Object.entries(kakaoStats.endpointStats).map(([endpoint, count]) => (
                    <div key={endpoint} className="endpoint-row">
                      <span>{endpoint}</span>
                      <span>{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="api-card-empty">
              {language === 'ko' ? '데이터 없음' : 'No data'}
            </div>
          )}
          
          <div className="api-card-footer">
            <a href="https://developers.kakao.com/console/app" target="_blank" rel="noopener noreferrer">
              {language === 'ko' ? '개발자 콘솔' : 'Dev Console'} →
            </a>
          </div>
        </div>
        
        {/* ODsay API 통계 */}
        <div className="api-stat-card odsay">
          <div className="api-card-header">
            <FaBus className="api-icon odsay" />
            <h4>ODsay API</h4>
          </div>
          
          {odsayStats ? (
            <div className="api-card-body">
              <div className="stat-row">
                <span className="stat-label">
                  {language === 'ko' ? '오늘 호출' : 'Today Calls'}
                </span>
                <span className="api-stat-value">{odsayStats.todayCalls.toLocaleString()}</span>
              </div>
              
              <div className="stat-row">
                <span className="stat-label">
                  {language === 'ko' ? '일일 한도' : 'Daily Limit'}
                </span>
                <span className="api-stat-value">{odsayStats.dailyLimit.toLocaleString()}</span>
              </div>
              
              <div className="usage-bar-wrapper">
                <div 
                  className={`usage-bar ${getUsageLevel((odsayStats.todayCalls / odsayStats.dailyLimit) * 100)}`}
                  style={{ width: `${Math.min((odsayStats.todayCalls / odsayStats.dailyLimit) * 100, 100)}%` }}
                />
              </div>
              
              <div className="stat-row highlight">
                <span className="stat-label">
                  {language === 'ko' ? '남은 호출' : 'Remaining'}
                </span>
                <span className={`api-stat-value ${odsayStats.remainingToday < 100 ? 'warning' : ''}`}>
                  {odsayStats.remainingToday.toLocaleString()}
                </span>
              </div>
              
              <div className="stat-row small">
                <span className="stat-label">
                  {language === 'ko' ? '최근 1시간' : 'Last Hour'}
                </span>
                <span className="api-stat-value">{odsayStats.lastHourCalls}</span>
              </div>
              
              <div className="stat-row small">
                <span className="stat-label">
                  {language === 'ko' ? '성공률' : 'Success Rate'}
                </span>
                <span className={`api-stat-value ${odsayStats.successRate < 90 ? 'warning' : 'success'}`}>
                  {odsayStats.successRate >= 90 ? <FiCheckCircle /> : <FiAlertCircle />}
                  {odsayStats.successRate}%
                </span>
              </div>
            </div>
          ) : (
            <div className="api-card-empty">
              {language === 'ko' ? '데이터 없음' : 'No data'}
            </div>
          )}
          
          <div className="api-card-footer">
            <a href="https://lab.odsay.com/mypage" target="_blank" rel="noopener noreferrer">
              {language === 'ko' ? '개발자 포털' : 'Dev Portal'} →
            </a>
          </div>
        </div>
      </div>
      
      <div className="api-stats-notice">
        <FiTrendingUp />
        <span>
          {language === 'ko' 
            ? '* 사용량은 앱 세션 기준이며, 서버 재시작 시 초기화됩니다. 정확한 사용량은 각 개발자 콘솔에서 확인하세요.'
            : '* Usage is per app session and resets on server restart. Check developer consoles for accurate usage.'}
        </span>
      </div>
    </div>
  )
})

ExternalApiStats.displayName = 'ExternalApiStats'

export default ExternalApiStats
