'use client';

import { useState } from 'react';
import TeacherDetailSlideOver from './TeacherDetailSlideOver';

interface RefOption {
  id: string;
  name: string;
}

interface Teacher {
  id: string;
  dateOfBirth: Date | null;
  iin: string | null;
  phone: string | null;
  categoryId: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'RESERVE';
  salaryFormat: 'HOURLY' | 'MONTHLY' | null;
  salaryAmount: number | null;
  isActive: boolean;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    middleName: string | null;
    email: string;
    phone: string | null;
    lastLogin: Date | null;
    createdAt: Date;
  };
  category: RefOption | null;
  subjects: { id: string; subject: RefOption }[];
  branches: { id: string; branch: RefOption }[];
}

interface TeachersClientProps {
  initialTeachers: Teacher[];
  subjects: RefOption[];
  branches: RefOption[];
  categories: RefOption[];
  userRole: string;
}

export default function TeachersClient({
  initialTeachers,
  subjects,
  branches,
  categories,
  userRole,
}: TeachersClientProps) {
  const [teachers] = useState<Teacher[]>(initialTeachers);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'suspended' | 'reserve'>('all');

  const handleTeacherClick = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setIsSlideOverOpen(true);
  };

  const handleCloseSlideOver = () => {
    setIsSlideOverOpen(false);
    setSelectedTeacher(null);
  };

  const handleUpdate = () => {
    window.location.reload();
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      ACTIVE: { label: 'Активный', className: 'bg-green-50 text-green-700 border border-green-200' },
      SUSPENDED: { label: 'Отстранен', className: 'bg-red-50 text-red-700 border border-red-200' },
      RESERVE: { label: 'Резерв', className: 'bg-amber-50 text-amber-700 border border-amber-200' },
    };
    return badges[status] || { label: status, className: 'bg-gray-50 text-gray-700 border border-gray-200' };
  };

  const filteredTeachers = teachers.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'active') return t.status === 'ACTIVE';
    if (filter === 'suspended') return t.status === 'SUSPENDED';
    if (filter === 'reserve') return t.status === 'RESERVE';
    return true;
  });

  return (
    <>
      <div className="space-y-6">
        {/* Header with filters */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Преподаватели ({filteredTeachers.length})
              </h2>
              <p className="text-sm text-gray-500">
                Всего: {teachers.length}
              </p>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'Все' },
              { key: 'active', label: 'Активные' },
              { key: 'suspended', label: 'Отстранены' },
              { key: 'reserve', label: 'Резерв' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as typeof filter)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  filter === tab.key
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Teachers Table */}
        {filteredTeachers.length > 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Преподаватель</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Контакты</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Категория</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Предметы</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Филиалы</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTeachers.map((teacher) => (
                    <tr
                      key={teacher.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleTeacherClick(teacher)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                            teacher.status === 'SUSPENDED' ? 'bg-red-500' :
                            teacher.status === 'RESERVE' ? 'bg-amber-500' :
                            'bg-blue-600'
                          }`}>
                            <span className="text-xs font-medium text-white">
                              {teacher.user.firstName[0]}{teacher.user.lastName[0]}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {teacher.user.lastName} {teacher.user.firstName}
                            </div>
                            {teacher.user.middleName && (
                              <div className="text-xs text-gray-500">{teacher.user.middleName}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{teacher.user.email}</div>
                        {(teacher.phone || teacher.user.phone) && (
                          <div className="text-xs text-gray-500">{teacher.phone || teacher.user.phone}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900">{teacher.category?.name || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {teacher.subjects.slice(0, 2).map((s) => (
                            <span
                              key={s.id}
                              className="px-2 py-0.5 text-xs bg-indigo-50 text-indigo-700 rounded"
                            >
                              {s.subject.name}
                            </span>
                          ))}
                          {teacher.subjects.length > 2 && (
                            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                              +{teacher.subjects.length - 2}
                            </span>
                          )}
                          {teacher.subjects.length === 0 && (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {teacher.branches.slice(0, 2).map((b) => (
                            <span
                              key={b.id}
                              className="px-2 py-0.5 text-xs bg-emerald-50 text-emerald-700 rounded"
                            >
                              {b.branch.name}
                            </span>
                          ))}
                          {teacher.branches.length > 2 && (
                            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                              +{teacher.branches.length - 2}
                            </span>
                          )}
                          {teacher.branches.length === 0 && (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-lg ${getStatusBadge(teacher.status).className}`}>
                          {getStatusBadge(teacher.status).label}
                        </span>
                      </td>
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Преподавателей не найдено</h3>
              <p className="text-sm text-gray-500">
                {filter !== 'all'
                  ? 'Нет преподавателей с выбранным статусом'
                  : 'Добавьте первого преподавателя в систему'
                }
              </p>
            </div>
          </div>
        )}
      </div>

      <TeacherDetailSlideOver
        teacher={selectedTeacher}
        isOpen={isSlideOverOpen}
        onClose={handleCloseSlideOver}
        onUpdate={handleUpdate}
        userRole={userRole}
        subjects={subjects}
        branches={branches}
        categories={categories}
      />
    </>
  );
}
