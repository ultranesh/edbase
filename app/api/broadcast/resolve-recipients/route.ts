import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { BROADCAST_SENDER_ROLES, resolveFilterToUserIds } from '@/lib/broadcast';
import type { BroadcastFilters } from '@/lib/broadcast';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!BROADCAST_SENDER_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const filters = body as BroadcastFilters;

    if (!filters.recipientType) {
      return NextResponse.json({ error: 'recipientType is required' }, { status: 400 });
    }

    const userIds = await resolveFilterToUserIds(filters);

    return NextResponse.json({ count: userIds.length });
  } catch (error) {
    console.error('Resolve recipients error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
