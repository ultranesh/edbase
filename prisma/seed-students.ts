import { StudentStatus, Gender, UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  // Create 3 example students
  const students = [
    {
      firstName: 'Айгерим',
      lastName: 'Нурланова',
      parentName: 'Нурлан Абаев',
      parentPhone: '+77771234567',
      gradeLevel: 'GRADE_9' as const,
      school: '№70',
      languageOfStudy: 'KAZAKH' as const,
      studyGoal: 'ENT' as const,
      subjects: ['MATHEMATICS', 'PHYSICS', 'KAZAKH'] as const,
      guarantee: 'FIFTY_PERCENT' as const,
      studyFormat: 'ONLINE' as const,
      standardMonths: 8,
      bonusMonths: 1,
      intensiveMonths: 0,
      freezeDays: 14,
      paymentPlan: 'TWO_TRANCHES' as const,
      tranche1Amount: 150000,
      tranche2Amount: 150000,
      totalAmount: 300000,
      monthlyPayment: 37500,
      studyStartDate: new Date('2026-02-01'),
      studyEndDate: new Date('2026-10-01'),
      status: StudentStatus.PENDING_APPROVAL
    },
    {
      firstName: 'Арман',
      lastName: 'Темирбеков',
      parentName: 'Темирбек Касымов',
      parentPhone: '+77772345678',
      gradeLevel: 'GRADE_11' as const,
      school: '№92',
      languageOfStudy: 'RUSSIAN' as const,
      studyGoal: 'CC' as const,
      subjects: ['MATHEMATICS', 'CHEMISTRY', 'BIOLOGY'] as const,
      guarantee: 'EIGHTY_PERCENT' as const,
      studyFormat: 'OFFLINE' as const,
      standardMonths: 6,
      bonusMonths: 0,
      intensiveMonths: 2,
      freezeDays: 7,
      paymentPlan: 'THREE_TRANCHES' as const,
      tranche1Amount: 120000,
      tranche2Amount: 120000,
      tranche3Amount: 120000,
      totalAmount: 360000,
      monthlyPayment: 45000,
      studyStartDate: new Date('2026-01-15'),
      studyEndDate: new Date('2026-09-15'),
      status: StudentStatus.ACTIVE
    },
    {
      firstName: 'Мадина',
      lastName: 'Жумабаева',
      parentName: 'Жумабай Ахметов',
      parentPhone: '+77773456789',
      gradeLevel: 'GRADE_10' as const,
      school: 'Другое',
      languageOfStudy: 'ENGLISH' as const,
      studyGoal: 'IELTS' as const,
      subjects: ['ENGLISH'] as const,
      guarantee: 'NONE' as const,
      studyFormat: 'ONLINE' as const,
      standardMonths: 4,
      bonusMonths: 0,
      intensiveMonths: 0,
      freezeDays: 0,
      paymentPlan: 'ONE_TRANCHE' as const,
      tranche1Amount: 200000,
      totalAmount: 200000,
      monthlyPayment: 50000,
      studyStartDate: new Date('2026-02-10'),
      studyEndDate: new Date('2026-06-10'),
      status: StudentStatus.ACTIVE
    }
  ];

  for (let i = 0; i < students.length; i++) {
    const data = students[i];
    const tempEmail = `student_${Date.now()}_${i}@temp.ertis.kz`;
    const tempPassword = await bcrypt.hash('password123', 10);

    const user = await prisma.user.create({
      data: {
        email: tempEmail,
        password: tempPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.parentPhone,
        role: UserRole.PARENT,
        isActive: true,
      },
    });

    await prisma.student.create({
      data: {
        userId: user.id,
        dateOfBirth: new Date('2008-01-01'),
        gender: Gender.MALE,
        status: data.status,
        parentName: data.parentName,
        parentPhone: data.parentPhone,
        gradeLevel: data.gradeLevel,
        school: data.school,
        languageOfStudy: data.languageOfStudy,
        studyGoal: data.studyGoal,
        subjects: data.subjects,
        guarantee: data.guarantee,
        studyFormat: data.studyFormat,
        standardMonths: data.standardMonths,
        bonusMonths: data.bonusMonths,
        intensiveMonths: data.intensiveMonths,
        freezeDays: data.freezeDays,
        paymentPlan: data.paymentPlan,
        tranche1Amount: data.tranche1Amount,
        tranche2Amount: data.tranche2Amount,
        tranche3Amount: data.tranche3Amount,
        totalAmount: data.totalAmount,
        monthlyPayment: data.monthlyPayment,
        studyStartDate: data.studyStartDate,
        studyEndDate: data.studyEndDate,
      },
    });

    console.log(`✓ Created student: ${data.firstName} ${data.lastName} (${data.status})`);
  }

  console.log('\n✓ All example students created successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
