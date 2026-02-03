import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Update lastSeen (fire-and-forget, don't block response)
    prisma.user.update({
      where: { id: userId },
      data: { lastSeen: new Date() },
    }).catch(() => {});

    // Get all chat IDs where user is participant
    const participantChats = await prisma.chatParticipant.findMany({
      where: { userId },
      select: { chatId: true },
    });

    const chatIds = participantChats.map((p) => p.chatId);

    let normalCount = 0;
    if (chatIds.length > 0) {
      normalCount = await prisma.message.count({
        where: {
          chatId: { in: chatIds },
          senderId: { not: userId },
          status: { not: 'READ' },
        },
      });
    }

    // Add broadcast unread count
    const broadcastCount = await prisma.broadcastMessageRecipient.count({
      where: { userId, isRead: false },
    });

    return NextResponse.json({ count: normalCount + broadcastCount });
  } catch (error) {
    console.error('Unread count error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
