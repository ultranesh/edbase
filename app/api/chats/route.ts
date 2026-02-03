import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { BROADCAST_CHAT_ID, BROADCAST_SENDER_ROLES } from '@/lib/broadcast';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    const chats = await prisma.chat.findMany({
      where: {
        participants: {
          some: { userId },
        },
        isBroadcast: false,
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
                avatar: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Compute unread counts per chat
    const unreadCounts = await Promise.all(
      chats.map(async (chat) => {
        const count = await prisma.message.count({
          where: {
            chatId: chat.id,
            senderId: { not: userId },
            status: { not: 'READ' },
          },
        });
        return { chatId: chat.id, count };
      })
    );

    const unreadMap = Object.fromEntries(
      unreadCounts.map((u) => [u.chatId, u.count])
    );

    const result = chats.map((chat) => {
      const lastMsg = chat.messages[0] || null;
      const otherParticipants = chat.participants
        .filter((p) => p.userId !== userId)
        .map((p) => p.user);

      return {
        id: chat.id,
        name: chat.name,
        isGroup: chat.isGroup,
        isBroadcast: false,
        groupId: chat.groupId,
        participants: otherParticipants,
        lastMessage: lastMsg
          ? {
              id: lastMsg.id,
              content: lastMsg.content,
              senderId: lastMsg.senderId,
              senderName: `${lastMsg.sender.firstName} ${lastMsg.sender.lastName}`,
              createdAt: lastMsg.createdAt,
            }
          : null,
        unreadCount: unreadMap[chat.id] || 0,
        updatedAt: chat.updatedAt,
      };
    });

    // Inject broadcast chat
    const broadcastChat = await prisma.chat.findUnique({
      where: { id: BROADCAST_CHAT_ID },
    });

    if (broadcastChat) {
      const isSender = BROADCAST_SENDER_ROLES.includes(session.user.role);

      // For senders: get latest message overall. For recipients: get latest message targeted to them.
      let lastBroadcastMsg = null;
      let broadcastUnread = 0;

      if (isSender) {
        const latestMsg = await prisma.message.findFirst({
          where: { chatId: BROADCAST_CHAT_ID },
          orderBy: { createdAt: 'desc' },
          include: { sender: { select: { id: true, firstName: true, lastName: true } } },
        });
        if (latestMsg) {
          lastBroadcastMsg = {
            id: latestMsg.id,
            content: latestMsg.content,
            senderId: latestMsg.senderId,
            senderName: `${latestMsg.sender.firstName} ${latestMsg.sender.lastName}`,
            createdAt: latestMsg.createdAt,
          };
        }
      } else {
        const latestRecipient = await prisma.broadcastMessageRecipient.findFirst({
          where: { userId },
          orderBy: { message: { createdAt: 'desc' } },
          include: {
            message: {
              include: { sender: { select: { id: true, firstName: true, lastName: true } } },
            },
          },
        });
        if (latestRecipient) {
          lastBroadcastMsg = {
            id: latestRecipient.message.id,
            content: latestRecipient.message.content,
            senderId: latestRecipient.message.senderId,
            senderName: `${latestRecipient.message.sender.firstName} ${latestRecipient.message.sender.lastName}`,
            createdAt: latestRecipient.message.createdAt,
          };
        }
        broadcastUnread = await prisma.broadcastMessageRecipient.count({
          where: { userId, isRead: false },
        });
      }

      // Show broadcast chat if user is sender or has received messages
      if (isSender || lastBroadcastMsg) {
        result.unshift({
          id: BROADCAST_CHAT_ID,
          name: 'Ertis Academy',
          isGroup: true,
          isBroadcast: true,
          groupId: null,
          participants: [],
          lastMessage: lastBroadcastMsg,
          unreadCount: broadcastUnread,
          updatedAt: broadcastChat.updatedAt,
        });
      }
    }

    return NextResponse.json({ chats: result });
  } catch (error) {
    console.error('Chats list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { participantIds, isGroup, name } = body as {
      participantIds: string[];
      isGroup?: boolean;
      name?: string;
    };

    if (!participantIds || participantIds.length === 0) {
      return NextResponse.json({ error: 'participantIds required' }, { status: 400 });
    }

    // For 1-on-1 chats, check if one already exists
    if (!isGroup && participantIds.length === 1) {
      const targetId = participantIds[0];

      const existingChat = await prisma.chat.findFirst({
        where: {
          isGroup: false,
          isBroadcast: false,
          AND: [
            { participants: { some: { userId } } },
            { participants: { some: { userId: targetId } } },
          ],
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  role: true,
                  avatar: true,
                },
              },
            },
          },
        },
      });

      if (existingChat) {
        return NextResponse.json({
          chat: {
            id: existingChat.id,
            name: existingChat.name,
            isGroup: existingChat.isGroup,
            participants: existingChat.participants
              .filter((p) => p.userId !== userId)
              .map((p) => p.user),
          },
        });
      }
    }

    // Create new chat
    const allParticipantIds = [...new Set([userId, ...participantIds])];

    const chat = await prisma.chat.create({
      data: {
        name: isGroup ? name || null : null,
        isGroup: isGroup || false,
        participants: {
          create: allParticipantIds.map((id) => ({ userId: id })),
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      chat: {
        id: chat.id,
        name: chat.name,
        isGroup: chat.isGroup,
        participants: chat.participants
          .filter((p) => p.userId !== userId)
          .map((p) => p.user),
      },
    });
  } catch (error) {
    console.error('Chat create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
