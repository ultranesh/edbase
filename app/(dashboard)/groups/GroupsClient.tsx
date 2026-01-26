'use client';

import { useState, useEffect } from 'react';
import { useNotification } from '@/app/components/ui/NotificationProvider';

interface RefOption {
  id: string;
  name: string;
  code?: string;
  symbol?: string;
}

interface Branch {
  id: string;
  name: string;
  nameEn?: string;
}

interface GroupSubject {
  id: string;
  subjectId: string;
  hoursPerWeek: number;
  totalHours: number;
  isScheduled: boolean;
  subject: { id: string; name: string };
}

interface GroupStudent {
  id: string;
  studentId: string;
  student: {
    id: string;
    user: { firstName: string; lastName: string };
    gradeLevel?: { name: string; code: string } | null;
    language?: { name: string; code: string } | null;
    studyDirection?: { name: string; code: string } | null;
  };
}

interface Teacher {
  id: string;
  user: { firstName: string; lastName: string };
}

interface Student {
  id: string;
  user: { firstName: string; lastName: string };
  gradeLevel: { id: string; name: string; code: string } | null;
  language: { id: string; name: string; code: string } | null;
  studyDirection: { id: string; name: string; code: string } | null;
  groupStudents: { groupId: string }[];
}

interface Group {
  id: string;
  name: string;
  gradeLevelId: string | null;
  languageId: string | null;
  studyDirectionId: string | null;
  groupIndexId: string | null;
  branchId: string | null;
  teacherId: string | null;
  gradeLevel: RefOption | null;
  language: RefOption | null;
  studyDirection: RefOption | null;
  groupIndex: RefOption | null;
  branch: Branch | null;
  teacher: Teacher | null;
  studyFormat: string | null;
  timeOfDay: string | null;
  maxStudents: number;
  isActive: boolean;
  subjects: GroupSubject[];
  students: GroupStudent[];
}

interface GroupsClientProps {
  initialGroups: Group[];
  gradeLevels: RefOption[];
  languages: RefOption[];
  studyDirections: RefOption[];
  groupIndexes: RefOption[];
  branches: Branch[];
  subjects: RefOption[];
  teachers: Teacher[];
  students: Student[];
  userRole: string;
}

type FormData = {
  gradeLevelId: string;
  languageId: string;
  studyDirectionId: string;
  groupIndexId: string;
  branchId: string;
  teacherId: string;
  studyFormat: string;
  timeOfDay: string;
  maxStudents: number;
};

const emptyFormData: FormData = {
  gradeLevelId: '',
  languageId: '',
  studyDirectionId: '',
  groupIndexId: '',
  branchId: '',
  teacherId: '',
  studyFormat: '',
  timeOfDay: '',
  maxStudents: 6,
};

// Транслитерация для первой буквы филиала
const transliterate = (text: string): string => {
  const map: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
    'ы': 'y', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    'ә': 'a', 'і': 'i', 'ң': 'n', 'ғ': 'g', 'ү': 'u', 'ұ': 'u', 'қ': 'q', 'ө': 'o', 'һ': 'h',
  };
  const firstChar = text.charAt(0).toLowerCase();
  return (map[firstChar] || firstChar).toUpperCase();
};

