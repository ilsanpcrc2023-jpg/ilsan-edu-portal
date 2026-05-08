// api/programs.js
// 교육 프로그램 DB에서 공개된 교육 목록을 가져옵니다

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET 요청만 허용됩니다' });
  }

  const apiKey = process.env.NOTION_API_KEY;
  const dbId = process.env.NOTION_DB_PROGRAMS;

  if (!apiKey || !dbId) {
    return res.status(500).json({
      error: '환경변수가 설정되지 않았습니다',
      hint: 'Vercel Environment Variables 확인 필요'
    });
  }

  try {
    const notionRes = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        page_size: 100
      })
    });

    if (!notionRes.ok) {
      const errBody = await notionRes.text();
      return res.status(notionRes.status).json({
        error: 'Notion API 오류',
        status: notionRes.status,
        detail: errBody
      });
    }

    const data = await notionRes.json();

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

    return res.status(200).json({
      success: true,
      count: data.results.length,
      results: data.results
    });
  } catch (error) {
    return res.status(500).json({
      error: '서버 오류',
      message: error.message
    });
  }
}
