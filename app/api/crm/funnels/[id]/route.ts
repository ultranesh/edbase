import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET single funnel with stages
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const funnel = await prisma.crmFunnel.findUnique({
      where: { id },
      include: {
        stages: { orderBy: { order: 'asc' } },
        _count: { select: { leads: true } },
      },
    });

    if (!funnel) {
      return NextResponse.json({ error: 'Funnel not found' }, { status: 404 });
    }

    return NextResponse.json(funnel);
  } catch (error) {
    console.error('Get funnel error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT update funnel
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
    const { name, description, color, isDefault, isActive } = body;

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.crmFunnel.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const funnel = await prisma.crmFunnel.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(color !== undefined && { color }),
        ...(isDefault !== undefined && { isDefault }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        stages: { orderBy: { order: 'asc' } },
      },
    });

    return NextResponse.json(funnel);
  } catch (error) {
    console.error('Update funnel error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE funnel (soft delete - set isActive to false)
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

    // Check if funnel has leads
    const leadsCount = await prisma.crmLead.count({
      where: { funnelId: id },
    });

    if (leadsCount > 0) {
      // Soft delete - just deactivate
      await prisma.crmFunnel.update({
        where: { id },
        data: { isActive: false },
      });
    } else {
      // Hard delete if no leads
      await prisma.crmFunnel.delete({
        where: { id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete funnel error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
