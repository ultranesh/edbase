'use client';

import { useState, useEffect, useRef } from 'react';
import ContractDetailSlideOver from './ContractDetailSlideOver';
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

interface Filters {
  gradeLevel: string[];
  paymentPlan: string[];
  subject: string[];
}

const emptyFilters: Filters = {
  gradeLevel: [],
  paymentPlan: [],
  subject: [],
};

export default function ContractsList({ userRole }: { userRole: string }) {
  const [contracts, setContracts] = useState<ContractData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [selectedContract, setSelectedContract] = useState<ContractData | null>(null);
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'active'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [activeFilterCategory, setActiveFilterCategory] = useState<keyof Filters | null>(null);
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const { showToast, showConfirm } = useNotification();

  // Close filter panel on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(event.target as Node)) {
        setShowFilterPanel(false);
        setActiveFilterCategory(null);
      }
    };

    if (showFilterPanel) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterPanel]);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      const response = await fetch('/api/contracts');
      if (!response.ok) {
        throw new Error('Failed to fetch contracts');
      }
      const data = await response.json();
      setContracts(data);
      // Update selectedContract with fresh data if slide-over is open
      setSelectedContract(prev => {
        if (!prev) return prev;
        const updated = data.find((c: ContractData) => c.id === prev.id);
        return updated || prev;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleFilter = (category: keyof Filters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [category]: prev[category].includes(value)
        ? prev[category].filter(v => v !== value)
        : [...prev[category], value],
    }));
  };

  const resetFilters = () => {
    setFilters(emptyFilters);
  };

  const activeFilterCount = Object.values(filters).flat().length;

  // Filter contracts
  const filteredContracts = contracts.filter(contract => {
    // Status filter
    const statusMatch =
      statusFilter === 'all' ? true :
      statusFilter === 'pending' ? !contract.contractConfirmed :
      statusFilter === 'confirmed' ? contract.contractConfirmed :
      statusFilter === 'active' ? (contract.contractConfirmed && contract.status === 'ACTIVE') :
      true;

    if (!statusMatch) return false;

    // Advanced filters
    if (filters.gradeLevel.length > 0 && !filters.gradeLevel.includes(contract.gradeLevel || '')) {
      return false;
    }
    if (filters.paymentPlan.length > 0 && !filters.paymentPlan.includes(contract.paymentPlan || '')) {
      return false;
    }
    if (filters.subject.length > 0) {
      if (!filters.subject.some(s => contract.subjects.includes(s))) {
        return false;
      }
    }

    // Search filter
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    return (
      (contract.contractNumber && contract.contractNumber.toLowerCase().includes(query)) ||
      contract.studentName.toLowerCase().includes(query) ||
      (contract.parentName && contract.parentName.toLowerCase().includes(query)) ||
      (contract.parentPhone && contract.parentPhone.includes(query)) ||
      contract.studentIIN.includes(query)
    );
  });

  const handleDownload = async (contract: ContractData) => {
    setDownloadingId(contract.id);
    try {
      const response = await fetch(`/api/contracts/${contract.id}/pdf`);
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contract_${contract.studentName.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast({ message: 'Договор успешно скачан', type: 'success' });
    } catch (err) {
      showToast({ message: err instanceof Error ? err.message : 'Ошибка при скачивании', type: 'error' });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleConfirmContract = async (contract: ContractData) => {
    const confirmed = await showConfirm({
      title: 'Подтвердить договор',
      message: `Подтвердить договор для ${contract.studentName}?`,
      confirmText: 'Подтвердить',
      cancelText: 'Отмена',
      type: 'info',
    });
    if (!confirmed) return;

    setConfirmingId(contract.id);
    try {
      const response = await fetch(`/api/contracts/${contract.id}/confirm`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to confirm contract');
      }
      await fetchContracts();
      if (selectedContract?.id === contract.id) {
        setSelectedContract({ ...contract, contractConfirmed: true, contractConfirmedAt: new Date().toISOString() });
      }
      showToast({ message: 'Договор успешно подтвержден', type: 'success' });
    } catch (err) {
      showToast({ message: err instanceof Error ? err.message : 'Ошибка при подтверждении', type: 'error' });
    } finally {
      setConfirmingId(null);
    }
  };

  const handleRowClick = (contract: ContractData) => {
    setSelectedContract(contract);
    setIsSlideOverOpen(true);
  };

  const handleCloseSlideOver = () => {
    setIsSlideOverOpen(false);
    setSelectedContract(null);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const formatAmount = (amount: number | null) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('ru-RU').format(amount) + ' тг';
  };

  const getContractStatusBadge = (contract: ContractData) => {
    if (!contract.contractConfirmed) {
      return (
        <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-700">
          Ожидает договор
        </span>
      );
    }
    if (contract.status === 'PENDING_APPROVAL') {
      return (
        <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700">
          Ожидает зачисления
        </span>
      );
    }
    const statusMap: Record<string, { label: string; className: string }> = {
      ACTIVE: { label: 'Активен', className: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700' },
      INACTIVE: { label: 'Неактивен', className: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600' },
      GRADUATED: { label: 'Выпускник', className: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700' },
      EXPELLED: { label: 'Отчислен', className: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700' },
    };
    const info = statusMap[contract.status] || { label: contract.status, className: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600' };
    return (
      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap ${info.className}`}>
        {info.label}
      </span>
    );
  };

  const getSubjectLabel = (subject: string) => {
    const subjectMap: Record<string, string> = {
      MATH: 'Математика',
      PHYSICS: 'Физика',
      CHEMISTRY: 'Химия',
      BIOLOGY: 'Биология',
      HISTORY: 'История',
      GEOGRAPHY: 'География',
      ENGLISH: 'Английский',
      KAZAKH: 'Казахский',
      RUSSIAN: 'Русский',
      INFORMATICS: 'Информатика',
      LITERATURE: 'Продленка',
    };
    return subjectMap[subject] || subject;
  };

  const getPaymentPlanLabel = (plan: string) => {
    const planMap: Record<string, string> = {
      ONE_TRANCHE: '1 транш',
      TWO_TRANCHES: '2 транша',
      THREE_TRANCHES: '3 транша',
    };
    return planMap[plan] || plan;
  };

  // Get unique values for filters
  const uniqueGradeLevels = [...new Set(contracts.map(c => c.gradeLevel).filter(Boolean))] as string[];
  const uniqueSubjects = [...new Set(contracts.flatMap(c => c.subjects))];

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-gray-500 dark:text-gray-400">Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 text-red-700 dark:text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Договоры
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Всего: {contracts.length}
              </p>
            </div>
          </div>

          {/* Status filter tabs */}
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'Все' },
              { key: 'pending', label: 'Ожидают' },
              { key: 'confirmed', label: 'Подтверждены' },
              { key: 'active', label: 'Активные' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key as typeof statusFilter)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  statusFilter === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search and filter bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по ФИО ученика, родителя, телефону, ИИН..."
              className="block w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Filter button and panel */}
          <div className="relative" ref={filterPanelRef}>
            <button
              onClick={() => {
                setShowFilterPanel(!showFilterPanel);
                if (showFilterPanel) setActiveFilterCategory(null);
              }}
              className={`px-3 py-2.5 rounded-xl border transition-colors flex items-center gap-2 ${
                showFilterPanel || activeFilterCount > 0
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              {activeFilterCount > 0 && (
                <span className="text-xs font-medium bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Filter dropdown panel */}
            {showFilterPanel && (
              <div className="absolute right-0 top-full mt-2 flex items-start z-50">
                {/* Options panel (left side) */}
                {activeFilterCategory && (
                  <div className="w-64 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl mr-2 flex flex-col max-h-[480px]">
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {activeFilterCategory === 'gradeLevel' && 'Класс'}
                        {activeFilterCategory === 'paymentPlan' && 'План оплаты'}
                        {activeFilterCategory === 'subject' && 'Предмет'}
                      </span>
                      <button
                        onClick={() => setActiveFilterCategory(null)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="p-2 flex-1 overflow-y-auto space-y-1">
                      {activeFilterCategory === 'gradeLevel' && uniqueGradeLevels.map(option => (
                        <button
                          key={option}
                          onClick={() => toggleFilter('gradeLevel', option)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            filters.gradeLevel.includes(option)
                              ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          {option} класс
                        </button>
                      ))}
                      {activeFilterCategory === 'paymentPlan' && [
                        { value: 'ONE_TRANCHE', label: '1 транш' },
                        { value: 'TWO_TRANCHES', label: '2 транша' },
                        { value: 'THREE_TRANCHES', label: '3 транша' },
                      ].map(option => (
                        <button
                          key={option.value}
                          onClick={() => toggleFilter('paymentPlan', option.value)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            filters.paymentPlan.includes(option.value)
                              ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                      {activeFilterCategory === 'subject' && uniqueSubjects.map(option => (
                        <button
                          key={option}
                          onClick={() => toggleFilter('subject', option)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            filters.subject.includes(option)
                              ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          {getSubjectLabel(option)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Categories panel (right side) */}
                <div className="w-56 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">Фильтры</span>
                    {activeFilterCount > 0 && (
                      <button
                        onClick={resetFilters}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700"
                      >
                        Сбросить
                      </button>
                    )}
                  </div>
                  <div className="p-2 space-y-0.5">
                    {[
                      { key: 'gradeLevel' as const, label: 'Класс' },
                      { key: 'paymentPlan' as const, label: 'План оплаты' },
                      { key: 'subject' as const, label: 'Предмет' },
                    ].map(item => (
                      <button
                        key={item.key}
                        onClick={() => setActiveFilterCategory(activeFilterCategory === item.key ? null : item.key)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                          activeFilterCategory === item.key
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span className="text-sm">{item.label}</span>
                        <div className="flex items-center gap-2">
                          {filters[item.key].length > 0 && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                              {filters[item.key].length}
                            </span>
                          )}
                          <svg className={`w-4 h-4 transition-transform ${activeFilterCategory === item.key ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contracts Table */}
      {filteredContracts.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Договоры не найдены</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {searchQuery || activeFilterCount > 0
              ? 'По вашему запросу ничего не найдено'
              : contracts.length === 0
                ? 'Договоры появятся после зачисления учеников'
                : 'Нет договоров с выбранным статусом'
            }
          </p>
          {(searchQuery || activeFilterCount > 0) && (
            <button
              onClick={() => {
                setSearchQuery('');
                resetFilters();
              }}
              className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              Сбросить фильтры
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                    № договора
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                    Ученик
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                    Родитель
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                    Предметы
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                    Период
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                    Сумма
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredContracts.map((contract) => (
                  <tr
                    key={contract.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    onClick={() => handleRowClick(contract)}
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-mono font-medium text-gray-900 dark:text-white">
                        {contract.contractNumber || '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                          !contract.contractConfirmed ? 'bg-orange-500' :
                          contract.status === 'ACTIVE' ? 'bg-green-500' :
                          'bg-gray-400'
                        }`}>
                          <span className="text-xs font-medium text-white">
                            {contract.studentName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {contract.studentName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {contract.gradeLevel && `${contract.gradeLevel} класс`}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {contract.parentName || '-'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {contract.parentPhone || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {contract.subjects.slice(0, 2).map((subject) => (
                          <span
                            key={subject}
                            className="px-2 py-0.5 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded"
                          >
                            {getSubjectLabel(subject)}
                          </span>
                        ))}
                        {contract.subjects.length > 2 && (
                          <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded">
                            +{contract.subjects.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {formatDate(contract.studyStartDate)} - {formatDate(contract.studyEndDate)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {contract.standardMonths + contract.bonusMonths + contract.intensiveMonths} мес.
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatAmount(contract.totalAmount)}
                      </div>
                      {contract.paymentPlan && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {getPaymentPlanLabel(contract.paymentPlan)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {getContractStatusBadge(contract)}
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {!contract.contractConfirmed && (
                          <button
                            onClick={() => handleConfirmContract(contract)}
                            disabled={confirmingId === contract.id}
                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {confirmingId === contract.id ? (
                              '...'
                            ) : (
                              <>
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Подтвердить
                              </>
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => handleDownload(contract)}
                          disabled={downloadingId === contract.id || !contract.contractConfirmed}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title={!contract.contractConfirmed ? 'Сначала подтвердите договор' : ''}
                        >
                          {downloadingId === contract.id ? (
                            '...'
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              PDF
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Contract Detail SlideOver */}
      <ContractDetailSlideOver
        contract={selectedContract}
        isOpen={isSlideOverOpen}
        onClose={handleCloseSlideOver}
        onConfirm={handleConfirmContract}
        onDownload={handleDownload}
        onUpdate={fetchContracts}
        isConfirming={confirmingId === selectedContract?.id}
        isDownloading={downloadingId === selectedContract?.id}
        userRole={userRole}
      />
    </div>
  );
}
