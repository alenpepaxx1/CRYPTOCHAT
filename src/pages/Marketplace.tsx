/**
 * Copyright Alen Pepa 2026
 */
import { apiFetch } from '../lib/api';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Tag, Bitcoin, RefreshCw, Plus, Key, X, Star, Search, Cpu, ShoppingBag, ArrowRight, Shield, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface Product {
  id: string;
  user_id: string;
  seller_username: string;
  seller_avatar_url?: string | null;
  title: string;
  description: string;
  price_btc: number;
  price_usd: number;
  wallet_address: string;
  status: 'available' | 'sold' | 'reserved';
  image_url?: string;
  created_at: string;
  seller_rating: number | null;
  seller_rating_count: number;
}

export default function Marketplace() {
  const navigate = useNavigate();
  const user = useStore(state => state.user);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price_btc: 0.001,
    price_usd: 0,
    wallet_address: '',
    image_url: '',
    status: 'available' as const
  });

  const [ratingError, setRatingError] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [showPurchaseConfirm, setShowPurchaseConfirm] = useState(false);
  const [purchaseType, setPurchaseType] = useState<'btc' | 'credits'>('btc');
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/products');
      const data = await res.json();
      setProducts(data);
    } catch (e) {
      console.error("Failed to fetch products", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(p => ({ ...p, image_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await apiFetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, userId: user.id })
      });
      setShowPostModal(false);
      setFormData({ title: '', description: '', price_btc: 0.001, price_usd: 0, wallet_address: '', image_url: '', status: 'available' });
      fetchProducts();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateStatus = async (productId: string, newStatus: string) => {
    if (!user) return;
    try {
      const res = await apiFetch(`/api/products/${productId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, userId: user.id })
      });
      if (res.ok) {
        fetchProducts();
        if (selectedProduct) {
          setSelectedProduct(prev => prev ? { ...prev, status: newStatus as any } : null);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRateSeller = async (sellerId: string, rating: number) => {
    if (!user) return;
    setIsSubmittingRating(true);
    setRatingError('');

    try {
      const res = await apiFetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerId,
          buyerId: user.id,
          rating
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setRatingError(data.error || 'Failed to submit rating');
      } else {
        fetchProducts();
        const updatedRes = await apiFetch('/api/products');
        const updatedData = await updatedRes.json();
        setProducts(updatedData);
        if (selectedProduct) {
          const updatedProduct = updatedData.find((p: Product) => p.id === selectedProduct.id);
          if (updatedProduct) setSelectedProduct(updatedProduct);
        }
      }
    } catch (e) {
      console.error(e);
      setRatingError('Network error');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const handlePurchase = async (useCredits = false) => {
    if (!user || !selectedProduct) return;
    setIsPurchasing(true);
    try {
      const res = await apiFetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          sellerId: selectedProduct.user_id,
          buyerId: user.id,
          priceBtc: selectedProduct.price_btc,
          useCredits
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        alert(errorData.error || 'Transaction failed');
        return;
      }

      setPurchaseSuccess(true);
      // Refresh user credits if we used them
      const credRes = await apiFetch(`/api/user/credits?userId=${user.id}`);
      const credData = await credRes.json();
      useStore.getState().setUser({ ...user, credits: credData.credits });

      setTimeout(() => {
        setPurchaseSuccess(false);
        setSelectedProduct(null);
        setShowPurchaseConfirm(false);
      }, 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsPurchasing(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar w-full relative bg-[var(--bg)] font-sans">
      {/* Access Denied for Guests */}
      {user?.is_guest && (
        <div className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-3xl flex items-center justify-center p-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full bg-black border border-red-500/20 p-12 rounded-sm text-center shadow-2xl relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-red-500/5 pointer-events-none" />
            <div className="mb-8 relative inline-block">
              <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full" />
              <Shield size={64} className="text-red-500 relative" />
            </div>
            <h2 className="text-2xl font-display font-bold uppercase tracking-tighter text-white mb-4">ACCESS_DENIED</h2>
            <p className="text-[10px] font-mono text-[var(--text-dim)] uppercase tracking-[0.3em] font-bold mb-10 leading-relaxed">
              Marketplace protocols restricted to verified personas. <br/>Guest aliases lack security clearance.
            </p>
            <button 
              onClick={() => navigate('/login')}
              className="w-full py-4 text-black font-display font-bold uppercase tracking-[0.2em] text-[11px] bg-white hover:bg-gray-200 transition-all active:scale-[0.98] rounded-sm"
            >
              Establish Verified Link
            </button>
          </motion.div>
        </div>
      )}

      {/* Search Overlay Gradient */}
      <div className="fixed top-0 left-0 right-0 h-40 bg-gradient-to-b from-black to-transparent pointer-events-none z-10 opacity-50" />

      {/* Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 md:h-20 py-4 md:py-0 flex items-center justify-between px-4 sm:px-8 border-b border-[var(--border)] bg-black/60 backdrop-blur-xl z-20"
      >
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="p-2 sm:p-2.5 bg-[var(--accent)] text-black rounded-sm shrink-0">
            <ShoppingBag size={20} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-display font-bold uppercase tracking-tighter text-white">
              The Bazaar
            </h1>
            <p className="text-[8px] sm:text-[9px] font-mono text-[var(--text-dim)] uppercase tracking-widest mt-0.5">Underground Asset Exchange</p>
          </div>
        </div>

        <div className="flex-1 max-w-lg mx-6 xl:mx-12 hidden lg:block">
          <div className="relative group">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-dim)] group-focus-within:text-[var(--accent)] transition-colors" />
            <input 
              type="text"
              placeholder="SCAN LISTINGS FOR SPECIFIC SIGNATURES..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-[var(--border)] rounded-sm py-3 pl-12 pr-4 text-[10px] font-mono text-white focus:outline-none focus:border-[var(--accent)] focus:bg-white/10 transition-all placeholder:opacity-30 uppercase tracking-widest"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          <button 
            onClick={fetchProducts}
            className="text-[var(--text-dim)] hover:text-white transition-colors p-2 shrink-0"
          >
            <RefreshCw size={18} className={loading && products.length > 0 ? "animate-spin" : ""} />
          </button>
          
          {user && (
            <button 
              onClick={() => setShowPostModal(true)}
              className="flex items-center px-4 sm:px-6 py-2 sm:py-3 gold-gradient hover:opacity-90 transition-all text-black rounded-sm font-display font-bold text-[9px] sm:text-[10px] uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(212,175,55,0.1)] active:scale-95 shrink-0"
            >
              <Plus size={16} className="sm:mr-2" />
              <span className="hidden sm:inline">Initialize Listing</span>
            </button>
          )}
        </div>
      </motion.div>

      {/* Grid Content */}
      <div className="p-4 sm:p-8 md:p-12 max-w-[2400px] w-full mx-auto">
        <div className="lg:hidden mb-8">
          <div className="relative group">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-dim)] group-focus-within:text-[var(--accent)] transition-colors" />
            <input 
              type="text"
              placeholder="SEARCH LISTINGS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-[var(--border)] rounded-sm py-4 pl-12 pr-4 text-[10px] font-mono text-white focus:outline-none focus:border-[var(--accent)] transition-all uppercase tracking-widest"
            />
          </div>
        </div>

        {loading && products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-[var(--text-dim)]">
             <Cpu size={48} className="mb-6 animate-pulse text-[var(--accent)]" />
             <div className="font-mono text-[10px] uppercase tracking-[0.3em] animate-pulse">Syncing Distributed Ledger...</div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-32 border border-[var(--border)] border-dashed rounded-sm bg-white/[0.02]">
            <Search size={40} className="mx-auto mb-6 text-[var(--border)] opacity-30" />
            <h3 className="text-white font-display font-bold uppercase tracking-widest text-sm mb-2">No matching nodes found</h3>
            <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-dim)]">Adjust your scan parameters and retry.</p>
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[1920px]:grid-cols-6 min-[2400px]:grid-cols-8 gap-4 sm:gap-6 md:gap-8"
          >
            {filteredProducts.map(product => (
              <motion.div 
                key={product.id} 
                variants={itemVariants}
                onClick={() => setSelectedProduct(product)} 
                className="group relative bg-[#0a0a0a] border border-[var(--border)] rounded-sm overflow-hidden hover:border-[var(--accent)] transition-all flex flex-col h-[480px] cursor-pointer"
              >
                {/* Decorative border corners */}
                <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-white/20 group-hover:border-[var(--accent)] transition-colors" />
                <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-white/20 group-hover:border-[var(--accent)] transition-colors" />
                <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-white/20 group-hover:border-[var(--accent)] transition-colors" />
                <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-white/20 group-hover:border-[var(--accent)] transition-colors" />

                {/* Product Thumbnail */}
                <div className="w-full h-52 bg-black border-b border-[var(--border)] flex items-center justify-center relative overflow-hidden shrink-0">
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 opacity-80 group-hover:opacity-100"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/[0.02]">
                       <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(var(--accent) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                       <Tag className="text-[var(--border)] group-hover:text-[var(--accent)] transition-colors duration-500" size={56} strokeWidth={1} />
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                  
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                    <div className="bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-sm border border-[var(--accent)]/30 font-mono text-[11px] text-[var(--accent)] font-bold tracking-tighter flex flex-col items-end">
                      <span>{product.price_btc} BTC</span>
                      {product.price_usd > 0 && <span className="text-[7px] opacity-60">OR {product.price_usd} CR</span>}
                    </div>
                    <div className={`text-[8px] uppercase tracking-[0.2em] font-bold px-2.5 py-1 rounded-sm border backdrop-blur-md ${
                      product.status === 'available' ? 'bg-[var(--emerald)]/10 text-[var(--emerald)] border-[var(--emerald)]/30' :
                      product.status === 'sold' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                      'bg-[var(--gold)]/10 text-[var(--gold)] border-[var(--gold)]/30'
                    }`}>
                      {product.status}
                    </div>
                  </div>
                </div>

                <div className="p-6 flex flex-col flex-1 bg-gradient-to-b from-transparent to-white/[0.01]">
                  <div className="mb-4">
                    <h3 className="text-sm font-display font-bold text-white mb-3 group-hover:text-[var(--accent)] transition-colors line-clamp-2 uppercase tracking-tight leading-snug h-10">
                      {product.title}
                    </h3>
                    <div className="flex items-center justify-between">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/seller/${product.user_id}`);
                        }}
                        className="flex items-center text-[9px] font-mono uppercase tracking-[0.1em] text-[var(--text-dim)] font-bold hover:text-white transition-colors"
                      >
                        <div className="w-6 h-6 rounded-sm bg-black border border-[var(--border)] overflow-hidden mr-2.5 shrink-0 relative">
                          {product.seller_avatar_url ? (
                            <img src={product.seller_avatar_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="gold-gradient w-full h-full flex items-center justify-center text-[9px] text-black">
                              {product.seller_username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="absolute inset-0 border border-white/10 pointer-events-none" />
                        </div>
                        <span className="truncate max-w-[100px]">{product.seller_username}</span>
                        {product.seller_rating_count > 0 && (
                          <div className="flex items-center ml-3 border-l border-[var(--border)] pl-3 text-[var(--accent)]">
                            <Star size={10} className="fill-[var(--accent)] mr-1.5" />
                            {Number(product.seller_rating).toFixed(1)}
                          </div>
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-[11px] font-mono text-[var(--text-dim)] line-clamp-3 mb-6 flex-1 leading-relaxed uppercase tracking-tighter">
                    {product.description}
                  </p>

                  <div className="mt-auto">
                    <div className="flex items-center justify-between text-[8px] font-mono uppercase tracking-widest text-[var(--text-dim)] mb-3 px-1">
                      <span>Ref Node ID</span>
                      <span>{format(new Date(product.created_at), 'MM.dd.yy')}</span>
                    </div>
                    <div className="bg-black/60 p-3 rounded-sm flex items-center justify-between border border-[var(--border)] group-hover:bg-white/5 transition-all">
                      <div className="flex items-center text-[9px] text-[var(--text-dim)] font-mono uppercase tracking-widest font-bold overflow-hidden">
                        <Key size={12} className="mr-3 opacity-30 shrink-0" />
                        <span className="truncate opacity-40 group-hover:opacity-100 transition-opacity">
                          {product.wallet_address}
                        </span>
                      </div>
                      <ArrowRight size={14} className="text-[var(--accent)] opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all shrink-0" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Post Modal */}
      <AnimatePresence>
        {showPostModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-12 isolate overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPostModal(false)}
              className="fixed inset-0 bg-black/90 backdrop-blur-md -z-10"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#080808] border border-[var(--border)] rounded-sm w-full max-w-2xl relative shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="sticky top-0 p-8 border-b border-[var(--border)] bg-black/40 backdrop-blur-xl flex items-center justify-between z-10">
                <div>
                   <h2 className="text-xl font-display font-bold uppercase tracking-tighter text-white">Initialize Asset Listing</h2>
                   <p className="text-[9px] font-mono text-[var(--text-dim)] uppercase tracking-widest mt-1">Populate parameters for bazaar broadcast</p>
                </div>
                <button 
                  onClick={() => setShowPostModal(false)}
                  className="text-[var(--text-dim)] hover:text-white transition-colors p-2 rounded-sm hover:bg-white/5"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handlePost} className="p-8 sm:p-10 space-y-10 overflow-y-auto custom-scrollbar">
                <div className="flex flex-col sm:flex-row gap-10 items-start">
                  <div className="w-32 h-32 flex-shrink-0 bg-black rounded-sm border border-[var(--border)] overflow-hidden flex items-center justify-center relative group cursor-pointer active:scale-95 transition-transform">
                    {formData.image_url ? (
                      <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 opacity-30 group-hover:opacity-100 transition-opacity">
                        <Tag size={24} />
                      </div>
                    )}
                    <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                       <Plus size={20} className="text-[var(--accent)]" />
                       <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    </label>
                  </div>
                  <div className="flex-1 space-y-4 pt-2">
                    <label className="text-[10px] font-display font-bold uppercase tracking-[0.2em] text-[var(--text-dim)] block">Visual Signature</label>
                    <div className="flex flex-wrap gap-4">
                       <label className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-[var(--border)] text-white rounded-sm text-[10px] font-display font-bold uppercase tracking-widest cursor-pointer transition-all active:scale-95">
                        Select Imagery
                        <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                      </label>
                      <div className="flex flex-col justify-center">
                        <p className="text-[9px] font-mono text-[var(--text-dim)] uppercase">MAX 5MB // IMG_PRTCL_4.2</p>
                        <p className="text-[9px] font-mono text-[var(--text-dim)]/50 uppercase mt-1">Recommended: 800x800px</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-8">
                  <div>
                    <label className="text-[10px] font-display font-bold uppercase tracking-[0.2em] text-[var(--text-dim)] mb-3 block">Entity Designation (Title)</label>
                    <input
                      required
                      type="text"
                      value={formData.title}
                      onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                      className="w-full bg-black border border-[var(--border)] text-xs font-mono text-white px-6 py-4 rounded-sm focus:outline-none focus:border-[var(--accent)] transition-all placeholder:opacity-20 uppercase tracking-widest"
                      placeholder="e.g. CRYPTO_LOCKED_MODULE_X"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-display font-bold uppercase tracking-[0.2em] text-[var(--text-dim)] mb-3 block">Technical Specifications (Description)</label>
                    <textarea
                      required
                      rows={4}
                      value={formData.description}
                      onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                      className="w-full bg-black border border-[var(--border)] text-xs font-mono text-white px-6 py-4 rounded-sm focus:outline-none focus:border-[var(--accent)] resize-none transition-all placeholder:opacity-20 uppercase tracking-tight leading-relaxed"
                      placeholder="PROVIDE DETAILED SCHEMATICS AND CONDITION..."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                    <div>
                      <label className="text-[10px] font-display font-bold uppercase tracking-[0.2em] text-[var(--text-dim)] mb-3 block">BTC Price</label>
                      <div className="relative">
                        <Bitcoin size={14} className="absolute left-6 top-1/2 -translate-y-1/2 text-[var(--accent)] opacity-50" />
                        <input
                          required
                          type="number"
                          step="0.00000001"
                          min="0"
                          value={formData.price_btc}
                          onChange={e => setFormData(p => ({ ...p, price_btc: parseFloat(e.target.value) || 0 }))}
                          className="w-full bg-black border border-[var(--border)] text-xs font-mono text-white pl-14 pr-6 py-4 rounded-sm focus:outline-none focus:border-[var(--accent)] tracking-widest"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-display font-bold uppercase tracking-[0.2em] text-[var(--text-dim)] mb-3 block">Credit Price ($)</label>
                      <div className="relative">
                        <ShoppingCart size={14} className="absolute left-6 top-1/2 -translate-y-1/2 text-[var(--accent)] opacity-50" />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.price_usd}
                          onChange={e => setFormData(p => ({ ...p, price_usd: parseFloat(e.target.value) || 0 }))}
                          className="w-full bg-black border border-[var(--border)] text-xs font-mono text-white pl-14 pr-6 py-4 rounded-sm focus:outline-none focus:border-[var(--accent)] tracking-widest"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-display font-bold uppercase tracking-[0.2em] text-[var(--text-dim)] mb-3 block">Receiver Node (Wallet)</label>
                      <div className="relative">
                        <Key size={14} className="absolute left-6 top-1/2 -translate-y-1/2 text-[var(--text-dim)] opacity-50" />
                        <input
                          required
                          type="text"
                          value={formData.wallet_address}
                          onChange={e => setFormData(p => ({ ...p, wallet_address: e.target.value }))}
                          className="w-full bg-black border border-[var(--border)] text-xs font-mono text-white pl-14 pr-6 py-4 rounded-sm focus:outline-none focus:border-[var(--accent)] placeholder:opacity-20"
                          placeholder="BC1Q..."
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-10 border-t border-[var(--border)] sticky bottom-0 bg-[#080808]">
                  <button
                    type="button"
                    onClick={() => setShowPostModal(false)}
                    className="flex-1 py-4 border border-[var(--border)] text-[var(--text-dim)] hover:text-white hover:bg-white/5 rounded-sm text-[10px] font-display font-bold uppercase tracking-[0.2em] transition-all"
                  >
                    Abort Sync
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 gold-gradient text-black rounded-sm text-[10px] font-display font-bold uppercase tracking-[0.2em] shadow-xl transition-all active:scale-[0.98]"
                  >
                    Broadcast Signature
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Product Details Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-12 isolate overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="fixed inset-0 bg-black/95 backdrop-blur-2xl -z-10"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="bg-[#050505] border border-[var(--border)] rounded-sm w-full max-w-6xl h-full sm:h-auto sm:max-h-[85vh] relative shadow-2xl flex flex-col md:flex-row overflow-hidden"
            >
              <button 
                onClick={() => setSelectedProduct(null)}
                className="absolute top-8 right-8 p-3 rounded-sm hover:bg-white/5 text-[var(--text-dim)] hover:text-white transition-all z-20 active:scale-90"
              >
                <X size={24} />
              </button>

              {/* Modal Detail Sidebar */}
              <div className="md:w-[420px] bg-black border-b md:border-b-0 md:border-r border-[var(--border)] p-10 sm:p-12 overflow-y-auto custom-scrollbar shrink-0 flex flex-col">
                 <div className="w-full aspect-square bg-[#0a0a0a] rounded-sm overflow-hidden mb-12 border border-[var(--border)] relative group">
                    {selectedProduct.image_url ? (
                      <img 
                        src={selectedProduct.image_url} 
                        alt={selectedProduct.title} 
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center opacity-10">
                        <Tag size={120} strokeWidth={0.5} />
                      </div>
                    )}
                 </div>

                 <div className="space-y-12 mt-auto">
                    <div>
                      <div className="text-[10px] font-display font-bold uppercase tracking-[0.3em] text-[var(--text-dim)] mb-4">Market Valuation</div>
                      <div className="space-y-2">
                        <div className="text-4xl font-mono text-[var(--accent)] font-bold tracking-tighter leading-none flex items-baseline gap-3">
                          {selectedProduct.price_btc} <span className="text-xl opacity-30 uppercase">BTC</span>
                        </div>
                        {selectedProduct.price_usd > 0 && (
                          <div className="text-xl font-mono text-white/40 font-bold tracking-tighter leading-none flex items-baseline gap-2">
                            {selectedProduct.price_usd} <span className="text-[10px] opacity-30 uppercase tracking-widest">Credits</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-white/[0.03] p-6 rounded-sm border border-[var(--border)]">
                        <div className="flex items-center justify-between text-[10px] font-display font-bold uppercase tracking-widest text-[var(--text-dim)] mb-4">
                          <span className="flex items-center gap-2.5"><Tag size={14} className="opacity-50" /> Asset Status</span>
                        </div>
                        {user?.id === selectedProduct.user_id ? (
                          <select 
                            value={selectedProduct.status}
                            onChange={(e) => handleUpdateStatus(selectedProduct.id, e.target.value)}
                            className="w-full bg-black border border-[var(--border)] text-[10px] sm:text-[11px] font-display font-bold uppercase tracking-widest text-white p-4 rounded-sm focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                          >
                            <option value="available">NODE_AVAILABLE</option>
                            <option value="reserved">NODE_RESERVED</option>
                            <option value="sold">NODE_TERMINATED</option>
                          </select>
                        ) : (
                          <div className={`text-[10px] font-display font-bold uppercase tracking-[0.2em] px-4 py-3 rounded-sm border text-center ${
                            selectedProduct.status === 'available' ? 'bg-[var(--emerald)]/10 text-[var(--emerald)] border-[var(--emerald)]/20' :
                            selectedProduct.status === 'sold' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                            'bg-[var(--gold)]/10 text-[var(--gold)] border-[var(--gold)]/30'
                          }`}>
                            {selectedProduct.status}
                          </div>
                        )}
                      </div>

                      <div className="bg-white/[0.03] p-6 rounded-sm border border-[var(--border)]">
                        <div className="flex items-center text-[10px] font-display font-bold uppercase tracking-widest text-[var(--text-dim)] mb-4">
                          <span className="flex items-center gap-2.5"><Key size={14} className="opacity-50" /> Network Node</span>
                        </div>
                        <div className="font-mono text-[11px] text-gray-400 break-all select-all leading-relaxed bg-black/40 p-4 rounded-sm border border-white/5 uppercase tracking-tighter">
                          {selectedProduct.wallet_address}
                        </div>
                      </div>
                    </div>
                 </div>
              </div>

              {/* Modal Main Content */}
              <div className="flex-1 p-10 sm:p-16 md:p-24 overflow-y-auto custom-scrollbar flex flex-col h-full bg-black/40">
                <div className="flex flex-col h-full max-w-4xl">
                  <div className="flex flex-wrap items-center gap-6 mb-10">
                    <button 
                      onClick={() => navigate(`/seller/${selectedProduct.user_id}`)}
                      className="flex items-center gap-4 text-white hover:text-[var(--accent)] transition-all group"
                    >
                      <div className="w-8 h-8 rounded-sm bg-black border border-[var(--border)] overflow-hidden shrink-0 group-hover:border-[var(--accent)] transition-colors relative">
                          {selectedProduct.seller_avatar_url ? (
                              <img src={selectedProduct.seller_avatar_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                              <div className="w-full h-full flex items-center justify-center gold-gradient text-[12px] font-bold text-black">
                                  {selectedProduct.seller_username.charAt(0).toUpperCase()}
                              </div>
                          )}
                          <div className="absolute inset-0 border border-white/10 pointer-events-none" />
                      </div>
                      <span className="text-[12px] font-display font-bold uppercase tracking-widest">{selectedProduct.seller_username}</span>
                    </button>
                    
                    {selectedProduct.seller_rating_count > 0 && (
                      <div className="flex items-center gap-2 px-6 py-1 border-x border-[var(--border)]">
                        <Star size={14} className="fill-[var(--accent)] text-[var(--accent)]" />
                        <span className="text-[16px] font-mono font-bold text-white leading-none">{Number(selectedProduct.seller_rating).toFixed(1)}</span>
                        <span className="text-[9px] font-mono text-[var(--text-dim)] uppercase tracking-widest ml-1">Rating</span>
                      </div>
                    )}
                    
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--text-dim)] ml-auto">
                      Timestamp // {format(new Date(selectedProduct.created_at), 'MMMM dd, yyyy')}
                    </span>
                  </div>
                  
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-white mb-10 leading-tight uppercase tracking-tighter">
                    {selectedProduct.title}
                  </h2>
                  
                  <div className="flex-1 text-sm sm:text-base text-gray-400 leading-relaxed whitespace-pre-wrap mb-16 font-sans opacity-90 border-l border-[var(--border)] pl-10">
                    {selectedProduct.description}
                  </div>

                  <div className="mt-auto py-12 border-t border-[var(--border)]">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-12">
                      {!user ? (
                        <div className="w-full bg-white/[0.02] p-8 rounded-sm border border-[var(--border)] border-dashed text-center">
                          <p className="text-[11px] font-display font-bold uppercase tracking-[0.2em] text-white mb-4">Credentials Required</p>
                          <p className="text-[10px] font-mono text-[var(--text-dim)] mb-8 uppercase tracking-widest leading-relaxed">Establish a verified identity to interact with the bazaar protocol.</p>
                          <button 
                            onClick={() => { setSelectedProduct(null); navigate('/login'); }}
                            className="px-10 py-3.5 bg-white text-black rounded-sm text-[11px] font-display font-bold uppercase tracking-[0.2em] hover:bg-gray-200 transition-all active:scale-95"
                          >
                            Sync Persona
                          </button>
                        </div>
                      ) : purchaseSuccess ? (
                        <div className="w-full bg-[var(--emerald)]/10 border border-[var(--emerald)]/30 px-8 py-6 rounded-sm text-[var(--emerald)] flex items-center justify-center gap-4">
                          <div className="w-2 h-2 rounded-full bg-[var(--emerald)] animate-ping" />
                          <span className="text-[11px] font-display font-bold uppercase tracking-[0.3em]">Protocol Acknowledged: Transaction Broadcast Successfully</span>
                        </div>
                      ) : user?.id !== selectedProduct.user_id ? (
                        <div className="flex flex-col xl:flex-row w-full items-start xl:items-center gap-12">
                           <div className="flex flex-col gap-4">
                             <span className="text-[10px] font-display font-bold uppercase tracking-[0.3em] text-[var(--text-dim)]">Acquisition Control</span>
                             <div className="flex flex-col sm:flex-row gap-4">
                               <button
                                onClick={() => {
                                  setPurchaseType('btc');
                                  setShowPurchaseConfirm(true);
                                }}
                                disabled={isPurchasing || selectedProduct.status !== 'available'}
                                className="px-8 py-4 gold-gradient text-black rounded-sm text-[10px] font-display font-bold uppercase tracking-[0.3em] shadow-[0_0_30px_rgba(212,175,55,0.15)] transition-all active:scale-95 disabled:grayscale disabled:opacity-30 flex items-center gap-4"
                               >
                                {isPurchasing ? 'Processing...' : 'Commit BTC'}
                                <ArrowRight size={14} />
                               </button>

                               {selectedProduct.price_usd > 0 && (
                                 <button
                                  onClick={() => {
                                    setPurchaseType('credits');
                                    setShowPurchaseConfirm(true);
                                  }}
                                  disabled={isPurchasing || selectedProduct.status !== 'available' || (user.credits || 0) < selectedProduct.price_usd}
                                  className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-sm text-[10px] font-display font-bold uppercase tracking-[0.3em] hover:bg-white/10 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex flex-col items-center justify-center min-w-[160px]"
                                 >
                                  <div className="flex items-center gap-2">
                                    <span>Use Credits</span>
                                    {(user.credits || 0) < selectedProduct.price_usd && <Shield size={10} className="text-red-500" />}
                                  </div>
                                  <span className="text-[8px] font-mono opacity-50 mt-1">{selectedProduct.price_usd} CR REQ.</span>
                                 </button>
                               )}
                             </div>
                           </div>

                          <div className="flex flex-col gap-4 flex-1">
                            <span className="text-[10px] font-display font-bold uppercase tracking-[0.3em] text-[var(--text-dim)]">Node Endorsement (1-5)</span>
                            <div className="flex items-center gap-3">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  disabled={isSubmittingRating}
                                  onClick={() => handleRateSeller(selectedProduct.user_id, star)}
                                  className="text-[var(--border)] hover:text-[var(--accent)] transition-all disabled:opacity-50 group/star"
                                >
                                  <Star 
                                    size={32} 
                                    className={`${star <= Math.round(selectedProduct.seller_rating || 0) ? "fill-[var(--accent)] text-[var(--accent)]" : "stroke-current"} group-hover/star:scale-125 transition-all`} 
                                  />
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[11px] font-display font-bold uppercase tracking-[0.3em] text-[var(--accent)] bg-[var(--accent)]/5 px-10 py-5 rounded-sm border border-[var(--accent)]/20 shadow-sm flex items-center gap-3">
                          <Cpu size={16} />
                          Access Level: Node Administrator
                        </div>
                      )}
                    </div>
                    
                    {ratingError && <p className="text-red-500 text-[10px] font-mono uppercase tracking-widest mt-6 bg-red-500/5 p-4 border border-red-500/10 rounded-sm">{ratingError}</p>}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Purchase Confirmation Modal */}
      <AnimatePresence>
        {showPurchaseConfirm && selectedProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isPurchasing && setShowPurchaseConfirm(false)}
              className="fixed inset-0 bg-black/95 backdrop-blur-2xl"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0a0a0a] border border-red-500/20 rounded-sm w-full max-w-lg relative shadow-[0_0_100px_rgba(255,0,0,0.1)] overflow-hidden p-10 sm:p-12"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
              
              <div className="flex items-center gap-5 mb-8">
                <div className="p-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-sm">
                  <Shield size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-display font-bold uppercase tracking-tight text-white">Security Checkpoint</h3>
                  <p className="text-[10px] font-mono text-red-500/60 uppercase tracking-widest mt-1">Transaction Authorization Required</p>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="text-[10px] font-display font-bold uppercase tracking-[0.3em] text-[var(--text-dim)]">Asset Specification</div>
                  <div className="p-5 bg-white/[0.02] border border-[var(--border)] rounded-sm">
                    <div className="text-white font-display font-bold text-sm uppercase tracking-tight mb-2">{selectedProduct.title}</div>
                    <div className="text-[var(--accent)] font-mono font-bold text-lg">
                      {purchaseType === 'btc' ? `${selectedProduct.price_btc} BTC` : `${selectedProduct.price_usd} CR`}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-[10px] font-display font-bold uppercase tracking-[0.3em] text-[var(--text-dim)]">Receiver Node Address</div>
                  <div className="p-5 bg-black border border-[var(--border)] rounded-sm font-mono text-[11px] text-gray-400 break-all leading-relaxed uppercase tracking-widest border-dashed">
                    {purchaseType === 'btc' ? selectedProduct.wallet_address : 'INTERNAL SYSTEM TRANSFER'}
                  </div>
                </div>

                <div className="p-5 bg-red-500/5 border border-red-500/20 rounded-sm">
                   <p className="text-[9px] font-mono text-red-400/80 leading-relaxed uppercase tracking-widest text-center">
                    Warning: Transactions are irreversible once broadcast to the distributed ledger. <br/>Ensure the target node is trusted.
                   </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setShowPurchaseConfirm(false)}
                    disabled={isPurchasing}
                    className="py-4 border border-[var(--border)] text-[var(--text-dim)] hover:text-white hover:bg-white/5 rounded-sm text-[10px] font-display font-bold uppercase tracking-[0.2em] transition-all disabled:opacity-30"
                  >
                    Abort Sync
                  </button>
                  <button
                    onClick={async () => {
                      await handlePurchase(purchaseType === 'credits');
                    }}
                    disabled={isPurchasing}
                    className="py-4 bg-red-600 hover:bg-red-500 text-white rounded-sm text-[10px] font-display font-bold uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(220,38,38,0.2)] transition-all active:scale-[0.98] disabled:grayscale disabled:opacity-30"
                  >
                    {isPurchasing ? 'Broadcasting...' : 'Confirm Transfer'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
