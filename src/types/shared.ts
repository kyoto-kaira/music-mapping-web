// 共通の型定義ファイル

// 音楽関連の型定義
export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  spotifyUrl?: string;
  previewUrl?: string;
  imageUrl?: string;
  x?: number;
  y?: number;
}

export interface MapAxes {
  xAxis: string;
  yAxis: string;
}

export interface SearchResult {
  id: string;
  title: string;
  artist: string;
  album: string;
  imageUrl: string;
  spotifyUrl: string;
  previewUrl?: string;
}

export interface SongPosition {
  x: number;
  y: number;
}

// API関連の型定義
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
}

export interface CreateMapRequest {
  xAxis: string;
  yAxis: string;
}

export interface CreateMapResponse {
  mapId: string;
  songs: Song[];
}

export interface AddSongRequest {
  song: Omit<Song, 'x' | 'y'>;
}

export interface DeleteSongResponse {
  id: string;
}

// エラーレスポンス
export interface ApiError {
  success: false;
  message: string;
  code?: string;
}

// 検索クエリパラメータ
export interface SearchQuery {
  q: string;
}

// マップ関連の型
export interface MapState {
  mapId: string | null;
  axes: MapAxes;
  songs: Song[];
  hasCoordinates: boolean;
}

