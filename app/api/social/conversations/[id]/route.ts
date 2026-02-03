import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/social/conversations/[id] — update conversation (block/unblock)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const conversation = await prisma.socialConversation.findUnique({
    where: { id },
  });

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  const updated = await prisma.socialConversation.update({
    where: { id },
    data: {
      ...(typeof body.isBlocked === 'boolean' && { isBlocked: body.isBlocked }),
      ...(typeof body.leadId === 'string' && { leadId: body.leadId || null }),
    },
  });

  return NextResponse.json(updated);
}
