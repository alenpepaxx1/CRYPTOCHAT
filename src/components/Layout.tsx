import { apiFetch } from '../lib/api';
import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, ShoppingCart, LogOut, Clock, Share2, Check, User, Shield, Terminal, Plus, Bitcoin, Key, ArrowRight, Home as HomeIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store';
import CryptoTicker from './CryptoTicker';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useStore(state => state.user);
  const setUser = useStore(state => state.setUser);
  const siteSettings = useStore(state => state.siteSettings);
  const [copied, setCopied] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState(10);
  const [isRequesting, setIsRequesting] = useState(false);
  const [topUpSuccess, setTopUpSuccess] = useState(false);

  const handleLogout = () => {
    setUser(null);
    navigate('/');
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.origin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTopUpRequest = async () => {
    if (!user) return;
    setIsRequesting(true);
    try {
      const res = await apiFetch('/api/wallet/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, amount: topUpAmount })
      });
      if (res.ok) {
        setTopUpSuccess(true);
        setTimeout(() => {
          setTopUpSuccess(false);
          setShowTopUp(false);
        }, 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full bg-[var(--bg)] text-[#fafafa] font-sans selection:bg-[var(--accent)] selection:text-black overflow-hidden relative">
      {/* Scanline Effect Overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_2px,3px_100%] opacity-20" />
      
      {/* Sidebar / Bottom Nav */}
      <motion.div 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-full h-16 md:h-auto md:w-[70px] lg:w-[240px] xl:w-[280px] order-last md:order-first flex-shrink-0 bg-black border-t md:border-t-0 md:border-r border-[var(--border)] flex flex-row md:flex-col items-center md:items-stretch py-2 md:py-8 transition-all duration-300 z-40 relative md:static"
      >
        <div className="hidden md:flex flex-col lg:flex-row lg:px-6 mb-10 items-center justify-center lg:justify-start">
          {siteSettings?.site_logo && (
            <div className="w-10 h-10 rounded-sm bg-black border border-[var(--border)] flex items-center justify-center mb-4 lg:mb-0 lg:mr-4 overflow-hidden shrink-0 relative">
              <img src={siteSettings.site_logo} className="w-full h-full object-contain" alt="Site Logo" />
            </div>
          )}
          {!siteSettings?.site_logo && (
            <div className="w-10 h-10 rounded-sm bg-black border border-[var(--border)] flex items-center justify-center text-black font-bold mb-4 lg:mb-0 overflow-hidden shrink-0 relative group">
              {user?.avatar_url ? (
                <img src={user.avatar_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt={user.username} />
              ) : (
                <div className="gold-gradient w-full h-full flex items-center justify-center text-lg">
                  {user?.username.charAt(0).toUpperCase() || 'N'}
                </div>
              )}
              <div className="absolute inset-0 border border-white/10 pointer-events-none" />
            </div>
          )}
          <div className="hidden lg:flex flex-col ml-4">
            <span className="text-sm font-display font-bold tracking-tighter uppercase leading-none">{siteSettings?.site_name || 'CryptoChat'}</span>
            <span className="text-[8px] font-mono text-[var(--accent)] uppercase tracking-[0.3em] font-bold mt-1 opacity-60">{siteSettings?.site_version || 'Prot.v2.4.0'}</span>
          </div>
        </div>

        <div className="hidden lg:block lg:px-6 mb-6 w-full">
          <CryptoTicker />
        </div>

        <nav className="flex-1 max-md:flex-row max-md:justify-around max-md:items-center space-x-2 md:space-x-0 md:space-y-1.5 flex flex-col px-2 lg:px-3 w-full pb-0 md:pb-2 overflow-x-auto custom-scrollbar md:overflow-visible">
          <NavLink 
            to="/" 
            end
            className={({isActive}) => `
              group flex items-center justify-center lg:justify-start px-4 py-2.5 rounded-sm transition-all relative
              ${isActive ? 'bg-[var(--surface)] text-white' : 'text-[var(--text-dim)] hover:text-white hover:bg-white/5'}
            `}
          >
            {({isActive}) => (
              <>
                <HomeIcon size={18} className={`lg:mr-4 transition-colors ${isActive ? 'text-[var(--accent)]' : 'group-hover:text-white'}`} />
                <span className="hidden lg:inline text-[10px] font-display font-bold uppercase tracking-[0.2em] pt-0.5">Command Center</span>
                {isActive && <motion.div layoutId="nav-active" className="absolute left-0 bottom-0 md:top-2 md:bottom-2 w-full h-[2px] md:w-[2px] md:h-auto bg-[var(--accent)]" />}
              </>
            )}
          </NavLink>

          <NavLink 
            to="/chat" 
            className={({isActive}) => `
              group flex items-center justify-center lg:justify-start px-4 py-2.5 rounded-sm transition-all relative
              ${isActive ? 'bg-[var(--surface)] text-white' : 'text-[var(--text-dim)] hover:text-white hover:bg-white/5'}
            `}
          >
            {({isActive}) => (
              <>
                <MessageSquare size={18} className={`lg:mr-4 transition-colors ${isActive ? 'text-[var(--accent)]' : 'group-hover:text-white'}`} />
                <span className="hidden lg:inline text-[10px] font-display font-bold uppercase tracking-[0.2em] pt-0.5">Communications</span>
                {isActive && <motion.div layoutId="nav-active" className="absolute left-0 bottom-0 md:top-2 md:bottom-2 w-full h-[2px] md:w-[2px] md:h-auto bg-[var(--accent)]" />}
              </>
            )}
          </NavLink>
          
          <NavLink 
            to="/market" 
            className={({isActive}) => `
              group flex items-center justify-center lg:justify-start px-4 py-2.5 rounded-sm transition-all relative
              ${isActive ? 'bg-[var(--surface)] text-white' : 'text-[var(--text-dim)] hover:text-white hover:bg-white/5'}
            `}
          >
            {({isActive}) => (
              <>
                <ShoppingCart size={18} className={`lg:mr-4 transition-colors ${isActive ? 'text-[var(--accent)]' : 'group-hover:text-white'}`} />
                <span className="hidden lg:inline text-[10px] font-display font-bold uppercase tracking-[0.2em] pt-0.5">The Bazaar</span>
                {isActive && <motion.div layoutId="nav-active" className="absolute left-0 bottom-0 md:top-2 md:bottom-2 w-full h-[2px] md:w-[2px] md:h-auto bg-[var(--accent)]" />}
              </>
            )}
          </NavLink>

          <NavLink 
            to="/history" 
            className={({isActive}) => `
              group flex items-center justify-center lg:justify-start px-4 py-2.5 rounded-sm transition-all relative
              ${isActive ? 'bg-[var(--surface)] text-white' : 'text-[var(--text-dim)] hover:text-white hover:bg-white/5'}
            `}
          >
            {({isActive}) => (
              <>
                <Clock size={18} className={`lg:mr-4 transition-colors ${isActive ? 'text-[var(--accent)]' : 'group-hover:text-white'}`} />
                <span className="hidden lg:inline text-[10px] font-display font-bold uppercase tracking-[0.2em] pt-0.5">Ledger Data</span>
                {isActive && <motion.div layoutId="nav-active" className="absolute left-0 bottom-0 md:top-2 md:bottom-2 w-full h-[2px] md:w-[2px] md:h-auto bg-[var(--accent)]" />}
              </>
            )}
          </NavLink>

          {(user?.is_admin || user?.username === 'admin') && (
            <NavLink 
              to="/admin" 
              className={({isActive}) => `
                group flex items-center justify-center lg:justify-start px-4 py-2.5 rounded-sm transition-all relative
                ${isActive ? 'bg-[var(--surface)] text-white' : 'text-[var(--text-dim)] hover:text-white hover:bg-white/5'}
              `}
            >
              {({isActive}) => (
                <>
                  <Shield size={18} className={`lg:mr-4 transition-colors ${isActive ? 'text-[var(--accent)]' : 'group-hover:text-white'}`} />
                  <span className="hidden lg:inline text-[10px] font-display font-bold uppercase tracking-[0.2em] pt-0.5">Control Center</span>
                  {isActive && <motion.div layoutId="nav-active" className="absolute left-0 bottom-0 md:top-2 md:bottom-2 w-full h-[2px] md:w-[2px] md:h-auto bg-[var(--accent)]" />}
                </>
              )}
            </NavLink>
          )}

          {user && (
            <NavLink 
              to={`/seller/${user.id}`} 
              className={({isActive}) => `
                group flex items-center justify-center lg:justify-start px-4 py-2.5 rounded-sm transition-all relative
                ${isActive ? 'bg-[var(--surface)] text-white' : 'text-[var(--text-dim)] hover:text-white hover:bg-white/5'}
              `}
            >
              {({isActive}) => (
                <>
                  <User size={18} className={`lg:mr-4 transition-colors ${isActive ? 'text-[var(--accent)]' : 'group-hover:text-white'}`} />
                  <span className="hidden lg:inline text-[10px] font-display font-bold uppercase tracking-[0.2em] pt-0.5">Bio-ID Profile</span>
                  {isActive && <motion.div layoutId="nav-active" className="absolute left-0 bottom-0 md:top-2 md:bottom-2 w-full h-[2px] md:w-[2px] md:h-auto bg-[var(--accent)]" />}
                </>
              )}
            </NavLink>
          )}

          <div className="md:pt-6 md:pb-2 hidden md:block">
            <div className="h-[1px] bg-[var(--border)] w-full mb-4 opacity-50" />
            <button 
              onClick={handleShare}
              className="w-full flex items-center justify-center lg:justify-start px-4 py-2.5 rounded-sm transition-all text-[var(--text-dim)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/5 cursor-pointer border border-dashed border-[var(--border)]/80"
            >
              <div className="relative">
                <AnimatePresence mode="wait">
                  {copied ? (
                    <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flex items-center">
                      <Check size={18} className="lg:mr-4 text-green-500" />
                    </motion.div>
                  ) : (
                    <motion.div key="share" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flex items-center">
                      <Share2 size={18} className="lg:mr-4" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <span className="hidden lg:inline text-[9px] font-display font-bold uppercase tracking-[0.25em]">{copied ? 'Proxy Synced' : 'Invite Ops'}</span>
            </button>
          </div>

          {/* Mobile Only Quick Actions */}
          <div className="flex md:hidden items-center justify-center gap-2 px-2 border-l border-[var(--border)] ml-2">
            {user && (
              <button onClick={() => setShowTopUp(true)} className="p-2.5 text-[var(--text-dim)] hover:text-[var(--accent)] rounded-sm">
                <Terminal size={18} />
              </button>
            )}
            <button onClick={handleLogout} className="p-2.5 text-[var(--text-dim)] hover:text-red-500 rounded-sm">
              <LogOut size={18} />
            </button>
          </div>
        </nav>

        <div className="hidden md:flex mt-auto px-2 lg:px-3 flex-col space-y-3">
          {user && (
            <div className="group relative">
              <div 
                onClick={() => setShowTopUp(true)}
                className="flex flex-col items-center lg:items-start p-3 bg-white/5 border border-[var(--border)] rounded-sm overflow-hidden relative group cursor-pointer hover:border-[var(--accent)]/30 transition-all"
              >
                <div className="absolute top-0 right-0 w-8 h-8 bg-[var(--accent)] opacity-10 rotate-45 translate-x-4 -translate-y-4 transition-transform group-hover:scale-150" />
                <div className="flex items-center w-full mb-1">
                  <Terminal size={12} className="text-[var(--accent)] shrink-0" />
                  <span className="hidden lg:block ml-2 text-[8px] font-mono text-[var(--text-dim)] uppercase tracking-widest font-bold">Credit Registry</span>
                </div>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="text-[12px] font-bold text-white tracking-widest">{(user.credits || 0).toLocaleString()}</span>
                    <span className="text-[8px] font-mono text-[var(--accent)] font-bold">CR</span>
                  </div>
                  <div className="hidden lg:flex p-1 bg-[var(--accent)]/10 text-[var(--accent)] rounded-sm group-hover:bg-[var(--accent)] group-hover:text-black transition-all">
                    <Plus size={8} />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col items-center lg:items-start p-3 bg-white/5 border border-[var(--border)] rounded-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 w-8 h-8 bg-[var(--accent)] opacity-5 rotate-45 translate-x-4 -translate-y-4" />
            <div className="flex items-center w-full mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] shrink-0 animate-pulse"></div>
              <span className="hidden lg:block ml-3 text-[9px] font-mono text-[var(--text-dim)] uppercase tracking-widest font-bold">Encrypted Connection</span>
            </div>
            <span className="hidden lg:block text-[10px] font-bold text-white truncate w-full">{user?.username}</span>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center lg:justify-start px-4 py-3 rounded-sm transition-all text-[var(--text-dim)] hover:text-white hover:bg-red-500/10 group"
          >
            <LogOut size={18} className="lg:mr-4 group-hover:text-red-500 transition-colors" />
            <span className="hidden lg:inline text-[10px] font-display font-bold uppercase tracking-[0.2em] group-hover:text-red-500">Disconnect</span>
          </button>
          
          {/* Sidebar Footer Copyright */}
          <div className="hidden lg:block py-4 px-4 border-t border-[var(--border)] border-dashed mt-2">
            <p className="text-[7px] font-mono text-[var(--text-dim)] uppercase tracking-[0.2em] font-bold opacity-40 leading-relaxed text-center">
              © 2026 ALEN PEPA<br/>MATRIX OS v2.4
            </p>
          </div>
        </div>
      </motion.div>

      {/* Main View */}
      <motion.div 
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="flex-1 relative flex flex-col bg-[var(--bg)]"
      >
        <Outlet />
      </motion.div>
      {/* Top Up Modal */}
      <AnimatePresence>
        {showTopUp && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0a0a0a] border border-[var(--border)] p-8 max-w-md w-full relative shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-[var(--accent)] opacity-20" />
              <button 
                onClick={() => setShowTopUp(false)}
                className="absolute top-4 right-4 text-[var(--text-dim)] hover:text-white"
              >
                <Plus size={20} className="rotate-45" />
              </button>

              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-[var(--accent)]/10 text-[var(--accent)] rounded-sm">
                  <Bitcoin size={24} />
                </div>
                <div>
                  <h3 className="text-[14px] font-display font-bold uppercase tracking-widest text-white">Credit Injection</h3>
                  <span className="text-[8px] font-mono text-[var(--text-dim)] uppercase tracking-widest mt-1 block">BTC Matrix Top-up</span>
                </div>
              </div>

              {!topUpSuccess ? (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-dim)] block">Specify Amount ($1 = 1 CR)</label>
                    <div className="flex gap-3">
                      {[10, 50, 100, 500].map(amt => (
                        <button
                          key={amt}
                          onClick={() => setTopUpAmount(amt)}
                          className={`flex-1 py-3 border text-[10px] font-mono font-bold transition-all rounded-sm ${
                            topUpAmount === amt ? 'bg-[var(--accent)] text-black border-[var(--accent)] shadow-[0_0_15px_rgba(212,175,55,0.3)]' : 'border-[var(--border)] text-[var(--text-dim)] hover:border-white/20'
                          }`}
                        >
                          ${amt}
                        </button>
                      ))}
                    </div>
                    <div className="relative mt-2">
                       <input 
                        type="number"
                        min="1"
                        value={topUpAmount}
                        onChange={(e) => setTopUpAmount(parseInt(e.target.value) || 0)}
                        className="w-full bg-black border border-[var(--border)] p-4 text-white font-mono text-sm uppercase rounded-sm focus:border-[var(--accent)] outline-none"
                        placeholder="Custom Amount..."
                       />
                    </div>
                  </div>

                  <div className="p-4 bg-white/5 border border-[var(--border)] rounded-sm space-y-3">
                    <div className="flex items-center gap-3 text-[9px] font-mono text-[var(--text-dim)] uppercase font-bold tracking-widest opacity-60">
                      <Key size={10} /> Escrow Protocol
                    </div>
                    <p className="text-[10px] text-white opacity-40 leading-relaxed font-bold uppercase tracking-tighter">
                      Upon signal, a unique BTC address will be generated. Manual verification required for credit distribution.
                    </p>
                  </div>

                  <button
                    disabled={isRequesting || topUpAmount <= 0}
                    onClick={handleTopUpRequest}
                    className="w-full gold-gradient py-5 text-black text-[11px] font-display font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale"
                  >
                    {isRequesting ? 'Requesting Uplink...' : 'Commit Signal'}
                    <ArrowRight size={14} />
                  </button>
                </div>
              ) : (
                <div className="py-12 text-center space-y-6">
                  <div className="w-16 h-16 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 scale-150">
                    <Check size={32} />
                  </div>
                  <div>
                    <h4 className="text-white font-display font-bold uppercase tracking-widest mb-2">Signal Received</h4>
                    <p className="text-[9px] font-mono text-[var(--text-dim)] leading-relaxed uppercase tracking-widest">
                      Admin node notified. Credit Injection pending biometric verification of transaction blockchain.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
