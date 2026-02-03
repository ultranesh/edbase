'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../components/LanguageProvider';

interface StatisticsClientProps {
  userRole: string;
  userId: string;
}

interface Summary {
  totalPaymentsCount: number;
  totalPaymentsAmount: number;
  confirmedCount: number;
  confirmedAmount: number;
  unconfirmedCount: number;
  unconfirmedAmount: number;
  averagePaymentAmount: number;
  planAmount: number;
  planCompletedAmount: number;
  planRemainingAmount: number;
  planPercentage: number;
  previousMonthAmount: number;
  previousMonthCount: number;
  amountChangePercent: number;
  countChangePercent: number;
  overdueCount: number;
  overdueAmount: number;
}

interface CoordinatorRanking {
  coordinatorId: string;
  coordinatorName: string;
  paymentCount: number;
  totalAmount: number;
  averageAmount: number;
  confirmedCount: number;
  confirmedPercent: number;
  currentRank: number;
  previousRank: number | null;
}

interface DailyCoordinator {
  coordinatorId: string;
  coordinatorName: string;
  days: Record<number, { count: number; amount: number }>;
  totalCount: number;
  totalAmount: number;
}

interface MethodDistribution {
  method: string;
  count: number;
  amount: number;
  percentage: number;
}

interface MonthlyTrend {
  year: number;
  month: number;
  totalAmount: number;
  totalCount: number;
}

interface TopStudent {
  studentId: string;
  studentName: string;
  totalPaid: number;
  paymentCount: number;
}

interface StatisticsData {
  summary: Summary;
  coordinatorRankings: CoordinatorRanking[];
  dailyBreakdown: {
    daysInMonth: number;
    year: number;
    month: number;
    coordinators: DailyCoordinator[];
    dailyTotals: Record<number, { count: number; amount: number }>;
  };
  methodDistribution: MethodDistribution[];
  monthlyTrend: MonthlyTrend[];
  topStudents: TopStudent[];
}

const methodColors: Record<string, string> = {
  CASH: 'bg-green-500',
  CARD: 'bg-blue-500',
  TRANSFER: 'bg-purple-500',
  KASPI: 'bg-yellow-500',
  HALYK: 'bg-teal-500',
};

const methodLabels: Record<string, string> = {
  CASH: 'Наличные',
  CARD: 'Карта',
  TRANSFER: 'Перевод',
  KASPI: 'Kaspi',
  HALYK: 'Halyk',
};

