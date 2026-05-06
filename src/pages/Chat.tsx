/**
 * Copyright Alen Pepa 2026
 */
import { apiFetch } from '../lib/api';
import React, { useEffect, useState, useRef } from 'react';
import { Plus, Users, Globe, User, Send, Hash, Search, Shield, Lock, X, Terminal, Cpu, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import CryptoJS from 'crypto-js';
import { useStore } from '../store';
import { socket } from '../socket';
import { format } from 'date-fns';

interface Message {
  id: string;
  room_id: string;
  user_id: string;
  username: string;
  content: string;
  created_at: string;
  is_read?: boolean;
}

interface Room {
  id: string;
  name: string;
  type: 'world' | 'group' | 'private';
  created_at: string;
}

interface TypingUser {
  userId: string;
  username: string;
}

export default function Chat() {
  const user = useStore(state => state.user);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeRoomId, setActiveRoomId] = useState<string>('world');
  const [channels, setChannels] = useState<Room[]>([]);
  const [privateChats, setPrivateChats] = useState<Room[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [typingUsers, setTypingUsers] = useState<Record<string, TypingUser>>({});
  const [isShowingDirectory, setIsShowingDirectory] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [allUsers, setAllUsers] = useState<{ id: string; username: string }[]>([]);
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());
  const [blockerUserIds, setBlockerUserIds] = useState<Set<string>>(new Set());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar toggle
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeRoom = [...channels, ...privateChats].find(r => r.id === activeRoomId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchBlocks = async () => {
    if (!user) return;
    try {
      const res = await apiFetch(`/api/users/${user.id}/blocks`);
      if (res.ok) {
        const data = await res.json();
        setBlockedUserIds(new Set(data.blocked.map((b: any) => b.blocked_id)));
        setBlockerUserIds(new Set(data.blockers.map((b: any) => b.blocker_id)));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleBlock = async (e: React.MouseEvent, targetId: string) => {
    e.stopPropagation();
    try {
      const isBlocked = blockedUserIds.has(targetId);
      const res = await apiFetch(`/api/users/${targetId}/${isBlocked ? 'unblock' : 'block'}`, { method: 'POST' });
      if (res.ok) {
        setBlockedUserIds(prev => {
          const next = new Set(prev);
          if (isBlocked) next.delete(targetId);
          else next.add(targetId);
          return next;
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRooms = async () => {
    if (!user) return;
    try {
      const res = await apiFetch(`/api/rooms?userId=${user.id}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setChannels(data.filter((r: Room) => r.type !== 'private'));
        setPrivateChats(data.filter((r: Room) => r.type === 'private'));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMessages = async (roomId: string) => {
    try {
      const res = await apiFetch(`/api/messages/${roomId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const res = await apiFetch('/api/users');
      const data = await res.json();
      setAllUsers(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchRooms();
    fetchAllUsers();
    fetchBlocks();
    
    socket.on('receive_message', (msg: Message) => {
      // Ignore realtime messages from explicitly blocked users or if they blocked us
      if (blockedUserIds.has(msg.user_id) || blockerUserIds.has(msg.user_id)) return;
      if (msg.room_id === activeRoomId) {
        setMessages(prev => [...prev, msg]);
      }
    });

    socket.on('user_typing', ({ username, roomId, isTyping }) => {
      if (roomId === activeRoomId && username !== user?.username) {
        if (isTyping) {
          setTypingUsers(prev => ({ ...prev, [username]: { userId: username, username } }));
        } else {
          setTypingUsers(prev => {
            const next = { ...prev };
            delete next[username];
            return next;
          });
        }
      }
    });

    socket.on('error', (err: any) => {
      alert(err.message || 'An error occurred');
    });

    return () => {
      socket.off('receive_message');
      socket.off('user_typing');
      socket.off('error');
    };
  }, [user, activeRoomId, blockedUserIds, blockerUserIds]);

  useEffect(() => {
    if (activeRoomId) {
      fetchMessages(activeRoomId);
      socket.emit('join_room', activeRoomId);
    }
  }, [activeRoomId]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !activeRoomId) return;

    const msgData = {
      roomId: activeRoomId,
      userId: user.id,
      content: newMessage.trim()
    };

    socket.emit('send_message', msgData);
    setNewMessage('');
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (user && activeRoomId) {
      socket.emit('typing', {
        username: user.username,
        roomId: activeRoomId,
        isTyping: e.target.value.length > 0
      });
    }
  };

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !user) return;

    try {
      const res = await apiFetch('/api/rooms/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName, ownerId: user.id })
      });
      if (res.ok) {
        const room = await res.json();
        setChannels(prev => [...prev, room]);
        setIsCreatingGroup(false);
        setNewGroupName('');
        setActiveRoomId(room.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const startPrivateChat = async (targetUserId: string) => {
    if (!user) return;
    try {
      const res = await apiFetch('/api/rooms/private', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user1: user.id, user2: targetUserId })
      });
      if (res.ok) {
        const room = await res.json();
        if (!privateChats.find(r => r.id === room.id)) {
          setPrivateChats(prev => [...prev, room]);
        }
        setActiveRoomId(room.id);
        setIsShowingDirectory(false);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to start chat');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full bg-[var(--bg)] font-sans relative">
      {/* Mobile Sidebar Toggle */}
      <div className="md:hidden flex items-center justify-between p-3 bg-black border-b border-[var(--border)] z-30">
        <h2 className="text-sm font-display font-bold uppercase flex items-center gap-2 text-white">
          <Cpu size={16} className="text-[var(--accent)]" /> 
          Communications
        </h2>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 border border-[var(--border)] rounded-sm text-[var(--accent)] hover:bg-white/5 active:scale-95">
           {isSidebarOpen ? <X size={16} /> : <Terminal size={16} />}
        </button>
      </div>

      {/* Channels Sidebar */}
      <div className={`
        ${isSidebarOpen ? 'translate-y-0' : '-translate-y-full md:translate-y-0'}
        absolute md:relative top-14 md:top-0 left-0 right-0 md:w-[240px] xl:w-[280px] bottom-0 md:bottom-auto
        flex-shrink-0 bg-black/95 md:bg-black backdrop-blur-md md:backdrop-blur-none 
        border-r md:border-[var(--border)] flex flex-col z-20 transition-transform duration-300 md:transition-none
      `}>
        <div className="p-6 hidden md:block">
          <h2 className="text-xl font-display font-bold uppercase tracking-tighter mb-4 flex items-center gap-3 text-white">
            <Cpu size={20} className="text-[var(--accent)]" />
            Communications
          </h2>
          {user && (
            <button 
              onClick={() => setIsShowingDirectory(!isShowingDirectory)}
              className={`w-full flex items-center justify-between p-3 rounded-sm transition-all text-[10px] font-display font-bold uppercase tracking-[0.2em] border border-[var(--border)] ${isShowingDirectory ? 'bg-[var(--accent)] text-black border-[var(--accent)]' : 'text-[var(--text-dim)] hover:text-white hover:bg-white/5'}`}
            >
              <span className="flex items-center"><Shield size={12} className="mr-2" /> Signal Directory</span>
              {isShowingDirectory ? <X size={12} /> : <Search size={12} />}
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 space-y-6 custom-scrollbar pb-6">
          {!user || user.is_guest ? (
             <div className="space-y-6 px-2">
               <div className="bg-white/5 border border-dashed border-[var(--border)] p-5 rounded-sm text-center relative overflow-hidden group">
                 <div className="absolute inset-0 bg-gradient-to-tr from-[var(--accent)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                 <Lock size={20} className="mx-auto mb-3 text-[var(--accent)] opacity-50" />
                 <p className="text-[10px] font-display font-bold uppercase tracking-widest text-white mb-2 leading-relaxed">
                   {user?.is_guest ? 'Guest Protocol Active' : 'Identity Required'}
                 </p>
                 <p className="text-[9px] text-[var(--text-dim)] font-mono leading-relaxed text-center">
                   {user?.is_guest ? 'Upgrade to a secure persona for encrypted private streams.' : 'Establish bio-connection to access encrypted frequencies.'}
                 </p>
               </div>
               
               <div>
                  <div className="text-[9px] font-mono uppercase tracking-[0.3em] text-[var(--text-dim)] mb-3 px-2 font-bold">Public Frequencies</div>
                  <div className="space-y-1">
                    {channels.map(room => {
                      const isActive = activeRoomId === room.id;
                      const Icon = room.type === 'world' ? Globe : Hash;
                      return (
                        <button
                          key={room.id}
                          onClick={() => { setActiveRoomId(room.id); setIsSidebarOpen(false); }}
                          className={`w-full flex items-center p-3 rounded-sm text-left transition-colors cursor-pointer group ${
                            isActive ? 'bg-white/10 text-white' : 'text-[var(--text-dim)] hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <Icon size={16} className={`mr-4 shrink-0 ${isActive ? 'text-[var(--accent)]' : 'text-[var(--text-dim)] group-hover:text-white'}`} />
                          <span className="text-[11px] font-display font-bold uppercase tracking-widest truncate">{room.name}</span>
                          {isActive && <motion.div layoutId="sidebar-active" className="ml-auto w-1 h-1 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
             </div>
          ) : isShowingDirectory ? (
            <div className="space-y-4 px-2">
               <div>
                <input
                  type="text"
                  placeholder="Scan aliases..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="w-full bg-white/5 border border-[var(--border)] text-[10px] font-mono text-white px-3 py-2.5 rounded-sm focus:outline-none focus:border-[var(--accent)] mb-4 uppercase tracking-[0.2em] placeholder:opacity-30"
                />
               </div>
                <div className="space-y-1">
                 {allUsers
                  .filter(u => u.id !== user?.id && u.username.toLowerCase().includes(userSearch.toLowerCase()))
                  .map(u => {
                    const isBlocked = blockedUserIds.has(u.id);
                    return (
                      <div key={u.id} className="w-full flex items-center p-2.5 rounded-sm text-left transition-all hover:bg-white/5 border border-transparent hover:border-[var(--border)] group">
                        <button
                          onClick={() => startPrivateChat(u.id)}
                          className="flex-1 flex items-center"
                        >
                          <div className="w-7 h-7 rounded-sm bg-black border border-[var(--border)] flex items-center justify-center text-[10px] font-display font-bold mr-4 group-hover:border-[var(--accent)] transition-colors relative text-[var(--accent)] shrink-0">
                            {u.username.charAt(0).toUpperCase()}
                            <div className="absolute inset-0 border border-white/5 pointer-events-none" />
                          </div>
                          <span className="text-[11px] font-display font-bold uppercase tracking-widest text-[var(--text-dim)] group-hover:text-white truncate">
                            {u.username} {isBlocked && <span className="text-red-500 ml-2">(BLOCKED)</span>}
                          </span>
                        </button>
                        <button
                          onClick={(e) => toggleBlock(e, u.id)}
                          className={`ml-2 p-1.5 rounded-sm border shrink-0 ${isBlocked ? 'border-red-500/50 text-red-500 bg-red-500/10' : 'border-[var(--border)] text-[var(--text-dim)] hover:text-red-500 hover:border-red-500/50'}`}
                          title={isBlocked ? "Unblock user" : "Block user"}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
            </div>
          ) : (
            <div className="px-2">
              <div>
                <div className="text-[9px] font-mono uppercase tracking-[0.3em] text-[var(--text-dim)] mb-3 px-2 font-bold">Tactical Nodes</div>
                <div className="space-y-1">
                  {channels.map(room => {
                    const isActive = activeRoomId === room.id;
                    const Icon = room.type === 'world' ? Globe : Hash;
                    return (
                      <button
                        key={room.id}
                        onClick={() => { setActiveRoomId(room.id); setIsSidebarOpen(false); }}
                        className={`w-full flex items-center p-3 rounded-sm text-left transition-colors cursor-pointer group relative ${
                          isActive ? 'bg-white/10 text-white' : 'text-[var(--text-dim)] hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <Icon size={16} className={`mr-4 shrink-0 transition-colors ${isActive ? 'text-[var(--accent)]' : 'text-[var(--text-dim)] group-hover:text-white'}`} />
                        <span className="text-[11px] font-display font-bold uppercase tracking-widest truncate">{room.name}</span>
                        {isActive && <motion.div layoutId="sidebar-active" className="ml-auto w-1 h-1 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {privateChats.length > 0 && (
                <div className="mt-8">
                  <div className="text-[9px] font-mono uppercase tracking-[0.3em] text-[var(--text-dim)] mb-3 px-2 font-bold">Encrypted Streams</div>
                  <div className="space-y-1">
                    {privateChats.map(room => {
                      const isActive = activeRoomId === room.id;
                      return (
                        <button
                          key={room.id}
                          onClick={() => { setActiveRoomId(room.id); setIsSidebarOpen(false); }}
                          className={`w-full flex items-center p-3 rounded-sm text-left transition-colors cursor-pointer group relative ${
                            isActive ? 'bg-white/10 text-white' : 'text-[var(--text-dim)] hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <Lock size={14} className={`mr-4 shrink-0 transition-colors ${isActive ? 'text-[var(--emerald)]' : 'text-[var(--text-dim)] group-hover:text-white'}`} />
                          <div className="flex items-center justify-between w-full min-w-0">
                            <span className="text-[11px] font-display font-bold uppercase tracking-widest truncate">{room.name}</span>
                            <span className={`text-[7px] font-mono px-1.5 py-0.5 rounded-sm border leading-none font-bold ml-2 shrink-0 ${isActive ? 'bg-[var(--emerald)] text-black border-[var(--emerald)]' : 'bg-[var(--emerald)]/10 text-[var(--emerald)] border-[var(--emerald)]/20'}`}>
                              E2EE
                            </span>
                          </div>
                          {isActive && <motion.div layoutId="sidebar-active" className="ml-auto w-1 h-1 rounded-full bg-[var(--emerald)] shadow-[0_0_8px_var(--emerald)]" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {user && !user.is_guest && (
          <div className="p-4 border-t border-[var(--border)]">
            {isCreatingGroup ? (
              <form onSubmit={createGroup} className="flex flex-col gap-2 p-2">
                <input
                  autoFocus
                  type="text"
                  placeholder="TARGET NODE ID..."
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  className="w-full bg-white/5 border border-[var(--border)] text-[10px] font-mono text-white px-3 py-2.5 rounded-sm focus:outline-none focus:border-[var(--accent)] uppercase tracking-widest"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsCreatingGroup(false)} className="flex-1 text-[9px] font-display font-bold uppercase tracking-widest py-2 text-[var(--text-dim)] hover:text-white transition-colors">Abort</button>
                  <button type="submit" className="flex-1 gold-gradient text-black font-display font-bold uppercase tracking-widest text-[9px] py-2 rounded-sm transition-opacity hover:opacity-90">Establish</button>
                </div>
              </form>
            ) : (
              <button 
                onClick={() => setIsCreatingGroup(true)}
                className="w-full flex items-center justify-center p-3.5 text-[var(--text-dim)] hover:text-white hover:bg-white/5 transition-all text-[9px] font-display font-bold rounded-sm border border-[var(--border)] border-dashed uppercase tracking-[0.25em]"
              >
                <Plus size={14} className="mr-3" />
                Initialize Node
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#050505] relative isolate">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-[var(--accent)]/5 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" />
        
        {/* Chat header */}
        <header className="h-16 flex-shrink-0 flex items-center justify-between px-8 border-b border-[var(--border)] bg-black/80 backdrop-blur-xl z-10">
          <div className="flex items-center gap-4">
            <div className={`p-2 rounded-sm border ${activeRoom?.type === 'private' ? 'bg-[var(--emerald)]/10 border-[var(--emerald)]/20 text-[var(--emerald)]' : 'bg-[var(--accent)]/10 border-[var(--accent)]/20 text-[var(--accent)]'}`}>
              {activeRoom?.type === 'private' ? <Lock size={18} /> : <Terminal size={18} />}
            </div>
            <div className="flex flex-col pt-1">
              <span className={`text-[11px] font-display font-bold tracking-[0.15em] uppercase ${activeRoom?.type === 'private' ? 'text-[var(--emerald)]' : 'text-[var(--accent)]'}`}>{activeRoom?.name || 'NODE'}</span>
              <span className="text-[9px] font-mono text-[var(--text-dim)] uppercase tracking-tighter mt-0.5">
                {activeRoom?.type === 'private' ? 'SECURE POINT-TO-POINT LINK // ENCRYPTED' : (activeRoom?.type === 'world' ? 'GLOBAL FREQUENCY // UNRESTRICTED' : 'STANDARD GROUP NODE // INTERNAL')}
              </span>
            </div>
          </div>
        </header>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar space-y-8">
            {messages.length === 0 ? (
              <div className="flex flex-col justify-center items-center h-full opacity-30 text-center">
                <Cpu size={48} className="mb-6 animate-pulse text-[var(--accent)]" />
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-white">
                  {activeRoom?.type === 'private' ? 'Terminal idle. Waiting for cryptographic signature.' : 'No data packets intercepted at this node.'}
                </div>
              </div>
            ) : (
              <div className="flex flex-col justify-end min-h-full space-y-8">
                <AnimatePresence initial={false}>
                  {messages.map((msg, index) => {
                    const isMe = msg.user_id === user?.id;
                    const prevMsg = messages[index - 1];
                    const showHeader = !prevMsg || prevMsg.user_id !== msg.user_id;

                    return (
                      <motion.div 
                        key={msg.id} 
                        initial={{ opacity: 0, x: isMe ? 20 : -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className={`flex gap-4 ${isMe ? 'flex-row-reverse' : ''} ${showHeader ? 'mt-4' : '-mt-6'}`}
                      >
                        {showHeader ? (
                          <div className={`w-9 h-9 rounded-sm flex-shrink-0 flex items-center justify-center text-[10px] font-display font-bold transition-all relative overflow-hidden active:scale-95 cursor-pointer ${isMe ? 'gold-gradient text-black' : (activeRoom?.type === 'private' ? 'bg-[var(--emerald)]/10 text-[var(--emerald)] border border-[var(--emerald)]/30' : 'bg-white/5 text-white border border-[var(--border)]')}`}>
                            {msg.username.charAt(0).toUpperCase()}
                            <div className="absolute inset-0 border border-white/10 pointer-events-none" />
                          </div>
                        ) : (
                          <div className="w-9 h-9 flex-shrink-0" />
                        )}
                        <div className={`flex-1 flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          {showHeader && (
                            <div className={`flex items-center gap-3 mb-2 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                              <span className={`text-[10px] font-display font-bold uppercase tracking-widest ${isMe ? 'text-white' : (activeRoom?.type === 'private' ? 'text-[var(--emerald)]' : 'text-[var(--accent)]')}`}>
                                {isMe ? 'SELF' : msg.username}
                              </span>
                              <span className="text-[9px] font-mono text-[var(--text-dim)] font-bold">
                                {format(new Date(msg.created_at), 'HH:mm')}
                              </span>
                            </div>
                          )}
                          <div className={`group relative p-4 max-w-[85%] sm:max-w-[70%] transition-all ${
                            isMe 
                              ? 'text-black bg-[var(--accent)] rounded-sm font-medium' 
                              : (activeRoom?.type === 'private' 
                                  ? 'text-gray-200 bg-white/5 border border-[var(--emerald)]/20 rounded-sm' 
                                  : 'text-gray-300 bg-white/5 border border-[var(--border)] rounded-sm')
                          }`}>
                            {/* Decorative Corner for messages */}
                            <div className={`absolute top-0 w-2 h-2 border-t-2 border-l-2 opacity-30 ${isMe ? 'left-0 border-black' : (activeRoom?.type === 'private' ? 'left-0 border-[var(--emerald)]' : 'left-0 border-[var(--accent)]')}`} />
                            <div className={`absolute bottom-0 w-2 h-2 border-b-2 border-r-2 opacity-30 ${isMe ? 'right-0 border-black' : (activeRoom?.type === 'private' ? 'right-0 border-[var(--emerald)]' : 'right-0 border-[var(--accent)]')}`} />
                            
                            <p className="text-sm leading-relaxed tracking-tight selection:bg-black selection:text-white">{msg.content}</p>
                            
                            {isMe && (
                               <div className="absolute -bottom-5 right-0 flex items-center gap-2">
                                 <span className="text-[8px] font-mono font-bold uppercase tracking-tighter text-[var(--text-dim)] opacity-60">
                                   TRANSMITTED ✓
                                 </span>
                               </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}

            {Object.keys(typingUsers).length > 0 && (
              <div className="flex items-center gap-4 py-4 px-2 opacity-60">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div 
                      key={i}
                      animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                      className="w-1 h-1 bg-[var(--accent)] rounded-full"
                    />
                  ))}
                </div>
                <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[var(--accent)] font-bold">
                  {(Object.values(typingUsers) as TypingUser[]).map(u => u.username).join(', ')} typing...
                </span>
              </div>
            )}
            
            <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Chat Input */}
        <footer className="p-8 bg-black/40 backdrop-blur-md border-t border-[var(--border)]">
          {user?.is_guest ? (
            <div className="max-w-5xl mx-auto flex items-center justify-center p-6 bg-red-500/5 border border-dashed border-red-500/20 rounded-sm">
              <div className="flex items-center gap-4 text-red-500">
                <Lock size={18} />
                <span className="text-[10px] font-display font-bold uppercase tracking-[0.3em]">Transmission Refused // Guest Persona Restriction</span>
              </div>
            </div>
          ) : (
            <form onSubmit={sendMessage} className="relative flex items-center max-w-5xl mx-auto">
              <div className="absolute left-6 text-[var(--text-dim)] pointer-events-none">
                <Terminal size={16} className="opacity-50" />
              </div>
              <input
                type="text"
                value={newMessage}
                onChange={handleTyping}
                placeholder={activeRoom?.type === 'private' ? "COMMAND // EXCLUSIVE_ENCRYPTION_MODE..." : "COMMAND // TRANSMIT_SIGNAL..."}
                className="w-full bg-white/5 border border-[var(--border)] text-white pl-14 pr-24 py-4 rounded-sm text-sm font-mono placeholder:opacity-20 focus:outline-none focus:border-[var(--accent)] focus:bg-white/10 transition-all uppercase tracking-tight"
              />
              <div className="absolute right-3 flex gap-2">
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="px-6 py-2 rounded-sm gold-gradient flex items-center justify-center text-black font-display font-bold uppercase tracking-widest text-[11px] disabled:opacity-30 disabled:grayscale transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[var(--accent)]/10"
                >
                  Send
                </button>
              </div>
            </form>
          )}
          <div className="max-w-5xl mx-auto mt-3 flex justify-between items-center opacity-30 px-2">
             <span className="text-[7px] font-mono text-[var(--text-dim)] uppercase tracking-widest font-bold">Protocol-V2.4.0 // Local IP Synced</span>
             <span className="text-[7px] font-mono text-[var(--text-dim)] uppercase tracking-widest font-bold">Node: {socket.id || 'INITIALIZING...'}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
