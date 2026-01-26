'use client';

import { useState } from 'react';
import SlideOver from '../components/SlideOver';
import { useNotification } from '@/app/components/ui/NotificationProvider';

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

interface TeacherDetailSlideOverProps {
  teacher: Teacher | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  userRole: string;
  subjects: RefOption[];
  branches: RefOption[];
  categories: RefOption[];
}

type FormData = {
  firstName: string;
  lastName: string;
  middleName: string;
  email: string;
  userPhone: string;
  phone: string;
  dateOfBirth: string;
  iin: string;
  categoryId: string;
  status: string;
  salaryFormat: string;
  salaryAmount: string;
  subjectIds: string[];
  branchIds: string[];
};

// Format phone number as +7 XXX XXX XX XX
const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  let normalized = digits;
  if (digits.startsWith('8') && digits.length > 1) {
    normalized = '7' + digits.slice(1);
  } else if (!digits.startsWith('7') && digits.length > 0) {
    normalized = '7' + digits;
  }
  const limited = normalized.slice(0, 11);
  if (limited.length === 0) return '';
  let formatted = '+7';
  if (limited.length > 1) formatted += ' ' + limited.slice(1, 4);
  if (limited.length > 4) formatted += ' ' + limited.slice(4, 7);
  if (limited.length > 7) formatted += ' ' + limited.slice(7, 9);
  if (limited.length > 9) formatted += ' ' + limited.slice(9, 11);
  return formatted;
};

// Format IIN as XXXXXX XXXXXX
const formatIIN = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 12);
  if (digits.length <= 6) return digits;
  return digits.slice(0, 6) + ' ' + digits.slice(6);
};

// Get raw IIN without spaces
const getRawIIN = (value: string): string => {
  return value.replace(/\D/g, '');
};

