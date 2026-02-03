import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH — Update conversation (block/unblock)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const conversation = await prisma.whatsAppConversation.findUnique({
      where: { id },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const updated = await prisma.whatsAppConversation.update({
      where: { id },
      data: {
        ...(typeof body.isBlocked === 'boolean' ? { isBlocked: body.isBlocked } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[WhatsApp Conversation PATCH] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
