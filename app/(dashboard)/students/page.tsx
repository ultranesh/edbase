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

  // Common select fields for students
  const studentSelect = {
    id: true,
    status: true,
    parentName: true,
    parentPhone: true,
    guarantee: true,
    studyFormat: true,
    standardMonths: true,
    bonusMonths: true,
    intensiveMonths: true,
    freezeDays: true,
    freezeEndDate: true,
    paymentPlan: true,
    tranche1Amount: true,
    tranche1Date: true,
    tranche2Amount: true,
    tranche2Date: true,
    tranche3Amount: true,
    tranche3Date: true,
    totalAmount: true,
    monthlyPayment: true,
    studyStartDate: true,
    studyEndDate: true,
    createdAt: true,
    contractConfirmed: true,
    contractConfirmedAt: true,
    // Reference relations
    gradeLevel: { select: { name: true, code: true } },
    language: { select: { name: true, code: true } },
    studyDirection: { select: { name: true, code: true } },
    city: { select: { name: true } },
    school: { select: { name: true } },
    subjects: { select: { subject: { select: { name: true } } } },
    user: {
      select: {
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
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
        email: session.user.email,
        role: session.user.role,
      }}
      title="Ученики"
    >
      <StudentsClient
        initialStudents={sortedStudents}
        pendingStudents={pendingStudents}
        awaitingContractStudents={awaitingContractStudents}
        userRole={session.user.role}
      />
    </DashboardLayout>
  );
}
