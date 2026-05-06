/**
 * Copyright Alen Pepa 2026
 */
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Zap, 
  Shield, 
  Terminal, 
  Cpu, 
  ArrowRight, 
  Activity, 
  ShoppingBag, 
  MessageCircle, 
  Users,
  TrendingUp,
  Globe,
  Lock,
  ChevronRight,
  Bitcoin
} from 'lucide-react';
import { useStore } from '../store';
import { apiFetch } from '../lib/api';
import { Link } from 'react-router-dom';

interface Stats {
  users: number;
  products: number;
  transactions: number;
  messages: number;
}

export default function Home() {
  const user = useStore(state => state.user);
  const siteSettings = useStore(state => state.siteSettings);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/public/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .finally(() => setLoading(false));
  }, []);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#050505] p-4 md:p-8 lg:p-12">
      <div className="max-w-6xl mx-auto space-y-12 pb-20">
        
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-sm border border-[var(--border)] bg-black/40 backdrop-blur-xl p-8 md:p-12 overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)]/5 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 blur-[80px] rounded-full pointer-events-none" />
          
          {/* Tactical Corners */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-[var(--accent)]/40" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-[var(--accent)]/40" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-[var(--accent)]/40" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-[var(--accent)]/40" />

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[9px] font-mono font-bold text-[var(--accent)] uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                System Uplink Active
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold uppercase tracking-tighter text-white leading-[0.9]">
                {siteSettings?.site_name || 'BAZAAR_LINK'} <span className="text-[var(--accent)]">MATRIX</span>
              </h1>
              
              <p className="text-sm md:text-md text-[var(--text-dim)] font-sans max-w-xl leading-relaxed">
                Welcome to the next generation of decentralized trade and communication. Encryption is mandatory. Trust is earned. The matrix is yours to command.
              </p>

              <div className="flex flex-wrap gap-4 pt-4">
                <Link 
                  to="/chat"
                  className="px-8 py-4 gold-gradient text-black font-display font-bold text-[10px] uppercase tracking-[0.2em] rounded-sm hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3"
                >
                  Enter Communications <ArrowRight size={14} />
                </Link>
                <Link 
                  to="/market"
                  className="px-8 py-4 bg-white/5 border border-[var(--border)] text-white font-display font-bold text-[10px] uppercase tracking-[0.2em] rounded-sm hover:bg-white/10 transition-all"
                >
                  Access Bazaar
                </Link>
              </div>
            </div>

            <div className="w-full md:w-auto shrink-0 relative lg:block hidden">
               <div className="w-80 h-80 bg-black border border-[var(--border)] rounded-sm relative flex items-center justify-center p-8">
                  {/* Decorative Elements */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--accent)_0%,transparent_70%)] opacity-[0.03]" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-white/5 rounded-full animate-[spin_20s_linear_infinite]" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-[var(--accent)]/10 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
                  
                  <Cpu size={120} className="text-[var(--accent)] opacity-20 relative z-10" />
                  
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                     <div className="space-y-1">
                        <div className="text-[7px] font-mono text-[var(--text-dim)] uppercase tracking-widest opacity-50">Pulse Rate</div>
                        <div className="text-[10px] font-mono text-white font-bold tracking-widest">98.2 MHz</div>
                     </div>
                     <div className="space-y-1 text-right">
                        <div className="text-[7px] font-mono text-[var(--text-dim)] uppercase tracking-widest opacity-50">Encryption</div>
                        <div className="text-[10px] font-mono text-emerald-500 font-bold tracking-widest uppercase">Active</div>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {[
            { label: 'Active Personas', value: stats?.users || '...', icon: Users, color: 'var(--accent)' },
            { label: 'Asset Listings', value: stats?.products || '...', icon: ShoppingBag, color: 'emerald-500' },
            { label: 'Network Signals', value: stats?.messages || '...', icon: MessageCircle, color: 'blue-500' },
            { label: 'Verified Escrows', value: stats?.transactions || '...', icon: TrendingUp, color: 'purple-500' }
          ].map((s, i) => (
            <motion.div 
              key={i}
              variants={item}
              className="bg-black/40 border border-[var(--border)] rounded-sm p-6 relative overflow-hidden group hover:border-[var(--accent)]/30 transition-all"
            >
              <div className="absolute top-0 right-0 w-12 h-12 bg-[var(--accent)]/5 rounded-bl-3xl translate-x-4 -translate-y-4 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform" />
              <s.icon size={20} className="text-[var(--accent)] mb-4 opacity-70" />
              <div className="text-2xl font-display font-bold text-white mb-1 tracking-tighter">
                {typeof s.value === 'number' ? s.value.toLocaleString() : s.value}
              </div>
              <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-[var(--text-dim)] font-bold opacity-60">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Main Content Areas */}
        <div className="grid lg:grid-cols-2 gap-8">
           {/* Quick Actions */}
           <motion.div 
             initial={{ opacity: 0, x: -20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: 0.4 }}
             className="space-y-6"
           >
              <div className="flex items-center gap-4 mb-4">
                 <Terminal size={18} className="text-[var(--accent)]" />
                 <h2 className="text-[12px] font-display font-bold uppercase tracking-[0.3em] text-white">System Commands</h2>
              </div>
              
              <div className="grid gap-3">
                 {[
                   { to: '/chat', label: 'Signal Override', sub: 'Access world & private communications', icon: Zap },
                   { to: '/market', label: 'Market Crawler', sub: 'Scan for available digital assets', icon: Globe },
                   { to: '/history', label: 'Audit Log 0x1', sub: 'Review personal transaction ledger', icon: Lock },
                   { to: `/seller/${user?.id}`, label: 'Bio-ID Update', sub: 'Modify network identity settings', icon: Shield }
                 ].map((link, i) => (
                   <Link 
                     key={i} 
                     to={link.to}
                     className="flex items-center p-5 bg-white/5 border border-[var(--border)] rounded-sm hover:border-[var(--accent)]/40 hover:bg-white/10 transition-all group"
                   >
                     <div className="w-10 h-10 rounded-sm bg-black border border-[var(--border)] flex items-center justify-center mr-5 group-hover:border-[var(--accent)] transition-colors">
                        <link.icon size={18} className="text-[var(--text-dim)] group-hover:text-[var(--accent)]" />
                     </div>
                     <div className="flex-1">
                        <div className="text-[11px] font-display font-bold uppercase tracking-widest text-white mb-1">{link.label}</div>
                        <div className="text-[9px] font-mono text-[var(--text-dim)] uppercase tracking-widest opacity-50">{link.sub}</div>
                     </div>
                     <ChevronRight size={14} className="text-[var(--text-dim)] opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                   </Link>
                 ))}
              </div>
           </motion.div>

           {/* Security Module */}
           <motion.div 
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: 0.5 }}
             className="bg-[var(--accent)]/5 border border-[var(--accent)]/20 rounded-sm p-8 relative overflow-hidden"
           >
              <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_20px,rgba(212,175,55,0.01)_20px,rgba(212,175,55,0.01)_40px)] pointer-events-none" />
              
              <div className="relative z-10 space-y-8">
                 <div className="flex items-center gap-3 p-3 bg-[var(--accent)]/10 border border-[var(--accent)]/20 w-fit rounded-sm">
                    <Shield size={24} className="text-[var(--accent)]" />
                    <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--accent)]">Protocol: Zero Trust</div>
                 </div>

                 <div className="space-y-4">
                    <h3 className="text-xl font-display font-bold uppercase tracking-tight text-white">Advanced Security Module</h3>
                    <p className="text-[11px] text-[var(--text-dim)] font-mono uppercase tracking-widest leading-relaxed">
                       Your connection is routed through multiple proxy layers. Biometric IDs are non-transferable. Market escrows are secured by blockchain-grade encryption protocols.
                    </p>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-black border border-[var(--border)] rounded-sm space-y-2">
                       <div className="text-[8px] font-mono text-[var(--accent)] uppercase tracking-widest font-bold">Encrypted Nodes</div>
                       <div className="text-lg font-display font-bold text-white tracking-widest uppercase">Verified</div>
                    </div>
                    <div className="p-4 bg-black border border-[var(--border)] rounded-sm space-y-2">
                       <div className="text-[8px] font-mono text-[var(--accent)] uppercase tracking-widest font-bold">Threat Level</div>
                       <div className="text-lg font-display font-bold text-white tracking-widest uppercase">Minimal</div>
                    </div>
                 </div>

                 <div className="pt-4">
                    <div className="flex items-center justify-between text-[8px] font-mono text-[var(--text-dim)] uppercase tracking-[0.3em] font-bold mb-3 mb-2">
                       <span>Matrix Stabilization</span>
                       <span>99.9%</span>
                    </div>
                    <div className="h-1 bg-black rounded-full overflow-hidden border border-[var(--border)]">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: '99.9%' }}
                         transition={{ duration: 1.5, ease: "easeOut" }}
                         className="h-full gold-gradient shadow-[0_0_10px_rgba(212,175,55,0.5)]"
                       />
                    </div>
                 </div>
              </div>

              {/* Decorative background logo */}
              <Zap size={200} className="absolute -bottom-20 -right-20 text-[var(--accent)] opacity-[0.03] rotate-12" />
           </motion.div>
        </div>

        {/* Footer info */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="pt-12 border-t border-[var(--border)] border-dashed text-center space-y-4"
        >
           <div className="flex justify-center gap-8 items-center opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
              <Activity size={16} />
              <div className="w-[1px] h-4 bg-[var(--border)]" />
              <Cpu size={16} />
              <div className="w-[1px] h-4 bg-[var(--border)]" />
              <Bitcoin size={16} />
           </div>
           <p className="text-[8px] font-mono text-[var(--text-dim)] uppercase tracking-[0.5em] font-bold">
              © 2026 Alen Pepa // ALL RIGHTS RESERVED
           </p>
        </motion.div>

      </div>
    </div>
  );
}
