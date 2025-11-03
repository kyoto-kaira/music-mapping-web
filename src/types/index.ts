// 共通型を再エクスポート
export type {
    AddSongRequest, ApiResponse,
    CreateMapRequest, CreateMapResponse, DeleteSongResponse, MapAxes,
    SearchResult, Song, SongPosition
} from './shared';

// コンポーネントのプロパティ型定義
export interface ScatterPlotProps {
  songs: Song[];
  mapAxes: MapAxes;
  hasCoordinates: boolean;
  selectedSong: Song | null;
  onSongSelect: (song: Song, position?: SongPosition) => void;
  isLoading: boolean;
  newlyAddedSongId?: string | null;
}

export interface AudioPlayerProps {
  previewUrl?: string;
  className?: string;
}

export interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onAddSong: (song: Omit<Song, 'x' | 'y'>) => void;
  hasCoordinates: boolean;
}

export interface TopBarProps {
  onCreateMap: (axes: MapAxes) => void;
  isLoading: boolean;
  mapAxes: MapAxes;
}

export interface FloatingCardProps {
  song: Song;
  position?: SongPosition | null;
  onRemove: (songId: string) => void;
  onClose: () => void;
  isNewlyAdded?: boolean;
}

// 状態管理の型定義
export interface AppState {
  songs: Song[];
  selectedSong: Song | null;
  isLoading: boolean;
  mapAxes: MapAxes;
  hasCoordinates: boolean;
  sidebarOpen: boolean;
  newlyAddedSongId: string | null;
  selectedSongPosition: SongPosition | null;
}
