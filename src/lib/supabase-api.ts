/**
 * Supabase APIクライアント
 * サーバーレス関数経由でSupabaseにアクセスする
 */
const SUPABASE_API_URL = '/api/supabase';

interface SupabaseRequest {
  operation: 'select' | 'insert' | 'update' | 'delete';
  table: string;
  [key: string]: unknown;
}

interface SupabaseResponse<T = unknown> {
  success: boolean;
  data?: T;
  count?: number;
  message?: string;
}

/**
 * Supabase APIへのリクエストを送信
 */
async function requestSupabase<T = unknown>(request: SupabaseRequest): Promise<SupabaseResponse<T>> {
  try {
    const response = await fetch(SUPABASE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || 'Supabase API request failed',
      };
    }

    return data as SupabaseResponse<T>;
  } catch (error) {
    console.error('Supabase API error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Supabase API request failed',
    };
  }
}

/**
 * Supabaseクライアントのインターフェース
 */
export const supabaseApi = {
  /**
   * データを取得
   */
  async select<T = unknown>(params: {
    table: string;
    columns?: string;
    filters?: { eq?: Record<string, unknown> };
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
    single?: boolean;
    count?: boolean;
  }): Promise<{ data?: T; count?: number } | null> {
    const response = await requestSupabase<T>({
      operation: 'select',
      ...params,
    });

    if (!response.success) {
      throw new Error(response.message || 'Failed to select data');
    }

    if (params.count) {
      return { count: response.count };
    }

    return { data: response.data };
  },

  /**
   * データを挿入
   */
  async insert<T = unknown>(params: {
    table: string;
    values: unknown | unknown[];
    select?: string;
    single?: boolean;
  }): Promise<{ data?: T } | null> {
    const response = await requestSupabase<T>({
      operation: 'insert',
      ...params,
    });

    if (!response.success) {
      throw new Error(response.message || 'Failed to insert data');
    }

    return { data: response.data };
  },

  /**
   * データを更新
   */
  async update(params: {
    table: string;
    values: Record<string, unknown>;
    filters?: { eq?: Record<string, unknown> };
  }): Promise<boolean> {
    const response = await requestSupabase({
      operation: 'update',
      ...params,
    });

    if (!response.success) {
      throw new Error(response.message || 'Failed to update data');
    }

    return true;
  },

  /**
   * データを削除
   */
  async delete(params: {
    table: string;
    filters?: { eq?: Record<string, unknown> };
  }): Promise<boolean> {
    const response = await requestSupabase({
      operation: 'delete',
      ...params,
    });

    if (!response.success) {
      throw new Error(response.message || 'Failed to delete data');
    }

    return true;
  },
};

