/**
 * Copyright Alen Pepa 2026
 */
import { apiFetch } from './lib/api';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Auth from './pages/Auth';
import Layout from './components/Layout';
import Home from './pages/Home';
import Chat from './pages/Chat';
import Marketplace from './pages/Marketplace';
import History from './pages/History';
import SellerProfile from './pages/SellerProfile';
import Admin from './pages/Admin';
import LoadingScreen from './components/LoadingScreen';
import { useStore } from './store';
import { AnimatePresence } from 'motion/react';

export default function App() {
  const user = useStore(state => state.user);
  const setSiteSettings = useStore(state => state.setSiteSettings);
  const siteSettings = useStore(state => state.siteSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let requests = [
      apiFetch('/api/settings').then(res => res.json()).then(data => {
        if (data && !data.error) setSiteSettings(data);
      }).catch(console.error)
    ];

    if (useStore.getState().token) {
      requests.push(
        apiFetch('/api/auth/me').then(res => {
          if (res.ok) return res.json();
          // clear invalid token
          useStore.getState().setToken(null);
          return null;
        }).then(user => {
          if (user) useStore.getState().setUser(user);
        }).catch(console.error)
      );
    }

    Promise.allSettled(requests).finally(() => {
      setTimeout(() => setIsLoading(false), 500);
    });
  }, [setSiteSettings]);
  
  useEffect(() => {
    document.title = siteSettings?.site_name || 'CryptoChat';
  }, [siteSettings]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <BrowserRouter>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="chat" element={<Chat />} />
            <Route path="market" element={<Marketplace />} />
            <Route path="history" element={<History />} />
            <Route path="admin" element={<Admin />} />
            <Route path="seller/:id" element={<SellerProfile />} />
          </Route>
        </Routes>
      </AnimatePresence>
    </BrowserRouter>
  );
}
