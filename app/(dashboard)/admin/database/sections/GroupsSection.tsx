'use client';

import { useState, useEffect } from 'react';

interface Branch {
  id: string;
  name: string;
}

interface GradeLevel {
  id: string;
  level: number;
  name: string;
}

interface GroupIndex {
  id: string;
  index: string;
}

interface Group {
  id: string;
  name: string;
  branchId: string | null;
  gradeLevelId: string | null;
  groupIndexId: string | null;
  isActive: boolean;
  branch?: Branch | null;
  gradeLevel?: GradeLevel | null;
  groupIndex?: GroupIndex | null;
}

interface FormData {
  name: string;
  branchId: string;
  gradeLevelId: string;
  groupIndexId: string;
  isActive: boolean;
}

interface ItemWithActionsProps {
  item: Group;
  isEditing: boolean;
  formData: FormData;
  branches: Branch[];
  gradeLevels: GradeLevel[];
  groupIndexes: GroupIndex[];
  onEdit: (item: Group) => void;
  onDelete: (id: string) => void;
  onToggle: (item: Group) => void;
  onFormChange: (data: FormData) => void;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
}

function ItemWithActions({
  item,
  isEditing,
  formData,
  branches,
  gradeLevels,
  groupIndexes,
  onEdit,
  onDelete,
  onToggle,
  onFormChange,
  onSave,
  onCancel
}: ItemWithActionsProps) {
  if (isEditing) {
    return (
      <form onSubmit={onSave} className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-500">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Название
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Название группы"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Филиал
            </label>
            <select
              value={formData.branchId}
              onChange={(e) => onFormChange({ ...formData, branchId: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="">-- Не выбран --</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Класс
            </label>
            <select
              value={formData.gradeLevelId}
              onChange={(e) => onFormChange({ ...formData, gradeLevelId: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="">-- Не выбран --</option>
              {gradeLevels.map((gl) => (
                <option key={gl.id} value={gl.id}>
                  {gl.level} - {gl.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Индекс группы
            </label>
            <select
              value={formData.groupIndexId}
              onChange={(e) => onFormChange({ ...formData, groupIndexId: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="">-- Не выбран --</option>
              {groupIndexes.map((gi) => (
                <option key={gi.id} value={gi.id}>
                  {gi.index}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => onFormChange({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Активна</span>
          </label>
          <div className="flex items-center gap-2">
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
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <span className="font-medium text-gray-900 dark:text-white">{item.name}</span>
        <div className="flex items-center gap-2 flex-wrap">
          {item.gradeLevel && (
            <span className="inline-flex items-center px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-lg">
              {item.gradeLevel.level} класс
            </span>
          )}
          {item.groupIndex && (
            <span className="inline-flex items-center px-2.5 py-1 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 text-purple-600 dark:text-purple-400 text-xs font-medium rounded-lg">
              {item.groupIndex.index}
            </span>
          )}
          {item.branch && (
            <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 dark:bg-gray-600 border border-gray-200 dark:border-gray-500 text-gray-600 dark:text-gray-300 text-xs font-medium rounded-lg">
              {item.branch.name}
            </span>
          )}
        </div>
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

export default function GroupsSection() {
  const [items, setItems] = useState<Group[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [groupIndexes, setGroupIndexes] = useState<GroupIndex[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    branchId: '',
    gradeLevelId: '',
    groupIndexId: '',
    isActive: true
  });
  const [isAdding, setIsAdding] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchItems();
    fetchBranches();
    fetchGradeLevels();
    fetchGroupIndexes();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/database/groups');
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
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

  const fetchGradeLevels = async () => {
    try {
      const res = await fetch('/api/database/grade-levels');
      if (res.ok) {
        const data = await res.json();
        setGradeLevels(data);
      }
    } catch (error) {
      console.error('Error fetching grade levels:', error);
    }
  };

  const fetchGroupIndexes = async () => {
    try {
      const res = await fetch('/api/database/group-indexes');
      if (res.ok) {
        const data = await res.json();
        setGroupIndexes(data);
      }
    } catch (error) {
      console.error('Error fetching group indexes:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      name: formData.name.trim(),
      branchId: formData.branchId || null,
      gradeLevelId: formData.gradeLevelId || null,
      groupIndexId: formData.groupIndexId || null,
      isActive: formData.isActive,
    };

    try {
      if (editingId) {
        // Optimistic update for edit
        const updatedItem: Group = {
          ...items.find(i => i.id === editingId)!,
          ...submitData,
          branch: branches.find(b => b.id === submitData.branchId) || null,
          gradeLevel: gradeLevels.find(g => g.id === submitData.gradeLevelId) || null,
          groupIndex: groupIndexes.find(g => g.id === submitData.groupIndexId) || null,
        };
        setItems(prev => prev.map(item =>
          item.id === editingId ? updatedItem : item
        ));
        setEditingId(null);
        setFormData({ name: '', branchId: '', gradeLevelId: '', groupIndexId: '', isActive: true });

        const res = await fetch(`/api/database/groups/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData),
        });
        if (!res.ok) {
          fetchItems();
          alert('Ошибка сохранения');
        }
      } else {
        const res = await fetch('/api/database/groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData),
        });
        if (res.ok) {
          const newItem = await res.json();
          setItems(prev => [...prev, newItem]);
          setIsAdding(false);
          setFormData({ name: '', branchId: '', gradeLevelId: '', groupIndexId: '', isActive: true });
        }
      }
    } catch (error) {
      console.error('Error saving group:', error);
      fetchItems();
    }
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const previousItems = items;
    // Optimistic delete
    setItems(prev => prev.filter(item => item.id !== deleteId));
    setDeleteId(null);

    try {
      const res = await fetch(`/api/database/groups/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) {
        setItems(previousItems);
      }
    } catch (error) {
      console.error('Error deleting group:', error);
      setItems(previousItems);
    }
  };

  const handleToggle = async (item: Group) => {
    const newIsActive = !item.isActive;
    // Optimistic update
    setItems(prev => prev.map(i =>
      i.id === item.id ? { ...i, isActive: newIsActive } : i
    ));

    try {
      const res = await fetch(`/api/database/groups/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: item.name,
          branchId: item.branchId,
          gradeLevelId: item.gradeLevelId,
          groupIndexId: item.groupIndexId,
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
      setItems(prev => prev.map(i =>
        i.id === item.id ? { ...i, isActive: item.isActive } : i
      ));
    }
  };

  const startEdit = (item: Group) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      branchId: item.branchId || '',
      gradeLevelId: item.gradeLevelId || '',
      groupIndexId: item.groupIndexId || '',
      isActive: item.isActive
    });
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({ name: '', branchId: '', gradeLevelId: '', groupIndexId: '', isActive: true });
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
              setFormData({ name: '', branchId: '', gradeLevelId: '', groupIndexId: '', isActive: true });
            }}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            + Добавить группу
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        {isAdding && (
          <form onSubmit={handleSubmit} className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Название
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Название группы"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Филиал
                </label>
                <select
                  value={formData.branchId}
                  onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">-- Не выбран --</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Класс
                </label>
                <select
                  value={formData.gradeLevelId}
                  onChange={(e) => setFormData({ ...formData, gradeLevelId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">-- Не выбран --</option>
                  {gradeLevels.map((gl) => (
                    <option key={gl.id} value={gl.id}>
                      {gl.level} - {gl.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Индекс группы
                </label>
                <select
                  value={formData.groupIndexId}
                  onChange={(e) => setFormData({ ...formData, groupIndexId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">-- Не выбран --</option>
                  {groupIndexes.map((gi) => (
                    <option key={gi.id} value={gi.id}>
                      {gi.index}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Активна</span>
              </label>
              <div className="flex items-center gap-2">
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
                gradeLevels={gradeLevels}
                groupIndexes={groupIndexes}
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
                Удалить группу?
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
