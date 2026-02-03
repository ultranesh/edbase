import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendTextMessage, sendMediaMessage } from '@/lib/social/meta-send';

// POST /api/social/send — send a message
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { conversationId, text, mediaUrl, mediaType } = await request.json() as {
    conversationId: string;
    text?: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video' | 'audio' | 'file';
  };

  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
  }

  if (!text && !mediaUrl) {
    return NextResponse.json({ error: 'text or mediaUrl is required' }, { status: 400 });
  }

  const conversation = await prisma.socialConversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  try {
    let messageId: string;
    let msgType: string = 'TEXT';
    let body: string | null = null;
    let savedMediaUrl: string | null = null;

    if (mediaUrl && mediaType) {
      // Send media
      const result = await sendMediaMessage(
        conversation.platform,
        conversation.platformUserId,
        mediaType,
        mediaUrl,
      );
      messageId = result.messageId;
      msgType = mediaType === 'file' ? 'DOCUMENT' : mediaType.toUpperCase();
      savedMediaUrl = mediaUrl;
    } else {
      // Send text
      const result = await sendTextMessage(
        conversation.platform,
        conversation.platformUserId,
        text!,
      );
      messageId = result.messageId;
      body = text!;
    }

    // Save message
    const message = await prisma.socialMessage.create({
      data: {
        conversationId,
        platformMsgId: messageId,
        direction: 'OUTGOING',
        type: msgType as never,
        body,
        mediaUrl: savedMediaUrl,
        status: 'SENT',
        sentById: session.user.id,
      },
      include: {
        sentBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Update conversation
    await prisma.socialConversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date(), unreadCount: 0 },
    });

    return NextResponse.json(message);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to send message';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
