'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../../../components/LanguageProvider';

function AudioPlayer({ src, isOutgoing }: { src: string; isOutgoing: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); } else { a.play(); }
    setPlaying(!playing);
  };

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={() => { if (audioRef.current) setDuration(audioRef.current.duration); }}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
            setProgress(audioRef.current.duration ? (audioRef.current.currentTime / audioRef.current.duration) * 100 : 0);
          }
        }}
        onEnded={() => { setPlaying(false); setProgress(0); setCurrentTime(0); }}
      />
      <button
        onClick={toggle}
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isOutgoing ? 'bg-green-600/20 text-green-700 dark:text-[#06cf9c]' : 'bg-gray-200 dark:bg-[#374045] text-gray-600 dark:text-[#8696a0]'
        }`}
      >
        {playing ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
        ) : (
          <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        {/* Waveform bars */}
        <div
          className="relative h-5 flex items-center gap-[2px] cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            if (audioRef.current && audioRef.current.duration) {
              audioRef.current.currentTime = pct * audioRef.current.duration;
            }
          }}
        >
          {Array.from({ length: 28 }, (_, i) => {
            const h = [3,5,8,4,10,14,8,12,16,10,6,14,18,12,8,16,10,14,6,12,18,8,14,10,16,6,12,8][i] || 6;
            const filled = (i / 28) * 100 < progress;
            return (
              <div
                key={i}
                className={`w-[3px] rounded-full transition-colors ${
                  filled
                    ? isOutgoing ? 'bg-green-700 dark:bg-[#06cf9c]' : 'bg-gray-600 dark:bg-[#8696a0]'
                    : isOutgoing ? 'bg-green-700/30 dark:bg-[#06cf9c]/30' : 'bg-gray-300 dark:bg-[#374045]'
                }`}
                style={{ height: `${h}px` }}
              />
            );
          })}
        </div>
        <div className={`text-[10px] mt-0.5 ${isOutgoing ? 'text-green-700/60 dark:text-[#06cf9c]/60' : 'text-gray-400 dark:text-[#8696a0]'}`}>
          {fmtTime(playing || currentTime > 0 ? currentTime : duration)}
        </div>
      </div>
      {/* Mic icon */}
      <svg className={`w-4 h-4 shrink-0 ${isOutgoing ? 'text-green-700/40 dark:text-[#06cf9c]/40' : 'text-gray-300 dark:text-[#374045]'}`} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
      </svg>
    </div>
  );
}

interface WAMessage {
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
  _failed?: boolean;
}

interface WAConversation {
  id: string;
  waId: string;
  contactName: string | null;
  contactPhone: string;
  unreadCount: number;
  isBlocked?: boolean;
  lastMessageAt: string | null;
  lastMessage: {
    body: string | null;
    type: string;
    direction: string;
    createdAt: string;
  } | null;
  lead: {
    id: string;
    firstName: string;
    lastName: string;
    stage: string;
  } | null;
}

interface CrmWhatsAppChatProps {
  leadPhone: string | null;
  parentPhone: string | null;
  leadId?: string;
  leadName?: string;
  leadLanguage?: string | null;
  t: (key: string) => string;
}

export default function CrmWhatsAppChat({ leadPhone, parentPhone, leadId, leadName, leadLanguage, t }: CrmWhatsAppChatProps) {
  const [conversations, setConversations] = useState<WAConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<WAConversation | null>(null);
  const [messages, setMessages] = useState<WAMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const nextCursorRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [uploading] = useState(false);
  const [initPhone, setInitPhone] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [templates, setTemplates] = useState<{id: string; name: string; language: string; category: string; components: any[]}[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [showTemplateMode, setShowTemplateMode] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationLat, setLocationLat] = useState('43.238949');
  const [locationLng, setLocationLng] = useState('76.945833');
  const [locationName, setLocationName] = useState('');
  const [sendingLocation, setSendingLocation] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [branches, setBranches] = useState<{id: string; name: string; nameKz: string | null; nameRu: string | null; nameEn: string | null; address: string | null; latitude: number | null; longitude: number | null}[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const { language: uiLang } = useLanguage();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const pendingAudioRef = useRef<Map<string, { blob: Blob; blobUrl: string }>>(new Map());

  // Cleanup blob URLs on unmount
  useEffect(() => {
    const ref = pendingAudioRef;
    return () => {
      ref.current.forEach(({ blobUrl }) => URL.revokeObjectURL(blobUrl));
      ref.current.clear();
    };
  }, []);

  const normalizePhone = (phone: string) => phone.replace(/\D/g, '');

  const getBranchLabel = useCallback((branch: typeof branches[number]) => {
    const lang = leadLanguage || (uiLang === 'kk' ? 'KZ' : uiLang === 'en' ? 'EN' : 'RU');
    return lang === 'KZ' ? (branch.nameKz || branch.name) : lang === 'EN' ? (branch.nameEn || branch.name) : (branch.nameRu || branch.name);
  }, [leadLanguage, uiLang]);

  const loadMessages = useCallback(async (conversationId: string, forceScroll = false) => {
    try {
      const res = await fetch(`/api/whatsapp/conversations/${conversationId}/messages?limit=100`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const msgs: WAMessage[] = data.messages || [];
        setHasMore(data.hasMore || false);
        nextCursorRef.current = data.nextCursor || null;
        const newLastId = msgs.length > 0 ? msgs[msgs.length - 1].id : null;
        const hasNew = newLastId !== lastMessageIdRef.current;
        lastMessageIdRef.current = newLastId;
        setMessages(prev => {
          const pending = prev.filter(m => m._pending || m._failed);
          return [...msgs, ...pending];
        });
        if (hasNew || forceScroll) {
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
        // Check if session expired (last incoming message > 24h ago)
        const lastIncoming = [...msgs].reverse().find(m => m.direction === 'INCOMING');
        if (lastIncoming) {
          const lastIncomingTime = new Date(lastIncoming.createdAt).getTime();
          const now = Date.now();
          const hoursSinceLastIncoming = (now - lastIncomingTime) / (1000 * 60 * 60);
          setSessionExpired(hoursSinceLastIncoming > 24);
        } else {
          // No incoming messages at all - session is expired (we initiated but they never replied)
          setSessionExpired(true);
        }
      }
    } catch { /* ignore */ }
  }, []);

  const loadMoreMessages = useCallback(async () => {
    if (!activeConversation || !nextCursorRef.current || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/whatsapp/conversations/${activeConversation.id}/messages?limit=100&cursor=${nextCursorRef.current}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const olderMsgs: WAMessage[] = data.messages || [];
        setHasMore(data.hasMore || false);
        nextCursorRef.current = data.nextCursor || null;
        setMessages(prev => [...olderMsgs, ...prev]);
      }
    } catch { /* ignore */ }
    setLoadingMore(false);
  }, [activeConversation, loadingMore]);

  // Infinite scroll - load more when scrolling to top
  const handleMessagesScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || loadingMore || !hasMore) return;

    // If scrolled near top (within 50px), load more
    if (container.scrollTop < 50) {
      const prevScrollHeight = container.scrollHeight;
      loadMoreMessages().then(() => {
        // Maintain scroll position after loading older messages
        requestAnimationFrame(() => {
          if (messagesContainerRef.current) {
            const newScrollHeight = messagesContainerRef.current.scrollHeight;
            messagesContainerRef.current.scrollTop = newScrollHeight - prevScrollHeight;
          }
        });
      });
    }
  }, [loadingMore, hasMore, loadMoreMessages]);

  // Load templates on mount
  useEffect(() => {
    const loadTemplates = async () => {
      setTemplatesLoading(true);
      try {
        const res = await fetch('/api/whatsapp/templates', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setTemplates(data);
          // Auto-select first template if available
          if (data.length > 0) {
            setSelectedTemplate(data[0].name);
          }
        }
      } catch { /* ignore */ }
      setTemplatesLoading(false);
    };
    loadTemplates();
  }, []);

  useEffect(() => {
    const loadConversations = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/whatsapp/conversations', { cache: 'no-store' });
        if (res.ok) {
          const all: WAConversation[] = await res.json();
          const phones = [leadPhone, parentPhone].filter(Boolean).map(p => normalizePhone(p!));
          const relevant = all.filter(c => phones.includes(normalizePhone(c.contactPhone)));
          setConversations(relevant);
          if (relevant.length > 0) {
            setActiveConversation(prev => {
              const selected = prev || relevant[0];
              setIsBlocked(!!selected.isBlocked);
              return selected;
            });
          } else {
            // Auto-select phone for initiating conversation
            const availablePhones = [leadPhone, parentPhone].filter(Boolean) as string[];
            const uniquePhones = [...new Set(availablePhones.map(p => p))];
            if (uniquePhones.length === 1) {
              setInitPhone(uniquePhones[0]);
            }
          }
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    loadConversations();
  }, [leadPhone, parentPhone]);

  useEffect(() => {
    if (activeConversation) {
      lastMessageIdRef.current = null;
      loadMessages(activeConversation.id, true);
    }
  }, [activeConversation?.id, loadMessages]);

  const handleSend = useCallback(async () => {
    if (!activeConversation || sending) return;
    const hasFiles = pendingFiles.length > 0;
    const hasText = text.trim().length > 0;
    if (!hasFiles && !hasText) return;

    const caption = text.trim();
    const filesToSend = [...pendingFiles];
    setText('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setPendingFiles([]);
    setSending(true);

    // Upload files one by one
    for (let i = 0; i < filesToSend.length; i++) {
      const file = filesToSend[i];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversationId', activeConversation.id);
      // Attach caption to the last file only (WhatsApp style)
      if (caption && i === filesToSend.length - 1) {
        formData.append('caption', caption);
      }
      try {
        const res = await fetch('/api/whatsapp/upload', { method: 'POST', cache: 'no-store', body: formData });
        if (res.ok) {
          const newMsg = await res.json();
          setMessages(prev => [...prev, newMsg]);
        }
      } catch { /* ignore */ }
    }

    // If text only (no files), send as text message
    if (!hasFiles && hasText) {
      try {
        const res = await fetch('/api/whatsapp/send', {
          method: 'POST',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId: activeConversation.id, text: caption }),
        });
        if (res.ok) {
          const newMsg = await res.json();
          setMessages(prev => [...prev, newMsg]);
        }
      } catch { /* ignore */ }
    }

    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    setSending(false);
    inputRef.current?.focus();
  }, [text, activeConversation, sending, pendingFiles]);

  const detectMyLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationLat(String(pos.coords.latitude));
        setLocationLng(String(pos.coords.longitude));
        setGeoLoading(false);
      },
      () => {
        // Failed — keep defaults
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const openLocationModal = useCallback(async () => {
    setShowLocationModal(true);
    setSelectedBranchId(null);
    setLocationName('');
    detectMyLocation();
    try {
      const res = await fetch('/api/database/branches');
      if (res.ok) {
        const data = await res.json();
        setBranches(data.filter((b: any) => b.isActive));
      }
    } catch { /* ignore */ }
  }, [detectMyLocation]);

  const handleSendLocation = async () => {
    if (!activeConversation || !locationLat || !locationLng) return;
    const lat = parseFloat(locationLat);
    const lng = parseFloat(locationLng);
    if (isNaN(lat) || isNaN(lng)) return;
    setSendingLocation(true);
    try {
      // Find the 2GIS link from the selected branch
      const selectedBranch = selectedBranchId ? branches.find(b => b.id === selectedBranchId) : null;
      const gisLink = selectedBranch?.address || undefined;

      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeConversation.id,
          location: { latitude: lat, longitude: lng, name: locationName || undefined, address: gisLink },
        }),
      });
      if (res.ok) {
        const newMsg = await res.json();
        setMessages(prev => [...prev, newMsg]);
        setShowLocationModal(false);
        setLocationLat('');
        setLocationLng('');
        setLocationName('');
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch { /* ignore */ }
    setSendingLocation(false);
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length > 0) {
      setPendingFiles(prev => [...prev, ...files]);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setPendingFiles(prev => [...prev, ...files]);
    }
  }, []);

  const removePendingFile = useCallback((index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'document';
  };

  const getFilePreview = (file: File) => {
    if (file.type.startsWith('image/')) return URL.createObjectURL(file);
    return null;
  };

  const startRecording = useCallback(async () => {
    if (!activeConversation || recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/ogg; codecs=opus')
        ? 'audio/ogg; codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm; codecs=opus')
          ? 'audio/webm; codecs=opus'
          : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      recordingChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) recordingChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
        const blob = new Blob(recordingChunksRef.current, { type: mimeType });
        if (blob.size < 1000) return; // too short
        const ext = mimeType.includes('ogg') ? 'ogg' : 'webm';
        const blobUrl = URL.createObjectURL(blob);
        const optimisticId = `pending-${Date.now()}`;

        // Store blob for retry
        pendingAudioRef.current.set(optimisticId, { blob, blobUrl });

        // Show message immediately in chat
        const optimisticMsg: WAMessage = {
          id: optimisticId,
          direction: 'OUTGOING',
          type: 'AUDIO',
          body: null,
          mediaUrl: blobUrl,
          mediaCaption: null,
          mediaMimeType: 'audio/ogg',
          mediaFileName: 'voice.ogg',
          status: 'PENDING',
          sentBy: null,
          createdAt: new Date().toISOString(),
          _pending: true,
        };
        setMessages(prev => [...prev, optimisticMsg]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

        // Upload in background
        const file = new File([blob], `voice.${ext}`, { type: mimeType });
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('conversationId', activeConversation.id);
          const res = await fetch('/api/whatsapp/upload', { method: 'POST', cache: 'no-store', body: formData });
          if (res.ok) {
            const newMsg = await res.json();
            setMessages(prev => prev.map(m => m.id === optimisticId ? newMsg : m));
            URL.revokeObjectURL(blobUrl);
            pendingAudioRef.current.delete(optimisticId);
          } else {
            setMessages(prev => prev.map(m => m.id === optimisticId ? { ...m, status: 'FAILED', _pending: false, _failed: true } : m));
          }
        } catch {
          setMessages(prev => prev.map(m => m.id === optimisticId ? { ...m, status: 'FAILED', _pending: false, _failed: true } : m));
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch { /* mic permission denied */ }
  }, [activeConversation, recording]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    setRecordingTime(0);
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = () => {
        mediaRecorderRef.current?.stream?.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    setRecording(false);
    setRecordingTime(0);
  }, []);

  const retryAudio = useCallback(async (msgId: string) => {
    const pending = pendingAudioRef.current.get(msgId);
    if (!pending || !activeConversation) return;

    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: 'PENDING', _pending: true, _failed: false } : m));

    const ext = pending.blob.type.includes('ogg') ? 'ogg' : 'webm';
    const file = new File([pending.blob], `voice.${ext}`, { type: pending.blob.type });
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversationId', activeConversation.id);
      const res = await fetch('/api/whatsapp/upload', { method: 'POST', cache: 'no-store', body: formData });
      if (res.ok) {
        const newMsg = await res.json();
        setMessages(prev => prev.map(m => m.id === msgId ? newMsg : m));
        URL.revokeObjectURL(pending.blobUrl);
        pendingAudioRef.current.delete(msgId);
      } else {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: 'FAILED', _pending: false, _failed: true } : m));
      }
    } catch {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: 'FAILED', _pending: false, _failed: true } : m));
    }
  }, [activeConversation]);

  const dismissFailedAudio = useCallback((msgId: string) => {
    const pending = pendingAudioRef.current.get(msgId);
    if (pending) {
      URL.revokeObjectURL(pending.blobUrl);
      pendingAudioRef.current.delete(msgId);
    }
    setMessages(prev => prev.filter(m => m.id !== msgId));
  }, []);

  useEffect(() => {
    if (!activeConversation) return;
    const interval = setInterval(() => {
      loadMessages(activeConversation.id);
    }, 2000);
    return () => clearInterval(interval);
  }, [activeConversation?.id, loadMessages]);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (msgDate.getTime() === today.getTime()) return t('crm.today');
    if (msgDate.getTime() === yesterday.getTime()) return t('crm.yesterday');
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  };

  const proxyUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith('blob:')) return url;
    return `/api/whatsapp/media?url=${encodeURIComponent(url)}`;
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'SENT':
        return (
          <svg className="w-3.5 h-3.5 text-gray-400 dark:text-[#8696a0]" viewBox="0 0 16 16" fill="currentColor">
            <path d="M12.354 4.354a.5.5 0 00-.708-.708L5.5 9.793 3.354 7.646a.5.5 0 10-.708.708l2.5 2.5a.5.5 0 00.708 0l6.5-6.5z" />
          </svg>
        );
      case 'DELIVERED':
        return (
          <svg className="w-3.5 h-3.5 text-gray-400 dark:text-[#8696a0]" viewBox="0 0 16 16" fill="currentColor">
            <path d="M12.354 4.354a.5.5 0 00-.708-.708L5.5 9.793 3.354 7.646a.5.5 0 10-.708.708l2.5 2.5a.5.5 0 00.708 0l6.5-6.5z" />
            <path d="M15.354 4.354a.5.5 0 00-.708-.708L8.5 9.793l-.646-.647a.5.5 0 10-.708.708l1 1a.5.5 0 00.708 0l6.5-6.5z" />
          </svg>
        );
      case 'READ':
        return (
          <svg className="w-3.5 h-3.5 text-blue-400 dark:text-[#53bdeb]" viewBox="0 0 16 16" fill="currentColor">
            <path d="M12.354 4.354a.5.5 0 00-.708-.708L5.5 9.793 3.354 7.646a.5.5 0 10-.708.708l2.5 2.5a.5.5 0 00.708 0l6.5-6.5z" />
            <path d="M15.354 4.354a.5.5 0 00-.708-.708L8.5 9.793l-.646-.647a.5.5 0 10-.708.708l1 1a.5.5 0 00.708 0l6.5-6.5z" />
          </svg>
        );
      case 'FAILED':
        return (
          <svg className="w-3.5 h-3.5 text-red-500" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 2.5a.75.75 0 01.75.75v4a.75.75 0 01-1.5 0v-4A.75.75 0 018 3.5zM8 11a1 1 0 100-2 1 1 0 000 2z" />
          </svg>
        );
      case 'PENDING':
        return (
          <svg className="w-3.5 h-3.5 text-gray-400 dark:text-[#8696a0]" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 12.5a5.5 5.5 0 110-11 5.5 5.5 0 010 11zM8.5 4.5a.5.5 0 00-1 0v4a.5.5 0 00.25.433l2.5 1.5a.5.5 0 10.5-.866L8.5 8.165V4.5z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const renderMedia = (msg: WAMessage) => {
    const url = proxyUrl(msg.mediaUrl);

    switch (msg.type) {
      case 'IMAGE':
        return url ? (
          <img
            src={url}
            alt=""
            className="rounded-lg max-w-full max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
            loading="lazy"
            onClick={() => setLightboxUrl(url)}
          />
        ) : null;

      case 'STICKER':
        return url ? (
          <img src={url} alt="" className="w-28 h-28 object-contain" loading="lazy" />
        ) : null;

      case 'VIDEO':
        return url ? (
          <video
            controls
            playsInline
            className="rounded-lg max-w-full max-h-48"
            preload="auto"
            src={url}
          />
        ) : null;

      case 'AUDIO':
        return url ? <AudioPlayer src={url} isOutgoing={msg.direction === 'OUTGOING'} /> : null;

      case 'DOCUMENT':
        return (
          <a
            href={url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <svg className="w-8 h-8 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <div className="min-w-0">
              <div className="text-xs font-medium truncate">{msg.mediaFileName || t('crm.document')}</div>
              {msg.mediaMimeType && <div className="text-[10px] text-gray-400 uppercase">{msg.mediaMimeType.split('/')[1]}</div>}
            </div>
          </a>
        );

      case 'LOCATION':
        return (
          <div className="flex items-center gap-1.5 text-xs">
            <svg className="w-4 h-4 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
            <span>{msg.body || t('crm.location')}</span>
          </div>
        );

      case 'CONTACT':
        return (
          <div className="flex items-center gap-1.5 text-xs">
            <svg className="w-4 h-4 text-blue-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
            <span className="whitespace-pre-wrap">{msg.body || t('crm.contact')}</span>
          </div>
        );

      case 'REACTION':
        return <span className="text-2xl">{msg.body}</span>;

      default:
        return null;
    }
  };

  if (!leadPhone && !parentPhone) {
    return null;
  }

  // Group messages by date
  const groupedMessages: { date: string; messages: WAMessage[] }[] = [];
  let currentDate = '';
  for (const msg of messages) {
    const date = formatDate(msg.createdAt);
    if (date !== currentDate) {
      currentDate = date;
      groupedMessages.push({ date, messages: [msg] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  }

  const isSticker = (msg: WAMessage) => msg.type === 'STICKER';
  const isReaction = (msg: WAMessage) => msg.type === 'REACTION';
  const hasMediaContent = (msg: WAMessage) => ['IMAGE', 'STICKER', 'VIDEO', 'AUDIO', 'DOCUMENT'].includes(msg.type) && msg.mediaUrl;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-[#222e35] flex items-center gap-2 bg-white dark:bg-[#202c33]">
        <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{t('crm.whatsappChat')}</h4>
        {conversations.length > 1 && (
          <div className="flex gap-1">
            {conversations.map(c => (
              <button
                key={c.id}
                onClick={() => { setActiveConversation(c); setIsBlocked(!!c.isBlocked); }}
                className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                  activeConversation?.id === c.id
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}
              >
                {c.contactPhone}
              </button>
            ))}
          </div>
        )}
        {activeConversation && (
          <button
            onClick={() => setShowBlockConfirm(true)}
            className={`ml-auto p-1.5 rounded-lg transition-colors ${
              isBlocked
                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                : 'text-gray-400 dark:text-[#8696a0] hover:bg-gray-100 dark:hover:bg-[#2a3942]'
            }`}
            title={isBlocked ? 'Разблокировать' : 'Заблокировать'}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {isBlocked ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              )}
            </svg>
          </button>
        )}
      </div>

      {/* Messages area */}
      {loading ? (
        <div className="h-64 flex items-center justify-center text-sm text-gray-400">
          <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : !activeConversation ? (
        <div className="flex flex-col">
          {/* Phone selector for initiating */}
          {(leadPhone || parentPhone) && (
            <div className="px-4 py-3 space-y-2">
              <p className="text-xs text-gray-500 dark:text-[#8696a0] text-center">{t('crm.startConversation') || 'Начать переписку'}</p>
              <div className="flex gap-2 justify-center">
                {leadPhone && (
                  <button
                    onClick={() => setInitPhone(leadPhone)}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                      initPhone === leadPhone
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 ring-1 ring-green-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {leadPhone}
                  </button>
                )}
                {parentPhone && parentPhone !== leadPhone && (
                  <button
                    onClick={() => setInitPhone(parentPhone)}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                      initPhone === parentPhone
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 ring-1 ring-green-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {parentPhone} ({t('crm.parentPhone') || 'родитель'})
                  </button>
                )}
              </div>
              {initError && (
                <p className="text-xs text-red-500 text-center">{initError}</p>
              )}
            </div>
          )}

          {/* Template selection and send for first message */}
          {initPhone ? (
            <div className="px-3 py-3 border-t border-gray-200 dark:border-[#222e35] bg-white dark:bg-[#202c33] space-y-3">
              {/* Info about template requirement */}
              <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {t('crm.templateRequired') || 'Для начала диалога требуется шаблонное сообщение. После ответа клиента можно отправлять обычные сообщения.'}
                </p>
              </div>

              {/* Template selector */}
              {templatesLoading ? (
                <div className="flex items-center justify-center py-2">
                  <svg className="w-5 h-5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="ml-2 text-xs text-gray-500">{t('crm.loadingTemplates') || 'Загрузка шаблонов...'}</span>
                </div>
              ) : templates.length > 0 ? (
                <div className="space-y-2">
                  <label className="block text-xs text-gray-500 dark:text-[#8696a0]">
                    {t('crm.selectTemplate') || 'Выберите шаблон:'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {templates.map(tmpl => (
                      <button
                        key={`${tmpl.name}-${tmpl.language}`}
                        onClick={() => setSelectedTemplate(tmpl.name)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          selectedTemplate === tmpl.name
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 ring-1 ring-green-400'
                            : 'bg-gray-100 dark:bg-[#2a3942] text-gray-600 dark:text-[#8696a0] hover:bg-gray-200 dark:hover:bg-[#374045]'
                        }`}
                      >
                        {tmpl.name}
                        <span className="ml-1 opacity-60">({tmpl.language})</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-2">
                  <p className="text-xs text-gray-500 dark:text-[#8696a0]">
                    {t('crm.noTemplates') || 'Нет доступных шаблонов. Создайте шаблон в Meta Business Suite.'}
                  </p>
                </div>
              )}

              {/* Send button */}
              <button
                onClick={async () => {
                  if (!selectedTemplate || sending) return;
                  setSending(true);
                  setInitError(null);
                  const template = templates.find(t => t.name === selectedTemplate);
                  try {
                    const res = await fetch('/api/whatsapp/send-template', {
                      method: 'POST',
                      cache: 'no-store',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        phone: initPhone,
                        templateName: selectedTemplate,
                        languageCode: template?.language || (leadLanguage === 'RU' ? 'ru' : leadLanguage === 'EN' ? 'en' : 'kk'),
                        leadId,
                        contactName: leadName,
                      }),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      setConversations([data.conversation]);
                      setActiveConversation(data.conversation);
                      setMessages([data.message]);
                      setInitPhone(null);
                    } else {
                      const err = await res.json();
                      setInitError(err.error || 'Ошибка отправки');
                    }
                  } catch {
                    setInitError('Ошибка сети');
                  }
                  setSending(false);
                }}
                disabled={!selectedTemplate || sending}
                className="w-full py-2.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>{t('crm.sending') || 'Отправка...'}</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                    <span>{t('crm.sendTemplate') || 'Отправить шаблон'}</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="h-24 flex flex-col items-center justify-center text-xs text-gray-400 dark:text-[#8696a0] px-4 text-center">
              <svg className="w-8 h-8 mb-1 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {t('crm.selectPhoneToStart') || 'Выберите номер для начала переписки'}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Chat messages */}
          <div
            ref={messagesContainerRef}
            className="h-80 overflow-y-auto px-3 py-2 space-y-1 bg-[#efeae2] dark:bg-[#0b141a] relative"
            onScroll={handleMessagesScroll}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Drag overlay */}
            {isDragOver && (
              <div className="absolute inset-0 bg-green-500/10 border-2 border-dashed border-green-500 z-10 flex items-center justify-center backdrop-blur-sm">
                <div className="text-center">
                  <svg className="w-10 h-10 mx-auto text-green-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">Перетащите файлы сюда</p>
                </div>
              </div>
            )}
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-400 dark:text-[#8696a0]">
                {t('crm.noMessages')}
              </div>
            ) : (
              <>
                {loadingMore && (
                  <div className="flex justify-center py-3">
                    <svg className="w-5 h-5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                )}
                {groupedMessages.map((group, gi) => (
                <div key={gi}>
                  <div className="flex justify-center my-2">
                    <span className="text-[10px] bg-white/90 dark:bg-[#182229]/90 text-gray-500 dark:text-[#8696a0] px-3 py-0.5 rounded-lg shadow-sm">
                      {group.date}
                    </span>
                  </div>
                  {group.messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex mb-1 ${msg.direction === 'OUTGOING' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl text-sm relative ${
                          isSticker(msg) || isReaction(msg)
                            ? ''
                            : msg.direction === 'OUTGOING'
                              ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-gray-900 dark:text-[#e9edef] rounded-br-md'
                              : 'bg-white dark:bg-[#202c33] text-gray-900 dark:text-[#e9edef] rounded-bl-md shadow-sm'
                        } ${isSticker(msg) || isReaction(msg) ? '' : 'px-3 py-1.5'}`}
                      >
                        {/* Sender name for outgoing */}
                        {msg.direction === 'OUTGOING' && msg.sentBy && !isSticker(msg) && !isReaction(msg) && (
                          <div className="text-[11px] font-bold text-green-700 dark:text-[#06cf9c] mb-0.5">
                            {msg.sentBy.lastName} {msg.sentBy.firstName}
                          </div>
                        )}

                        {/* Media content */}
                        {hasMediaContent(msg) && (
                          <div className="mb-1">{renderMedia(msg)}</div>
                        )}

                        {/* Sticker/reaction without media URL — show as placeholder */}
                        {(isSticker(msg) || isReaction(msg)) && !msg.mediaUrl && renderMedia(msg)}

                        {/* Location/contact without mediaUrl */}
                        {(msg.type === 'LOCATION' || msg.type === 'CONTACT') && renderMedia(msg)}

                        {/* Text body (skip if it's a sticker or reaction with no text) */}
                        {msg.body && !isSticker(msg) && !isReaction(msg) && msg.type !== 'LOCATION' && msg.type !== 'CONTACT' && (
                          <span className="whitespace-pre-wrap break-words">{msg.body}</span>
                        )}

                        {/* Media caption */}
                        {msg.mediaCaption && msg.mediaCaption !== msg.body && (
                          <p className="text-xs mt-1 opacity-80">{msg.mediaCaption}</p>
                        )}

                        {/* Time & status */}
                        {!isSticker(msg) && !isReaction(msg) && (
                          <div className={`flex items-center gap-1 mt-0.5 ${msg.direction === 'OUTGOING' ? 'justify-end' : 'justify-start'}`}>
                            {msg._failed && (
                              <div className="flex items-center gap-1.5 mr-1">
                                <button
                                  onClick={() => retryAudio(msg.id)}
                                  className="text-[10px] text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 font-medium hover:underline"
                                >
                                  Повторить
                                </button>
                                <button
                                  onClick={() => dismissFailedAudio(msg.id)}
                                  className="text-[10px] text-gray-400 hover:text-gray-500 dark:text-[#8696a0]"
                                >
                                  ✕
                                </button>
                              </div>
                            )}
                            <span className="text-[10px] text-gray-400 dark:text-[#8696a0]">
                              {formatTime(msg.createdAt)}
                            </span>
                            {msg.direction === 'OUTGOING' && statusIcon(msg.status)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Session expired banner with template option */}
          {sessionExpired && !showTemplateMode && (
            <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800/30">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-xs text-amber-700 dark:text-amber-300">{t('crm.sessionExpired')}</p>
                  <button
                    onClick={() => setShowTemplateMode(true)}
                    className="mt-1.5 text-xs font-medium text-green-600 dark:text-green-400 hover:underline"
                  >
                    {t('crm.sendTemplate')} →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Template mode for expired session */}
          {sessionExpired && showTemplateMode && (
            <div className="px-3 py-3 border-t border-gray-200 dark:border-[#222e35] bg-white dark:bg-[#202c33] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-[#8696a0]">{t('crm.selectTemplate')}</span>
                <button
                  onClick={() => setShowTemplateMode(false)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              {templatesLoading ? (
                <div className="flex items-center justify-center py-2">
                  <svg className="w-5 h-5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : templates.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {templates.map(tmpl => (
                    <button
                      key={`${tmpl.name}-${tmpl.language}`}
                      onClick={() => setSelectedTemplate(tmpl.name)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        selectedTemplate === tmpl.name
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 ring-1 ring-green-400'
                          : 'bg-gray-100 dark:bg-[#2a3942] text-gray-600 dark:text-[#8696a0] hover:bg-gray-200 dark:hover:bg-[#374045]'
                      }`}
                    >
                      {tmpl.name}
                      <span className="ml-1 opacity-60">({tmpl.language})</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 dark:text-[#8696a0] text-center py-2">{t('crm.noTemplates')}</p>
              )}
              <button
                onClick={async () => {
                  if (!selectedTemplate || !activeConversation || sending) return;
                  setSending(true);
                  const template = templates.find(t => t.name === selectedTemplate);
                  try {
                    const res = await fetch('/api/whatsapp/send-template', {
                      method: 'POST',
                      cache: 'no-store',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        phone: activeConversation.contactPhone,
                        templateName: selectedTemplate,
                        languageCode: template?.language || (leadLanguage === 'RU' ? 'ru' : leadLanguage === 'EN' ? 'en' : 'kk'),
                        leadId,
                        contactName: leadName,
                      }),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      setMessages(prev => [...prev, data.message]);
                      setShowTemplateMode(false);
                      setSessionExpired(false);
                      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                    }
                  } catch { /* ignore */ }
                  setSending(false);
                }}
                disabled={!selectedTemplate || sending}
                className="w-full py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {sending ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                )}
                <span>{t('crm.sendTemplate')}</span>
              </button>
            </div>
          )}

          {/* Pending files preview */}
          {pendingFiles.length > 0 && !showTemplateMode && (
            <div className="px-3 py-2 bg-gray-50 dark:bg-[#1a2429] border-t border-gray-200 dark:border-[#222e35]">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {pendingFiles.map((file, i) => {
                  const icon = getFileIcon(file);
                  const preview = getFilePreview(file);
                  return (
                    <div key={`${file.name}-${i}`} className="relative shrink-0 group">
                      {preview ? (
                        <img src={preview} alt={file.name} className="w-16 h-16 rounded-lg object-cover border border-gray-200 dark:border-[#374045]" />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-gray-200 dark:bg-[#374045] flex flex-col items-center justify-center p-1">
                          {icon === 'video' && (
                            <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z" /></svg>
                          )}
                          {icon === 'audio' && (
                            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" /></svg>
                          )}
                          {icon === 'document' && (
                            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                          )}
                          <span className="text-[8px] text-gray-500 dark:text-[#8696a0] mt-0.5 max-w-[56px] truncate text-center leading-tight">{file.name}</span>
                        </div>
                      )}
                      <button
                        onClick={() => removePendingFile(i)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  );
                })}
                {/* Add more button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 dark:border-[#374045] flex items-center justify-center shrink-0 hover:border-green-400 transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                </button>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-gray-400 dark:text-[#8696a0]">
                  {pendingFiles.length} {pendingFiles.length === 1 ? 'файл' : 'файлов'}
                </span>
                <button onClick={() => setPendingFiles([])} className="text-[10px] text-red-400 hover:text-red-500">
                  Очистить все
                </button>
              </div>
            </div>
          )}

          {/* Input bar */}
          {!showTemplateMode && (
          <div className="px-3 py-2 border-t border-gray-200 dark:border-[#222e35] flex items-center gap-2 bg-white dark:bg-[#202c33]">
            {recording ? (
              <>
                {/* Cancel recording */}
                <button
                  onClick={cancelRecording}
                  className="p-2 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                {/* Recording indicator */}
                <div className="flex-1 flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm text-red-500 font-medium tabular-nums">
                    {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                  </span>
                  <div className="flex-1 flex items-center gap-[2px]">
                    {Array.from({ length: 24 }, (_, i) => (
                      <div
                        key={i}
                        className="w-[3px] rounded-full bg-red-400/60"
                        style={{ height: `${4 + Math.random() * 14}px`, animation: 'pulse 0.5s ease-in-out infinite', animationDelay: `${i * 0.05}s` }}
                      />
                    ))}
                  </div>
                </div>
                {/* Send recording */}
                <button
                  onClick={stopRecording}
                  className="p-2 rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors shrink-0"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </>
            ) : (
              <>
                {/* Attach button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="p-2 rounded-full text-gray-500 dark:text-[#8696a0] hover:bg-gray-100 dark:hover:bg-[#2a3942] transition-colors disabled:opacity-40 shrink-0"
                  title={t('crm.document')}
                >
                  {uploading ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar"
                  multiple
                  onChange={handleFileSelect}
                />

                {/* Location button */}
                <button
                  onClick={openLocationModal}
                  className="p-2 rounded-full text-gray-500 dark:text-[#8696a0] hover:bg-gray-100 dark:hover:bg-[#2a3942] transition-colors shrink-0"
                  title={t('crm.sendLocation')}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>

                {/* Text input */}
                <textarea
                  ref={inputRef}
                  value={text}
                  onChange={e => {
                    setText(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={pendingFiles.length > 0 ? 'Добавить подпись...' : t('crm.typeMessage')}
                  disabled={sending}
                  rows={1}
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-[#2a3942] border-0 rounded-2xl text-sm text-gray-900 dark:text-[#e9edef] placeholder-gray-400 dark:placeholder-[#8696a0] focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 resize-none overflow-y-auto"
                  style={{ maxHeight: '120px' }}
                />

                {/* Send or Mic button */}
                {text.trim() || pendingFiles.length > 0 ? (
                  <button
                    onClick={handleSend}
                    disabled={sending}
                    className="p-2 rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    {sending ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                      </svg>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={startRecording}
                    disabled={sending}
                    className="p-2 rounded-full text-gray-500 dark:text-[#8696a0] hover:bg-gray-100 dark:hover:bg-[#2a3942] transition-colors disabled:opacity-40 shrink-0"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                    </svg>
                  </button>
                )}
              </>
            )}
          </div>
          )}
        </>
      )}

      {/* Location modal */}
      {showLocationModal && (() => {
        const lat = parseFloat(locationLat);
        const lng = parseFloat(locationLng);
        const hasValidCoords = !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
        const mapUrl = hasValidCoords
          ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.005},${lat - 0.005},${lng + 0.005},${lat + 0.005}&layer=mapnik&marker=${lat},${lng}`
          : null;
        return (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowLocationModal(false)}>
            <div className="bg-white dark:bg-[#1f2c34] rounded-xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#2a3942]">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-[#e9edef]">{t('crm.sendLocation')}</h3>
                <button onClick={() => setShowLocationModal(false)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-[#2a3942] text-gray-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-4 space-y-3">
                {/* My location button */}
                <button
                  onClick={() => { setSelectedBranchId(null); setLocationName(''); detectMyLocation(); }}
                  disabled={geoLoading}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedBranchId === null
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 ring-1 ring-green-400'
                      : 'bg-gray-100 dark:bg-[#2a3942] text-gray-700 dark:text-[#e9edef] hover:bg-gray-200 dark:hover:bg-[#374045]'
                  } disabled:opacity-50`}
                >
                  {geoLoading ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                  {t('crm.detectLocation')}
                </button>

                {/* Branch presets */}
                {branches.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-[#8696a0] mb-2">{t('crm.orSelectBranch')}</p>
                    <div className="flex flex-wrap gap-2">
                      {branches.map(branch => (
                        <button
                          key={branch.id}
                          onClick={() => {
                            setSelectedBranchId(branch.id);
                            if (branch.latitude && branch.longitude) {
                              setLocationLat(String(branch.latitude));
                              setLocationLng(String(branch.longitude));
                            }
                            setLocationName(getBranchLabel(branch));
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            selectedBranchId === branch.id
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 ring-1 ring-green-400'
                              : 'bg-gray-100 dark:bg-[#2a3942] text-gray-600 dark:text-[#8696a0] hover:bg-gray-200 dark:hover:bg-[#374045]'
                          }`}
                        >
                          {getBranchLabel(branch)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Map preview */}
                {mapUrl && (
                  <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-[#2a3942] location-map-wrap">
                    <iframe
                      key={`${lat.toFixed(4)}-${lng.toFixed(4)}`}
                      src={mapUrl}
                      className="w-full h-44"
                      style={{ border: 0 }}
                      loading="lazy"
                    />
                    <style>{`.dark .location-map-wrap iframe { filter: invert(1) hue-rotate(180deg) brightness(0.9) contrast(0.9); }`}</style>
                  </div>
                )}

                {/* Location name */}
                <div>
                  <label className="block text-xs text-gray-500 dark:text-[#8696a0] mb-1">{t('crm.locationName')}</label>
                  <input
                    type="text"
                    value={locationName}
                    onChange={e => setLocationName(e.target.value)}
                    placeholder="Ertis Academy"
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-[#2a3942] rounded-lg text-sm text-gray-900 dark:text-[#e9edef] focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <button
                  onClick={handleSendLocation}
                  disabled={!locationLat || !locationLng || sendingLocation}
                  className="w-full py-2.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sendingLocation ? t('crm.sending') : t('crm.send')}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Block/Unblock confirmation modal */}
      {showBlockConfirm && activeConversation && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowBlockConfirm(false)}>
          <div className="bg-white dark:bg-[#1f2c34] rounded-2xl p-6 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2.5 rounded-full ${isBlocked ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                <svg className={`w-5 h-5 ${isBlocked ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {isBlocked ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  )}
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isBlocked ? 'Разблокировать контакт?' : 'Заблокировать контакт?'}
              </h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {isBlocked
                ? 'Контакт сможет снова отправлять сообщения в этот чат.'
                : 'Входящие сообщения от этого контакта будут заблокированы. Вы сможете разблокировать позже.'}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowBlockConfirm(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-[#2a3942] text-gray-700 dark:text-gray-200 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-[#374045] transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={async () => {
                  const newBlocked = !isBlocked;
                  try {
                    const res = await fetch(`/api/whatsapp/conversations/${activeConversation.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ isBlocked: newBlocked }),
                    });
                    if (res.ok) {
                      setIsBlocked(newBlocked);
                      setConversations(prev => prev.map(c => c.id === activeConversation.id ? { ...c, isBlocked: newBlocked } : c));
                    }
                  } catch { /* ignore */ }
                  setShowBlockConfirm(false);
                }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isBlocked
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {isBlocked ? 'Разблокировать' : 'Заблокировать'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center cursor-pointer"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
            onClick={() => setLightboxUrl(null)}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={lightboxUrl}
            alt=""
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
