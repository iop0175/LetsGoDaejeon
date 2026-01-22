import { del } from '@vercel/blob';

export default async function handler(request, response) {
  // CORS 헤더 설정
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // OPTIONS 요청 처리 (CORS preflight)
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method !== 'DELETE') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url } = request.body || {};
    
    if (!url) {
      return response.status(400).json({ error: 'No URL provided' });
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
