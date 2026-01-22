// Vercel API를 통한 사용량 조회
// API Token은 환경변수 VERCEL_TOKEN으로 설정 필요
// 토큰 생성: https://vercel.com/account/tokens

export default async function handler(request, response) {
  // CORS 헤더 설정
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID; // 팀 프로젝트인 경우
  
  if (!token) {
    return response.status(500).json({ 
      error: 'VERCEL_TOKEN not configured',
      message: 'Vercel API 토큰이 설정되지 않았습니다.'
    });
  }

  try {
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // API 엔드포인트 URL 구성
    const teamQuery = teamId ? `?teamId=${teamId}` : '';

    // 1. 사용자/팀 정보 조회
    const userRes = await fetch('https://api.vercel.com/v2/user', { headers });
    const userData = await userRes.json();

    // 2. 현재 달의 시작과 끝 계산
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    // 3. 프로젝트 목록 조회
    const projectsRes = await fetch(`https://api.vercel.com/v9/projects${teamQuery}`, { headers });
    const projectsData = await projectsRes.json();

    // 4. 배포 목록 조회 (최근 10개)
    const deploymentsRes = await fetch(
      `https://api.vercel.com/v6/deployments${teamQuery}&limit=10`,
      { headers }
    );
    const deploymentsData = await deploymentsRes.json();

    // 5. Blob Store 정보 조회 (있는 경우)
    let blobInfo = null;
    try {
      const blobStoresRes = await fetch(
        `https://api.vercel.com/v1/blob/stores${teamQuery}`,
        { headers }
      );
      if (blobStoresRes.ok) {
        blobInfo = await blobStoresRes.json();
      }
    } catch {
      // Blob API가 없거나 권한이 없는 경우 무시
    }

    // 응답 데이터 구성
    const usageData = {
      success: true,
      user: {
        username: userData.user?.username || userData.username,
        email: userData.user?.email || userData.email,
        plan: userData.user?.billing?.plan || userData.billing?.plan || 'hobby'
      },
      projects: {
        total: projectsData.projects?.length || 0,
        list: (projectsData.projects || []).slice(0, 5).map(p => ({
          name: p.name,
          framework: p.framework,
          updatedAt: p.updatedAt
        }))
      },
      deployments: {
        recent: (deploymentsData.deployments || []).map(d => ({
          name: d.name,
          state: d.state,
          createdAt: d.createdAt,
          url: d.url
        }))
      },
      blob: blobInfo ? {
        stores: blobInfo.stores?.length || 0,
        storesList: (blobInfo.stores || []).map(s => ({
          name: s.name,
          createdAt: s.createdAt
        }))
      } : null,
      limits: {
        // Hobby 플랜 기준 한도
        bandwidth: { limit: '100 GB', unit: '/월' },
        serverless: { limit: '100 GB-Hours', unit: '/월' },
        buildTime: { limit: '6,000 분', unit: '/월' },
        analytics: { limit: '25,000 events', unit: '/월' }
      },
      timestamp: new Date().toISOString()
    };

    return response.status(200).json(usageData);
  } catch (error) {
    console.error('Vercel API error:', error);
    return response.status(500).json({ 
      error: 'Failed to fetch Vercel usage',
      message: error.message 
    });
  }
}
