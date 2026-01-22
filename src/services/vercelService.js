// Vercel 사용량 조회 서비스

const API_BASE_URL = import.meta.env.PROD ? '' : 'http://localhost:3000';

/**
 * Vercel 사용량 정보 조회
 * @returns {Promise<Object>} 사용량 데이터
 */
export const getVercelUsage = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/vercel-usage`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch usage data');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Vercel usage fetch error:', error);
    return {
      success: false,
      error: error.message || 'Vercel 사용량을 불러올 수 없습니다.'
    };
  }
};

/**
 * 바이트를 읽기 쉬운 형식으로 변환
 * @param {number} bytes - 바이트 수
 * @returns {string} 포맷된 문자열
 */
export const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * 날짜를 상대적 시간으로 변환
 * @param {string|number} date - 날짜
 * @returns {string} 상대적 시간 문자열
 */
export const formatRelativeTime = (date) => {
  const now = new Date();
  const target = new Date(date);
  const diff = now - target;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 30) return `${days}일 전`;
  
  return target.toLocaleDateString('ko-KR');
};

/**
 * 배포 상태를 한글로 변환
 * @param {string} state - 배포 상태
 * @returns {Object} { text, color }
 */
export const getDeploymentStatus = (state) => {
  const statusMap = {
    'READY': { text: '완료', color: '#4caf50' },
    'BUILDING': { text: '빌드 중', color: '#ff9800' },
    'ERROR': { text: '에러', color: '#f44336' },
    'QUEUED': { text: '대기 중', color: '#9e9e9e' },
    'CANCELED': { text: '취소됨', color: '#9e9e9e' },
    'INITIALIZING': { text: '초기화 중', color: '#2196f3' }
  };
  
  return statusMap[state] || { text: state, color: '#9e9e9e' };
};
