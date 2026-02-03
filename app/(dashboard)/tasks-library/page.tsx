import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '../components/DashboardLayout';
import TasksLibraryClient from './TasksLibraryClient';

export default async function TasksLibraryPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  // Fetch filter options
  const [subjects, formats, difficulties] = await Promise.all([
    prisma.taskSubject.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: 'asc' },
      include: {
        taskTopics: {
          where: { isActive: true },
          orderBy: { orderIndex: 'asc' },
          include: {
            subtopics: {
              where: { isActive: true },
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
    }),
    // TaskFormat enum values
    Promise.resolve(['NISH', 'BIL', 'RFMSH', 'ENT', 'OLYMPIAD', 'SAT']),
    // DifficultyLevel enum values
    Promise.resolve(['BEGINNER', 'ELEMENTARY', 'PRE_INTERMEDIATE', 'INTERMEDIATE', 'UPPER_INTERMEDIATE', 'ADVANCED']),
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
      titleKey="tasksLibrary.title"
    >
      <TasksLibraryClient
        subjects={subjects}
        formats={formats}
        difficulties={difficulties}
        userRole={session.user.role}
      />
    </DashboardLayout>
  );
}
