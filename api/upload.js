import { put } from '@vercel/blob';

export const config = {
  runtime: 'nodejs',
  api: {
    bodyParser: false,
  },
};

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
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token');
  response.setHeader('Access-Control-Allow-Credentials', 'true');

  // OPTIONS 요청 처리 (CORS preflight)
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method !== 'POST') {
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
    // multipart/form-data 파싱을 위해 busboy 또는 formidable 대신
    // Request body를 직접 Blob에 전달
    const contentType = request.headers['content-type'] || '';
    
    if (!contentType.includes('multipart/form-data')) {
      return response.status(400).json({ error: 'Content-Type must be multipart/form-data' });
    }

    // request를 직접 스트림으로 처리
    const chunks = [];
    for await (const chunk of request) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // boundary 추출
    const boundaryMatch = contentType.match(/boundary=(.+)$/);
    if (!boundaryMatch) {
      return response.status(400).json({ error: 'Boundary not found' });
    }
    const boundary = boundaryMatch[1];

    // multipart 파싱
    const parts = parseMultipart(buffer, boundary);
    const filePart = parts.find(p => p.name === 'file');
    const folderPart = parts.find(p => p.name === 'folder');

    if (!filePart || !filePart.data) {
      return response.status(400).json({ error: 'No file provided' });
    }

    const folder = folderPart?.value || 'uploads';
    const timestamp = Date.now();
    const originalName = (filePart.filename || 'image').replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${folder}/${timestamp}_${originalName}`;

    // Vercel Blob에 업로드
    const blob = await put(filename, filePart.data, {
      access: 'public',
      addRandomSuffix: false,
      contentType: filePart.contentType || 'application/octet-stream',
    });

    return response.status(200).json({
      success: true,
      url: blob.url,
      filename: blob.pathname,
      size: filePart.data.length,
      contentType: filePart.contentType
    });
  } catch (error) {
    console.error('Upload error:', error);
    return response.status(500).json({ 
      error: 'Upload failed', 
      message: error.message 
    });
  }
}

// 간단한 multipart 파서
function parseMultipart(buffer, boundary) {
  const parts = [];
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const endBoundaryBuffer = Buffer.from(`--${boundary}--`);
  
  let start = 0;
  let idx;
  
  while ((idx = buffer.indexOf(boundaryBuffer, start)) !== -1) {
    if (start > 0) {
      const partData = buffer.slice(start, idx - 2); // -2 for \r\n
      const part = parsePartData(partData);
      if (part) parts.push(part);
    }
    start = idx + boundaryBuffer.length + 2; // +2 for \r\n
    
    // 끝 boundary 체크
    if (buffer.indexOf(endBoundaryBuffer, idx) === idx) break;
  }
  
  return parts;
}

function parsePartData(data) {
  const headerEndIdx = data.indexOf('\r\n\r\n');
  if (headerEndIdx === -1) return null;
  
  const headerStr = data.slice(0, headerEndIdx).toString();
  const body = data.slice(headerEndIdx + 4);
  
  const part = { headers: headerStr };
  
  // Content-Disposition 파싱
  const dispMatch = headerStr.match(/Content-Disposition:\s*form-data;\s*name="([^"]+)"(?:;\s*filename="([^"]+)")?/i);
  if (dispMatch) {
    part.name = dispMatch[1];
    if (dispMatch[2]) {
      part.filename = dispMatch[2];
      part.data = body;
    } else {
      part.value = body.toString().trim();
    }
  }
  
  // Content-Type 파싱
  const typeMatch = headerStr.match(/Content-Type:\s*([^\r\n]+)/i);
  if (typeMatch) {
    part.contentType = typeMatch[1].trim();
  }
  
  return part;
}
