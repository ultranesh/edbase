'use client';

import { useState } from 'react';
import { StudentStatus } from '@prisma/client';
import StudentDetailSlideOver from './StudentDetailSlideOver';
import { useNotification } from '@/app/components/ui/NotificationProvider';

interface Student {
  id: string;
  status: StudentStatus;
  parentName: string | null;
  parentPhone: string | null;
  // Reference relations
  gradeLevel: { name: string; code: string } | null;
  language: { name: string; code: string } | null;
  studyDirection: { name: string; code: string } | null;
  city: { name: string } | null;
  school: { name: string } | null;
  subjects: { subject: { name: string } }[];
  guarantee: string | null;
  studyFormat: string | null;
  standardMonths: number;
  bonusMonths: number;
  intensiveMonths: number;
  freezeDays: number;
  freezeEndDate: Date | null;
  paymentPlan: string | null;
  tranche1Amount: number | null;
  tranche1Date: Date | null;
  tranche2Amount: number | null;
  tranche2Date: Date | null;
  tranche3Amount: number | null;
  tranche3Date: Date | null;
  totalAmount: number | null;
  monthlyPayment: number | null;
  studyStartDate: Date | null;
  studyEndDate: Date | null;
  contractConfirmed: boolean;
  contractConfirmedAt: Date | null;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
  createdAt: Date;
}

interface StudentsClientProps {
  initialStudents: Student[];
  pendingStudents: Student[];
  awaitingContractStudents: Student[];
  userRole: string;
}

