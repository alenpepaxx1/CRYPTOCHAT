/**
 * Copyright Alen Pepa 2026
 */
import { useStore } from '../store';

export const apiFetch = async (url: string, options: RequestInit = {}) => {
  const token = useStore.getState().token;
  
  const headers = new Headers(options.headers || {});
  
  if (token && url.startsWith('/api/')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers
  });
};
