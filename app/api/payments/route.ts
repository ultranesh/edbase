import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allowedRoles: string[] = ['COORDINATOR', 'COORDINATOR_MANAGER', 'ADMIN', 'SUPERADMIN'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payments = await prisma.payment.findMany({
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            parent: {
              include: {
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
        coordinator: { select: { firstName: true, lastName: true } },
        partner: { select: { firstName: true, lastName: true } },
        confirmedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = payments.map((p) => ({
      id: p.id,
      date: p.createdAt,
      actualAmount: p.actualAmount,
      contractAmount: p.student.totalAmount,
      method: p.method,
      status: p.status,
      isConfirmed: p.isConfirmed,
      confirmedAt: p.confirmedAt,
      studentName: `${p.student.user.lastName} ${p.student.user.firstName}`,
      parentName: p.student.parent
        ? `${p.student.parent.user.lastName} ${p.student.parent.user.firstName}`
        : p.student.parentName || '-',
      parentPhone: p.student.parentPhone || null,
      coordinatorId: p.coordinatorId || null,
      coordinatorName: p.coordinator
        ? `${p.coordinator.lastName} ${p.coordinator.firstName}`
        : '-',
      partnerId: p.partnerId || null,
      partnerName: p.partner
        ? `${p.partner.lastName} ${p.partner.firstName}`
        : null,
      confirmedByName: p.confirmedBy
        ? `${p.confirmedBy.lastName} ${p.confirmedBy.firstName}`
        : null,
      description: p.description,
      studentId: p.studentId,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Payments fetch error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch payments';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allowedRoles: string[] = ['COORDINATOR', 'COORDINATOR_MANAGER', 'ADMIN', 'SUPERADMIN'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await request.json();

    if (!data.studentId || !data.actualAmount || !data.method) {
      return NextResponse.json(
        { error: 'studentId, actualAmount, and method are required' },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.create({
      data: {
        studentId: data.studentId,
        amount: data.amount || data.actualAmount,
        actualAmount: data.actualAmount,
        method: data.method,
        status: 'PAID',
        paidAt: new Date(),
        coordinatorId: session.user.id,
        partnerId: data.partnerId || null,
        description: data.description || null,
        isConfirmed: false,
      },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error('Payment create error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create payment';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