export default function TeacherDetailSlideOver({
  teacher,
  isOpen,
  onClose,
  onUpdate,
  userRole,
  subjects,
  branches,
  categories,
}: TeacherDetailSlideOverProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    userPhone: '',
    phone: '',
    dateOfBirth: '',
    iin: '',
    categoryId: '',
    status: 'ACTIVE',
    salaryFormat: '',
    salaryAmount: '',
    subjectIds: [],
    branchIds: [],
  });
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useNotification();

  if (!teacher) return null;

  const canEdit = ['ADMIN', 'SUPERADMIN', 'COORDINATOR'].includes(userRole);

  const handleEdit = () => {
    setFormData({
      firstName: teacher.user.firstName,
      lastName: teacher.user.lastName,
      middleName: teacher.user.middleName || '',
      email: teacher.user.email,
      userPhone: teacher.user.phone || '',
      phone: teacher.phone || '',
      dateOfBirth: teacher.dateOfBirth ? new Date(teacher.dateOfBirth).toISOString().split('T')[0] : '',
      iin: teacher.iin || '',
      categoryId: teacher.categoryId || '',
      status: teacher.status,
      salaryFormat: teacher.salaryFormat || '',
      salaryAmount: teacher.salaryAmount?.toString() || '',
      subjectIds: teacher.subjects.map(s => s.subject.id),
      branchIds: teacher.branches.map(b => b.branch.id),
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/teachers/${teacher.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setIsEditing(false);
        showToast({ message: 'Данные успешно сохранены', type: 'success' });
        onUpdate();
      } else {
        const errorData = await response.json();
        showToast({ message: errorData.error || 'Ошибка при сохранении', type: 'error' });
      }
    } catch (error) {
      console.error('Save error:', error);
      showToast({ message: 'Ошибка при сохранении', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('ru-RU');
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ACTIVE: 'bg-green-500 text-white',
      SUSPENDED: 'bg-red-500 text-white',
      RESERVE: 'bg-amber-500 text-white',
    };
    const labels: Record<string, string> = {
      ACTIVE: 'Активный',
      SUSPENDED: 'Отстранен',
      RESERVE: 'Резерв',
    };
    return (
      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${styles[status] || 'bg-gray-500 text-white'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const toggleSubject = (subjectId: string) => {
    setFormData(prev => ({
      ...prev,
      subjectIds: prev.subjectIds.includes(subjectId)
        ? prev.subjectIds.filter(id => id !== subjectId)
        : [...prev.subjectIds, subjectId],
    }));
  };

  const toggleBranch = (branchId: string) => {
    setFormData(prev => ({
      ...prev,
      branchIds: prev.branchIds.includes(branchId)
        ? prev.branchIds.filter(id => id !== branchId)
        : [...prev.branchIds, branchId],
    }));
  };

  const inputClass = "w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all text-gray-900";

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={() => {
        setIsEditing(false);
        onClose();
      }}
      title={`${teacher.user.lastName} ${teacher.user.firstName}`}
    >
      <div className="px-6 py-6 space-y-6">
        {/* Header with Status and Actions */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          {getStatusBadge(teacher.status)}
          <div className="flex gap-2">
            {canEdit && !isEditing && (
              <button
                onClick={handleEdit}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Редактировать
              </button>
            )}
            {isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Section 1: Personal Information */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs text-blue-600">1</span>
            Личная информация
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">Фамилия</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className={inputClass}
                  />
                ) : (
                  <div className="text-sm font-medium text-gray-900">{teacher.user.lastName}</div>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500">Имя</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className={inputClass}
                  />
                ) : (
                  <div className="text-sm font-medium text-gray-900">{teacher.user.firstName}</div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">Отчество</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.middleName}
                    onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                    className={inputClass}
                  />
                ) : (
                  <div className="text-sm font-medium text-gray-900">{teacher.user.middleName || '-'}</div>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500">Дата рождения</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className={inputClass}
                  />
                ) : (
                  <div className="text-sm font-medium text-gray-900">{formatDate(teacher.dateOfBirth)}</div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">ИИН</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formatIIN(formData.iin)}
                    onChange={(e) => setFormData({ ...formData, iin: getRawIIN(e.target.value) })}
                    maxLength={13}
                    placeholder="XXXXXX XXXXXX"
                    className={inputClass}
                  />
                ) : (
                  <div className="text-sm font-medium text-gray-900">{teacher.iin ? formatIIN(teacher.iin) : '-'}</div>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500">Телефон</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formatPhone(formData.phone)}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                    placeholder="+7 XXX XXX XX XX"
                    className={inputClass}
                  />
                ) : (
                  <div className="text-sm font-medium text-gray-900">{teacher.phone ? formatPhone(teacher.phone) : teacher.user.phone ? formatPhone(teacher.user.phone) : '-'}</div>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500">Email</label>
              {isEditing ? (
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={inputClass}
                />
              ) : (
                <div className="text-sm font-medium text-gray-900">{teacher.user.email}</div>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Professional Information */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs text-blue-600">2</span>
            Профессиональная информация
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">Категория</label>
                {isEditing ? (
                  <div className="relative mt-1">
                    <select
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      className="w-full px-3 py-2 pr-10 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                    >
                      <option value="">Не указано</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm font-medium text-gray-900">{teacher.category?.name || 'Не указано'}</div>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500">Статус</label>
                {isEditing ? (
                  <div className="relative mt-1">
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 pr-10 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                    >
                      <option value="ACTIVE">Активный</option>
                      <option value="SUSPENDED">Отстранен</option>
                      <option value="RESERVE">Резерв</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="mt-1">{getStatusBadge(teacher.status)}</div>
                )}
              </div>
            </div>

            {/* Subjects */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-500">Предметы</label>
                {isEditing && (
                  <span className="text-xs text-gray-500">
                    Выбрано: <span className="font-semibold text-indigo-600">{formData.subjectIds.length}</span>
                  </span>
                )}
              </div>
              {isEditing ? (
                <div className="grid grid-cols-2 gap-2">
                  {subjects.map(subject => {
                    const isSelected = formData.subjectIds.includes(subject.id);
                    return (
                      <button
                        key={subject.id}
                        type="button"
                        onClick={() => toggleSubject(subject.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-left text-sm ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-indigo-500' : 'border-2 border-gray-300'
                        }`}>
                          {isSelected && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="font-medium">{subject.name}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {teacher.subjects.length > 0 ? (
                    teacher.subjects.map(s => (
                      <span key={s.id} className="px-3 py-1.5 text-sm bg-indigo-100 text-indigo-700 rounded-lg">
                        {s.subject.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">Не указаны</span>
                  )}
                </div>
              )}
            </div>

            {/* Branches */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-500">Филиалы</label>
                {isEditing && (
                  <span className="text-xs text-gray-500">
                    Выбрано: <span className="font-semibold text-emerald-600">{formData.branchIds.length}</span>
                  </span>
                )}
              </div>
              {isEditing ? (
                <div className="grid grid-cols-2 gap-2">
                  {branches.map(branch => {
                    const isSelected = formData.branchIds.includes(branch.id);
                    return (
                      <button
                        key={branch.id}
                        type="button"
                        onClick={() => toggleBranch(branch.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-left text-sm ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-emerald-500' : 'border-2 border-gray-300'
                        }`}>
                          {isSelected && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="font-medium">{branch.name}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {teacher.branches.length > 0 ? (
                    teacher.branches.map(b => (
                      <span key={b.id} className="px-3 py-1.5 text-sm bg-emerald-100 text-emerald-700 rounded-lg">
                        {b.branch.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">Не указаны</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Salary */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs text-blue-600">3</span>
            Оплата труда
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">Формат оплаты</label>
                {isEditing ? (
                  <div className="relative mt-1">
                    <select
                      value={formData.salaryFormat}
                      onChange={(e) => setFormData({ ...formData, salaryFormat: e.target.value })}
                      className="w-full px-3 py-2 pr-10 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                    >
                      <option value="">Не указано</option>
                      <option value="HOURLY">Почасовая</option>
                      <option value="MONTHLY">Месячная ЗП</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm font-medium text-gray-900">
                    {teacher.salaryFormat === 'HOURLY' ? 'Почасовая' :
                     teacher.salaryFormat === 'MONTHLY' ? 'Месячная ЗП' : 'Не указано'}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500">
                  {formData.salaryFormat === 'HOURLY' || teacher.salaryFormat === 'HOURLY'
                    ? 'Ставка за час (₸)'
                    : 'Зарплата в месяц (₸)'}
                </label>
                {isEditing ? (
                  <input
                    type="number"
                    value={formData.salaryAmount}
                    onChange={(e) => setFormData({ ...formData, salaryAmount: e.target.value })}
                    placeholder={formData.salaryFormat === 'HOURLY' ? 'Ставка за час' : 'Сумма в месяц'}
                    className={inputClass}
                  />
                ) : (
                  <div className="text-sm font-medium text-gray-900">
                    {teacher.salaryAmount
                      ? `${new Intl.NumberFormat('ru-RU').format(teacher.salaryAmount)} ₸`
                      : '-'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Activity */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs text-blue-600">4</span>
            Активность
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">Последний вход</label>
                <div className="text-sm font-medium text-gray-900">
                  {teacher.user.lastLogin
                    ? new Date(teacher.user.lastLogin).toLocaleString('ru-RU')
                    : 'Никогда'}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">Дата регистрации</label>
                <div className="text-sm font-medium text-gray-900">
                  {formatDate(teacher.user.createdAt)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SlideOver>
  );
}
