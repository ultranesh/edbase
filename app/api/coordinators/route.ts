import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const coordinators = await prisma.user.findMany({
      where: {
        role: { in: ['COORDINATOR', 'COORDINATOR_MANAGER'] },
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
      orderBy: { lastName: 'asc' },
    });

    return NextResponse.json(coordinators);
  } catch (error) {
    console.error('Coordinators fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coordinators' },
      { status: 500 }
    );
  }
}
