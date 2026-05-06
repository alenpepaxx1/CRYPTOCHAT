import { apiFetch } from '../lib/api';
import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { ShoppingBag, ArrowUpRight, ArrowDownLeft, Clock, Search, RefreshCw, Cpu, Database, ChevronRight, Terminal, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface Transaction {
  id: string;
  product_id: string;
  product_title: string;
  seller_id: string;
  seller_username: string;
  buyer_id: string;
  buyer_username: string;
  price_btc: number;
  created_at: string;
  dispute_status?: 'pending' | 'resolved' | 'dismissed' | null;
  dispute_reason?: string | null;
}

export default function History() {
  const user = useStore(state => state.user);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [submittingDispute, setSubmittingDispute] = useState(false);

  const fetchTransactions = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/transactions/${user.id}`);
      const data = await res.json();
      setTransactions(data);
    } catch (e) {
      console.error("Failed to fetch transactions", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDispute = async () => {
    if (!selectedTx || !disputeReason.trim() || !user) return;
    
    setSubmittingDispute(true);
    try {
      const res = await apiFetch(`/api/transactions/${selectedTx.id}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: disputeReason, userId: user.id })
      });
      
      if (res.ok) {
        await fetchTransactions();
        setSelectedTx(null);
        setDisputeReason('');
      } else {
        const error = await res.json();
        alert(error.error || "Failed to file dispute");
      }
    } catch (e) {
      console.error(e);
      alert("Error filing dispute");
    } finally {
      setSubmittingDispute(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [user]);

  const filteredTransactions = transactions.filter(t => 
    t.product_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.seller_username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.buyer_username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar w-full bg-[#050505] font-sans relative isolate">
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-[40vw] h-[40vh] bg-[var(--accent)]/5 blur-[120px] rounded-full pointer-events-none -z-10" />
      
      {/* Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 md:h-20 py-4 md:py-0 flex items-center justify-between px-4 sm:px-8 border-b border-[var(--border)] bg-black/60 backdrop-blur-xl z-20"
      >
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="p-2 sm:p-2.5 bg-black border border-[var(--border)] text-[var(--accent)] rounded-sm shrink-0">
            <Database size={20} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-display font-bold uppercase tracking-tighter text-white">
              Ledger History
            </h1>
            <p className="text-[8px] sm:text-[9px] font-mono text-[var(--text-dim)] uppercase tracking-widest mt-0.5">Immutable Protocol Movement Logs</p>
          </div>
        </div>
        
        <div className="flex-1 max-w-lg mx-6 xl:mx-12 hidden lg:block">
          <div className="relative group">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-dim)] group-focus-within:text-[var(--accent)] transition-colors" />
            <input 
              type="text"
              placeholder="SCAN LEDGER FOR SPECIFIC TXIDS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-[var(--border)] rounded-sm py-3 pl-12 pr-4 text-[10px] font-mono text-white focus:outline-none focus:border-[var(--accent)] focus:bg-white/10 transition-all placeholder:opacity-30 uppercase tracking-widest"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          <button 
            onClick={fetchTransactions}
            className="text-[var(--text-dim)] hover:text-white transition-colors p-2 shrink-0"
          >
            <RefreshCw size={18} className={loading && transactions.length > 0 ? "animate-spin" : ""} />
          </button>
        </div>
      </motion.div>

      <div className="p-4 sm:p-8 md:p-12 max-w-6xl mx-auto">
        <div className="lg:hidden mb-8">
          <div className="relative group">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-dim)] group-focus-within:text-[var(--accent)] transition-colors" />
            <input 
              type="text"
              placeholder="SEARCH LEDGER..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-[var(--border)] rounded-sm py-4 pl-12 pr-4 text-[10px] font-mono text-white focus:outline-none focus:border-[var(--accent)] transition-all uppercase tracking-widest"
            />
          </div>
        </div>

        {loading && transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-[var(--text-dim)]">
             <Cpu size={48} className="mb-6 animate-pulse text-[var(--accent)]" />
             <div className="font-mono text-[10px] uppercase tracking-[0.3em] animate-pulse">Decrypting Protocol Ledger...</div>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-32 border border-[var(--border)] border-dashed rounded-sm bg-white/[0.02] flex flex-col items-center">
            <Clock size={40} className="mb-6 text-[var(--border)] opacity-30" />
            <h3 className="text-white font-display font-bold uppercase tracking-widest text-sm mb-2">No activity recorded</h3>
            <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-dim)]">All valid protocol movements will manifest here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-12 px-8 mb-4 text-[9px] font-mono uppercase tracking-[0.3em] text-[var(--text-dim)] font-bold">
              <div className="col-span-12 sm:col-span-6 flex items-center gap-4">
                <Terminal size={12} className="opacity-30" />
                Asset / Signature
              </div>
              <div className="hidden sm:block sm:col-span-3">Counterparty</div>
              <div className="hidden sm:flex sm:col-span-3 justify-end items-center gap-2">
                Value Transfer
                <ChevronRight size={10} className="opacity-30" />
              </div>
            </div>
            
            <motion.div 
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: { staggerChildren: 0.05 }
                }
              }}
              className="space-y-4"
            >
              {filteredTransactions.map(t => {
                const isBuyer = t.buyer_id === user?.id;
                return (
                  <motion.div 
                    key={t.id} 
                    variants={{
                      hidden: { x: -10, opacity: 0 },
                      show: { x: 0, opacity: 1 }
                    }}
                    className="grid grid-cols-12 items-center bg-white/[0.03] border border-[var(--border)] rounded-sm p-6 sm:p-8 hover:border-[var(--accent)] hover:bg-white/[0.05] transition-all group relative overflow-hidden backdrop-blur-sm"
                  >
                    {/* Status side bar */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${isBuyer ? 'bg-[var(--emerald)]' : 'bg-red-500'} opacity-30 group-hover:opacity-100 transition-opacity`} />
                    
                    <div className="col-span-12 sm:col-span-6 flex items-start gap-6">
                      <div className={`mt-1 p-3 rounded-sm border ${isBuyer ? 'bg-[var(--emerald)]/10 text-[var(--emerald)] border-[var(--emerald)]/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                        {isBuyer ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-display font-bold text-white mb-2 group-hover:text-[var(--accent)] transition-colors uppercase tracking-tight truncate pr-4">
                          {t.product_title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[9px] font-mono uppercase tracking-widest text-[var(--text-dim)] font-bold">
                          <span className="flex items-center gap-2 opacity-60"><Database size={10} /> TXID_{t.id.slice(0, 12)}</span>
                          <span className="opacity-20 hidden sm:inline">|</span>
                          <span className="flex items-center gap-2 text-white/40"><Clock size={10} /> {format(new Date(t.created_at), 'MM.dd.yyyy HH:mm')}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-span-6 sm:col-span-3 mt-6 sm:mt-0">
                      <div className="text-[8px] font-mono uppercase tracking-[0.2em] text-[var(--text-dim)] font-bold mb-2 opacity-50">
                        {isBuyer ? 'SOURCE_ENTITY (SELLER)' : 'TARGET_ENTITY (BUYER)'}
                      </div>
                      <div className="text-[11px] font-display font-bold text-white uppercase tracking-widest flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border border-white/10 gold-gradient flex-shrink-0" />
                        {isBuyer ? t.seller_username : t.buyer_username}
                      </div>
                    </div>

                    <div className="col-span-6 sm:col-span-3 flex flex-col items-end mt-6 sm:mt-0">
                      <div className={`text-xl font-mono font-bold tracking-tighter ${isBuyer ? 'text-[var(--emerald)]' : 'text-red-500'}`}>
                        {isBuyer ? '-' : '+'}{t.price_btc} <span className="text-[10px] opacity-40">BTC</span>
                      </div>
                      
                      {t.dispute_status ? (
                        <div className={`mt-2 flex items-center gap-2 text-[8px] font-mono font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-sm border shadow-sm ${
                          t.dispute_status === 'pending' ? 'bg-[var(--gold)]/20 text-[var(--gold)] border-[var(--gold)]/40 animate-pulse' :
                          t.dispute_status === 'resolved' ? 'bg-[var(--emerald)]/20 text-[var(--emerald)] border-[var(--emerald)]/40' :
                          'bg-red-500/20 text-red-500 border-red-500/40'
                        }`}>
                          {t.dispute_status === 'pending' && (
                            <>
                              <AlertTriangle size={10} className="text-[var(--gold)]" />
                              <span className="opacity-80">Arbitration Pending</span>
                            </>
                          )}
                          {t.dispute_status === 'resolved' && (
                            <>
                              <CheckCircle size={10} className="text-[var(--emerald)]" />
                              <span className="opacity-80">Resolution Reached</span>
                            </>
                          )}
                          {t.dispute_status === 'dismissed' && (
                            <>
                              <XCircle size={10} className="text-red-500" />
                              <span className="opacity-80">Claim Dismissed</span>
                            </>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className="mt-2 text-[8px] font-mono font-bold uppercase tracking-[0.3em] px-2 py-1 bg-white/5 border border-white/10 text-white opacity-40 group-hover:opacity-100 transition-opacity">
                            LEDGER_FINALIZED
                          </div>
                          {isBuyer && (
                            <button 
                              onClick={() => setSelectedTx(t)}
                              className="mt-2 text-[7px] font-mono font-bold uppercase tracking-[0.2em] text-[var(--text-dim)] hover:text-red-500 transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100"
                            >
                              <AlertTriangle size={8} /> File Dispute
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        )}
      </div>

      {/* Dispute Modal */}
      <AnimatePresence>
        {selectedTx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTx(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-black border border-[var(--border)] p-8 rounded-sm shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-sm">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-display font-bold uppercase tracking-tight text-white">Dispute Transaction</h3>
                  <p className="text-[10px] font-mono text-[var(--text-dim)] uppercase tracking-widest mt-1">Ref: {selectedTx.id.slice(0, 16)}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-[9px] font-mono uppercase tracking-[0.3em] text-[var(--accent)] font-bold">
                      Reason for Dispute
                    </label>
                    <div className="text-[9px] font-mono font-bold tracking-widest text-[var(--text-dim)] uppercase">
                      {disputeReason.length} / 500
                    </div>
                  </div>
                  <div className="relative group">
                    <div className="absolute -inset-[1px] bg-gradient-to-r from-red-500/20 via-transparent to-red-500/20 rounded-sm opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                    <textarea 
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value.slice(0, 500))}
                      placeholder="DESCRIBE THE BREACH OF PROTOCOL IN DETAIL. PROVIDE ASSET SIGNATURES, TIMESTAMPS, AND EVIDENCE OF MALFEASANCE..."
                      className="w-full h-48 bg-white/[0.02] border border-[var(--border)] rounded-sm p-5 text-[11px] font-mono text-white focus:outline-none focus:border-red-500/50 transition-all resize-none placeholder:opacity-20 uppercase tracking-tight relative z-10 leading-relaxed shadow-inner"
                    />
                  </div>
                  <div className="mt-2 flex justify-between items-center">
                    <span className="text-[7px] font-mono text-red-500/40 uppercase tracking-[0.2em]">Min 20 chars required for arbitration</span>
                    {disputeReason.length >= 500 && (
                      <span className="text-[7px] font-mono text-red-500 uppercase tracking-widest animate-pulse">Max capacity reached</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setSelectedTx(null)}
                    disabled={submittingDispute}
                    className="py-4 text-[10px] font-display font-bold uppercase tracking-[0.2em] text-[var(--text-dim)] hover:text-white transition-colors border border-[var(--border)] rounded-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleDispute}
                    disabled={submittingDispute || disputeReason.trim().length < 20}
                    className="py-4 text-[10px] font-display font-bold uppercase tracking-[0.2em] bg-red-500 text-white rounded-sm hover:bg-red-600 transition-colors disabled:opacity-30 disabled:grayscale"
                  >
                    {submittingDispute ? 'Submitting...' : 'Initiate Dispute'}
                  </button>
                </div>

                <div className="pt-4 border-t border-[var(--border)] border-dashed">
                  <p className="text-[9px] font-mono text-[var(--text-dim)] leading-relaxed text-center uppercase tracking-widest leading-loose">
                    BY INITIATING A DISPUTE, YOU AGREE TO ANONYMOUS ARBITRATION. FUNDS MAY BE LOCKED UNTIL RESOLUTION.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
