import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import DashboardLayout from '../components/DashboardLayout';

export default async function MyAssignmentsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  // Fetch all tests with related data
  const tests = await prisma.test.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      group: {
        select: {
          id: true,
          name: true,
          course: {
            select: {
              title: true,
            },
          },
        },
      },
      createdBy: {
        select: {
          firstName: true,
          lastName: true,
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
  });

  return (
    <DashboardLayout
      user={{
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        iin: session.user.iin || undefined,
        role: session.user.role,
        switchToken: (session.user as any).switchToken || undefined,
      }}
      titleKey="myAssignments.title"
    >
      <div className="mb-6">
        <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
          Всего заданий: {tests.length}
        </p>
      </div>

      {tests.length > 0 ? (
        <div className="space-y-3">
          {tests.map((test) => (
            <div
              key={test.id}
              className="p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      {test.title}
                    </h3>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      test.type === 'QUIZ'
                        ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300'
                        : test.type === 'MIDTERM'
                        ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300'
                        : test.type === 'FINAL'
                        ? 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300'
                        : 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300'
                    }`}>
                      {test.type === 'QUIZ' ? 'Опрос' : test.type === 'MIDTERM' ? 'Промежуточный' : test.type === 'FINAL' ? 'Финальный' : 'Практика'}
                    </span>
                    {test.isActive ? (
                      <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 rounded-full">
                        Активен
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                        Черновик
                      </span>
                    )}
                  </div>

                  {test.description && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                      {test.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700 dark:text-gray-300">
                    {test.group && (
                      <>
                        {test.group.course && (
                          <div className="flex items-center gap-1">
                            <span className="font-medium">Курс:</span>
                            <span>{test.group.course.title}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Группа:</span>
                          <span>{test.group.name}</span>
                        </div>
                      </>
                    )}
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
                    {test.createdBy && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Автор:</span>
                        <span>{test.createdBy.firstName} {test.createdBy.lastName}</span>
                      </div>
                    )}
                  </div>

                  {test.startDate && (
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
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
                    className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Начать
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-800 dark:text-gray-200 font-medium mb-2">Заданий пока нет</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Здесь будут отображаться ваши тесты, экзамены и другие задания
          </p>
        </div>
      )}
    </DashboardLayout>
  );
}
