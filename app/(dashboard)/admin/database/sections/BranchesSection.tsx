'use client';

import { useState, useEffect, useMemo } from 'react';
import { useNotification } from '@/app/components/ui/NotificationProvider';

interface Branch {
  id: string;
  name: string;
  nameKz: string | null;
  nameRu: string | null;
  nameEn: string | null;
  code: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
}

interface FormData {
  name: string;
  nameKz: string;
  nameRu: string;
  nameEn: string;
  code: string;
  address: string;
  latitude: string;
  longitude: string;
  isActive: boolean;
}

interface ItemWithActionsProps {
  item: Branch;
  codeWrapperWidth: number;
  isEditing: boolean;
  formData: FormData;
  onEdit: (item: Branch) => void;
  onDelete: (id: string) => void;
  onToggle: (item: Branch) => void;
  onFormChange: (data: FormData) => void;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
}

function ItemWithActions({ item, codeWrapperWidth, isEditing, formData, onEdit, onDelete, onToggle, onFormChange, onSave, onCancel }: ItemWithActionsProps) {
  if (isEditing) {
    return (
      <form onSubmit={onSave} className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-500">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="shrink-0" style={{ width: codeWrapperWidth }}>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => onFormChange({ ...formData, code: e.target.value.toUpperCase() })}
              className="w-full px-2.5 py-1 bg-blue-50 dark:bg-slate-800 border-2 border-blue-500 text-blue-600 dark:text-blue-400 font-semibold rounded-lg text-sm text-center"
              placeholder="CODE"
              maxLength={10}
            />
          </div>
          <div className="grid grid-cols-3 flex-1 gap-2">
            <input
              type="text"
              value={formData.nameKz}
              onChange={(e) => onFormChange({ ...formData, nameKz: e.target.value })}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
              placeholder="Атауы (KZ)"
            />
            <input
              type="text"
              value={formData.nameRu}
              onChange={(e) => onFormChange({ ...formData, nameRu: e.target.value })}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
              placeholder="Название (RU)"
            />
            <input
              type="text"
              value={formData.nameEn}
              onChange={(e) => onFormChange({ ...formData, nameEn: e.target.value })}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
              placeholder="Name (EN)"
            />
          </div>
          <div className="shrink-0 flex items-center gap-1.5">
            <span className="text-[11px] font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded shrink-0">2GIS</span>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => onFormChange({ ...formData, address: e.target.value })}
              className="w-48 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Ссылка 2GIS"
            />
          </div>
          <div className="shrink-0 flex gap-2">
            <input
              type="text"
              value={formData.latitude}
              onChange={(e) => onFormChange({ ...formData, latitude: e.target.value })}
              className="w-28 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Широта"
            />
            <input
              type="text"
              value={formData.longitude}
              onChange={(e) => onFormChange({ ...formData, longitude: e.target.value })}
              className="w-28 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Долгота"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <button
            type="submit"
            className="p-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            title="Сохранить"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            title="Отмена"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="shrink-0" style={{ width: codeWrapperWidth }}>
          {item.code ? (
            <span className="inline-flex px-2.5 py-1 items-center justify-center bg-blue-50 dark:bg-slate-800 border-2 border-blue-500 text-blue-600 dark:text-blue-400 font-semibold rounded-lg text-sm">
              {item.code}
            </span>
          ) : (
            <span className="inline-flex px-2.5 py-1 items-center justify-center text-gray-400 text-sm">
              —
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 flex-1 gap-4">
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="text-[11px] font-medium bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded shrink-0">KZ</span>
            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{item.nameKz || '—'}</span>
          </span>
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="text-[11px] font-medium bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded shrink-0">RU</span>
            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{item.nameRu || '—'}</span>
          </span>
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="text-[11px] font-medium bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded shrink-0">EN</span>
            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{item.nameEn || '—'}</span>
          </span>
        </div>
        {item.address && (
          <div className="shrink-0 flex items-center gap-1.5">
            <span className="text-[11px] font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded shrink-0">2GIS</span>
            <a href={item.address} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 truncate max-w-[120px]" title={item.address}>
              Ссылка
            </a>
          </div>
        )}
        {(item.latitude || item.longitude) && (
          <div className="shrink-0 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
              {item.latitude}, {item.longitude}
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-4">
        <button
          type="button"
          onClick={() => onToggle(item)}
          className={`relative w-11 h-6 rounded-full transition-all duration-200 cursor-pointer ${
            item.isActive
              ? 'bg-green-500/20 border-2 border-green-500'
              : 'bg-transparent border-2 border-gray-500'
          }`}
          title={item.isActive ? 'Активен' : 'Неактивен'}
        >
          <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200 ${
            item.isActive
              ? 'translate-x-5 bg-green-500'
              : 'translate-x-0.5 bg-gray-500'
          }`} />
        </button>
        <button
          onClick={() => onEdit(item)}
          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function BranchesSection() {
  const [items, setItems] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({ name: '', nameKz: '', nameRu: '', nameEn: '', code: '', address: '', latitude: '', longitude: '', isActive: true });
  const [isAdding, setIsAdding] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { showToast } = useNotification();

  const codeWrapperWidth = useMemo(() => {
    if (items.length === 0) return 80;
    const maxLength = Math.max(...items.map(item => (item.code || '').length));
    return Math.max(80, maxLength * 9 + 40);
  }, [items]);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/database/branches');
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSend = {
      name: formData.nameRu.trim() || formData.nameKz.trim() || formData.nameEn.trim(),
      nameKz: formData.nameKz.trim() || null,
      nameRu: formData.nameRu.trim() || null,
      nameEn: formData.nameEn.trim() || null,
      code: formData.code.trim() || null,
      address: formData.address.trim() || null,
      latitude: formData.latitude ? parseFloat(formData.latitude.replace(',', '.')) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude.replace(',', '.')) : null,
      isActive: formData.isActive,
    };

    try {
      if (editingId) {
        // Optimistic update
        setItems(prev => prev.map(item =>
          item.id === editingId ? { ...item, ...dataToSend } : item
        ));
        setEditingId(null);
        setFormData({ name: '', nameKz: '', nameRu: '', nameEn: '', code: '', address: '', latitude: '', longitude: '', isActive: true });

        const res = await fetch(`/api/database/branches/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend),
        });
        if (res.ok) {
          showToast({ message: 'Филиал обновлён', type: 'success' });
        } else {
          fetchItems();
          const err = await res.json();
          showToast({ message: err.error || 'Ошибка сохранения', type: 'error' });
        }
      } else {
        const res = await fetch('/api/database/branches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend),
        });
        if (res.ok) {
          const newItem = await res.json();
          setItems(prev => [...prev, newItem]);
          setIsAdding(false);
          setFormData({ name: '', nameKz: '', nameRu: '', nameEn: '', code: '', address: '', latitude: '', longitude: '', isActive: true });
          showToast({ message: 'Филиал создан', type: 'success' });
        } else {
          const err = await res.json();
          showToast({ message: err.error || 'Ошибка создания', type: 'error' });
        }
      }
    } catch (error) {
      console.error('Error saving branch:', error);
      fetchItems();
      showToast({ message: 'Ошибка сохранения', type: 'error' });
    }
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const previousItems = items;
    // Optimistic update
    setItems(prev => prev.filter(item => item.id !== deleteId));
    setDeleteId(null);

    try {
      const res = await fetch(`/api/database/branches/${deleteId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast({ message: 'Филиал удалён', type: 'success' });
      } else {
        setItems(previousItems);
        showToast({ message: 'Ошибка удаления', type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting branch:', error);
      setItems(previousItems);
      showToast({ message: 'Ошибка удаления', type: 'error' });
    }
  };

  const handleToggle = async (item: Branch) => {
    const newIsActive = !item.isActive;
    // Optimistic update
    setItems(prev => prev.map(i =>
      i.id === item.id ? { ...i, isActive: newIsActive } : i
    ));

    try {
      const res = await fetch(`/api/database/branches/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, isActive: newIsActive }),
      });
      if (res.ok) {
        showToast({ message: newIsActive ? 'Филиал активирован' : 'Филиал деактивирован', type: 'success' });
      } else {
        // Revert on error
        setItems(prev => prev.map(i =>
          i.id === item.id ? { ...i, isActive: item.isActive } : i
        ));
        showToast({ message: 'Ошибка обновления статуса', type: 'error' });
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      setItems(prev => prev.map(i =>
        i.id === item.id ? { ...i, isActive: item.isActive } : i
      ));
      showToast({ message: 'Ошибка обновления статуса', type: 'error' });
    }
  };

  const startEdit = (item: Branch) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      nameKz: item.nameKz || '',
      nameRu: item.nameRu || '',
      nameEn: item.nameEn || '',
      code: item.code || '',
      address: item.address || '',
      latitude: item.latitude?.toString() || '',
      longitude: item.longitude?.toString() || '',
      isActive: item.isActive
    });
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({ name: '', nameKz: '', nameRu: '', nameEn: '', code: '', address: '', latitude: '', longitude: '', isActive: true });
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Загрузка...</div>;
  }

  return (
    <>
      {!isAdding && (
        <div className="flex justify-end items-center gap-2 absolute top-0 right-0">
          <button
            onClick={() => {
              setIsAdding(true);
              setEditingId(null);
              setFormData({ name: '', nameKz: '', nameRu: '', nameEn: '', code: '', address: '', latitude: '', longitude: '', isActive: true });
            }}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            + Добавить филиал
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        {isAdding && (
          <form onSubmit={handleSubmit} className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-500">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="shrink-0" style={{ width: codeWrapperWidth }}>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-2.5 py-1 bg-blue-50 dark:bg-slate-800 border-2 border-blue-500 text-blue-600 dark:text-blue-400 font-semibold rounded-lg text-sm text-center"
                  placeholder="CODE"
                  maxLength={10}
                />
              </div>
              <div className="grid grid-cols-3 flex-1 gap-2">
                <input
                  type="text"
                  value={formData.nameKz}
                  onChange={(e) => setFormData({ ...formData, nameKz: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
                  placeholder="Атауы (KZ)"
                />
                <input
                  type="text"
                  value={formData.nameRu}
                  onChange={(e) => setFormData({ ...formData, nameRu: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
                  placeholder="Название (RU)"
                />
                <input
                  type="text"
                  value={formData.nameEn}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
                  placeholder="Name (EN)"
                />
              </div>
              <div className="shrink-0 flex items-center gap-1.5">
                <span className="text-[11px] font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded shrink-0">2GIS</span>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-48 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Ссылка 2GIS"
                />
              </div>
              <div className="shrink-0 flex gap-2">
                <input
                  type="text"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  className="w-28 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Широта"
                />
                <input
                  type="text"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  className="w-28 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Долгота"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-4">
              <button
                type="submit"
                className="p-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                title="Добавить"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                title="Отмена"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Нет данных</div>
          ) : (
            items.map((item) => (
              <ItemWithActions
                key={item.id}
                item={item}
                codeWrapperWidth={codeWrapperWidth}
                isEditing={editingId === item.id}
                formData={formData}
                onEdit={startEdit}
                onDelete={handleDelete}
                onToggle={handleToggle}
                onFormChange={setFormData}
                onSave={handleSubmit}
                onCancel={cancelEdit}
              />
            ))
          )}
        </div>

        {deleteId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Удалить филиал?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Это действие нельзя отменить.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteId(null)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
