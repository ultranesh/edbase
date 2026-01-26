'use client';

import { useState, useEffect } from 'react';
import ContractDetailSlideOver from './ContractDetailSlideOver';
import { useNotification } from '@/app/components/ui/NotificationProvider';

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

export default function ContractsList() {
  const [contracts, setContracts] = useState<ContractData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [selectedContract, setSelectedContract] = useState<ContractData | null>(null);
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const { showToast, showConfirm } = useNotification();

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

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
      // Refresh contracts list
      await fetchContracts();
      // Update selected contract if open
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
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-500 text-white">
          Ожидает подтверждения договора
        </span>
      );
    }
    if (contract.status === 'PENDING_APPROVAL') {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
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
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${info.className}`}>
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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700">
        {error}
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gray-100 flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-gray-900 font-medium">Договоры не найдены</p>
        <p className="text-sm text-gray-500 mt-1">Они появятся после зачисления учеников</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ученик
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Родитель
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Предметы
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Период
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Сумма
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Статус
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {contracts.map((contract) => (
              <tr key={contract.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleRowClick(contract)}>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {contract.studentName}
                    </div>
                    <div className="text-xs text-gray-500">
                      ИИН: {contract.studentIIN}
                    </div>
                    {contract.gradeLevel && (
                      <div className="text-xs text-gray-500">
                        {contract.gradeLevel} класс
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm text-gray-900">
                      {contract.parentName || '-'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {contract.parentPhone || '-'}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-1">
                    {contract.subjects.map((subject) => (
                      <span
                        key={subject}
                        className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded"
                      >
                        {getSubjectLabel(subject)}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatDate(contract.studyStartDate)} - {formatDate(contract.studyEndDate)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {contract.standardMonths + contract.bonusMonths + contract.intensiveMonths} мес.
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {formatAmount(contract.totalAmount)}
                  </div>
                  {contract.paymentPlan && (
                    <div className="text-xs text-gray-500">
                      {contract.paymentPlan === 'ONE_TRANCHE' && '1 транш'}
                      {contract.paymentPlan === 'TWO_TRANCHES' && '2 транша'}
                      {contract.paymentPlan === 'THREE_TRANCHES' && '3 транша'}
                    </div>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {getContractStatusBadge(contract)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-2">
                    {!contract.contractConfirmed && (
                      <button
                        onClick={() => handleConfirmContract(contract)}
                        disabled={confirmingId === contract.id}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {confirmingId === contract.id ? (
                          'Подтверждение...'
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        'Генерация...'
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Скачать PDF
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

      {/* Contract Detail SlideOver */}
      <ContractDetailSlideOver
        contract={selectedContract}
        isOpen={isSlideOverOpen}
        onClose={handleCloseSlideOver}
        onConfirm={handleConfirmContract}
        onDownload={handleDownload}
        isConfirming={confirmingId === selectedContract?.id}
        isDownloading={downloadingId === selectedContract?.id}
      />
    </div>
  );
}
