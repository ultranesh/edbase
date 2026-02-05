'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3003';

interface UseSocketOptions {
  autoConnect?: boolean;
}

// Singleton socket instance
let globalSocket: Socket | null = null;

function getSocket(): Socket {
  if (!globalSocket) {
    globalSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return globalSocket;
}

export function useSocket(options: UseSocketOptions = {}) {
  const { autoConnect = true } = options;
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (autoConnect) {
      socketRef.current = getSocket();

      if (!socketRef.current.connected) {
        socketRef.current.connect();
      }
    }

    return () => {
      // Don't disconnect on unmount - keep singleton alive
    };
  }, [autoConnect]);

  const joinCrm = useCallback(() => {
    const socket = getSocket();
    socket.emit('join:crm');
  }, []);

  const joinLead = useCallback((leadId: string) => {
    const socket = getSocket();
    socket.emit('join:lead', leadId);
  }, []);

  const leaveLead = useCallback((leadId: string) => {
    const socket = getSocket();
    socket.emit('leave:lead', leadId);
  }, []);

  const on = useCallback(<T = unknown>(event: string, callback: (data: T) => void) => {
    const socket = getSocket();
    socket.on(event, callback);
    return () => {
      socket.off(event, callback);
    };
  }, []);

  const off = useCallback((event: string, callback?: (...args: unknown[]) => void) => {
    const socket = getSocket();
    if (callback) {
      socket.off(event, callback);
    } else {
      socket.off(event);
    }
  }, []);

  return {
    socket: socketRef.current,
    joinCrm,
    joinLead,
    leaveLead,
    on,
    off,
    isConnected: socketRef.current?.connected ?? false,
  };
}

// Event types for type safety
export interface NewLeadEvent {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  source: string | null;
  stageId: string | null;
  funnelId: string | null;
}

export interface NewMessageEvent {
  leadId: string;
  conversationId: string;
  message: {
    id: string;
    body: string | null;
    type: string;
    direction: string;
  };
  unreadCount: number;
}

export interface LeadUpdatedEvent {
  id: string;
  stageId: string | null;
  funnelId: string | null;
}

// CRM-specific hook
export function useCrmSocket() {
  const { joinCrm, on, off } = useSocket();

  useEffect(() => {
    joinCrm();
  }, [joinCrm]);

  const onNewLead = useCallback((callback: (lead: NewLeadEvent) => void) => {
    return on('crm:new-lead', callback);
  }, [on]);

  const onNewMessage = useCallback((callback: (data: { leadId: string; unreadCount: number }) => void) => {
    return on('crm:new-message', callback);
  }, [on]);

  const onLeadUpdated = useCallback((callback: (lead: LeadUpdatedEvent) => void) => {
    return on('crm:lead-updated', callback);
  }, [on]);

  return {
    onNewLead,
    onNewMessage,
    onLeadUpdated,
  };
}

// Lead chat specific hook
export function useLeadSocket(leadId: string | null) {
  const { joinLead, leaveLead, on } = useSocket();

  useEffect(() => {
    if (leadId) {
      joinLead(leadId);
      return () => {
        leaveLead(leadId);
      };
    }
  }, [leadId, joinLead, leaveLead]);

  const onNewMessage = useCallback((callback: (data: NewMessageEvent) => void) => {
    return on('lead:new-message', callback);
  }, [on]);

  return {
    onNewMessage,
  };
}
