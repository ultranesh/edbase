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

    const { days } = await request.json();

    if (!days || days <= 0) {
      return NextResponse.json({ error: 'Некорректное количество дней' }, { status: 400 });
    }

    // Get current student
    const currentStudent = await prisma.student.findUnique({
      where: { id },
    });

    if (!currentStudent) {
      return NextResponse.json({ error: 'Ученик не найден' }, { status: 404 });
    }

    if (currentStudent.freezeDays < days) {
      return NextResponse.json({
        error: `Недостаточно дней заморозки. Доступно: ${currentStudent.freezeDays} дней`
      }, { status: 400 });
    }

    // Calculate freeze end date (current date + days)
    const freezeEndDate = new Date();
    freezeEndDate.setDate(freezeEndDate.getDate() + days);

    // Don't extend studyEndDate immediately - let the cron job handle it daily
    // Don't decrement freezeDays immediately - let the cron job handle it daily
    // This way freezeDays decreases by 1 each day and studyEndDate extends by 1 each day

    // Update student status and set freeze end date
    const student = await prisma.student.update({
      where: { id },
      data: {
        status: StudentStatus.FROZEN,
        freezeEndDate: freezeEndDate,
      },
      include: {
        user: true,
      },
    });

    return NextResponse.json({ success: true, student });
  } catch (error) {
    console.error('Freeze student error:', error);
    return NextResponse.json(
      { error: 'Failed to freeze student' },
      { status: 500 }
    );
  }
}
