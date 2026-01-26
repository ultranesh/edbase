import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is coordinator, admin, or superadmin
    const allowedRoles: string[] = ['COORDINATOR', 'ADMIN', 'SUPERADMIN'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Confirm the contract
    const student = await prisma.student.update({
      where: { id },
      data: {
        contractConfirmed: true,
        contractConfirmedAt: new Date(),
        contractConfirmedBy: session.user.id,
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Договор для ${student.user.firstName} ${student.user.lastName} подтвержден`,
    });
  } catch (error) {
    console.error('Contract confirm error:', error);
    return NextResponse.json(
      { error: 'Failed to confirm contract' },
      { status: 500 }
    );
  }
}
