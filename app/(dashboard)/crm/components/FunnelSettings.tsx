'use client';

import { useState, useEffect, useCallback } from 'react';

interface Stage {
  id: string;
  name: string;
  color: string;
  order: number;
  isWon: boolean;
  isLost: boolean;
  isSystem: boolean;
}

interface Funnel {
  id: string;
  name: string;
  description: string | null;
  color: string;
  isDefault: boolean;
  isActive: boolean;
  order: number;
  stages: Stage[];
  _count?: { leads: number };
}

interface FunnelSettingsProps {
  t: (key: string) => string;
}

interface DeleteStageModal {
  isOpen: boolean;
  stage: Stage | null;
  leadsCount: number;
  targetStageId: string;
  loading: boolean;
}

const COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  '#EC4899', '#F43F5E', '#6B7280', '#374151', '#1F2937',
];

export default function FunnelSettings({ t }: FunnelSettingsProps) {
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFunnel, setSelectedFunnel] = useState<Funnel | null>(null);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [newFunnelName, setNewFunnelName] = useState('');
  const [newStageName, setNewStageName] = useState('');
  const [showNewFunnel, setShowNewFunnel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState<DeleteStageModal>({
    isOpen: false,
    stage: null,
    leadsCount: 0,
    targetStageId: '',
    loading: false,
  });

  const fetchFunnels = useCallback(async () => {
    try {
      const res = await fetch('/api/crm/funnels');
      if (res.ok) {
        const data = await res.json();
        setFunnels(data);
        if (data.length > 0 && !selectedFunnel) {
          setSelectedFunnel(data[0]);
        } else if (selectedFunnel) {
          // Refresh selected funnel
          const updated = data.find((f: Funnel) => f.id === selectedFunnel.id);
          if (updated) setSelectedFunnel(updated);
        }
      }
    } catch (error) {
      console.error('Failed to fetch funnels:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedFunnel]);

  useEffect(() => {
    fetchFunnels();
  }, []);

  const createFunnel = async () => {
    if (!newFunnelName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/crm/funnels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFunnelName.trim() }),
      });
      if (res.ok) {
        const newFunnel = await res.json();
        setFunnels(prev => [...prev, newFunnel]);
        setSelectedFunnel(newFunnel);
        setNewFunnelName('');
        setShowNewFunnel(false);
      }
    } catch (error) {
      console.error('Failed to create funnel:', error);
    }
    setSaving(false);
  };

  const updateFunnel = async (id: string, data: Partial<Funnel>) => {
    try {
      const res = await fetch(`/api/crm/funnels/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        fetchFunnels();
      }
    } catch (error) {
      console.error('Failed to update funnel:', error);
    }
  };

  const deleteFunnel = async (id: string) => {
    if (!confirm(t('crm.settings.confirmDeleteFunnel'))) return;
    try {
      const res = await fetch(`/api/crm/funnels/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setFunnels(prev => prev.filter(f => f.id !== id));
        if (selectedFunnel?.id === id) {
          setSelectedFunnel(funnels.find(f => f.id !== id) || null);
        }
      }
    } catch (error) {
      console.error('Failed to delete funnel:', error);
    }
  };

  const createStage = async () => {
    if (!selectedFunnel || !newStageName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/crm/stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          funnelId: selectedFunnel.id,
          name: newStageName.trim(),
        }),
      });
      if (res.ok) {
        setNewStageName('');
        fetchFunnels();
      }
    } catch (error) {
      console.error('Failed to create stage:', error);
    }
    setSaving(false);
  };

  const updateStage = async (id: string, data: Partial<Stage>) => {
    try {
      const res = await fetch(`/api/crm/stages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        fetchFunnels();
        setEditingStage(null);
      }
    } catch (error) {
      console.error('Failed to update stage:', error);
    }
  };

  const initiateDeleteStage = async (stage: Stage) => {
    // First try to delete - API will tell us if there are leads
    try {
      const res = await fetch(`/api/crm/stages/${stage.id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchFunnels();
        return;
      }

      const err = await res.json();
      if (err.error === 'HAS_LEADS') {
        // Stage has leads - show modal with transfer options
        const otherStages = selectedFunnel?.stages.filter(s => s.id !== stage.id && !s.isSystem) || [];
        setDeleteModal({
          isOpen: true,
          stage,
          leadsCount: err.leadsCount,
          targetStageId: otherStages[0]?.id || '',
          loading: false,
        });
      } else {
        alert(err.error);
      }
    } catch (error) {
      console.error('Failed to delete stage:', error);
    }
  };

  const confirmDeleteWithTransfer = async () => {
    if (!deleteModal.stage) return;

    setDeleteModal(prev => ({ ...prev, loading: true }));

    try {
      const url = deleteModal.targetStageId
        ? `/api/crm/stages/${deleteModal.stage.id}?transferTo=${deleteModal.targetStageId}`
        : `/api/crm/stages/${deleteModal.stage.id}`;

      const res = await fetch(url, { method: 'DELETE' });
      if (res.ok) {
        fetchFunnels();
        setDeleteModal({ isOpen: false, stage: null, leadsCount: 0, targetStageId: '', loading: false });
      } else {
        const err = await res.json();
        alert(err.error);
        setDeleteModal(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('Failed to delete stage:', error);
      setDeleteModal(prev => ({ ...prev, loading: false }));
    }
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, stage: null, leadsCount: 0, targetStageId: '', loading: false });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Funnel selector */}
      <div className="flex items-center gap-3 flex-wrap">
        {funnels.map(funnel => (
          <button
            key={funnel.id}
            onClick={() => setSelectedFunnel(funnel)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
              selectedFunnel?.id === funnel.id
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: funnel.color }}
            />
            {funnel.name}
            {funnel.isDefault && (
              <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded">
                {t('crm.settings.default')}
              </span>
            )}
          </button>
        ))}

        {showNewFunnel ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newFunnelName}
              onChange={e => setNewFunnelName(e.target.value)}
              placeholder={t('crm.settings.funnelName')}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') createFunnel();
                if (e.key === 'Escape') { setShowNewFunnel(false); setNewFunnelName(''); }
              }}
            />
            <button
              onClick={createFunnel}
              disabled={saving || !newFunnelName.trim()}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
            >
              {saving ? '...' : t('crm.settings.add')}
            </button>
            <button
              onClick={() => { setShowNewFunnel(false); setNewFunnelName(''); }}
              className="p-2 text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowNewFunnel(true)}
            className="px-4 py-2 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 hover:border-blue-500 hover:text-blue-500 text-sm font-medium transition-colors"
          >
            + {t('crm.settings.addFunnel')}
          </button>
        )}
      </div>

      {/* Selected funnel settings */}
      {selectedFunnel && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-4">
          {/* Funnel header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={selectedFunnel.color}
                onChange={e => updateFunnel(selectedFunnel.id, { color: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer"
              />
              <input
                type="text"
                value={selectedFunnel.name}
                onChange={e => updateFunnel(selectedFunnel.id, { name: e.target.value })}
                className="text-lg font-semibold bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-500 focus:outline-none px-1 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              {!selectedFunnel.isDefault && (
                <button
                  onClick={() => updateFunnel(selectedFunnel.id, { isDefault: true })}
                  className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-700 dark:hover:text-green-300"
                >
                  {t('crm.settings.setDefault')}
                </button>
              )}
              <button
                onClick={() => deleteFunnel(selectedFunnel.id)}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Stages */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('crm.settings.stages')}
            </h4>

            <div className="space-y-2">
              {selectedFunnel.stages.map((stage, index) => (
                <div
                  key={stage.id}
                  className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <span className="text-gray-400 dark:text-gray-500 text-sm w-6">{index + 1}</span>

                  <div
                    className="w-4 h-4 rounded-full shrink-0 cursor-pointer"
                    style={{ backgroundColor: stage.color }}
                    onClick={() => setEditingStage(editingStage?.id === stage.id ? null : stage)}
                  />

                  {editingStage?.id === stage.id ? (
                    <input
                      type="text"
                      value={editingStage.name}
                      onChange={e => setEditingStage({ ...editingStage, name: e.target.value })}
                      onBlur={() => updateStage(stage.id, { name: editingStage.name })}
                      onKeyDown={e => {
                        if (e.key === 'Enter') updateStage(stage.id, { name: editingStage.name });
                        if (e.key === 'Escape') setEditingStage(null);
                      }}
                      className="flex-1 px-2 py-1 rounded border border-blue-500 focus:outline-none text-sm"
                      autoFocus
                    />
                  ) : (
                    <span
                      className="flex-1 text-sm text-gray-900 dark:text-white cursor-pointer"
                      onClick={() => setEditingStage(stage)}
                    >
                      {stage.name}
                    </span>
                  )}

                  {/* Stage type badges */}
                  {stage.isWon && (
                    <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                      {t('crm.settings.won')}
                    </span>
                  )}
                  {stage.isLost && (
                    <span className="px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded">
                      {t('crm.settings.lost')}
                    </span>
                  )}

                  {/* Color picker */}
                  {editingStage?.id === stage.id && (
                    <div className="flex gap-1 flex-wrap max-w-[200px]">
                      {COLORS.slice(0, 10).map(color => (
                        <button
                          key={color}
                          onClick={() => updateStage(stage.id, { color })}
                          className={`w-5 h-5 rounded-full ${stage.color === color ? 'ring-2 ring-offset-1 ring-blue-500' : ''}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Actions - hide for system stages */}
                  <div className="flex items-center gap-1">
                    {stage.isSystem ? (
                      <span className="text-xs text-gray-400 italic px-2">{t('crm.settings.systemStage')}</span>
                    ) : (
                      <>
                        {!stage.isWon && !stage.isLost && (
                          <>
                            <button
                              onClick={() => updateStage(stage.id, { isWon: true })}
                              className="p-1 text-gray-400 hover:text-green-500 rounded"
                              title={t('crm.settings.markAsWon')}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => updateStage(stage.id, { isLost: true })}
                              className="p-1 text-gray-400 hover:text-red-500 rounded"
                              title={t('crm.settings.markAsLost')}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </>
                        )}
                        {(stage.isWon || stage.isLost) && (
                          <button
                            onClick={() => updateStage(stage.id, { isWon: false, isLost: false })}
                            className="p-1 text-gray-400 hover:text-blue-500 rounded"
                            title={t('crm.settings.resetStageType')}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => initiateDeleteStage(stage)}
                          className="p-1 text-gray-400 hover:text-red-500 rounded"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}

              {/* Add new stage */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  value={newStageName}
                  onChange={e => setNewStageName(e.target.value)}
                  placeholder={t('crm.settings.newStageName')}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                  onKeyDown={e => {
                    if (e.key === 'Enter') createStage();
                  }}
                />
                <button
                  onClick={createStage}
                  disabled={saving || !newStageName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {saving ? '...' : t('crm.settings.addStage')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {funnels.length === 0 && !showNewFunnel && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-4">{t('crm.settings.noFunnels')}</p>
          <button
            onClick={() => setShowNewFunnel(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium"
          >
            {t('crm.settings.createFirstFunnel')}
          </button>
        </div>
      )}

      {/* Delete Stage Modal */}
      {deleteModal.isOpen && deleteModal.stage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeDeleteModal}
          />

          {/* Modal */}
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Удаление этапа
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {deleteModal.stage.name}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-4 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800/40">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    В этом этапе {deleteModal.leadsCount} {deleteModal.leadsCount === 1 ? 'сделка' : deleteModal.leadsCount < 5 ? 'сделки' : 'сделок'}
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                    Выберите куда перенести сделки перед удалением
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Перенести сделки в этап:
                </label>
                <select
                  value={deleteModal.targetStageId}
                  onChange={(e) => setDeleteModal(prev => ({ ...prev, targetStageId: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {selectedFunnel?.stages
                    .filter(s => s.id !== deleteModal.stage?.id && !s.isSystem)
                    .map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
              <button
                onClick={closeDeleteModal}
                disabled={deleteModal.loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                onClick={confirmDeleteWithTransfer}
                disabled={deleteModal.loading || !deleteModal.targetStageId}
                className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleteModal.loading && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                Перенести и удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
