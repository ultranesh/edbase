'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '../../components/LanguageProvider';
import { useAvatarLightbox } from '../../components/AvatarLightbox';
import AudioMessage from './AudioMessage';
import BroadcastFilterDialog from './BroadcastFilterDialog';
import type { BroadcastFilters } from './BroadcastFilterDialog';

const BROADCAST_CHAT_ID = 'ertis-academy-broadcast';
const BROADCAST_SENDER_ROLES = ['ADMIN', 'SUPERADMIN', 'COORDINATOR', 'COORDINATOR_MANAGER'];

const MAX_RECORDING_SEC = 60;

interface ChatParticipant {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar: string | null;
}

interface ChatLastMessage {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  createdAt: string;
}

interface ChatItem {
  id: string;
  name: string | null;
  isGroup: boolean;
  isBroadcast?: boolean;
  groupId: string | null;
  participants: ChatParticipant[];
  lastMessage: ChatLastMessage | null;
  unreadCount: number;
  updatedAt: string;
}

interface SearchUser {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar: string | null;
}

interface MessageItem {
  id: string;
  content: string;
  attachments?: string[];
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  status: string;
  isEdited?: boolean;
  createdAt: string;
  recipientCount?: number;
}

interface MessagesClientProps {
  currentUserId: string;
  currentUserName: string;
  currentUserRole: string;
}

const POLL_INTERVAL = 3000;

const AVATAR_COLORS = [
  'bg-blue-600', 'bg-purple-600', 'bg-emerald-600', 'bg-orange-600',
  'bg-rose-600', 'bg-cyan-600', 'bg-indigo-600', 'bg-amber-600',
  'bg-teal-600', 'bg-pink-600',
];

function getChatColor(chatId: string): string {
  let hash = 0;
  for (let i = 0; i < chatId.length; i++) {
    hash = chatId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
}

function getChatDisplayName(chat: ChatItem): string {
  if (chat.name) return chat.name;
  if (chat.participants.length === 1) {
    const p = chat.participants[0];
    return `${p.firstName} ${p.lastName}`;
  }
  return chat.participants.map((p) => p.firstName).join(', ');
}

function getChatInitials(chat: ChatItem): string {
  if (chat.isGroup) {
    return (chat.name || 'G')[0].toUpperCase();
  }
  if (chat.participants.length === 1) {
    return getInitials(chat.participants[0].firstName, chat.participants[0].lastName);
  }
  return '?';
}

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) {
    return 'Вчера';
  }
  if (diffDays < 7) {
    return date.toLocaleDateString('ru-RU', { weekday: 'short' });
  }
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

