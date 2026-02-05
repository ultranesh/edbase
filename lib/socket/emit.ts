import { io as ioClient } from 'socket.io-client';

const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:3003';

let socket: ReturnType<typeof ioClient> | null = null;

function getSocket() {
  if (!socket) {
    socket = ioClient(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
    });
  }
  return socket;
}

// Emit events to connected clients
export function emitNewLead(lead: {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  source: string | null;
  stageId: string | null;
  funnelId: string | null;
}) {
  try {
    const s = getSocket();
    s.emit('crm:new-lead', lead);
    console.log('[Socket.io] Emitted new lead:', lead.id);
  } catch (error) {
    console.error('[Socket.io] Failed to emit new lead:', error);
  }
}

export function emitNewMessage(data: {
  leadId: string;
  conversationId: string;
  message: {
    id: string;
    body: string | null;
    type: string;
    direction: string;
  };
  unreadCount: number;
}) {
  try {
    const s = getSocket();
    // Emit to CRM room for unread badge update
    s.emit('crm:new-message', {
      leadId: data.leadId,
      unreadCount: data.unreadCount,
    });
    // Emit to specific lead room for chat update
    s.emit('lead:new-message', data);
    console.log('[Socket.io] Emitted new message for lead:', data.leadId);
  } catch (error) {
    console.error('[Socket.io] Failed to emit new message:', error);
  }
}

export function emitLeadUpdated(lead: {
  id: string;
  stageId: string | null;
  funnelId: string | null;
}) {
  try {
    const s = getSocket();
    s.emit('crm:lead-updated', lead);
    console.log('[Socket.io] Emitted lead updated:', lead.id);
  } catch (error) {
    console.error('[Socket.io] Failed to emit lead updated:', error);
  }
}
