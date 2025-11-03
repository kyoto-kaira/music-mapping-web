import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * API GatewayへのプロキシAPI
 * APIキーはサーバーサイドでのみ管理され、クライアント側には露出しない
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORSヘッダーを設定
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONSリクエストへの対応
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // POSTリクエストのみ許可
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  }

  try {
    // 環境変数からAPI Gatewayの設定を取得（サーバーサイドのみ）
    const apiGatewayUrl = process.env.API_GATEWAY_URL;
    const apiGatewayKey = process.env.API_GATEWAY_KEY;

    if (!apiGatewayUrl || !apiGatewayKey) {
      console.error('API Gateway URL or API Key is not configured');
      return res.status(500).json({
        success: false,
        message: 'API Gateway configuration is missing',
      });
    }

    // リクエストボディを取得
    const requestBody = req.body;

    // API Gatewayにリクエストを中継
    const gatewayResponse = await fetch(apiGatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiGatewayKey,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await gatewayResponse.json();

    // ステータスコードとレスポンスをそのまま返す
    return res.status(gatewayResponse.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'プロキシエラーが発生しました',
    });
  }
}