export default function MessagesClient({ currentUserId, currentUserName, currentUserRole }: MessagesClientProps) {
  const { t } = useLanguage();
  const { openAvatar } = useAvatarLightbox();
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  // Broadcast state
  const [showBroadcastFilter, setShowBroadcastFilter] = useState(false);
  const [broadcastSending, setBroadcastSending] = useState(false);
  const isBroadcastSender = BROADCAST_SENDER_ROLES.includes(currentUserRole);

  // Edit message state
  const [editingMessage, setEditingMessage] = useState<MessageItem | null>(null);
  const [editText, setEditText] = useState('');

  // Delete confirmation state
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [sendingAudio, setSendingAudio] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatsPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const selectedChatIdRef = useRef<string | null>(null);

  // Keep ref in sync
  useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  // Fetch chats
  const fetchChats = useCallback(async () => {
    try {
      const res = await fetch('/api/chats', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setChats(data.chats || []);
    } catch {
      // silent
    } finally {
      setLoadingChats(false);
    }
  }, []);

  // Fetch messages for active chat
  const fetchMessages = useCallback(async (chatId: string) => {
    try {
      const res = await fetch(`/api/chats/${chatId}/messages`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      // Only update if still viewing the same chat
      if (selectedChatIdRef.current === chatId) {
        setMessages(data.messages || []);
      }
    } catch {
      // silent
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Mark as read
  const markAsRead = useCallback(async (chatId: string) => {
    try {
      await fetch(`/api/chats/${chatId}/read`, { method: 'POST' });
    } catch {
      // silent
    }
  }, []);

  // Initial load + polling for chats
  useEffect(() => {
    fetchChats();
    chatsPollRef.current = setInterval(fetchChats, POLL_INTERVAL);
    return () => {
      if (chatsPollRef.current) clearInterval(chatsPollRef.current);
    };
  }, [fetchChats]);

  // Polling for messages of active chat
  useEffect(() => {
    if (messagesPollRef.current) clearInterval(messagesPollRef.current);

    if (selectedChatId) {
      setLoadingMessages(true);
      fetchMessages(selectedChatId);
      markAsRead(selectedChatId);

      messagesPollRef.current = setInterval(() => {
        fetchMessages(selectedChatId);
      }, POLL_INTERVAL);
    } else {
      setMessages([]);
    }

    return () => {
      if (messagesPollRef.current) clearInterval(messagesPollRef.current);
    };
  }, [selectedChatId, fetchMessages, markAsRead]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Focus input on chat select
  useEffect(() => {
    if (selectedChatId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedChatId]);

  // User search debounce
  useEffect(() => {
    if (userSearch.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchingUsers(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(userSearch.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.users || []);
        }
      } catch {
        // silent
      } finally {
        setSearchingUsers(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [userSearch]);

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    setMobileShowChat(true);
  };

  const handleBack = () => {
    setMobileShowChat(false);
  };

  const handleSend = async () => {
    if (!messageText.trim() || !selectedChatId) return;

    const text = messageText.trim();
    setMessageText('');
    inputRef.current?.focus();

    // Optimistic UI
    const optimisticMsg: MessageItem = {
      id: `opt-${Date.now()}`,
      content: text,
      senderId: currentUserId,
      senderName: currentUserName,
      senderAvatar: null,
      status: 'SENT',
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await fetch(`/api/chats/${selectedChatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });

      if (res.ok) {
        const data = await res.json();
        // Replace optimistic message with real one
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticMsg.id ? data.message : m))
        );
        // Refresh chats to update last message
        fetchChats();
      } else {
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
    }
  };

  const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  const canEditMessage = (msg: MessageItem) => {
    if (msg.id.startsWith('opt-')) return false;
    return Date.now() - new Date(msg.createdAt).getTime() < EDIT_WINDOW_MS;
  };

  const handleEditMessage = async () => {
    if (!editingMessage || !editText.trim() || !selectedChatId) return;
    const newContent = editText.trim();
    if (newContent === editingMessage.content) {
      setEditingMessage(null);
      setEditText('');
      return;
    }
    try {
      const res = await fetch(`/api/chats/${selectedChatId}/messages`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: editingMessage.id, content: newContent }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => prev.map(m => m.id === editingMessage.id ? { ...m, content: data.message.content, isEdited: true } : m));
      }
    } catch { /* silent */ }
    setEditingMessage(null);
    setEditText('');
    inputRef.current?.focus();
  };

  const handleDeleteMessage = async () => {
    if (!selectedChatId || !deleteMessageId) return;
    const msgId = deleteMessageId;
    setDeleteMessageId(null);
    try {
      const res = await fetch(`/api/chats/${selectedChatId}/messages?messageId=${msgId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setMessages(prev => prev.filter(m => m.id !== msgId));
      }
    } catch { /* silent */ }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (editingMessage) {
        handleEditMessage();
      } else {
        handleSend();
      }
    }
    if (e.key === 'Escape' && editingMessage) {
      setEditingMessage(null);
      setEditText('');
    }
  };

  const handleStartChat = async (user: SearchUser) => {
    setShowNewChat(false);
    setUserSearch('');
    setSearchResults([]);

    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantIds: [user.id] }),
      });

      if (res.ok) {
        const data = await res.json();
        await fetchChats();
        setSelectedChatId(data.chat.id);
        setMobileShowChat(true);
      }
    } catch {
      // silent
    }
  };

  // --- Broadcast send ---
  const handleBroadcastSend = async (filters: BroadcastFilters) => {
    if (!messageText.trim() || !selectedChatId) return;

    const text = messageText.trim();
    setShowBroadcastFilter(false);
    setMessageText('');
    setBroadcastSending(true);

    const optimisticMsg: MessageItem = {
      id: `opt-bc-${Date.now()}`,
      content: text,
      senderId: currentUserId,
      senderName: currentUserName,
      senderAvatar: null,
      status: 'SENT',
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await fetch(`/api/chats/${selectedChatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, broadcastFilters: filters }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticMsg.id ? data.message : m))
        );
        fetchChats();
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
    } finally {
      setBroadcastSending(false);
    }
  };

  // --- Audio recording ---
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = recorder;
      recordingChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordingChunksRef.current.push(e.data);
      };

      recorder.start(100); // collect chunks every 100ms
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access error:', err);
    }
  }, []);

  const cleanupRecording = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    recordingChunksRef.current = [];
    setIsRecording(false);
    setRecordingTime(0);
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    cleanupRecording();
  }, [cleanupRecording]);

  const stopAndSendRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || !selectedChatId) return;

    const recorder = mediaRecorderRef.current;
    const duration = recordingTime;

    // Stop recording and wait for final data
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      if (recorder.state !== 'inactive') recorder.stop();
      else resolve();
    });

    const blob = new Blob(recordingChunksRef.current, { type: 'audio/webm' });
    cleanupRecording();

    if (blob.size < 500) return; // too short, ignore

    setSendingAudio(true);

    try {
      // 1. Upload audio file
      const formData = new FormData();
      formData.append('audio', blob, 'voice.webm');
      formData.append('duration', String(Math.round(duration)));

      const uploadRes = await fetch('/api/chats/upload-audio', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) throw new Error('Upload failed');
      const uploadData = await uploadRes.json();

      // 2. Send message with audio attachment
      const optimisticMsg: MessageItem = {
        id: `opt-audio-${Date.now()}`,
        content: '',
        attachments: [JSON.stringify({ type: 'audio', url: uploadData.url, duration: Math.round(duration) })],
        senderId: currentUserId,
        senderName: currentUserName,
        senderAvatar: null,
        status: 'SENT',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      const res = await fetch(`/api/chats/${selectedChatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioUrl: uploadData.url,
          audioDuration: Math.round(duration),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => prev.map((m) => (m.id === optimisticMsg.id ? data.message : m)));
        fetchChats();
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      }
    } catch (err) {
      console.error('Audio send error:', err);
    } finally {
      setSendingAudio(false);
    }
  }, [selectedChatId, recordingTime, cleanupRecording, currentUserId, currentUserName, fetchChats]);

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Auto-stop recording at max duration
  useEffect(() => {
    if (isRecording && recordingTime >= MAX_RECORDING_SEC) {
      stopAndSendRecording();
    }
  }, [isRecording, recordingTime, stopAndSendRecording]);

  const filteredChats = chats.filter((chat) => {
    if (!searchQuery) return true;
    const name = getChatDisplayName(chat).toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  const selectedChat = chats.find((c) => c.id === selectedChatId);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex" style={{ height: 'calc(100vh - 140px)' }}>
      {/* Conversations list */}
      <div className={`w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 flex flex-col ${mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
        {/* Search header */}
        <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder={t('messages.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
          <button
            onClick={() => setShowNewChat(true)}
            className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0 transition-colors"
            title={t('messages.newChat')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Chats list */}
        <div className="flex-1 overflow-y-auto">
          {loadingChats ? (
            <div className="p-6 text-center">
              <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('messages.noChats')}</p>
            </div>
          ) : (
            filteredChats.map((chat) => {
              const displayName = getChatDisplayName(chat);
              const initials = getChatInitials(chat);
              const color = getChatColor(chat.id);
              const lastMsg = chat.lastMessage;

              return (
                <button
                  key={chat.id}
                  onClick={() => handleSelectChat(chat.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 transition-colors ${
                    selectedChatId === chat.id
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {chat.isBroadcast ? (
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                        </svg>
                      </div>
                    ) : chat.participants.length === 1 && chat.participants[0].avatar ? (
                      <div
                        className="h-12 w-12 rounded-full overflow-hidden cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); openAvatar(chat.participants[0].avatar!, `${chat.participants[0].firstName} ${chat.participants[0].lastName}`); }}
                      >
                        <img src={chat.participants[0].avatar} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className={`h-12 w-12 rounded-full ${color} flex items-center justify-center`}>
                        <span className="text-sm font-medium text-white">{initials}</span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-semibold truncate ${
                        selectedChatId === chat.id
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {displayName}
                      </span>
                      {lastMsg && (
                        <span className={`text-xs flex-shrink-0 ml-2 ${
                          chat.unreadCount > 0 ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-400 dark:text-gray-500'
                        }`}>
                          {formatMessageTime(lastMsg.createdAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {lastMsg
                          ? (chat.isGroup
                              ? `${lastMsg.senderName.split(' ')[0]}: ${lastMsg.content || '🎤 ' + t('messages.voiceMessage')}`
                              : (lastMsg.content || '🎤 ' + t('messages.voiceMessage')))
                          : t('messages.startConversation')}
                      </p>
                      {chat.unreadCount > 0 && (
                        <span className="ml-2 flex-shrink-0 h-5 min-w-[20px] px-1.5 bg-blue-600 text-white text-xs font-medium rounded-full flex items-center justify-center">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className={`flex-1 flex flex-col ${mobileShowChat ? 'flex' : 'hidden md:flex'}`}>
        {selectedChat ? (
          <>
            {/* Chat header */}
            <div className="h-16 flex items-center gap-3 px-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
              <button onClick={handleBack} className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {selectedChat.isBroadcast ? (
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                </div>
              ) : selectedChat.participants.length === 1 && selectedChat.participants[0].avatar ? (
                <div
                  className="h-10 w-10 rounded-full overflow-hidden flex-shrink-0 cursor-pointer"
                  onClick={() => openAvatar(selectedChat.participants[0].avatar!, `${selectedChat.participants[0].firstName} ${selectedChat.participants[0].lastName}`)}
                >
                  <img src={selectedChat.participants[0].avatar} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className={`h-10 w-10 rounded-full ${getChatColor(selectedChat.id)} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-sm font-medium text-white">{getChatInitials(selectedChat)}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {getChatDisplayName(selectedChat)}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedChat.isBroadcast
                    ? t('broadcast.channelNotice')
                    : selectedChat.isGroup
                      ? `${selectedChat.participants.length + 1} ${t('messages.participants')}`
                      : t(`role.${selectedChat.participants[0]?.role || 'ADMIN'}`)}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-gray-50 dark:bg-gray-900">
              {loadingMessages && messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-gray-400 dark:text-gray-500">{t('messages.startConversation')}</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwn = msg.senderId === currentUserId;
                  // Check for audio attachment
                  let audioAttachment: { type: string; url: string; duration: number } | null = null;
                  if (msg.attachments && msg.attachments.length > 0) {
                    try {
                      const parsed = JSON.parse(msg.attachments[0]);
                      if (parsed.type === 'audio') audioAttachment = parsed;
                    } catch { /* not audio */ }
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`flex group/msg ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      {/* Edit & Delete buttons for own messages */}
                      {isOwn && !msg.id.startsWith('opt-') && (
                        <div className="flex items-center gap-0.5 self-center mr-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                          {/* Edit — only for text messages within 15 min */}
                          {!audioAttachment && canEditMessage(msg) && (
                            <button
                              onClick={() => { setEditingMessage(msg); setEditText(msg.content); setTimeout(() => { if (inputRef.current) { inputRef.current.focus(); const len = msg.content.length; inputRef.current.setSelectionRange(len, len); } }, 50); }}
                              className="p-1 rounded-full text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                              title="Редактировать"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                          )}
                          {/* Delete */}
                          <button
                            onClick={() => setDeleteMessageId(msg.id)}
                            className="p-1 rounded-full text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                            title="Удалить"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                      <div
                        className={`max-w-[75%] px-3 py-2 rounded-2xl shadow-sm ${
                          isOwn
                            ? 'bg-blue-600 text-white rounded-br-md'
                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-100 dark:border-gray-700 rounded-bl-md'
                        }`}
                      >
                        {/* Show sender name in group chats */}
                        {selectedChat.isGroup && !isOwn && (
                          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-0.5">
                            {msg.senderName}
                          </p>
                        )}
                        {audioAttachment ? (
                          <AudioMessage
                            url={audioAttachment.url}
                            duration={audioAttachment.duration}
                            isOwn={isOwn}
                          />
                        ) : (
                          <p className="text-[14px] leading-[20px] whitespace-pre-wrap">{msg.content}</p>
                        )}
                        <div className={`flex items-center justify-end gap-1 -mb-0.5 mt-0.5 ${
                          isOwn ? 'text-blue-200' : 'text-gray-400 dark:text-gray-500'
                        }`}>
                          {msg.isEdited && (
                            <span className="text-[11px] italic opacity-70">изм.</span>
                          )}
                          <span className="text-[11px]">{formatMessageTime(msg.createdAt)}</span>
                          {isOwn && (
                            <span className="text-[13px]">
                              {msg.status === 'READ' ? '✓✓' : msg.status === 'DELIVERED' ? '✓✓' : '✓'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            {selectedChat.isBroadcast && !isBroadcastSender ? (
              <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
                <div className="flex items-center justify-center gap-2 py-2 text-gray-400 dark:text-gray-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                  <span className="text-sm">{t('broadcast.channelNotice')}</span>
                </div>
              </div>
            ) : selectedChat.isBroadcast && isBroadcastSender ? (
              <div className="p-3 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (messageText.trim()) setShowBroadcastFilter(true);
                      }
                    }}
                    placeholder={t('messages.typePlaceholder')}
                    rows={1}
                    className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 max-h-32"
                    style={{ minHeight: '42px' }}
                  />
                  <button
                    onClick={() => { if (messageText.trim()) setShowBroadcastFilter(true); }}
                    disabled={!messageText.trim() || broadcastSending}
                    className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white flex-shrink-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={t('broadcast.send')}
                  >
                    {broadcastSending ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ) : (
            <div className="p-3 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
              {isRecording ? (
                /* Recording UI */
                <div className="flex items-center gap-3">
                  {/* Cancel button */}
                  <button
                    onClick={cancelRecording}
                    className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-red-500 flex-shrink-0 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  {/* Recording indicator */}
                  <div className="flex-1 flex items-center gap-3 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 rounded-xl">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
                    <span className="text-sm font-medium text-red-600 dark:text-red-400">
                      {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                    </span>
                    <div className="flex-1 flex items-center gap-[2px] h-6">
                      {Array.from({ length: 24 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-red-400/60 dark:bg-red-500/40 rounded-full animate-pulse"
                          style={{
                            height: `${30 + Math.random() * 70}%`,
                            animationDelay: `${i * 50}ms`,
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-red-400 dark:text-red-500 flex-shrink-0">
                      {MAX_RECORDING_SEC - recordingTime}s
                    </span>
                  </div>

                  {/* Send recording button */}
                  <button
                    onClick={stopAndSendRecording}
                    className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              ) : (
                /* Normal input / Edit mode */
                <div className="flex flex-col gap-0">
                  {/* Edit indicator bar */}
                  {editingMessage && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500 rounded-t-xl">
                      <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Редактирование</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{editingMessage.content}</p>
                      </div>
                      <button
                        onClick={() => { setEditingMessage(null); setEditText(''); }}
                        className="p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-800/40 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    <textarea
                      ref={inputRef}
                      value={editingMessage ? editText : messageText}
                      onChange={(e) => editingMessage ? setEditText(e.target.value) : setMessageText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={editingMessage ? 'Редактировать сообщение...' : t('messages.typePlaceholder')}
                      rows={1}
                      className={`flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 max-h-32 ${editingMessage ? 'rounded-b-xl rounded-t-none' : 'rounded-xl'}`}
                      style={{ minHeight: '42px' }}
                    />
                    {editingMessage ? (
                      /* Confirm edit button */
                      <button
                        onClick={handleEditMessage}
                        disabled={!editText.trim()}
                        className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white flex-shrink-0 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    ) : messageText.trim() ? (
                      /* Send text button */
                      <button
                        onClick={handleSend}
                        className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </button>
                    ) : (
                      /* Mic button — shows when no text typed */
                      <button
                        onClick={startRecording}
                        disabled={sendingAudio}
                        className={`p-2.5 rounded-xl flex-shrink-0 transition-colors ${
                          sendingAudio
                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                            : 'bg-gray-100 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
                        }`}
                        title={t('messages.voiceMessage')}
                      >
                        {sendingAudio ? (
                          <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 15a3 3 0 003-3V5a3 3 0 00-6 0v7a3 3 0 003 3z" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            )}
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center px-6">
              <div className="mx-auto w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {t('messages.emptyTitle')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                {t('messages.emptyDescription')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setShowNewChat(false); setUserSearch(''); setSearchResults([]); }}>
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                {t('messages.newChat')}
              </h3>
              <button
                onClick={() => { setShowNewChat(false); setUserSearch(''); setSearchResults([]); }}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search input */}
            <div className="p-4">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder={t('messages.searchUsers')}
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  autoFocus
                />
              </div>
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto px-2 pb-4">
              {searchingUsers ? (
                <div className="p-4 text-center">
                  <div className="inline-block w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : searchResults.length === 0 && userSearch.trim().length >= 2 ? (
                <div className="p-4 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('messages.noUsersFound')}</p>
                </div>
              ) : (
                searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleStartChat(user)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    {user.avatar ? (
                      <div
                        className="h-10 w-10 rounded-full overflow-hidden flex-shrink-0 cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); openAvatar(user.avatar!, `${user.firstName} ${user.lastName}`); }}
                      >
                        <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className={`h-10 w-10 rounded-full ${getChatColor(user.id)} flex items-center justify-center flex-shrink-0`}>
                        <span className="text-sm font-medium text-white">
                          {getInitials(user.firstName, user.lastName)}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t(`role.${user.role}`)}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Filter Dialog */}
      <BroadcastFilterDialog
        isOpen={showBroadcastFilter}
        onClose={() => setShowBroadcastFilter(false)}
        onSend={handleBroadcastSend}
        t={t}
      />

      {/* Delete confirmation modal */}
      {deleteMessageId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDeleteMessageId(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Удалить сообщение?
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Сообщение будет удалено для всех участников.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteMessageId(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleDeleteMessage}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
