'use client';

import { useState, useEffect, useRef } from 'react';
import RecordPaymentModal from './RecordPaymentModal';
import PaymentDetailSlideOver from './PaymentDetailSlideOver';
import { useNotification } from '@/app/components/ui/NotificationProvider';
import { useLanguage } from '@/app/components/LanguageProvider';

interface Filters {
  method: string[];
  coordinator: string[];
}

const emptyFilters: Filters = {
  method: [],
  coordinator: [],
};

interface PaymentsListProps {
  userRole: string;
  userId: string;
}

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
}

export default function PaymentsList({ userRole, userId }: PaymentsListProps) {
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed'>('all');
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentData | null>(null);
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [methodsMap, setMethodsMap] = useState<Record<string, RefPaymentMethod>>({});
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [activeFilterCategory, setActiveFilterCategory] = useState<keyof Filters | null>(null);
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const { showToast, showConfirm } = useNotification();
  const { t, language } = useLanguage();

  const canConfirm = ['CHIEF_COORDINATOR', 'ADMIN', 'SUPERADMIN'].includes(userRole);

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
    fetchPayments();
    fetch('/api/database/payment-methods')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const map: Record<string, RefPaymentMethod> = {};
          data.forEach((m: RefPaymentMethod) => { map[m.code] = m; });
          setMethodsMap(map);
        }
      })
      .catch(() => {});
  }, []);

  const fetchPayments = async () => {
    try {
      const response = await fetch('/api/payments');
      if (!response.ok) {
        throw new Error('Failed to fetch payments');
      }
      const data = await response.json();
      setPayments(data);
      // Update selectedPayment with fresh data if slide-over is open
      setSelectedPayment(prev => {
        if (!prev) return prev;
        const updated = data.find((p: PaymentData) => p.id === prev.id);
        return updated || prev;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
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

  const uniqueMethods = [...new Set(payments.map(p => p.method))];
  const uniqueCoordinators = [...new Set(payments.map(p => p.coordinatorName))].sort();

  const filteredPayments = payments.filter((payment) => {
    const statusMatch =
      statusFilter === 'all'
        ? true
        : statusFilter === 'pending'
          ? !payment.isConfirmed
          : statusFilter === 'confirmed'
            ? payment.isConfirmed
            : true;

    if (!statusMatch) return false;

    if (filters.method.length > 0 && !filters.method.includes(payment.method)) {
      return false;
    }
    if (filters.coordinator.length > 0 && !filters.coordinator.includes(payment.coordinatorName)) {
      return false;
    }

    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    return (
      payment.studentName.toLowerCase().includes(query) ||
      payment.parentName.toLowerCase().includes(query) ||
      payment.coordinatorName.toLowerCase().includes(query)
    );
  });

  const handleConfirmPayment = async (payment: PaymentData) => {
    const confirmed = await showConfirm({
      title: t('payments.confirmTitle'),
      message: t('payments.confirmMessage', { amount: payment.actualAmount ? new Intl.NumberFormat('ru-RU').format(payment.actualAmount) : '0' }),
      confirmText: t('payments.confirm'),
      cancelText: t('payments.cancel'),
      type: 'info',
    });
    if (!confirmed) return;

    setConfirmingId(payment.id);
    try {
      const response = await fetch(`/api/payments/${payment.id}/confirm`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to confirm payment');
      }
      await fetchPayments();
      if (selectedPayment?.id === payment.id) {
        setSelectedPayment({ ...payment, isConfirmed: true, confirmedAt: new Date().toISOString() });
      }
      showToast({ message: t('payments.confirmedSuccess'), type: 'success' });
    } catch (err) {
      showToast({ message: err instanceof Error ? err.message : 'Error confirming payment', type: 'error' });
    } finally {
      setConfirmingId(null);
    }
  };

  const handleRowClick = (payment: PaymentData) => {
    setSelectedPayment(payment);
    setIsSlideOverOpen(true);
  };

  const handleCloseSlideOver = () => {
    setIsSlideOverOpen(false);
    setSelectedPayment(null);
  };

  const handlePaymentRecorded = () => {
    setShowRecordModal(false);
    fetchPayments();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-gray-500 dark:text-gray-400">...</div>
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('payments.title')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('common.total') || 'Total'}: {payments.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status filter tabs */}
            <div className="flex gap-2">
              {[
                { key: 'all', label: t('payments.all') },
                { key: 'pending', label: t('payments.pendingConfirmation') },
                { key: 'confirmed', label: t('payments.confirmed') },
              ].map((tab) => (
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

            {/* Record Payment button */}
            <button
              onClick={() => setShowRecordModal(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('payments.recordPayment')}
            </button>
          </div>
        </div>

        {/* Search bar + Filter */}
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
              placeholder={t('payments.search')}
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

          {/* Filter button */}
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

            {showFilterPanel && (
              <div className="absolute right-0 top-full mt-2 flex items-start z-50">
                {/* Options panel (left) */}
                {activeFilterCategory && (
                  <div className="w-64 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl mr-2 flex flex-col max-h-[480px]">
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {activeFilterCategory === 'method' && t('payments.method')}
                        {activeFilterCategory === 'coordinator' && t('payments.coordinator')}
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
                      {activeFilterCategory === 'method' && uniqueMethods.map(option => (
                        <button
                          key={option}
                          onClick={() => toggleFilter('method', option)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            filters.method.includes(option)
                              ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          {getMethodLabel(option)}
                        </button>
                      ))}
                      {activeFilterCategory === 'coordinator' && uniqueCoordinators.map(option => (
                        <button
                          key={option}
                          onClick={() => toggleFilter('coordinator', option)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            filters.coordinator.includes(option)
                              ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Categories panel (right) */}
                <div className="w-56 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{t('common.filters') || 'Фильтры'}</span>
                    {activeFilterCount > 0 && (
                      <button
                        onClick={resetFilters}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700"
                      >
                        {t('common.reset') || 'Сбросить'}
                      </button>
                    )}
                  </div>
                  <div className="p-2 space-y-0.5">
                    {[
                      { key: 'method' as const, label: t('payments.method') },
                      { key: 'coordinator' as const, label: t('payments.coordinator') },
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

      {/* Payments Table */}
      {filteredPayments.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('payments.noPayments')}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {searchQuery
              ? t('payments.noPayments')
              : payments.length === 0
                ? t('payments.noPayments')
                : t('payments.noPayments')
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
              {t('common.reset') || 'Сбросить'}
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
                    {t('payments.date')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                    {t('payments.actualAmount')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                    {t('payments.contractAmount')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                    {t('payments.method')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                    {t('payments.coordinator')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                    {t('payments.partner')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                    {t('payments.studentName')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                    {t('payments.parentName')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                    {t('payments.status')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredPayments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    onClick={() => handleRowClick(payment)}
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {formatDate(payment.date)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatAmount(payment.actualAmount)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {formatAmount(payment.contractAmount)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {getMethodLabel(payment.method)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {payment.coordinatorName}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {payment.partnerName ? (
                        <div>
                          <div className="text-sm text-gray-900 dark:text-white">
                            {payment.partnerName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            ({t('payments.partnerSplit')})
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 dark:text-gray-400">-</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {payment.studentName}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {payment.parentName}
                      </div>
                      {payment.parentPhone && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {payment.parentPhone}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      {payment.isConfirmed ? (
                        <div>
                          <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700">
                            {t('payments.confirmed')}
                          </span>
                          {payment.confirmedByName && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {t('payments.confirmedBy', { name: payment.confirmedByName })}
                            </div>
                          )}
                        </div>
                      ) : canConfirm ? (
                        <button
                          onClick={() => handleConfirmPayment(payment)}
                          disabled={confirmingId === payment.id}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {confirmingId === payment.id ? (
                            '...'
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              {t('payments.confirm')}
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-700">
                          {t('payments.pendingConfirmation')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Detail SlideOver */}
      <PaymentDetailSlideOver
        payment={selectedPayment}
        isOpen={isSlideOverOpen}
        onClose={handleCloseSlideOver}
        onConfirm={handleConfirmPayment}
        canConfirm={canConfirm}
        confirmingId={confirmingId}
        userRole={userRole}
        onUpdate={fetchPayments}
        onDelete={() => {
          handleCloseSlideOver();
          fetchPayments();
        }}
      />

      {/* Record Payment Modal */}
      {showRecordModal && (
        <RecordPaymentModal
          isOpen={showRecordModal}
          onClose={() => setShowRecordModal(false)}
          onSuccess={handlePaymentRecorded}
          userId={userId}
        />
      )}
    </div>
  );
}
