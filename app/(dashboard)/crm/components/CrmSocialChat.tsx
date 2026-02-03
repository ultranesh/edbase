'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface SocialMessage {
  id: string;
  direction: 'INCOMING' | 'OUTGOING';
  type: string;
  body: string | null;
  mediaUrl: string | null;
  mediaCaption: string | null;
  mediaMimeType: string | null;
  mediaFileName: string | null;
  status: string;
  sentBy: { id: string; firstName: string; lastName: string } | null;
  createdAt: string;
  _pending?: boolean;
}

interface SocialConversation {
  id: string;
  platform: 'MESSENGER' | 'INSTAGRAM';
  platformUserId: string;
  contactName: string | null;
  contactUsername: string | null;
  contactAvatar: string | null;
  unreadCount: number;
  isBlocked: boolean;
  lastMessageAt: string | null;
  lastMessage: {
    body: string | null;
    type: string;
    direction: string;
    createdAt: string;
  } | null;
  lead: { id: string; firstName: string; lastName: string } | null;
}

interface CrmSocialChatProps {
  platform: 'MESSENGER' | 'INSTAGRAM';
  leadId: string;
  leadName: string;
  t: (key: string) => string;
}

// Platform colors
const PLATFORM_THEME = {
  MESSENGER: {
    accent: '#0084FF',
    accentDark: '#0078E8',
    outBubble: 'bg-[#0084FF]',
    outText: 'text-white',
    outBubbleDark: 'dark:bg-[#0084FF]',
    headerBg: 'bg-gradient-to-r from-[#0084FF] to-[#00C6FF]',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.2 5.42 3.15 7.2.16.15.26.37.27.6l.05 1.88c.02.62.67 1.03 1.24.78l2.1-.93c.18-.08.38-.1.57-.06.9.25 1.86.38 2.62.38 5.64 0 10-4.13 10-9.7S17.64 2 12 2zm1.04 7.45l-2.5 3.18c-.2.25-.57.3-.83.1l-1.98-1.49a.5.5 0 00-.61.01l-2.68 2.03c-.36.27-.82-.14-.58-.52l2.5-3.18a.63.63 0 01.83-.1l1.98 1.49a.5.5 0 00.61-.01l2.68-2.03c.36-.27.82.14.58.52z" />
      </svg>
    ),
  },
  INSTAGRAM: {
    accent: '#E1306C',
    accentDark: '#C13584',
    outBubble: 'bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#F77737]',
    outText: 'text-white',
    outBubbleDark: 'dark:bg-gradient-to-br dark:from-[#833AB4] dark:via-[#E1306C] dark:to-[#F77737]',
    headerBg: 'bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#F77737]',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
};

