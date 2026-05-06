/**
 * Copyright Alen Pepa 2026
 */
import { create } from 'zustand';

interface User {
  id: string;
  username: string;
  avatar_url?: string | null;
  is_guest?: boolean;
  is_admin?: boolean;
  credits?: number;
}

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  token: string | null;
  setToken: (token: string | null) => void;
  activeRoomId: string | null;
  setActiveRoomId: (id: string | null) => void;
  siteSettings: Record<string, string>;
  setSiteSettings: (settings: Record<string, string>) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  token: localStorage.getItem('auth_token') || null,
  setToken: (token) => {
    if (token) localStorage.setItem('auth_token', token);
    else localStorage.removeItem('auth_token');
    set({ token });
  },
  activeRoomId: null, // by default let's use null
  setActiveRoomId: (activeRoomId) => set({ activeRoomId }),
  siteSettings: {
    site_name: 'CryptoChat',
    site_logo: '',
    site_tags: 'Anonymous, Secure, Crypto, Underground',
    site_version: 'Prot.v2.4.0'
  },
  setSiteSettings: (siteSettings) => set({ siteSettings })
}));
