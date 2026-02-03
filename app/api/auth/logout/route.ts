import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// POST - Log logout for current user's latest session
export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the latest login session without a logout time
    const latestSession = await prisma.loginSession.findFirst({
      where: {
        userId: session.user.id,
        logoutAt: null,
      },
      orderBy: { loginAt: 'desc' },
    });

    if (latestSession) {
      await prisma.loginSession.update({
        where: { id: latestSession.id },
        data: { logoutAt: new Date() },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error logging logout:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
