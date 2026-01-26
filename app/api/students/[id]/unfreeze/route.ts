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

    // Get current student to calculate days to subtract from studyEndDate
    const currentStudent = await prisma.student.findUnique({
      where: { id },
    });

    if (!currentStudent) {
      return NextResponse.json({ error: 'Ученик не найден' }, { status: 404 });
    }

    // Calculate how many days of freeze were actually used
    let newStudyEndDate = currentStudent.studyEndDate;
    if (currentStudent.freezeEndDate && currentStudent.studyEndDate) {
      const now = new Date();
      const daysUsed = Math.ceil(
        (now.getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)
      );
      const originalFreezeEndDate = new Date(currentStudent.freezeEndDate);
      const totalFreezeDays = Math.ceil(
        (originalFreezeEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      ) + daysUsed;

      // Subtract the unused freeze days from studyEndDate
      const unusedDays = Math.max(0, totalFreezeDays - daysUsed);
      newStudyEndDate = new Date(currentStudent.studyEndDate);
      newStudyEndDate.setDate(newStudyEndDate.getDate() - unusedDays);
    }

    // Update student status back to ACTIVE and clear freeze end date
    const student = await prisma.student.update({
      where: { id },
      data: {
        status: StudentStatus.ACTIVE,
        freezeEndDate: null,
        studyEndDate: newStudyEndDate,
      },
      include: {
        user: true,
      },
    });

    return NextResponse.json({ success: true, student });
  } catch (error) {
    console.error('Unfreeze student error:', error);
    return NextResponse.json(
      { error: 'Failed to unfreeze student' },
      { status: 500 }
    );
  }
}
