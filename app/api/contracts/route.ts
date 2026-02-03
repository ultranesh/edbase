import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
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

    // Fetch all students with their user data for contract generation
    const students = await prisma.student.findMany({
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        gradeLevel: { select: { name: true } },
        subjects: { select: { subject: { select: { nameRu: true, nameKz: true } } } },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform data for contracts view
    const contracts = students.map((student) => ({
      id: student.id,
      studentId: student.id,
      contractNumber: student.contractNumber || null,
      studentName: `${student.user.firstName} ${student.user.lastName}`,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      studentIIN: student.studentIIN || '-',
      parentIIN: student.parentIIN || '-',
      documentNumber: student.parentDocumentNumber || '-',
      gradeLevel: student.gradeLevel?.name || null,
      subjects: student.subjects.map(s => s.subject.nameRu || s.subject.nameKz || '-'),
      studyFormat: student.studyFormat,
      guarantee: student.guarantee,
      standardMonths: student.standardMonths,
      bonusMonths: student.bonusMonths,
      intensiveMonths: student.intensiveMonths,
      freezeDays: student.freezeDays,
      paymentPlan: student.paymentPlan,
      tranche1Amount: student.tranche1Amount,
      tranche1Date: student.tranche1Date,
      tranche2Amount: student.tranche2Amount,
      tranche2Date: student.tranche2Date,
      tranche3Amount: student.tranche3Amount,
      tranche3Date: student.tranche3Date,
      totalAmount: student.totalAmount,
      studyStartDate: student.studyStartDate,
      studyEndDate: student.studyEndDate,
      enrollmentDate: student.enrollmentDate,
      status: student.status,
      contractConfirmed: student.contractConfirmed,
      contractConfirmedAt: student.contractConfirmedAt,
    }));

    return NextResponse.json(contracts);
  } catch (error) {
    console.error('Contracts fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contracts' },
      { status: 500 }
    );
  }
}
