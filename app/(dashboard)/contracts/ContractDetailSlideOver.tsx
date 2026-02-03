'use client';

import { useState } from 'react';
import SlideOver from '../components/SlideOver';
import { useNotification } from '@/app/components/ui/NotificationProvider';

interface ContractData {
  id: string;
  studentId: string;
  contractNumber: string | null;
  studentName: string;
  parentName: string | null;
  parentPhone: string | null;
  studentIIN: string;
  parentIIN: string;
  documentNumber: string;
  gradeLevel: string | null;
  subjects: string[];
  studyFormat: string | null;
  guarantee: string | null;
  standardMonths: number;
  bonusMonths: number;
  intensiveMonths: number;
  freezeDays: number;
  paymentPlan: string | null;
  tranche1Amount: number | null;
  tranche1Date: string | null;
  tranche2Amount: number | null;
  tranche2Date: string | null;
  tranche3Amount: number | null;
  tranche3Date: string | null;
  totalAmount: number | null;
  studyStartDate: string | null;
  studyEndDate: string | null;
  enrollmentDate: string;
  status: string;
  contractConfirmed: boolean;
  contractConfirmedAt: string | null;
}

interface ContractDetailSlideOverProps {
  contract: ContractData | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (contract: ContractData) => void;
  onDownload: (contract: ContractData) => void;
  onUpdate: () => void;
  isConfirming: boolean;
  isDownloading: boolean;
  userRole: string;
}

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

