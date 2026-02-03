'use client';

import { useState } from 'react';
import SlideOver from '../components/SlideOver';
import { StudentStatus } from '@prisma/client';
import { useNotification } from '@/app/components/ui/NotificationProvider';

interface Student {
  id: string;
  status: StudentStatus;
  // Student info
  studentIIN: string | null;
  citizenship: string | null;
  dateOfBirth: Date | null;
  gender: string | null;
  address: string | null;
  // Parent info
  parentName: string | null;
  parentPhone: string | null;
  parentIIN: string | null;
  parentDocumentType: string | null;
  parentDocumentNumber: string | null;
  // Reference relations (with IDs for editing)
  gradeLevelId: string | null;
  gradeLevel: { id: string; name: string; code: string } | null;
  languageId: string | null;
  language: { id: string; name: string; code: string } | null;
  studyDirectionId: string | null;
  studyDirection: { id: string; name: string; code: string } | null;
  cityId: string | null;
  city: { id: string; name: string } | null;
  schoolId: string | null;
  school: { id: string; name: string } | null;
  branchId: string | null;
  branch: { id: string; name: string } | null;
  subjects: { subject: { id: string; nameRu: string | null; nameKz: string | null } }[];
  specialNeeds: { specialNeed: { id: string; name: string } }[];
  allergy: string | null;
  // Study conditions
  guarantee: string | null;
  studyFormat: string | null;
  studySchedule: string | null;
  customDays: string[];
  // Subscription
  standardMonths: number;
  bonusMonths: number;
  intensiveMonths: number;
  freezeDays: number;
  freezeEndDate: Date | null;
  // Payment
  paymentPlan: string | null;
  tranche1Amount: number | null;
  tranche1Date: Date | null;
  tranche2Amount: number | null;
  tranche2Date: Date | null;
  tranche3Amount: number | null;
  tranche3Date: Date | null;
  totalAmount: number | null;
  monthlyPayment: number | null;
  // Study period
  studyStartDate: Date | null;
  studyEndDate: Date | null;
  createdAt: Date;
  user: {
    firstName: string;
    lastName: string;
    middleName: string | null;
    phone: string | null;
  };
}

interface FilterOption {
  id: string;
  name: string;
}

interface FilterOptions {
  gradeLevels: FilterOption[];
  languages: FilterOption[];
  studyDirections: FilterOption[];
  cities: FilterOption[];
  schools: FilterOption[];
  branches: FilterOption[];
  specialNeeds: FilterOption[];
}

interface StudentDetailSlideOverProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  userRole: string;
  filterOptions: FilterOptions;
}

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

// Enum options for dropdowns
const studyFormatOptions = [
  { value: 'ONLINE_GROUP', label: 'Онлайн (группа)' },
  { value: 'OFFLINE_GROUP', label: 'Оффлайн (группа)' },
  { value: 'ONLINE_INDIVIDUAL', label: 'Онлайн (индивидуально)' },
  { value: 'OFFLINE_INDIVIDUAL', label: 'Оффлайн (индивидуально)' },
];

const guaranteeOptions = [
  { value: 'NONE', label: 'Нет' },
  { value: 'FIFTY_PERCENT', label: '50%' },
  { value: 'EIGHTY_PERCENT', label: '80%' },
  { value: 'HUNDRED_PERCENT', label: '100%' },
];

const paymentPlanOptions = [
  { value: 'ONE_TRANCHE', label: '1 транш (полная оплата)' },
  { value: 'TWO_TRANCHES', label: '2 транша' },
  { value: 'THREE_TRANCHES', label: '3 транша' },
];

