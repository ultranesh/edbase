import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { StudentStatus } from '@prisma/client';
import DashboardLayout from '../components/DashboardLayout';
import StudentsClient from './StudentsClient';

export default async function StudentsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  // Fetch reference data for filters
  const [gradeLevels, languages, studyDirections, cities, schools, branches, specialNeeds] = await Promise.all([
    prisma.refGradeLevel.findMany({ where: { isActive: true }, orderBy: { orderIndex: 'asc' } }),
    prisma.refLanguage.findMany({ where: { isActive: true } }),
    prisma.refStudyDirection.findMany({ where: { isActive: true } }),
    prisma.refCity.findMany({ where: { isActive: true } }),
    prisma.refSchool.findMany({ where: { isActive: true } }),
    prisma.branch.findMany({ where: { isActive: true } }),
    prisma.refSpecialNeed.findMany({ where: { isActive: true } }),
  ]);

  // Common select fields for students
  const studentSelect = {
    id: true,
    status: true,
    // Student info
    studentIIN: true,
    citizenship: true,
    dateOfBirth: true,
    gender: true,
    address: true,
    // Parent info
    parentName: true,
    parentPhone: true,
    parentIIN: true,
    parentDocumentType: true,
    parentDocumentNumber: true,
    // Study conditions
    guarantee: true,
    studyFormat: true,
    studySchedule: true,
    customDays: true,
    allergy: true,
    // Subscription
    standardMonths: true,
    bonusMonths: true,
    intensiveMonths: true,
    freezeDays: true,
    freezeEndDate: true,
    // Payment
    paymentPlan: true,
    tranche1Amount: true,
    tranche1Date: true,
    tranche2Amount: true,
    tranche2Date: true,
    tranche3Amount: true,
    tranche3Date: true,
    totalAmount: true,
    monthlyPayment: true,
    // Study period
    studyStartDate: true,
    studyEndDate: true,
    createdAt: true,
    contractConfirmed: true,
    contractConfirmedAt: true,
    // Reference relations (include IDs for editing)
    gradeLevelId: true,
    gradeLevel: { select: { id: true, name: true, code: true } },
    languageId: true,
    language: { select: { id: true, name: true, code: true } },
    studyDirectionId: true,
    studyDirection: { select: { id: true, name: true, code: true } },
    cityId: true,
    city: { select: { id: true, name: true } },
    schoolId: true,
    school: { select: { id: true, name: true } },
    branchId: true,
    branch: { select: { id: true, name: true } },
    subjects: { select: { subject: { select: { id: true, nameRu: true, nameKz: true } } } },
    specialNeeds: { select: { specialNeed: { select: { id: true, name: true } } } },
    user: {
      select: {
        firstName: true,
        lastName: true,
        middleName: true,
        phone: true,
        avatar: true,
      },
    },
  } as const;

  // Fetch all students except pending
  const allStudents = await prisma.student.findMany({
    where: {
      status: {
        not: StudentStatus.PENDING_APPROVAL,
      },
    },
    select: studentSelect,
  });

  // Sort students: FROZEN first, then ACTIVE, then others (INACTIVE, etc.)
  // Within each group, sort alphabetically by lastName
  const statusOrder: Record<string, number> = {
    [StudentStatus.FROZEN]: 1,
    [StudentStatus.ACTIVE]: 2,
    [StudentStatus.INACTIVE]: 3,
    [StudentStatus.GRADUATED]: 4,
    [StudentStatus.EXPELLED]: 5,
    [StudentStatus.REFUND]: 6,
  };

  const sortedStudents = allStudents
    .filter(s => s.contractConfirmed) // Only confirmed contracts
    .sort((a, b) => {
      const statusDiff = (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
      if (statusDiff !== 0) return statusDiff;
      return a.user.lastName.localeCompare(b.user.lastName, 'ru');
    });

  // Students awaiting contract confirmation (approved but contract not confirmed)
  const awaitingContractStudents = allStudents
    .filter(s => !s.contractConfirmed)
    .sort((a, b) => a.user.lastName.localeCompare(b.user.lastName, 'ru'));

  // Fetch pending students (only for curators)
  const isCurator = session.user.role === 'CURATOR' ||
                    session.user.role === 'ADMIN' ||
                    session.user.role === 'SUPERADMIN';

  const pendingStudents = isCurator
    ? await prisma.student.findMany({
        where: {
          status: StudentStatus.PENDING_APPROVAL,
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: studentSelect,
      })
    : [];

  return (
    <DashboardLayout
      user={{
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        iin: session.user.iin || undefined,
        role: session.user.role,
        switchToken: (session.user as any).switchToken || undefined,
      }}
      titleKey="students.title"
    >
      <StudentsClient
        initialStudents={sortedStudents}
        pendingStudents={pendingStudents}
        awaitingContractStudents={awaitingContractStudents}
        userRole={session.user.role}
        filterOptions={{
          gradeLevels: gradeLevels.map(g => ({ id: g.id, name: g.name })),
          languages: languages.map(l => ({ id: l.id, name: l.name })),
          studyDirections: studyDirections.map(d => ({ id: d.id, name: d.name })),
          cities: cities.map(c => ({ id: c.id, name: c.name })),
          schools: schools.map(s => ({ id: s.id, name: s.name })),
          branches: branches.map(b => ({ id: b.id, name: b.name })),
          specialNeeds: specialNeeds.map(s => ({ id: s.id, name: s.name })),
        }}
      />
    </DashboardLayout>
  );
}
