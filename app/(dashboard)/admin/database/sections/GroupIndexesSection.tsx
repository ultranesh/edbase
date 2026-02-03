'use client';

import { useState, useEffect, useMemo } from 'react';

interface GroupIndex {
  id: string;
  name: string;
  symbol: string;
  orderIndex: number;
  isActive: boolean;
}

interface FormData {
  name: string;
  symbol: string;
  isActive: boolean;
}

interface ItemWithActionsProps {
  item: GroupIndex;
  indexWrapperWidth: number;
  isEditing: boolean;
  formData: FormData;
  onEdit: (item: GroupIndex) => void;
  onDelete: (id: string) => void;
  onToggle: (item: GroupIndex) => void;
  onFormChange: (data: FormData) => void;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
}

function ItemWithActions({ item, indexWrapperWidth, isEditing, formData, onEdit, onDelete, onToggle, onFormChange, onSave, onCancel }: ItemWithActionsProps) {
  if (isEditing) {
    return (
      <form onSubmit={onSave} className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-500">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="shrink-0" style={{ width: indexWrapperWidth }}>
            <input
              type="text"
              value={formData.symbol}
              onChange={(e) => onFormChange({ ...formData, index: e.target.value })}
              className="w-full px-2.5 py-1 bg-blue-50 dark:bg-slate-800 border-2 border-blue-500 text-blue-600 dark:text-blue-400 font-semibold rounded-lg text-sm text-center"
              placeholder="Символ"
              required
            />
          </div>
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => onFormChange({ ...formData, description: e.target.value })}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Название"
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
        <div className="shrink-0" style={{ width: indexWrapperWidth }}>
          <span className="inline-flex px-2.5 py-1 items-center justify-center bg-blue-50 dark:bg-slate-800 border-2 border-blue-500 text-blue-600 dark:text-blue-400 font-semibold rounded-lg text-sm">
            {item.symbol || '—'}
          </span>
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
          {item.name || '—'}
        </span>
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

export default function GroupIndexesSection() {
  const [items, setItems] = useState<GroupIndex[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({ name: '', symbol: '', isActive: true });
  const [isAdding, setIsAdding] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const indexWrapperWidth = useMemo(() => {
    if (items.length === 0) return 80;
    const maxLength = Math.max(...items.map(i => (i.symbol || '').length));
    return Math.max(80, maxLength * 9 + 40);
  }, [items]);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/database/group-indexes');
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (error) {
      console.error('Error fetching group indexes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSend = {
      symbol: formData.symbol.trim(),
      name: formData.name.trim(),
      isActive: formData.isActive,
    };
    try {
      if (editingId) {
        setItems(prev => prev.map(item =>
          item.id === editingId ? { ...item, ...dataToSend } : item
        ));
        setEditingId(null);
        setFormData({ name: '', symbol: '', isActive: true });

        const res = await fetch(`/api/database/group-indexes/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend),
        });
        if (!res.ok) {
          fetchItems();
          alert('Ошибка сохранения');
        }
      } else {
        const res = await fetch('/api/database/group-indexes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend),
        });
        if (res.ok) {
          const newItem = await res.json();
          setItems(prev => [...prev, newItem]);
          setIsAdding(false);
          setFormData({ name: '', symbol: '', isActive: true });
        }
      }
    } catch (error) {
      console.error('Error saving group index:', error);
      fetchItems();
    }
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const previousItems = items;
    setItems(prev => prev.filter(item => item.id !== deleteId));
    setDeleteId(null);

    try {
      const res = await fetch(`/api/database/group-indexes/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) {
        setItems(previousItems);
      }
    } catch (error) {
      console.error('Error deleting group index:', error);
      setItems(previousItems);
    }
  };

  const handleToggle = async (item: GroupIndex) => {
    const newIsActive = !item.isActive;
    setItems(prev => prev.map(i =>
      i.id === item.id ? { ...i, isActive: newIsActive } : i
    ));

    try {
      const res = await fetch(`/api/database/group-indexes/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, isActive: newIsActive }),
      });
      if (!res.ok) {
        setItems(prev => prev.map(i =>
          i.id === item.id ? { ...i, isActive: item.isActive } : i
        ));
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      setItems(prev => prev.map(i =>
        i.id === item.id ? { ...i, isActive: item.isActive } : i
      ));
    }
  };

  const startEdit = (item: GroupIndex) => {
    setEditingId(item.id);
    setFormData({
      symbol: item.symbol,
      name: item.name || '',
      isActive: item.isActive
    });
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({ name: '', symbol: '', isActive: true });
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
              setFormData({ name: '', symbol: '', isActive: true });
            }}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            + Добавить индекс
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        {isAdding && (
          <form onSubmit={handleSubmit} className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-500">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="shrink-0" style={{ width: indexWrapperWidth }}>
                <input
                  type="text"
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, index: e.target.value })}
                  className="w-full px-2.5 py-1 bg-blue-50 dark:bg-slate-800 border-2 border-blue-500 text-blue-600 dark:text-blue-400 font-semibold rounded-lg text-sm text-center"
                  placeholder="Символ"
                  required
                />
              </div>
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Название"
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
                indexWrapperWidth={indexWrapperWidth}
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
                Удалить индекс?
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
