import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// PUT update stage
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !['ADMIN', 'SUPERADMIN', 'CHIEF_COORDINATOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, color, order, isWon, isLost } = body;

    const stage = await prisma.crmStage.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(color !== undefined && { color }),
        ...(order !== undefined && { order }),
        ...(isWon !== undefined && { isWon }),
        ...(isLost !== undefined && { isLost }),
      },
    });

    return NextResponse.json(stage);
  } catch (error) {
    console.error('Update stage error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET stage with leads count
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !['ADMIN', 'SUPERADMIN', 'CHIEF_COORDINATOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const stage = await prisma.crmStage.findUnique({
      where: { id },
      include: {
        _count: {
          select: { leads: true },
        },
      },
    });

    if (!stage) {
      return NextResponse.json({ error: 'Stage not found' }, { status: 404 });
    }

    return NextResponse.json(stage);
  } catch (error) {
    console.error('Get stage error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE stage (with optional transfer)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !['ADMIN', 'SUPERADMIN', 'CHIEF_COORDINATOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Parse query params for transfer target
    const url = new URL(request.url);
    const transferToStageId = url.searchParams.get('transferTo');

    // Check if stage is system stage
    const stage = await prisma.crmStage.findUnique({
      where: { id },
    });

    if (!stage) {
      return NextResponse.json({ error: 'Stage not found' }, { status: 404 });
    }

    if (stage.isSystem || stage.isWon || stage.isLost) {
      return NextResponse.json(
        { error: 'Нельзя удалить системный этап' },
        { status: 400 }
      );
    }

    // Check if stage has leads
    const leadsCount = await prisma.crmLead.count({
      where: { stageId: id },
    });

    if (leadsCount > 0) {
      if (!transferToStageId) {
        // Return info about leads count so frontend can prompt for transfer
        return NextResponse.json(
          { error: 'HAS_LEADS', leadsCount },
          { status: 400 }
        );
      }

      // Verify target stage exists and belongs to same funnel
      const targetStage = await prisma.crmStage.findUnique({
        where: { id: transferToStageId },
      });

      if (!targetStage || targetStage.funnelId !== stage.funnelId) {
        return NextResponse.json(
          { error: 'Целевой этап не найден или принадлежит другой воронке' },
          { status: 400 }
        );
      }

      // Transfer all leads to target stage
      await prisma.crmLead.updateMany({
        where: { stageId: id },
        data: { stageId: transferToStageId },
      });
    }

    await prisma.crmStage.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, transferred: leadsCount });
  } catch (error) {
    console.error('Delete stage error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
