'use client';

import { useState, useEffect } from 'react';
import { useNotification } from '@/app/components/ui/NotificationProvider';

interface Classroom {
  id: string;
  name: string;
  capacity: number;
  equipment: string[];
  isActive: boolean;
}

interface Branch {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
  classrooms: Classroom[];
}

// Format phone number as +7 XXX XXX XX XX
const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  let normalized = digits;
  if (digits.startsWith('8') && digits.length > 1) {
    normalized = '7' + digits.slice(1);
  } else if (!digits.startsWith('7') && digits.length > 0) {
    normalized = '7' + digits;
  }
  const limited = normalized.slice(0, 11);
  if (limited.length === 0) return '';
  let formatted = '+7';
  if (limited.length > 1) formatted += ' ' + limited.slice(1, 4);
  if (limited.length > 4) formatted += ' ' + limited.slice(4, 7);
  if (limited.length > 7) formatted += ' ' + limited.slice(7, 9);
  if (limited.length > 9) formatted += ' ' + limited.slice(9, 11);
  return formatted;
};

export default function BranchesSection() {
  const [items, setItems] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBranch, setExpandedBranch] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', address: '', phone: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showToast, showConfirm } = useNotification();

  // Classroom form
  const [isAddingClassroom, setIsAddingClassroom] = useState<string | null>(null);
  const [classroomForm, setClassroomForm] = useState({ name: '', capacity: 15, equipment: '' });

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/database/branches');
      if (response.ok) setItems(await response.json());
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) return;
    setSaving(true);
    try {
      const response = await fetch('/api/database/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) { await fetchItems(); setFormData({ name: '', address: '', phone: '' }); setIsAdding(false); }
    } catch (error) { console.error('Error:', error); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (id: string) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/database/branches/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) { await fetchItems(); setEditingId(null); }
    } catch (error) { console.error('Error:', error); }
    finally { setSaving(false); }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/database/branches/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });
      await fetchItems();
    } catch (error) { console.error('Error:', error); }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Удалить филиал',
      message: 'Вы уверены, что хотите удалить филиал и все аудитории?',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await fetch(`/api/database/branches/${id}`, { method: 'DELETE' });
      showToast({ message: 'Филиал удален', type: 'success' });
      await fetchItems();
    } catch (error) {
      console.error('Error:', error);
      showToast({ message: 'Ошибка при удалении', type: 'error' });
    }
  };

  const handleAddClassroom = async (branchId: string) => {
    if (!classroomForm.name.trim()) return;
    setSaving(true);
    try {
      const response = await fetch('/api/database/classrooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId,
          name: classroomForm.name,
          capacity: classroomForm.capacity,
          equipment: classroomForm.equipment.split(',').map(e => e.trim()).filter(Boolean),
        }),
      });
      if (response.ok) { await fetchItems(); setClassroomForm({ name: '', capacity: 15, equipment: '' }); setIsAddingClassroom(null); }
    } catch (error) { console.error('Error:', error); }
    finally { setSaving(false); }
  };

  const handleDeleteClassroom = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Удалить аудиторию',
      message: 'Вы уверены, что хотите удалить аудиторию?',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await fetch(`/api/database/classrooms/${id}`, { method: 'DELETE' });
      showToast({ message: 'Аудитория удалена', type: 'success' });
      await fetchItems();
    } catch (error) {
      console.error('Error:', error);
      showToast({ message: 'Ошибка при удалении', type: 'error' });
    }
  };

  const startEdit = (item: Branch) => {
    setEditingId(item.id);
    setFormData({ name: item.name, address: item.address || '', phone: item.phone || '' });
    setIsAdding(false);
  };

  const cancelEdit = () => { setEditingId(null); setIsAdding(false); setFormData({ name: '', address: '', phone: '' }); };

  if (loading) return <div className="text-center py-8 text-gray-500">Загрузка...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Филиалы и аудитории</h2>
        {!isAdding && !editingId && (
          <button onClick={() => setIsAdding(true)} className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Добавить филиал
          </button>
        )}
      </div>

      {isAdding && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Новый филиал</h3>
          <div className="grid grid-cols-3 gap-4">
            <input type="text" placeholder="Название" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg" />
            <input type="text" placeholder="Адрес" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg" />
            <input type="tel" placeholder="+7 XXX XXX XX XX" value={formatPhone(formData.phone)} onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })} className="px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={handleAdd} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg disabled:opacity-50">{saving ? 'Сохранение...' : 'Сохранить'}</button>
            <button onClick={cancelEdit} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg">Отмена</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {items.map((branch) => (
          <div key={branch.id} className="border border-gray-200 rounded-lg overflow-hidden">
            <div
              className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
              onClick={() => setExpandedBranch(expandedBranch === branch.id ? null : branch.id)}
            >
              <div className="flex items-center gap-3">
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedBranch === branch.id ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <div>
                  <span className="font-medium text-gray-900">{branch.name}</span>
                  <span className="ml-2 text-xs text-gray-500">({branch.classrooms?.length || 0} аудиторий)</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={(e) => { e.stopPropagation(); handleToggleActive(branch.id, branch.isActive); }} className={`px-2 py-1 text-xs font-medium rounded-full ${branch.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                  {branch.isActive ? 'Активен' : 'Неактивен'}
                </button>
                <button onClick={(e) => { e.stopPropagation(); startEdit(branch); }} className="text-sm text-blue-600">Изменить</button>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(branch.id); }} className="text-sm text-red-600">Удалить</button>
              </div>
            </div>

            {editingId === branch.id && (
              <div className="p-4 bg-yellow-50 border-t border-gray-200">
                <div className="grid grid-cols-3 gap-4">
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg" />
                  <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Адрес" className="px-3 py-2 border border-gray-300 rounded-lg" />
                  <input type="tel" value={formatPhone(formData.phone)} onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })} placeholder="+7 XXX XXX XX XX" className="px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => handleUpdate(branch.id)} disabled={saving} className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg">{saving ? '...' : 'Сохранить'}</button>
                  <button onClick={cancelEdit} className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg">Отмена</button>
                </div>
              </div>
            )}

            {expandedBranch === branch.id && (
              <div className="p-4 bg-white border-t border-gray-200">
                <div className="text-xs text-gray-500 mb-3">
                  {branch.address && <span>Адрес: {branch.address}</span>}
                  {branch.phone && <span className="ml-4">Тел: {formatPhone(branch.phone)}</span>}
                </div>

                {/* Classrooms */}
                <div className="space-y-2 mb-4">
                  {branch.classrooms?.map((classroom) => (
                    <div key={classroom.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-gray-900">{classroom.name}</span>
                        <span className="ml-2 text-xs text-gray-500">Вместимость: {classroom.capacity} чел.</span>
                        {classroom.equipment.length > 0 && (
                          <span className="ml-2 text-xs text-gray-400">[{classroom.equipment.join(', ')}]</span>
                        )}
                      </div>
                      <button onClick={() => handleDeleteClassroom(classroom.id)} className="text-xs text-red-600 hover:text-red-800">Удалить</button>
                    </div>
                  ))}
                  {(!branch.classrooms || branch.classrooms.length === 0) && (
                    <p className="text-sm text-gray-500 italic">Нет аудиторий</p>
                  )}
                </div>

                {/* Add classroom */}
                {isAddingClassroom === branch.id ? (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="grid grid-cols-3 gap-3">
                      <input type="text" placeholder="Название аудитории" value={classroomForm.name} onChange={(e) => setClassroomForm({ ...classroomForm, name: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      <input type="number" placeholder="Вместимость" value={classroomForm.capacity} onChange={(e) => setClassroomForm({ ...classroomForm, capacity: parseInt(e.target.value) || 15 })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      <input type="text" placeholder="Оборудование (через запятую)" value={classroomForm.equipment} onChange={(e) => setClassroomForm({ ...classroomForm, equipment: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => handleAddClassroom(branch.id)} disabled={saving} className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg disabled:opacity-50">{saving ? '...' : 'Добавить'}</button>
                      <button onClick={() => setIsAddingClassroom(null)} className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-200 rounded-lg">Отмена</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setIsAddingClassroom(branch.id); setClassroomForm({ name: '', capacity: 15, equipment: '' }); }} className="text-sm text-blue-600 hover:text-blue-800">
                    + Добавить аудиторию
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
