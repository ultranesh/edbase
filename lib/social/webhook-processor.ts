import { prisma } from '../prisma';
import {
  type WebhookMessageEvent,
  attachmentToMessageType,
  getUserProfile,
  markSeen,
} from './meta-send';

type Platform = 'MESSENGER' | 'INSTAGRAM';

/**
 * Process an incoming message event from Meta webhook (Messenger or Instagram).
 */
export async function processIncomingMessage(
  platform: Platform,
  event: WebhookMessageEvent,
) {
  // Skip echo messages (messages sent by the page itself)
  if (event.message?.is_echo) return;

  const senderId = event.senderId;
  if (!senderId || !event.message) return;

  const msg = event.message;

  // 1. Find or create conversation
  let conversation = await prisma.socialConversation.findUnique({
    where: {
      platform_platformUserId: { platform, platformUserId: senderId },
    },
  });

  if (!conversation) {
    // Fetch profile info
    const profile = await getUserProfile(platform, senderId);

    conversation = await prisma.socialConversation.create({
      data: {
        platform,
        platformUserId: senderId,
        contactName: profile.name || null,
        contactUsername: profile.username || null,
        contactAvatar: profile.profilePic || null,
        lastMessageAt: new Date(),
        unreadCount: 1,
      },
    });

    // Auto-create CRM lead
    const leadSource = platform === 'MESSENGER' ? 'Facebook' : 'Instagram';
    const lead = await prisma.crmLead.create({
      data: {
        firstName: profile.name?.split(' ')[0] || leadSource,
        lastName: profile.name?.split(' ').slice(1).join(' ') || 'User',
        source: leadSource,
        stage: 'NEW_APPLICATION',
      },
    });

    // Link conversation to lead
    conversation = await prisma.socialConversation.update({
      where: { id: conversation.id },
      data: { leadId: lead.id },
    });
  } else {
    // Update conversation metadata
    await prisma.socialConversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        unreadCount: { increment: 1 },
      },
    });
  }

  // 2. Determine message type and content
  let type: string = 'TEXT';
  let body: string | null = msg.text || null;
  let mediaUrl: string | null = null;
  let mediaMimeType: string | null = null;

  if (msg.attachments && msg.attachments.length > 0) {
    const attachment = msg.attachments[0];
    type = attachmentToMessageType(attachment.type);
    mediaUrl = attachment.payload?.url || null;
    if (!body) body = null; // Don't set body for media-only messages
  }

  // 3. Create message record
  await prisma.socialMessage.create({
    data: {
      conversationId: conversation.id,
      platformMsgId: msg.mid,
      direction: 'INCOMING',
      type: type as never,
      body,
      mediaUrl,
      mediaMimeType,
      status: 'DELIVERED',
    },
  });

  // 4. Mark as seen on Meta
  try {
    await markSeen(platform, senderId);
  } catch {
    // Non-critical, ignore
  }
}

/**
 * Process delivery receipt from Meta webhook.
 */
export async function processDelivery(
  platform: Platform,
  event: WebhookMessageEvent,
) {
  if (!event.delivery?.mids) return;

  for (const mid of event.delivery.mids) {
    await prisma.socialMessage.updateMany({
      where: {
        platformMsgId: mid,
        direction: 'OUTGOING',
        status: 'SENT',
        conversation: { platform },
      },
      data: { status: 'DELIVERED' },
    });
  }
}

/**
 * Process read receipt from Meta webhook.
 */
export async function processRead(
  platform: Platform,
  event: WebhookMessageEvent,
) {
  if (!event.read) return;

  const watermark = event.read.watermark;
  const senderId = event.senderId;

  // Find the conversation
  const conversation = await prisma.socialConversation.findUnique({
    where: {
      platform_platformUserId: { platform, platformUserId: senderId },
    },
  });

  if (!conversation) return;

  // Mark all outgoing messages before the watermark as read
  await prisma.socialMessage.updateMany({
    where: {
      conversationId: conversation.id,
      direction: 'OUTGOING',
      status: { in: ['SENT', 'DELIVERED'] },
      createdAt: { lte: new Date(watermark) },
    },
    data: { status: 'READ' },
  });
}
