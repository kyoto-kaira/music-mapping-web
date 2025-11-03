import { supabaseApi } from '../lib/supabase-api';
import { MapAxes, Song } from '../types';

export interface MapData {
  id: string;
  name: string;
  axes: MapAxes;
  songCount: number;
  createdAt: string;
  lastModified: string;
}

export interface MapWithSongs extends MapData {
  songs: Song[];
}

// マップ一覧を取得
export async function getAllMaps(): Promise<MapData[]> {
  try {
    const result = await supabaseApi.select<{
      id: string;
      name: string;
      x_axis: string;
      y_axis: string;
      created_at: string;
      updated_at: string;
    }>({
      table: 'maps',
      columns: 'id, name, x_axis, y_axis, created_at, updated_at',
      orderBy: { column: 'updated_at', ascending: false },
    });

    if (!result?.data) return [];

    const data = Array.isArray(result.data) ? result.data : [result.data];

    // 各マップの曲数を取得
    const mapsWithCounts = await Promise.all(
      data.map(async (map) => {
        const countResult = await supabaseApi.select({
          table: 'songs',
          filters: { eq: { map_id: map.id } },
          count: true,
        });

        return {
          id: map.id,
          name: map.name,
          axes: {
            xAxis: map.x_axis,
            yAxis: map.y_axis,
          },
          songCount: countResult?.count || 0,
          createdAt: map.created_at,
          lastModified: map.updated_at,
        };
      })
    );

    return mapsWithCounts;
  } catch (error) {
    console.error('Error loading maps:', error);
    return [];
  }
}

// 特定のマップを取得（曲を含む）
export async function getMapById(mapId: string): Promise<MapWithSongs | null> {
  try {
    const mapResult = await supabaseApi.select<{
      id: string;
      name: string;
      x_axis: string;
      y_axis: string;
      created_at: string;
      updated_at: string;
    }>({
      table: 'maps',
      filters: { eq: { id: mapId } },
      single: true,
    });

    if (!mapResult?.data) return null;

    const mapData = mapResult.data;

    const songsResult = await supabaseApi.select<{
      id: string;
      title: string;
      artist: string;
      album: string | null;
      spotify_url: string | null;
      preview_url: string | null;
      image_url: string | null;
      x: number;
      y: number;
    }>({
      table: 'songs',
      filters: { eq: { map_id: mapId } },
    });

    const songsData = songsResult?.data ? (Array.isArray(songsResult.data) ? songsResult.data : [songsResult.data]) : [];
    const songs: Song[] = songsData.map((song) => ({
      id: song.id,
      title: song.title,
      artist: song.artist,
      album: song.album || undefined,
      spotifyUrl: song.spotify_url || undefined,
      previewUrl: song.preview_url || undefined,
      imageUrl: song.image_url || undefined,
      x: song.x,
      y: song.y,
    }));

    return {
      id: mapData.id,
      name: mapData.name,
      axes: {
        xAxis: mapData.x_axis,
        yAxis: mapData.y_axis,
      },
      songCount: songs.length,
      createdAt: mapData.created_at,
      lastModified: mapData.updated_at,
      songs,
    };
  } catch (error) {
    console.error('Error loading map:', error);
    return null;
  }
}

// マップを作成
export async function createMap(
  name: string,
  axes: MapAxes
): Promise<{ id: string; songs: Song[] } | null> {
  try {
    const result = await supabaseApi.insert<{
      id: string;
      name: string;
      x_axis: string;
      y_axis: string;
    }>({
      table: 'maps',
      values: {
        name,
        x_axis: axes.xAxis,
        y_axis: axes.yAxis,
      },
      select: '*',
      single: true,
    });

    if (!result?.data) throw new Error('Failed to create map');

    return {
      id: result.data.id,
      songs: [],
    };
  } catch (error) {
    console.error('Error creating map:', error);
    return null;
  }
}

// マップに曲を追加
export async function addSongToMap(mapId: string, song: Song): Promise<boolean> {
  try {
    await supabaseApi.insert({
      table: 'songs',
      values: {
        id: song.id,
        map_id: mapId,
        title: song.title,
        artist: song.artist,
        album: song.album || null,
        spotify_url: song.spotifyUrl || null,
        preview_url: song.previewUrl || null,
        image_url: song.imageUrl || null,
        x: song.x!,
        y: song.y!,
      },
    });

    // マップの更新日時を更新
    await supabaseApi.update({
      table: 'maps',
      values: { updated_at: new Date().toISOString() },
      filters: { eq: { id: mapId } },
    });

    return true;
  } catch (error) {
    console.error('Error adding song:', error);
    return false;
  }
}

// マップから曲を削除
export async function removeSongFromMap(mapId: string, songId: string): Promise<boolean> {
  try {
    // 曲を削除（map_idでフィルタリングしてから削除する）
    // 注: 複数のフィルター条件を組み合わせる必要がある場合は、
    // サーバーレス関数側で対応する必要があります
    await supabaseApi.delete({
      table: 'songs',
      filters: { eq: { id: songId } },
    });

    // マップの更新日時を更新
    await supabaseApi.update({
      table: 'maps',
      values: { updated_at: new Date().toISOString() },
      filters: { eq: { id: mapId } },
    });

    return true;
  } catch (error) {
    console.error('Error removing song:', error);
    return false;
  }
}

// マップ名を更新
export async function updateMapName(mapId: string, newName: string): Promise<boolean> {
  try {
    await supabaseApi.update({
      table: 'maps',
      values: {
        name: newName,
        updated_at: new Date().toISOString(),
      },
      filters: { eq: { id: mapId } },
    });
    return true;
  } catch (error) {
    console.error('Error updating map name:', error);
    return false;
  }
}

// マップを削除
export async function deleteMap(mapId: string): Promise<boolean> {
  try {
    await supabaseApi.delete({
      table: 'maps',
      filters: { eq: { id: mapId } },
    });
    return true;
  } catch (error) {
    console.error('Error deleting map:', error);
    return false;
  }
}

