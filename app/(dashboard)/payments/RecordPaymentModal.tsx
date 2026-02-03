'use client';

import { useState, useEffect } from 'react';
import { useNotification } from '@/app/components/ui/NotificationProvider';
import { useLanguage } from '@/app/components/LanguageProvider';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
}

interface ContractOption {
  id: string;
  studentId: string;
  contractNumber: string | null;
  studentName: string;
  parentName: string | null;
  parentPhone: string | null;
  paymentPlan: string | null;
  tranche1Amount: number | null;
  tranche1Date: string | null;
  tranche2Amount: number | null;
  tranche2Date: string | null;
  tranche3Amount: number | null;
  tranche3Date: string | null;
  totalAmount: number | null;
}

interface CoordinatorOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface PaymentMethodOption {
  id: string;
  code: string;
  name: string;
  nameKz: string | null;
  nameRu: string | null;
  nameEn: string | null;
  commission: number | null;
  isActive: boolean;
}

interface TrancheInfo {
  key: string;
  label: string;
  amount: number;
  date: string | null;
}

export default function RecordPaymentModal({ isOpen, onClose, onSuccess, userId }: RecordPaymentModalProps) {
  const { showToast } = useNotification();
  const { t, language } = useLanguage();

  const [contracts, setContracts] = useState<ContractOption[]>([]);
  const [coordinators, setCoordinators] = useState<CoordinatorOption[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [loadingCoordinators, setLoadingCoordinators] = useState(false);

  const [selectedContractId, setSelectedContractId] = useState('');
  const [contractSearch, setContractSearch] = useState('');
  const [contractDropdownOpen, setContractDropdownOpen] = useState(false);
  const [selectedTranche, setSelectedTranche] = useState('');
  const [amount, setAmount] = useState('');
  const [contractAmount, setContractAmount] = useState(''); // original tranche amount before commission
  const [method, setMethod] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setLoadingContracts(true);
    fetch('/api/contracts')
      .then((res) => res.json())
      .then((data) => {
        setContracts(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setContracts([]);
      })
      .finally(() => {
        setLoadingContracts(false);
      });

    setLoadingCoordinators(true);
    fetch('/api/coordinators')
      .then((res) => res.json())
      .then((data) => {
        setCoordinators(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setCoordinators([]);
      })
      .finally(() => {
        setLoadingCoordinators(false);
      });

    fetch('/api/database/payment-methods')
      .then((res) => res.json())
      .then((data) => {
        setPaymentMethods(Array.isArray(data) ? data.filter((m: PaymentMethodOption) => m.isActive) : []);
      })
      .catch(() => {
        setPaymentMethods([]);
      });
  }, [isOpen]);

  const resetForm = () => {
    setSelectedContractId('');
    setContractSearch('');
    setContractDropdownOpen(false);
    setSelectedTranche('');
    setAmount('');
    setContractAmount('');
    setMethod('');
    setPartnerId('');
    setDescription('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const selectedContract = contracts.find((c) => c.id === selectedContractId);

  const filteredContracts = contracts.filter((c) => {
    if (!contractSearch.trim()) return true;
    const search = contractSearch.toLowerCase();
    const matchName = c.studentName.toLowerCase().includes(search);
    const matchNumber = c.contractNumber?.toLowerCase().includes(search);
    return matchName || matchNumber;
  });

  const handleSelectContract = (id: string) => {
    setSelectedContractId(id);
    setContractSearch('');
    setContractDropdownOpen(false);
    setSelectedTranche('');
    setAmount('');
    setContractAmount('');
  };

  const handleClearContract = () => {
    setSelectedContractId('');
    setContractSearch('');
    setSelectedTranche('');
    setAmount('');
    setContractAmount('');
  };

  const formatAmount = (val: number | null) => {
    if (!val) return '0 тг';
    return val.toLocaleString('ru-RU') + ' тг';
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('ru-RU');
  };

  // Build tranche options from selected contract
  const getTranches = (): TrancheInfo[] => {
    if (!selectedContract) return [];
    const tranches: TrancheInfo[] = [];
    if (selectedContract.tranche1Amount) {
      tranches.push({
        key: 'tranche1',
        label: `Транш 1 — ${formatAmount(selectedContract.tranche1Amount)}`,
        amount: selectedContract.tranche1Amount,
        date: selectedContract.tranche1Date,
      });
    }
    if (selectedContract.tranche2Amount) {
      tranches.push({
        key: 'tranche2',
        label: `Транш 2 — ${formatAmount(selectedContract.tranche2Amount)}`,
        amount: selectedContract.tranche2Amount,
        date: selectedContract.tranche2Date,
      });
    }
    if (selectedContract.tranche3Amount) {
      tranches.push({
        key: 'tranche3',
        label: `Транш 3 — ${formatAmount(selectedContract.tranche3Amount)}`,
        amount: selectedContract.tranche3Amount,
        date: selectedContract.tranche3Date,
      });
    }
    return tranches;
  };

  const applyCommission = (baseAmount: number, methodCode: string): number => {
    const pm = paymentMethods.find((m) => m.code === methodCode);
    if (pm && pm.commission && pm.commission > 0) {
      return Math.round(baseAmount * (1 - pm.commission / 100));
    }
    return baseAmount;
  };

  const handleTrancheSelect = (trancheKey: string) => {
    setSelectedTranche(trancheKey);
    const tranches = getTranches();
    const tranche = tranches.find((t) => t.key === trancheKey);
    if (tranche) {
      setContractAmount(String(tranche.amount));
      const actual = method ? applyCommission(tranche.amount, method) : tranche.amount;
      setAmount(String(actual));
    }
  };

  const filteredCoordinators = coordinators.filter((c) => c.id !== userId);

  const handleSubmit = async () => {
    if (!selectedContractId || !amount || !method) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedContractId,
          amount: contractAmount ? parseFloat(contractAmount) : parseFloat(amount),
          actualAmount: parseFloat(amount),
          method,
          partnerId: partnerId || undefined,
          description: description || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to create payment');
      }

      showToast({ message: t('payments.recorded'), type: 'success' });
      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      showToast({ message: err instanceof Error ? err.message : 'Error', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const tranches = getTranches();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('payments.recordPayment')}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Contract Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Выберите договор
            </label>

            {selectedContract ? (
              <div className="w-full px-3 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white flex items-center justify-between">
                <span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400 mr-2">{selectedContract.contractNumber || '—'}</span>
                  {selectedContract.studentName}
                </span>
                <button
                  type="button"
                  onClick={handleClearContract}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-2 flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={contractSearch}
                  onChange={(e) => {
                    setContractSearch(e.target.value);
                    setContractDropdownOpen(true);
                  }}
                  onFocus={() => setContractDropdownOpen(true)}
                  placeholder="Поиск по номеру договора или ФИО..."
                  className="w-full px-3 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />

                {contractDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {loadingContracts ? (
                      <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                        Загрузка...
                      </div>
                    ) : filteredContracts.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                        Ничего не найдено
                      </div>
                    ) : (
                      filteredContracts.map((contract) => (
                        <button
                          key={contract.id}
                          type="button"
                          onClick={() => handleSelectContract(contract.id)}
                          className="w-full px-3 py-2 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors first:rounded-t-xl last:rounded-b-xl"
                        >
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400 mr-2">{contract.contractNumber || '—'}</span>
                          {contract.studentName}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Auto-filled info from contract */}
          {selectedContract && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Ученик</span>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{selectedContract.studentName}</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Сумма договора</span>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{formatAmount(selectedContract.totalAmount)}</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Родитель</span>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{selectedContract.parentName || '—'}</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Телефон родителя</span>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{selectedContract.parentPhone || '—'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Tranche Selector */}
          {selectedContract && tranches.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Выберите транш
              </label>
              <div className="space-y-2">
                {tranches.map((tranche) => (
                  <button
                    key={tranche.key}
                    type="button"
                    onClick={() => handleTrancheSelect(tranche.key)}
                    className={`w-full px-4 py-3 rounded-xl border text-left text-sm transition-colors flex items-center justify-between ${
                      selectedTranche === tranche.key
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    <span className="font-medium">{tranche.label}</span>
                    {tranche.date && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">до {formatDate(tranche.date)}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('payments.selectMethod')}
            </label>
            <select
              value={method}
              onChange={(e) => {
                const newMethod = e.target.value;
                setMethod(newMethod);
                // Recalculate actual amount when method changes
                if (contractAmount) {
                  const base = parseFloat(contractAmount);
                  if (!isNaN(base) && newMethod) {
                    setAmount(String(applyCommission(base, newMethod)));
                  } else {
                    setAmount(contractAmount);
                  }
                }
              }}
              className="w-full px-3 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{t('payments.selectMethod')}</option>
              {paymentMethods.map((pm) => (
                <option key={pm.code} value={pm.code}>
                  {language === 'kk' ? (pm.nameKz || pm.nameRu || pm.name) : language === 'en' ? (pm.nameEn || pm.name) : (pm.nameRu || pm.name)}
                  {pm.commission && pm.commission > 0 ? ` (−${pm.commission}%)` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Commission info */}
          {(() => {
            const selectedMethod = paymentMethods.find((m) => m.code === method);
            const commission = selectedMethod?.commission || 0;
            const base = contractAmount ? parseFloat(contractAmount) : 0;
            if (commission > 0 && base > 0) {
              const deduction = Math.round(base * commission / 100);
              const methodName = language === 'kk' ? (selectedMethod?.nameKz || selectedMethod?.nameRu || selectedMethod?.name) : language === 'en' ? (selectedMethod?.nameEn || selectedMethod?.name) : (selectedMethod?.nameRu || selectedMethod?.name);
              return (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Сумма по договору</span>
                    <span className="font-medium text-gray-900 dark:text-white">{base.toLocaleString('ru-RU')} тг</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-amber-600 dark:text-amber-400">Комиссия {methodName} ({commission}%)</span>
                    <span className="font-medium text-amber-600 dark:text-amber-400">−{deduction.toLocaleString('ru-RU')} тг</span>
                  </div>
                  <div className="border-t border-amber-200 dark:border-amber-700 pt-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Фактическая сумма</span>
                    <span className="font-bold text-gray-900 dark:text-white">{(base - deduction).toLocaleString('ru-RU')} тг</span>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Actual Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('payments.enterAmount')}
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="any"
                placeholder="0"
                className="w-full px-3 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-gray-500">
                {t('payments.tenge')}
              </span>
            </div>
          </div>

          {/* Partner Coordinator */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('payments.selectPartner')}
            </label>
            <select
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              className="w-full px-3 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{t('payments.selectPartner')}</option>
              {loadingCoordinators ? (
                <option disabled>Loading...</option>
              ) : (
                filteredCoordinators.map((coord) => (
                  <option key={coord.id} value={coord.id}>
                    {coord.lastName} {coord.firstName}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('payments.description')}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('payments.description')}
              className="w-full px-3 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            {t('payments.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !selectedContractId || !amount || !method}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t('payments.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
