import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export default async function StudentDashboard() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  // Get student profile
  const student = await prisma.student.findUnique({
    where: {
      userId: session.user.id,
    },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      gradeLevel: { select: { name: true, code: true } },
      language: { select: { name: true, code: true } },
      studyDirection: { select: { name: true, code: true } },
      city: { select: { name: true } },
      school: { select: { name: true } },
      subjects: { select: { subject: { select: { name: true } } } },
    },
  });

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Профиль не найден</h1>
          <p className="text-gray-600 mb-6">
            Ваш профиль студента еще не создан. Обратитесь к координатору.
          </p>
          <a
            href="/dashboard"
            className="inline-block px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Вернуться
          </a>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700',
      ACTIVE: 'bg-green-100 text-green-700',
      INACTIVE: 'bg-gray-100 text-gray-700',
      GRADUATED: 'bg-blue-100 text-blue-700',
      EXPELLED: 'bg-red-100 text-red-700',
    };
    const labels = {
      PENDING_APPROVAL: 'Ожидает подтверждения',
      ACTIVE: 'Активен',
      INACTIVE: 'Неактивен',
      GRADUATED: 'Выпускник',
      EXPELLED: 'Отчислен',
    };
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const formatGradeLevel = (gradeLevel: { name: string; code: string } | null) => {
    if (!gradeLevel) return '-';
    return gradeLevel.name;
  };

  const formatLanguage = (language: { name: string; code: string } | null) => {
    if (!language) return '-';
    return language.name;
  };

  const formatStudyDirection = (direction: { name: string; code: string } | null) => {
    if (!direction) return '-';
    return direction.name;
  };

  const formatSubjects = (subjects: { subject: { name: string } }[]) => {
    if (!subjects || subjects.length === 0) return '-';
    return subjects.map(s => s.subject.name).join(', ');
  };


  const formatGuarantee = (guarantee: string | null) => {
    const guarantees = {
      NONE: 'Нет',
      FIFTY_PERCENT: '50%',
      EIGHTY_PERCENT: '80%',
      HUNDRED_PERCENT: '100%',
    };
    return guarantee ? guarantees[guarantee as keyof typeof guarantees] : '-';
  };

  const formatStudyFormat = (format: string | null) => {
    return format === 'ONLINE' ? 'Онлайн' : format === 'OFFLINE' ? 'Оффлайн' : '-';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {student.user.firstName} {student.user.lastName}
              </h1>
              <p className="text-sm text-gray-600 mt-1">{student.user.email}</p>
            </div>
            <div>
              {getStatusBadge(student.status)}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Личная информация</h2>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-600">Телефон</div>
                <div className="text-sm font-medium text-gray-900">{student.user.phone || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Родитель</div>
                <div className="text-sm font-medium text-gray-900">{student.parentName || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Телефон родителя</div>
                <div className="text-sm font-medium text-gray-900">{student.parentPhone || '-'}</div>
              </div>
            </div>
          </div>

          {/* Academic Information */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Учебная информация</h2>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-600">Класс</div>
                <div className="text-sm font-medium text-gray-900">{formatGradeLevel(student.gradeLevel)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Школа</div>
                <div className="text-sm font-medium text-gray-900">{student.school?.name || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Язык обучения</div>
                <div className="text-sm font-medium text-gray-900">{formatLanguage(student.language)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Направление обучения</div>
                <div className="text-sm font-medium text-gray-900">{formatStudyDirection(student.studyDirection)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Предметы</div>
                <div className="text-sm font-medium text-gray-900">{formatSubjects(student.subjects)}</div>
              </div>
            </div>
          </div>

          {/* Subscription Details */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Подписка</h2>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-600">Формат обучения</div>
                <div className="text-sm font-medium text-gray-900">{formatStudyFormat(student.studyFormat)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Гарантия</div>
                <div className="text-sm font-medium text-gray-900">{formatGuarantee(student.guarantee)}</div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-xs text-gray-600">Стандарт</div>
                  <div className="text-sm font-medium text-gray-900">{student.standardMonths} мес.</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Бонус</div>
                  <div className="text-sm font-medium text-gray-900">{student.bonusMonths} мес.</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Интенсив</div>
                  <div className="text-sm font-medium text-gray-900">{student.intensiveMonths} мес.</div>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Дни заморозки</div>
                <div className="text-sm font-medium text-gray-900">{student.freezeDays} дней</div>
              </div>
              {student.studyStartDate && (
                <div>
                  <div className="text-sm text-gray-600">Период обучения</div>
                  <div className="text-sm font-medium text-gray-900">
                    {new Date(student.studyStartDate).toLocaleDateString('ru-RU')}
                    {student.studyEndDate && ` — ${new Date(student.studyEndDate).toLocaleDateString('ru-RU')}`}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment Information */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Оплата</h2>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-600">Общая сумма</div>
                <div className="text-lg font-bold text-gray-900">
                  {student.totalAmount?.toLocaleString('ru-RU')} ₸
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Ежемесячный платеж</div>
                <div className="text-sm font-medium text-gray-900">
                  {student.monthlyPayment?.toLocaleString('ru-RU')} ₸
                </div>
              </div>
              {student.tranche1Amount && (
                <div className="pt-3 border-t border-gray-100">
                  <div className="text-xs font-medium text-gray-700 mb-2">Траншы</div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Транш 1</span>
                      <span className="font-medium text-gray-900">
                        {student.tranche1Amount.toLocaleString('ru-RU')} ₸
                        {student.tranche1Date && (
                          <span className="text-xs text-gray-500 ml-2">
                            ({new Date(student.tranche1Date).toLocaleDateString('ru-RU')})
                          </span>
                        )}
                      </span>
                    </div>
                    {student.tranche2Amount && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Транш 2</span>
                        <span className="font-medium text-gray-900">
                          {student.tranche2Amount.toLocaleString('ru-RU')} ₸
                          {student.tranche2Date && (
                            <span className="text-xs text-gray-500 ml-2">
                              ({new Date(student.tranche2Date).toLocaleDateString('ru-RU')})
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                    {student.tranche3Amount && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Транш 3</span>
                        <span className="font-medium text-gray-900">
                          {student.tranche3Amount.toLocaleString('ru-RU')} ₸
                          {student.tranche3Date && (
                            <span className="text-xs text-gray-500 ml-2">
                              ({new Date(student.tranche3Date).toLocaleDateString('ru-RU')})
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
