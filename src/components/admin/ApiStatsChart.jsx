import { memo } from 'react'
import { Chart } from 'react-google-charts'
import { useTheme } from '../../context/ThemeContext'

/**
 * API 호출 통계 차트 컴포넌트
 */
const ApiStatsChart = memo(({ 
  apiCallStats, 
  apiNames, 
  pageConfigs, 
  language 
}) => {
  const { isDark } = useTheme()
  
  // 다크 모드 차트 색상 설정
  const textColor = isDark ? '#e2e8f0' : '#333'
  const legendTextColor = isDark ? '#94a3b8' : '#666'
  
  // 데이터가 없으면 표시하지 않음
  const totalCalls = Object.values(apiCallStats).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0)
  
  if (totalCalls === 0) {
    return (
      <div className="charts-empty">
        <p>{language === 'ko' ? 'API 호출 데이터가 없습니다.' : 'No API call data.'}</p>
      </div>
    )
  }

  return (
    <div className="charts-grid">
      {/* 파이 차트 */}
      <div className="chart-card">
        <h4>{language === 'ko' ? 'API 호출 분포' : 'API Call Distribution'}</h4>
        <Chart
          chartType="PieChart"
          data={[
            ['API', '호출 수'],
            ...Object.entries(apiNames).map(([key, name]) => [name, apiCallStats[key] || 0])
          ]}
          options={{
            pieHole: 0.4,
            colors: Object.keys(apiNames).map(key => pageConfigs[key]?.color || '#ccc'),
            legend: { 
              position: 'right',
              textStyle: { color: legendTextColor, fontSize: 12 }
            },
            chartArea: { width: '80%', height: '80%' },
            backgroundColor: 'transparent',
            pieSliceTextStyle: { color: '#fff' }
          }}
          width="100%"
          height="300px"
        />
      </div>
      
      {/* 막대 차트 */}
      <div className="chart-card">
        <h4>{language === 'ko' ? 'API별 호출 횟수' : 'API Calls by Type'}</h4>
        <Chart
          chartType="ColumnChart"
          data={[
            ['API', '호출 수', { role: 'style' }],
            ...Object.entries(apiNames).map(([key, name]) => [
              name, 
              apiCallStats[key] || 0,
              pageConfigs[key]?.color || '#1976d2'
            ])
          ]}
          options={{
            legend: 'none',
            hAxis: { 
              textStyle: { color: textColor, fontSize: 10 }
            },
            vAxis: { 
              title: language === 'ko' ? '호출 수' : 'Calls',
              titleTextStyle: { color: textColor },
              textStyle: { color: textColor }
            },
            chartArea: { width: '85%', height: '70%' },
            backgroundColor: 'transparent'
          }}
          width="100%"
          height="300px"
        />
      </div>
    </div>
  )
})

ApiStatsChart.displayName = 'ApiStatsChart'

export default ApiStatsChart
