import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * SupabaseへのプロキシAPI
 * SupabaseのAPIキーはサーバーサイドでのみ管理され、クライアント側には露出しない
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORSヘッダーを設定
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONSリクエストへの対応
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // 環境変数からSupabaseの設定を取得（サーバーサイドのみ）
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase URL or Anon Key is not configured');
      return res.status(500).json({
        success: false,
        message: 'Supabase configuration is missing',
      });
    }

    // Supabaseクライアントを作成
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // リクエストパラメータから操作を取得
    const { operation, table, ...params } = req.body || {};

    if (!operation || !table) {
      return res.status(400).json({
        success: false,
        message: 'operation and table are required',
      });
    }

    let result;

    switch (operation) {
      case 'select':
        {
          const { columns = '*', filters = {}, orderBy, limit } = params;
          let query = supabase.from(table).select(columns);

          // フィルターを適用
          if (filters.eq) {
            for (const [key, value] of Object.entries(filters.eq)) {
              query = query.eq(key, value);
            }
          }

          // 順序を適用
          if (orderBy) {
            query = query.order(orderBy.column, { ascending: orderBy.ascending ?? false });
          }

          // 制限を適用
          if (limit) {
            query = query.limit(limit);
          }

          // 単一レコード取得の場合
          if (params.single) {
            const { data, error } = await query.single();
            if (error) throw error;
            result = { data };
          } else {
            // カウント取得の場合
            if (params.count) {
              const { count, error } = await query.select('*', { count: 'exact', head: true });
              if (error) throw error;
              result = { count: count || 0 };
            } else {
              const { data, error } = await query;
              if (error) throw error;
              result = { data };
            }
          }
        }
        break;

      case 'insert':
        {
          const { values } = params;
          if (!values) {
            return res.status(400).json({
              success: false,
              message: 'values are required for insert operation',
            });
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
        }
        break;

      case 'update':
        {
          const { values, filters = {} } = params;
          if (!values) {
            return res.status(400).json({
              success: false,
              message: 'values are required for update operation',
            });
          }

          let query = supabase.from(table).update(values);

          // フィルターを適用
          if (filters.eq) {
            for (const [key, value] of Object.entries(filters.eq)) {
              query = query.eq(key, value);
            }
          }

          const { error } = await query;
          if (error) throw error;
          result = { success: true };
        }
        break;

      case 'delete':
        {
          const { filters = {} } = params;
          let query = supabase.from(table).delete();

          // フィルターを適用
          if (filters.eq) {
            for (const [key, value] of Object.entries(filters.eq)) {
              query = query.eq(key, value);
            }
          }

          const { error } = await query;
          if (error) throw error;
          result = { success: true };
        }
        break;

      default:
        return res.status(400).json({
          success: false,
          message: `Unknown operation: ${operation}`,
        });
    }

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Supabase proxy error:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Supabaseプロキシエラーが発生しました',
      error: error instanceof Error ? error.stack : String(error),
    });
  }
}

