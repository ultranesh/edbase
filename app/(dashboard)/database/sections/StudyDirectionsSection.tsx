'use client';

import { useState, useEffect } from 'react';
import { useNotification } from '@/app/components/ui/NotificationProvider';

interface StudyDirection {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

export default function StudyDirectionsSection() {
  const [items, setItems] = useState<StudyDirection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showToast, showConfirm } = useNotification();

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/database/study-directions');
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error('Error fetching study directions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.name.trim() || !formData.code.trim()) return;
    setSaving(true);
    try {
      const response = await fetch('/api/database/study-directions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        await fetchItems();
        setFormData({ name: '', code: '' });
        setIsAdding(false);
      }
    } catch (error) {
      console.error('Error adding study direction:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!formData.name.trim() || !formData.code.trim()) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/database/study-directions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        await fetchItems();
        setEditingId(null);
        setFormData({ name: '', code: '' });
      }
    } catch (error) {
      console.error('Error updating study direction:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/database/study-directions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });
      await fetchItems();
    } catch (error) {
      console.error('Error toggling study direction:', error);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Удалить направление',
      message: 'Вы уверены, что хотите удалить это направление?',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await fetch(`/api/database/study-directions/${id}`, { method: 'DELETE' });
      showToast({ message: 'Направление удалено', type: 'success' });
      await fetchItems();
    } catch (error) {
      console.error('Error deleting study direction:', error);
      showToast({ message: 'Ошибка при удалении', type: 'error' });
    }
  };

  const startEdit = (item: StudyDirection) => {
    setEditingId(item.id);
    setFormData({ name: item.name, code: item.code });
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({ name: '', code: '' });
  };

  if (loading) return <div className="text-center py-8 text-gray-500">Загрузка...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Направления обучения</h2>
        {!isAdding && !editingId && (
          <button onClick={() => setIsAdding(true)} className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Добавить
          </button>
        )}
      </div>

      {isAdding && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Новое направление</h3>
          <div className="grid grid-cols-2 gap-4">
            <input type="text" placeholder="Название" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg" />
            <input type="text" placeholder="Код" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={handleAdd} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg disabled:opacity-50">{saving ? 'Сохранение...' : 'Сохранить'}</button>
            <button onClick={cancelEdit} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg">Отмена</button>
          </div>
        </div>
      )}

      <div className="overflow-hidden border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Название</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Код</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Действия</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">
                  {editingId === item.id ? (
                    <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="px-2 py-1 border border-gray-300 rounded" />
                  ) : (
                    <span className="text-sm font-medium text-gray-900">{item.name}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editingId === item.id ? (
                    <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="px-2 py-1 border border-gray-300 rounded w-24" />
                  ) : (
                    <span className="text-sm text-gray-600 font-mono">{item.code}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => handleToggleActive(item.id, item.isActive)} className={`px-2 py-1 text-xs font-medium rounded-full ${item.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {item.isActive ? 'Активен' : 'Неактивен'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  {editingId === item.id ? (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleUpdate(item.id)} disabled={saving} className="text-sm text-blue-600">{saving ? 'Сохранение...' : 'Сохранить'}</button>
                      <button onClick={cancelEdit} className="text-sm text-gray-600">Отмена</button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => startEdit(item)} className="text-sm text-blue-600">Изменить</button>
                      <button onClick={() => handleDelete(item.id)} className="text-sm text-red-600">Удалить</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
