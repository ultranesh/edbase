import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allowedRoles: string[] = ['ADMIN', 'SUPERADMIN'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const data = await request.json();

    const updateData: Record<string, unknown> = {};
    if (data.actualAmount !== undefined) {
      updateData.actualAmount = parseFloat(data.actualAmount);
      updateData.amount = parseFloat(data.actualAmount);
    }
    if (data.method !== undefined) updateData.method = data.method;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.coordinatorId !== undefined) updateData.coordinatorId = data.coordinatorId || null;
    if (data.partnerId !== undefined) updateData.partnerId = data.partnerId || null;

    const payment = await prisma.payment.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, payment });
  } catch (error) {
    console.error('Payment update error:', error);
    return NextResponse.json(
      { error: 'Failed to update payment' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allowedRoles: string[] = ['ADMIN', 'SUPERADMIN'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    await prisma.payment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Payment delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete payment' },
      { status: 500 }
    );
  }
}
