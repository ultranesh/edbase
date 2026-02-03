'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SpecialNeed {
  id: string;
  code: string;
  name: string;
  nameKz?: string | null;
  nameRu?: string | null;
  nameEn?: string | null;
  description: string | null;
  descriptionKz?: string | null;
  descriptionRu?: string | null;
  descriptionEn?: string | null;
  orderIndex: number;
  isActive: boolean;
}

interface SortableItemProps {
  item: SpecialNeed;
  codeWrapperWidth: number;
  onEdit: (item: SpecialNeed) => void;
  onDelete: (id: string) => void;
  onToggle: (item: SpecialNeed) => void;
}

function SortableItem({ item, codeWrapperWidth, onEdit, onDelete, onToggle }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div
            className="cursor-grab active:cursor-grabbing p-1 -m-1 shrink-0"
            {...attributes}
            {...listeners}
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </div>
          <div className="shrink-0" style={{ width: codeWrapperWidth }}>
            <span className="inline-flex px-2.5 py-1 items-center justify-center bg-blue-50 dark:bg-slate-800 border-2 border-blue-500 text-blue-600 dark:text-blue-400 font-semibold rounded-lg text-sm">
              {item.code || '—'}
            </span>
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
    </div>
  );
}

interface FormData {
  code: string;
  name: string;
  nameKz: string;
  nameRu: string;
  nameEn: string;
  description: string;
  descriptionKz: string;
  descriptionRu: string;
  descriptionEn: string;
  orderIndex: number;
  isActive: boolean;
}

