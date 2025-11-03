import type { VercelRequest, VercelResponse } from '@vercel/node';

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

/**
 * iTunes APIで曲を検索
 */
async function searchiTunesTracks(query: string): Promise<iTunesTrack[]> {
  const encodedQuery = encodeURIComponent(query.trim());
  const url = `https://itunes.apple.com/search?term=${encodedQuery}&media=music&entity=song&limit=25&country=JP`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`iTunes API returned ${response.status}`);
  }

  const data: iTunesSearchResponse = await response.json();
  return data.results;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORSヘッダーを設定
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONSリクエストへの対応
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // GETリクエストのみ許可
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  }

  try {
    const { q } = req.query;

    // クエリパラメータの検証
    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
    }

    if (!q.trim()) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    // iTunes APIで検索
    const tracks = await searchiTunesTracks(q);

    // レスポンス形式に変換
    const results = tracks.map((track) => ({
      id: track.trackId.toString(),
      title: track.trackName,
      artist: track.artistName,
      album: track.collectionName,
      imageUrl: track.artworkUrl100,
      spotifyUrl: track.trackViewUrl, // iTunes URLをspotifyUrlフィールドに格納
      previewUrl: track.previewUrl,
    }));

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'iTunes検索に失敗しました',
    });
  }
}

