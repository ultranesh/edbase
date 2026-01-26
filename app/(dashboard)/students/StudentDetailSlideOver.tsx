'use client';

import { useState } from 'react';
import SlideOver from '../components/SlideOver';
import { StudentStatus } from '@prisma/client';
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
  createdAt: Date;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
}

interface StudentDetailSlideOverProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  userRole: string;
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

export default function StudentDetailSlideOver({
  student,
  isOpen,
  onClose,
  onUpdate,
  userRole,
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
      firstName: student.user.firstName,
      lastName: student.user.lastName,
      email: student.user.email,
      phone: student.user.phone || '',
      parentName: student.parentName || '',
      parentPhone: student.parentPhone || '',
      gradeLevel: student.gradeLevel?.name || '',
      school: student.school?.name || '',
      language: student.language?.name || '',
      studyDirection: student.studyDirection?.name || '',
      subjects: student.subjects.map(s => s.subject.name).join(', '),
      guarantee: student.guarantee || '',
      studyFormat: student.studyFormat || '',
      standardMonths: student.standardMonths,
      bonusMonths: student.bonusMonths,
      intensiveMonths: student.intensiveMonths,
      freezeDays: student.freezeDays,
      paymentPlan: student.paymentPlan || '',
      tranche1Amount: student.tranche1Amount || 0,
      tranche1Date: student.tranche1Date ? new Date(student.tranche1Date).toISOString().split('T')[0] : '',
      tranche2Amount: student.tranche2Amount || 0,
      tranche2Date: student.tranche2Date ? new Date(student.tranche2Date).toISOString().split('T')[0] : '',
      tranche3Amount: student.tranche3Amount || 0,
      tranche3Date: student.tranche3Date ? new Date(student.tranche3Date).toISOString().split('T')[0] : '',
      totalAmount: student.totalAmount || 0,
      monthlyPayment: student.monthlyPayment || 0,
      studyStartDate: student.studyStartDate ? new Date(student.studyStartDate).toISOString().split('T')[0] : '',
      studyEndDate: student.studyEndDate ? new Date(student.studyEndDate).toISOString().split('T')[0] : '',
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const userPayload: Record<string, unknown> = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
      };

      if (isSuperAdmin) {
        userPayload.email = formData.email;
      }

      const userResponse = await fetch(`/api/users/${student.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userPayload),
      });

      if (!userResponse.ok) {
        const errorData = await userResponse.json();
        showToast({ message: `Ошибка при сохранении пользователя: ${errorData.error || 'Неизвестная ошибка'}`, type: 'error' });
        return;
      }

      // Note: For full editing support, we would need to fetch reference table IDs
      // For now, we only update non-relation fields
      const studentPayload: Record<string, unknown> = {
        parentName: formData.parentName,
        parentPhone: formData.parentPhone,
        // gradeLevel, school, language, studyDirection, subjects need ID-based updates
        // which require additional UI work with dropdowns
        guarantee: formData.guarantee,
        studyFormat: formData.studyFormat,
        standardMonths: parseInt(String(formData.standardMonths)),
        bonusMonths: parseInt(String(formData.bonusMonths)),
        intensiveMonths: parseInt(String(formData.intensiveMonths)),
        freezeDays: parseInt(String(formData.freezeDays)),
        paymentPlan: formData.paymentPlan,
        totalAmount: parseFloat(String(formData.totalAmount)) || null,
        monthlyPayment: parseFloat(String(formData.monthlyPayment)) || null,
      };

      if (isSuperAdmin) {
        studentPayload.tranche1Amount = parseFloat(String(formData.tranche1Amount)) || null;
        studentPayload.tranche1Date = formData.tranche1Date ? new Date(formData.tranche1Date as string) : null;
        studentPayload.tranche2Amount = parseFloat(String(formData.tranche2Amount)) || null;
        studentPayload.tranche2Date = formData.tranche2Date ? new Date(formData.tranche2Date as string) : null;
        studentPayload.tranche3Amount = parseFloat(String(formData.tranche3Amount)) || null;
        studentPayload.tranche3Date = formData.tranche3Date ? new Date(formData.tranche3Date as string) : null;
        studentPayload.studyStartDate = formData.studyStartDate ? new Date(formData.studyStartDate as string) : null;
        studentPayload.studyEndDate = formData.studyEndDate ? new Date(formData.studyEndDate as string) : null;
      }

      const studentResponse = await fetch(`/api/students/${student.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentPayload),
      });

      if (!studentResponse.ok) {
        const errorData = await studentResponse.json();
        showToast({ message: `Ошибка при сохранении студента: ${errorData.error || 'Неизвестная ошибка'}`, type: 'error' });
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

  const formatSubjects = (subjects: { subject: { name: string } }[]) => {
    if (!subjects || subjects.length === 0) return '-';
    return subjects.map(s => s.subject.name).join(', ');
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
    return format === 'ONLINE' ? 'Онлайн' : format === 'OFFLINE' ? 'Оффлайн' : '-';
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

  const inputClass = "w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all text-gray-900";

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
            <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs">1</span>
            Личная информация
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">Имя</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.firstName as string}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className={inputClass}
                  />
                ) : (
                  <div className="text-sm font-medium text-gray-900">{student.user.firstName}</div>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500">Фамилия</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.lastName as string}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className={inputClass}
                  />
                ) : (
                  <div className="text-sm font-medium text-gray-900">{student.user.lastName}</div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">Email</label>
                {isEditing && isSuperAdmin ? (
                  <input
                    type="email"
                    value={formData.email as string}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={inputClass}
                  />
                ) : (
                  <div className="text-sm font-medium text-gray-900">{student.user.email}</div>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500">Телефон</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formatPhone(formData.phone as string)}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                    placeholder="+7 XXX XXX XX XX"
                    className={inputClass}
                  />
                ) : (
                  <div className="text-sm font-medium text-gray-900">{student.user.phone ? formatPhone(student.user.phone) : '-'}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Parent Information */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs">2</span>
            Данные родителя
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">ФИО родителя</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.parentName as string}
                    onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                    className={inputClass}
                  />
                ) : (
                  <div className="text-sm font-medium text-gray-900">{student.parentName || '-'}</div>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500">Телефон родителя</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formatPhone(formData.parentPhone as string)}
                    onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value.replace(/\D/g, '') })}
                    placeholder="+7 XXX XXX XX XX"
                    className={inputClass}
                  />
                ) : (
                  <div className="text-sm font-medium text-gray-900">{student.parentPhone ? formatPhone(student.parentPhone) : '-'}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Academic Information */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs">3</span>
            Учебная информация
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">Класс</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.gradeLevel as string}
                    onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                    placeholder="10 класс"
                    className={inputClass}
                  />
                ) : (
                  <div className="text-sm font-medium text-gray-900">{formatGradeLevel(student.gradeLevel)}</div>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500">Школа</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.school as string}
                    onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                    className={inputClass}
                  />
                ) : (
                  <div className="text-sm font-medium text-gray-900">{student.school?.name || '-'}</div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">Язык обучения</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.language as string}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    placeholder="Русский / Казахский"
                    className={inputClass}
                  />
                ) : (
                  <div className="text-sm font-medium text-gray-900">{formatLanguage(student.language)}</div>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500">Направление обучения</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.studyDirection as string}
                    onChange={(e) => setFormData({ ...formData, studyDirection: e.target.value })}
                    placeholder="ЕНТ / СС / IELTS"
                    className={inputClass}
                  />
                ) : (
                  <div className="text-sm font-medium text-gray-900">{formatStudyDirection(student.studyDirection)}</div>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500">Предметы</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.subjects as string}
                  onChange={(e) => setFormData({ ...formData, subjects: e.target.value })}
                  placeholder="MATHEMATICS, PHYSICS"
                  className={inputClass}
                />
              ) : (
                <div className="text-sm font-medium text-gray-900">{formatSubjects(student.subjects)}</div>
              )}
            </div>
          </div>
        </div>

        {/* Section 4: Subscription */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs">4</span>
            Период обучения
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">Формат обучения</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.studyFormat as string}
                    onChange={(e) => setFormData({ ...formData, studyFormat: e.target.value })}
                    placeholder="ONLINE / OFFLINE"
                    className={inputClass}
                  />
                ) : (
                  <div className="text-sm font-medium text-gray-900">{formatStudyFormat(student.studyFormat)}</div>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500">Гарантия</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.guarantee as string}
                    onChange={(e) => setFormData({ ...formData, guarantee: e.target.value })}
                    placeholder="FIFTY_PERCENT"
                    className={inputClass}
                  />
                ) : (
                  <div className="text-sm font-medium text-gray-900">{formatGuarantee(student.guarantee)}</div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">Дата начала</label>
                {isEditing && isSuperAdmin ? (
                  <input
                    type="date"
                    value={formData.studyStartDate as string}
                    onChange={(e) => setFormData({ ...formData, studyStartDate: e.target.value })}
                    className={inputClass}
                  />
                ) : (
                  <div className="text-sm font-medium text-gray-900">{formatDate(student.studyStartDate)}</div>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500">Дата окончания</label>
                {isEditing && isSuperAdmin ? (
                  <input
                    type="date"
                    value={formData.studyEndDate as string}
                    onChange={(e) => setFormData({ ...formData, studyEndDate: e.target.value })}
                    className={inputClass}
                  />
                ) : (
                  <div className="text-sm font-medium text-gray-900">{formatDate(student.studyEndDate)}</div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-500">Стандартные месяцы</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={formData.standardMonths as number}
                    onChange={(e) => setFormData({ ...formData, standardMonths: parseInt(e.target.value) || 0 })}
                    className={inputClass}
                  />
                ) : (
                  <div className="text-sm font-medium text-gray-900">{student.standardMonths} мес.</div>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500">Бонусные месяцы</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={formData.bonusMonths as number}
                    onChange={(e) => setFormData({ ...formData, bonusMonths: parseInt(e.target.value) || 0 })}
                    className={inputClass}
                  />
                ) : (
                  <div className="text-sm font-medium text-gray-900">{student.bonusMonths} мес.</div>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500">Интенсивные месяцы</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={formData.intensiveMonths as number}
                    onChange={(e) => setFormData({ ...formData, intensiveMonths: parseInt(e.target.value) || 0 })}
                    className={inputClass}
                  />
                ) : (
                  <div className="text-sm font-medium text-gray-900">{student.intensiveMonths} мес.</div>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500">Дни заморозки</label>
              {isEditing ? (
                <input
                  type="number"
                  value={formData.freezeDays as number}
                  onChange={(e) => setFormData({ ...formData, freezeDays: parseInt(e.target.value) || 0 })}
                  className={inputClass}
                />
              ) : (
                <div className="text-sm font-medium text-gray-900">{student.freezeDays} дней</div>
              )}
            </div>
          </div>
        </div>

        {/* Section 5: Payment */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs">5</span>
            Оплата
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">План оплаты</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.paymentPlan as string}
                    onChange={(e) => setFormData({ ...formData, paymentPlan: e.target.value })}
                    placeholder="ONE_TRANCHE"
                    className={inputClass}
                  />
                ) : (
                  <div className="text-sm font-medium text-gray-900">{formatPaymentPlan(student.paymentPlan)}</div>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500">Общая сумма</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={formData.totalAmount as number}
                    onChange={(e) => setFormData({ ...formData, totalAmount: parseFloat(e.target.value) || 0 })}
                    className={inputClass}
                  />
                ) : (
                  <div className="text-lg font-bold text-gray-900">{formatAmount(student.totalAmount)}</div>
                )}
              </div>
            </div>
            {isEditing ? (
              <div>
                <label className="text-xs text-gray-500">Ежемесячный платеж</label>
                <input
                  type="number"
                  value={formData.monthlyPayment as number}
                  onChange={(e) => setFormData({ ...formData, monthlyPayment: parseFloat(e.target.value) || 0 })}
                  className={inputClass}
                />
              </div>
            ) : student.monthlyPayment ? (
              <div>
                <label className="text-xs text-gray-500">Ежемесячный платеж</label>
                <div className="text-sm font-medium text-gray-900">{formatAmount(student.monthlyPayment)}</div>
              </div>
            ) : null}

            {/* Tranches */}
            {(student.tranche1Amount || (isEditing && isSuperAdmin)) && (
              <div className="pt-3 border-t border-gray-200">
                <div className="text-xs font-medium text-gray-700 mb-2">График платежей</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Транш 1</span>
                    {isEditing && isSuperAdmin ? (
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={formData.tranche1Amount as number}
                          onChange={(e) => setFormData({ ...formData, tranche1Amount: parseFloat(e.target.value) || 0 })}
                          placeholder="Сумма"
                          className="w-32 px-2 py-1 border border-gray-200 rounded text-sm"
                        />
                        <input
                          type="date"
                          value={formData.tranche1Date as string}
                          onChange={(e) => setFormData({ ...formData, tranche1Date: e.target.value })}
                          className="px-2 py-1 border border-gray-200 rounded text-sm"
                        />
                      </div>
                    ) : (
                      <span className="text-sm font-medium text-gray-900">
                        {formatAmount(student.tranche1Amount)}
                        {student.tranche1Date && (
                          <span className="text-xs text-gray-500 ml-2">
                            до {formatDate(student.tranche1Date)}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  {(student.tranche2Amount || (isEditing && isSuperAdmin)) && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Транш 2</span>
                      {isEditing && isSuperAdmin ? (
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={formData.tranche2Amount as number}
                            onChange={(e) => setFormData({ ...formData, tranche2Amount: parseFloat(e.target.value) || 0 })}
                            placeholder="Сумма"
                            className="w-32 px-2 py-1 border border-gray-200 rounded text-sm"
                          />
                          <input
                            type="date"
                            value={formData.tranche2Date as string}
                            onChange={(e) => setFormData({ ...formData, tranche2Date: e.target.value })}
                            className="px-2 py-1 border border-gray-200 rounded text-sm"
                          />
                        </div>
                      ) : student.tranche2Amount ? (
                        <span className="text-sm font-medium text-gray-900">
                          {formatAmount(student.tranche2Amount)}
                          {student.tranche2Date && (
                            <span className="text-xs text-gray-500 ml-2">
                              до {formatDate(student.tranche2Date)}
                            </span>
                          )}
                        </span>
                      ) : null}
                    </div>
                  )}
                  {(student.tranche3Amount || (isEditing && isSuperAdmin)) && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Транш 3</span>
                      {isEditing && isSuperAdmin ? (
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={formData.tranche3Amount as number}
                            onChange={(e) => setFormData({ ...formData, tranche3Amount: parseFloat(e.target.value) || 0 })}
                            placeholder="Сумма"
                            className="w-32 px-2 py-1 border border-gray-200 rounded text-sm"
                          />
                          <input
                            type="date"
                            value={formData.tranche3Date as string}
                            onChange={(e) => setFormData({ ...formData, tranche3Date: e.target.value })}
                            className="px-2 py-1 border border-gray-200 rounded text-sm"
                          />
                        </div>
                      ) : student.tranche3Amount ? (
                        <span className="text-sm font-medium text-gray-900">
                          {formatAmount(student.tranche3Amount)}
                          {student.tranche3Date && (
                            <span className="text-xs text-gray-500 ml-2">
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
        <div className="pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            Дата зачисления: {formatDate(student.createdAt)}
          </div>
        </div>
      </div>
    </SlideOver>
  );
}
