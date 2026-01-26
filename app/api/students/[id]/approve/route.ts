import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, StudentStatus } from '@prisma/client';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is curator, admin, or superadmin
    const allowedRoles: UserRole[] = [UserRole.CURATOR, UserRole.ADMIN, UserRole.SUPERADMIN];
    if (!allowedRoles.includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update student status to ACTIVE
    const student = await prisma.student.update({
      where: { id },
      data: {
        status: StudentStatus.ACTIVE,
      },
      include: {
        user: true,
      },
    });

    // Create notification for coordinator
    if (student.coordinatorId) {
      await prisma.notification.create({
        data: {
          userId: student.coordinatorId,
          type: 'SUCCESS',
          title: 'Ученик подтвержден',
          message: `Куратор подтвердил ученика: ${student.user.firstName} ${student.user.lastName}`,
          relatedId: student.id,
        },
      });
    }

    return NextResponse.json({ success: true, student });
  } catch (error) {
    console.error('Approve student error:', error);
    return NextResponse.json(
      { error: 'Failed to approve student' },
      { status: 500 }
    );
  }
}
