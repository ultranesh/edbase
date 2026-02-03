import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, StudentStatus, Gender, StudyFormat, Guarantee, PaymentPlan, ParentDocumentType, StudySchedule, Citizenship } from '@prisma/client';
import bcrypt from 'bcryptjs';

function generateNextContractNumber(lastNumber: string | null): string {
  if (!lastNumber) return 'AAA-001';

  const [letters, digits] = lastNumber.split('-');
  let num = parseInt(digits, 10) + 1;
  let letterPart = letters;

  if (num > 999) {
    num = 1;
    const chars = letterPart.split('');
    for (let i = 2; i >= 0; i--) {
      if (chars[i] < 'Z') {
        chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1);
        break;
      } else {
        chars[i] = 'A';
      }
    }
    letterPart = chars.join('');
  }

  return `${letterPart}-${String(num).padStart(3, '0')}`;
}

export async function POST(request: Request) {
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

    const data = await request.json();

    // Generate temporary email and password for the student
    const tempEmail = `student_${Date.now()}@temp.ertis.kz`;
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Create user account for student
    const user = await prisma.user.create({
      data: {
        email: tempEmail,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName || null,
        phone: data.studentPhone || data.parentPhone,
        role: UserRole.PARENT,
        isActive: true,
      },
    });

    // Parse enum values safely
    const studyFormat = data.studyFormat ? (data.studyFormat as StudyFormat) : null;
    const guarantee = data.guarantee ? (data.guarantee as Guarantee) : null;
    const paymentPlan = data.paymentPlan ? (data.paymentPlan as PaymentPlan) : null;
    const gender = data.gender ? (data.gender as Gender) : null;
    const parentDocumentType = data.parentDocumentType ? (data.parentDocumentType as ParentDocumentType) : null;
    const studySchedule = data.studySchedule ? (data.studySchedule as StudySchedule) : null;
    const citizenship = data.citizenship ? (data.citizenship as Citizenship) : Citizenship.KZ;

    // Create student profile with enrollment data
    const student = await prisma.student.create({
      data: {
        userId: user.id,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        gender: gender,
        status: StudentStatus.PENDING_APPROVAL,

        // Personal details
        studentIIN: data.studentIIN || null,
        citizenship: citizenship,
        parentIIN: data.parentIIN || null,
        parentName: data.parentName || null,
        parentPhone: data.parentPhone || null,
        studentPhone: data.studentPhone || null,
        parentDocumentType: parentDocumentType,
        parentDocumentNumber: data.parentDocumentNumber || null,
        address: data.address || null,

        // Reference relations (using IDs)
        gradeLevelId: data.gradeLevelId || null,
        languageId: data.languageId || null,
        studyDirectionId: data.studyDirectionId || null,
        schoolId: data.schoolId || null,
        cityId: data.cityId || null,
        branchId: data.branchId || null,

        // Subscription details
        guarantee: guarantee,
        studyFormat: studyFormat,
        studySchedule: studySchedule,
        customDays: data.customDays || [],
        standardMonths: data.standardMonths || 0,
        bonusMonths: data.bonusMonths || 0,
        intensiveMonths: data.intensiveMonths || 0,
        freezeDays: data.freezeDays || 0,

        // Payment details
        paymentPlan: paymentPlan,
        tranche1Amount: data.tranche1Amount ? parseFloat(data.tranche1Amount) : null,
        tranche1Date: data.tranche1Date ? new Date(data.tranche1Date) : null,
        tranche2Amount: data.tranche2Amount ? parseFloat(data.tranche2Amount) : null,
        tranche2Date: data.tranche2Date ? new Date(data.tranche2Date) : null,
        tranche3Amount: data.tranche3Amount ? parseFloat(data.tranche3Amount) : null,
        tranche3Date: data.tranche3Date ? new Date(data.tranche3Date) : null,
        totalAmount: data.totalAmount ? parseFloat(data.totalAmount) : null,
        monthlyPayment: data.monthlyPayment ? parseFloat(data.monthlyPayment) : null,

        // Study period
        studyStartDate: data.studyStartDate ? new Date(data.studyStartDate) : null,
        studyEndDate: data.studyEndDate ? new Date(data.studyEndDate) : null,

        // Allergy/Health info
        allergy: data.allergy || null,

        coordinatorId: data.coordinatorId,
      },
    });

    // Generate and assign contract number
    const lastStudent = await prisma.student.findFirst({
      where: { contractNumber: { not: null } },
      orderBy: { contractNumber: 'desc' },
      select: { contractNumber: true },
    });
    const contractNumber = generateNextContractNumber(lastStudent?.contractNumber ?? null);
    await prisma.student.update({
      where: { id: student.id },
      data: { contractNumber },
    });

    // Create subject connections (many-to-many)
    if (data.subjects && data.subjects.length > 0) {
      await prisma.studentSubject.createMany({
        data: data.subjects.map((subjectId: string) => ({
          studentId: student.id,
          subjectId,
        })),
      });
    }

    // Create special needs connections (many-to-many)
    if (data.specialNeeds && data.specialNeeds.length > 0) {
      await prisma.studentSpecialNeed.createMany({
        data: data.specialNeeds.map((specialNeedId: string) => ({
          studentId: student.id,
          specialNeedId,
        })),
      });
    }

    // Create notification for curators
    const curators = await prisma.user.findMany({
      where: {
        role: UserRole.CURATOR,
        isActive: true,
      },
    });

    await Promise.all(
      curators.map((curator) =>
        prisma.notification.create({
          data: {
            userId: curator.id,
            type: 'INFO',
            title: 'Новый ученик на подтверждение',
            message: `Координатор зачислил нового ученика: ${data.firstName} ${data.lastName}. Требуется подтверждение.`,
            relatedId: student.id,
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      student,
      tempCredentials: {
        email: tempEmail,
        password: tempPassword,
      },
    });
  } catch (error) {
    console.error('Enrollment error:', error);
    return NextResponse.json(
      { error: 'Failed to enroll student' },
      { status: 500 }
    );
  }
}
