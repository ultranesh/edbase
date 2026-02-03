'use client';

import { useState } from 'react';
import SlideOver from '../components/SlideOver';
import { useNotification } from '@/app/components/ui/NotificationProvider';
import { useLanguage } from '@/app/components/LanguageProvider';

interface RefOption {
  id: string;
  name: string;
}

interface SubjectOption {
  id: string;
  nameRu: string | null;
  nameKz: string | null;
  nameEn?: string | null;
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
    phone: string | null;
    lastLogin: Date | null;
    createdAt: Date;
  };
  category: RefOption | null;
  subjects: { id: string; subject: SubjectOption }[];
  branches: { id: string; branch: RefOption }[];
}

interface TeacherDetailSlideOverProps {
  teacher: Teacher | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  userRole: string;
  subjects: SubjectOption[];
  branches: RefOption[];
  categories: RefOption[];
}

type FormData = {
  firstName: string;
  lastName: string;
  middleName: string;
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
  const { t } = useLanguage();

  if (!teacher) return null;

  const canEdit = ['ADMIN', 'SUPERADMIN', 'COORDINATOR'].includes(userRole);

  const handleEdit = () => {
    setFormData({
      firstName: teacher.user.firstName,
      lastName: teacher.user.lastName,
      middleName: teacher.user.middleName || '',
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
        showToast({ message: t('teachers.savedSuccess'), type: 'success' });
        onUpdate();
      } else {
        const errorData = await response.json();
        showToast({ message: errorData.error || t('teachers.saveError'), type: 'error' });
      }
    } catch (error) {
      console.error('Save error:', error);
      showToast({ message: t('teachers.saveError'), type: 'error' });
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
      ACTIVE: t('teachers.statusActive'),
      SUSPENDED: t('teachers.statusSuspended'),
      RESERVE: t('teachers.statusReserve'),
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

  const inputClass = "w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 transition-all text-gray-900 dark:text-white";
  const selectClass = "w-full px-3 py-2 pr-10 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400";
  const labelClass = "text-xs text-gray-500 dark:text-gray-400";
  const valueClass = "text-sm font-medium text-gray-900 dark:text-white";
  const sectionBoxClass = "bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3";
  const sectionHeaderClass = "text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2";

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
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-gray-700 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors"
              >
                {t('teachers.edit')}
              </button>
            )}
            {isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isSaving ? t('teachers.saving') : t('common.save')}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Section 1: Personal Information */}
        <div>
          <h3 className={sectionHeaderClass}>
            <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-xs text-blue-600 dark:text-blue-400">1</span>
            {t('teachers.personalInfo')}
          </h3>
          <div className={sectionBoxClass}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>{t('teachers.lastName')}</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className={inputClass}
                  />
                ) : (
                  <div className={valueClass}>{teacher.user.lastName}</div>
                )}
              </div>
              <div>
                <label className={labelClass}>{t('teachers.firstName')}</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className={inputClass}
                  />
                ) : (
                  <div className={valueClass}>{teacher.user.firstName}</div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>{t('teachers.middleName')}</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.middleName}
                    onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                    className={inputClass}
                  />
                ) : (
                  <div className={valueClass}>{teacher.user.middleName || '-'}</div>
                )}
              </div>
              <div>
                <label className={labelClass}>{t('teachers.birthDate')}</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className={inputClass}
                  />
                ) : (
                  <div className={valueClass}>{formatDate(teacher.dateOfBirth)}</div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>{t('teachers.iin')}</label>
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
                  <div className={valueClass}>{teacher.iin ? formatIIN(teacher.iin) : '-'}</div>
                )}
              </div>
              <div>
                <label className={labelClass}>{t('teachers.phone')}</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formatPhone(formData.phone)}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                    placeholder="+7 XXX XXX XX XX"
                    className={inputClass}
                  />
                ) : (
                  <div className={valueClass}>{teacher.phone ? formatPhone(teacher.phone) : teacher.user.phone ? formatPhone(teacher.user.phone) : '-'}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Professional Information */}
        <div>
          <h3 className={sectionHeaderClass}>
            <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-xs text-blue-600 dark:text-blue-400">2</span>
            {t('teachers.professionalInfo')}
          </h3>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>{t('teachers.category')}</label>
                {isEditing ? (
                  <div className="relative mt-1">
                    <select
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      className={selectClass}
                    >
                      <option value="">{t('teachers.notSpecified')}</option>
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
                  <div className={valueClass}>{teacher.category?.name || t('teachers.notSpecified')}</div>
                )}
              </div>
              <div>
                <label className={labelClass}>{t('teachers.status')}</label>
                {isEditing ? (
                  <div className="relative mt-1">
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className={selectClass}
                    >
                      <option value="ACTIVE">{t('teachers.statusActive')}</option>
                      <option value="SUSPENDED">{t('teachers.statusSuspended')}</option>
                      <option value="RESERVE">{t('teachers.statusReserve')}</option>
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
                <label className={labelClass}>{t('teachers.subjects')}</label>
                {isEditing && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {t('teachers.selected', { count: formData.subjectIds.length })}
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
                            ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                            : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-indigo-500' : 'border-2 border-gray-300 dark:border-gray-500'
                        }`}>
                          {isSelected && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="font-medium">{subject.nameRu || subject.nameKz}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {teacher.subjects.length > 0 ? (
                    teacher.subjects.map(s => (
                      <span key={s.id} className="px-3 py-1.5 text-sm bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-lg">
                        {s.subject.nameRu || s.subject.nameKz}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('teachers.notSpecified')}</span>
                  )}
                </div>
              )}
            </div>

            {/* Branches */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelClass}>{t('teachers.branches')}</label>
                {isEditing && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {t('teachers.selected', { count: formData.branchIds.length })}
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
                            ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                            : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-emerald-500' : 'border-2 border-gray-300 dark:border-gray-500'
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
                      <span key={b.id} className="px-3 py-1.5 text-sm bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-lg">
                        {b.branch.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('teachers.notSpecified')}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Salary */}
        <div>
          <h3 className={sectionHeaderClass}>
            <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-xs text-blue-600 dark:text-blue-400">3</span>
            {t('teachers.salary')}
          </h3>
          <div className={sectionBoxClass}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>{t('teachers.salaryFormat')}</label>
                {isEditing ? (
                  <div className="relative mt-1">
                    <select
                      value={formData.salaryFormat}
                      onChange={(e) => setFormData({ ...formData, salaryFormat: e.target.value })}
                      className={selectClass}
                    >
                      <option value="">{t('teachers.notSpecified')}</option>
                      <option value="HOURLY">{t('teachers.hourly')}</option>
                      <option value="MONTHLY">{t('teachers.monthly')}</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className={valueClass}>
                    {teacher.salaryFormat === 'HOURLY' ? t('teachers.hourly') :
                     teacher.salaryFormat === 'MONTHLY' ? t('teachers.monthly') : t('teachers.notSpecified')}
                  </div>
                )}
              </div>
              <div>
                <label className={labelClass}>
                  {formData.salaryFormat === 'HOURLY' || teacher.salaryFormat === 'HOURLY'
                    ? t('teachers.hourlyRate')
                    : t('teachers.monthlySalary')}
                </label>
                {isEditing ? (
                  <input
                    type="number"
                    value={formData.salaryAmount}
                    onChange={(e) => setFormData({ ...formData, salaryAmount: e.target.value })}
                    placeholder={formData.salaryFormat === 'HOURLY' ? t('teachers.hourlyRate') : t('teachers.monthlySalary')}
                    className={inputClass}
                  />
                ) : (
                  <div className={valueClass}>
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
          <h3 className={sectionHeaderClass}>
            <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-xs text-blue-600 dark:text-blue-400">4</span>
            {t('teachers.activity')}
          </h3>
          <div className={sectionBoxClass}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>{t('teachers.lastLogin')}</label>
                <div className={valueClass}>
                  {teacher.user.lastLogin
                    ? new Date(teacher.user.lastLogin).toLocaleString('ru-RU')
                    : t('teachers.never')}
                </div>
              </div>
              <div>
                <label className={labelClass}>{t('teachers.registrationDate')}</label>
                <div className={valueClass}>
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
