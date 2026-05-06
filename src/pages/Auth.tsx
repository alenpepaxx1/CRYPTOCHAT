/**
 * Copyright Alen Pepa 2026
 */
import React, { useState } from 'react';
import { useStore } from '../store';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Key, User, Terminal, Cpu, ArrowRight, Lock, Unlock, RefreshCw, X } from 'lucide-react';

type AuthMode = 'alias' | 'login' | 'signup';

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('alias');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setUser = useStore(state => state.setUser);
  const setToken = useStore(state => state.setToken);
  const siteSettings = useStore(state => state.siteSettings);

  const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptcha(result);
    setCaptchaInput('');
  };

  React.useEffect(() => {
    generateCaptcha();
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    if (mode !== 'alias' && !password.trim()) {
      setError('Password is required');
      return;
    }
    
    if (captchaInput.toUpperCase() !== captcha) {
      setError('Anti-Bot Verification Failed');
      generateCaptcha();
      return;
    }
    
    setLoading(true);
    setError('');

    let endpoint = '/api/auth/alias';
    let body: any = { username: username.trim() };

    if (mode === 'login') {
      endpoint = '/api/auth/login';
      body.password = password;
    } else if (mode === 'signup') {
      endpoint = '/api/auth/signup';
      body.password = password;
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      
      if (res.ok && data.id) {
        if (data.token) setToken(data.token);
        setUser(data.user || data); // handle structure changes in api
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('A network error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#050505] text-[#e5e5e5] font-sans overflow-hidden relative isolate">
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-[50vw] h-[50vh] bg-[var(--accent)]/5 blur-[120px] rounded-full pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-[40vw] h-[40vh] bg-[var(--emerald)]/5 blur-[100px] rounded-full pointer-events-none -z-10" />
      
      {/* Scanline overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.03] select-none" style={{
        backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
        backgroundSize: '100% 4px, 3px 100%'
      }} />

      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-sm p-10 bg-black/40 border border-[var(--border)] rounded-sm backdrop-blur-2xl shadow-2xl"
      >
        {/* Tactical corners */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[var(--accent)]/30" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[var(--accent)]/30" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[var(--accent)]/30" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[var(--accent)]/30" />

        <div className="mb-10 text-center">
            <motion.div 
              initial={{ rotate: -10, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-3 text-[var(--accent)] mb-4"
            >
              <Cpu size={28} />
              <h1 className="text-3xl font-display font-bold uppercase tracking-tighter text-white">
                {siteSettings?.site_name?.toUpperCase() || 'BAZAAR_LINK'}
              </h1>
            </motion.div>
            <p className="text-[9px] font-mono text-[var(--text-dim)] uppercase tracking-[0.4em] font-bold">Secure Persona Entry Point</p>
        </div>
        
        <div className="flex border-b border-[var(--border)] mb-10 overflow-hidden rounded-sm bg-white/5">
          {(['alias', 'login', 'signup'] as AuthMode[]).map((m) => (
            <button 
              key={m}
              type="button"
              className={`flex-1 py-3.5 text-[9px] font-display font-bold uppercase tracking-widest transition-all relative ${mode === m ? 'text-black bg-[var(--accent)]' : 'text-[var(--text-dim)] hover:text-white hover:bg-white/5'}`}
              onClick={() => { setMode(m); setError(''); }}
            >
              {m}
              {mode === m && (
                <motion.div 
                  layoutId="auth-tab"
                  className="absolute inset-0 bg-[var(--accent)] -z-10"
                />
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8 overflow-hidden"
            >
              <div className="text-[10px] font-mono uppercase tracking-widest text-red-500 bg-red-500/5 border border-red-500/20 p-4 rounded-sm flex items-center gap-3">
                <X size={14} className="shrink-0" />
                {error}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <form onSubmit={handleSubmit} className="flex flex-col space-y-8">
          <motion.div
            layout
            className="space-y-6"
          >
            <div>
              <label className="text-[9px] font-mono uppercase tracking-[0.2em] text-[var(--text-dim)] font-bold mb-3 block opacity-50">Identity Designation</label>
              <div className="relative">
                <User size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-dim)] opacity-30" />
                <input 
                  type="text" 
                  autoFocus
                  placeholder="INPUT ALIAS..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-black border border-[var(--border)] rounded-sm pl-14 pr-6 py-4 text-xs font-mono text-white focus:outline-none focus:border-[var(--accent)] transition-all placeholder:opacity-20 uppercase tracking-widest"
                />
              </div>
            </div>

            <AnimatePresence>
              {mode !== 'alias' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <label className="text-[9px] font-mono uppercase tracking-[0.2em] text-[var(--text-dim)] font-bold mb-3 block opacity-50">Cryptic Pulse (Password)</label>
                  <div className="relative">
                    <Key size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-dim)] opacity-30" />
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-black border border-[var(--border)] rounded-sm pl-14 pr-6 py-4 text-xs font-mono text-white focus:outline-none focus:border-[var(--accent)] transition-all placeholder:opacity-20 uppercase tracking-widest"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4 pt-4 border-t border-[var(--border)] border-dashed">
              <label className="text-[9px] font-mono uppercase tracking-[0.2em] text-[var(--text-dim)] font-bold block opacity-50">Anti-Bot Perimeter Check</label>
              <div className="flex gap-3">
                <div 
                  className="flex-1 bg-white/5 border border-[var(--border)] rounded-sm flex items-center justify-center font-mono text-xl font-black italic tracking-[0.3em] text-[var(--accent)] select-none pointer-events-none relative overflow-hidden h-14"
                  style={{ textShadow: '0 0 10px rgba(212, 175, 55, 0.5)' }}
                >
                  <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,white_5px,white_6px)]" />
                  {captcha}
                </div>
                <button 
                  type="button"
                  onClick={generateCaptcha}
                  className="p-4 bg-white/5 border border-[var(--border)] rounded-sm text-[var(--text-dim)] hover:text-white transition-colors"
                  title="Regenerate Verification String"
                >
                  <RefreshCw size={18} />
                </button>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-dim)] opacity-30" />
                <input 
                  type="text" 
                  placeholder="SOLVE CHALLENGE..."
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                  className="w-full bg-black border border-[var(--border)] rounded-sm pl-14 pr-6 py-4 text-xs font-mono text-white focus:outline-none focus:border-[var(--accent)] transition-all placeholder:opacity-20 uppercase tracking-widest"
                />
              </div>
            </div>
          </motion.div>

          <button 
            type="submit" 
            disabled={loading}
            className="group w-full gold-gradient text-black font-display font-bold rounded-sm py-5 text-[11px] uppercase tracking-[0.3em] shadow-xl shadow-[var(--accent)]/10 disabled:opacity-30 disabled:grayscale transition-all active:scale-[0.98] relative overflow-hidden flex items-center justify-center gap-3"
          >
            {loading ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : (
              <>
                {mode === 'alias' ? 'Enter Network' : mode === 'signup' ? 'Broadcast Profile' : 'Authenticate Link'}
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </form>

        <div className="mt-10 pt-10 border-t border-[var(--border)] text-center opacity-30">
           <div className="flex items-center justify-center gap-6">
              <div className="flex flex-col items-center gap-2">
                 <Lock size={12} />
                 <span className="text-[7px] font-mono uppercase tracking-[0.2em] font-bold">Encrypted</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                 <Shield size={12} />
                 <span className="text-[7px] font-mono uppercase tracking-[0.2em] font-bold">Secure Env</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                 <Terminal size={12} />
                 <span className="text-[7px] font-mono uppercase tracking-[0.2em] font-bold">V-2.4.0</span>
              </div>
           </div>
        </div>
      </motion.div>
    </div>
  );
}
