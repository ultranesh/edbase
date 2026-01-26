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

    // Extend studyEndDate by the number of freeze days
    const newStudyEndDate = currentStudent.studyEndDate
      ? new Date(currentStudent.studyEndDate)
      : null;

    if (newStudyEndDate) {
      newStudyEndDate.setDate(newStudyEndDate.getDate() + days);
    }

    // Update student status and set freeze end date
    const student = await prisma.student.update({
      where: { id },
      data: {
        status: StudentStatus.FROZEN,
        freezeEndDate: freezeEndDate,
        studyEndDate: newStudyEndDate,
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