export default function StatisticsClient({ userRole }: StatisticsClientProps) {
  const { t } = useLanguage();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [planAmount, setPlanAmount] = useState(0);
  const [editingPlan, setEditingPlan] = useState(false);
  const [planInput, setPlanInput] = useState('');
  const [data, setData] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortColumn, setSortColumn] = useState<string>('totalAmount');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');
  const [coordinatorFilter, setCoordinatorFilter] = useState<string | null>(null);

  const canEditPlan = ['ADMIN', 'SUPERADMIN', 'COORDINATOR_MANAGER'].includes(userRole);

  // Load plan from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('statistics_plan_amount');
    if (saved) {
      const val = parseFloat(saved);
      if (!isNaN(val)) setPlanAmount(val);
    }
  }, []);

  // Fetch statistics
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          month: String(selectedMonth),
          year: String(selectedYear),
        });
        if (planAmount > 0) params.set('planAmount', String(planAmount));
        const res = await fetch(`/api/statistics?${params}`);
        const json = await res.json();
        setData(json);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedMonth, selectedYear, planAmount]);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ru-RU').format(Math.round(amount)) + ' ' + t('payments.tenge');
  };

  const formatAmountShort = (amount: number) => {
    if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
    if (amount >= 1000) return (amount / 1000).toFixed(0) + 'K';
    return String(Math.round(amount));
  };

  const handleSavePlan = () => {
    const val = parseFloat(planInput);
    if (!isNaN(val) && val >= 0) {
      setPlanAmount(val);
      localStorage.setItem('statistics_plan_amount', String(val));
    }
    setEditingPlan(false);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const sortedRankings = useMemo(() => {
    if (!data) return [];
    return [...data.coordinatorRankings].sort((a, b) => {
      const aVal = (a as any)[sortColumn] as number;
      const bVal = (b as any)[sortColumn] as number;
      return sortDirection === 'desc' ? bVal - aVal : aVal - bVal;
    });
  }, [data, sortColumn, sortDirection]);

  const isToday = (day: number) => {
    const today = new Date();
    return today.getFullYear() === selectedYear && today.getMonth() + 1 === selectedMonth && today.getDate() === day;
  };

  const isWeekend = (day: number) => {
    const date = new Date(selectedYear, selectedMonth - 1, day);
    return date.getDay() === 0 || date.getDay() === 6;
  };

  // Years for selector
  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-500 dark:text-gray-400">{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-gray-500 dark:text-gray-400">{t('statistics.noData')}</span>
      </div>
    );
  }

  const filteredDailyCoordinators = coordinatorFilter
    ? data.dailyBreakdown.coordinators.filter(c => c.coordinatorId === coordinatorFilter)
    : data.dailyBreakdown.coordinators;

  return (
    <div className="space-y-6">
      {/* ── HEADER: Period Selector + Plan ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{t(`statistics.month.${m}`)}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          {loading && (
            <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {canEditPlan && (
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('statistics.plan')}:</span>
            {editingPlan ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={planInput}
                  onChange={e => setPlanInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSavePlan()}
                  className="w-32 px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                  autoFocus
                />
                <button onClick={handleSavePlan} className="p-1 text-blue-600 hover:text-blue-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button onClick={() => setEditingPlan(false)} className="p-1 text-gray-400 hover:text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setPlanInput(String(planAmount || '')); setEditingPlan(true); }}
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                {planAmount > 0 ? formatAmount(planAmount) : t('statistics.setPlan')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── SUMMARY CARDS ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Payments */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.summary.totalPaymentsCount}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('statistics.totalPayments')}</p>
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-1">{formatAmount(data.summary.totalPaymentsAmount)}</p>
        </div>

        {/* Plan Progress */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          {planAmount > 0 ? (
            <>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{Math.round(data.summary.planPercentage)}%</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('statistics.planProgress')}</p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(data.summary.planPercentage, 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-gray-400">{t('statistics.remaining')}: {formatAmount(data.summary.planRemainingAmount)}</span>
              </div>
            </>
          ) : (
            <>
              <p className="text-lg font-medium text-gray-400 dark:text-gray-500">—</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('statistics.planProgress')}</p>
              <p className="text-[10px] text-gray-400 mt-2">{t('statistics.setPlan')}</p>
            </>
          )}
        </div>

        {/* Confirmed */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-xl">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.summary.confirmedCount}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('statistics.confirmed')}</p>
          <p className="text-sm font-semibold text-green-600 dark:text-green-400 mt-1">{formatAmount(data.summary.confirmedAmount)}</p>
        </div>

        {/* Unconfirmed */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded-xl">
              <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.summary.unconfirmedCount}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('statistics.unconfirmed')}</p>
          <p className="text-sm font-semibold text-orange-600 dark:text-orange-400 mt-1">{formatAmount(data.summary.unconfirmedAmount)}</p>
        </div>

        {/* Average Payment */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-xl">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatAmount(data.summary.averagePaymentAmount)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('statistics.averagePayment')}</p>
        </div>

        {/* vs Previous Month */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className={`p-2 rounded-xl ${data.summary.amountChangePercent >= 0 ? 'bg-green-50 dark:bg-green-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
              {data.summary.amountChangePercent >= 0 ? (
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              )}
            </div>
          </div>
          <p className={`text-2xl font-bold ${data.summary.amountChangePercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {data.summary.amountChangePercent >= 0 ? '+' : ''}{Math.round(data.summary.amountChangePercent)}%
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('statistics.vsPreviousMonth')}</p>
          <p className="text-[10px] text-gray-400 mt-1">
            {formatAmount(data.summary.previousMonthAmount)} ({data.summary.previousMonthCount} {t('statistics.payments')})
          </p>
        </div>
      </div>

      {/* ── COORDINATOR RANKINGS ── */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('statistics.coordinatorRankings')}</h3>
        </div>
        {sortedRankings.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">{t('statistics.noData')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">
                    {t('statistics.rank')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('statistics.coordinator')}
                  </th>
                  {[
                    { key: 'paymentCount', label: t('statistics.paymentCount') },
                    { key: 'totalAmount', label: t('statistics.totalAmount') },
                    { key: 'averageAmount', label: t('statistics.averageAmount') },
                    { key: 'confirmedPercent', label: t('statistics.confirmedPercent') },
                  ].map(col => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap"
                    >
                      <span className={sortColumn === col.key ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}>
                        {col.label}
                        {sortColumn === col.key && (
                          <span className="ml-1">{sortDirection === 'desc' ? '↓' : '↑'}</span>
                        )}
                      </span>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">
                    {t('statistics.rankChange')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {sortedRankings.map((coord, i) => {
                  const rankChange = coord.previousRank !== null ? coord.previousRank - coord.currentRank : null;
                  return (
                    <tr key={coord.coordinatorId} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                          i === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          i === 1 ? 'bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300' :
                          i === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                          'bg-gray-50 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {coord.coordinatorName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 text-right">{coord.paymentCount}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white text-right">{formatAmount(coord.totalAmount)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 text-right">{formatAmount(coord.averageAmount)}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          coord.confirmedPercent >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          coord.confirmedPercent >= 50 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {coord.confirmedPercent}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {rankChange !== null ? (
                          rankChange > 0 ? (
                            <span className="inline-flex items-center gap-0.5 text-green-600 dark:text-green-400 text-xs font-medium">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                              +{rankChange}
                            </span>
                          ) : rankChange < 0 ? (
                            <span className="inline-flex items-center gap-0.5 text-red-600 dark:text-red-400 text-xs font-medium">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                              {rankChange}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600 text-xs">new</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── DAILY BREAKDOWN MATRIX ── */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('statistics.dailyBreakdown')}</h3>
          <select
            value={coordinatorFilter || ''}
            onChange={e => setCoordinatorFilter(e.target.value || null)}
            className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t('statistics.allCoordinators')}</option>
            {data.dailyBreakdown.coordinators.map(c => (
              <option key={c.coordinatorId} value={c.coordinatorId}>{c.coordinatorName}</option>
            ))}
          </select>
        </div>
        {filteredDailyCoordinators.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">{t('statistics.noData')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-700/50 px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400 min-w-[140px] border-r border-gray-200 dark:border-gray-600">
                    {t('statistics.coordinator')}
                  </th>
                  {Array.from({ length: data.dailyBreakdown.daysInMonth }, (_, i) => i + 1).map(day => (
                    <th
                      key={day}
                      className={`px-1.5 py-2 text-center font-medium min-w-[56px] ${
                        isToday(day)
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                          : isWeekend(day)
                            ? 'bg-gray-100 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500'
                            : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {day}
                    </th>
                  ))}
                  <th className="sticky right-0 z-10 bg-gray-50 dark:bg-gray-700/50 px-3 py-2 text-center font-medium text-gray-500 dark:text-gray-400 min-w-[80px] border-l border-gray-200 dark:border-gray-600">
                    {t('statistics.total')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredDailyCoordinators.map(coord => (
                  <tr key={coord.coordinatorId} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20">
                    <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-3 py-2 font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-600 whitespace-nowrap">
                      {coord.coordinatorName}
                    </td>
                    {Array.from({ length: data.dailyBreakdown.daysInMonth }, (_, i) => i + 1).map(day => {
                      const cell = coord.days[day];
                      return (
                        <td
                          key={day}
                          className={`px-1.5 py-2 text-center ${
                            isToday(day)
                              ? 'bg-blue-50/50 dark:bg-blue-900/10'
                              : isWeekend(day)
                                ? 'bg-gray-50 dark:bg-gray-800/30'
                                : ''
                          }`}
                        >
                          {cell ? (
                            <div>
                              <span className="font-bold text-gray-900 dark:text-white">{cell.count}</span>
                              <br />
                              <span className="text-[10px] text-gray-400 dark:text-gray-500">{formatAmountShort(cell.amount)}</span>
                            </div>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="sticky right-0 z-10 bg-white dark:bg-gray-800 px-3 py-2 text-center border-l border-gray-200 dark:border-gray-600">
                      <span className="font-bold text-gray-900 dark:text-white">{coord.totalCount}</span>
                      <br />
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">{formatAmountShort(coord.totalAmount)}</span>
                    </td>
                  </tr>
                ))}
                {/* Totals row */}
                {!coordinatorFilter && (
                  <tr className="bg-gray-50 dark:bg-gray-700/30 font-medium">
                    <td className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-700/30 px-3 py-2 text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-600">
                      {t('statistics.total')}
                    </td>
                    {Array.from({ length: data.dailyBreakdown.daysInMonth }, (_, i) => i + 1).map(day => {
                      const cell = data.dailyBreakdown.dailyTotals[day];
                      return (
                        <td
                          key={day}
                          className={`px-1.5 py-2 text-center ${
                            isToday(day)
                              ? 'bg-blue-100/50 dark:bg-blue-900/20'
                              : isWeekend(day)
                                ? 'bg-gray-100 dark:bg-gray-800/30'
                                : ''
                          }`}
                        >
                          {cell ? (
                            <div>
                              <span className="font-bold text-gray-900 dark:text-white">{cell.count}</span>
                              <br />
                              <span className="text-[10px] text-blue-600 dark:text-blue-400">{formatAmountShort(cell.amount)}</span>
                            </div>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="sticky right-0 z-10 bg-gray-50 dark:bg-gray-700/30 px-3 py-2 text-center border-l border-gray-200 dark:border-gray-600">
                      <span className="font-bold text-gray-900 dark:text-white">{data.summary.totalPaymentsCount}</span>
                      <br />
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">{formatAmountShort(data.summary.totalPaymentsAmount)}</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── PAYMENT METHODS + MONTHLY TREND (side by side) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">{t('statistics.paymentMethods')}</h3>
          {data.methodDistribution.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-4">{t('statistics.noData')}</p>
          ) : (
            <div className="space-y-3">
              {data.methodDistribution.map(item => (
                <div key={item.method} className="flex items-center gap-3">
                  <span className="w-16 text-xs text-gray-600 dark:text-gray-400 text-right font-medium shrink-0">
                    {methodLabels[item.method] || item.method}
                  </span>
                  <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-7 relative overflow-hidden">
                    <div
                      className={`h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500 ${methodColors[item.method] || 'bg-gray-500'}`}
                      style={{ width: `${Math.max(item.percentage, 5)}%` }}
                    >
                      {item.percentage >= 15 && (
                        <span className="text-[10px] font-medium text-white whitespace-nowrap">
                          {formatAmount(item.amount)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0 w-20">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{item.count}</span>
                    <span className="text-[10px] text-gray-400 ml-1">({item.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Monthly Trend */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">{t('statistics.monthlyTrend')}</h3>
          {data.monthlyTrend.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-4">{t('statistics.noData')}</p>
          ) : (
            <div className="flex items-end gap-1.5 h-48">
              {data.monthlyTrend.map((m, i) => {
                const maxAmount = Math.max(...data.monthlyTrend.map(x => x.totalAmount), 1);
                const heightPercent = (m.totalAmount / maxAmount) * 100;
                const isCurrent = m.month === selectedMonth && m.year === selectedYear;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    <span className="text-[9px] text-gray-400 dark:text-gray-500 truncate w-full text-center">
                      {m.totalAmount > 0 ? formatAmountShort(m.totalAmount) : ''}
                    </span>
                    <div className="w-full flex items-end" style={{ height: '140px' }}>
                      <div
                        className={`w-full rounded-t transition-all duration-500 ${
                          isCurrent
                            ? 'bg-blue-600 dark:bg-blue-500'
                            : 'bg-blue-200 dark:bg-blue-800 hover:bg-blue-300 dark:hover:bg-blue-700'
                        }`}
                        style={{ height: `${Math.max(heightPercent, 2)}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-gray-400 dark:text-gray-500 truncate w-full text-center">
                      {t(`statistics.monthShort.${m.month}`)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── TOP STUDENTS ── */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('statistics.topStudents')}</h3>
        </div>
        {data.topStudents.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">{t('statistics.noData')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">{t('statistics.rank')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('students.title')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('statistics.totalAmount')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('statistics.paymentCount')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {data.topStudents.map((student, i) => (
                  <tr key={student.studentId} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        i === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        i === 1 ? 'bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300' :
                        i === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                        'text-gray-500 dark:text-gray-400'
                      }`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{student.studentName}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white text-right">{formatAmount(student.totalPaid)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 text-right">{student.paymentCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
