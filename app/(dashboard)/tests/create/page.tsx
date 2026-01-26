import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import TestForm from './TestForm';

export default async function CreateTestPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const isTeacher = session.user.role === UserRole.TEACHER ||
                    session.user.role === UserRole.ADMIN ||
                    session.user.role === UserRole.SUPERADMIN;

  if (!isTeacher) {
    redirect('/tests');
  }

  // Fetch courses and topics/lessons for the dropdown
  const coursesData = await prisma.course.findMany({
    include: {
      topics: {
        orderBy: {
          orderIndex: 'asc',
        },
        select: {
          id: true,
          title: true,
          lessons: {
            orderBy: {
              orderIndex: 'asc',
            },
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
    orderBy: {
      title: 'asc',
    },
  });

  // Transform data to flatten lessons from topics
  const courses = coursesData.map(course => ({
    id: course.id,
    title: course.title,
    lessons: course.topics.flatMap(topic => topic.lessons),
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              Создать тест
            </h1>
            <div className="flex items-center gap-4">
              <a
                href="/tests"
                className="text-sm text-gray-700 hover:text-gray-900"
              >
                ← Назад к тестам
              </a>
              <span className="text-sm text-gray-700">
                {session.user.firstName} {session.user.lastName}
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                {session.user.role}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <TestForm courses={courses} />
      </main>
    </div>
  );
}
