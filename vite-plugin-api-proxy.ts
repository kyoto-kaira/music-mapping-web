import type { Plugin } from 'vite';
import { loadEnv } from 'vite';

/**
 * ローカル開発環境でAPIプロキシを提供するViteプラグイン
 */
export function apiProxyPlugin(): Plugin {
  return {
    name: 'api-proxy-plugin',
    configureServer(server) {
      server.middlewares.use('/api/inference', async (req, res, next) => {
        // 環境変数をロード（.env.localなどから読み込む）
        const env = loadEnv(
          server.config.mode,
          server.config.envDir || process.cwd(),
          ''
        );
        // OPTIONSリクエストへの対応
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Credentials', 'true');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.statusCode = 200;
          res.end();
          return;
        }

        // POSTリクエストのみ許可
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: false,
            message: 'Method not allowed',
          }));
          return;
        }

        try {
          // 環境変数からAPI Gatewayの設定を取得（.env.localからも読み込む）
          const apiGatewayUrl = env.API_GATEWAY_URL || process.env.API_GATEWAY_URL;
          const apiGatewayKey = env.API_GATEWAY_KEY || process.env.API_GATEWAY_KEY;

          if (!apiGatewayUrl || !apiGatewayKey) {
            console.error('API Gateway URL or API Key is not configured');
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: false,
              message: 'API Gateway configuration is missing. Please set API_GATEWAY_URL and API_GATEWAY_KEY in .env.local',
            }));
            return;
          }

          // リクエストボディを読み取る
          let body = '';
          req.on('data', (chunk) => {
            body += chunk.toString();
          });

          req.on('end', async () => {
            try {
              // API Gatewayにリクエストを中継
              const gatewayResponse = await fetch(apiGatewayUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': apiGatewayKey,
                },
                body: body,
              });

              const data = await gatewayResponse.json();

              // CORSヘッダーを設定
              res.setHeader('Access-Control-Allow-Credentials', 'true');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
              res.setHeader('Content-Type', 'application/json');
              
              // ステータスコードとレスポンスをそのまま返す
              res.statusCode = gatewayResponse.status;
              res.end(JSON.stringify(data));
            } catch (error) {
              console.error('Proxy error:', error);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: false,
                message: error instanceof Error ? error.message : 'プロキシエラーが発生しました',
              }));
            }
          });
        } catch (error) {
          console.error('Server error:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: false,
            message: error instanceof Error ? error.message : 'サーバーエラーが発生しました',
          }));
        }
      });

      // Supabaseプロキシエンドポイント
      server.middlewares.use('/api/supabase', async (req, res, next) => {
        // 環境変数をロード（.env.localなどから読み込む）
        const env = loadEnv(
          server.config.mode,
          server.config.envDir || process.cwd(),
          ''
        );

        // OPTIONSリクエストへの対応
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Credentials', 'true');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.statusCode = 200;
          res.end();
          return;
        }

        // GET以外のメソッドは許可しない（POSTのみ）
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: false,
            message: 'Method not allowed',
          }));
          return;
        }

        try {
          // 環境変数からSupabaseの設定を取得（.env.localからも読み込む）
          const supabaseUrl = env.SUPABASE_URL || process.env.SUPABASE_URL;
          const supabaseAnonKey = env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

          if (!supabaseUrl || !supabaseAnonKey) {
            console.error('Supabase URL or Anon Key is not configured');
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: false,
              message: 'Supabase configuration is missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY in .env.local',
            }));
            return;
          }

          // リクエストボディを読み取る
          let body = '';
          req.on('data', (chunk) => {
            body += chunk.toString();
          });

          req.on('end', async () => {
            try {
              // SupabaseプロキシAPIにリクエストを中継（サーバーレス関数と同じロジックを実装）
              // 簡略化のため、直接Supabaseにアクセス
              const { createClient } = await import('@supabase/supabase-js');
              const supabase = createClient(supabaseUrl, supabaseAnonKey);
              const bodyData = JSON.parse(body || '{}');
              const { operation, table, ...params } = bodyData;

              if (!operation || !table) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  success: false,
                  message: 'operation and table are required',
                }));
                return;
              }

              let result;

              switch (operation) {
                case 'select': {
                  const { columns = '*', filters = {}, orderBy, limit } = params;
                  let query = supabase.from(table).select(columns);

                  if (filters.eq) {
                    for (const [key, value] of Object.entries(filters.eq)) {
                      query = query.eq(key, value);
                    }
                  }

                  if (orderBy) {
                    query = query.order(orderBy.column, { ascending: orderBy.ascending ?? false });
                  }

                  if (limit) {
                    query = query.limit(limit);
                  }

                  if (params.single) {
                    const { data, error } = await query.single();
                    if (error) throw error;
                    result = { data };
                  } else if (params.count) {
                    const { count, error } = await query.select('*', { count: 'exact', head: true });
                    if (error) throw error;
                    result = { count: count || 0 };
                  } else {
                    const { data, error } = await query;
                    if (error) throw error;
                    result = { data };
                  }
                  break;
                }
                case 'insert': {
                  const { values } = params;
                  if (!values) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({
                      success: false,
                      message: 'values are required for insert operation',
                    }));
                    return;
                  }
                  let query = supabase.from(table).insert(values);
                  if (params.select) {
                    query = query.select(params.select);
                    const { data, error } = await query;
                    if (error) throw error;
                    result = { data: params.single ? data?.[0] : data };
                  } else {
                    const { error } = await query;
                    if (error) throw error;
                    result = { success: true };
                  }
                  break;
                }
                case 'update': {
                  const { values, filters = {} } = params;
                  if (!values) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({
                      success: false,
                      message: 'values are required for update operation',
                    }));
                    return;
                  }
                  let query = supabase.from(table).update(values);
                  if (filters.eq) {
                    for (const [key, value] of Object.entries(filters.eq)) {
                      query = query.eq(key, value);
                    }
                  }
                  const { error } = await query;
                  if (error) throw error;
                  result = { success: true };
                  break;
                }
                case 'delete': {
                  const { filters = {} } = params;
                  let query = supabase.from(table).delete();
                  if (filters.eq) {
                    for (const [key, value] of Object.entries(filters.eq)) {
                      query = query.eq(key, value);
                    }
                  }
                  const { error } = await query;
                  if (error) throw error;
                  result = { success: true };
                  break;
                }
                default:
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({
                    success: false,
                    message: `Unknown operation: ${operation}`,
                  }));
                  return;
              }

              // CORSヘッダーを設定
              res.setHeader('Access-Control-Allow-Credentials', 'true');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
              res.setHeader('Content-Type', 'application/json');
              
              res.statusCode = 200;
              res.end(JSON.stringify({
                success: true,
                ...result,
              }));
            } catch (error) {
              console.error('Supabase proxy error:', error);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: false,
                message: error instanceof Error ? error.message : 'Supabaseプロキシエラーが発生しました',
              }));
            }
          });
        } catch (error) {
          console.error('Server error:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: false,
            message: error instanceof Error ? error.message : 'サーバーエラーが発生しました',
          }));
        }
      });
    },
  };
}

