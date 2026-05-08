// api/applications.js
// 신청자 DB - 신청 조회(GET) 및 신청 등록(POST)

export default async function handler(req, res) {
  const apiKey = process.env.NOTION_API_KEY;
  const dbId = process.env.NOTION_DB_APPLICATIONS;

  if (!apiKey || !dbId) {
    return res.status(500).json({
      error: '환경변수가 설정되지 않았습니다',
      hint: 'NOTION_API_KEY 또는 NOTION_DB_APPLICATIONS 누락'
    });
  }

  // ─── GET: 신청 목록 조회 ───
  if (req.method === 'GET') {
    try {
      const notionRes = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ page_size: 100 })
      });

      if (!notionRes.ok) {
        const errBody = await notionRes.text();
        return res.status(notionRes.status).json({
          error: 'Notion API 오류',
          detail: errBody
        });
      }

      const data = await notionRes.json();
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({
        success: true,
        count: data.results.length,
        results: data.results
      });
    } catch (error) {
      return res.status(500).json({ error: '서버 오류', message: error.message });
    }
  }

  // ─── POST: 새 신청 등록 ───
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const properties = body?.properties;

      if (!properties) {
        return res.status(400).json({ error: 'properties 필드가 필요합니다' });
      }

      const notionRes = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          parent: { database_id: dbId },
          properties: properties
        })
      });

      if (!notionRes.ok) {
        const errBody = await notionRes.text();
        return res.status(notionRes.status).json({
          error: 'Notion 신청 등록 실패',
          detail: errBody
        });
      }

      const data = await notionRes.json();
      return res.status(200).json({
        success: true,
        id: data.id,
        page: data
      });
    } catch (error) {
      return res.status(500).json({ error: '서버 오류', message: error.message });
    }
  }

  return res.status(405).json({ error: 'GET 또는 POST만 허용됩니다' });
}
