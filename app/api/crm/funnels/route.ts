import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET all funnels with stages
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const funnels = await prisma.crmFunnel.findMany({
      where: { isActive: true },
      include: {
        stages: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { leads: true },
        },
      },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json(funnels);
  } catch (error) {
    console.error('Get funnels error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create new funnel with default stages
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !['ADMIN', 'SUPERADMIN', 'CHIEF_COORDINATOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, color, isDefault } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Get max order
    const maxOrder = await prisma.crmFunnel.aggregate({
      _max: { order: true },
    });

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.crmFunnel.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    // Create funnel with 3 system stages only
    const funnel = await prisma.crmFunnel.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || '#3B82F6',
        isDefault: isDefault || false,
        order: (maxOrder._max.order || 0) + 1,
        stages: {
          create: [
            { name: 'Новая заявка', color: '#F59E0B', order: 0, isSystem: true },
            { name: 'Успешно реализовано', color: '#22C55E', order: 100, isWon: true, isSystem: true },
            { name: 'Закрыто и не реализовано', color: '#EF4444', order: 101, isLost: true, isSystem: true },
          ],
        },
      },
      include: {
        stages: { orderBy: { order: 'asc' } },
      },
    });

    return NextResponse.json(funnel);
  } catch (error) {
    console.error('Create funnel error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
