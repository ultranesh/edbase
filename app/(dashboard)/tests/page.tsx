import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import Link from 'next/link';
import DashboardLayout from '../components/DashboardLayout';

export default async function TestsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const isTeacher = session.user.role === UserRole.TEACHER ||
                    session.user.role === UserRole.ADMIN ||
                    session.user.role === UserRole.SUPERADMIN;

  // Check if there are any courses first
  const coursesCount = await prisma.course.count();

  // Fetch all tests with related data only if courses exist
  const tests = coursesCount > 0 ? await prisma.test.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      group: {
        include: {
          course: {
            select: {
              title: true,
            },
          },
        },
      },
      questions: {
        select: {
          id: true,
        },
      },
      _count: {
        select: {
          attempts: true,
        },
      },
    },
  }) : [];

  return (
    <DashboardLayout
      user={{
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        email: session.user.email,
        role: session.user.role,
      }}
      title="Тесты"
      rightActions={
        isTeacher ? (
          <Link
            href="/tests/create"
            className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            Создать тест
          </Link>
        ) : undefined
      }
    >
      <div className="mb-6">
        <p className="text-sm text-gray-600">
          Всего тестов: {tests.length}
        </p>
      </div>

        {tests.length > 0 ? (
          <div className="space-y-3">
            {tests.map((test) => (
              <div
                key={test.id}
                className="p-5 bg-white rounded-2xl border border-gray-200 hover:border-gray-300 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-sm font-medium text-gray-900">
                        {test.title}
                      </h3>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        test.type === 'QUIZ'
                          ? 'bg-blue-100 text-blue-700'
                          : test.type === 'MIDTERM'
                          ? 'bg-yellow-100 text-yellow-700'
                          : test.type === 'FINAL'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {test.type}
                      </span>
                      {test.isActive ? (
                        <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                          Активен
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded-full">
                          Черновик
                        </span>
                      )}
                    </div>

                    {test.description && (
                      <p className="text-xs text-gray-600 mb-3">
                        {test.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                      {test.group?.course && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Курс:</span>
                          <span>{test.group.course.title}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Группа:</span>
                        <span>{test.group.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Вопросов:</span>
                        <span>{test.questions.length}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Длительность:</span>
                        <span>{test.duration} мин</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Попыток:</span>
                        <span>{test._count.attempts}</span>
                      </div>
                    </div>

                    {test.startDate && (
                      <div className="mt-2 text-xs text-gray-500">
                        <span className="font-medium">Начало:</span>{' '}
                        {new Date(test.startDate).toLocaleString('ru-RU')}
                        {test.endDate && (
                          <>
                            {' '}<span className="font-medium">Конец:</span>{' '}
                            {new Date(test.endDate).toLocaleString('ru-RU')}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Link
                      href={`/tests/${test.id}`}
                      className="px-3 py-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Просмотр
                    </Link>
                    {isTeacher && (
                      <Link
                        href={`/tests/${test.id}/edit`}
                        className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 font-medium"
                      >
                        Редактировать
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gray-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            {coursesCount === 0 ? (
              <>
                <p className="text-gray-900 font-medium">Для создания тестов нужны курсы и уроки</p>
                <p className="text-sm text-gray-500 mt-1">Сначала создайте курс и добавьте к нему уроки</p>
              </>
            ) : (
              <>
                <p className="text-gray-900 font-medium">Тестов пока нет</p>
                {isTeacher && (
                  <Link
                    href="/tests/create"
                    className="inline-block mt-4 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    Создать первый тест
                  </Link>
                )}
              </>
            )}
          </div>
        )}
    </DashboardLayout>
  );
}
