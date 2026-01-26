'use client';

import SlideOver from '../components/SlideOver';

interface ContractData {
  id: string;
  studentId: string;
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
  isConfirming: boolean;
  isDownloading: boolean;
}

export default function ContractDetailSlideOver({
  contract,
  isOpen,
  onClose,
  onConfirm,
  onDownload,
  isConfirming,
  isDownloading,
}: ContractDetailSlideOverProps) {
  if (!contract) return null;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const formatAmount = (amount: number | null) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('ru-RU').format(amount) + ' тг';
  };

  const formatGradeLevel = (level: string | null) => {
    if (!level) return '-';
    return level.replace('GRADE_', '') + ' класс';
  };

  const formatSubjects = (subjects: string[]) => {
    const subjectNames: Record<string, string> = {
      MATHEMATICS: 'Математика',
      LOGIC: 'Логика',
      KAZAKH: 'Казахский язык',
      RUSSIAN: 'Русский язык',
      ENGLISH: 'Английский язык',
      NATURAL_SCIENCE: 'Естествознание',
      ALGEBRA: 'Алгебра',
      GEOMETRY: 'Геометрия',
      PHYSICS: 'Физика',
      CHEMISTRY: 'Химия',
      BIOLOGY: 'Биология',
      HISTORY_KZ: 'История Казахстана',
      GEOGRAPHY: 'География',
      WORLD_HISTORY: 'Всемирная история',
    };
    return subjects.map(s => subjectNames[s] || s).join(', ') || '-';
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

  const getContractStatusBadge = () => {
    if (!contract.contractConfirmed) {
      return (
        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-orange-500 text-white">
          Ожидает подтверждения договора
        </span>
      );
    }
    if (contract.status === 'PENDING_APPROVAL') {
      return (
        <span className="px-3 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
          Ожидает зачисления от куратора
        </span>
      );
    }
    const statusMap: Record<string, { label: string; className: string }> = {
      ACTIVE: { label: 'Активен', className: 'bg-green-100 text-green-800' },
      INACTIVE: { label: 'Неактивен', className: 'bg-gray-100 text-gray-800' },
      GRADUATED: { label: 'Выпускник', className: 'bg-blue-100 text-blue-800' },
      EXPELLED: { label: 'Отчислен', className: 'bg-red-100 text-red-800' },
    };
    const info = statusMap[contract.status] || { label: contract.status, className: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-3 py-1 text-xs font-medium rounded-full ${info.className}`}>
        {info.label}
      </span>
    );
  };

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title={`Договор: ${contract.studentName}`}
    >
      <div className="px-6 py-6 space-y-6">
        {/* Header with Status and Actions */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          {getContractStatusBadge()}
          <div className="flex gap-2">
            {!contract.contractConfirmed && (
              <button
                onClick={() => onConfirm(contract)}
                disabled={isConfirming}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isConfirming ? 'Подтверждение...' : 'Подтвердить договор'}
              </button>
            )}
            <button
              onClick={() => onDownload(contract)}
              disabled={isDownloading || !contract.contractConfirmed}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={!contract.contractConfirmed ? 'Сначала подтвердите договор' : ''}
            >
              {isDownloading ? 'Генерация...' : 'Скачать PDF'}
            </button>
          </div>
        </div>

        {/* Student Information */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs">1</span>
            Данные ученика
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">ФИО ученика</label>
                <div className="text-sm font-medium text-gray-900">{contract.studentName}</div>
              </div>
              <div>
                <label className="text-xs text-gray-500">ИИН ученика</label>
                <div className="text-sm font-medium text-gray-900">{contract.studentIIN}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">Класс</label>
                <div className="text-sm font-medium text-gray-900">{formatGradeLevel(contract.gradeLevel)}</div>
              </div>
              <div>
                <label className="text-xs text-gray-500">Номер документа</label>
                <div className="text-sm font-medium text-gray-900">{contract.documentNumber}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Parent Information */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs">2</span>
            Данные родителя/законного представителя
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">ФИО родителя</label>
                <div className="text-sm font-medium text-gray-900">{contract.parentName || '-'}</div>
              </div>
              <div>
                <label className="text-xs text-gray-500">ИИН родителя</label>
                <div className="text-sm font-medium text-gray-900">{contract.parentIIN}</div>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500">Телефон родителя</label>
              <div className="text-sm font-medium text-gray-900">{contract.parentPhone || '-'}</div>
            </div>
          </div>
        </div>

        {/* Study Information */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs">3</span>
            Условия обучения
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div>
              <label className="text-xs text-gray-500">Предметы</label>
              <div className="text-sm font-medium text-gray-900">{formatSubjects(contract.subjects)}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">Формат обучения</label>
                <div className="text-sm font-medium text-gray-900">{formatStudyFormat(contract.studyFormat)}</div>
              </div>
              <div>
                <label className="text-xs text-gray-500">Гарантия</label>
                <div className="text-sm font-medium text-gray-900">{formatGuarantee(contract.guarantee)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Period */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs">4</span>
            Период обучения
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">Дата начала</label>
                <div className="text-sm font-medium text-gray-900">{formatDate(contract.studyStartDate)}</div>
              </div>
              <div>
                <label className="text-xs text-gray-500">Дата окончания</label>
                <div className="text-sm font-medium text-gray-900">{formatDate(contract.studyEndDate)}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-500">Стандартные месяцы</label>
                <div className="text-sm font-medium text-gray-900">{contract.standardMonths} мес.</div>
              </div>
              <div>
                <label className="text-xs text-gray-500">Бонусные месяцы</label>
                <div className="text-sm font-medium text-gray-900">{contract.bonusMonths} мес.</div>
              </div>
              <div>
                <label className="text-xs text-gray-500">Интенсивные месяцы</label>
                <div className="text-sm font-medium text-gray-900">{contract.intensiveMonths} мес.</div>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500">Дни заморозки</label>
              <div className="text-sm font-medium text-gray-900">{contract.freezeDays} дней</div>
            </div>
          </div>
        </div>

        {/* Payment Information */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs">5</span>
            Оплата
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">План оплаты</label>
                <div className="text-sm font-medium text-gray-900">{formatPaymentPlan(contract.paymentPlan)}</div>
              </div>
              <div>
                <label className="text-xs text-gray-500">Общая сумма</label>
                <div className="text-lg font-bold text-gray-900">{formatAmount(contract.totalAmount)}</div>
              </div>
            </div>

            {/* Tranches */}
            {contract.tranche1Amount && (
              <div className="pt-3 border-t border-gray-200">
                <div className="text-xs font-medium text-gray-700 mb-2">График платежей</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Транш 1</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatAmount(contract.tranche1Amount)}
                      {contract.tranche1Date && (
                        <span className="text-xs text-gray-500 ml-2">
                          до {formatDate(contract.tranche1Date)}
                        </span>
                      )}
                    </span>
                  </div>
                  {contract.tranche2Amount && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Транш 2</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatAmount(contract.tranche2Amount)}
                        {contract.tranche2Date && (
                          <span className="text-xs text-gray-500 ml-2">
                            до {formatDate(contract.tranche2Date)}
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {contract.tranche3Amount && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Транш 3</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatAmount(contract.tranche3Amount)}
                        {contract.tranche3Date && (
                          <span className="text-xs text-gray-500 ml-2">
                            до {formatDate(contract.tranche3Date)}
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

        {/* Contract Status Info */}
        <div className="pt-4 border-t border-gray-200">
          <div className="space-y-2 text-xs text-gray-500">
            <div>Дата зачисления: {formatDate(contract.enrollmentDate)}</div>
            {contract.contractConfirmedAt && (
              <div>Договор подтвержден: {formatDate(contract.contractConfirmedAt)}</div>
            )}
          </div>
        </div>
      </div>
    </SlideOver>
  );
}
