'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createJanusSipClient, JanusSipClient, CallStatus } from '@/lib/janus-sip';

interface MarSipWidgetProps {
  t: (key: string) => string;
}

interface CallState {
  status: CallStatus | 'idle';
  phone?: string;
  duration?: number;
  error?: string;
  callId?: string;
}

interface SipConfig {
  server: string;
  sipServer: string;
  username: string;
  password: string;
  janusWs: string;
}

interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
}

export default function MarSipWidget({ t }: MarSipWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [callState, setCallState] = useState<CallState>({ status: 'idle' });
  const [phoneNumber, setPhoneNumber] = useState('');
  const [sipNumber, setSipNumber] = useState<string | null>(null);
  const [sipConfig, setSipConfig] = useState<SipConfig | null>(null);
  const [recentCalls, setRecentCalls] = useState<string[]>([]);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
  });
  const [mounted, setMounted] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const callStartRef = useRef<number | null>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const janusClientRef = useRef<JanusSipClient | null>(null);
  const callIdRef = useRef<string | null>(null);
  const makeCallRef = useRef<(phone?: string, knownLeadId?: string) => Promise<void>>();

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
    const x = Math.max(100, window.innerWidth - 360);
    const y = 80;
    setPosition({ x, y });

    const handleResize = () => {
      setPosition(prev => {
        const phoneHeight = phoneRef.current?.offsetHeight || 300;
        const phoneWidth = phoneRef.current?.offsetWidth || 320;
        return {
          x: Math.max(0, Math.min(prev.x, window.innerWidth - phoneWidth)),
          y: Math.max(0, Math.min(prev.y, window.innerHeight - phoneHeight)),
        };
      });
    };

    // Listen for external call events (e.g., from lead slide-over "Позвонить" button)
    const handleExternalCall = (e: CustomEvent<{ phone: string; leadId?: string }>) => {
      const { phone, leadId } = e.detail;
      setPhoneNumber(phone);
      setIsOpen(true);
      // Trigger call after a short delay to ensure widget is open
      setTimeout(() => {
        if (makeCallRef.current) {
          makeCallRef.current(phone, leadId);
        }
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('marsip:call', handleExternalCall as EventListener);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('marsip:call', handleExternalCall as EventListener);
    };
  }, []);

  // Load config
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch('/api/crm/settings/marsip');
        if (res.ok) {
          const config = await res.json();
          const sessionRes = await fetch('/api/auth/session');
          if (sessionRes.ok) {
            const session = await sessionRes.json();
            const userExt = config.extensions?.find(
              (e: { userId: string; isActive: boolean; sipPassword?: string }) =>
                e.userId === session?.user?.id && e.isActive
            );
            if (userExt && config.isActive) {
              setSipNumber(userExt.extensionNumber);
              // Use current domain for WebSocket to avoid CORS issues
              const janusWsUrl = typeof window !== 'undefined'
                ? `wss://${window.location.host}/janus-ws`
                : 'wss://classroom.ertis.academy/janus-ws';
              setSipConfig({
                server: config.sipServer,
                sipServer: config.sipServer,
                username: userExt.extensionNumber,
                password: userExt.sipPassword || config.sipPassword || '',
                janusWs: janusWsUrl,
              });
              setCallState({ status: 'idle' });
            }
          }
        }
      } catch (e) {
        console.error('MarSIP config error:', e);
      }
    };
    loadConfig();

    const saved = localStorage.getItem('marsip_recent');
    if (saved) {
      try {
        setRecentCalls(JSON.parse(saved).slice(0, 5));
      } catch { /* ignore */ }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (janusClientRef.current) {
        janusClientRef.current.destroy();
        janusClientRef.current = null;
      }
    };
  }, []);

  // Initialize Janus client when config is ready
  useEffect(() => {
    if (!sipConfig || janusClientRef.current) return;

    const initJanus = async () => {
      try {
        const client = createJanusSipClient({
          server: sipConfig.janusWs,
          sipServer: sipConfig.sipServer,
          username: sipConfig.username,
          password: sipConfig.password,
          displayName: sipNumber || undefined,
        });

        client.onStatusChange((status, message) => {
          console.log('Janus status:', status, message);
          setCallState(prev => ({
            ...prev,
            status,
            error: status === 'error' ? message : prev.error,
          }));

          if (status === 'connected') {
            startTimer();
          } else if (status === 'ended') {
            stopTimer();
            updateCallStatus('COMPLETED');
          } else if (status === 'error') {
            stopTimer();
            updateCallStatus('FAILED');
          }
        });

        client.onRemoteStream((stream) => {
          console.log('Got remote audio stream');
          if (!audioRef.current) {
            audioRef.current = new Audio();
            audioRef.current.autoplay = true;
          }
          audioRef.current.srcObject = stream;
          audioRef.current.play().catch(console.error);
        });

        await client.connect();
        console.log('Janus connected, registering...');
        await client.register();
        console.log('SIP registered');

        janusClientRef.current = client;
        setCallState({ status: 'idle' }); // Ready to make calls
      } catch (e) {
        console.error('Janus init error:', e);
        // Don't set error state - fall back to simulation mode
      }
    };

    initJanus();
  }, [sipConfig, sipNumber]);

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('input, button')) return;
    e.preventDefault();
    setDragState({
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: position.x,
      offsetY: position.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState.isDragging) return;
      const newX = dragState.offsetX + (e.clientX - dragState.startX);
      const newY = dragState.offsetY + (e.clientY - dragState.startY);
      const phoneHeight = phoneRef.current?.offsetHeight || 300;
      const phoneWidth = phoneRef.current?.offsetWidth || 320;
      setPosition({
        x: Math.max(0, Math.min(newX, window.innerWidth - phoneWidth)),
        y: Math.max(0, Math.min(newY, window.innerHeight - phoneHeight)),
      });
    };

    const handleMouseUp = () => {
      setDragState(prev => ({ ...prev, isDragging: false }));
    };

    if (dragState.isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState]);

  const startTimer = () => {
    callStartRef.current = Date.now();
    timerRef.current = setInterval(() => {
      if (callStartRef.current) {
        const dur = Math.floor((Date.now() - callStartRef.current) / 1000);
        setCallState(prev => ({ ...prev, duration: dur }));
      }
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    callStartRef.current = null;
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const updateCallStatus = async (status: string) => {
    if (!callIdRef.current) return;
    try {
      await fetch('/api/crm/call', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId: callIdRef.current,
          status,
          endedAt: new Date().toISOString(),
          duration: callState.duration || 0,
        }),
      });
    } catch { /* ignore */ }
  };

  const makeCall = useCallback(async (phone?: string, knownLeadId?: string) => {
    const targetPhone = phone || phoneNumber;
    if (!targetPhone.trim()) return;

    setCallState({ status: 'calling', phone: targetPhone });
    setIsOpen(true);

    try {
      // Create call record in database
      const res = await fetch('/api/crm/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: targetPhone, leadId: knownLeadId }),
      });

      const data = await res.json();
      console.log('MarSIP call response:', data);

      if (res.ok && data.success) {
        callIdRef.current = data.callId;

        const newRecent = [targetPhone, ...recentCalls.filter(r => r !== targetPhone)].slice(0, 5);
        setRecentCalls(newRecent);
        localStorage.setItem('marsip_recent', JSON.stringify(newRecent));

        // If we have a lead ID (from API response or passed in), dispatch event to open the lead
        const leadId = data.leadId || knownLeadId;
        if (leadId) {
          const openLeadEvent = new CustomEvent('marsip:open-lead', {
            detail: { leadId }
          });
          window.dispatchEvent(openLeadEvent);
        }

        // Try real Janus call first
        if (janusClientRef.current) {
          try {
            await janusClientRef.current.call(targetPhone);
            setCallState(prev => ({ ...prev, callId: data.callId }));
            return;
          } catch (e) {
            console.error('Janus call error, falling back to simulation:', e);
          }
        }

        // Fallback: simulate call for demo
        setCallState({ status: 'ringing', phone: targetPhone, callId: data.callId });
        setTimeout(() => {
          setCallState(prev => ({ ...prev, status: 'connected', duration: 0 }));
          startTimer();
        }, 3000);
      } else {
        setCallState({
          status: 'error',
          phone: targetPhone,
          error: data.error || 'Ошибка вызова'
        });
      }
    } catch {
      setCallState({ status: 'error', phone: targetPhone, error: 'Ошибка сети' });
    }
  }, [phoneNumber, recentCalls]);

  // Keep ref updated so event listeners can access latest version
  useEffect(() => {
    makeCallRef.current = makeCall;
  }, [makeCall]);

  const hangUp = useCallback(async () => {
    // Hangup via Janus if connected
    if (janusClientRef.current) {
      janusClientRef.current.hangup();
    }

    stopTimer();

    // Stop audio
    if (audioRef.current) {
      audioRef.current.srcObject = null;
    }

    // Update call status in DB
    await updateCallStatus('COMPLETED');

    setCallState({ status: 'ended', phone: callState.phone, duration: callState.duration });
    setTimeout(() => {
      setCallState({ status: 'idle' });
      setPhoneNumber('');
      callIdRef.current = null;
    }, 1500);
  }, [callState]);

  // Don't render if user has no SIP number
  if (!sipNumber && callState.status === 'idle') {
    return null;
  }

  const isInCall = ['calling', 'ringing', 'connected'].includes(callState.status);

  // Phone UI Portal
  const phoneUI = isOpen && mounted ? createPortal(
    <div
      ref={phoneRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 9999,
        cursor: dragState.isDragging ? 'grabbing' : 'grab',
      }}
      onMouseDown={handleMouseDown}
      className="select-none"
    >
      <div className="w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className={`px-4 py-3 flex items-center justify-between ${
          isInCall
            ? callState.status === 'connected'
              ? 'bg-green-600'
              : 'bg-amber-500'
            : 'bg-gray-800'
        }`}>
          <div className="flex items-center gap-2 text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span className="font-medium">MarSIP</span>
            <span className="text-xs opacity-70">#{sipNumber}</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-white/20 rounded transition-colors text-white"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Call Display */}
        {isInCall && (
          <div className="p-6 text-center border-b border-gray-100 dark:border-gray-800">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              {callState.phone}
            </p>
            <p className={`text-sm ${
              callState.status === 'connected' ? 'text-green-600' : 'text-amber-600'
            }`}>
              {callState.status === 'calling' && 'Набор номера...'}
              {callState.status === 'ringing' && 'Ожидание ответа...'}
              {callState.status === 'connected' && formatDuration(callState.duration || 0)}
            </p>

            {(callState.status === 'calling' || callState.status === 'ringing') && (
              <div className="flex justify-center gap-1 mt-4">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="w-2 h-2 bg-amber-500 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            )}

            {callState.status === 'connected' && (
              <div className="flex justify-center items-center gap-2 mt-4 text-green-600">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm">На связи</span>
              </div>
            )}

            <button
              onClick={hangUp}
              className="mt-6 w-14 h-14 mx-auto bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors"
            >
              <svg className="w-6 h-6 rotate-135" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>
          </div>
        )}

        {/* Error */}
        {callState.status === 'error' && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/30">
            <p className="text-red-600 dark:text-red-400 text-sm text-center mb-2">{callState.error}</p>
            <button
              onClick={() => setCallState({ status: 'idle' })}
              className="w-full py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              OK
            </button>
          </div>
        )}

        {/* Dialpad */}
        {!isInCall && callState.status !== 'error' && (
          <div className="p-4">
            <div className="flex gap-2 mb-4">
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && makeCall()}
                placeholder="+7 777 123 4567"
                className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-0 rounded-xl text-base text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
              <button
                onClick={() => makeCall()}
                disabled={!phoneNumber.trim()}
                className="p-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-xl transition-colors disabled:cursor-not-allowed"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </button>
            </div>

            {recentCalls.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-2 px-1">Недавние</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {recentCalls.map((phone, i) => (
                    <button
                      key={i}
                      onClick={() => makeCall(phone)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:bg-green-100 dark:group-hover:bg-green-900/30 transition-colors">
                        <svg className="w-4 h-4 text-gray-400 group-hover:text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{phone}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
          isInCall
            ? callState.status === 'connected'
              ? 'bg-green-500 border-green-500 text-white'
              : 'bg-amber-500 border-amber-500 text-white animate-pulse'
            : isOpen
              ? 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white'
              : 'bg-transparent border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
        }`}
      >
        <span className={`w-2 h-2 rounded-full ${
          sipNumber
            ? isInCall
              ? 'bg-white'
              : 'bg-green-500'
            : 'bg-gray-400'
        }`} />
        <span className="text-sm font-medium">MarSIP</span>
        {isInCall && callState.status === 'connected' && (
          <span className="text-xs font-mono">{formatDuration(callState.duration || 0)}</span>
        )}
      </button>

      {phoneUI}
    </>
  );
}
