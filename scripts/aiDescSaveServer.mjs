/**
 * n8n AI Description 저장 서버
 * 
 * n8n 워크플로우에서 생성된 AI description과 FAQ를 
 * Supabase tour_spots.intro_info에 자동 저장합니다.
 * 
 * 사용법:
 *   node scripts/aiDescSaveServer.mjs
 * 
 * n8n에서 보내는 URL:
 *   POST http://host.docker.internal:4444/data?contentid=XXX
 *   POST http://host.docker.internal:4444/faq?contentid=XXX
 */

import http from 'http';
import { createClient } from '@supabase/supabase-js';

// Supabase 설정 (환경에 맞게 수정)
const SUPABASE_URL = 'https://geczvsuzwpvdxiwbxqtf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlY3p2c3V6d3B2ZHhpd2J4cXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3OTUzMTksImV4cCI6MjA4NDM3MTMxOX0.rQXwLuP2IvoHQ7UM6Ftats0qaqIYyYG054op9c3KwMQ';

const PORT = 4444;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// contentid별 대기 중인 데이터
const pendingData = {};

// 로그 함수
const log = (type, ...args) => {
  const timestamp = new Date().toISOString().slice(11, 19);
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    data: '📝'
  }[type] || '•';
  console.log(`[${timestamp}] ${prefix}`, ...args);
};

// Supabase에 저장
async function saveToSupabase(contentid) {
  const data = pendingData[contentid];
  if (!data || (!data.ai_description && !data.faq)) return;

  try {
    log('info', `Supabase 저장 중: ${contentid}`);
    
    // 기존 intro_info 조회
    const { data: existing, error: selectError } = await supabase
      .from('tour_spots')
      .select('intro_info, title')
      .eq('content_id', contentid)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      throw selectError;
    }

    const existingIntro = existing?.intro_info || {};
    const newIntro = {
      ...existingIntro,
      ...(data.ai_description && { ai_description: data.ai_description }),
      ...(data.faq && { faq: data.faq }),
      ai_updated_at: new Date().toISOString()
    };

    const { error: updateError } = await supabase
      .from('tour_spots')
      .update({ intro_info: newIntro })
      .eq('content_id', contentid);

    if (updateError) throw updateError;

    log('success', `저장 완료: ${existing?.title || contentid}`);
    log('data', `  ai_description: ${newIntro.ai_description?.substring(0, 50)}...`);
    log('data', `  faq: ${typeof newIntro.faq === 'string' ? newIntro.faq.substring(0, 50) : JSON.stringify(newIntro.faq).substring(0, 50)}...`);

    delete pendingData[contentid];
  } catch (err) {
    log('error', `저장 실패 (${contentid}):`, err.message);
  }
}

// HTTP 서버
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;
  const contentid = url.searchParams.get('contentid');

  log('info', req.method, path, contentid || '(no contentid)');

  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        // 쿼리스트링의 data 파라미터 확인
        let data = body;
        if (url.searchParams.has('data')) {
          try {
            data = decodeURIComponent(url.searchParams.get('data'));
          } catch (e) {
            // decodeURIComponent 실패 시 원본 사용
            data = url.searchParams.get('data');
          }
        }

        if (!contentid) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'contentid required' }));
          return;
        }

        if (!pendingData[contentid]) pendingData[contentid] = {};

        if (path === '/data') {
          log('data', `ai_description 수신: ${data.substring(0, 60)}...`);
          pendingData[contentid].ai_description = data;
        } else if (path === '/faq') {
          log('data', `faq 수신: ${data.substring(0, 60)}...`);
          pendingData[contentid].faq = data;
        }

        // 둘 다 수신되었으면 저장
        if (pendingData[contentid].ai_description && pendingData[contentid].faq) {
          await saveToSupabase(contentid);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
      } catch (err) {
        log('error', `요청 처리 오류: ${err.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  } else if (req.method === 'GET') {
    // 상태 확인용
    if (path === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'running',
        pendingCount: Object.keys(pendingData).length,
        pending: Object.keys(pendingData)
      }));
    } else {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('AI Description Save Server is running');
    }
  } else {
    res.writeHead(405);
    res.end('Method not allowed');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║     🤖 AI Description 저장 서버 (n8n → Supabase)  ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  URL: http://0.0.0.0:${PORT}                         ║`);
  console.log('║                                                  ║');
  console.log('║  n8n에서 사용:                                   ║');
  console.log(`║  • POST http://host.docker.internal:${PORT}/data     ║`);
  console.log(`║  • POST http://host.docker.internal:${PORT}/faq      ║`);
  console.log('║  • 쿼리스트링: ?contentid=XXX                    ║');
  console.log('║                                                  ║');
  console.log('║  상태 확인: GET /status                          ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
});

// 종료 시 정리
process.on('SIGINT', () => {
  console.log('\n서버 종료...');
  server.close(() => {
    console.log('서버가 종료되었습니다.');
    process.exit(0);
  });
});