export default function CrmSocialChat({ platform, leadId, leadName, t }: CrmSocialChatProps) {
  const [conversations, setConversations] = useState<SocialConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<SocialConversation | null>(null);
  const [messages, setMessages] = useState<SocialMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  const theme = PLATFORM_THEME[platform];
  const platformLabel = platform === 'MESSENGER' ? 'Messenger' : 'Instagram';

  // Load conversations for this lead
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`/api/social/conversations?leadId=${leadId}&platform=${platform}`, { cache: 'no-store' });
      if (res.ok) {
        const data: SocialConversation[] = await res.json();
        setConversations(data);
        if (data.length > 0 && !activeConversation) {
          setActiveConversation(data[0]);
        }
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [leadId, platform, activeConversation]);

  // Load messages for active conversation
  const fetchMessages = useCallback(async () => {
    if (!activeConversation) return;
    try {
      const res = await fetch(`/api/social/conversations/${activeConversation.id}/messages`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const msgs: SocialMessage[] = data.messages || [];
        setMessages(prev => {
          const pending = prev.filter(m => m._pending);
          const nonPending = msgs.filter(m => !pending.some(p => p.body === m.body && p.type === m.type));
          return [...nonPending, ...pending.filter(p => !msgs.some(m => m.body === p.body && m.type === p.type))];
        });

        // Auto-scroll on new messages
        const lastId = msgs[msgs.length - 1]?.id;
        if (lastId && lastId !== lastMessageIdRef.current) {
          lastMessageIdRef.current = lastId;
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      }
    } catch { /* ignore */ }
  }, [activeConversation]);

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Poll messages
  useEffect(() => {
    if (!activeConversation) return;
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [activeConversation, fetchMessages]);

  // Send text message
  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || !activeConversation) return;

    // Optimistic update
    const pendingMsg: SocialMessage = {
      id: `pending-${Date.now()}`,
      direction: 'OUTGOING',
      type: 'TEXT',
      body: trimmed,
      mediaUrl: null,
      mediaCaption: null,
      mediaMimeType: null,
      mediaFileName: null,
      status: 'SENT',
      sentBy: null,
      createdAt: new Date().toISOString(),
      _pending: true,
    };
    setMessages(prev => [...prev, pendingMsg]);
    setText('');
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    setSending(true);
    try {
      const res = await fetch('/api/social/send', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: activeConversation.id, text: trimmed }),
      });
      if (res.ok) {
        const msg: SocialMessage = await res.json();
        setMessages(prev => prev.map(m => m.id === pendingMsg.id ? msg : m));
      } else {
        setMessages(prev => prev.filter(m => m.id !== pendingMsg.id));
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== pendingMsg.id));
    }
    setSending(false);
    inputRef.current?.focus();
  };

  // Send file
  const handleFileSend = async (file: File) => {
    if (!activeConversation) return;

    // For now, we can only send files if we have a URL — we need to upload first
    // In a production setup, we'd upload to our server first, get a URL, then send
    // For MVP, we'll show a placeholder
    setPendingFiles([]);
    setSending(true);

    try {
      // Upload file to get a publicly-accessible URL
      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversationId', activeConversation.id);

      // TODO: implement file upload endpoint
      // For now, show that the feature requires a file upload endpoint
      console.warn('[Social Chat] File upload not yet implemented — need /api/social/upload endpoint');
    } catch {
      // ignore
    }
    setSending(false);
  };

  // Drag & drop
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) setPendingFiles(files);
  };

  // Format date
  const formatMessageDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    if (isToday) return 'Сегодня';
    if (isYesterday) return 'Вчера';
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  // Status icon
  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'READ') return (
      <svg className="w-3.5 h-3.5 text-blue-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M1.5 8.5l3 3 7-7M5.5 8.5l3 3 7-7" />
      </svg>
    );
    if (status === 'DELIVERED') return (
      <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M1.5 8.5l3 3 7-7M5.5 8.5l3 3 7-7" />
      </svg>
    );
    if (status === 'FAILED') return (
      <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    );
    return (
      <svg className="w-3 h-3 text-gray-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 8.5l3 3 7-7" />
      </svg>
    );
  };

  // Group messages by date
  const groupedMessages: { date: string; msgs: SocialMessage[] }[] = [];
  let currentDate = '';
  for (const msg of messages) {
    const d = formatMessageDate(msg.createdAt);
    if (d !== currentDate) {
      currentDate = d;
      groupedMessages.push({ date: d, msgs: [] });
    }
    groupedMessages[groupedMessages.length - 1].msgs.push(msg);
  }

  // Media URL helper
  const mediaProxyUrl = (url: string) => `/api/social/media?url=${encodeURIComponent(url)}`;

  // ── Empty State ──
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
        <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full mx-auto" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6">
        <div className={`w-16 h-16 rounded-full ${theme.headerBg} flex items-center justify-center mb-4 shadow-lg`}>
          <div className="w-8 h-8 text-white flex items-center justify-center">
            {theme.icon}
          </div>
        </div>
        <p className="text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('crm.noConversation')}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs">
          {platform === 'INSTAGRAM' ? t('crm.instagramHint') : t('crm.messengerHint')}
        </p>
      </div>
    );
  }

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col"
      style={{ height: '500px' }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* ── Header ── */}
      <div className={`${theme.headerBg} px-4 py-2.5 flex items-center gap-3 text-white shrink-0`}>
        {activeConversation?.contactAvatar ? (
          <img
            src={activeConversation.contactAvatar}
            alt=""
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            {theme.icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">
            {activeConversation?.contactName || leadName || platformLabel}
          </div>
          {activeConversation?.contactUsername && (
            <div className="text-xs opacity-75">@{activeConversation.contactUsername}</div>
          )}
        </div>
        <span className="text-xs opacity-75">{platformLabel}</span>
      </div>

      {/* ── Conversation Tabs (if multiple) ── */}
      {conversations.length > 1 && (
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto shrink-0">
          {conversations.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveConversation(c)}
              className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                activeConversation?.id === c.id
                  ? 'border-b-2 text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              style={activeConversation?.id === c.id ? { borderBottomColor: theme.accent } : undefined}
            >
              {c.contactName || c.contactUsername || c.platformUserId.slice(0, 8)}
              {c.unreadCount > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  {c.unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Messages Area ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-gray-50 dark:bg-gray-900/50">
        {isDragOver && (
          <div className="absolute inset-0 bg-blue-500/10 z-10 flex items-center justify-center border-2 border-dashed border-blue-400 rounded-xl">
            <p className="text-blue-600 dark:text-blue-400 font-medium">{t('crm.dropFile') || 'Перетащите файл сюда'}</p>
          </div>
        )}

        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">
            {t('crm.noMessages') || 'Нет сообщений'}
          </div>
        )}

        {groupedMessages.map(group => (
          <div key={group.date}>
            {/* Date separator */}
            <div className="flex items-center justify-center py-2">
              <span className="bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs px-3 py-1 rounded-full shadow-sm border border-gray-200 dark:border-gray-700">
                {group.date}
              </span>
            </div>

            {group.msgs.map(msg => {
              const isOut = msg.direction === 'OUTGOING';

              return (
                <div key={msg.id} className={`flex ${isOut ? 'justify-end' : 'justify-start'} mb-1`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                      isOut
                        ? `${theme.outBubble} ${theme.outBubbleDark} ${theme.outText}`
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700'
                    } ${msg._pending ? 'opacity-70' : ''}`}
                  >
                    {/* Media */}
                    {msg.type === 'IMAGE' && msg.mediaUrl && (
                      <img
                        src={mediaProxyUrl(msg.mediaUrl)}
                        alt=""
                        className="rounded-lg max-w-full max-h-64 cursor-pointer mb-1"
                        onClick={() => setLightboxUrl(mediaProxyUrl(msg.mediaUrl!))}
                      />
                    )}
                    {msg.type === 'VIDEO' && msg.mediaUrl && (
                      <video
                        src={mediaProxyUrl(msg.mediaUrl)}
                        controls
                        className="rounded-lg max-w-full max-h-64 mb-1"
                      />
                    )}
                    {msg.type === 'AUDIO' && msg.mediaUrl && (
                      <audio src={mediaProxyUrl(msg.mediaUrl)} controls className="max-w-full mb-1" />
                    )}
                    {msg.type === 'DOCUMENT' && msg.mediaUrl && (
                      <a
                        href={mediaProxyUrl(msg.mediaUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg mb-1 ${
                          isOut ? 'bg-white/10' : 'bg-gray-100 dark:bg-gray-700'
                        }`}
                      >
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                        <span className="text-xs truncate">{msg.mediaFileName || 'Document'}</span>
                      </a>
                    )}

                    {/* Text */}
                    {msg.body && (
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                    )}
                    {msg.mediaCaption && msg.type !== 'TEXT' && (
                      <p className="text-sm whitespace-pre-wrap break-words mt-1">{msg.mediaCaption}</p>
                    )}

                    {/* Time + Status */}
                    <div className={`flex items-center gap-1 justify-end mt-0.5 ${
                      isOut ? 'text-white/60' : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      <span className="text-[10px]">{formatTime(msg.createdAt)}</span>
                      {isOut && <StatusIcon status={msg.status} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Pending Files Preview ── */}
      {pendingFiles.length > 0 && (
        <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2 bg-white dark:bg-gray-800 shrink-0">
          {pendingFiles.map((f, i) => (
            <div key={i} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg px-2 py-1 text-xs">
              <span className="truncate max-w-[120px]">{f.name}</span>
              <button onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          <button
            onClick={() => pendingFiles[0] && handleFileSend(pendingFiles[0])}
            className="ml-auto px-3 py-1 text-xs font-medium text-white rounded-lg"
            style={{ backgroundColor: theme.accent }}
          >
            {t('crm.send') || 'Отправить'}
          </button>
        </div>
      )}

      {/* ── Input ── */}
      {activeConversation && !activeConversation.isBlocked && (
        <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2 bg-white dark:bg-gray-800 shrink-0">
          {/* Attach */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
            onChange={e => {
              const files = Array.from(e.target.files || []);
              if (files.length > 0) setPendingFiles(files);
              e.target.value = '';
            }}
          />

          {/* Text Input */}
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={t('crm.typeMessage') || 'Введите сообщение...'}
            className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full px-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-opacity-50"
            style={{ '--tw-ring-color': theme.accent } as React.CSSProperties}
            disabled={sending}
          />

          {/* Send */}
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="p-2 rounded-full text-white transition-colors disabled:opacity-40"
            style={{ backgroundColor: theme.accent }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
      )}

      {/* Blocked state */}
      {activeConversation?.isBlocked && (
        <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400 text-center shrink-0">
          {t('crm.contactBlocked') || 'Контакт заблокирован'}
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <img src={lightboxUrl} alt="" className="max-w-full max-h-full rounded-lg" />
          <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setLightboxUrl(null)}>
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
