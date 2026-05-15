// ════════════════════════════════════════════════════════════
// /api/apply.js
// Vercel 서버리스 함수: 신청 데이터를 Notion 신청자 DB에 저장
// 
// Notion 신청자 DB 속성 매핑:
//   신청자명(Title) ← name
//   연락처(Phone)   ← tel
//   소속 기관       ← org
//   직종            ← job
//   이메일(Email)   ← email
//   문의 사항       ← note
//   교육 회차       ← sessInfo (교육명+회차+장소 통합 정보)
//   신청 일시(Date) ← 현재 시각 (자동)
// ════════════════════════════════════════════════════════════

module.exports = async (req, res) => {
  // ── CORS 헤더 ──
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'POST 요청만 허용됩니다' });
  }

  // ── 환경변수 확인 ──
  const NOTION_API_KEY = process.env.NOTION_API_KEY;
  const DB_APPLICANTS = process.env.NOTION_DB_APPLICANTS;

  if (!NOTION_API_KEY || !DB_APPLICANTS) {
    return res.status(500).json({
      ok: false,
      error: 'Vercel 환경변수가 설정되지 않았습니다 (NOTION_API_KEY, NOTION_DB_APPLICANTS)'
    });
  }

  try {
    // ── 요청 본문 파싱 ──
    let data = req.body;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch (e) { data = {}; }
    }
    data = data || {};

    const {
      name, tel, org, job, email, note,
      eduTitle, sessTitle, sessDate, sessPlace, sessInfo
    } = data;

    if (!name || !tel || !org) {
      return res.status(400).json({
        ok: false,
        error: '필수 항목 누락: 이름, 연락처, 소속'
      });
    }

    // ── Notion 페이지 properties 구성 ──
    // 필드명은 Notion DB의 속성명과 정확히 일치해야 함
    const properties = {
      // 신청자 이름 (Title 타입)
      '신청자명': {
        title: [{ text: { content: String(name).slice(0, 200) } }]
      },
      // 연락처 (Phone 타입)
      '연락처': {
        phone_number: String(tel || '')
      },
      // 소속 기관 (Rich text)
      '소속 기관': {
        rich_text: [{ text: { content: String(org || '') } }]
      },
      // 직종 (Rich text)
      '직종': {
        rich_text: [{ text: { content: String(job || '') } }]
      },
      // 문의 사항 (Rich text) — 사용자 비고
      '문의 사항': {
        rich_text: [{ text: { content: String(note || '') } }]
      },
      // 교육 회차 (Rich text) — 교육명/회차/일자/장소 통합 정보
      '교육 회차': {
        rich_text: [{ text: { content: String(sessInfo || eduTitle || '') } }]
      },
      // 신청 일시 (Date) — 신청 제출 시각
      '신청 일시': {
        date: { start: new Date().toISOString() }
      }
    };

    // 이메일은 형식이 맞을 때만 추가
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      properties['이메일'] = { email: String(email) };
    }

    // ── Notion API 호출 ──
    const notionRes = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        parent: { database_id: DB_APPLICANTS },
        properties: properties
      })
    });

    const result = await notionRes.json();

    if (!notionRes.ok) {
      console.error('Notion API 오류:', result);
      return res.status(500).json({
        ok: false,
        error: result.message || 'Notion 저장 실패',
        details: result
      });
    }

    return res.status(200).json({ ok: true, id: result.id });

  } catch (err) {
    console.error('서버 오류:', err);
    return res.status(500).json({
      ok: false,
      error: err.message || '알 수 없는 오류'
    });
  }
};
