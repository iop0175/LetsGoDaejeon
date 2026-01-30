import { del } from '@vercel/blob';

// 허용된 도메인 목록
const ALLOWED_ORIGINS = [
  'https://letsgodaejeon.vercel.app',
  'https://letsgodaejeon.kr',
  'https://letsgodaejeon.kr',
  'https://www.letsgodaejeon.kr',
  'http://localhost:5173',
  'http://localhost:3000'
];

export default async function handler(request, response) {
  // CORS 헤더 설정 (허용된 도메인만)
  const origin = request.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin);
  }
  response.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token');
  response.setHeader('Access-Control-Allow-Credentials', 'true');

  // OPTIONS 요청 처리 (CORS preflight)
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method !== 'DELETE') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  // 관리자 인증 검사 (Authorization 헤더 또는 X-Admin-Token 확인)
  const authHeader = request.headers.authorization || '';
  const adminToken = request.headers['x-admin-token'] || '';
  const validToken = process.env.ADMIN_UPLOAD_TOKEN; // 환경변수에서 토큰 로드
  
  // 인증 검사 활성화 시 (ADMIN_UPLOAD_TOKEN이 설정된 경우)
  if (validToken) {
    const isValidAuth = authHeader === `Bearer ${validToken}` || adminToken === validToken;
    if (!isValidAuth) {
      return response.status(401).json({ error: 'Unauthorized: Invalid or missing authentication token' });
    }
  }

  try {
    const { url } = request.body || {};
    
    if (!url) {
      return response.status(400).json({ error: 'No URL provided' });
    }

    // URL 검증 강화: Vercel Blob URL 형식 확인
    if (!url.includes('vercel-storage.com') && !url.includes('blob.vercel-storage.com')) {
      return response.status(400).json({ error: 'Invalid URL: Not a Vercel Blob URL' });
    }

    // 경로 순회 공격 방지
    if (url.includes('..')) {
      return response.status(400).json({ error: 'Invalid URL: Suspicious path detected' });
    }

    // Vercel Blob에서 삭제
    await del(url);

    return response.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete error:', error);
    return response.status(500).json({ 
      error: 'Delete failed', 
      message: error.message 
    });
  }
}