export default function GroupsClient({
  initialGroups,
  gradeLevels,
  languages,
  studyDirections,
  groupIndexes,
  branches,
  subjects,
  teachers,
  students: allStudents,
  userRole,
}: GroupsClientProps) {
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showToast, showConfirm } = useNotification();

  // Editing state
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  // Form data for new/edit group
  const [formData, setFormData] = useState<FormData>(emptyFormData);

  // Generated name preview
  const [previewName, setPreviewName] = useState('');

  // Subject form
  const [addingSubjectToGroup, setAddingSubjectToGroup] = useState<string | null>(null);
  const [subjectForm, setSubjectForm] = useState({ subjectId: '', hoursPerWeek: 1 });

  // Student form
  const [addingStudentToGroup, setAddingStudentToGroup] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const canManageGroups = ['COORDINATOR', 'ADMIN', 'SUPERADMIN', 'CURATOR'].includes(userRole);

  // Generate name preview based on form data
  const generateName = (data: FormData): string => {
    const gradeLevel = gradeLevels.find(g => g.id === data.gradeLevelId);
    const language = languages.find(l => l.id === data.languageId);
    const groupIndex = groupIndexes.find(gi => gi.id === data.groupIndexId);
    const branch = branches.find(b => b.id === data.branchId);

    // Класс: если выпускник (код A или 12), иначе цифра
    const gradeCode = gradeLevel?.code || '?';
    // Язык: Q-казахский, R-русский, E-английский
    const langCode = language?.code || '?';
    // Время: M-утро, A-обед, E-вечер
    const timeCode = data.timeOfDay === 'MORNING' ? 'M' : data.timeOfDay === 'AFTERNOON' ? 'A' : data.timeOfDay === 'EVENING' ? 'E' : '?';
    // Филиал: первая буква на латинице
    const branchCode = branch ? transliterate(branch.name) : '';
    // Индекс группы
    const indexName = groupIndex?.name || '???';
    // Суффикс для онлайн
    const formatSuffix = data.studyFormat?.includes('ONLINE') ? '-O' : '';

    return `${gradeCode}${langCode}${timeCode}${branchCode}-${indexName}${formatSuffix}`;
  };

  // Update preview name when form changes
  useEffect(() => {
    setPreviewName(generateName(formData));
  }, [formData, gradeLevels, languages, groupIndexes, branches]);

  const refreshGroups = async () => {
    try {
      const response = await fetch('/api/database/groups');
      if (response.ok) {
        setGroups(await response.json());
      }
    } catch (error) {
      console.error('Error refreshing groups:', error);
    }
  };

  const handleCreateGroup = async () => {
    if (!formData.gradeLevelId || !formData.languageId || !formData.groupIndexId || !formData.timeOfDay) {
      showToast({ message: 'Заполните обязательные поля: класс, язык, индекс группы и время занятий', type: 'warning' });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/database/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        await refreshGroups();
        setFormData(emptyFormData);
        setShowCreateForm(false);
        showToast({ message: 'Группа создана', type: 'success' });
      } else {
        const errorData = await response.json();
        showToast({ message: errorData.error || 'Ошибка при создании группы', type: 'error' });
      }
    } catch (error) {
      console.error('Error:', error);
      showToast({ message: 'Ошибка при создании группы', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleEditGroup = (group: Group) => {
    setEditingGroupId(group.id);
    setFormData({
      gradeLevelId: group.gradeLevelId || '',
      languageId: group.languageId || '',
      studyDirectionId: group.studyDirectionId || '',
      groupIndexId: group.groupIndexId || '',
      branchId: group.branchId || '',
      teacherId: group.teacherId || '',
      studyFormat: group.studyFormat || '',
      timeOfDay: group.timeOfDay || '',
      maxStudents: group.maxStudents,
    });
    setExpandedGroup(group.id);
  };

  const handleUpdateGroup = async () => {
    if (!editingGroupId) return;
    if (!formData.gradeLevelId || !formData.languageId || !formData.groupIndexId || !formData.timeOfDay) {
      showToast({ message: 'Заполните обязательные поля', type: 'warning' });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/database/groups/${editingGroupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        await refreshGroups();
        setEditingGroupId(null);
        setFormData(emptyFormData);
        showToast({ message: 'Группа обновлена', type: 'success' });
      } else {
        const errorData = await response.json();
        showToast({ message: errorData.error || 'Ошибка при обновлении группы', type: 'error' });
      }
    } catch (error) {
      console.error('Error:', error);
      showToast({ message: 'Ошибка при обновлении группы', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingGroupId(null);
    setFormData(emptyFormData);
  };

  const handleDeleteGroup = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Удалить группу',
      message: 'Удалить группу? Это действие нельзя отменить.',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await fetch(`/api/database/groups/${id}`, { method: 'DELETE' });
      showToast({ message: 'Группа удалена', type: 'success' });
      await refreshGroups();
      if (expandedGroup === id) setExpandedGroup(null);
    } catch (error) {
      console.error('Error:', error);
      showToast({ message: 'Ошибка при удалении', type: 'error' });
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/database/groups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });
      await refreshGroups();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleAddSubject = async (groupId: string) => {
    if (!subjectForm.subjectId) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/database/groups/${groupId}/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subjectForm),
      });
      if (response.ok) {
        await refreshGroups();
        setSubjectForm({ subjectId: '', hoursPerWeek: 1 });
        setAddingSubjectToGroup(null);
        showToast({ message: 'Предмет добавлен', type: 'success' });
      } else {
        const errorData = await response.json();
        showToast({ message: errorData.error || 'Ошибка при добавлении', type: 'error' });
      }
    } catch (error) {
      console.error('Error:', error);
      showToast({ message: 'Ошибка при добавлении', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSubject = async (groupId: string, subjectId: string) => {
    try {
      await fetch(`/api/database/groups/${groupId}/subjects`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId }),
      });
      await refreshGroups();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleAddStudent = async (groupId: string) => {
    if (!selectedStudentId) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/database/groups/${groupId}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: selectedStudentId }),
      });
      if (response.ok) {
        const result = await response.json();
        if (result.warnings?.length > 0) {
          showToast({ message: 'Внимание: ' + result.warnings.join(', '), type: 'warning' });
        } else {
          showToast({ message: 'Ученик добавлен', type: 'success' });
        }
        await refreshGroups();
        setSelectedStudentId('');
        setAddingStudentToGroup(null);
      } else {
        const errorData = await response.json();
        showToast({ message: errorData.error || 'Ошибка при добавлении', type: 'error' });
      }
    } catch (error) {
      console.error('Error:', error);
      showToast({ message: 'Ошибка при добавлении', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveStudent = async (groupId: string, studentId: string) => {
    try {
      await fetch(`/api/database/groups/${groupId}/students`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      });
      await refreshGroups();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const formatStudyFormat = (format: string | null) => {
    const formats: Record<string, string> = {
      ONLINE_GROUP: 'Онлайн (группа)',
      ONLINE_INDIVIDUAL: 'Онлайн (инд.)',
      OFFLINE_GROUP: 'Очно (группа)',
      OFFLINE_INDIVIDUAL: 'Очно (инд.)',
    };
    return format ? formats[format] || format : '-';
  };

  const formatTimeOfDay = (time: string | null) => {
    const times: Record<string, string> = {
      MORNING: 'Утро',
      AFTERNOON: 'Обед',
      EVENING: 'Вечер',
    };
    return time ? times[time] || time : '-';
  };

  const getTotalHours = (group: Group) => {
    return group.subjects.reduce((sum, s) => sum + s.hoursPerWeek, 0);
  };

  // Filter students that can be added to group (not already in it)
  const getAvailableStudents = (group: Group) => {
    const groupStudentIds = group.students.map(gs => gs.student.id);
    return allStudents.filter(student => !groupStudentIds.includes(student.id));
  };

  const renderForm = (isEditing: boolean = false) => (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-800">
          {isEditing ? 'Редактирование группы' : 'Новая группа'}
        </h3>
        <div className="px-5 py-2.5 bg-slate-800 text-white rounded-xl font-mono font-bold text-lg tracking-wide shadow-lg">
          {previewName}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
        {/* Класс */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Класс <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              value={formData.gradeLevelId}
              onChange={(e) => setFormData({ ...formData, gradeLevelId: e.target.value })}
              className="w-full px-4 py-3 pr-10 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-gray-400"
            >
              <option value="">Выберите класс</option>
              {gradeLevels.map(gl => (
                <option key={gl.id} value={gl.id}>{gl.name} ({gl.code})</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Язык */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Язык обучения <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              value={formData.languageId}
              onChange={(e) => setFormData({ ...formData, languageId: e.target.value })}
              className="w-full px-4 py-3 pr-10 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-gray-400"
            >
              <option value="">Выберите язык</option>
              {languages.map(l => (
                <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Цель обучения */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Цель обучения
          </label>
          <div className="relative">
            <select
              value={formData.studyDirectionId}
              onChange={(e) => setFormData({ ...formData, studyDirectionId: e.target.value })}
              className="w-full px-4 py-3 pr-10 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-gray-400"
            >
              <option value="">Выберите направление</option>
              {studyDirections.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Индекс группы */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Индекс группы <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              value={formData.groupIndexId}
              onChange={(e) => setFormData({ ...formData, groupIndexId: e.target.value })}
              className="w-full px-4 py-3 pr-10 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-gray-400"
            >
              <option value="">Выберите индекс</option>
              {groupIndexes.map(gi => (
                <option key={gi.id} value={gi.id}>{gi.name} ({gi.symbol})</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Время занятий */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Время занятий <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              value={formData.timeOfDay}
              onChange={(e) => setFormData({ ...formData, timeOfDay: e.target.value })}
              className="w-full px-4 py-3 pr-10 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-gray-400"
            >
              <option value="">Выберите время</option>
              <option value="MORNING">Утро (M)</option>
              <option value="AFTERNOON">Обед (A)</option>
              <option value="EVENING">Вечер (E)</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Формат обучения */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Формат обучения
          </label>
          <div className="relative">
            <select
              value={formData.studyFormat}
              onChange={(e) => setFormData({ ...formData, studyFormat: e.target.value })}
              className="w-full px-4 py-3 pr-10 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-gray-400"
            >
              <option value="">Выберите формат</option>
              <option value="ONLINE_GROUP">Онлайн (группа)</option>
              <option value="ONLINE_INDIVIDUAL">Онлайн (индивидуально)</option>
              <option value="OFFLINE_GROUP">Очно (группа)</option>
              <option value="OFFLINE_INDIVIDUAL">Очно (индивидуально)</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Филиал */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Филиал
          </label>
          <div className="relative">
            <select
              value={formData.branchId}
              onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
              className="w-full px-4 py-3 pr-10 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-gray-400"
            >
              <option value="">Выберите филиал</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Макс. учеников */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Макс. учеников
          </label>
          <input
            type="number"
            min="1"
            max="30"
            value={formData.maxStudents}
            onChange={(e) => setFormData({ ...formData, maxStudents: parseInt(e.target.value) || 6 })}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={isEditing ? handleCancelEdit : () => setShowCreateForm(false)}
          className="px-5 py-2.5 text-slate-600 bg-white border border-slate-200 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
        >
          Отмена
        </button>
        <button
          onClick={isEditing ? handleUpdateGroup : handleCreateGroup}
          disabled={saving}
          className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-lg shadow-blue-500/25"
        >
          {saving ? 'Сохранение...' : isEditing ? 'Сохранить изменения' : 'Создать группу'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      {canManageGroups && !showCreateForm && !editingGroupId && (
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-slate-500">
              Управление учебными группами. Название генерируется автоматически по формату: КлассЯзыкВремяФилиал-Индекс[-O]
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/25"
          >
            + Создать группу
          </button>
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && canManageGroups && renderForm(false)}

      {/* Groups List */}
      <div className="space-y-4">
        {groups.map(group => (
          <div key={group.id} className={`bg-white rounded-2xl border ${expandedGroup === group.id ? 'border-blue-200 shadow-lg shadow-blue-500/10' : 'border-slate-200'} overflow-hidden transition-all`}>
            {/* Header */}
            <div
              className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50/50 transition-colors"
              onClick={() => {
                if (editingGroupId === group.id) return;
                setExpandedGroup(expandedGroup === group.id ? null : group.id);
              }}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${expandedGroup === group.id ? 'bg-blue-100' : 'bg-slate-100'}`}>
                  <svg
                    className={`w-5 h-5 text-slate-500 transition-transform ${expandedGroup === group.id ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-slate-800 font-mono tracking-wide">{group.name}</span>
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                      group.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {group.isActive ? 'Активна' : 'Неактивна'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-sm text-slate-500">
                    <span className="px-2 py-0.5 bg-slate-100 rounded-md">{group.gradeLevel?.name || '-'}</span>
                    <span className="text-slate-300">•</span>
                    <span className="px-2 py-0.5 bg-slate-100 rounded-md">{group.language?.name || '-'}</span>
                    <span className="text-slate-300">•</span>
                    <span className="px-2 py-0.5 bg-slate-100 rounded-md">{group.studyDirection?.name || 'Без направления'}</span>
                    <span className="text-slate-300">•</span>
                    <span className="px-2 py-0.5 bg-slate-100 rounded-md">{formatStudyFormat(group.studyFormat)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-5">
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800">
                        {group.students.length}/{group.maxStudents}
                      </div>
                      <div className="text-xs text-slate-400">учеников</div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                      <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800">
                        {getTotalHours(group)}/9
                      </div>
                      <div className="text-xs text-slate-400">ч/нед</div>
                    </div>
                  </div>
                </div>
                {canManageGroups && (
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEditGroup(group); }}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Редактировать"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleActive(group.id, group.isActive); }}
                      className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title={group.isActive ? 'Деактивировать' : 'Активировать'}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {group.isActive ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        )}
                      </svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Удалить"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Expanded Content */}
            {expandedGroup === group.id && (
              <div className="border-t border-slate-100">
                {/* Edit Form */}
                {editingGroupId === group.id ? (
                  <div className="p-6">
                    {renderForm(true)}
                  </div>
                ) : (
                  <div className="p-6 bg-gradient-to-br from-slate-50/50 to-white">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Subjects Section */}
                      <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                              <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                              </svg>
                            </div>
                            <div>
                              <h4 className="font-semibold text-slate-800">Предметы абонемента</h4>
                              <p className="text-xs text-slate-500">{getTotalHours(group)}/9 часов в неделю</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 mb-4">
                          {group.subjects.map(gs => (
                            <div key={gs.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                    gs.isScheduled
                                      ? 'bg-emerald-500 border-emerald-500 text-white'
                                      : 'border-slate-300 bg-white'
                                  }`}
                                  title={gs.isScheduled ? 'Занятие размещено в расписании' : 'Занятие не размещено в расписании'}
                                >
                                  {gs.isScheduled && (
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                                <span className="font-medium text-slate-800">{gs.subject.name}</span>
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg">
                                  {gs.hoursPerWeek} ч/нед
                                </span>
                              </div>
                              {canManageGroups && (
                                <button
                                  onClick={() => handleRemoveSubject(group.id, gs.subjectId)}
                                  className="text-slate-400 hover:text-red-500 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          ))}
                          {group.subjects.length === 0 && (
                            <div className="text-sm text-slate-400 italic py-6 text-center bg-slate-50 rounded-xl">
                              Предметы не добавлены
                            </div>
                          )}
                        </div>

                        {canManageGroups && getTotalHours(group) < 9 && (
                          addingSubjectToGroup === group.id ? (
                            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                              <div className="flex gap-3 mb-3">
                                <div className="relative flex-1">
                                  <select
                                    value={subjectForm.subjectId}
                                    onChange={(e) => setSubjectForm({ ...subjectForm, subjectId: e.target.value })}
                                    className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-gray-400"
                                  >
                                    <option value="">Выберите предмет</option>
                                    {subjects
                                      .filter(s => !group.subjects.find(gs => gs.subjectId === s.id))
                                      .map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                      ))}
                                  </select>
                                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </div>
                                </div>
                                <input
                                  type="number"
                                  min="1"
                                  max={9 - getTotalHours(group)}
                                  value={subjectForm.hoursPerWeek}
                                  onChange={(e) => setSubjectForm({ ...subjectForm, hoursPerWeek: parseInt(e.target.value) || 1 })}
                                  className="w-20 px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                  placeholder="ч/нед"
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleAddSubject(group.id)}
                                  disabled={saving}
                                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                  Добавить
                                </button>
                                <button
                                  onClick={() => setAddingSubjectToGroup(null)}
                                  className="px-4 py-2 bg-white text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-100 border border-slate-200"
                                >
                                  Отмена
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setAddingSubjectToGroup(group.id);
                                setSubjectForm({ subjectId: '', hoursPerWeek: 1 });
                              }}
                              className="w-full py-3 text-blue-600 hover:text-blue-700 text-sm font-medium border-2 border-dashed border-blue-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all"
                            >
                              + Добавить предмет
                            </button>
                          )
                        )}
                      </div>

                      {/* Students Section */}
                      <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                              </svg>
                            </div>
                            <div>
                              <h4 className="font-semibold text-slate-800">Ученики</h4>
                              <p className="text-xs text-slate-500">{group.students.length}/{group.maxStudents} человек</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                          {group.students.map(gs => (
                            <div key={gs.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                              <div>
                                <div className="font-medium text-slate-800">
                                  {gs.student.user.lastName} {gs.student.user.firstName}
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5">
                                  {gs.student.gradeLevel?.name || '-'} • {gs.student.language?.name || '-'}
                                </div>
                              </div>
                              {canManageGroups && (
                                <button
                                  onClick={() => handleRemoveStudent(group.id, gs.student.id)}
                                  className="text-slate-400 hover:text-red-500 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          ))}
                          {group.students.length === 0 && (
                            <div className="text-sm text-slate-400 italic py-6 text-center bg-slate-50 rounded-xl">
                              Ученики не добавлены
                            </div>
                          )}
                        </div>

                        {canManageGroups && group.students.length < group.maxStudents && (
                          addingStudentToGroup === group.id ? (
                            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                              <div className="relative mb-3">
                                <select
                                  value={selectedStudentId}
                                  onChange={(e) => setSelectedStudentId(e.target.value)}
                                  className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-gray-400"
                                >
                                  <option value="">Выберите ученика</option>
                                  {getAvailableStudents(group).map(s => (
                                    <option key={s.id} value={s.id}>
                                      {s.user.lastName} {s.user.firstName}
                                      {s.gradeLevel && ` (${s.gradeLevel.name})`}
                                      {s.language && ` - ${s.language.code}`}
                                    </option>
                                  ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleAddStudent(group.id)}
                                  disabled={saving}
                                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                  Добавить
                                </button>
                                <button
                                  onClick={() => setAddingStudentToGroup(null)}
                                  className="px-4 py-2 bg-white text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-100 border border-slate-200"
                                >
                                  Отмена
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setAddingStudentToGroup(group.id);
                                setSelectedStudentId('');
                              }}
                              className="w-full py-3 text-blue-600 hover:text-blue-700 text-sm font-medium border-2 border-dashed border-blue-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all"
                            >
                              + Добавить ученика
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="mt-6 p-4 bg-white rounded-xl border border-slate-200">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-slate-500 block mb-1">Филиал</span>
                          <span className="font-medium text-slate-800">{group.branch?.name || 'Не указан'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block mb-1">Преподаватель</span>
                          <span className="font-medium text-slate-800">
                            {group.teacher ? `${group.teacher.user.lastName} ${group.teacher.user.firstName}` : 'Не назначен'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block mb-1">Время занятий</span>
                          <span className="font-medium text-slate-800">{formatTimeOfDay(group.timeOfDay)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block mb-1">Индекс</span>
                          <span className="font-medium text-slate-800">{group.groupIndex?.name || '-'} ({group.groupIndex?.symbol || '-'})</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {groups.length === 0 && (
          <div className="text-center py-20 bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-blue-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Групп пока нет</h3>
            <p className="text-slate-500 mb-6">Создайте первую группу для начала работы</p>
            {canManageGroups && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/25"
              >
                Создать первую группу
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
