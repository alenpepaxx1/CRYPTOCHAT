import { apiFetch } from '../lib/api';
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { User, Star, Package, Calendar, Edit3, Save, X, Bitcoin, ExternalLink, Camera, Upload, RefreshCw, Shield, Zap, Info, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface Profile {
  id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  avg_rating: number | null;
  rating_count: number;
}

interface Product {
  id: string;
  title: string;
  description: string;
  price_btc: number;
  status: 'available' | 'sold' | 'reserved';
  image_url: string | null;
  seller_username: string;
  seller_rating: number | null;
  seller_rating_count: number;
}

export default function SellerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useStore(state => state.user);
  const setUser = useStore(state => state.setUser);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newBio, setNewBio] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const isOwnProfile = currentUser?.id === id;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profileRes, productsRes] = await Promise.all([
        apiFetch(`/api/users/${id}`),
        apiFetch(`/api/products/seller/${id}`)
      ]);
      
      const profileData = await profileRes.json();
      const productsData = await productsRes.json();
      
      if (profileRes.ok) {
        setProfile(profileData);
        setNewBio(profileData.bio || '');
      }
      setProducts(productsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleSaveBio = async () => {
    if (!currentUser || !id) return;
    setSaveLoading(true);
    try {
      const res = await apiFetch(`/api/users/${id}/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio: newBio })
      });
      if (res.ok) {
        setProfile(prev => prev ? { ...prev, bio: newBio } : null);
        if (currentUser) {
          setUser({ ...currentUser, bio: newBio } as any);
        }
        setIsEditing(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleAvatarClick = () => {
    if (isOwnProfile && !currentUser?.is_guest) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a JPG, PNG, or GIF image.');
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const res = await apiFetch(`/api/users/${id}/profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar_url: base64 })
        });
        if (res.ok) {
          setProfile(prev => prev ? { ...prev, avatar_url: base64 } : null);
          if (currentUser) {
            setUser({ ...currentUser, avatar_url: base64 });
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[var(--bg)] text-[var(--accent)] font-mono text-xs uppercase tracking-[0.3em] gap-8">
        <RefreshCw size={32} className="animate-spin opacity-50" />
        <div className="animate-pulse">Accessing Decentralized Identity Node...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[var(--bg)] p-12 text-center isolate">
        <div className="absolute inset-x-0 top-0 h-[40vh] bg-gradient-to-b from-red-500/10 to-transparent -z-10" />
        <X size={64} className="text-red-500 mb-8 opacity-40 shadow-[0_0_20px_rgba(239,68,68,0.2)]" />
        <h2 className="text-3xl font-display font-bold text-white mb-4 uppercase tracking-tighter">Null Signature Detected</h2>
        <p className="text-[var(--text-dim)] text-[10px] uppercase font-mono tracking-[0.2em] max-w-md mx-auto leading-relaxed">Identity node is offline or has been terminated from the bazaar directory network.</p>
        <button 
          onClick={() => navigate('/market')}
          className="mt-12 px-10 py-3.5 border border-[var(--border)] rounded-sm text-[10px] font-display font-bold uppercase tracking-[0.25em] text-[var(--text-dim)] hover:text-white hover:border-white transition-all bg-white/5 active:scale-95"
        >
          Return to Bazaar Terminal
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar w-full bg-[var(--bg)] font-sans relative">
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-[40vw] h-[40vh] bg-[var(--accent)]/5 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-[20vh] left-0 w-[30vw] h-[30vh] bg-[var(--emerald)]/5 blur-[100px] rounded-full pointer-events-none -z-10" />

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".png,.gif,.jpg,.jpeg"
        onChange={handleFileChange}
      />

      {/* Header Banner */}
      <div className="relative h-64 border-b border-[var(--border)] flex items-end">
        <div className="absolute inset-0 bg-[var(--surface)] opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
        
        {/* Subtle grid pattern for banner */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(var(--accent) 1px, transparent 1px)', backgroundSize: '16px 16px' }} />

        <div className="max-w-6xl mx-auto w-full px-10 pb-12 flex flex-col md:flex-row items-end gap-10 translate-y-6">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0, y: 50, filter: "blur(10px)" }}
            animate={{ 
              scale: 1, 
              opacity: 1, 
              y: 0,
              filter: "blur(0px)"
            }}
            transition={{
              type: "spring",
              damping: 12,
              stiffness: 100,
              duration: 0.8,
              delay: 0.2
            }}
            whileHover={{ y: -5, scale: 1.02 }}
            onClick={handleAvatarClick}
            className={`w-36 h-36 rounded-sm bg-black border border-[var(--border)] shadow-[0_0_50px_rgba(0,0,0,0.5)] flex items-center justify-center text-4xl font-display font-bold overflow-hidden relative group shrink-0 ${isOwnProfile && !currentUser?.is_guest ? 'cursor-pointer' : ''}`}
          >
            {profile.avatar_url ? (
              <img src={profile.avatar_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" alt={profile.username} />
            ) : (
              <div className="gold-gradient text-black w-full h-full flex items-center justify-center">
                {profile.username.charAt(0).toUpperCase()}
              </div>
            )}
            
            {/* Entry Interference Overlay */}
            <motion.div 
              initial={{ opacity: 0.8 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
              className="absolute inset-0 bg-white/10 pointer-events-none z-20 mix-blend-overlay"
              style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(255,255,255,0.05) 1px, rgba(255,255,255,0.05) 2px)' }}
            />

            {/* Subtle Scanline Animation */}
            <motion.div 
              animate={{ 
                top: ["-100%", "200%"],
                opacity: [0, 0.3, 0]
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity, 
                ease: "linear",
                repeatDelay: 2
              }}
              className="absolute inset-x-0 h-px bg-white pointer-events-none z-10"
            />

            <div className="absolute inset-0 border border-white/5 pointer-events-none" />

            {uploading && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center">
                    <RefreshCw size={32} className="text-[var(--accent)] animate-spin" />
                </div>
            )}

            {isOwnProfile && !uploading && !currentUser?.is_guest && (
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-3">
                <Camera size={28} />
                <span className="text-[8px] uppercase tracking-[0.25em] font-display font-bold">Update Scan</span>
              </div>
            )}
            
            {isOwnProfile && currentUser?.is_guest && (
              <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-red-500 gap-2 p-4 text-center">
                <Shield size={20} />
                <span className="text-[8px] uppercase tracking-[0.2em] font-display font-bold">Verified Persona Required for Biometric Update</span>
              </div>
            )}
          </motion.div>

          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex-1 pb-4"
          >
             <div className="flex items-center gap-4 mb-3">
               <h1 className="text-4xl sm:text-5xl font-display font-bold text-white uppercase tracking-tighter">{profile.username}</h1>
               {profile.avg_rating && profile.avg_rating >= 4.5 && (
                  <div className="p-1 px-2.5 bg-[var(--emerald)]/10 border border-[var(--emerald)]/20 text-[var(--emerald)] rounded-sm flex items-center gap-2">
                    <Shield size={12} />
                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest">Verified Seller</span>
                  </div>
               )}
             </div>
            
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 text-[10px] font-mono uppercase tracking-widest font-bold text-[var(--text-dim)]">
              <span className="flex items-center gap-2.5 bg-white/5 px-3 py-1.5 rounded-sm border border-[var(--border)]"><Calendar size={13} className="opacity-50" /> Established // {format(new Date(profile.created_at), 'MM.yyyy')}</span>
              <span className="flex items-center gap-2.5 bg-[var(--accent)]/5 px-3 py-1.5 rounded-sm border border-[var(--accent)]/20 text-[var(--accent)]">
                <Star size={13} className="fill-[var(--accent)]" /> 
                {profile.avg_rating ? profile.avg_rating.toFixed(1) : 'PENDING'} ACCREDITATION ({profile.rating_count} NODES)
              </span>
            </div>
          </motion.div>
          
          <div className="md:ml-auto pb-4">
             <button 
              onClick={() => navigate('/market')}
              className="px-6 py-3 border border-[var(--border)] text-[var(--text-dim)] hover:text-white flex items-center gap-3 text-[10px] font-display font-bold uppercase tracking-[0.2em] transition-all bg-white/5 rounded-sm active:scale-95 group"
             >
               <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
               Bazaar Feed
             </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-10 pt-28 pb-32 grid grid-cols-1 lg:grid-cols-12 gap-16">
        {/* Left Side: Metadata & Actionable Intel */}
        <div className="lg:col-span-4 space-y-12">
          <motion.section
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-1 h-4 bg-[var(--accent)] rounded-full" />
                <h3 className="text-[11px] font-display font-bold uppercase tracking-[0.3em] text-white">Persona Profile</h3>
              </div>
              {isOwnProfile && !currentUser?.is_guest && (
                <button 
                  onClick={() => isEditing ? setIsEditing(false) : setIsEditing(true)}
                  className={`p-2 transition-all rounded-sm border ${isEditing ? 'bg-[var(--accent)] text-black border-[var(--accent)]' : 'text-[var(--text-dim)] hover:text-white border-[var(--border)] hover:bg-white/5'}`}
                >
                  {isEditing ? <X size={16} /> : <Edit3 size={16} />}
                </button>
              )}
            </div>
            
            <div className="bg-white/5 border border-[var(--border)] rounded-sm p-8 shadow-xl relative backdrop-blur-sm">
                <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-white/10 to-transparent pointer-events-none" />
                
                <label className="text-[9px] font-mono uppercase tracking-[0.2em] text-[var(--text-dim)] font-bold block mb-4 flex items-center gap-2">
                  <Info size={10} className="opacity-50" />
                  IDEN_BIO_DATA
                </label>
                
                {isEditing ? (
                  <div className="space-y-6">
                    <textarea 
                      value={newBio}
                      onChange={e => setNewBio(e.target.value)}
                      placeholder="Input operation details for general sync..."
                      rows={6}
                      className="w-full bg-black border border-[var(--border)] text-[11px] font-mono text-white p-5 rounded-sm focus:outline-none focus:border-[var(--accent)] resize-none uppercase tracking-tight leading-relaxed placeholder:opacity-20"
                    />
                    <button 
                      onClick={handleSaveBio}
                      disabled={saveLoading}
                      className="w-full py-4 gold-gradient text-black text-[10px] font-display font-bold uppercase tracking-[0.25em] rounded-sm flex items-center justify-center gap-3 shadow-lg shadow-[var(--accent)]/10 active:scale-[0.98] transition-all"
                    >
                      {saveLoading ? <RefreshCw size={14} className="animate-spin" /> : <><Save size={14} /> Commit Changes</>}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-[12px] font-mono text-gray-400 italic leading-relaxed uppercase tracking-tight">
                      {profile.bio || "ACCESS_DENIED // NO BIO-METRIC SUMMARY RECORDED FOR THIS NODE."}
                    </p>
                    {isOwnProfile && currentUser?.is_guest && (
                      <div className="pt-6 border-t border-[var(--border)] border-dashed">
                        <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-sm flex items-center gap-3 text-red-500">
                          <Shield size={14} />
                          <span className="text-[8px] font-mono uppercase tracking-widest leading-loose">
                            GUEST PERSONA // DATA ALTERATION PROHIBITED. <br/>ESTABLISH SECURE LINK FOR BIO-MODIFICATION.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
            </div>
          </motion.section>

          <motion.section
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1 h-4 bg-[var(--emerald)] rounded-full" />
              <h3 className="text-[11px] font-display font-bold uppercase tracking-[0.3em] text-white">Traffic Metrics</h3>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white/5 border border-[var(--border)] p-6 rounded-sm backdrop-blur-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-[var(--accent)]/20" />
                <div className="text-3xl font-mono font-bold text-white mb-2 tracking-tighter group-hover:text-[var(--accent)] transition-colors">{products.length}</div>
                <div className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-dim)] font-bold">ASSETS_ACTIVE</div>
              </div>
              <div className="bg-white/5 border border-[var(--border)] p-6 rounded-sm backdrop-blur-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-[var(--emerald)]/20" />
                <div className="text-3xl font-mono font-bold text-white mb-2 tracking-tighter group-hover:text-[var(--emerald)] transition-colors">{profile.rating_count}</div>
                <div className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-dim)] font-bold">ACK_SIGNALS</div>
              </div>
            </div>
          </motion.section>
        </div>

        {/* Right Side: Active Inventory */}
        <div className="lg:col-span-8">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-[11px] font-display font-bold uppercase tracking-[0.3em] text-white flex items-center gap-4">
               <Zap size={16} className="text-[var(--accent)]" /> 
               Broadcast Frequency // {profile.username} Assets
            </h3>
            <div className="text-[9px] font-mono text-[var(--text-dim)] uppercase tracking-[0.2em] font-bold">
               {products.length} OBJECTS IDENTIFIED
            </div>
          </div>

          {products.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-24 border border-[var(--border)] border-dashed rounded-sm bg-white/[0.02]"
            >
              <Package size={48} className="mx-auto mb-6 text-[var(--border)] opacity-20" />
              <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-[var(--text-dim)] font-bold">No active asset signatures detected for this host node.</p>
            </motion.div>
          ) : (
            <motion.div 
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: { staggerChildren: 0.1 }
                }
              }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              {products.map(product => (
                <motion.div 
                  key={product.id}
                  variants={{
                    hidden: { y: 20, opacity: 0 },
                    show: { y: 0, opacity: 1 }
                  }}
                  onClick={() => navigate('/market')}
                  className="bg-white/5 border border-[var(--border)] rounded-sm overflow-hidden group cursor-pointer hover:border-[var(--accent)] transition-all relative flex flex-col h-[320px] backdrop-blur-sm"
                >
                  <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/20 group-hover:border-[var(--accent)] transition-colors" />
                  <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/20 group-hover:border-[var(--accent)] transition-colors" />

                  <div className="h-44 relative bg-black shrink-0 overflow-hidden">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.title} 
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-1000"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-[var(--border)] group-hover:text-[var(--accent)] transition-colors bg-white/[0.02]">
                        <Package size={48} strokeWidth={1} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                    <div className={`absolute top-4 right-4 text-[8px] font-mono uppercase tracking-[0.2em] font-bold px-3 py-1.5 rounded-sm border backdrop-blur-md ${
                      product.status === 'available' ? 'bg-[var(--emerald)]/20 text-[var(--emerald)] border-[var(--emerald)]/30' :
                      product.status === 'sold' ? 'bg-red-500/20 text-red-500 border-red-500/30' :
                      'bg-[var(--gold)]/20 text-[var(--gold)] border-[var(--gold)]/30'
                    }`}>
                      {product.status}
                    </div>
                  </div>
                  <div className="p-6 flex flex-col flex-1 bg-gradient-to-b from-transparent to-white/[0.02]">
                    <h4 className="text-[14px] font-display font-bold text-white mb-3 truncate group-hover:text-[var(--accent)] transition-colors uppercase tracking-tight">{product.title}</h4>
                    <div className="mt-auto flex items-end justify-between">
                      <div className="flex flex-col gap-2">
                         <span className="text-[8px] font-mono uppercase tracking-[0.3em] text-[var(--text-dim)] font-bold">Exchange Rate</span>
                         <div className="flex items-center gap-2 text-[var(--accent)] font-mono text-xl font-bold tracking-tighter leading-none">
                          <Bitcoin size={18} />
                          <span>{product.price_btc} BTC</span>
                        </div>
                      </div>
                      <div className="text-[9px] font-mono uppercase tracking-widest text-white/40 border border-white/10 px-3 py-1 rounded-sm group-hover:text-[var(--accent)] group-hover:border-[var(--accent)]/30 transition-all">
                         View Source
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
