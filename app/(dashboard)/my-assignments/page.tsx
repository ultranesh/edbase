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
        email: session.user.email,
        role: session.user.role,
      }}
      title="Мои задания"
    >
      <div className="mb-6">
        <p className="text-sm text-gray-700 font-medium">
          Всего заданий: {tests.length}
        </p>
      </div>

      {tests.length > 0 ? (
        <div className="space-y-3">
          {tests.map((test) => (
            <div
              key={test.id}
              className="p-5 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-base font-semibold text-gray-900">
                      {test.title}
                    </h3>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      test.type === 'QUIZ'
                        ? 'bg-blue-100 text-blue-800'
                        : test.type === 'MIDTERM'
                        ? 'bg-yellow-100 text-yellow-800'
                        : test.type === 'FINAL'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {test.type === 'QUIZ' ? 'Опрос' : test.type === 'MIDTERM' ? 'Промежуточный' : test.type === 'FINAL' ? 'Финальный' : 'Практика'}
                    </span>
                    {test.isActive ? (
                      <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        Активен
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-700 rounded-full">
                        Черновик
                      </span>
                    )}
                  </div>

                  {test.description && (
                    <p className="text-sm text-gray-700 mb-3">
                      {test.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700">
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
                    <div className="mt-2 text-sm text-gray-600">
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
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-800 font-medium mb-2">Заданий пока нет</p>
          <p className="text-sm text-gray-600">
            Здесь будут отображаться ваши тесты, экзамены и другие задания
          </p>
        </div>
      )}
    </DashboardLayout>
  );
}
