import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '../../components/DashboardLayout';
import DatabaseClient from './DatabaseClient';

export default async function DatabaseSettingsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  // Only ADMIN and SUPERADMIN can access database settings
  if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN') {
    redirect('/dashboard');
  }

  // Fetch all data
  const [branches, subjects, mathTopics] = await Promise.all([
    prisma.branch.findMany({
      orderBy: { name: 'asc' },
      include: {
        classrooms: {
          orderBy: { name: 'asc' },
        },
      },
    }),
    prisma.taskSubject.findMany({
      orderBy: { orderIndex: 'asc' },
    }),
    prisma.taskTopic.findMany({
      where: {
        subject: {
          name: 'Математика',
        },
      },
      orderBy: { orderIndex: 'asc' },
      include: {
        subtopics: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    }),
  ]);

  return (
    <DashboardLayout
      user={{
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        email: session.user.email,
        role: session.user.role,
      }}
      title="Настройки базы данных"
    >
      <DatabaseClient
        initialBranches={branches}
        initialSubjects={subjects}
        initialMathTopics={mathTopics}
        userRole={session.user.role}
      />
    </DashboardLayout>
  );
}