export default function StudentsClient({
  initialStudents,
  pendingStudents,
  awaitingContractStudents,
  userRole,
}: StudentsClientProps) {
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [pending, setPending] = useState<Student[]>(pendingStudents);
  const [awaitingContract, setAwaitingContract] = useState<Student[]>(awaitingContractStudents);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const { showToast, showConfirm, showPrompt } = useNotification();

  const isCurator = userRole === 'CURATOR' || userRole === 'ADMIN' || userRole === 'SUPERADMIN';
  const canConfirmContract = userRole === 'ADMIN' || userRole === 'SUPERADMIN';

  // Format date consistently for SSR and client
  const formatDate = (date: Date) => {
    const d = new Date(date);
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    return `${day.toString().padStart(2, '0')}.${month.toString().padStart(2, '0')}.${year}`;
  };

  const handleStudentClick = (student: Student) => {
    setSelectedStudent(student);
    setIsSlideOverOpen(true);
  };

  const handleUpdate = () => {
    // Refresh the page to get updated data
    window.location.reload();
  };

  const handleApprove = async (studentId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      const response = await fetch(`/api/students/${studentId}/approve`, {
        method: 'POST',
      });

      if (response.ok) {
        // Remove from pending and add to awaiting contract (not active yet!)
        const approved = pending.find(s => s.id === studentId);
        if (approved) {
          setPending(prev => prev.filter(s => s.id !== studentId));
          setAwaitingContract(prev => [...prev, { ...approved, status: StudentStatus.ACTIVE, contractConfirmed: false }]);
        }
        showToast({ message: 'Ученик одобрен', type: 'success' });
      } else {
        showToast({ message: 'Ошибка при подтверждении ученика', type: 'error' });
      }
    } catch (error) {
      console.error(error);
      showToast({ message: 'Ошибка при подтверждении ученика', type: 'error' });
    }
  };

  const handleReject = async (studentId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const confirmed = await showConfirm({
      title: 'Отклонить ученика',
      message: 'Вы уверены, что хотите отклонить этого ученика?',
      confirmText: 'Отклонить',
      cancelText: 'Отмена',
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/students/${studentId}/reject`, {
        method: 'POST',
      });

      if (response.ok) {
        setPending(prev => prev.filter(s => s.id !== studentId));
        showToast({ message: 'Ученик отклонен', type: 'success' });
      } else {
        showToast({ message: 'Ошибка при отклонении ученика', type: 'error' });
      }
    } catch (error) {
      console.error(error);
      showToast({ message: 'Ошибка при отклонении ученика', type: 'error' });
    }
  };

  const handleConfirmContract = async (studentId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      const response = await fetch(`/api/contracts/${studentId}/confirm`, {
        method: 'POST',
      });

      if (response.ok) {
        // Move from awaiting contract to active students
        const contractStudent = awaitingContract.find(s => s.id === studentId);
        if (contractStudent) {
          setAwaitingContract(prev => prev.filter(s => s.id !== studentId));
          setStudents(prev => {
            const updated = [...prev, { ...contractStudent, contractConfirmed: true, contractConfirmedAt: new Date() }];
            // Re-sort: FROZEN first, then ACTIVE, then others
            return updated.sort((a, b) => {
              const statusOrder: Record<string, number> = {
                [StudentStatus.FROZEN]: 1,
                [StudentStatus.ACTIVE]: 2,
                [StudentStatus.INACTIVE]: 3,
              };
              const statusDiff = (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
              if (statusDiff !== 0) return statusDiff;
              return a.user.lastName.localeCompare(b.user.lastName, 'ru');
            });
          });
        }
        showToast({ message: 'Договор подтвержден', type: 'success' });
      } else {
        showToast({ message: 'Ошибка при подтверждении договора', type: 'error' });
      }
    } catch (error) {
      console.error(error);
      showToast({ message: 'Ошибка при подтверждении договора', type: 'error' });
    }
  };

  const handleFreeze = async (studentId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const daysInput = await showPrompt({
      title: 'Заморозка ученика',
      message: `Сколько дней заморозки? Доступно: ${student.freezeDays} дней`,
      placeholder: 'Количество дней',
      inputType: 'number',
      confirmText: 'Заморозить',
      cancelText: 'Отмена',
    });

    if (!daysInput) return;

    const days = parseInt(daysInput);
    if (isNaN(days) || days <= 0) {
      showToast({ message: 'Пожалуйста, введите корректное количество дней', type: 'warning' });
      return;
    }

    if (days > student.freezeDays) {
      showToast({ message: `Недостаточно дней заморозки. Доступно: ${student.freezeDays} дней`, type: 'warning' });
      return;
    }

    try {
      const response = await fetch(`/api/students/${studentId}/freeze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days }),
      });

      if (response.ok) {
        const data = await response.json();
        setStudents(prev => {
          const updated = prev.map(s =>
            s.id === studentId ? { ...s, status: StudentStatus.FROZEN, freezeEndDate: data.student.freezeEndDate } : s
          );
          // Re-sort after status change
          return updated.sort((a, b) => {
            const statusOrder: Record<string, number> = {
              [StudentStatus.FROZEN]: 1,
              [StudentStatus.ACTIVE]: 2,
              [StudentStatus.INACTIVE]: 3,
            };
            const statusDiff = (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
            if (statusDiff !== 0) return statusDiff;
            return a.user.lastName.localeCompare(b.user.lastName, 'ru');
          });
        });
        showToast({ message: `Ученик заморожен на ${days} дней`, type: 'success' });
      } else {
        const errorData = await response.json();
        showToast({ message: errorData.error || 'Ошибка при заморозке ученика', type: 'error' });
      }
    } catch (error) {
      console.error(error);
      showToast({ message: 'Ошибка при заморозке ученика', type: 'error' });
    }
  };

  const handleUnfreeze = async (studentId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const confirmed = await showConfirm({
      title: 'Разморозить ученика',
      message: 'Вы уверены, что хотите разморозить этого ученика?',
      confirmText: 'Разморозить',
      cancelText: 'Отмена',
      type: 'info',
    });
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/students/${studentId}/unfreeze`, {
        method: 'POST',
      });

      if (response.ok) {
        setStudents(prev => {
          const updated = prev.map(s =>
            s.id === studentId ? { ...s, status: StudentStatus.ACTIVE, freezeEndDate: null } : s
          );
          // Re-sort after status change
          return updated.sort((a, b) => {
            const statusOrder: Record<string, number> = {
              [StudentStatus.FROZEN]: 1,
              [StudentStatus.ACTIVE]: 2,
              [StudentStatus.INACTIVE]: 3,
            };
            const statusDiff = (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
            if (statusDiff !== 0) return statusDiff;
            return a.user.lastName.localeCompare(b.user.lastName, 'ru');
          });
        });
        showToast({ message: 'Ученик разморожен', type: 'success' });
      } else {
        showToast({ message: 'Ошибка при разморозке ученика', type: 'error' });
      }
    } catch (error) {
      console.error(error);
      showToast({ message: 'Ошибка при разморозке ученика', type: 'error' });
    }
  };

  const handleDeactivate = async (studentId: string, currentStatus: StudentStatus, event: React.MouseEvent) => {
    event.stopPropagation();
    const isActive = currentStatus === StudentStatus.ACTIVE || currentStatus === StudentStatus.FROZEN;

    const confirmed = await showConfirm({
      title: isActive ? 'Деактивировать ученика' : 'Активировать ученика',
      message: isActive
        ? 'Вы уверены, что хотите деактивировать этого ученика?'
        : 'Вы уверены, что хотите активировать этого ученика?',
      confirmText: isActive ? 'Деактивировать' : 'Активировать',
      cancelText: 'Отмена',
      type: isActive ? 'danger' : 'info',
    });
    if (!confirmed) return;

    try {
      const newStatus = isActive ? StudentStatus.INACTIVE : StudentStatus.ACTIVE;
      const response = await fetch(`/api/students/${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setStudents(prev => {
          const updated = prev.map(s =>
            s.id === studentId ? { ...s, status: newStatus } : s
          );
          // Re-sort after status change
          return updated.sort((a, b) => {
            const statusOrder: Record<string, number> = {
              [StudentStatus.FROZEN]: 1,
              [StudentStatus.ACTIVE]: 2,
              [StudentStatus.INACTIVE]: 3,
            };
            const statusDiff = (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
            if (statusDiff !== 0) return statusDiff;
            return a.user.lastName.localeCompare(b.user.lastName, 'ru');
          });
        });
        showToast({ message: isActive ? 'Ученик деактивирован' : 'Ученик активирован', type: 'success' });
      } else {
        showToast({ message: 'Ошибка при изменении статуса ученика', type: 'error' });
      }
    } catch (error) {
      console.error(error);
      showToast({ message: 'Ошибка при изменении статуса ученика', type: 'error' });
    }
  };

  const getStatusBadge = (status: StudentStatus) => {
    const badges: Record<StudentStatus, { label: string; className: string }> = {
      PENDING_APPROVAL: { label: 'Ожидает', className: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
      ACTIVE: { label: 'Активный', className: 'bg-green-50 text-green-700 border border-green-200' },
      FROZEN: { label: 'Заморозка', className: 'bg-blue-50 text-blue-700 border border-blue-200' },
      REFUND: { label: 'Возврат', className: 'bg-orange-50 text-orange-700 border border-orange-200' },
      GRADUATED: { label: 'Окончил', className: 'bg-purple-50 text-purple-700 border border-purple-200' },
      INACTIVE: { label: 'Неактивен', className: 'bg-gray-50 text-gray-700 border border-gray-200' },
      EXPELLED: { label: 'Отчислен', className: 'bg-red-50 text-red-700 border border-red-200' },
    };
    return badges[status] || { label: status, className: 'bg-gray-50 text-gray-700 border border-gray-200' };
  };

  return (
    <>
      <div className="space-y-8">
        {/* Pending approvals - only for curators */}
        {isCurator && pending.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Ожидают подтверждения ({pending.length})
                </h2>
                <p className="text-sm text-gray-500">
                  Новые ученики, зачисленные координаторами
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-yellow-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-yellow-50 border-b border-yellow-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Ученик</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Родитель</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Класс</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Школа</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Дата</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-700">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-yellow-100">
                    {pending.map((student) => (
                      <tr
                        key={student.id}
                        className="hover:bg-yellow-50/50 transition-colors cursor-pointer"
                        onClick={() => handleStudentClick(student)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-yellow-500 flex items-center justify-center shrink-0">
                              <span className="text-xs font-medium text-white">
                                {student.user.firstName[0]}{student.user.lastName[0]}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {student.user.firstName} {student.user.lastName}
                              </div>
                              <div className="text-xs text-gray-500">{student.user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{student.parentName || '-'}</div>
                          <div className="text-xs text-gray-500">{student.parentPhone || ''}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900">{student.gradeLevel?.name || '-'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900">{student.school?.name || '-'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-500">
                            {new Date(student.createdAt).toLocaleDateString('ru-RU')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => handleApprove(student.id, e)}
                              className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
                            >
                              Подтвердить
                            </button>
                            <button
                              onClick={(e) => handleReject(student.id, e)}
                              className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors"
                            >
                              Отклонить
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Awaiting contract confirmation - only for curators */}
        {isCurator && awaitingContract.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Ожидают подтверждения договора ({awaitingContract.length})
                </h2>
                <p className="text-sm text-gray-500">
                  Ученики одобрены, но договор еще не подтвержден
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-orange-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-orange-50 border-b border-orange-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Ученик</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Родитель</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Класс</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Школа</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Статус</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-700">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orange-100">
                    {awaitingContract.map((student) => (
                      <tr
                        key={student.id}
                        className="hover:bg-orange-50/50 transition-colors cursor-pointer"
                        onClick={() => handleStudentClick(student)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
                              <span className="text-xs font-medium text-white">
                                {student.user.firstName[0]}{student.user.lastName[0]}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {student.user.firstName} {student.user.lastName}
                              </div>
                              <div className="text-xs text-gray-500">{student.user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{student.parentName || '-'}</div>
                          <div className="text-xs text-gray-500">{student.parentPhone || ''}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900">{student.gradeLevel?.name || '-'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900">{student.school?.name || '-'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-lg bg-orange-100 text-orange-700 border border-orange-200">
                            Ожидает договор
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {canConfirmContract && (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={(e) => handleConfirmContract(student.id, e)}
                                className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
                              >
                                Подтвердить договор
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Active students table */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Активные ученики ({students.length})
              </h2>
            </div>
          </div>

          {students.length > 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Ученик</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Контакты</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Родитель</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Класс</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Школа</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Статус</th>
                      {isCurator && (
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-700">Действия</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {students.map((student) => (
                      <tr
                        key={student.id}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => handleStudentClick(student)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                              student.status === StudentStatus.FROZEN ? 'bg-blue-500' :
                              student.status === StudentStatus.INACTIVE ? 'bg-gray-400' :
                              'bg-blue-600'
                            }`}>
                              <span className="text-xs font-medium text-white">
                                {student.user.firstName[0]}{student.user.lastName[0]}
                              </span>
                            </div>
                            <div className="text-sm font-medium text-gray-900">
                              {student.user.firstName} {student.user.lastName}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{student.user.email}</div>
                          {student.user.phone && (
                            <div className="text-xs text-gray-500">{student.user.phone}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{student.parentName || '-'}</div>
                          {student.parentPhone && (
                            <div className="text-xs text-gray-500">{student.parentPhone}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900">{student.gradeLevel?.name || '-'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900">{student.school?.name || '-'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-lg ${getStatusBadge(student.status).className}`}>
                              {getStatusBadge(student.status).label}
                            </span>
                            {student.status === StudentStatus.FROZEN && student.freezeEndDate && (
                              <span className="text-xs text-gray-500">
                                до {formatDate(student.freezeEndDate)}
                              </span>
                            )}
                            {student.status === StudentStatus.ACTIVE && student.studyEndDate && (
                              <span className="text-xs text-gray-500">
                                до {formatDate(student.studyEndDate)}
                              </span>
                            )}
                          </div>
                        </td>
                        {isCurator && (
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {student.status === StudentStatus.ACTIVE && (
                                <button
                                  onClick={(e) => handleFreeze(student.id, e)}
                                  className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                  Заморозить
                                </button>
                              )}
                              {student.status === StudentStatus.FROZEN && (
                                <button
                                  onClick={(e) => handleUnfreeze(student.id, e)}
                                  className="px-3 py-1.5 text-xs font-medium text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                                >
                                  Разморозить
                                </button>
                              )}
                              <button
                                onClick={(e) => handleDeactivate(student.id, student.status, e)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                  student.status === StudentStatus.ACTIVE || student.status === StudentStatus.FROZEN
                                    ? 'text-red-600 hover:bg-red-50'
                                    : 'text-green-600 hover:bg-green-50'
                                }`}
                              >
                                {student.status === StudentStatus.ACTIVE || student.status === StudentStatus.FROZEN
                                  ? 'Деактивировать'
                                  : 'Активировать'}
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 p-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Учеников пока нет</h3>
                <p className="text-sm text-gray-500">Зачислите первого ученика через форму зачисления</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <StudentDetailSlideOver
        student={selectedStudent}
        isOpen={isSlideOverOpen}
        onClose={() => {
          setIsSlideOverOpen(false);
          setSelectedStudent(null);
        }}
        onUpdate={handleUpdate}
        userRole={userRole}
      />
    </>
  );
}
