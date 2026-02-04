'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface SipPhoneProps {
  onClose?: () => void;
}

interface CallState {
  status: 'idle' | 'connecting' | 'registered' | 'calling' | 'ringing' | 'incall' | 'error';
  error?: string;
  callerNumber?: string;
  callDuration?: number;
}

export default function SipPhone({ onClose }: SipPhoneProps) {
  const [callState, setCallState] = useState<CallState>({ status: 'idle' });
  const [phoneNumber, setPhoneNumber] = useState('');
  const [muted, setMuted] = useState(false);
  const [showDialpad, setShowDialpad] = useState(true);
  const [sipConfig, setSipConfig] = useState<{ sipNumber: string | null; isActive: boolean } | null>(null);

  // Draggable state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const callStartTimeRef = useRef<number | null>(null);

  // Load SIP config and user's extension
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch('/api/crm/settings/marsip');
        if (res.ok) {
          const config = await res.json();

          // Find current user's extension
          const userRes = await fetch('/api/auth/session');
          if (userRes.ok) {
            const session = await userRes.json();
            const userExtension = config.extensions?.find((e: any) => e.userId === session?.user?.id && e.isActive);

            setSipConfig({
              sipNumber: userExtension?.extensionNumber || null,
              isActive: config.isActive
            });

            if (userExtension && config.isActive) {
              setCallState({ status: 'registered' });
            } else if (!userExtension) {
              setCallState({ status: 'error', error: 'Нет назначенного номера' });
            } else {
              setCallState({ status: 'error', error: 'MarSIP неактивен' });
            }
          }
        }
      } catch (error) {
        console.error('Failed to load SIP config:', error);
        setCallState({ status: 'error', error: 'Ошибка загрузки' });
      }
    };
    loadConfig();

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, []);

  // Dragging handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select')) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPosition({
        x: dragStartRef.current.posX + dx,
        y: dragStartRef.current.posY + dy
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const startCallTimer = () => {
    callStartTimeRef.current = Date.now();
    callTimerRef.current = setInterval(() => {
      if (callStartTimeRef.current) {
        const duration = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
        setCallState(prev => ({ ...prev, callDuration: duration }));
      }
    }, 1000);
  };

  const makeCall = useCallback(async () => {
    if (!phoneNumber.trim() || callState.status === 'calling' || callState.status === 'incall') return;

    setCallState({ status: 'calling', callerNumber: phoneNumber });

    try {
      const res = await fetch('/api/crm/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber }),
      });

      const data = await res.json();

      if (res.ok) {
        // Call initiated - Sipuni will call our SIP phone first
        setCallState({ status: 'ringing', callerNumber: phoneNumber });

        // Simulate call connection after a delay (Sipuni callback)
        setTimeout(() => {
          setCallState({ status: 'incall', callerNumber: phoneNumber });
          startCallTimer();
        }, 3000);
      } else {
        setCallState({ status: 'error', error: data.error || 'Ошибка звонка' });
        setTimeout(() => setCallState({ status: 'registered' }), 3000);
      }
    } catch (error) {
      setCallState({ status: 'error', error: 'Ошибка сети' });
      setTimeout(() => setCallState({ status: 'registered' }), 3000);
    }
  }, [phoneNumber, callState.status]);

  const hangup = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    callStartTimeRef.current = null;
    setCallState({ status: 'registered' });
    setPhoneNumber('');
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPhoneDisplay = (phone: string) => {
    if (!phone) return '+7 XXX XXX XX XX';
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 0) return '+7 XXX XXX XX XX';

    let formatted = '+7 ';
    const digits = clean.startsWith('7') ? clean.slice(1) : clean;

    for (let i = 0; i < 10; i++) {
      if (i === 3 || i === 6) formatted += ' ';
      if (i === 8) formatted += ' ';
      formatted += digits[i] || 'X';
    }
    return formatted;
  };

  const dialpadNumbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

  const handleDialpadClick = (digit: string) => {
    if (callState.status === 'calling' || callState.status === 'incall') return;
    setPhoneNumber(prev => prev + digit);
  };

  const getStatusColor = () => {
    switch (callState.status) {
      case 'registered': return 'bg-green-500';
      case 'calling': return 'bg-yellow-500 animate-pulse';
      case 'ringing': return 'bg-blue-500 animate-pulse';
      case 'incall': return 'bg-green-500 animate-pulse';
      case 'error': return 'bg-red-500';
      default: return 'bg-yellow-500';
    }
  };

  const getStatusText = () => {
    switch (callState.status) {
      case 'idle': return 'Загрузка...';
      case 'connecting': return 'Подключение...';
      case 'registered': return `Готов (${sipConfig?.sipNumber || '—'})`;
      case 'calling': return 'Вызов...';
      case 'ringing': return 'Ожидание ответа...';
      case 'incall': return callState.callDuration !== undefined ? formatDuration(callState.callDuration) : 'Разговор';
      case 'error': return callState.error || 'Ошибка';
      default: return '—';
    }
  };

  return (
    <div
      ref={dragRef}
      onMouseDown={handleMouseDown}
      className="bg-gray-900 rounded-2xl shadow-2xl overflow-hidden w-80 select-none"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          <span className="font-semibold">SIP Phone</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
          <span className="text-xs opacity-90">{getStatusText()}</span>
        </div>
      </div>

      {/* Call Status Display */}
      {(callState.status === 'calling' || callState.status === 'ringing' || callState.status === 'incall') && (
        <div className="bg-gray-800 px-4 py-6 text-center border-b border-gray-700">
          <div className="relative inline-block">
            {/* Animated rings for calling/ringing */}
            {(callState.status === 'calling' || callState.status === 'ringing') && (
              <>
                <div className="absolute inset-0 w-20 h-20 mx-auto rounded-full border-2 border-blue-500 animate-ping opacity-30" />
                <div className="absolute inset-0 w-20 h-20 mx-auto rounded-full border-2 border-blue-400 animate-ping opacity-20" style={{ animationDelay: '0.5s' }} />
              </>
            )}
            {/* Avatar */}
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center text-2xl font-bold text-white ${
              callState.status === 'incall' ? 'bg-green-600' : 'bg-blue-600'
            }`}>
              {callState.callerNumber?.[0] || '?'}
            </div>
          </div>
          <p className="text-white font-medium mt-3">{callState.callerNumber}</p>
          <p className={`text-sm mt-1 ${
            callState.status === 'incall' ? 'text-green-400' : 'text-blue-400'
          }`}>
            {callState.status === 'calling' && 'Вызов...'}
            {callState.status === 'ringing' && 'Ожидание ответа...'}
            {callState.status === 'incall' && callState.callDuration !== undefined && formatDuration(callState.callDuration)}
          </p>

          {/* In-call controls */}
          {callState.status === 'incall' && (
            <div className="flex items-center justify-center gap-4 mt-4">
              <button
                onClick={() => setMuted(!muted)}
                className={`p-3 rounded-full transition-colors ${
                  muted ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {muted ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  )}
                </svg>
              </button>
              <button
                onClick={hangup}
                className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                </svg>
              </button>
              <button className="p-3 rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Phone number display */}
      {callState.status !== 'calling' && callState.status !== 'ringing' && callState.status !== 'incall' && (
        <div className="bg-gray-800 px-4 py-4 text-center border-b border-gray-700">
          <p className="text-2xl font-light text-gray-300 tracking-wider">
            {formatPhoneDisplay(phoneNumber)}
          </p>
        </div>
      )}

      {/* Dialpad */}
      {showDialpad && callState.status !== 'incall' && (
        <div className="p-4 bg-gray-900">
          <div className="grid grid-cols-3 gap-2">
            {dialpadNumbers.map((num) => (
              <button
                key={num}
                onClick={() => handleDialpadClick(num)}
                disabled={callState.status === 'calling' || callState.status === 'ringing'}
                className="py-4 text-xl font-medium text-white bg-gray-800 rounded-xl hover:bg-gray-700 active:bg-gray-600 transition-colors disabled:opacity-50"
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div className="p-4 bg-gray-900 border-t border-gray-800">
        <div className="flex items-center justify-center gap-4">
          {/* Toggle dialpad */}
          <button
            onClick={() => setShowDialpad(!showDialpad)}
            className={`p-3 rounded-full transition-colors ${
              showDialpad ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </button>

          {/* Call button */}
          {callState.status !== 'calling' && callState.status !== 'ringing' && callState.status !== 'incall' ? (
            <button
              onClick={makeCall}
              disabled={callState.status !== 'registered' || !phoneNumber.trim()}
              className="p-4 rounded-full bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>
          ) : (
            <button
              onClick={hangup}
              className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors shadow-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
              </svg>
            </button>
          )}

          {/* Backspace */}
          <button
            onClick={() => setPhoneNumber(prev => prev.slice(0, -1))}
            disabled={callState.status === 'calling' || callState.status === 'ringing' || callState.status === 'incall'}
            className="p-3 rounded-full bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1 text-white/60 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
