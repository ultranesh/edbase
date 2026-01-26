import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

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

    // Get student data before deletion
    const student = await prisma.student.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Delete student and user
    await prisma.student.delete({
      where: { id },
    });

    await prisma.user.delete({
      where: { id: student.userId },
    });

    // Create notification for coordinator
    if (student.coordinatorId) {
      await prisma.notification.create({
        data: {
          userId: student.coordinatorId,
          type: 'WARNING',
          title: 'Ученик отклонен',
          message: `Куратор отклонил ученика: ${student.user.firstName} ${student.user.lastName}`,
          relatedId: student.id,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reject student error:', error);
    return NextResponse.json(
      { error: 'Failed to reject student' },
      { status: 500 }
    );
  }
}
