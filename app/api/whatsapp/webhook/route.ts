import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emitNewLead, emitNewMessage } from '@/lib/socket/emit';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'ertis_whatsapp_verify_2024';
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;

// GET — Webhook verification (Meta sends this when you register the webhook)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[WhatsApp Webhook] Verified successfully');
    return new Response(challenge, { status: 200 });
  }

  console.warn('[WhatsApp Webhook] Verification failed', { mode, token });
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// POST — Incoming messages & status updates from Meta
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Meta always sends this structure
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value) {
      return NextResponse.json({ status: 'ok' });
    }

    // Handle status updates (sent, delivered, read)
    if (value.statuses) {
      for (const status of value.statuses) {
        await handleStatusUpdate(status);
      }
    }

    // Handle incoming messages
    if (value.messages) {
      for (const message of value.messages) {
        const contact = value.contacts?.find(
          (c: { wa_id: string }) => c.wa_id === message.from
        );
        await handleIncomingMessage(message, contact);
      }
    }

    // Meta requires 200 response within 20 seconds
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('[WhatsApp Webhook] Error:', error);
    // Still return 200 to avoid Meta retries
    return NextResponse.json({ status: 'ok' });
  }
}

async function handleStatusUpdate(status: {
  id: string;
  status: string;
  timestamp: string;
  recipient_id: string;
}) {
  try {
    const statusMap: Record<string, string> = {
      sent: 'SENT',
      delivered: 'DELIVERED',
      read: 'READ',
      failed: 'FAILED',
    };

    const newStatus = statusMap[status.status];
    if (!newStatus) return;

    await prisma.whatsAppMessage.updateMany({
      where: { waMessageId: status.id },
      data: { status: newStatus as 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' },
    });
  } catch (error) {
    console.error('[WhatsApp] Status update error:', error);
  }
}

async function handleIncomingMessage(
  message: {
    id: string;
    from: string;
    timestamp: string;
    type: string;
    text?: { body: string };
    image?: { id: string; mime_type: string; caption?: string };
    audio?: { id: string; mime_type: string };
    video?: { id: string; mime_type: string; caption?: string };
    document?: { id: string; mime_type: string; filename?: string; caption?: string };
    sticker?: { id: string; mime_type: string };
    location?: { latitude: number; longitude: number; name?: string; address?: string };
    contacts?: Array<{ name: { formatted_name: string }; phones: Array<{ phone: string }> }>;
    reaction?: { message_id: string; emoji: string };
    context?: { id: string; from?: string }; // Reply/quote context
  },
  contact?: { wa_id: string; profile?: { name?: string } }
) {
  try {
    const waId = message.from; // e.g. "77007501414"
    const contactName = contact?.profile?.name || null;
    const contactPhone = '+' + waId;

    // Find or create conversation
    let conversation = await prisma.whatsAppConversation.findUnique({
      where: { waId },
    });

    if (!conversation) {
      // Try to auto-link to CrmLead by phone
      const lead = await findLeadByPhone(waId);

      conversation = await prisma.whatsAppConversation.create({
        data: {
          waId,
          contactName,
          contactPhone,
          leadId: lead?.id || null,
          lastMessageAt: new Date(),
          unreadCount: 1,
        },
      });
    } else {
      await prisma.whatsAppConversation.update({
        where: { id: conversation.id },
        data: {
          contactName: contactName || conversation.contactName,
          lastMessageAt: new Date(),
          unreadCount: { increment: 1 },
        },
      });
    }

    // Determine message type and content
    const typeMap: Record<string, string> = {
      text: 'TEXT',
      image: 'IMAGE',
      audio: 'AUDIO',
      video: 'VIDEO',
      document: 'DOCUMENT',
      sticker: 'STICKER',
      location: 'LOCATION',
      contacts: 'CONTACT',
      reaction: 'REACTION',
    };

    const msgType = typeMap[message.type] || 'UNKNOWN';
    let body: string | null = null;
    let mediaUrl: string | null = null;
    let mediaCaption: string | null = null;
    let mediaMimeType: string | null = null;
    let mediaFileName: string | null = null;

    // Log unknown message types for debugging
    if (!typeMap[message.type]) {
      console.log('[WhatsApp] Unknown message type:', message.type, JSON.stringify(message).slice(0, 500));
    }

    switch (message.type) {
      case 'text':
        body = message.text?.body || null;
        break;
      case 'image':
        mediaMimeType = message.image?.mime_type || null;
        mediaCaption = message.image?.caption || null;
        if (message.image?.id) mediaUrl = await getMediaUrl(message.image.id);
        break;
      case 'audio':
        mediaMimeType = message.audio?.mime_type || null;
        if (message.audio?.id) mediaUrl = await getMediaUrl(message.audio.id);
        break;
      case 'video':
        mediaMimeType = message.video?.mime_type || null;
        mediaCaption = message.video?.caption || null;
        if (message.video?.id) mediaUrl = await getMediaUrl(message.video.id);
        break;
      case 'document':
        mediaMimeType = message.document?.mime_type || null;
        mediaFileName = message.document?.filename || null;
        mediaCaption = message.document?.caption || null;
        if (message.document?.id) mediaUrl = await getMediaUrl(message.document.id);
        break;
      case 'sticker':
        mediaMimeType = message.sticker?.mime_type || null;
        if (message.sticker?.id) mediaUrl = await getMediaUrl(message.sticker.id);
        break;
      case 'location':
        body = message.location
          ? `${message.location.latitude},${message.location.longitude}${message.location.name ? ' — ' + message.location.name : ''}`
          : null;
        break;
      case 'contacts':
        body = message.contacts
          ? message.contacts.map(c => `${c.name.formatted_name}: ${c.phones?.[0]?.phone || ''}`).join('\n')
          : null;
        break;
      case 'reaction':
        body = message.reaction?.emoji || null;
        break;
      default: {
        // Handle unsupported types from WhatsApp Cloud API
        const unsupported = (message as Record<string, unknown>).unsupported as { type?: string } | undefined;
        if (unsupported?.type === 'video_note') {
          // Video circles (кругляшки) — Cloud API doesn't provide the media
          body = '🔵 Видеокружок';
        } else if ((message as Record<string, unknown>).video) {
          const vid = (message as Record<string, unknown>).video as { id?: string; mime_type?: string; caption?: string };
          mediaMimeType = vid.mime_type || null;
          mediaCaption = vid.caption || null;
          if (vid.id) mediaUrl = await getMediaUrl(vid.id);
        }
        break;
      }
    }

    // Handle reply/quote context
    let quotedMsgId: string | null = null;
    let quotedWaId: string | null = null;
    let quotedBody: string | null = null;

    if (message.context?.id) {
      quotedWaId = message.context.id;
      // Try to find the quoted message in our DB
      const quotedMsg = await prisma.whatsAppMessage.findFirst({
        where: { waMessageId: message.context.id },
        select: { id: true, body: true, mediaCaption: true, type: true },
      });
      if (quotedMsg) {
        quotedMsgId = quotedMsg.id;
        quotedBody = quotedMsg.body || quotedMsg.mediaCaption || (quotedMsg.type !== 'TEXT' ? `[${quotedMsg.type}]` : null);
      }
    }

    // Save message
    await prisma.whatsAppMessage.create({
      data: {
        conversationId: conversation.id,
        waMessageId: message.id,
        direction: 'INCOMING',
        type: msgType as 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'STICKER' | 'LOCATION' | 'CONTACT' | 'REACTION' | 'UNKNOWN',
        body,
        mediaUrl,
        mediaCaption,
        mediaMimeType,
        mediaFileName,
        quotedMsgId,
        quotedWaId,
        quotedBody,
        status: 'DELIVERED',
      },
    });

    // If no linked lead, auto-create one from WhatsApp
    if (!conversation.leadId) {
      // Find default funnel and its first stage
      const defaultFunnel = await prisma.crmFunnel.findFirst({
        where: { isActive: true },
        orderBy: [{ isDefault: 'desc' }, { order: 'asc' }],
        include: { stages: { orderBy: { order: 'asc' }, take: 1 } },
      });

      const firstStageId = defaultFunnel?.stages[0]?.id || null;

      const newLead = await prisma.crmLead.create({
        data: {
          firstName: contactName || contactPhone,
          lastName: '',
          phone: contactPhone,
          source: 'WhatsApp',
          // stage uses default NEW_APPLICATION from schema
          funnelId: defaultFunnel?.id || null,
          stageId: firstStageId || null,
          description: `Автоматически создан из входящего сообщения WhatsApp`,
        },
      });

      await prisma.whatsAppConversation.update({
        where: { id: conversation.id },
        data: { leadId: newLead.id },
      });

      // Emit new lead event for real-time updates
      emitNewLead({
        id: newLead.id,
        firstName: newLead.firstName,
        lastName: newLead.lastName,
        phone: newLead.phone,
        source: newLead.source,
        stageId: newLead.stageId,
        funnelId: newLead.funnelId,
      });
    }

    // Emit new message event for real-time updates
    const updatedConversation = await prisma.whatsAppConversation.findUnique({
      where: { id: conversation.id },
      select: { leadId: true, unreadCount: true },
    });

    if (updatedConversation?.leadId) {
      emitNewMessage({
        leadId: updatedConversation.leadId,
        conversationId: conversation.id,
        message: {
          id: message.id,
          body,
          type: msgType,
          direction: 'INCOMING',
        },
        unreadCount: updatedConversation.unreadCount,
      });
    }

    // Mark as read in WhatsApp
    markAsRead(message.id);
  } catch (error) {
    console.error('[WhatsApp] Incoming message error:', error);
  }
}

async function findLeadByPhone(waId: string): Promise<{ id: string } | null> {
  // waId format: "77007501414" — try various phone formats
  const phone = '+' + waId;
  const phoneVariants = [
    phone,                    // +77007501414
    waId,                     // 77007501414
    '8' + waId.slice(1),     // 87007501414
    '+7 ' + waId.slice(1, 4) + ' ' + waId.slice(4, 7) + ' ' + waId.slice(7), // +7 700 750 1414
  ];

  const lead = await prisma.crmLead.findFirst({
    where: {
      OR: [
        { phone: { in: phoneVariants } },
        { parentPhone: { in: phoneVariants } },
      ],
    },
    select: { id: true },
  });

  return lead;
}

// Return the media ID directly — the proxy will resolve it to a fresh URL on demand
async function getMediaUrl(mediaId: string): Promise<string | null> {
  return mediaId || null;
}

function markAsRead(messageId: string) {
  // Fire and forget — don't await
  fetch(`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    }),
  }).catch(() => {});
}
