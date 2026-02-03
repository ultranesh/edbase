import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or superadmin (curator can't edit student data)
    const allowedRoles: UserRole[] = [UserRole.ADMIN, UserRole.SUPERADMIN];
    if (!allowedRoles.includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await request.json();
    const isSuperAdmin = session.user.role === UserRole.SUPERADMIN;

    // Get current student to find userId
    const currentStudent = await prisma.student.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!currentStudent) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Update user data (only superadmin can change email)
    const userUpdateData: any = {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
    };

    if (isSuperAdmin && data.email) {
      userUpdateData.email = data.email;
    }

    await prisma.user.update({
      where: { id: currentStudent.userId },
      data: userUpdateData,
    });

    // Prepare student update data
    const studentUpdateData: any = {
      parentName: data.parentName,
      parentPhone: data.parentPhone,
      // Reference table IDs
      gradeLevelId: data.gradeLevelId || undefined,
      schoolId: data.schoolId || undefined,
      languageId: data.languageId || undefined,
      studyDirectionId: data.studyDirectionId || undefined,
      // Enum fields
      guarantee: data.guarantee || undefined,
      studyFormat: data.studyFormat || undefined,
      paymentPlan: data.paymentPlan || undefined,
      // Numeric fields
      standardMonths: data.standardMonths,
      bonusMonths: data.bonusMonths,
      intensiveMonths: data.intensiveMonths,
      freezeDays: data.freezeDays,
      totalAmount: data.totalAmount,
      monthlyPayment: data.monthlyPayment,
    };

    if (data.status) studentUpdateData.status = data.status;

    // Admin and superadmin can update contract number
    if (data.contractNumber !== undefined) studentUpdateData.contractNumber = data.contractNumber || null;

    // Admin and superadmin can update tranches
    if (data.tranche1Amount !== undefined) studentUpdateData.tranche1Amount = data.tranche1Amount;
    if (data.tranche1Date !== undefined) studentUpdateData.tranche1Date = data.tranche1Date;
    if (data.tranche2Amount !== undefined) studentUpdateData.tranche2Amount = data.tranche2Amount;
    if (data.tranche2Date !== undefined) studentUpdateData.tranche2Date = data.tranche2Date;
    if (data.tranche3Amount !== undefined) studentUpdateData.tranche3Amount = data.tranche3Amount;
    if (data.tranche3Date !== undefined) studentUpdateData.tranche3Date = data.tranche3Date;

    // Only superadmin can update study dates
    if (isSuperAdmin) {
      if (data.studyStartDate !== undefined) studentUpdateData.studyStartDate = data.studyStartDate;
      if (data.studyEndDate !== undefined) studentUpdateData.studyEndDate = data.studyEndDate;
    }

    // Update student data
    const student = await prisma.student.update({
      where: { id },
      data: studentUpdateData,
      include: {
        user: true,
      },
    });

    return NextResponse.json({ success: true, student });
  } catch (error) {
    console.error('Update student error:', error);
    return NextResponse.json(
      { error: 'Failed to update student' },
      { status: 500 }
    );
  }
}
