import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '../components/DashboardLayout';
import GroupsClient from './GroupsClient';

export default async function GroupsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  // Fetch all required data
  const [
    groups,
    gradeLevels,
    languages,
    studyDirections,
    groupIndexes,
    branches,
    subjects,
    teachers,
    students,
  ] = await Promise.all([
    prisma.group.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        gradeLevel: { select: { id: true, name: true, code: true } },
        language: { select: { id: true, name: true, code: true } },
        studyDirection: { select: { id: true, name: true, code: true } },
        groupIndex: { select: { id: true, name: true, symbol: true } },
        branch: { select: { id: true, name: true } },
        teacher: {
          select: {
            id: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
        subjects: {
          include: {
            subject: { select: { id: true, nameRu: true, nameKz: true } },
          },
        },
        students: {
          include: {
            student: {
              select: {
                id: true,
                user: { select: { firstName: true, lastName: true } },
                gradeLevel: { select: { name: true, code: true } },
                language: { select: { name: true, code: true } },
                studyDirection: { select: { name: true, code: true } },
              },
            },
          },
        },
      },
    }),
    prisma.refGradeLevel.findMany({ where: { isActive: true }, orderBy: { orderIndex: 'asc' } }),
    prisma.refLanguage.findMany({ where: { isActive: true } }),
    prisma.refStudyDirection.findMany({ where: { isActive: true } }),
    prisma.refGroupIndex.findMany({ where: { isActive: true }, orderBy: { orderIndex: 'asc' } }),
    prisma.branch.findMany({ where: { isActive: true } }),
    prisma.refSubject.findMany({ where: { isActive: true }, orderBy: { orderIndex: 'asc' } }),
    prisma.teacher.findMany({
      where: { isActive: true },
      select: {
        id: true,
        user: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.student.findMany({
      where: { status: { not: 'PENDING_APPROVAL' } },
      select: {
        id: true,
        user: { select: { firstName: true, lastName: true } },
        gradeLevel: { select: { id: true, name: true, code: true } },
        language: { select: { id: true, name: true, code: true } },
        studyDirection: { select: { id: true, name: true, code: true } },
        groupStudents: { select: { groupId: true } },
      },
      orderBy: { user: { lastName: 'asc' } },
    }),
  ]);

  return (
    <DashboardLayout
      user={{
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        iin: session.user.iin || undefined,
        role: session.user.role,
        switchToken: (session.user as any).switchToken || undefined,
      }}
      titleKey="groups.title"
    >
      <GroupsClient
        initialGroups={groups}
        gradeLevels={gradeLevels}
        languages={languages}
        studyDirections={studyDirections}
        groupIndexes={groupIndexes}
        branches={branches}
        subjects={subjects.map(s => ({ ...s, name: s.nameRu || s.nameKz || '' }))}
        teachers={teachers}
        students={students}
        userRole={session.user.role}
      />
    </DashboardLayout>
  );
}