export default function StudentDetailSlideOver({
  student,
  isOpen,
  onClose,
  onUpdate,
  userRole,
  filterOptions,
}: StudentDetailSlideOverProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useNotification();

  if (!student) return null;

  const canEdit = userRole === 'ADMIN' || userRole === 'SUPERADMIN';
  const isSuperAdmin = userRole === 'SUPERADMIN';

  const handleEdit = () => {
    setFormData({
      // User fields
      firstName: student.user.firstName,
      lastName: student.user.lastName,
      phone: student.user.phone || '',
      // Parent fields
      parentName: student.parentName || '',
      parentPhone: student.parentPhone || '',
      // Reference IDs for dropdowns
      gradeLevelId: student.gradeLevelId || student.gradeLevel?.id || '',
      schoolId: student.schoolId || student.school?.id || '',
      languageId: student.languageId || student.language?.id || '',
      studyDirectionId: student.studyDirectionId || student.studyDirection?.id || '',
      // Enum fields
      guarantee: student.guarantee || '',
      studyFormat: student.studyFormat || '',
      paymentPlan: student.paymentPlan || '',
      // Numeric fields
      standardMonths: student.standardMonths,
      bonusMonths: student.bonusMonths,
      intensiveMonths: student.intensiveMonths,
      freezeDays: student.freezeDays,
      totalAmount: student.totalAmount || 0,
      monthlyPayment: student.monthlyPayment || 0,
      // Date fields (superadmin only)
      tranche1Amount: student.tranche1Amount || 0,
      tranche1Date: student.tranche1Date ? new Date(student.tranche1Date).toISOString().split('T')[0] : '',
      tranche2Amount: student.tranche2Amount || 0,
      tranche2Date: student.tranche2Date ? new Date(student.tranche2Date).toISOString().split('T')[0] : '',
      tranche3Amount: student.tranche3Amount || 0,
      tranche3Date: student.tranche3Date ? new Date(student.tranche3Date).toISOString().split('T')[0] : '',
      studyStartDate: student.studyStartDate ? new Date(student.studyStartDate).toISOString().split('T')[0] : '',
      studyEndDate: student.studyEndDate ? new Date(student.studyEndDate).toISOString().split('T')[0] : '',
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Single API call to /api/students/[id] which handles both user and student updates
      const payload: Record<string, unknown> = {
        // User fields
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        // Parent fields
        parentName: formData.parentName,
        parentPhone: formData.parentPhone,
        // Reference fields (IDs)
        gradeLevelId: formData.gradeLevelId || null,
        schoolId: formData.schoolId || null,
        languageId: formData.languageId || null,
        studyDirectionId: formData.studyDirectionId || null,
        // Enum fields
        guarantee: formData.guarantee || null,
        studyFormat: formData.studyFormat || null,
        paymentPlan: formData.paymentPlan || null,
        // Numeric fields
        standardMonths: parseInt(String(formData.standardMonths)) || 0,
        bonusMonths: parseInt(String(formData.bonusMonths)) || 0,
        intensiveMonths: parseInt(String(formData.intensiveMonths)) || 0,
        freezeDays: parseInt(String(formData.freezeDays)) || 0,
        totalAmount: parseFloat(String(formData.totalAmount)) || null,
        monthlyPayment: parseFloat(String(formData.monthlyPayment)) || null,
      };

      if (isSuperAdmin) {
        payload.tranche1Amount = parseFloat(String(formData.tranche1Amount)) || null;
        payload.tranche1Date = formData.tranche1Date ? new Date(formData.tranche1Date as string) : null;
        payload.tranche2Amount = parseFloat(String(formData.tranche2Amount)) || null;
        payload.tranche2Date = formData.tranche2Date ? new Date(formData.tranche2Date as string) : null;
        payload.tranche3Amount = parseFloat(String(formData.tranche3Amount)) || null;
        payload.tranche3Date = formData.tranche3Date ? new Date(formData.tranche3Date as string) : null;
        payload.studyStartDate = formData.studyStartDate ? new Date(formData.studyStartDate as string) : null;
        payload.studyEndDate = formData.studyEndDate ? new Date(formData.studyEndDate as string) : null;
      }

      const response = await fetch(`/api/students/${student.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        showToast({ message: `Ошибка при сохранении: ${errorData.error || 'Неизвестная ошибка'}`, type: 'error' });
        return;
      }

      setIsEditing(false);
      showToast({ message: 'Данные успешно сохранены', type: 'success' });
      onUpdate();
    } catch (error) {
      console.error('Save error:', error);
      showToast({ message: 'Ошибка при сохранении: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'), type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('ru-RU');
  };

  const formatAmount = (amount: number | null) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('ru-RU').format(amount) + ' тг';
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

  const formatGuarantee = (guarantee: string | null) => {
    const guarantees: Record<string, string> = {
      NONE: 'Нет',
      FIFTY_PERCENT: '50%',
      EIGHTY_PERCENT: '80%',
      HUNDRED_PERCENT: '100%',
    };
    return guarantee ? guarantees[guarantee] || guarantee : '-';
  };

  const formatStudyFormat = (format: string | null) => {
    const formats: Record<string, string> = {
      ONLINE_GROUP: 'Онлайн (группа)',
      ONLINE_INDIVIDUAL: 'Онлайн (индивидуально)',
      OFFLINE_GROUP: 'Оффлайн (группа)',
      OFFLINE_INDIVIDUAL: 'Оффлайн (индивидуально)',
      ONLINE: 'Онлайн',
      OFFLINE: 'Оффлайн',
    };
    return format ? formats[format] || format : '-';
  };

  const formatGender = (gender: string | null) => {
    const genders: Record<string, string> = {
      MALE: 'Мужской',
      FEMALE: 'Женский',
    };
    return gender ? genders[gender] || gender : '-';
  };

  const formatIIN = (iin: string | null) => {
    if (!iin) return '-';
    if (iin.length === 12) {
      return iin.slice(0, 6) + ' ' + iin.slice(6);
    }
    return iin;
  };

  const formatDocumentType = (type: string | null) => {
    const types: Record<string, string> = {
      ID_CARD: 'Уд. личности',
      RK_PASSPORT: 'Паспорт РК',
      FOREIGN: 'Иностранный документ',
    };
    return type ? types[type] || type : '-';
  };

  const formatSchedule = (schedule: string | null, customDays: string[]) => {
    if (schedule === 'PSP') return 'ПСП (Пн-Ср-Пт)';
    if (schedule === 'VCS') return 'ВЧС (Вт-Чт-Сб)';
    if (schedule === 'CUSTOM' && customDays && customDays.length > 0) {
      return 'Особый: ' + customDays.join(', ');
    }
    return schedule || '-';
  };

  const formatSpecialNeeds = (needs: { specialNeed: { name: string } }[]) => {
    if (!needs || needs.length === 0) return null;
    return needs.map(n => n.specialNeed.name).join(', ');
  };

  const formatPaymentPlan = (plan: string | null) => {
    const plans: Record<string, string> = {
      ONE_TRANCHE: '1 транш (полная оплата)',
      TWO_TRANCHES: '2 транша',
      THREE_TRANCHES: '3 транша',
    };
    return plan ? plans[plan] || plan : '-';
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING_APPROVAL: 'bg-yellow-500 text-white',
      ACTIVE: 'bg-green-500 text-white',
      INACTIVE: 'bg-gray-500 text-white',
      GRADUATED: 'bg-blue-500 text-white',
      EXPELLED: 'bg-red-500 text-white',
    };
    const labels: Record<string, string> = {
      PENDING_APPROVAL: 'Ожидает подтверждения',
      ACTIVE: 'Активен',
      INACTIVE: 'Неактивен',
      GRADUATED: 'Выпускник',
      EXPELLED: 'Отчислен',
    };
    return (
      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${styles[status] || 'bg-gray-500 text-white'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const inputClass = "w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 transition-all text-gray-900 dark:text-white";
  const selectClass = "w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 transition-all text-gray-900 dark:text-white cursor-pointer";
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
      title={`${student.user.firstName} ${student.user.lastName}`}
    >
      <div className="px-6 py-6 space-y-6">
        {/* Header with Status and Actions */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          {getStatusBadge(student.status)}
          <div className="flex gap-2">
            {canEdit && !isEditing && (
              <button
                onClick={handleEdit}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-gray-700 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors"
              >
                Редактировать
              </button>
            )}
            {isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
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
          <h3 className={sectionHeaderClass}>
            <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-xs text-blue-600 dark:text-blue-400">1</span>
            Личная информация
          </h3>
          <div className={sectionBoxClass}>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Фамилия</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.lastName as string}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className={inputClass}
                  />
                ) : (
                  <div className={valueClass}>{student.user.lastName}</div>
                )}
              </div>
              <div>
                <label className={labelClass}>Имя</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.firstName as string}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className={inputClass}
                  />
                ) : (
                  <div className={valueClass}>{student.user.firstName}</div>
                )}
              </div>
              <div>
                <label className={labelClass}>Гражданство</label>
                <div className={valueClass}>{student.citizenship === 'KZ' ? 'Республика Казахстан' : student.citizenship === 'FOREIGN' ? 'Другое' : '-'}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>ИИН</label>
                <div className={valueClass}>{formatIIN(student.studentIIN)}</div>
              </div>
              <div>
                <label className={labelClass}>Дата рождения</label>
                <div className={valueClass}>{formatDate(student.dateOfBirth)}</div>
              </div>
              <div>
                <label className={labelClass}>Пол</label>
                <div className={valueClass}>{formatGender(student.gender)}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Телефон</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formatPhone(formData.phone as string)}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                    placeholder="+7 XXX XXX XX XX"
                    className={inputClass}
                  />
                ) : (
                  <div className={valueClass}>{student.user.phone ? formatPhone(student.user.phone) : '-'}</div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Город</label>
                <div className={valueClass}>{student.city?.name || '-'}</div>
              </div>
              <div>
                <label className={labelClass}>Адрес</label>
                <div className={valueClass}>{student.address || '-'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Parent Information */}
        <div>
          <h3 className={sectionHeaderClass}>
            <span className="w-6 h-6 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center text-xs text-purple-600 dark:text-purple-400">2</span>
            Данные родителя
          </h3>
          <div className={sectionBoxClass}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>ФИО родителя</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.parentName as string}
                    onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                    className={inputClass}
                  />
                ) : (
                  <div className={valueClass}>{student.parentName || '-'}</div>
                )}
              </div>
              <div>
                <label className={labelClass}>Телефон родителя</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formatPhone(formData.parentPhone as string)}
                    onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value.replace(/\D/g, '') })}
                    placeholder="+7 XXX XXX XX XX"
                    className={inputClass}
                  />
                ) : (
                  <div className={valueClass}>{student.parentPhone ? formatPhone(student.parentPhone) : '-'}</div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>ИИН родителя</label>
                <div className={valueClass}>{formatIIN(student.parentIIN)}</div>
              </div>
              <div>
                <label className={labelClass}>Тип документа</label>
                <div className={valueClass}>{formatDocumentType(student.parentDocumentType)}</div>
              </div>
              <div>
                <label className={labelClass}>Номер документа</label>
                <div className={valueClass}>{student.parentDocumentNumber || '-'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Academic Information */}
        <div>
          <h3 className={sectionHeaderClass}>
            <span className="w-6 h-6 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center text-xs text-green-600 dark:text-green-400">3</span>
            Учебная информация
          </h3>
          <div className={sectionBoxClass}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Класс</label>
                {isEditing ? (
                  <select
                    value={formData.gradeLevelId as string}
                    onChange={(e) => setFormData({ ...formData, gradeLevelId: e.target.value })}
                    className={selectClass}
                  >
                    <option value="">Не выбрано</option>
                    {filterOptions.gradeLevels.map((gl) => (
                      <option key={gl.id} value={gl.id}>{gl.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className={valueClass}>{formatGradeLevel(student.gradeLevel)}</div>
                )}
              </div>
              <div>
                <label className={labelClass}>Школа</label>
                {isEditing ? (
                  <select
                    value={formData.schoolId as string}
                    onChange={(e) => setFormData({ ...formData, schoolId: e.target.value })}
                    className={selectClass}
                  >
                    <option value="">Не выбрано</option>
                    {filterOptions.schools.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className={valueClass}>{student.school?.name || '-'}</div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Язык обучения</label>
                {isEditing ? (
                  <select
                    value={formData.languageId as string}
                    onChange={(e) => setFormData({ ...formData, languageId: e.target.value })}
                    className={selectClass}
                  >
                    <option value="">Не выбрано</option>
                    {filterOptions.languages.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className={valueClass}>{formatLanguage(student.language)}</div>
                )}
              </div>
              <div>
                <label className={labelClass}>Направление обучения</label>
                {isEditing ? (
                  <select
                    value={formData.studyDirectionId as string}
                    onChange={(e) => setFormData({ ...formData, studyDirectionId: e.target.value })}
                    className={selectClass}
                  >
                    <option value="">Не выбрано</option>
                    {filterOptions.studyDirections.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className={valueClass}>{formatStudyDirection(student.studyDirection)}</div>
                )}
              </div>
            </div>
            <div>
              <label className={labelClass}>Предметы</label>
              {/* Subjects editing requires multi-select - showing read-only for now */}
              {isEditing ? (
                <div className="flex flex-wrap gap-2 mt-1">
                  {student.subjects && student.subjects.length > 0 ? (
                    student.subjects.map((s, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
                      >
                        {s.subject.nameRu || s.subject.nameKz}
                      </span>
                    ))
                  ) : (
                    <span className={valueClass}>-</span>
                  )}
                  <span className="text-xs text-gray-400 ml-2">(изменение через заявку)</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 mt-1">
                  {student.subjects && student.subjects.length > 0 ? (
                    student.subjects.map((s, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
                      >
                        {s.subject.nameRu || s.subject.nameKz}
                      </span>
                    ))
                  ) : (
                    <span className={valueClass}>-</span>
                  )}
                </div>
              )}
            </div>
            {(formatSpecialNeeds(student.specialNeeds) || student.allergy) && (
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                {formatSpecialNeeds(student.specialNeeds) && (
                  <div className="mb-2">
                    <label className={labelClass}>Особые потребности</label>
                    <div className={valueClass}>{formatSpecialNeeds(student.specialNeeds)}</div>
                  </div>
                )}
                {student.allergy && (
                  <div>
                    <label className={labelClass}>Аллергии / Здоровье</label>
                    <div className={valueClass}>{student.allergy}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Study Conditions */}
        <div>
          <h3 className={sectionHeaderClass}>
            <span className="w-6 h-6 bg-yellow-100 dark:bg-yellow-900/50 rounded-full flex items-center justify-center text-xs text-yellow-600 dark:text-yellow-400">4</span>
            Условия обучения
          </h3>
          <div className={sectionBoxClass}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Филиал</label>
                <div className={valueClass}>{student.branch?.name || '-'}</div>
              </div>
              <div>
                <label className={labelClass}>Формат обучения</label>
                {isEditing ? (
                  <select
                    value={formData.studyFormat as string}
                    onChange={(e) => setFormData({ ...formData, studyFormat: e.target.value })}
                    className={selectClass}
                  >
                    <option value="">Не выбрано</option>
                    {studyFormatOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : (
                  <div className={valueClass}>{formatStudyFormat(student.studyFormat)}</div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Гарантия</label>
                {isEditing ? (
                  <select
                    value={formData.guarantee as string}
                    onChange={(e) => setFormData({ ...formData, guarantee: e.target.value })}
                    className={selectClass}
                  >
                    <option value="">Не выбрано</option>
                    {guaranteeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : (
                  <div className={valueClass}>{formatGuarantee(student.guarantee)}</div>
                )}
              </div>
              <div>
                <label className={labelClass}>Дни обучения</label>
                <div className={valueClass}>{formatSchedule(student.studySchedule, student.customDays)}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Дата начала</label>
                {isEditing && isSuperAdmin ? (
                  <input
                    type="date"
                    value={formData.studyStartDate as string}
                    onChange={(e) => setFormData({ ...formData, studyStartDate: e.target.value })}
                    className={inputClass}
                  />
                ) : (
                  <div className={valueClass}>{formatDate(student.studyStartDate)}</div>
                )}
              </div>
              <div>
                <label className={labelClass}>Дата окончания</label>
                {isEditing && isSuperAdmin ? (
                  <input
                    type="date"
                    value={formData.studyEndDate as string}
                    onChange={(e) => setFormData({ ...formData, studyEndDate: e.target.value })}
                    className={inputClass}
                  />
                ) : (
                  <div className={valueClass}>{formatDate(student.studyEndDate)}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Subscription */}
        <div>
          <h3 className={sectionHeaderClass}>
            <span className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-xs text-indigo-600 dark:text-indigo-400">5</span>
            Абонемент
          </h3>
          <div className={sectionBoxClass}>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className={labelClass}>Стандартные</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={formData.standardMonths as number}
                    onChange={(e) => setFormData({ ...formData, standardMonths: parseInt(e.target.value) || 0 })}
                    className={inputClass}
                  />
                ) : (
                  <div className={valueClass}>{student.standardMonths} мес.</div>
                )}
              </div>
              <div>
                <label className={labelClass}>Бонусные</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={formData.bonusMonths as number}
                    onChange={(e) => setFormData({ ...formData, bonusMonths: parseInt(e.target.value) || 0 })}
                    className={inputClass}
                  />
                ) : (
                  <div className={valueClass}>{student.bonusMonths} мес.</div>
                )}
              </div>
              <div>
                <label className={labelClass}>Интенсивные</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={formData.intensiveMonths as number}
                    onChange={(e) => setFormData({ ...formData, intensiveMonths: parseInt(e.target.value) || 0 })}
                    className={inputClass}
                  />
                ) : (
                  <div className={valueClass}>{student.intensiveMonths} мес.</div>
                )}
              </div>
              <div>
                <label className={labelClass}>Заморозка</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={formData.freezeDays as number}
                    onChange={(e) => setFormData({ ...formData, freezeDays: parseInt(e.target.value) || 0 })}
                    className={inputClass}
                  />
                ) : (
                  <div className={valueClass}>{student.freezeDays} дней</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 6: Payment */}
        <div>
          <h3 className={sectionHeaderClass}>
            <span className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center text-xs text-emerald-600 dark:text-emerald-400">6</span>
            Оплата
          </h3>
          <div className={sectionBoxClass}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>План оплаты</label>
                {isEditing ? (
                  <select
                    value={formData.paymentPlan as string}
                    onChange={(e) => setFormData({ ...formData, paymentPlan: e.target.value })}
                    className={selectClass}
                  >
                    <option value="">Не выбрано</option>
                    {paymentPlanOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : (
                  <div className={valueClass}>{formatPaymentPlan(student.paymentPlan)}</div>
                )}
              </div>
              <div>
                <label className={labelClass}>Общая сумма</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={formData.totalAmount as number}
                    onChange={(e) => setFormData({ ...formData, totalAmount: parseFloat(e.target.value) || 0 })}
                    className={inputClass}
                  />
                ) : (
                  <div className="text-lg font-bold text-gray-900 dark:text-white">{formatAmount(student.totalAmount)}</div>
                )}
              </div>
            </div>
            {isEditing ? (
              <div>
                <label className={labelClass}>Ежемесячный платеж</label>
                <input
                  type="number"
                  value={formData.monthlyPayment as number}
                  onChange={(e) => setFormData({ ...formData, monthlyPayment: parseFloat(e.target.value) || 0 })}
                  className={inputClass}
                />
              </div>
            ) : student.monthlyPayment ? (
              <div>
                <label className={labelClass}>Ежемесячный платеж</label>
                <div className={valueClass}>{formatAmount(student.monthlyPayment)}</div>
              </div>
            ) : null}

            {/* Tranches */}
            {(student.tranche1Amount || (isEditing && isSuperAdmin)) && (
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">График платежей</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Транш 1</span>
                    {isEditing && isSuperAdmin ? (
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={formData.tranche1Amount as number}
                          onChange={(e) => setFormData({ ...formData, tranche1Amount: parseFloat(e.target.value) || 0 })}
                          placeholder="Сумма"
                          className="w-32 px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-sm text-gray-900 dark:text-white"
                        />
                        <input
                          type="date"
                          value={formData.tranche1Date as string}
                          onChange={(e) => setFormData({ ...formData, tranche1Date: e.target.value })}
                          className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-sm text-gray-900 dark:text-white"
                        />
                      </div>
                    ) : (
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatAmount(student.tranche1Amount)}
                        {student.tranche1Date && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                            до {formatDate(student.tranche1Date)}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  {(student.tranche2Amount || (isEditing && isSuperAdmin)) && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Транш 2</span>
                      {isEditing && isSuperAdmin ? (
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={formData.tranche2Amount as number}
                            onChange={(e) => setFormData({ ...formData, tranche2Amount: parseFloat(e.target.value) || 0 })}
                            placeholder="Сумма"
                            className="w-32 px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-sm text-gray-900 dark:text-white"
                          />
                          <input
                            type="date"
                            value={formData.tranche2Date as string}
                            onChange={(e) => setFormData({ ...formData, tranche2Date: e.target.value })}
                            className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-sm text-gray-900 dark:text-white"
                          />
                        </div>
                      ) : student.tranche2Amount ? (
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatAmount(student.tranche2Amount)}
                          {student.tranche2Date && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                              до {formatDate(student.tranche2Date)}
                            </span>
                          )}
                        </span>
                      ) : null}
                    </div>
                  )}
                  {(student.tranche3Amount || (isEditing && isSuperAdmin)) && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Транш 3</span>
                      {isEditing && isSuperAdmin ? (
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={formData.tranche3Amount as number}
                            onChange={(e) => setFormData({ ...formData, tranche3Amount: parseFloat(e.target.value) || 0 })}
                            placeholder="Сумма"
                            className="w-32 px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-sm text-gray-900 dark:text-white"
                          />
                          <input
                            type="date"
                            value={formData.tranche3Date as string}
                            onChange={(e) => setFormData({ ...formData, tranche3Date: e.target.value })}
                            className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-sm text-gray-900 dark:text-white"
                          />
                        </div>
                      ) : student.tranche3Amount ? (
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatAmount(student.tranche3Amount)}
                          {student.tranche3Date && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                              до {formatDate(student.tranche3Date)}
                            </span>
                          )}
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Metadata */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Дата зачисления: {formatDate(student.createdAt)}
          </div>
        </div>
      </div>
    </SlideOver>
  );
}
