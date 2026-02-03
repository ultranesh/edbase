'use client';

import { useState, useEffect, useRef } from 'react';
import { useNotification } from '@/app/components/ui/NotificationProvider';
import { useLanguage } from '@/app/components/LanguageProvider';

interface RefOption {
  id: string;
  name: string;
  code?: string;
  symbol?: string;
}

interface Branch {
  id: string;
  name: string;
  code?: string | null;
  nameEn?: string;
}

interface GroupSubject {
  id: string;
  subjectId: string;
  hoursPerWeek: number;
  totalHours: number;
  isScheduled: boolean;
  subject: { id: string; nameRu: string | null; nameKz: string | null };
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
  maxHoursPerWeek: number;
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
  maxHoursPerWeek: number;
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
  maxHoursPerWeek: 9,
};

interface Filters {
  gradeLevel: string[];
  language: string[];
  branch: string[];
  studyDirection: string[];
  studyFormat: string[];
  timeOfDay: string[];
}

const emptyFilters: Filters = {
  gradeLevel: [],
  language: [],
  branch: [],
  studyDirection: [],
  studyFormat: [],
  timeOfDay: [],
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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'low_capacity'>('all');
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [activeFilterCategory, setActiveFilterCategory] = useState<keyof Filters | null>(null);
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const { showToast, showConfirm } = useNotification();
  const { t } = useLanguage();

  // Close filter panel on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(event.target as Node)) {
        setShowFilterPanel(false);
        setActiveFilterCategory(null);
      }
    };

    if (showFilterPanel) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterPanel]);

  const toggleFilter = (category: keyof Filters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [category]: prev[category].includes(value)
        ? prev[category].filter(v => v !== value)
        : [...prev[category], value],
    }));
  };

  const resetFilters = () => {
    setFilters(emptyFilters);
  };

  const activeFilterCount = Object.values(filters).flat().length;

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

  // Filter function for search and status
  const filterGroups = (groupList: Group[]) => {
    return groupList.filter(group => {
      // Status filter
      const statusMatch =
        statusFilter === 'all' ? true :
        statusFilter === 'active' ? group.isActive :
        statusFilter === 'inactive' ? !group.isActive :
        statusFilter === 'low_capacity' ? group.students.length < group.maxStudents / 2 :
        true;

      if (!statusMatch) return false;

      // Advanced filters
      if (filters.gradeLevel.length > 0 && !filters.gradeLevel.includes(group.gradeLevel?.name || '')) {
        return false;
      }
      if (filters.language.length > 0 && !filters.language.includes(group.language?.name || '')) {
        return false;
      }
      if (filters.branch.length > 0 && !filters.branch.includes(group.branch?.name || '')) {
        return false;
      }
      if (filters.studyDirection.length > 0 && !filters.studyDirection.includes(group.studyDirection?.name || '')) {
        return false;
      }
      if (filters.studyFormat.length > 0 && !filters.studyFormat.includes(group.studyFormat || '')) {
        return false;
      }
      if (filters.timeOfDay.length > 0 && !filters.timeOfDay.includes(group.timeOfDay || '')) {
        return false;
      }

      // Search filter
      if (!searchQuery.trim()) return true;

      const query = searchQuery.toLowerCase().trim();
      const groupName = group.name.toLowerCase();
      const gradeLevel = (group.gradeLevel?.name || '').toLowerCase();
      const language = (group.language?.name || '').toLowerCase();
      const studyDirection = (group.studyDirection?.name || '').toLowerCase();
      const branch = (group.branch?.name || '').toLowerCase();
      const teacherName = group.teacher ? `${group.teacher.user.lastName} ${group.teacher.user.firstName}`.toLowerCase() : '';

      return groupName.includes(query) ||
        gradeLevel.includes(query) ||
        language.includes(query) ||
        studyDirection.includes(query) ||
        branch.includes(query) ||
        teacherName.includes(query);
    });
  };

  const filteredGroups = filterGroups(groups);

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
    // Филиал: код или первая буква на латинице
    const branchCode = branch ? (branch.code || transliterate(branch.name)) : '';
    // Время: M-утро, A-обед, E-вечер
    const timeCode = data.timeOfDay === 'MORNING' ? 'M' : data.timeOfDay === 'AFTERNOON' ? 'A' : data.timeOfDay === 'EVENING' ? 'E' : '?';
    // Индекс группы
    const indexName = groupIndex?.name || '???';
    // Суффикс для онлайн
    const formatSuffix = data.studyFormat?.includes('ONLINE') ? '-O' : '';

    return `${gradeCode}${langCode}${branchCode}${timeCode}-${indexName}${formatSuffix}`;
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
      showToast({ message: t('groups.fillRequired'), type: 'warning' });
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
        showToast({ message: t('groups.createdSuccess'), type: 'success' });
      } else {
        const errorData = await response.json();
        showToast({ message: errorData.error || t('groups.createError'), type: 'error' });
      }
    } catch (error) {
      console.error('Error:', error);
      showToast({ message: t('groups.createError'), type: 'error' });
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
      maxHoursPerWeek: group.maxHoursPerWeek || 9,
    });
    setExpandedGroup(group.id);
  };

  const handleUpdateGroup = async () => {
    if (!editingGroupId) return;
    if (!formData.gradeLevelId || !formData.languageId || !formData.groupIndexId || !formData.timeOfDay) {
      showToast({ message: t('groups.fillRequiredShort'), type: 'warning' });
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
        showToast({ message: t('groups.updatedSuccess'), type: 'success' });
      } else {
        const errorData = await response.json();
        showToast({ message: errorData.error || t('groups.updateError'), type: 'error' });
      }
    } catch (error) {
      console.error('Error:', error);
      showToast({ message: t('groups.updateError'), type: 'error' });
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
      title: t('groups.deleteTitle'),
      message: t('groups.deleteMessage'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await fetch(`/api/database/groups/${id}`, { method: 'DELETE' });
      showToast({ message: t('groups.deletedSuccess'), type: 'success' });
      await refreshGroups();
      if (expandedGroup === id) setExpandedGroup(null);
    } catch (error) {
      console.error('Error:', error);
      showToast({ message: t('groups.deleteError'), type: 'error' });
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
        showToast({ message: t('groups.subjectAdded'), type: 'success' });
      } else {
        const errorData = await response.json();
        showToast({ message: errorData.error || t('groups.subjectAddError'), type: 'error' });
      }
    } catch (error) {
      console.error('Error:', error);
      showToast({ message: t('groups.subjectAddError'), type: 'error' });
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
          showToast({ message: t('groups.warning', { message: result.warnings.join(', ') }), type: 'warning' });
        } else {
          showToast({ message: t('groups.studentAdded'), type: 'success' });
        }
        await refreshGroups();
        setSelectedStudentId('');
        setAddingStudentToGroup(null);
      } else {
        const errorData = await response.json();
        showToast({ message: errorData.error || t('groups.subjectAddError'), type: 'error' });
      }
    } catch (error) {
      console.error('Error:', error);
      showToast({ message: t('groups.subjectAddError'), type: 'error' });
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
      ONLINE_GROUP: t('groups.onlineGroup'),
      ONLINE_INDIVIDUAL: t('groups.onlineIndividual'),
      OFFLINE_GROUP: t('groups.offlineGroup'),
      OFFLINE_INDIVIDUAL: t('groups.offlineIndividual'),
    };
    return format ? formats[format] || format : '-';
  };

  const formatTimeOfDay = (time: string | null) => {
    const times: Record<string, string> = {
      MORNING: t('groups.morning'),
      AFTERNOON: t('groups.afternoon'),
      EVENING: t('groups.evening'),
    };
    return time ? times[time] || time : '-';
  };

  const getTotalHours = (group: Group) => {
    return group.subjects.reduce((sum, s) => sum + s.hoursPerWeek, 0);
  };

  // Check if a single student has mismatched parameters with group
  const isStudentMismatched = (group: Group, student: GroupStudent['student']) => {
    if (group.gradeLevelId && student.gradeLevel && student.gradeLevel.code !== group.gradeLevel?.code) {
      return true;
    }
    if (group.languageId && student.language && student.language.code !== group.language?.code) {
      return true;
    }
    if (group.studyDirectionId && student.studyDirection && student.studyDirection.code !== group.studyDirection?.code) {
      return true;
    }
    return false;
  };

  // Check if any student has mismatched parameters with group
  const hasMismatchedStudents = (group: Group) => {
    return group.students.some(gs => isStudentMismatched(group, gs.student));
  };

  // Filter students that can be added to group (not already in it)
  const getAvailableStudents = (group: Group) => {
    const groupStudentIds = group.students.map(gs => gs.student.id);
    return allStudents.filter(student => !groupStudentIds.includes(student.id));
  };

  const renderForm = (isEditing: boolean = false) => (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-800 dark:to-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
          {isEditing ? t('groups.editGroup') : t('groups.newGroup')}
        </h3>
        <div className="px-5 py-2.5 bg-slate-800 dark:bg-blue-600 text-white rounded-xl font-mono font-bold text-lg tracking-wide shadow-lg">
          {previewName}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
        {/* Класс */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
            {t('groups.gradeLevel')} <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              value={formData.gradeLevelId}
              onChange={(e) => setFormData({ ...formData, gradeLevelId: e.target.value })}
              className="w-full px-4 py-3 pr-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-gray-400 dark:hover:border-gray-500"
            >
              <option value="">{t('groups.selectGrade')}</option>
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
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
            {t('groups.language')} <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              value={formData.languageId}
              onChange={(e) => setFormData({ ...formData, languageId: e.target.value })}
              className="w-full px-4 py-3 pr-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-gray-400 dark:hover:border-gray-500"
            >
              <option value="">{t('groups.selectLanguage')}</option>
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
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
            {t('groups.studyDirection')}
          </label>
          <div className="relative">
            <select
              value={formData.studyDirectionId}
              onChange={(e) => setFormData({ ...formData, studyDirectionId: e.target.value })}
              className="w-full px-4 py-3 pr-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-gray-400 dark:hover:border-gray-500"
            >
              <option value="">{t('groups.selectDirection')}</option>
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
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
            {t('groups.groupIndex')} <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              value={formData.groupIndexId}
              onChange={(e) => setFormData({ ...formData, groupIndexId: e.target.value })}
              className="w-full px-4 py-3 pr-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-gray-400 dark:hover:border-gray-500"
            >
              <option value="">{t('groups.selectIndex')}</option>
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
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
            {t('groups.timeOfDay')} <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              value={formData.timeOfDay}
              onChange={(e) => setFormData({ ...formData, timeOfDay: e.target.value })}
              className="w-full px-4 py-3 pr-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-gray-400 dark:hover:border-gray-500"
            >
              <option value="">{t('groups.selectTime')}</option>
              <option value="MORNING">{t('groups.morning')} (M)</option>
              <option value="AFTERNOON">{t('groups.afternoon')} (A)</option>
              <option value="EVENING">{t('groups.evening')} (E)</option>
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
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
            {t('groups.studyFormat')}
          </label>
          <div className="relative">
            <select
              value={formData.studyFormat}
              onChange={(e) => setFormData({ ...formData, studyFormat: e.target.value })}
              className="w-full px-4 py-3 pr-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-gray-400 dark:hover:border-gray-500"
            >
              <option value="">{t('groups.selectFormat')}</option>
              <option value="ONLINE_GROUP">{t('groups.onlineGroup')}</option>
              <option value="ONLINE_INDIVIDUAL">{t('groups.onlineIndividual')}</option>
              <option value="OFFLINE_GROUP">{t('groups.offlineGroup')}</option>
              <option value="OFFLINE_INDIVIDUAL">{t('groups.offlineIndividual')}</option>
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
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
            Филиал
          </label>
          <div className="relative">
            <select
              value={formData.branchId}
              onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
              className="w-full px-4 py-3 pr-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-gray-400 dark:hover:border-gray-500"
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
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
            Макс. учеников
          </label>
          <input
            type="number"
            min="1"
            max="30"
            value={formData.maxStudents}
            onChange={(e) => setFormData({ ...formData, maxStudents: parseInt(e.target.value) || 6 })}
            className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Макс. часов в неделю */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
            Макс. часов/нед
          </label>
          <input
            type="number"
            min="1"
            max="20"
            value={formData.maxHoursPerWeek}
            onChange={(e) => setFormData({ ...formData, maxHoursPerWeek: parseInt(e.target.value) || 9 })}
            className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={isEditing ? handleCancelEdit : () => setShowCreateForm(false)}
          className="px-5 py-2.5 text-slate-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 text-sm font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-gray-600 transition-colors"
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
      {/* Header with filters */}
      {!showCreateForm && !editingGroupId && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Группы
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Всего: {groups.length}
                </p>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2">
              {[
                { key: 'all', label: 'Все' },
                { key: 'active', label: 'Активные' },
                { key: 'inactive', label: 'Неактивные' },
                { key: 'low_capacity', label: 'Неполные' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key as typeof statusFilter)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    statusFilter === tab.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search and filter bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по названию, классу, языку, филиалу, преподавателю..."
                className="block w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Filter button and panel */}
            <div className="relative" ref={filterPanelRef}>
              <button
                onClick={() => {
                  setShowFilterPanel(!showFilterPanel);
                  if (showFilterPanel) setActiveFilterCategory(null);
                }}
                className={`px-3 py-2.5 rounded-xl border transition-colors flex items-center gap-2 ${
                  showFilterPanel || activeFilterCount > 0
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                {activeFilterCount > 0 && (
                  <span className="text-xs font-medium bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Filter dropdown panel */}
              {showFilterPanel && (
                <div className="absolute right-0 top-full mt-2 flex items-start z-50">
                  {/* Options panel (left side) */}
                  {activeFilterCategory && (
                    <div className="w-64 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl mr-2 flex flex-col max-h-[480px]">
                      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {activeFilterCategory === 'gradeLevel' && 'Класс'}
                          {activeFilterCategory === 'language' && 'Язык'}
                          {activeFilterCategory === 'branch' && 'Филиал'}
                          {activeFilterCategory === 'studyDirection' && 'Направление'}
                          {activeFilterCategory === 'studyFormat' && 'Формат'}
                          {activeFilterCategory === 'timeOfDay' && 'Время'}
                        </span>
                        <button
                          onClick={() => setActiveFilterCategory(null)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="p-2 flex-1 overflow-y-auto space-y-1">
                        {activeFilterCategory === 'gradeLevel' && gradeLevels.map(option => (
                          <button
                            key={option.id}
                            onClick={() => toggleFilter('gradeLevel', option.name)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              filters.gradeLevel.includes(option.name)
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            {option.name}
                          </button>
                        ))}
                        {activeFilterCategory === 'language' && languages.map(option => (
                          <button
                            key={option.id}
                            onClick={() => toggleFilter('language', option.name)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              filters.language.includes(option.name)
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            {option.name}
                          </button>
                        ))}
                        {activeFilterCategory === 'branch' && branches.map(option => (
                          <button
                            key={option.id}
                            onClick={() => toggleFilter('branch', option.name)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              filters.branch.includes(option.name)
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            {option.name}
                          </button>
                        ))}
                        {activeFilterCategory === 'studyDirection' && studyDirections.map(option => (
                          <button
                            key={option.id}
                            onClick={() => toggleFilter('studyDirection', option.name)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              filters.studyDirection.includes(option.name)
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            {option.name}
                          </button>
                        ))}
                        {activeFilterCategory === 'studyFormat' && [
                          { value: 'ONLINE_GROUP', label: 'Онлайн (группа)' },
                          { value: 'ONLINE_INDIVIDUAL', label: 'Онлайн (инд.)' },
                          { value: 'OFFLINE_GROUP', label: 'Очно (группа)' },
                          { value: 'OFFLINE_INDIVIDUAL', label: 'Очно (инд.)' },
                        ].map(option => (
                          <button
                            key={option.value}
                            onClick={() => toggleFilter('studyFormat', option.value)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              filters.studyFormat.includes(option.value)
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                        {activeFilterCategory === 'timeOfDay' && [
                          { value: 'MORNING', label: 'Утро' },
                          { value: 'AFTERNOON', label: 'Обед' },
                          { value: 'EVENING', label: 'Вечер' },
                        ].map(option => (
                          <button
                            key={option.value}
                            onClick={() => toggleFilter('timeOfDay', option.value)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              filters.timeOfDay.includes(option.value)
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Categories panel (right side) */}
                  <div className="w-56 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">Фильтры</span>
                      {activeFilterCount > 0 && (
                        <button
                          onClick={resetFilters}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700"
                        >
                          Сбросить
                        </button>
                      )}
                    </div>
                    <div className="p-2 space-y-0.5">
                      {[
                        { key: 'gradeLevel' as const, label: 'Класс' },
                        { key: 'language' as const, label: 'Язык' },
                        { key: 'branch' as const, label: 'Филиал' },
                        { key: 'studyDirection' as const, label: 'Направление' },
                        { key: 'studyFormat' as const, label: 'Формат' },
                        { key: 'timeOfDay' as const, label: 'Время' },
                      ].map(item => (
                        <button
                          key={item.key}
                          onClick={() => setActiveFilterCategory(activeFilterCategory === item.key ? null : item.key)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                            activeFilterCategory === item.key
                              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <span className="text-sm">{item.label}</span>
                          <div className="flex items-center gap-2">
                            {filters[item.key].length > 0 && (
                              <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                                {filters[item.key].length}
                              </span>
                            )}
                            <svg className={`w-4 h-4 transition-transform ${activeFilterCategory === item.key ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {canManageGroups && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
              >
                + Создать группу
              </button>
            )}
          </div>
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && canManageGroups && renderForm(false)}

      {/* Groups List */}
      <div className="space-y-4">
        {filteredGroups.map(group => (
          <div key={group.id} className={`bg-white dark:bg-gray-800 rounded-2xl border ${expandedGroup === group.id ? 'border-blue-200 dark:border-blue-700 shadow-lg shadow-blue-500/10' : 'border-slate-200 dark:border-gray-700'} overflow-hidden transition-all`}>
            {/* Header */}
            <div
              className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-gray-700/50 transition-colors"
              onClick={() => {
                if (editingGroupId === group.id) return;
                setExpandedGroup(expandedGroup === group.id ? null : group.id);
              }}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${expandedGroup === group.id ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-slate-100 dark:bg-gray-700'}`}>
                  <svg
                    className={`w-5 h-5 text-slate-500 dark:text-gray-400 transition-transform ${expandedGroup === group.id ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-slate-800 dark:text-white font-mono tracking-wide">{group.name}</span>
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                      group.isActive ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-gray-700 text-slate-500 dark:text-gray-400'
                    }`}>
                      {group.isActive ? 'Активна' : 'Неактивна'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-sm text-slate-500 dark:text-gray-400">
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-gray-700 rounded-md">{group.gradeLevel?.name || '-'}</span>
                    <span className="text-slate-300 dark:text-gray-600">•</span>
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-gray-700 rounded-md">{group.language?.name || '-'}</span>
                    <span className="text-slate-300 dark:text-gray-600">•</span>
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-gray-700 rounded-md">{group.studyDirection?.name || 'Без направления'}</span>
                    <span className="text-slate-300 dark:text-gray-600">•</span>
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-gray-700 rounded-md">{formatStudyFormat(group.studyFormat)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-5">
                {/* Warning indicators */}
                <div className="flex items-center gap-2">
                  {/* Yellow triangle - low capacity */}
                  {group.students.length < group.maxStudents / 2 && (
                    <div className="relative group/tooltip">
                      <div className="w-7 h-7 flex items-center justify-center cursor-help">
                        <svg className="w-6 h-6 text-amber-500 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg whitespace-nowrap opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50">
                        Неполная группа: {group.students.length} из {group.maxStudents} учеников
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                      </div>
                    </div>
                  )}
                  {/* Red circle - mismatched students */}
                  {hasMismatchedStudents(group) && (
                    <div className="relative group/tooltip2">
                      <div className="w-7 h-7 flex items-center justify-center cursor-help">
                        <svg className="w-6 h-6 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg whitespace-nowrap opacity-0 invisible group-hover/tooltip2:opacity-100 group-hover/tooltip2:visible transition-all z-50">
                        Несоответствие параметров учеников
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-white">
                        {group.students.length}/{group.maxStudents}
                      </div>
                      <div className="text-xs text-slate-400 dark:text-gray-500">учеников</div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center">
                      <svg className="w-4 h-4 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-white">
                        {getTotalHours(group)}/{group.maxHoursPerWeek || 9}
                      </div>
                      <div className="text-xs text-slate-400 dark:text-gray-500">ч/нед</div>
                    </div>
                  </div>
                </div>
                {canManageGroups && (
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEditGroup(group); }}
                      className="p-2 text-slate-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                      title="Редактировать"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleActive(group.id, group.isActive); }}
                      className="p-2 text-slate-400 dark:text-gray-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
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
                      className="p-2 text-slate-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
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
              <div className="border-t border-slate-100 dark:border-gray-700">
                {/* Edit Form */}
                {editingGroupId === group.id ? (
                  <div className="p-6">
                    {renderForm(true)}
                  </div>
                ) : (
                  <div className="p-6 bg-gradient-to-br from-slate-50/50 to-white dark:from-gray-800/50 dark:to-gray-800">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Subjects Section */}
                      <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-5">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                              <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                              </svg>
                            </div>
                            <div>
                              <h4 className="font-semibold text-slate-800 dark:text-white">Предметы абонемента</h4>
                              <p className="text-xs text-slate-500 dark:text-gray-400">{getTotalHours(group)}/{group.maxHoursPerWeek || 9} часов в неделю</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 mb-4">
                          {group.subjects.map(gs => (
                            <div key={gs.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-gray-700 rounded-xl hover:bg-slate-100 dark:hover:bg-gray-600 transition-colors">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                    gs.isScheduled
                                      ? 'bg-emerald-500 border-emerald-500 text-white'
                                      : 'border-slate-300 dark:border-gray-500 bg-white dark:bg-gray-600'
                                  }`}
                                  title={gs.isScheduled ? 'Занятие размещено в расписании' : 'Занятие не размещено в расписании'}
                                >
                                  {gs.isScheduled && (
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                                <span className="font-medium text-slate-800 dark:text-white">{gs.subject.nameRu || gs.subject.nameKz}</span>
                                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-lg">
                                  {gs.hoursPerWeek} ч/нед
                                </span>
                              </div>
                              {canManageGroups && (
                                <button
                                  onClick={() => handleRemoveSubject(group.id, gs.subjectId)}
                                  className="text-slate-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          ))}
                          {group.subjects.length === 0 && (
                            <div className="text-sm text-slate-400 dark:text-gray-500 italic py-6 text-center bg-slate-50 dark:bg-gray-700 rounded-xl">
                              Предметы не добавлены
                            </div>
                          )}
                        </div>

                        {canManageGroups && getTotalHours(group) < (group.maxHoursPerWeek || 9) && (
                          addingSubjectToGroup === group.id ? (
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                              <div className="flex gap-3 mb-3">
                                <div className="relative flex-1">
                                  <select
                                    value={subjectForm.subjectId}
                                    onChange={(e) => setSubjectForm({ ...subjectForm, subjectId: e.target.value })}
                                    className="w-full px-3 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-gray-400 dark:hover:border-gray-500"
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
                                  max={(group.maxHoursPerWeek || 9) - getTotalHours(group)}
                                  value={subjectForm.hoursPerWeek}
                                  onChange={(e) => setSubjectForm({ ...subjectForm, hoursPerWeek: parseInt(e.target.value) || 1 })}
                                  className="w-20 px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 text-center focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
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
                                  className="px-4 py-2 bg-white dark:bg-gray-700 text-slate-600 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-gray-600 border border-slate-200 dark:border-gray-600"
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
                              className="w-full py-3 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium border-2 border-dashed border-blue-200 dark:border-blue-700 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                            >
                              + Добавить предмет
                            </button>
                          )
                        )}
                      </div>

                      {/* Students Section */}
                      <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-5">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                              </svg>
                            </div>
                            <div>
                              <h4 className="font-semibold text-slate-800 dark:text-white">Ученики</h4>
                              <p className="text-xs text-slate-500 dark:text-gray-400">{group.students.length}/{group.maxStudents} человек</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 mb-4">
                          {group.students.map(gs => (
                            <div key={gs.id} className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                              isStudentMismatched(group, gs.student)
                                ? 'bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/40'
                                : 'bg-slate-50 dark:bg-gray-700 hover:bg-slate-100 dark:hover:bg-gray-600'
                            }`}>
                              <div>
                                <div className={`font-medium ${isStudentMismatched(group, gs.student) ? 'text-red-800 dark:text-red-200' : 'text-slate-800 dark:text-white'}`}>
                                  {gs.student.user.lastName} {gs.student.user.firstName}
                                </div>
                                <div className={`text-xs mt-0.5 ${isStudentMismatched(group, gs.student) ? 'text-red-600 dark:text-red-300' : 'text-slate-500 dark:text-gray-400'}`}>
                                  {gs.student.gradeLevel?.name || '-'} • {gs.student.language?.name || '-'}
                                </div>
                              </div>
                              {canManageGroups && (
                                <button
                                  onClick={() => handleRemoveStudent(group.id, gs.student.id)}
                                  className="text-slate-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          ))}
                          {group.students.length === 0 && (
                            <div className="text-sm text-slate-400 dark:text-gray-500 italic py-6 text-center bg-slate-50 dark:bg-gray-700 rounded-xl">
                              Ученики не добавлены
                            </div>
                          )}
                        </div>

                        {canManageGroups && group.students.length < group.maxStudents && (
                          addingStudentToGroup === group.id ? (
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                              <div className="relative mb-3">
                                <select
                                  value={selectedStudentId}
                                  onChange={(e) => setSelectedStudentId(e.target.value)}
                                  className="w-full px-3 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-gray-400 dark:hover:border-gray-500"
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
                                  className="px-4 py-2 bg-white dark:bg-gray-700 text-slate-600 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-gray-600 border border-slate-200 dark:border-gray-600"
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
                              className="w-full py-3 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium border-2 border-dashed border-blue-200 dark:border-blue-700 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                            >
                              + Добавить ученика
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-slate-500 dark:text-gray-400 block mb-1">Филиал</span>
                          <span className="font-medium text-slate-800 dark:text-white">{group.branch?.name || 'Не указан'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-gray-400 block mb-1">Преподаватель</span>
                          <span className="font-medium text-slate-800 dark:text-white">
                            {group.teacher ? `${group.teacher.user.lastName} ${group.teacher.user.firstName}` : 'Не назначен'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-gray-400 block mb-1">Время занятий</span>
                          <span className="font-medium text-slate-800 dark:text-white">{formatTimeOfDay(group.timeOfDay)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-gray-400 block mb-1">Индекс</span>
                          <span className="font-medium text-slate-800 dark:text-white">{group.groupIndex?.name || '-'} ({group.groupIndex?.symbol || '-'})</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {filteredGroups.length === 0 && (
          <div className="text-center py-20 bg-gradient-to-br from-slate-50 to-white dark:from-gray-800 dark:to-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
              {groups.length === 0 ? 'Групп пока нет' : 'Групп не найдено'}
            </h3>
            <p className="text-slate-500 dark:text-gray-400 mb-6">
              {groups.length === 0
                ? 'Создайте первую группу для начала работы'
                : searchQuery
                  ? 'По вашему запросу ничего не найдено'
                  : 'Нет групп с выбранным фильтром'
              }
            </p>
            {canManageGroups && groups.length === 0 && (
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
