import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// POST create new stage in funnel
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !['ADMIN', 'SUPERADMIN', 'CHIEF_COORDINATOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { funnelId, name, color, isWon, isLost } = body;

    if (!funnelId || !name?.trim()) {
      return NextResponse.json({ error: 'Funnel ID and name are required' }, { status: 400 });
    }

    // Get max order among non-system stages (stages with order < 100)
    // New stages should be inserted before Won/Lost stages
    const maxOrderResult = await prisma.crmStage.aggregate({
      where: {
        funnelId,
        order: { lt: 100 } // Only non-system final stages
      },
      _max: { order: true },
    });

    const newOrder = (maxOrderResult._max.order || 0) + 1;

    const stage = await prisma.crmStage.create({
      data: {
        funnelId,
        name: name.trim(),
        color: color || '#6B7280',
        order: newOrder,
        isWon: false,
        isLost: false,
        isSystem: false,
      },
    });

    return NextResponse.json(stage);
  } catch (error) {
    console.error('Create stage error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT reorder stages
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !['ADMIN', 'SUPERADMIN', 'CHIEF_COORDINATOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { stages } = body; // Array of { id, order }

    if (!Array.isArray(stages)) {
      return NextResponse.json({ error: 'Invalid stages array' }, { status: 400 });
    }

    // Update all stages in a transaction
    await prisma.$transaction(
      stages.map(({ id, order }: { id: string; order: number }) =>
        prisma.crmStage.update({
          where: { id },
          data: { order },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reorder stages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