export default function ContractDetailSlideOver({
  contract,
  isOpen,
  onClose,
  onConfirm,
  onDownload,
  onUpdate,
  isConfirming,
  isDownloading,
  userRole,
}: ContractDetailSlideOverProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useNotification();

  if (!contract) return null;

  const canEdit = userRole === 'ADMIN' || userRole === 'SUPERADMIN';
  const isSuperAdmin = userRole === 'SUPERADMIN';

  const handleEdit = () => {
    setFormData({
      contractNumber: contract.contractNumber || '',
      parentName: contract.parentName || '',
      parentPhone: contract.parentPhone || '',
      studyFormat: contract.studyFormat || '',
      guarantee: contract.guarantee || '',
      standardMonths: contract.standardMonths,
      bonusMonths: contract.bonusMonths,
      intensiveMonths: contract.intensiveMonths,
      freezeDays: contract.freezeDays,
      paymentPlan: contract.paymentPlan || '',
      totalAmount: contract.totalAmount || 0,
      tranche1Amount: contract.tranche1Amount || 0,
      tranche1Date: contract.tranche1Date ? new Date(contract.tranche1Date).toISOString().split('T')[0] : '',
      tranche2Amount: contract.tranche2Amount || 0,
      tranche2Date: contract.tranche2Date ? new Date(contract.tranche2Date).toISOString().split('T')[0] : '',
      tranche3Amount: contract.tranche3Amount || 0,
      tranche3Date: contract.tranche3Date ? new Date(contract.tranche3Date).toISOString().split('T')[0] : '',
      studyStartDate: contract.studyStartDate ? new Date(contract.studyStartDate).toISOString().split('T')[0] : '',
      studyEndDate: contract.studyEndDate ? new Date(contract.studyEndDate).toISOString().split('T')[0] : '',
    });
    setIsEditing(true);
  };

  const updateTrancheAmount = (field: string, value: string) => {
    const updated = { ...formData, [field]: value };
    const t1 = parseFloat(String(field === 'tranche1Amount' ? value : updated.tranche1Amount)) || 0;
    const t2 = parseFloat(String(field === 'tranche2Amount' ? value : updated.tranche2Amount)) || 0;
    const t3 = parseFloat(String(field === 'tranche3Amount' ? value : updated.tranche3Amount)) || 0;
    updated.totalAmount = t1 + t2 + t3;
    setFormData(updated);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        contractNumber: formData.contractNumber || null,
        parentName: formData.parentName || null,
        parentPhone: formData.parentPhone || null,
        studyFormat: formData.studyFormat || null,
        guarantee: formData.guarantee || null,
        paymentPlan: formData.paymentPlan || null,
        standardMonths: parseInt(String(formData.standardMonths)) || 0,
        bonusMonths: parseInt(String(formData.bonusMonths)) || 0,
        intensiveMonths: parseInt(String(formData.intensiveMonths)) || 0,
        freezeDays: parseInt(String(formData.freezeDays)) || 0,
        totalAmount: parseFloat(String(formData.totalAmount)) || null,
      };

      // Tranche data - editable by ADMIN and SUPERADMIN
      payload.tranche1Amount = parseFloat(String(formData.tranche1Amount)) || null;
      payload.tranche1Date = formData.tranche1Date ? new Date(formData.tranche1Date as string) : null;
      payload.tranche2Amount = parseFloat(String(formData.tranche2Amount)) || null;
      payload.tranche2Date = formData.tranche2Date ? new Date(formData.tranche2Date as string) : null;
      payload.tranche3Amount = parseFloat(String(formData.tranche3Amount)) || null;
      payload.tranche3Date = formData.tranche3Date ? new Date(formData.tranche3Date as string) : null;

      // Study dates - only SUPERADMIN
      if (isSuperAdmin) {
        payload.studyStartDate = formData.studyStartDate ? new Date(formData.studyStartDate as string) : null;
        payload.studyEndDate = formData.studyEndDate ? new Date(formData.studyEndDate as string) : null;
      }

      const response = await fetch(`/api/students/${contract.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        showToast({ message: `Ошибка: ${errorData.error || 'Неизвестная ошибка'}`, type: 'error' });
        return;
      }

      setIsEditing(false);
      showToast({ message: 'Договор успешно обновлён', type: 'success' });
      onUpdate();
    } catch (error) {
      console.error('Save error:', error);
      showToast({ message: 'Ошибка при сохранении', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const formatAmount = (amount: number | null) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('ru-RU').format(amount) + ' тг';
  };

  const formatGuarantee = (guarantee: string | null) => {
    const guarantees: Record<string, string> = { NONE: 'Нет', FIFTY_PERCENT: '50%', EIGHTY_PERCENT: '80%', HUNDRED_PERCENT: '100%' };
    return guarantee ? guarantees[guarantee] || guarantee : '-';
  };

  const formatStudyFormat = (format: string | null) => {
    const formats: Record<string, string> = {
      ONLINE_GROUP: 'Онлайн (группа)', OFFLINE_GROUP: 'Оффлайн (группа)',
      ONLINE_INDIVIDUAL: 'Онлайн (индивидуально)', OFFLINE_INDIVIDUAL: 'Оффлайн (индивидуально)',
      ONLINE: 'Онлайн', OFFLINE: 'Оффлайн',
    };
    return format ? formats[format] || format : '-';
  };

  const formatPaymentPlan = (plan: string | null) => {
    const plans: Record<string, string> = { ONE_TRANCHE: '1 транш (полная оплата)', TWO_TRANCHES: '2 транша', THREE_TRANCHES: '3 транша' };
    return plan ? plans[plan] || plan : '-';
  };

  const getContractStatusBadge = () => {
    if (!contract.contractConfirmed) {
      return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-orange-500 text-white">Ожидает подтверждения договора</span>;
    }
    if (contract.status === 'PENDING_APPROVAL') {
      return <span className="px-3 py-1 text-xs font-medium rounded-full bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300">Ожидает зачисления</span>;
    }
    const statusMap: Record<string, { label: string; className: string }> = {
      ACTIVE: { label: 'Активен', className: 'bg-green-500 text-white' },
      INACTIVE: { label: 'Неактивен', className: 'bg-gray-500 text-white' },
      GRADUATED: { label: 'Выпускник', className: 'bg-blue-500 text-white' },
      EXPELLED: { label: 'Отчислен', className: 'bg-red-500 text-white' },
      FROZEN: { label: 'FROZEN', className: 'bg-cyan-500 text-white' },
    };
    const info = statusMap[contract.status] || { label: contract.status, className: 'bg-gray-500 text-white' };
    return <span className={`px-3 py-1 text-xs font-semibold rounded-full ${info.className}`}>{info.label}</span>;
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
      title={`Договор: ${contract.studentName}`}
    >
      <div className="px-6 py-6 space-y-6">
        {/* Header with Status and Actions */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          {getContractStatusBadge()}
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
            {!isEditing && (
              <>
                {!contract.contractConfirmed && (
                  <button
                    onClick={() => onConfirm(contract)}
                    disabled={isConfirming}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isConfirming ? 'Подтверждение...' : 'Подтвердить'}
                  </button>
                )}
                <button
                  onClick={() => onDownload(contract)}
                  disabled={isDownloading || !contract.contractConfirmed}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title={!contract.contractConfirmed ? 'Сначала подтвердите договор' : ''}
                >
                  {isDownloading ? 'Генерация...' : 'PDF'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Contract Number */}
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <span className="text-sm text-blue-600 dark:text-blue-400 font-medium whitespace-nowrap">№ договора:</span>
          {isEditing && canEdit ? (
            <input
              type="text"
              value={formData.contractNumber as string}
              onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
              className="flex-1 px-3 py-1.5 bg-white dark:bg-gray-700 border border-blue-200 dark:border-blue-700 rounded-lg text-sm font-mono font-bold text-blue-700 dark:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 transition-all"
              placeholder="AAA-001"
            />
          ) : (
            <span className="text-sm font-mono font-bold text-blue-700 dark:text-blue-300">{contract.contractNumber || '—'}</span>
          )}
        </div>

        {/* Section 1: Student Information */}
        <div>
          <h3 className={sectionHeaderClass}>
            <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-xs text-blue-600 dark:text-blue-400">1</span>
            Данные ученика
          </h3>
          <div className={sectionBoxClass}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>ФИО ученика</label>
                <div className={valueClass}>{contract.studentName}</div>
              </div>
              <div>
                <label className={labelClass}>ИИН ученика</label>
                <div className={valueClass}>{contract.studentIIN}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Класс</label>
                <div className={valueClass}>{contract.gradeLevel ? `${contract.gradeLevel} класс` : '-'}</div>
              </div>
              <div>
                <label className={labelClass}>Номер документа</label>
                <div className={valueClass}>{contract.documentNumber}</div>
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
                  <input type="text" value={formData.parentName as string} onChange={(e) => setFormData({ ...formData, parentName: e.target.value })} className={inputClass} />
                ) : (
                  <div className={valueClass}>{contract.parentName || '-'}</div>
                )}
              </div>
              <div>
                <label className={labelClass}>ИИН родителя</label>
                <div className={valueClass}>{contract.parentIIN}</div>
              </div>
            </div>
            <div>
              <label className={labelClass}>Телефон родителя</label>
              {isEditing ? (
                <input type="tel" value={formData.parentPhone as string} onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })} placeholder="+7 XXX XXX XX XX" className={inputClass} />
              ) : (
                <div className={valueClass}>{contract.parentPhone || '-'}</div>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Study Conditions */}
        <div>
          <h3 className={sectionHeaderClass}>
            <span className="w-6 h-6 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center text-xs text-green-600 dark:text-green-400">3</span>
            Условия обучения
          </h3>
          <div className={sectionBoxClass}>
            <div>
              <label className={labelClass}>Предметы</label>
              <div className="flex flex-wrap gap-1 mt-1">
                {contract.subjects.length > 0 ? contract.subjects.map((s) => (
                  <span key={s} className="px-2 py-0.5 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">{s}</span>
                )) : <span className={valueClass}>-</span>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Формат обучения</label>
                {isEditing ? (
                  <select value={formData.studyFormat as string} onChange={(e) => setFormData({ ...formData, studyFormat: e.target.value })} className={selectClass}>
                    <option value="">Не выбран</option>
                    {studyFormatOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <div className={valueClass}>{formatStudyFormat(contract.studyFormat)}</div>
                )}
              </div>
              <div>
                <label className={labelClass}>Гарантия</label>
                {isEditing ? (
                  <select value={formData.guarantee as string} onChange={(e) => setFormData({ ...formData, guarantee: e.target.value })} className={selectClass}>
                    <option value="">Не выбрана</option>
                    {guaranteeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <div className={valueClass}>{formatGuarantee(contract.guarantee)}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Study Period */}
        <div>
          <h3 className={sectionHeaderClass}>
            <span className="w-6 h-6 bg-yellow-100 dark:bg-yellow-900/50 rounded-full flex items-center justify-center text-xs text-yellow-600 dark:text-yellow-400">4</span>
            Период обучения
          </h3>
          <div className={sectionBoxClass}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Дата начала</label>
                {isEditing && isSuperAdmin ? (
                  <input type="date" value={formData.studyStartDate as string} onChange={(e) => setFormData({ ...formData, studyStartDate: e.target.value })} className={inputClass} />
                ) : (
                  <div className={valueClass}>{formatDate(contract.studyStartDate)}</div>
                )}
              </div>
              <div>
                <label className={labelClass}>Дата окончания</label>
                {isEditing && isSuperAdmin ? (
                  <input type="date" value={formData.studyEndDate as string} onChange={(e) => setFormData({ ...formData, studyEndDate: e.target.value })} className={inputClass} />
                ) : (
                  <div className={valueClass}>{formatDate(contract.studyEndDate)}</div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Стандартные мес.</label>
                {isEditing ? (
                  <input type="number" value={formData.standardMonths as number} onChange={(e) => setFormData({ ...formData, standardMonths: e.target.value })} className={inputClass} min="0" />
                ) : (
                  <div className={valueClass}>{contract.standardMonths} мес.</div>
                )}
              </div>
              <div>
                <label className={labelClass}>Бонусные мес.</label>
                {isEditing ? (
                  <input type="number" value={formData.bonusMonths as number} onChange={(e) => setFormData({ ...formData, bonusMonths: e.target.value })} className={inputClass} min="0" />
                ) : (
                  <div className={valueClass}>{contract.bonusMonths} мес.</div>
                )}
              </div>
              <div>
                <label className={labelClass}>Интенсивные мес.</label>
                {isEditing ? (
                  <input type="number" value={formData.intensiveMonths as number} onChange={(e) => setFormData({ ...formData, intensiveMonths: e.target.value })} className={inputClass} min="0" />
                ) : (
                  <div className={valueClass}>{contract.intensiveMonths} мес.</div>
                )}
              </div>
            </div>
            <div>
              <label className={labelClass}>Дни заморозки</label>
              {isEditing ? (
                <input type="number" value={formData.freezeDays as number} onChange={(e) => setFormData({ ...formData, freezeDays: e.target.value })} className={inputClass} min="0" />
              ) : (
                <div className={valueClass}>{contract.freezeDays} дней</div>
              )}
            </div>
          </div>
        </div>

        {/* Section 5: Payment */}
        <div>
          <h3 className={sectionHeaderClass}>
            <span className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-xs text-indigo-600 dark:text-indigo-400">5</span>
            Оплата
          </h3>
          <div className={sectionBoxClass}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>План оплаты</label>
                {isEditing ? (
                  <select value={formData.paymentPlan as string} onChange={(e) => setFormData({ ...formData, paymentPlan: e.target.value })} className={selectClass}>
                    <option value="">Не выбран</option>
                    {paymentPlanOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <div className={valueClass}>{formatPaymentPlan(contract.paymentPlan)}</div>
                )}
              </div>
              <div>
                <label className={labelClass}>Общая сумма</label>
                {isEditing ? (
                  <div className="text-lg font-bold text-gray-900 dark:text-white">{formatAmount(formData.totalAmount as number)}</div>
                ) : (
                  <div className="text-lg font-bold text-gray-900 dark:text-white">{formatAmount(contract.totalAmount)}</div>
                )}
              </div>
            </div>

            {/* Tranches */}
            {(contract.tranche1Amount || isEditing) && (
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">График платежей</div>
                <div className="space-y-2">
                  {/* Tranche 1 */}
                  {isEditing && canEdit ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={labelClass}>Транш 1 — сумма</label>
                        <input type="number" value={formData.tranche1Amount as number} onChange={(e) => updateTrancheAmount('tranche1Amount', e.target.value)} className={inputClass} min="0" />
                      </div>
                      <div>
                        <label className={labelClass}>Транш 1 — дата</label>
                        <input type="date" value={formData.tranche1Date as string} onChange={(e) => setFormData({ ...formData, tranche1Date: e.target.value })} className={inputClass} />
                      </div>
                    </div>
                  ) : contract.tranche1Amount ? (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Транш 1</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatAmount(contract.tranche1Amount)}
                        {contract.tranche1Date && <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">до {formatDate(contract.tranche1Date)}</span>}
                      </span>
                    </div>
                  ) : null}

                  {/* Tranche 2 */}
                  {isEditing && canEdit ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={labelClass}>Транш 2 — сумма</label>
                        <input type="number" value={formData.tranche2Amount as number} onChange={(e) => updateTrancheAmount('tranche2Amount', e.target.value)} className={inputClass} min="0" />
                      </div>
                      <div>
                        <label className={labelClass}>Транш 2 — дата</label>
                        <input type="date" value={formData.tranche2Date as string} onChange={(e) => setFormData({ ...formData, tranche2Date: e.target.value })} className={inputClass} />
                      </div>
                    </div>
                  ) : contract.tranche2Amount ? (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Транш 2</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatAmount(contract.tranche2Amount)}
                        {contract.tranche2Date && <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">до {formatDate(contract.tranche2Date)}</span>}
                      </span>
                    </div>
                  ) : null}

                  {/* Tranche 3 */}
                  {isEditing && canEdit ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={labelClass}>Транш 3 — сумма</label>
                        <input type="number" value={formData.tranche3Amount as number} onChange={(e) => updateTrancheAmount('tranche3Amount', e.target.value)} className={inputClass} min="0" />
                      </div>
                      <div>
                        <label className={labelClass}>Транш 3 — дата</label>
                        <input type="date" value={formData.tranche3Date as string} onChange={(e) => setFormData({ ...formData, tranche3Date: e.target.value })} className={inputClass} />
                      </div>
                    </div>
                  ) : contract.tranche3Amount ? (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Транш 3</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatAmount(contract.tranche3Amount)}
                        {contract.tranche3Date && <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">до {formatDate(contract.tranche3Date)}</span>}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer metadata */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
            <div>Дата заключения: {formatDate(contract.enrollmentDate)}</div>
            {contract.contractConfirmedAt && (
              <div>Договор подтвержден: {formatDate(contract.contractConfirmedAt)}</div>
            )}
          </div>
        </div>
      </div>
    </SlideOver>
  );
}
