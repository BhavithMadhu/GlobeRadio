/**
 * Global Type Definitions for GlobeRadio
 */

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  twoFactorEnabled: boolean;
}

export interface FavoriteStation {
  id: string;
  stationId: string;
  name: string;
  url: string;
  favicon?: string;
  tags?: string;
  country?: string;
  frequency?: string;
  bitrate?: string;
}

export interface RecentlyPlayed {
  id: string;
  stationId: string;
  name: string;
  url: string;
  favicon?: string;
  country?: string;
  playedAt: string;
}

export interface RadioStation {
  changeuuid: string;
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  favicon: string;
  tags: string;
  country: string;
  countrycode: string;
  state: string;
  language: string;
  votes: number;
  codec: string;
  bitrate: number;
  hls: number;
  frequency?: string; // App-computed for aesthetic
}

export interface Hotspot {
  id: string;
  country: string;
  lat: number;
  lng: number;
  x?: number; // 3D project coordinates
  y?: number;
  z?: number;
  visible?: boolean;
}
