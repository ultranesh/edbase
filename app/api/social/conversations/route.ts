import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendTextMessage, getUserProfile } from '@/lib/social/meta-send';
import type { SocialPlatform } from '@prisma/client';

// GET /api/social/conversations — list conversations
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const platform = request.nextUrl.searchParams.get('platform') as SocialPlatform | null;
  const leadId = request.nextUrl.searchParams.get('leadId');

  const where: Record<string, unknown> = {};
  if (platform) where.platform = platform;
  if (leadId) where.leadId = leadId;

  const conversations = await prisma.socialConversation.findMany({
    where,
    orderBy: { lastMessageAt: 'desc' },
    include: {
      lead: { select: { id: true, firstName: true, lastName: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          body: true,
          type: true,
          direction: true,
          createdAt: true,
        },
      },
    },
  });

  const result = conversations.map(c => ({
    ...c,
    lastMessage: c.messages[0] || null,
    messages: undefined,
  }));

  return NextResponse.json(result);
}

// POST /api/social/conversations — create new conversation + send first message
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { platform, platformUserId, text, leadId } = await request.json() as {
    platform: SocialPlatform;
    platformUserId: string;
    text: string;
    leadId?: string;
  };

  if (!platform || !platformUserId || !text) {
    return NextResponse.json({ error: 'platform, platformUserId, and text are required' }, { status: 400 });
  }

  try {
    // Find or create conversation
    let conversation = await prisma.socialConversation.findUnique({
      where: {
        platform_platformUserId: { platform, platformUserId },
      },
    });

    if (!conversation) {
      const profile = await getUserProfile(platform, platformUserId);

      conversation = await prisma.socialConversation.create({
        data: {
          platform,
          platformUserId,
          contactName: profile.name || null,
          contactUsername: profile.username || null,
          contactAvatar: profile.profilePic || null,
          leadId: leadId || null,
          lastMessageAt: new Date(),
        },
      });
    }

    // Send message via Meta API
    const { messageId } = await sendTextMessage(platform, platformUserId, text);

    // Save message
    const message = await prisma.socialMessage.create({
      data: {
        conversationId: conversation.id,
        platformMsgId: messageId,
        direction: 'OUTGOING',
        type: 'TEXT',
        body: text,
        status: 'SENT',
        sentById: session.user.id,
      },
      include: {
        sentBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Update conversation
    await prisma.socialConversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date(), unreadCount: 0 },
    });

    return NextResponse.json({ conversation, message });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Social Conversations] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