interface ItemWithActionsProps {
  item: SpecialNeed;
  codeWrapperWidth: number;
  isEditing: boolean;
  formData: FormData;
  onEdit: (item: SpecialNeed) => void;
  onDelete: (id: string) => void;
  onToggle: (item: SpecialNeed) => void;
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
              required
            />
          </div>
          <div className="flex flex-col flex-1 gap-2 min-w-0">
            <div className="grid grid-cols-3 gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded shrink-0">KZ</span>
                <input
                  type="text"
                  value={formData.nameKz}
                  onChange={(e) => onFormChange({ ...formData, nameKz: e.target.value })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Атауы"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded shrink-0">RU</span>
                <input
                  type="text"
                  value={formData.nameRu}
                  onChange={(e) => onFormChange({ ...formData, nameRu: e.target.value })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Название"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded shrink-0">EN</span>
                <input
                  type="text"
                  value={formData.nameEn}
                  onChange={(e) => onFormChange({ ...formData, nameEn: e.target.value })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Name"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded shrink-0">KZ</span>
                <input
                  type="text"
                  value={formData.descriptionKz}
                  onChange={(e) => onFormChange({ ...formData, descriptionKz: e.target.value })}
                  className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                  placeholder="Сипаттама"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded shrink-0">RU</span>
                <input
                  type="text"
                  value={formData.descriptionRu}
                  onChange={(e) => onFormChange({ ...formData, descriptionRu: e.target.value })}
                  className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                  placeholder="Описание"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded shrink-0">EN</span>
                <input
                  type="text"
                  value={formData.descriptionEn}
                  onChange={(e) => onFormChange({ ...formData, descriptionEn: e.target.value })}
                  className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                  placeholder="Description"
                />
              </div>
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
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="shrink-0" style={{ width: codeWrapperWidth }}>
          <span className="inline-flex px-2.5 py-1 items-center justify-center bg-blue-50 dark:bg-slate-800 border-2 border-blue-500 text-blue-600 dark:text-blue-400 font-semibold rounded-lg text-sm">
            {item.code || '—'}
          </span>
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

export default function SpecialNeedsSection() {
  const [items, setItems] = useState<SpecialNeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({ code: '', name: '', nameKz: '', nameRu: '', nameEn: '', description: '', descriptionKz: '', descriptionRu: '', descriptionEn: '', orderIndex: 0, isActive: true });
  const [isAdding, setIsAdding] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const codeWrapperWidth = useMemo(() => {
    if (items.length === 0) return 80;
    const maxLength = Math.max(...items.map(item => (item.code || '').length));
    return Math.max(80, maxLength * 9 + 40);
  }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/database/special-needs');
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (error) {
      console.error('Error fetching special needs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSend = {
      code: formData.code.trim() || null,
      name: formData.name.trim() || formData.nameRu.trim() || formData.nameKz.trim(),
      nameKz: formData.nameKz.trim() || null,
      nameRu: formData.nameRu.trim() || null,
      nameEn: formData.nameEn.trim() || null,
      description: formData.description.trim() || null,
      descriptionKz: formData.descriptionKz.trim() || null,
      descriptionRu: formData.descriptionRu.trim() || null,
      descriptionEn: formData.descriptionEn.trim() || null,
      orderIndex: formData.orderIndex,
      isActive: formData.isActive,
    };
    try {
      if (editingId) {
        setItems(prev => prev.map(item =>
          item.id === editingId ? { ...item, ...dataToSend } as SpecialNeed : item
        ));
        setEditingId(null);
        setFormData({ code: '', name: '', nameKz: '', nameRu: '', nameEn: '', description: '', descriptionKz: '', descriptionRu: '', descriptionEn: '', orderIndex: 0, isActive: true });

        const res = await fetch(`/api/database/special-needs/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend),
        });
        if (!res.ok) {
          fetchItems();
          alert('Ошибка сохранения');
        }
      } else {
        const res = await fetch('/api/database/special-needs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend),
        });
        if (res.ok) {
          const newItem = await res.json();
          setItems(prev => [...prev, newItem].sort((a, b) => a.orderIndex - b.orderIndex));
          setIsAdding(false);
          setFormData({ code: '', name: '', nameKz: '', nameRu: '', nameEn: '', description: '', descriptionKz: '', descriptionRu: '', descriptionEn: '', orderIndex: 0, isActive: true });
        }
      }
    } catch (error) {
      console.error('Error saving special need:', error);
      fetchItems();
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);

      setSavingOrder(true);
      try {
        const updates = newItems.map((item, index) => ({
          id: item.id,
          orderIndex: index,
        }));
        await fetch('/api/database/special-needs/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: updates }),
        });
      } catch (error) {
        console.error('Error saving order:', error);
        fetchItems();
      } finally {
        setSavingOrder(false);
      }
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
      const res = await fetch(`/api/database/special-needs/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) {
        setItems(previousItems);
      }
    } catch (error) {
      console.error('Error deleting special need:', error);
      setItems(previousItems);
    }
  };

  const handleToggle = async (item: SpecialNeed) => {
    const newIsActive = !item.isActive;
    setItems(prev => prev.map(i =>
      i.id === item.id ? { ...i, isActive: newIsActive } : i
    ));

    try {
      const res = await fetch(`/api/database/special-needs/${item.id}`, {
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

  const startEdit = (item: SpecialNeed) => {
    setEditingId(item.id);
    setFormData({
      code: item.code,
      name: item.name,
      nameKz: item.nameKz || '',
      nameRu: item.nameRu || '',
      nameEn: item.nameEn || '',
      description: item.description || '',
      descriptionKz: item.descriptionKz || '',
      descriptionRu: item.descriptionRu || '',
      descriptionEn: item.descriptionEn || '',
      orderIndex: item.orderIndex,
      isActive: item.isActive
    });
    setIsAdding(false);
    setIsReorderMode(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({ code: '', name: '', nameKz: '', nameRu: '', nameEn: '', description: '', descriptionKz: '', descriptionRu: '', descriptionEn: '', orderIndex: 0, isActive: true });
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Загрузка...</div>;
  }

  return (
    <>
      {!isAdding && (
        <div className="flex justify-end items-center gap-2 absolute top-0 right-0">
          <button
            onClick={() => setIsReorderMode(!isReorderMode)}
            className={`p-2.5 rounded-xl border transition-colors ${
              isReorderMode
                ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
            title={isReorderMode ? 'Выйти из режима сортировки' : 'Изменить порядок'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
          <button
            onClick={() => {
              setIsAdding(true);
              setIsReorderMode(false);
              setEditingId(null);
              const maxIndex = items.length > 0 ? Math.max(...items.map(i => i.orderIndex)) : -1;
              setFormData({ code: '', name: '', nameKz: '', nameRu: '', nameEn: '', description: '', descriptionKz: '', descriptionRu: '', descriptionEn: '', orderIndex: maxIndex + 1, isActive: true });
            }}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            + Добавить особые потребности
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        {savingOrder && (
          <div className="text-sm text-blue-600 dark:text-blue-400">Сохранение...</div>
        )}

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
                  required
                />
              </div>
              <div className="flex flex-col flex-1 gap-2 min-w-0">
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded shrink-0">KZ</span>
                    <input
                      type="text"
                      value={formData.nameKz}
                      onChange={(e) => setFormData({ ...formData, nameKz: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder="Атауы"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded shrink-0">RU</span>
                    <input
                      type="text"
                      value={formData.nameRu}
                      onChange={(e) => setFormData({ ...formData, nameRu: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder="Название"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded shrink-0">EN</span>
                    <input
                      type="text"
                      value={formData.nameEn}
                      onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder="Name"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded shrink-0">KZ</span>
                    <input
                      type="text"
                      value={formData.descriptionKz}
                      onChange={(e) => setFormData({ ...formData, descriptionKz: e.target.value })}
                      className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                      placeholder="Сипаттама"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded shrink-0">RU</span>
                    <input
                      type="text"
                      value={formData.descriptionRu}
                      onChange={(e) => setFormData({ ...formData, descriptionRu: e.target.value })}
                      className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                      placeholder="Описание"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded shrink-0">EN</span>
                    <input
                      type="text"
                      value={formData.descriptionEn}
                      onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
                      className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                      placeholder="Description"
                    />
                  </div>
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
          ) : isReorderMode ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                {items.map((item) => (
                  <SortableItem
                    key={item.id}
                    item={item}
                    codeWrapperWidth={codeWrapperWidth}
                    onEdit={startEdit}
                    onDelete={handleDelete}
                    onToggle={handleToggle}
                  />
                ))}
              </SortableContext>
            </DndContext>
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
                Удалить особые потребности?
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
