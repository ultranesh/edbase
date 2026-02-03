import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/social/conversations/[id]/messages — paginated messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: conversationId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const cursor = searchParams.get('cursor');
  const limitParam = searchParams.get('limit');
  const limit = Math.min(parseInt(limitParam || '50', 10), 100);

  const messages = await prisma.socialMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1,
    }),
    include: {
      sentBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  const hasMore = messages.length > limit;
  if (hasMore) messages.pop();

  const nextCursor = messages.length > 0 ? messages[messages.length - 1].id : null;

  // Reverse to return oldest-first
  messages.reverse();

  return NextResponse.json({
    messages,
    hasMore,
    nextCursor,
  });
}
