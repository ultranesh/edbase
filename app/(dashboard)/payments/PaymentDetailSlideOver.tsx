'use client';

import { useState, useEffect } from 'react';
import SlideOver from '../components/SlideOver';
import { useNotification } from '@/app/components/ui/NotificationProvider';
import { useLanguage } from '@/app/components/LanguageProvider';

interface PaymentData {
  id: string;
  date: string;
  actualAmount: number | null;
  contractAmount: number | null;
  method: string;
  status: string;
  isConfirmed: boolean;
  confirmedAt: string | null;
  studentName: string;
  parentName: string;
  parentPhone: string | null;
  coordinatorId: string | null;
  coordinatorName: string;
  partnerId: string | null;
  partnerName: string | null;
  confirmedByName: string | null;
  description: string | null;
  studentId: string;
}

interface RefPaymentMethod {
  code: string;
  name: string;
  nameKz: string | null;
  nameRu: string | null;
  nameEn: string | null;
  isActive: boolean;
}

interface CoordinatorOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface PaymentDetailSlideOverProps {
  payment: PaymentData | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payment: PaymentData) => void;
  canConfirm: boolean;
  confirmingId: string | null;
  userRole: string;
  onUpdate: () => void;
  onDelete: () => void;
}

export default function PaymentDetailSlideOver({
  payment,
  isOpen,
  onClose,
  onConfirm,
  canConfirm,
  confirmingId,
  userRole,
  onUpdate,
  onDelete,
}: PaymentDetailSlideOverProps) {
  const { t, language } = useLanguage();
  const { showToast, showConfirm } = useNotification();
  const [methodsMap, setMethodsMap] = useState<Record<string, RefPaymentMethod>>({});
  const [paymentMethods, setPaymentMethods] = useState<RefPaymentMethod[]>([]);
  const [coordinators, setCoordinators] = useState<CoordinatorOption[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    actualAmount: '',
    method: '',
    description: '',
    coordinatorId: '',
    partnerId: '',
  });

  const canEdit = userRole === 'ADMIN' || userRole === 'SUPERADMIN';

  useEffect(() => {
    fetch('/api/database/payment-methods')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const map: Record<string, RefPaymentMethod> = {};
          data.forEach((m: RefPaymentMethod) => { map[m.code] = m; });
          setMethodsMap(map);
          setPaymentMethods(data.filter((m: RefPaymentMethod) => m.isActive));
        }
      })
      .catch(() => {});

    fetch('/api/coordinators')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setCoordinators(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
    }
  }, [isOpen]);

  if (!payment) return null;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const formatAmount = (amount: number | null) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('ru-RU').format(amount) + ' ' + t('payments.tenge');
  };

  const getMethodLabel = (method: string) => {
    const ref = methodsMap[method];
    if (!ref) return method;
    if (language === 'kk') return ref.nameKz || ref.nameRu || ref.name;
    if (language === 'en') return ref.nameEn || ref.name;
    return ref.nameRu || ref.name;
  };

  const handleEdit = () => {
    setFormData({
      actualAmount: String(payment.actualAmount || ''),
      method: payment.method || '',
      description: payment.description || '',
      coordinatorId: payment.coordinatorId || '',
      partnerId: payment.partnerId || '',
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!formData.actualAmount || !formData.method) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/payments/${payment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actualAmount: parseFloat(formData.actualAmount),
          method: formData.method,
          description: formData.description || null,
          coordinatorId: formData.coordinatorId || null,
          partnerId: formData.partnerId || null,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to update payment');
      }
      showToast({ message: 'Оплата обновлена', type: 'success' });
      setIsEditing(false);
      onUpdate();
    } catch (err) {
      showToast({ message: err instanceof Error ? err.message : 'Ошибка', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = await showConfirm({
      title: 'Удалить оплату',
      message: `Вы уверены, что хотите удалить оплату на сумму ${formatAmount(payment.actualAmount)}?`,
      confirmText: 'Удалить',
      cancelText: t('payments.cancel'),
      type: 'danger',
    });
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/payments/${payment.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to delete payment');
      }
      showToast({ message: 'Оплата удалена', type: 'success' });
      onDelete();
    } catch (err) {
      showToast({ message: err instanceof Error ? err.message : 'Ошибка', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const labelClass = 'text-sm text-gray-500 dark:text-gray-400';
  const valueClass = 'text-sm font-medium text-gray-900 dark:text-white';
  const inputClass = 'w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

  return (
    <SlideOver isOpen={isOpen} onClose={onClose} title={t('payments.title')}>
      <div className="p-6 space-y-6">
        {/* Header actions */}
        {canEdit && (
          <div className="flex items-center justify-end gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !formData.actualAmount || !formData.method}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSaving ? '...' : 'Сохранить'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleEdit}
                  className="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Редактировать
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {isDeleting ? '...' : 'Удалить'}
                </button>
              </>
            )}
          </div>
        )}

        {/* Section 1: Payment Info */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/50 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">1</span>
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {t('payments.title')}
            </span>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className={labelClass}>{t('payments.date')}</span>
              <span className={valueClass}>{formatDate(payment.date)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={labelClass}>{t('payments.actualAmount')}</span>
              {isEditing ? (
                <input
                  type="number"
                  value={formData.actualAmount}
                  onChange={(e) => setFormData({ ...formData, actualAmount: e.target.value })}
                  className={`${inputClass} max-w-[200px] text-right`}
                  min="0"
                  step="any"
                />
              ) : (
                <span className={valueClass}>{formatAmount(payment.actualAmount)}</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className={labelClass}>{t('payments.contractAmount')}</span>
              <span className={valueClass}>{formatAmount(payment.contractAmount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={labelClass}>{t('payments.method')}</span>
              {isEditing ? (
                <select
                  value={formData.method}
                  onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                  className={`${inputClass} max-w-[200px]`}
                >
                  <option value="">{t('payments.selectMethod')}</option>
                  {paymentMethods.map((pm) => (
                    <option key={pm.code} value={pm.code}>
                      {language === 'kk' ? (pm.nameKz || pm.nameRu || pm.name) : language === 'en' ? (pm.nameEn || pm.name) : (pm.nameRu || pm.name)}
                    </option>
                  ))}
                </select>
              ) : (
                <span className={valueClass}>{getMethodLabel(payment.method)}</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className={labelClass}>{t('payments.status')}</span>
              {payment.isConfirmed ? (
                <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-lg bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700">
                  {t('payments.confirmed')}
                </span>
              ) : (
                <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-lg bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-700">
                  {t('payments.pendingConfirmation')}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className={labelClass}>{t('payments.description')}</span>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`${inputClass} max-w-[200px]`}
                  placeholder={t('payments.description')}
                />
              ) : (
                <span className={valueClass}>{payment.description || '-'}</span>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Student & Parent */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/50 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">2</span>
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {t('payments.studentName')} &amp; {t('payments.parentName')}
            </span>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className={labelClass}>{t('payments.studentName')}</span>
              <span className={valueClass}>{payment.studentName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={labelClass}>{t('payments.parentName')}</span>
              <span className={valueClass}>{payment.parentName}</span>
            </div>
            {payment.parentPhone && (
              <div className="flex items-center justify-between">
                <span className={labelClass}>Телефон родителя</span>
                <span className={valueClass}>{payment.parentPhone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Coordinator Info */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/50 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">3</span>
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {t('payments.coordinator')}
            </span>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className={labelClass}>{t('payments.coordinator')}</span>
              {isEditing ? (
                <select
                  value={formData.coordinatorId}
                  onChange={(e) => setFormData({ ...formData, coordinatorId: e.target.value })}
                  className={`${inputClass} max-w-[200px]`}
                >
                  <option value="">—</option>
                  {coordinators.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.lastName} {c.firstName}
                    </option>
                  ))}
                </select>
              ) : (
                <span className={valueClass}>{payment.coordinatorName}</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className={labelClass}>
                {t('payments.partner')}
                {!isEditing && payment.partnerName && (
                  <span className="ml-1.5 inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                    {t('payments.partnerSplit')}
                  </span>
                )}
              </span>
              {isEditing ? (
                <select
                  value={formData.partnerId}
                  onChange={(e) => setFormData({ ...formData, partnerId: e.target.value })}
                  className={`${inputClass} max-w-[200px]`}
                >
                  <option value="">—</option>
                  {coordinators.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.lastName} {c.firstName}
                    </option>
                  ))}
                </select>
              ) : (
                <span className={valueClass}>{payment.partnerName || '-'}</span>
              )}
            </div>
          </div>
        </div>

        {/* Section 4: Confirmation */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/50 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">4</span>
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {t('payments.confirmed')}
            </span>
          </div>
          <div className="px-5 py-4 space-y-3">
            {payment.isConfirmed ? (
              <>
                <div className="flex items-center justify-between">
                  <span className={labelClass}>{t('payments.confirmedBy')}</span>
                  <span className={valueClass}>{payment.confirmedByName || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={labelClass}>{t('payments.date')}</span>
                  <span className={valueClass}>{formatDate(payment.confirmedAt)}</span>
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t('payments.pendingConfirmation')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Button */}
      {!payment.isConfirmed && canConfirm && !isEditing && (
        <div className="px-6 pb-6">
          <button
            onClick={() => onConfirm(payment)}
            disabled={confirmingId === payment.id}
            className="w-full py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {confirmingId === payment.id ? '...' : t('payments.confirm')}
          </button>
        </div>
      )}
    </SlideOver>
  );
}
