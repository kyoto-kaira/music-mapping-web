import { ApiResponse, CreateMapResponse, DeleteSongResponse, SearchResult, Song } from '../../shared/types';

// プロキシAPIエンドポイント（APIキーはサーバーサイドで管理）
const PROXY_API_URL = '/api/inference';

// iTunes Search API関連の型定義
interface iTunesTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  artworkUrl100: string;
  trackViewUrl: string;
  previewUrl?: string;
}

interface iTunesSearchResponse {
  resultCount: number;
  results: iTunesTrack[];
}

// SageMakerレスポンスの型定義
interface SageMakerErrorResponse {
  message?: string;
  error?: string;
}

interface SageMakerMapResponse {
  success: boolean;
  data: {
    mapId: string;
    songs: Song[];
  };
  message: string;
}

// ヘルパー関数

/**
 * エラーハンドリング用のヘルパー関数
 */
function handleApiError<T>(error: unknown, defaultMessage: string, code = 'API_ERROR'): ApiResponse<T> {
  console.error(defaultMessage, error);
  const message = error instanceof Error ? error.message : defaultMessage;
  return {
    success: false,
    data: undefined,
    message,
    code,
  };
}

/**
 * マップIDを生成
 */
function generateMapId(): string {
  return `map_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * プロキシAPI経由でAPI Gatewayにリクエストを送信
 * APIキーはサーバーサイドで管理されるため、クライアント側には露出しない
 */
async function requestApiGateway(body: unknown): Promise<Response> {
  return fetch(PROXY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

/**
 * SageMakerからのエラーレスポンスを処理
 */
function parseSageMakerError(
  data: SageMakerErrorResponse,
  defaultMessage: string,
  defaultCode: string
): ApiResponse<never> {
  const errorMessage = data.message || data.error || defaultMessage;
  return {
    success: false,
    data: undefined,
    message: errorMessage,
    code: defaultCode,
  };
}

/**
 * SageMakerからの曲レスポンスを変換
 */
function parseSongResponse(data: unknown): Song {
  const response = data as {
    success: boolean;
    data: {
      mapId: string;
      songs: Song[];
    };
    message: string;
  };

  // レスポンスが期待する形式で、songs配列が存在し、最初の要素が存在する場合
  if (response.success && response.data?.songs && response.data.songs.length > 0) {
    const songWithPosition = response.data.songs[0];
    if (songWithPosition.x !== undefined && songWithPosition.y !== undefined) {
      return songWithPosition;
    }
  }

  // 座標が見つからない場合はエラーをスロー
  throw new Error('座標情報がレスポンスに含まれていません');
}

/**
 * SageMakerからのマップレスポンスを変換
 */
function parseMapResponse(data: unknown): CreateMapResponse {
  const response = data as SageMakerMapResponse;

  // レスポンスが期待する形式で、data配下にmapIdとsongsが存在する場合
  if (response.success && response.data?.mapId && response.data?.songs) {
    return {
      mapId: response.data.mapId,
      songs: response.data.songs,
    };
  }

  // data配下にsongsのみがある場合
  if (response.success && response.data?.songs) {
    return {
      mapId: generateMapId(),
      songs: Array.isArray(response.data.songs) ? response.data.songs : [],
    };
  }

  // レスポンスが期待する形式でない場合は空のマップを返す
  return {
    mapId: generateMapId(),
    songs: [],
  };
}

class ApiClient {
  /**
   * 曲を追加（API Gateway経由でAIで座標を計算）
   */
  async addSong(
    song: Omit<Song, 'x' | 'y'>,
    axes: { xAxis: string; yAxis: string }
  ): Promise<ApiResponse<Song>> {
    try {
      // API Gateway経由でSageMakerエンドポイントにリクエスト
      // songs（複数形）で統一
      const requestBody = {
        songs: [song],
        xAxis: axes.xAxis,
        yAxis: axes.yAxis,
      };

      const response = await requestApiGateway(requestBody);
      const data = await response.json();

      if (!response.ok) {
        return parseSageMakerError(data, '曲の追加に失敗しました', 'SONG_ADDITION_FAILED');
      }

      // SageMakerからのレスポンスを期待する形式に変換
      const songWithPosition = parseSongResponse(data);

      return {
        success: true,
        data: songWithPosition,
      };
    } catch (error) {
      return handleApiError(error, '曲の追加に失敗しました', 'SONG_ADDITION_FAILED');
    }
  }

  /**
   * 曲を削除（ダミー実装 - 実際はフロントエンドで管理）
   */
  async removeSong(songId: string): Promise<ApiResponse<DeleteSongResponse>> {
    return {
      success: true,
      data: { id: songId },
    };
  }

  /**
   * マップを作成（API Gateway経由でAIで初期曲をマッピング）
   */
  async createMap(axes: { xAxis: string; yAxis: string }): Promise<ApiResponse<CreateMapResponse>> {
    try {
      // API Gateway経由でSageMakerエンドポイントにリクエスト
      // 初期は空のマップを作成するため、songsは空配列
      const requestBody = {
        xAxis: axes.xAxis,
        yAxis: axes.yAxis,
        songs: [],
      };

      const response = await requestApiGateway(requestBody);
      const data = await response.json();

      if (!response.ok) {
        return parseSageMakerError(data, 'マップの作成に失敗しました', 'MAP_CREATION_FAILED');
      }

      // SageMakerからのレスポンスを期待する形式に変換
      const createMapResponse = parseMapResponse(data);

      return {
        success: true,
        data: createMapResponse,
      };
    } catch (error) {
      return handleApiError(error, 'マップの作成に失敗しました', 'MAP_CREATION_FAILED');
    }
  }

  /**
   * 曲を検索（iTunes APIを直接使用）
   * 注: 検索機能はAPI Gatewayの対象外
   */
  async searchSongs(query: string): Promise<ApiResponse<SearchResult[]>> {
    if (!query || typeof query !== 'string') {
      return {
        success: false,
        data: undefined,
        message: 'Search query is required',
        code: 'MISSING_QUERY',
      };
    }

    if (!query.trim()) {
      return {
        success: true,
        data: [],
      };
    }

    try {
      return await this.searchSongsFromiTunes(query);
    } catch (error) {
      return handleApiError(error, '検索に失敗しました', 'SEARCH_FAILED');
    }
  }

  /**
   * iTunes APIから直接検索
   */
  private async searchSongsFromiTunes(query: string): Promise<ApiResponse<SearchResult[]>> {
    try {
      const encodedQuery = encodeURIComponent(query.trim());
      const url = `https://itunes.apple.com/search?term=${encodedQuery}&media=music&entity=song&limit=25&country=JP`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`iTunes API returned ${response.status}`);
      }

      const data: iTunesSearchResponse = await response.json();

      const results: SearchResult[] = data.results.map((track) => ({
        id: track.trackId.toString(),
        title: track.trackName,
        artist: track.artistName,
        album: track.collectionName,
        imageUrl: track.artworkUrl100,
        spotifyUrl: track.trackViewUrl,
        previewUrl: track.previewUrl,
      }));

      return {
        success: true,
        data: results,
      };
    } catch (error) {
      return handleApiError(error, 'iTunes検索に失敗しました', 'ITUNES_SEARCH_FAILED');
    }
  }
}

export const apiClient = new ApiClient();
