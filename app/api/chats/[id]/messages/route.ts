import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { BROADCAST_SENDER_ROLES, resolveFilterToUserIds } from '@/lib/broadcast';
import type { BroadcastFilters } from '@/lib/broadcast';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: chatId } = await params;
    const userId = session.user.id;

    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const cursor = searchParams.get('cursor');

    if (chat.isBroadcast) {
      const isSender = BROADCAST_SENDER_ROLES.includes(session.user.role);

      let messages;

      if (isSender) {
        // Senders see ALL broadcast messages
        messages = await prisma.message.findMany({
          where: { chatId },
          include: {
            sender: {
              select: { id: true, firstName: true, lastName: true, avatar: true },
            },
            broadcastRecipients: { select: { id: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: limit + 1,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });
      } else {
        // Regular users only see messages targeted to them
        const recipientRecords = await prisma.broadcastMessageRecipient.findMany({
          where: { userId },
          select: { messageId: true },
        });
        const messageIds = recipientRecords.map(r => r.messageId);

        if (messageIds.length === 0) {
          return NextResponse.json({ messages: [], hasMore: false });
        }

        messages = await prisma.message.findMany({
          where: { id: { in: messageIds }, chatId },
          include: {
            sender: {
              select: { id: true, firstName: true, lastName: true, avatar: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: limit + 1,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });
      }

      const hasMore = messages.length > limit;
      if (hasMore) messages.pop();
      messages.reverse();

      return NextResponse.json({
        messages: messages.map((m: any) => ({
          id: m.id,
          content: m.content,
          attachments: m.attachments,
          senderId: m.senderId,
          senderName: `${m.sender.firstName} ${m.sender.lastName}`,
          senderAvatar: m.sender.avatar,
          status: m.status,
          isEdited: m.isEdited || false,
          createdAt: m.createdAt,
          recipientCount: m.broadcastRecipients ? m.broadcastRecipients.length : undefined,
        })),
        hasMore,
      });
    }

    // Normal chat logic
    const participant = await prisma.chatParticipant.findUnique({
      where: { chatId_userId: { chatId, userId } },
    });

    if (!participant) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    const messages = await prisma.message.findMany({
      where: { chatId },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();
    messages.reverse();

    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        content: m.content,
        attachments: m.attachments,
        senderId: m.senderId,
        senderName: `${m.sender.firstName} ${m.sender.lastName}`,
        senderAvatar: m.sender.avatar,
        status: m.status,
        isEdited: m.isEdited || false,
        createdAt: m.createdAt,
      })),
      hasMore,
    });
  } catch (error) {
    console.error('Messages fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: chatId } = await params;
    const userId = session.user.id;
    const body = await request.json();
    const { messageId, content } = body as { messageId: string; content: string };

    if (!messageId || !content?.trim()) {
      return NextResponse.json({ error: 'messageId and content are required' }, { status: 400 });
    }

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.chatId !== chatId) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (message.senderId !== userId) {
      return NextResponse.json({ error: 'Can only edit your own messages' }, { status: 403 });
    }

    // 15-minute edit window (like WhatsApp)
    const EDIT_WINDOW_MS = 15 * 60 * 1000;
    const messageAge = Date.now() - new Date(message.createdAt).getTime();
    if (messageAge > EDIT_WINDOW_MS) {
      return NextResponse.json({ error: 'Edit window expired (15 min)' }, { status: 400 });
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { content: content.trim(), isEdited: true },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
    });

    return NextResponse.json({
      message: {
        id: updated.id,
        content: updated.content,
        attachments: updated.attachments,
        senderId: updated.senderId,
        senderName: `${updated.sender.firstName} ${updated.sender.lastName}`,
        senderAvatar: updated.sender.avatar,
        status: updated.status,
        isEdited: updated.isEdited,
        createdAt: updated.createdAt,
      },
    });
  } catch (error) {
    console.error('Message edit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: chatId } = await params;
    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json({ error: 'messageId is required' }, { status: 400 });
    }

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.chatId !== chatId) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (message.senderId !== userId) {
      return NextResponse.json({ error: 'Can only delete your own messages' }, { status: 403 });
    }

    await prisma.message.delete({ where: { id: messageId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Message delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: chatId } = await params;
    const userId = session.user.id;

    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    const body = await request.json();

    if (chat.isBroadcast) {
      // Broadcast send
      if (!BROADCAST_SENDER_ROLES.includes(session.user.role)) {
        return NextResponse.json({ error: 'Only admins and coordinators can send broadcast messages' }, { status: 403 });
      }

      const { content, broadcastFilters } = body as {
        content?: string;
        broadcastFilters?: BroadcastFilters;
      };

      if (!content?.trim()) {
        return NextResponse.json({ error: 'Content required' }, { status: 400 });
      }

      if (!broadcastFilters?.recipientType) {
        return NextResponse.json({ error: 'Broadcast filters with recipientType required' }, { status: 400 });
      }

      const recipientUserIds = await resolveFilterToUserIds(broadcastFilters);

      if (recipientUserIds.length === 0) {
        return NextResponse.json({ error: 'Нет получателей по заданным фильтрам' }, { status: 400 });
      }

      const message = await prisma.$transaction(async (tx) => {
        const msg = await tx.message.create({
          data: {
            chatId,
            senderId: userId,
            content: content.trim(),
            broadcastFilters: broadcastFilters as any,
          },
          include: {
            sender: {
              select: { id: true, firstName: true, lastName: true, avatar: true },
            },
          },
        });

        await tx.broadcastMessageRecipient.createMany({
          data: recipientUserIds.map(uid => ({
            messageId: msg.id,
            userId: uid,
          })),
        });

        return msg;
      });

      await prisma.chat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() },
      });

      return NextResponse.json({
        message: {
          id: message.id,
          content: message.content,
          attachments: message.attachments,
          senderId: message.senderId,
          senderName: `${message.sender.firstName} ${message.sender.lastName}`,
          senderAvatar: message.sender.avatar,
          status: message.status,
          createdAt: message.createdAt,
          recipientCount: recipientUserIds.length,
        },
      });
    }

    // Normal chat send
    const participant = await prisma.chatParticipant.findUnique({
      where: { chatId_userId: { chatId, userId } },
    });

    if (!participant) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    const { content, audioUrl, audioDuration } = body as {
      content?: string;
      audioUrl?: string;
      audioDuration?: number;
    };

    if (!content?.trim() && !audioUrl) {
      return NextResponse.json({ error: 'Content or audio required' }, { status: 400 });
    }

    const attachments: string[] = [];
    if (audioUrl) {
      attachments.push(JSON.stringify({ type: 'audio', url: audioUrl, duration: audioDuration || 0 }));
    }

    const message = await prisma.message.create({
      data: {
        chatId,
        senderId: userId,
        content: content?.trim() || '',
        attachments,
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
    });

    await prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      message: {
        id: message.id,
        content: message.content,
        attachments: message.attachments,
        senderId: message.senderId,
        senderName: `${message.sender.firstName} ${message.sender.lastName}`,
        senderAvatar: message.sender.avatar,
        status: message.status,
        createdAt: message.createdAt,
      },
    });
  } catch (error) {
    console.error('Message send error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
