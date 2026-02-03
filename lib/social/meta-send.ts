import crypto from 'crypto';

const GRAPH_API = 'https://graph.facebook.com/v22.0';

type Platform = 'MESSENGER' | 'INSTAGRAM';

// ── Credentials ──

export function getAccessToken(platform: Platform): string {
  if (platform === 'MESSENGER') {
    return process.env.MESSENGER_PAGE_ACCESS_TOKEN || '';
  }
  return process.env.INSTAGRAM_PAGE_ACCESS_TOKEN || '';
}

export function getVerifyToken(platform: Platform): string {
  if (platform === 'MESSENGER') {
    return process.env.MESSENGER_VERIFY_TOKEN || 'ertis_messenger_verify_2024';
  }
  return process.env.INSTAGRAM_VERIFY_TOKEN || 'ertis_instagram_verify_2024';
}

// ── Webhook Signature Validation ──

export function validateWebhookSignature(rawBody: string, signature: string | null): boolean {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret || !signature) return false;

  const expected = 'sha256=' + crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

// ── Send Messages ──

export async function sendTextMessage(
  platform: Platform,
  recipientId: string,
  text: string,
): Promise<{ messageId: string }> {
  const token = getAccessToken(platform);

  const res = await fetch(`${GRAPH_API}/me/messages?access_token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      messaging_type: 'RESPONSE',
      message: { text },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to send message');
  }

  return { messageId: data.message_id };
}

export async function sendMediaMessage(
  platform: Platform,
  recipientId: string,
  type: 'image' | 'video' | 'audio' | 'file',
  url: string,
): Promise<{ messageId: string }> {
  const token = getAccessToken(platform);

  const res = await fetch(`${GRAPH_API}/me/messages?access_token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      messaging_type: 'RESPONSE',
      message: {
        attachment: {
          type,
          payload: { url, is_reusable: true },
        },
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to send media');
  }

  return { messageId: data.message_id };
}

// ── Mark as Seen ──

export async function markSeen(
  platform: Platform,
  recipientId: string,
): Promise<void> {
  const token = getAccessToken(platform);

  await fetch(`${GRAPH_API}/me/messages?access_token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      sender_action: 'mark_seen',
    }),
  });
}

// ── Get User Profile ──

export async function getUserProfile(
  platform: Platform,
  userId: string,
): Promise<{ name?: string; profilePic?: string; username?: string }> {
  const token = getAccessToken(platform);

  const fields = platform === 'INSTAGRAM'
    ? 'name,profile_pic,username'
    : 'first_name,last_name,profile_pic';

  try {
    const res = await fetch(`${GRAPH_API}/${userId}?fields=${fields}&access_token=${token}`);
    const data = await res.json();

    if (!res.ok) return {};

    if (platform === 'INSTAGRAM') {
      return {
        name: data.name || undefined,
        profilePic: data.profile_pic || undefined,
        username: data.username || undefined,
      };
    }

    const name = [data.first_name, data.last_name].filter(Boolean).join(' ') || undefined;
    return {
      name,
      profilePic: data.profile_pic || undefined,
    };
  } catch {
    return {};
  }
}

// ── Parse Webhook Payload ──

export interface WebhookMessageEvent {
  senderId: string;
  recipientId: string;
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    attachments?: Array<{
      type: 'image' | 'video' | 'audio' | 'file' | 'fallback';
      payload: { url?: string; sticker_id?: number };
    }>;
    is_echo?: boolean;
  };
  delivery?: { mids: string[] };
  read?: { watermark: number };
}

export function parseWebhookEntries(body: Record<string, unknown>): WebhookMessageEvent[] {
  const events: WebhookMessageEvent[] = [];
  const entries = (body.entry || []) as Array<{ messaging?: unknown[] }>;

  for (const entry of entries) {
    const messaging = (entry.messaging || []) as Array<{
      sender?: { id: string };
      recipient?: { id: string };
      timestamp?: number;
      message?: WebhookMessageEvent['message'];
      delivery?: WebhookMessageEvent['delivery'];
      read?: WebhookMessageEvent['read'];
    }>;

    for (const event of messaging) {
      events.push({
        senderId: event.sender?.id || '',
        recipientId: event.recipient?.id || '',
        timestamp: event.timestamp || Date.now(),
        message: event.message,
        delivery: event.delivery,
        read: event.read,
      });
    }
  }

  return events;
}

// ── Map attachment type to message type ──

export function attachmentToMessageType(
  attachmentType: string,
): 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'STICKER' | 'UNKNOWN' {
  switch (attachmentType) {
    case 'image': return 'IMAGE';
    case 'video': return 'VIDEO';
    case 'audio': return 'AUDIO';
    case 'file': return 'DOCUMENT';
    default: return 'UNKNOWN';
  }
}
