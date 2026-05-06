/**
 * Copyright Alen Pepa 2026
 */
import { apiFetch } from '../lib/api';
import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { 
  Shield, 
  Users, 
  ShoppingBag, 
  AlertTriangle, 
  Trash2, 
  CheckCircle, 
  XSquare, 
  RefreshCw, 
  Database,
  Search,
  Activity,
  ChevronRight,
  Terminal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

interface AdminStats {
  users: number;
  products: number;
  transactions: number;
  disputes: number;
}

interface User {
  id: string;
  username: string;
  is_guest: number;
  is_banned: number;
  ban_reason: string | null;
  is_admin: number;
  credits?: number;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface Product {
  id: string;
  title: string;
  description: string;
  seller_username: string;
  price_btc: number;
  price_usd: number;
  wallet_address: string;
  image_url: string | null;
  status: string;
}

interface Dispute {
  id: string;
  buyer_username: string;
  seller_username: string;
  price_btc: number;
  dispute_reason: string;
  dispute_status: string;
  created_at: string;
}

interface AuditLog {
  id: string;
  admin_username: string;
  action: string;
  target_type: string;
  target_id: string;
  details: string;
  created_at: string;
}

interface CreditRequest {
  id: string;
  user_id: string;
  username: string;
  amount: number;
  btc_address: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export default function Admin() {
  const { user, siteSettings, setSiteSettings } = useStore();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [creditRequests, setCreditRequests] = useState<CreditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'products' | 'disputes' | 'audit' | 'wallet' | 'settings'>('wallet');

  const [searchTerm, setSearchTerm] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Edit Modal States
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editIsBanned, setEditIsBanned] = useState(false);
  const [editBanReason, setEditBanReason] = useState('');
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [editCredits, setEditCredits] = useState(0);
  const [editPassword, setEditPassword] = useState('');
  
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editProdTitle, setEditProdTitle] = useState('');
  const [editProdDesc, setEditProdDesc] = useState('');
  const [editProdPriceBtc, setEditProdPriceBtc] = useState(0);
  const [editProdPriceUsd, setEditProdPriceUsd] = useState(0);
  const [editProdWallet, setEditProdWallet] = useState('');
  const [editProdImageUrl, setEditProdImageUrl] = useState('');
  const [editProdStatus, setEditProdStatus] = useState('');
  
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchData = async () => {
    if (!user || (!user.is_admin && user.username !== 'admin')) return;
    setLoading(true);
    try {
      const [statsRes, usersRes, prodRes, dispRes, auditRes, walletRes] = await Promise.all([
        apiFetch(`/api/admin/stats?adminId=${user.id}`),
        apiFetch(`/api/admin/users?adminId=${user.id}`),
        apiFetch(`/api/admin/products?adminId=${user.id}`),
        apiFetch(`/api/admin/disputes?adminId=${user.id}`),
        apiFetch(`/api/admin/audit-logs?adminId=${user.id}`),
        apiFetch(`/api/admin/wallet/requests?adminId=${user.id}`)
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (prodRes.ok) setProducts(await prodRes.json());
      if (dispRes.ok) setDisputes(await dispRes.json());
      if (auditRes.ok) setAuditLogs(await auditRes.json());
      if (walletRes.ok) setCreditRequests(await walletRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleDeleteUser = async (targetId: string) => {
    if (!user || !window.confirm('IRREVERSIBLE: TERMINATE PERSONA?')) return;
    try {
      const res = await apiFetch(`/api/admin/users/${targetId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user.id })
      });
      if (res.ok) fetchData();
    } catch (e) { console.error(e); }
  };

  const handleResolveDispute = async (txId: string, status: string) => {
    if (!user) return;
    try {
      const res = await apiFetch('/api/admin/resolve-dispute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user.id, transactionId: txId, status })
      });
      if (res.ok) fetchData();
    } catch (e) { console.error(e); }
  };

  const handleUpdateUser = async () => {
    if (!user || !editingUser) return;
    setIsUpdating(true);
    try {
      const res = await apiFetch('/api/admin/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: user.id,
          userId: editingUser.id,
          username: editUsername,
          bio: editBio,
          is_banned: editIsBanned,
          ban_reason: editIsBanned ? editBanReason : null,
          is_admin: editIsAdmin,
          credits: editCredits,
          password: editPassword || undefined
        })
      });
      if (res.ok) {
        setEditingUser(null);
        fetchData();
      }
    } catch (e) { console.error(e); }
    finally { setIsUpdating(false); }
  };

  const handleDeleteProduct = async (prodId: string) => {
    if (!user || !window.confirm('TERMINATE ASSET RECORD?')) return;
    try {
      const res = await apiFetch('/api/admin/products/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user.id, productId: prodId })
      });
      if (res.ok) fetchData();
    } catch (e) { console.error(e); }
  };

  const handleUpdateProduct = async () => {
    if (!user || !editingProduct) return;
    setIsUpdating(true);
    try {
      const res = await apiFetch('/api/admin/products/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: user.id,
          productId: editingProduct.id,
          title: editProdTitle,
          description: editProdDesc,
          price_btc: editProdPriceBtc,
          price_usd: editProdPriceUsd,
          wallet_address: editProdWallet,
          image_url: editProdImageUrl,
          status: editProdStatus
        })
      });
      if (res.ok) {
        setEditingProduct(null);
        fetchData();
      }
    } catch (e) { console.error(e); }
    finally { setIsUpdating(false); }
  };

  const handleProductStatus = async (prodId: string, status: string) => {
    if (!user) return;
    try {
      const res = await apiFetch('/api/admin/products/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user.id, productId: prodId, status })
      });
      if (res.ok) fetchData();
    } catch (e) { console.error(e); }
  };

  const handleApproveCredits = async (requestId: string, status: string) => {
    if (!user) return;
    try {
      const res = await apiFetch('/api/admin/wallet/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user.id, requestId, status })
      });
      if (res.ok) fetchData();
    } catch (e) { console.error(e); }
  };

  const openEditUser = (u: User) => {
    setEditingUser(u);
    setEditUsername(u.username);
    setEditBio(u.bio || '');
    setEditIsBanned(u.is_banned === 1);
    setEditBanReason(u.ban_reason || '');
    setEditIsAdmin(u.is_admin === 1);
    setEditCredits(u.credits || 0);
    setEditPassword('');
  };

  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setEditProdTitle(p.title);
    setEditProdDesc(p.description || '');
    setEditProdPriceBtc(p.price_btc);
    setEditProdPriceUsd(p.price_usd || 0);
    setEditProdWallet(p.wallet_address || '');
    setEditProdImageUrl(p.image_url || '');
    setEditProdStatus(p.status);
  };

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim() || !user) return;
    setIsBroadcasting(true);
    try {
      const res = await apiFetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user.id, message: broadcastMessage })
      });
      if (res.ok) {
        setBroadcastMessage('');
        alert('BROADCAST TRANSMITTED');
        fetchData();
      }
    } catch (e) { console.error(e); }
    finally { setIsBroadcasting(false); }
  };

  if (!user || (!user.is_admin && user.username !== 'admin')) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-[var(--bg)] font-mono">
        <div className="text-center space-y-6 max-w-sm">
          <div className="inline-block p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-sm mb-4">
            <Shield size={48} />
          </div>
          <h2 className="text-2xl font-display font-bold uppercase tracking-tighter text-white">Security Breach</h2>
          <p className="text-[10px] text-[var(--text-dim)] uppercase tracking-[0.3em] font-bold leading-relaxed">
            CRITICAL // Unauthorized access attempt detected. Your node has been flagged for biometric review.
          </p>
          <div className="pt-8 border-t border-[var(--border)] border-dashed">
             <span className="text-[8px] opacity-30 uppercase tracking-[0.5em]">Session-Lock-Active</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-[var(--bg)] font-sans">
      {/* Admin Header */}
      <header className="p-8 border-b border-[var(--border)] bg-black/40 backdrop-blur-md z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="p-3 bg-[var(--accent)] text-black rounded-sm shadow-[0_0_20px_rgba(212,175,55,0.2)]">
              <Shield size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold uppercase tracking-tight text-white m-0">Central Command</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[8px] font-mono font-bold uppercase tracking-[0.3em] text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded-sm">Protocol 1.0.4</span>
                <span className="text-[8px] font-mono font-bold uppercase tracking-[0.3em] text-[var(--text-dim)] flex items-center gap-1">
                  <Activity size={8} /> System Online
                </span>
              </div>
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full md:w-auto">
              {[
                { label: 'Nodes', val: stats.users, icon: Users },
                { label: 'Assets', val: stats.products, icon: ShoppingBag },
                { label: 'Syncs', val: stats.transactions, icon: RefreshCw },
                { label: 'Alerts', val: stats.disputes, icon: AlertTriangle, color: 'text-red-500' }
              ].map((s, idx) => (
                <div key={idx} className="p-4 bg-white/5 border border-[var(--border)] rounded-sm min-w-[120px]">
                  <div className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-dim)] mb-1 flex items-center gap-2">
                    <s.icon size={10} className={s.color || ''} /> {s.label}
                  </div>
                  <div className={`text-xl font-display font-bold text-white ${s.color || ''}`}>{s.val}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-black/20 border-b border-[var(--border)] px-8">
        <div className="max-w-6xl mx-auto flex gap-8">
          {[
            { id: 'disputes', label: 'Dispute Resolution', icon: AlertTriangle },
            { id: 'wallet', label: 'Wallet Registry', icon: Terminal },
            { id: 'users', label: 'Persona Management', icon: Users },
            { id: 'products', label: 'Marketplace Oversight', icon: ShoppingBag },
            { id: 'audit', label: 'Audit Logs', icon: Database },
            { id: 'settings', label: 'Site Settings', icon: Activity }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-5 text-[10px] font-display font-bold uppercase tracking-[0.3em] flex items-center gap-3 border-b-2 transition-all relative ${
                activeTab === tab.id 
                  ? 'border-[var(--accent)] text-white' 
                  : 'border-transparent text-[var(--text-dim)] hover:text-white'
              }`}
            >
              <tab.icon size={14} className={activeTab === tab.id ? 'text-[var(--accent)]' : ''} />
              {tab.label}
              {tab.id === 'disputes' && disputes.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse absolute -right-4 top-1/2 -translate-y-1/2" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Advanced Controls Row */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Broadcaster */}
            <div className="flex-1 bg-white/5 border border-[var(--border)] p-5 rounded-sm flex items-center gap-4">
              <RefreshCw size={14} className="text-[var(--accent)]" />
              <input 
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="Global Broadcast Terminal..."
                className="flex-1 bg-transparent border-none outline-none text-[10px] font-mono uppercase tracking-widest text-white placeholder:text-white/20"
              />
              <button 
                onClick={handleBroadcast}
                disabled={isBroadcasting || !broadcastMessage.trim()}
                className="px-4 py-2 bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30 rounded-sm text-[8px] font-display font-bold uppercase tracking-widest hover:bg-[var(--accent)] hover:text-black transition-all disabled:opacity-20"
              >
                {isBroadcasting ? 'Broadcasting...' : 'Signal'}
              </button>
            </div>

            {/* Search */}
            <div className="lg:w-80 bg-white/5 border border-[var(--border)] p-5 rounded-sm flex items-center gap-4">
              <Search size={14} className="text-[var(--text-dim)]" />
              <input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Registry..."
                className="flex-1 bg-transparent border-none outline-none text-[10px] font-mono uppercase tracking-widest text-white placeholder:text-white/20"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 opacity-20">
              <RefreshCw size={48} className="animate-spin mb-4" />
              <span className="text-[10px] font-mono uppercase tracking-[0.5em]">Synchronizing...</span>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'wallet' && (
                  <div className="space-y-4">
                    {creditRequests.length === 0 ? (
                      <EmptyState icon={Terminal} message="No pending credit injections found in biometric ledger." />
                    ) : (
                      <div className="grid gap-4">
                        {creditRequests.map(r => (
                          <div key={r.id} className="bg-white/5 border border-[var(--border)] p-6 rounded-sm flex flex-col md:flex-row justify-between gap-6 group hover:bg-white/[0.07] transition-all">
                             <div className="space-y-4 flex-1">
                               <div className="flex items-center gap-3">
                                 <Terminal size={16} className="text-[var(--accent)]" />
                                 <span className="text-[11px] font-display font-bold uppercase tracking-[0.2em] text-white">Injection Request ID-{r.id.slice(0,8)}</span>
                                 <span className={`text-[8px] font-mono px-2 py-0.5 rounded-sm uppercase tracking-widest ${
                                   r.status === 'pending' ? 'bg-[var(--gold)]/20 text-[var(--gold)] border border-[var(--gold)]/30' : 
                                   r.status === 'approved' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                 }`}>
                                   {r.status}
                                 </span>
                               </div>
                               <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                                 <div>
                                   <div className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-dim)] mb-1">Target Persona</div>
                                   <div className="text-[10px] font-mono text-white uppercase font-bold">{r.username}</div>
                                 </div>
                                 <div>
                                   <div className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-dim)] mb-1">Injected Amount</div>
                                   <div className="text-[10px] font-mono text-[var(--accent)] font-bold">{r.amount} CR</div>
                                 </div>
                                 <div>
                                   <div className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-dim)] mb-1">Source Node Date</div>
                                   <div className="text-[10px] font-mono text-white opacity-40">{format(new Date(r.created_at), 'MMM dd, HH:mm')}</div>
                                 </div>
                               </div>
                               {r.btc_address && (
                                <div className="p-4 bg-black border border-white/5 rounded-sm flex flex-col gap-1">
                                  <div className="text-[8px] font-mono uppercase tracking-widest text-white/30 font-bold">BTC Address Correlation</div>
                                  <span className="text-[10px] font-mono text-white/60 lowercase italic">{r.btc_address}</span>
                                </div>
                               )}
                             </div>

                             {r.status === 'pending' && (
                               <div className="flex md:flex-col gap-2 justify-center md:border-l border-[var(--border)] md:pl-6">
                                <button 
                                  onClick={() => handleApproveCredits(r.id, 'approved')}
                                  className="flex-1 px-4 py-3 bg-[var(--emerald)]/10 text-[var(--emerald)] hover:bg-[var(--emerald)]/20 rounded-sm text-[9px] font-display font-bold uppercase tracking-widest border border-[var(--emerald)]/20 transition-all min-w-[100px]"
                                >
                                  Approve
                                </button>
                                <button 
                                  onClick={() => handleApproveCredits(r.id, 'rejected')}
                                  className="flex-1 px-4 py-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-sm text-[9px] font-display font-bold uppercase tracking-widest border border-red-500/20 transition-all min-w-[100px]"
                                >
                                  Reject
                                </button>
                              </div>
                             )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'disputes' && (
                  <div className="space-y-4">
                    {disputes.length === 0 ? (
                      <EmptyState icon={CheckCircle} message="Neutral consensus maintained. No active disputes." />
                    ) : (
                      <div className="grid gap-4">
                        {disputes.map(d => (
                          <div key={d.id} className="bg-white/5 border border-[var(--border)] p-6 rounded-sm flex flex-col md:flex-row justify-between gap-6 group hover:bg-white/[0.07] transition-all">
                            <div className="space-y-4 flex-1">
                              <div className="flex items-center gap-3">
                                <AlertTriangle size={16} className="text-red-500" />
                                <span className="text-[11px] font-display font-bold uppercase tracking-[0.2em] text-white">Dispute Sequence Alpha-{d.id.slice(0,8)}</span>
                                <span className={`text-[8px] font-mono px-2 py-0.5 rounded-sm uppercase tracking-widest ${
                                  d.dispute_status === 'pending' ? 'bg-[var(--gold)]/20 text-[var(--gold)] border border-[var(--gold)]/30' : 'bg-green-500/10 text-green-500'
                                }`}>
                                  {d.dispute_status}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                                <div>
                                  <div className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-dim)] mb-1">Involved Parties</div>
                                  <div className="text-[10px] font-mono text-white flex items-center gap-2">
                                    <span className="text-red-400">{d.buyer_username}</span>
                                    <ChevronRight size={8} className="opacity-20" />
                                    <span className="text-blue-400">{d.seller_username}</span>
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-dim)] mb-1">Asset Value</div>
                                  <div className="text-[10px] font-mono text-[var(--accent)] font-bold">{d.price_btc} BTC</div>
                                </div>
                                <div>
                                  <div className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-dim)] mb-1">Timestamp</div>
                                  <div className="text-[10px] font-mono text-white opacity-40">{format(new Date(d.created_at), 'MMM dd, HH:mm')}</div>
                                </div>
                              </div>
                              <div className="p-4 bg-black border border-red-500/10 rounded-sm">
                                <div className="text-[8px] font-mono uppercase tracking-widest text-red-500/60 mb-2 font-bold">Dispute Statement</div>
                                <p className="text-[10px] font-mono text-white leading-relaxed uppercase tracking-tight">{d.dispute_reason}</p>
                              </div>
                            </div>
                            
                            <div className="flex md:flex-col gap-2 justify-center md:border-l border-[var(--border)] md:pl-6">
                              <button 
                                onClick={() => handleResolveDispute(d.id, 'resolved')}
                                className="flex-1 px-4 py-3 bg-[var(--emerald)]/10 text-[var(--emerald)] hover:bg-[var(--emerald)]/20 rounded-sm text-[9px] font-display font-bold uppercase tracking-widest border border-[var(--emerald)]/20 transition-all"
                              >
                                Resolve
                              </button>
                              <button 
                                onClick={() => handleResolveDispute(d.id, 'dismissed')}
                                className="flex-1 px-4 py-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-sm text-[9px] font-display font-bold uppercase tracking-widest border border-red-500/20 transition-all"
                              >
                                Dismiss
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'users' && (
                  <div className="bg-white/5 border border-[var(--border)] rounded-sm overflow-hidden">
                    <table className="w-full text-left font-mono">
                      <thead className="bg-white/5 text-[8px] uppercase tracking-[0.4em] font-bold text-[var(--text-dim)]">
                        <tr>
                          <th className="px-6 py-4">Node Profile</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4">Connection Date</th>
                          <th className="px-6 py-4 text-right">Operations</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {users.filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase())).map(u => (
                          <tr key={u.id} className={`hover:bg-white/[0.02] transition-colors group ${u.is_banned ? 'opacity-40' : ''}`}>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-black border border-[var(--border)] rounded-sm flex items-center justify-center text-[10px] font-bold text-white overflow-hidden">
                                  {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" /> : u.username[0].toUpperCase()}
                                </div>
                                <div className="text-[11px] font-bold text-white uppercase tracking-tight">{u.username}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm border inline-block w-fit ${
                                  u.is_guest ? 'text-gray-500 border-gray-500/20 bg-gray-500/5' : 'text-[var(--accent)] border-[var(--accent)]/20 bg-[var(--accent)]/5'
                                }`}>
                                  {u.is_guest ? 'GUEST_NODE' : 'VERIFIED_ID'}
                                </span>
                                {u.is_admin === 1 && (
                                  <span className="text-[7px] text-blue-400 font-bold uppercase tracking-widest bg-blue-400/10 px-2 py-0.5 rounded-sm border border-blue-400/20 w-fit">ADMIN_ACCESS</span>
                                )}
                                {u.is_banned === 1 && (
                                  <>
                                    <span className="text-[7px] text-red-500 font-bold uppercase tracking-widest bg-red-500/10 px-2 py-0.5 rounded-sm border border-red-500/20 w-fit">TERMINATED</span>
                                    {u.ban_reason && (
                                      <span className="text-[8px] text-red-500/60 font-mono italic truncate max-w-[150px]" title={u.ban_reason}>
                                        REASON: {u.ban_reason}
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-[10px] text-[var(--text-dim)]">
                              {format(new Date(u.created_at), 'yyyy-MM-dd HH:mm')}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => openEditUser(u)}
                                  className="p-2 text-[var(--text-dim)] hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <Database size={16} />
                                </button>
                                {u.username !== 'admin' && (
                                  <button 
                                    onClick={() => handleDeleteUser(u.id)}
                                    className="p-2 text-[var(--text-dim)] hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'products' && (
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                     {products.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()) || p.seller_username.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                       <div key={p.id} className="bg-white/5 border border-[var(--border)] p-6 rounded-sm space-y-4 hover:border-[var(--accent)]/30 transition-all group relative overflow-hidden">
                         {p.status === 'banned' && (
                           <div className="absolute inset-0 bg-red-950/20 pointer-events-none backdrop-grayscale" />
                         )}
                         <div className="flex justify-between items-start">
                           <div className="text-[11px] font-display font-bold uppercase tracking-tight text-white group-hover:text-[var(--accent)] transition-colors line-clamp-1">{p.title}</div>
                           <span className={`text-[7px] font-mono px-2 py-0.5 rounded-sm font-bold uppercase tracking-widest ${
                             p.status === 'available' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                           }`}>
                             {p.status}
                           </span>
                         </div>
                         <div className="flex justify-between items-end border-t border-[var(--border)] pt-4 border-dashed">
                           <div>
                             <div className="text-[7px] font-mono uppercase tracking-[0.2em] text-[var(--text-dim)] mb-1">Merchant Node</div>
                             <div className="text-[10px] font-mono text-white opacity-60 uppercase">{p.seller_username}</div>
                           </div>
                           <div className="text-right">
                             <div className="text-[7px] font-mono uppercase tracking-[0.2em] text-[var(--text-dim)] mb-1">Contract Value</div>
                             <div className="text-xs font-mono font-bold text-[var(--accent)]">{p.price_btc} BTC</div>
                           </div>
                         </div>
                         
                         <div className="pt-4 flex gap-2 pt-4 border-t border-[var(--border)] border-dashed opacity-0 group-hover:opacity-100 transition-opacity">
                           <button 
                             onClick={() => openEditProduct(p)}
                             className="p-2 border border-[var(--border)] text-[var(--accent)] hover:bg-[var(--accent)]/5 rounded-sm"
                           >
                             <Database size={12} />
                           </button>
                           <button 
                             onClick={() => handleProductStatus(p.id, p.status === 'available' ? 'banned' : 'available')}
                             className={`flex-1 p-2 border rounded-sm text-[8px] font-bold uppercase tracking-widest transition-all ${
                                p.status === 'banned' ? 'text-green-500 border-green-500/20 hover:bg-green-500/5' : 'text-red-500 border-red-500/20 hover:bg-red-500/5'
                             }`}
                           >
                             {p.status === 'banned' ? 'Restore' : 'Ban'}
                           </button>
                           <button 
                             onClick={() => handleDeleteProduct(p.id)}
                             className="p-2 border border-red-500/20 text-red-500 hover:bg-red-500/10 rounded-sm"
                           >
                             <Trash2 size={12} />
                           </button>
                         </div>
                       </div>
                     ))}
                   </div>
                )}

                {activeTab === 'audit' && (
                   <div className="bg-white/5 border border-[var(--border)] rounded-sm overflow-hidden">
                    <table className="w-full text-left font-mono">
                      <thead className="bg-white/5 text-[8px] uppercase tracking-[0.4em] font-bold text-[var(--text-dim)]">
                        <tr>
                          <th className="px-6 py-4">Timestamp</th>
                          <th className="px-6 py-4">Admin</th>
                          <th className="px-6 py-4">Action</th>
                          <th className="px-6 py-4">Target</th>
                          <th className="px-6 py-4">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {auditLogs.map(l => (
                          <tr key={l.id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-6 py-4 text-[9px] text-[var(--text-dim)]">
                              {format(new Date(l.created_at), 'MM-dd HH:mm:ss')}
                            </td>
                            <td className="px-6 py-4 text-[10px] text-white uppercase font-bold">
                              {l.admin_username}
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--accent)]">
                                {l.action}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-[9px] text-white/60">
                              {l.target_type} // {l.target_id.slice(0, 8)}
                            </td>
                            <td className="px-6 py-4 text-[9px] text-[var(--text-dim)] italic max-w-[200px] truncate">
                              {l.details}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'settings' && (
                  <div className="bg-white/5 border border-[var(--border)] rounded-sm p-8 space-y-6 max-w-2xl">
                    <h2 className="text-xl font-display font-bold uppercase tracking-tighter text-white border-b border-[var(--border)] pb-4">Global Site Settings</h2>
                    
                    <div className="space-y-2">
                      <label className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-dim)]">Site Name</label>
                      <input 
                        type="text"
                        value={siteSettings.site_name || ''}
                        onChange={(e) => setSiteSettings({...siteSettings, site_name: e.target.value})}
                        className="w-full bg-black border border-[var(--border)] p-4 text-white font-mono text-sm rounded-sm focus:border-[var(--accent)] outline-none"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-dim)]">Logo URL (Optional)</label>
                      <input 
                        type="text"
                        value={siteSettings.site_logo || ''}
                        onChange={(e) => setSiteSettings({...siteSettings, site_logo: e.target.value})}
                        placeholder="https://example.com/logo.png"
                        className="w-full bg-black border border-[var(--border)] p-4 text-white font-mono text-sm rounded-sm focus:border-[var(--accent)] outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-dim)]">Site Tags (Comma separated)</label>
                      <input 
                        type="text"
                        value={siteSettings.site_tags || ''}
                        onChange={(e) => setSiteSettings({...siteSettings, site_tags: e.target.value})}
                        className="w-full bg-black border border-[var(--border)] p-4 text-white font-mono text-sm rounded-sm focus:border-[var(--accent)] outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-dim)]">Version Versioning String</label>
                      <input 
                        type="text"
                        value={siteSettings.site_version || ''}
                        onChange={(e) => setSiteSettings({...siteSettings, site_version: e.target.value})}
                        className="w-full bg-black border border-[var(--border)] p-4 text-white font-mono text-sm rounded-sm focus:border-[var(--accent)] outline-none"
                      />
                    </div>

                    <div className="pt-4 flex justify-end">
                      <button 
                        onClick={async () => {
                          if (!user) return;
                          try {
                            const res = await apiFetch('/api/settings', {
                              method: 'POST',
                              headers: { 
                                'Content-Type': 'application/json',
                                'x-user-id': user.id 
                              },
                              body: JSON.stringify({ settings: siteSettings })
                            });
                            if (res.ok) alert('Settings Saved');
                          } catch (e) {
                            console.error(e);
                          }
                        }}
                        className="px-8 py-4 gold-gradient text-black rounded-sm text-[10px] font-display font-bold uppercase tracking-[0.3em] active:scale-95 transition-all shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                      >
                        Commit Changes
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </main>

      {/* Edit User Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isUpdating && setEditingUser(null)}
              className="fixed inset-0 bg-black/90 backdrop-blur-xl"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0a0a0a] border border-[var(--border)] rounded-sm w-full max-w-md relative shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-[var(--border)] bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Database size={20} className="text-[var(--accent)]" />
                  <h3 className="text-[14px] font-display font-bold uppercase tracking-widest text-white">Persona Override</h3>
                </div>
                <button 
                  onClick={() => setEditingUser(null)}
                  className="text-[var(--text-dim)] hover:text-white transition-colors"
                >
                  <XSquare size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-dim)]">Alias Registry</label>
                  <input 
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full bg-black border border-[var(--border)] p-4 text-white font-mono text-sm uppercase rounded-sm focus:border-[var(--accent)] outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-dim)]">Bio-Metric Summary</label>
                  <textarea 
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    rows={4}
                    className="w-full bg-black border border-[var(--border)] p-4 text-white font-mono text-xs uppercase rounded-sm focus:border-[var(--accent)] outline-none resize-none custom-scrollbar"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-dim)]">Credit Balance Override</label>
                  <div className="relative">
                    <Terminal size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--accent)] opacity-50" />
                    <input 
                      type="number"
                      value={editCredits}
                      onChange={(e) => setEditCredits(parseFloat(e.target.value) || 0)}
                      className="w-full bg-black border border-[var(--border)] p-4 pl-12 text-white font-mono text-sm uppercase rounded-sm focus:border-[var(--accent)] outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-dim)]">Secure Access Protocol (Password Reset)</label>
                  <input 
                    type="password"
                    placeholder="Leave blank to maintain current protocol"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full bg-black border border-[var(--border)] p-4 text-white font-mono text-sm rounded-sm focus:border-[var(--accent)] outline-none"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-white/5 border border-[var(--border)] rounded-sm">
                  <div className="flex items-center gap-3">
                    <Shield size={14} className={editIsAdmin ? 'text-[var(--accent)]' : 'text-gray-500'} />
                    <span className="text-[10px] font-display font-bold uppercase tracking-widest text-white">Admin Privileges</span>
                  </div>
                  <button 
                    onClick={() => setEditIsAdmin(!editIsAdmin)}
                    disabled={editingUser.username === 'admin'}
                    className={`w-12 h-6 rounded-full p-1 transition-all flex ${editIsAdmin ? 'bg-[var(--accent)] justify-end' : 'bg-gray-800 justify-start'} ${editingUser.username === 'admin' ? 'opacity-30 cursor-not-allowed' : ''}`}
                  >
                    <motion.div layout className="w-4 h-4 bg-white rounded-full shadow-lg" />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/5 border border-[var(--border)] rounded-sm">
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={14} className={editIsBanned ? 'text-red-500' : 'text-gray-500'} />
                    <span className="text-[10px] font-display font-bold uppercase tracking-widest text-white">Termination Status</span>
                  </div>
                  <button 
                    onClick={() => setEditIsBanned(!editIsBanned)}
                    className={`w-12 h-6 rounded-full p-1 transition-all flex ${editIsBanned ? 'bg-red-600 justify-end' : 'bg-gray-800 justify-start'}`}
                  >
                    <motion.div layout className="w-4 h-4 bg-white rounded-full shadow-lg" />
                  </button>
                </div>

                <AnimatePresence>
                  {editIsBanned && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 overflow-hidden"
                    >
                      <label className="text-[9px] font-mono uppercase tracking-widest text-red-500/60 font-bold">Termination Justification (Ban Reason)</label>
                      <textarea 
                        value={editBanReason}
                        onChange={(e) => setEditBanReason(e.target.value)}
                        placeholder="State the violation of protocol..."
                        rows={2}
                        className="w-full bg-black border border-red-500/20 p-4 text-white font-mono text-xs uppercase rounded-sm focus:border-red-500 outline-none resize-none"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={handleUpdateUser}
                  disabled={isUpdating}
                  className="w-full py-5 bg-[var(--accent)] text-black rounded-sm text-[11px] font-display font-bold uppercase tracking-[0.3em] shadow-[0_0_30px_rgba(212,175,55,0.2)] transition-all active:scale-95 disabled:grayscale disabled:opacity-50"
                >
                  {isUpdating ? 'Executing Override...' : 'Commit Protocol Update'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Product Modal */}
      <AnimatePresence>
        {editingProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isUpdating && setEditingProduct(null)}
              className="fixed inset-0 bg-black/90 backdrop-blur-xl"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0a0a0a] border border-[var(--border)] rounded-sm w-full max-w-md relative shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-[var(--border)] bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Database size={20} className="text-[var(--accent)]" />
                  <h3 className="text-[14px] font-display font-bold uppercase tracking-widest text-white">Asset Oversight</h3>
                </div>
                <button 
                  onClick={() => setEditingProduct(null)}
                  className="text-[var(--text-dim)] hover:text-white transition-colors"
                >
                  <XSquare size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
                <div className="space-y-2">
                  <label className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-dim)]">Asset Label (Title)</label>
                  <input 
                    type="text"
                    value={editProdTitle}
                    onChange={(e) => setEditProdTitle(e.target.value)}
                    className="w-full bg-black border border-[var(--border)] p-4 text-white font-mono text-sm uppercase rounded-sm focus:border-[var(--accent)] outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-dim)]">Description Ledger</label>
                  <textarea 
                    value={editProdDesc}
                    onChange={(e) => setEditProdDesc(e.target.value)}
                    rows={4}
                    className="w-full bg-black border border-[var(--border)] p-4 text-white font-mono text-xs uppercase rounded-sm focus:border-[var(--accent)] outline-none resize-none custom-scrollbar"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-dim)]">BTC Valuation</label>
                    <input 
                      type="number"
                      step="0.0001"
                      value={editProdPriceBtc}
                      onChange={(e) => setEditProdPriceBtc(parseFloat(e.target.value) || 0)}
                      className="w-full bg-black border border-[var(--border)] p-4 text-white font-mono text-sm uppercase rounded-sm focus:border-[var(--accent)] outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-dim)]">Credit Value ($)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={editProdPriceUsd}
                      onChange={(e) => setEditProdPriceUsd(parseFloat(e.target.value) || 0)}
                      className="w-full bg-black border border-[var(--border)] p-4 text-white font-mono text-sm uppercase rounded-sm focus:border-[var(--accent)] outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-dim)]">Target Wallet (BTC)</label>
                  <input 
                    type="text"
                    value={editProdWallet}
                    onChange={(e) => setEditProdWallet(e.target.value)}
                    className="w-full bg-black border border-[var(--border)] p-4 text-white font-mono text-[10px] rounded-sm focus:border-[var(--accent)] outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-dim)]">Visual Uplink (Image URL)</label>
                  <input 
                    type="text"
                    value={editProdImageUrl}
                    onChange={(e) => setEditProdImageUrl(e.target.value)}
                    placeholder="https://matrix-assets.com/item.jpg"
                    className="w-full bg-black border border-[var(--border)] p-4 text-white font-mono text-[10px] rounded-sm focus:border-[var(--accent)] outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-dim)]">Inventory Status</label>
                  <select 
                    value={editProdStatus}
                    onChange={(e) => setEditProdStatus(e.target.value)}
                    className="w-full bg-black border border-[var(--border)] p-4 text-white font-mono text-xs uppercase rounded-sm focus:border-[var(--accent)] outline-none"
                  >
                    <option value="available">Available</option>
                    <option value="sold">Sold</option>
                    <option value="reserved">Reserved</option>
                    <option value="banned">Banned (Flagged)</option>
                  </select>
                </div>
              </div>

              <div className="p-8 border-t border-[var(--border)] bg-white/5">
                <button 
                  onClick={handleUpdateProduct}
                  disabled={isUpdating}
                  className="w-full py-4 gold-gradient text-black text-[12px] font-display font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isUpdating ? 'Synchronizing Node...' : 'Commit Oversight'}
                  <Database size={16} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: any, message: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-20 opacity-20 border border-dashed border-[var(--border)] rounded-sm">
      <Icon size={32} className="mb-4" />
      <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-center max-w-xs leading-loose">{message}</span>
    </div>
  );
}
