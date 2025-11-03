import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { apiClient } from '../lib/api-client';
import { CONSTANTS } from '../constants';
import { MapAxes, SearchResult, Song, SongPosition } from '../types';

export const useSongs = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadInitialSongs = useCallback(async () => {
    setIsLoading(true);
    try {
      // 初期読み込みは不要（マップごとに曲を管理）
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading initial songs:', error);
      toast.error(CONSTANTS.MESSAGES.ERROR.INITIAL_LOAD_FAILED);
      setIsLoading(false);
    }
  }, []);

  const createMap = useCallback(async (axes: MapAxes) => {
    if (!axes.xAxis.trim() || !axes.yAxis.trim()) {
      toast.error(CONSTANTS.MESSAGES.ERROR.AXES_REQUIRED);
      return false;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.createMap(axes);
      if (response.success && response.data) {
        setSongs(response.data.songs);
        toast.success(CONSTANTS.MESSAGES.SUCCESS.MAP_CREATED);
        return true;
      } else {
        throw new Error(response.message || 'Failed to create map');
      }
    } catch (error) {
      console.error('Error creating map:', error);
      toast.error(CONSTANTS.MESSAGES.ERROR.MAP_CREATION_FAILED);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addSong = useCallback(async (newSong: Omit<Song, 'x' | 'y'>, axes: MapAxes) => {
    try {
      const response = await apiClient.addSong(newSong, axes);
      if (response.success) {
        setSongs(prev => [...prev, response.data]);
        toast.success(CONSTANTS.MESSAGES.SUCCESS.SONG_ADDED);
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to add song');
      }
    } catch (error: any) {
      console.error('Error adding song:', error);
      // サーバーからのエラーメッセージがある場合はそれを使用、なければデフォルトメッセージ
      const errorMessage = error?.message || CONSTANTS.MESSAGES.ERROR.SONG_ADDITION_FAILED;
      toast.error(errorMessage);
      return null;
    }
  }, []);

  const removeSong = useCallback(async (songId: string) => {
    try {
      const response = await apiClient.removeSong(songId);
      if (response.success) {
        setSongs(prev => prev.filter(song => song.id !== songId));
        toast.success(CONSTANTS.MESSAGES.SUCCESS.SONG_REMOVED);
        return true;
      } else {
        throw new Error(response.message || 'Failed to remove song');
      }
    } catch (error) {
      console.error('Error removing song:', error);
      toast.error(CONSTANTS.MESSAGES.ERROR.SONG_REMOVAL_FAILED);
      return false;
    }
  }, []);

  return {
    songs,
    setSongs,
    isLoading,
    loadInitialSongs,
    createMap,
    addSong,
    removeSong,
  };
};

export const useSongSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const performSearch = useCallback(async (query?: string) => {
    const searchTerm = query || searchQuery;
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await apiClient.searchSongs(searchTerm);
      if (response.success) {
        setSearchResults(response.data);
      } else {
        throw new Error(response.message || 'Failed to search songs');
      }
    } catch (error) {
      console.error('Error searching songs:', error);
      toast.error(CONSTANTS.MESSAGES.ERROR.SEARCH_FAILED);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    performSearch,
  };
};

export const useSongSelection = () => {
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [selectedSongPosition, setSelectedSongPosition] = useState<SongPosition | null>(null);
  const [newlyAddedSongId, setNewlyAddedSongId] = useState<string | null>(null);

  const selectSong = useCallback((song: Song, position?: SongPosition) => {
    setSelectedSong(song);
    setSelectedSongPosition(position || null);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedSong(null);
    setSelectedSongPosition(null);
  }, []);

  const markAsNewlyAdded = useCallback((songId: string) => {
    setNewlyAddedSongId(songId);
    setTimeout(() => {
      setNewlyAddedSongId(null);
    }, CONSTANTS.NEW_SONG_HIGHLIGHT_DURATION);
  }, []);

  return {
    selectedSong,
    selectedSongPosition,
    newlyAddedSongId,
    selectSong,
    clearSelection,
    markAsNewlyAdded,
  };
};
