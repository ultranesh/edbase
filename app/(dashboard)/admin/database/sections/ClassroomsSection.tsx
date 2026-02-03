'use client';

import { useState, useEffect } from 'react';

interface Branch {
  id: string;
  name: string;
}

interface Classroom {
  id: string;
  name: string;
  nameKz?: string;
  nameRu?: string;
  nameEn?: string;
  branchId: string | null;
  capacity: number | null;
  isActive: boolean;
  branch?: Branch | null;
}

interface FormData {
  name: string;
  nameKz: string;
  nameRu: string;
  nameEn: string;
  branchId: string;
  capacity: string;
  isActive: boolean;
}

interface ItemWithActionsProps {
  item: Classroom;
  isEditing: boolean;
  formData: FormData;
  branches: Branch[];
  onEdit: (item: Classroom) => void;
  onDelete: (id: string) => void;
  onToggle: (item: Classroom) => void;
  onFormChange: (data: FormData) => void;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
}

function ItemWithActions({ item, isEditing, formData, branches, onEdit, onDelete, onToggle, onFormChange, onSave, onCancel }: ItemWithActionsProps) {
  if (isEditing) {
    return (
      <form onSubmit={onSave} className="flex items-start justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-500">
        <div className="flex flex-col gap-3 flex-1 min-w-0">
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded shrink-0">KZ</span>
              <input
                type="text"
                value={formData.nameKz}
                onChange={(e) => onFormChange({ ...formData, nameKz: e.target.value })}
                className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                placeholder="Атауы (KZ)"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded shrink-0">RU</span>
              <input
                type="text"
                value={formData.nameRu}
                onChange={(e) => onFormChange({ ...formData, nameRu: e.target.value })}
                className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                placeholder="Название (RU)"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded shrink-0">EN</span>
              <input
                type="text"
                value={formData.nameEn}
                onChange={(e) => onFormChange({ ...formData, nameEn: e.target.value })}
                className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                placeholder="Name (EN)"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={formData.branchId}
              onChange={(e) => onFormChange({ ...formData, branchId: e.target.value })}
              className="w-40 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            >
              <option value="">-- Филиал --</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded shrink-0">мест</span>
              <input
                type="number"
                value={formData.capacity}
                onChange={(e) => onFormChange({ ...formData, capacity: e.target.value })}
                className="w-20 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                placeholder="0"
                min="1"
              />
            </div>
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
      <div className="flex items-center gap-3 shrink-0 ml-4">
        {item.branch && (
          <span className="inline-flex px-2.5 py-1 items-center justify-center bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 font-medium rounded-lg text-xs">
            {item.branch.name}
          </span>
        )}
        {item.capacity && (
          <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <span className="text-[11px] font-medium bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">мест</span>
            {item.capacity}
          </span>
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
          title={item.isActive ? 'Активна' : 'Неактивна'}
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

export default function ClassroomsSection() {
  const [items, setItems] = useState<Classroom[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({ name: '', nameKz: '', nameRu: '', nameEn: '', branchId: '', capacity: '', isActive: true });
  const [isAdding, setIsAdding] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchItems();
    fetchBranches();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/database/classrooms');
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (error) {
      console.error('Error fetching classrooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await fetch('/api/database/branches');
      if (res.ok) {
        const data = await res.json();
        setBranches(data);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSend = {
      name: formData.nameRu.trim() || formData.nameKz.trim() || formData.nameEn.trim(),
      nameKz: formData.nameKz.trim() || null,
      nameRu: formData.nameRu.trim() || null,
      nameEn: formData.nameEn.trim() || null,
      branchId: formData.branchId || null,
      capacity: formData.capacity ? parseInt(formData.capacity) : null,
      isActive: formData.isActive,
    };

    try {
      if (editingId) {
        // Optimistic update
        const selectedBranch = branches.find(b => b.id === formData.branchId);
        setItems(prev => prev.map(item =>
          item.id === editingId ? {
            ...item,
            ...dataToSend,
            branch: selectedBranch || null
          } : item
        ));
        setEditingId(null);
        setFormData({ name: '', nameKz: '', nameRu: '', nameEn: '', branchId: '', capacity: '', isActive: true });

        const res = await fetch(`/api/database/classrooms/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend),
        });
        if (!res.ok) {
          fetchItems();
          alert('Ошибка сохранения');
        }
      } else {
        const res = await fetch('/api/database/classrooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend),
        });
        if (res.ok) {
          const newItem = await res.json();
          setItems(prev => [...prev, newItem]);
          setIsAdding(false);
          setFormData({ name: '', nameKz: '', nameRu: '', nameEn: '', branchId: '', capacity: '', isActive: true });
        }
      }
    } catch (error) {
      console.error('Error saving classroom:', error);
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
      const res = await fetch(`/api/database/classrooms/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) {
        setItems(previousItems);
      }
    } catch (error) {
      console.error('Error deleting classroom:', error);
      setItems(previousItems);
    }
  };

  const handleToggle = async (item: Classroom) => {
    const newIsActive = !item.isActive;
    // Optimistic update
    setItems(prev => prev.map(i =>
      i.id === item.id ? { ...i, isActive: newIsActive } : i
    ));

    try {
      const res = await fetch(`/api/database/classrooms/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: item.name,
          nameKz: item.nameKz,
          nameRu: item.nameRu,
          nameEn: item.nameEn,
          branchId: item.branchId,
          capacity: item.capacity,
          isActive: newIsActive
        }),
      });
      if (!res.ok) {
        // Revert on failure
        setItems(prev => prev.map(i =>
          i.id === item.id ? { ...i, isActive: item.isActive } : i
        ));
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      // Revert on error
      setItems(prev => prev.map(i =>
        i.id === item.id ? { ...i, isActive: item.isActive } : i
      ));
    }
  };

  const startEdit = (item: Classroom) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      nameKz: item.nameKz || '',
      nameRu: item.nameRu || '',
      nameEn: item.nameEn || '',
      branchId: item.branchId || '',
      capacity: item.capacity?.toString() || '',
      isActive: item.isActive
    });
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({ name: '', nameKz: '', nameRu: '', nameEn: '', branchId: '', capacity: '', isActive: true });
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
              setFormData({ name: '', nameKz: '', nameRu: '', nameEn: '', branchId: '', capacity: '', isActive: true });
            }}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            + Добавить аудиторию
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        {isAdding && (
          <form onSubmit={handleSubmit} className="flex items-start justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-500">
            <div className="flex flex-col gap-3 flex-1 min-w-0">
              <div className="grid grid-cols-3 gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded shrink-0">KZ</span>
                  <input
                    type="text"
                    value={formData.nameKz}
                    onChange={(e) => setFormData({ ...formData, nameKz: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                    placeholder="Атауы (KZ)"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded shrink-0">RU</span>
                  <input
                    type="text"
                    value={formData.nameRu}
                    onChange={(e) => setFormData({ ...formData, nameRu: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                    placeholder="Название (RU)"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded shrink-0">EN</span>
                  <input
                    type="text"
                    value={formData.nameEn}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                    placeholder="Name (EN)"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <select
                  value={formData.branchId}
                  onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                  className="w-40 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">-- Филиал --</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded shrink-0">мест</span>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    className="w-20 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                    placeholder="0"
                    min="1"
                  />
                </div>
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
                isEditing={editingId === item.id}
                formData={formData}
                branches={branches}
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
                Удалить аудиторию?
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
