'use client';

import { useState, useEffect, useMemo } from 'react';
import { useNotification } from '@/app/components/ui/NotificationProvider';
import { useLanguage } from '@/app/components/LanguageProvider';

interface Classroom {
  id: string;
  name: string;
}

interface Branch {
  id: string;
  name: string;
  classrooms: Classroom[];
}

interface Teacher {
  id: string;
  userId: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    middleName: string | null;
  };
}

interface GroupSubject {
  id: string;
  subjectId: string;
  subject: {
    id: string;
    name: string;
  };
}

interface Group {
  id: string;
  name: string;
  course: {
    id: string;
    title: string;
  } | null;
  subjects: GroupSubject[];
}

interface ScheduleSlot {
  id: string;
  branchId: string;
  classroomId: string;
  groupId: string | null;
  teacherId: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subject: string | null;
  color: string | null;
  notes: string | null;
  branch: { id: string; name: string };
  classroom: { id: string; name: string };
  teacher?: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
      middleName: string | null;
    };
  } | null;
  group?: {
    id: string;
    name: string;
    course: {
      title: string;
    };
  } | null;
}

interface ScheduleClientProps {
  branches: Branch[];
  initialSlots: ScheduleSlot[];
  userRole: string;
}

interface SlotFormData {
  branchId: string;
  classroomId: string;
  groupId: string;
  teacherId: string;
  subject: string;
  startTime: string;
  endTime: string;
  days: number[];
  color: string;
}

type ViewMode = 'week' | 'day' | 'teacher' | 'group';

const DAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const DAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
  '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'
];

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
];

export default function ScheduleClient({
  branches,
  initialSlots,
  userRole,
}: ScheduleClientProps) {
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedDay, setSelectedDay] = useState(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
  const [selectedBranch, setSelectedBranch] = useState(branches[0]?.id || '');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  // Data state
  const [slots, setSlots] = useState(initialSlots);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Filter state
  const [filterTeacher, setFilterTeacher] = useState<string>('');
  const [filterGroup, setFilterGroup] = useState<string>('');
  const [filterSubject, setFilterSubject] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Modal state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSlot, setEditingSlot] = useState<ScheduleSlot | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatsPanel, setShowStatsPanel] = useState(false);

  const [selectedCell, setSelectedCell] = useState<{
    day: number;
    time: string;
    classroomId: string;
  } | null>(null);

  const [formData, setFormData] = useState<SlotFormData>({
    branchId: '',
    classroomId: '',
    groupId: '',
    teacherId: '',
    subject: '',
    startTime: '',
    endTime: '',
    days: [],
    color: COLORS[0],
  });

  const { showToast, showConfirm } = useNotification();
  const { t } = useLanguage();

  // Load teachers and groups
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teachersRes, groupsRes] = await Promise.all([
          fetch('/api/teachers'),
          fetch('/api/groups'),
        ]);

        if (teachersRes.ok) {
          const teachersData = await teachersRes.json();
          setTeachers(teachersData);
        }

        if (groupsRes.ok) {
          const groupsData = await groupsRes.json();
          setGroups(groupsData);
        }
      } catch (error) {
        console.error('Error loading teachers and groups:', error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, []);

  const canManageSchedule = ['COORDINATOR', 'ADMIN', 'SUPERADMIN'].includes(userRole);
  const selectedBranchData = branches.find(b => b.id === selectedBranch);

  // Filtered slots
  const filteredSlots = useMemo(() => {
    return slots.filter(slot => {
      if (slot.branchId !== selectedBranch) return false;
      if (filterTeacher && slot.teacherId !== filterTeacher) return false;
      if (filterGroup && slot.groupId !== filterGroup) return false;
      if (filterSubject && slot.subject !== filterSubject) return false;
      return true;
    });
  }, [slots, selectedBranch, filterTeacher, filterGroup, filterSubject]);

  // Statistics
  const stats = useMemo(() => {
    const branchSlots = slots.filter(s => s.branchId === selectedBranch);
    const teacherHours: Record<string, number> = {};
    const subjectHours: Record<string, number> = {};
    const groupHours: Record<string, number> = {};

    branchSlots.forEach(slot => {
      const duration = (TIME_SLOTS.indexOf(slot.endTime) - TIME_SLOTS.indexOf(slot.startTime)) * 0.5;

      if (slot.teacherId && slot.teacher) {
        const teacherName = `${slot.teacher.user.lastName} ${slot.teacher.user.firstName[0]}.`;
        teacherHours[teacherName] = (teacherHours[teacherName] || 0) + duration;
      }

      if (slot.subject) {
        subjectHours[slot.subject] = (subjectHours[slot.subject] || 0) + duration;
      }

      if (slot.groupId && slot.group) {
        groupHours[slot.group.name] = (groupHours[slot.group.name] || 0) + duration;
      }
    });

    return {
      totalSlots: branchSlots.length,
      totalHours: Object.values(subjectHours).reduce((a, b) => a + b, 0),
      teacherHours: Object.entries(teacherHours).sort((a, b) => b[1] - a[1]),
      subjectHours: Object.entries(subjectHours).sort((a, b) => b[1] - a[1]),
      groupHours: Object.entries(groupHours).sort((a, b) => b[1] - a[1]),
    };
  }, [slots, selectedBranch]);

  // Unique subjects for filter
  const uniqueSubjects = useMemo(() => {
    const subjects = new Set<string>();
    slots.forEach(slot => {
      if (slot.subject) subjects.add(slot.subject);
    });
    return Array.from(subjects).sort();
  }, [slots]);

  const getSlotForCell = (day: number, time: string, classroomId: string) => {
    return filteredSlots.find(
      s => s.classroomId === classroomId && s.dayOfWeek === day && s.startTime === time
    );
  };

  const isTimeSlotOccupied = (day: number, time: string, classroomId: string) => {
    return filteredSlots.some(s => {
      if (s.classroomId !== classroomId || s.dayOfWeek !== day) return false;
      const slotStart = TIME_SLOTS.indexOf(s.startTime);
      const slotEnd = TIME_SLOTS.indexOf(s.endTime);
      const currentTime = TIME_SLOTS.indexOf(time);
      return currentTime > slotStart && currentTime < slotEnd;
    });
  };

  const getSlotDuration = (slot: ScheduleSlot) => {
    const startIndex = TIME_SLOTS.indexOf(slot.startTime);
    const endIndex = TIME_SLOTS.indexOf(slot.endTime);
    return endIndex - startIndex;
  };

  const handleCellClick = (day: number, time: string, classroomId: string) => {
    if (!canManageSchedule) return;

    const existingSlot = getSlotForCell(day, time, classroomId);
    if (existingSlot) {
      setEditingSlot(existingSlot);
      setShowEditModal(true);
    } else if (!isTimeSlotOccupied(day, time, classroomId)) {
      setSelectedCell({ day, time, classroomId });
      setFormData({
        branchId: selectedBranch,
        classroomId: classroomId,
        groupId: '',
        teacherId: '',
        subject: '',
        startTime: time,
        endTime: TIME_SLOTS[TIME_SLOTS.indexOf(time) + 2] || '21:00',
        days: [day],
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
      setShowCreateForm(true);
    }
  };

  const handleCreateSlot = async () => {
    if (!formData.branchId || !formData.classroomId || !formData.subject ||
        !formData.startTime || !formData.endTime || formData.days.length === 0) {
      showToast({ message: t('common.required'), type: 'warning' });
      return;
    }

    try {
      const newSlots = [];
      for (const day of formData.days) {
        const response = await fetch('/api/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            branchId: formData.branchId,
            classroomId: formData.classroomId,
            dayOfWeek: day,
            startTime: formData.startTime,
            endTime: formData.endTime,
            subject: formData.subject,
            teacherId: formData.teacherId || null,
            groupId: formData.groupId || null,
            color: formData.color,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          showToast({ message: error.error || t('common.error'), type: 'error' });
          return;
        }

        const newSlot = await response.json();
        newSlots.push(newSlot);
      }

      setSlots([...slots, ...newSlots]);
      setShowCreateForm(false);
      setSelectedCell(null);
      showToast({ message: t('schedule.createdSuccess', { count: newSlots.length }), type: 'success' });
    } catch (error) {
      console.error('Create slot error:', error);
      showToast({ message: t('common.error'), type: 'error' });
    }
  };

  const handleDeleteSlot = async () => {
    if (!editingSlot) return;

    const confirmed = await showConfirm({
      title: t('schedule.deleteLesson'),
      message: t('schedule.deleteLessonConfirm'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/schedule/${editingSlot.id}`, { method: 'DELETE' });
      if (!response.ok) {
        showToast({ message: t('common.error'), type: 'error' });
        return;
      }

      setSlots(slots.filter(s => s.id !== editingSlot.id));
      setShowEditModal(false);
      setEditingSlot(null);
      showToast({ message: t('schedule.deletedSuccess'), type: 'success' });
    } catch (error) {
      showToast({ message: t('common.error'), type: 'error' });
    }
  };

  const handleUpdateSlot = async () => {
    if (!editingSlot) return;

    try {
      const response = await fetch(`/api/schedule/${editingSlot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: editingSlot.subject,
          teacherId: editingSlot.teacherId || null,
          groupId: editingSlot.groupId || null,
          startTime: editingSlot.startTime,
          endTime: editingSlot.endTime,
          color: editingSlot.color,
        }),
      });

      if (!response.ok) {
        showToast({ message: t('common.error'), type: 'error' });
        return;
      }

      const updatedSlot = await response.json();
      setSlots(slots.map(s => s.id === updatedSlot.id ? updatedSlot : s));
      setShowEditModal(false);
      setEditingSlot(null);
      showToast({ message: t('schedule.updatedSuccess'), type: 'success' });
    } catch (error) {
      showToast({ message: t('common.error'), type: 'error' });
    }
  };

  const clearFilters = () => {
    setFilterTeacher('');
    setFilterGroup('');
    setFilterSubject('');
  };

  const hasActiveFilters = filterTeacher || filterGroup || filterSubject;

  // Render slot card
  const renderSlotCard = (slot: ScheduleSlot, compact = false) => (
    <div
      key={slot.id}
      onClick={() => {
        if (canManageSchedule) {
          setEditingSlot(slot);
          setShowEditModal(true);
        }
      }}
      className={`rounded-lg p-2 text-white ${canManageSchedule ? 'cursor-pointer hover:opacity-90' : ''} transition-all h-full flex flex-col`}
      style={{ backgroundColor: slot.color || '#3B82F6' }}
    >
      <div className={`font-semibold truncate ${compact ? 'text-[11px]' : 'text-sm'}`}>
        {slot.subject || 'Занятие'}
      </div>
      <div className={`flex flex-col gap-0.5 mt-0.5 ${compact ? 'text-[9px]' : 'text-[10px]'} opacity-90`}>
        <div className="flex items-center gap-1">
          <span>{slot.startTime}-{slot.endTime}</span>
        </div>
        {slot.teacher && (
          <div className="truncate">
            {slot.teacher.user.lastName} {slot.teacher.user.firstName[0]}.
          </div>
        )}
        {slot.group && (
          <div className="truncate font-medium">
            {slot.group.name}
          </div>
        )}
        {!compact && slot.classroom && (
          <div className="truncate opacity-75">
            {slot.classroom.name}
          </div>
        )}
      </div>
    </div>
  );

  if (!selectedBranchData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
        <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <p className="text-gray-600 dark:text-gray-400 font-medium">Филиалы не найдены</p>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Добавьте филиал в настройках</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Panel */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* View Mode Tabs */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {[
              { id: 'week', label: 'Неделя', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
              { id: 'day', label: 'День', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
              { id: 'teacher', label: 'Учитель', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
              { id: 'group', label: 'Группа', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id as ViewMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  viewMode === mode.id
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mode.icon} />
                </svg>
                <span className="hidden sm:inline">{mode.label}</span>
              </button>
            ))}
          </div>

          {/* Branch Selector */}
          <div className="flex items-center gap-2">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 text-gray-900 dark:text-white"
            >
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </div>

          {/* Day Selector (for day view) */}
          {viewMode === 'day' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedDay(prev => prev === 0 ? 6 : prev - 1)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg font-medium min-w-[140px] text-center">
                {DAYS[selectedDay]}
              </span>
              <button
                onClick={() => setSelectedDay(prev => prev === 6 ? 0 : prev + 1)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          {/* Teacher Selector (for teacher view) */}
          {viewMode === 'teacher' && (
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 text-gray-900 dark:text-white"
            >
              <option value="">Выберите учителя</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.user.lastName} {teacher.user.firstName}
                </option>
              ))}
            </select>
          )}

          {/* Group Selector (for group view) */}
          {viewMode === 'group' && (
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 text-gray-900 dark:text-white"
            >
              <option value="">Выберите группу</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Filter Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-all ${
                hasActiveFilters
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Фильтры
              {hasActiveFilters && (
                <span className="w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </button>

            {/* Stats Button */}
            <button
              onClick={() => setShowStatsPanel(!showStatsPanel)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-all ${
                showStatsPanel
                  ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300'
                  : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="hidden sm:inline">Статистика</span>
            </button>

            {/* Add Button */}
            {canManageSchedule && (
              <button
                onClick={() => {
                  setFormData({
                    branchId: selectedBranch,
                    classroomId: selectedBranchData?.classrooms[0]?.id || '',
                    groupId: '',
                    teacherId: '',
                    subject: '',
                    startTime: '09:00',
                    endTime: '10:00',
                    days: [],
                    color: COLORS[Math.floor(Math.random() * COLORS.length)],
                  });
                  setShowCreateForm(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Добавить
              </button>
            )}
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">Учитель:</label>
                <select
                  value={filterTeacher}
                  onChange={(e) => setFilterTeacher(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 text-gray-900 dark:text-white"
                >
                  <option value="">Все</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.user.lastName} {teacher.user.firstName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">Группа:</label>
                <select
                  value={filterGroup}
                  onChange={(e) => setFilterGroup(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 text-gray-900 dark:text-white"
                >
                  <option value="">Все</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">Предмет:</label>
                <select
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 text-gray-900 dark:text-white"
                >
                  <option value="">Все</option>
                  {uniqueSubjects.map((subject) => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                >
                  Сбросить
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Statistics Panel */}
      {showStatsPanel && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Статистика расписания</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Summary */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-4">
              <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">{stats.totalSlots}</div>
              <div className="text-sm text-blue-600 dark:text-blue-400">занятий в неделю</div>
              <div className="mt-2 text-2xl font-semibold text-blue-800 dark:text-blue-200">{stats.totalHours} ч</div>
              <div className="text-sm text-blue-600 dark:text-blue-400">общая нагрузка</div>
            </div>

            {/* By Teacher */}
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700 dark:text-gray-300">По учителям</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {stats.teacherHours.slice(0, 5).map(([name, hours]) => (
                  <div key={name} className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 truncate">{name}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{hours}ч</span>
                  </div>
                ))}
              </div>
            </div>

            {/* By Subject */}
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700 dark:text-gray-300">По предметам</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {stats.subjectHours.slice(0, 5).map(([name, hours]) => (
                  <div key={name} className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 truncate">{name}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{hours}ч</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Schedule Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Week View */}
        {viewMode === 'week' && (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700">
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase sticky left-0 bg-gray-50 dark:bg-gray-700 border-r border-gray-200 dark:border-gray-600 w-20">
                    Время
                  </th>
                  {DAYS.map((day, dayIndex) => (
                    <th
                      key={dayIndex}
                      colSpan={selectedBranchData.classrooms.length}
                      className={`px-2 py-3 text-center text-sm font-semibold border-r border-gray-200 dark:border-gray-600 ${
                        dayIndex === 5 || dayIndex === 6 ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300' : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {day}
                    </th>
                  ))}
                </tr>
                <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <th className="sticky left-0 bg-gray-50 dark:bg-gray-700 border-r border-gray-200 dark:border-gray-600"></th>
                  {DAYS.map((_, dayIndex) => (
                    selectedBranchData.classrooms.map((classroom) => (
                      <th
                        key={`${dayIndex}-${classroom.id}`}
                        className="px-1 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-r border-gray-100 dark:border-gray-600"
                        style={{ minWidth: '100px' }}
                      >
                        {classroom.name}
                      </th>
                    ))
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {TIME_SLOTS.slice(0, -1).map((time) => (
                  <tr key={time} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50">
                    <td className="px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 sticky left-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-600 text-center">
                      {time}
                    </td>
                    {DAYS.map((_, dayIndex) => (
                      selectedBranchData.classrooms.map((classroom) => {
                        const slot = getSlotForCell(dayIndex, time, classroom.id);
                        const isOccupied = isTimeSlotOccupied(dayIndex, time, classroom.id);

                        if (isOccupied && !slot) return null;

                        const rowSpan = slot ? getSlotDuration(slot) : 1;

                        return (
                          <td
                            key={`${dayIndex}-${classroom.id}`}
                            rowSpan={rowSpan}
                            onClick={() => handleCellClick(dayIndex, time, classroom.id)}
                            className={`px-0.5 py-0.5 border-r border-gray-100 dark:border-gray-700 align-top ${
                              canManageSchedule && !isOccupied ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20' : ''
                            } ${dayIndex === 5 || dayIndex === 6 ? 'bg-orange-50/30 dark:bg-orange-900/10' : ''}`}
                            style={{ height: slot ? `${rowSpan * 32}px` : '32px' }}
                          >
                            {slot && renderSlotCard(slot, true)}
                          </td>
                        );
                      })
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Day View */}
        {viewMode === 'day' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {selectedBranchData.classrooms.map((classroom) => (
                <div key={classroom.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 border-b border-gray-200 dark:border-gray-600">
                    <h4 className="font-medium text-gray-900 dark:text-white">{classroom.name}</h4>
                  </div>
                  <div className="p-2 space-y-2 min-h-[200px]">
                    {filteredSlots
                      .filter(s => s.dayOfWeek === selectedDay && s.classroomId === classroom.id)
                      .sort((a, b) => TIME_SLOTS.indexOf(a.startTime) - TIME_SLOTS.indexOf(b.startTime))
                      .map(slot => renderSlotCard(slot))}
                    {filteredSlots.filter(s => s.dayOfWeek === selectedDay && s.classroomId === classroom.id).length === 0 && (
                      <div className="flex items-center justify-center h-32 text-gray-400 dark:text-gray-500 text-sm">
                        Нет занятий
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Teacher View */}
        {viewMode === 'teacher' && (
          <div className="p-6">
            {!selectedTeacherId ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                Выберите учителя для просмотра расписания
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {DAYS.map((day, dayIndex) => (
                  <div key={dayIndex} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <div className={`px-3 py-2 text-center border-b border-gray-200 dark:border-gray-600 ${dayIndex >= 5 ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-gray-50 dark:bg-gray-700'}`}>
                      <span className="font-medium text-gray-900 dark:text-white">{DAYS_SHORT[dayIndex]}</span>
                    </div>
                    <div className="p-2 space-y-2 min-h-[300px]">
                      {filteredSlots
                        .filter(s => s.dayOfWeek === dayIndex && s.teacherId === selectedTeacherId)
                        .sort((a, b) => TIME_SLOTS.indexOf(a.startTime) - TIME_SLOTS.indexOf(b.startTime))
                        .map(slot => renderSlotCard(slot))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Group View */}
        {viewMode === 'group' && (
          <div className="p-6">
            {!selectedGroupId ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                Выберите группу для просмотра расписания
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {DAYS.map((day, dayIndex) => (
                  <div key={dayIndex} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <div className={`px-3 py-2 text-center border-b border-gray-200 dark:border-gray-600 ${dayIndex >= 5 ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-gray-50 dark:bg-gray-700'}`}>
                      <span className="font-medium text-gray-900 dark:text-white">{DAYS_SHORT[dayIndex]}</span>
                    </div>
                    <div className="p-2 space-y-2 min-h-[300px]">
                      {filteredSlots
                        .filter(s => s.dayOfWeek === dayIndex && s.groupId === selectedGroupId)
                        .sort((a, b) => TIME_SLOTS.indexOf(a.startTime) - TIME_SLOTS.indexOf(b.startTime))
                        .map(slot => renderSlotCard(slot))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Tips */}
      {canManageSchedule && viewMode === 'week' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Подсказка:</strong> Нажмите на пустую ячейку чтобы добавить занятие, или на существующее занятие чтобы редактировать его.
          </div>
        </div>
      )}

      {/* Create Slot Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Добавить занятие</h3>
              <button
                onClick={() => { setShowCreateForm(false); setSelectedCell(null); }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Color & Subject */}
              <div className="grid grid-cols-[auto,1fr] gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Цвет</label>
                  <div className="flex gap-2">
                    {COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-8 h-8 rounded-lg transition-all ${formData.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Предмет <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Например: Математика"
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Teacher & Group */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Учитель</label>
                  <select
                    value={formData.teacherId}
                    onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white"
                  >
                    <option value="">Выберите учителя</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.user.lastName} {t.user.firstName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Группа</label>
                  <select
                    value={formData.groupId}
                    onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white"
                  >
                    <option value="">Выберите группу</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Branch & Classroom */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Филиал <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value, classroomId: '' })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Кабинет <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.classroomId}
                    onChange={(e) => setFormData({ ...formData, classroomId: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white"
                  >
                    <option value="">Выберите кабинет</option>
                    {branches.find(b => b.id === formData.branchId)?.classrooms.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Начало <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white"
                  >
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Окончание <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white"
                  >
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Days */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Дни недели <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((day, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        if (formData.days.includes(index)) {
                          setFormData({ ...formData, days: formData.days.filter(d => d !== index) });
                        } else {
                          setFormData({ ...formData, days: [...formData.days, index] });
                        }
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        formData.days.includes(index)
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {DAYS_SHORT[index]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => { setShowCreateForm(false); setSelectedCell(null); }}
                className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Отмена
              </button>
              <button
                onClick={handleCreateSlot}
                className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 shadow-sm transition"
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Slot Modal */}
      {showEditModal && editingSlot && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Редактировать</h3>
              <button
                onClick={() => { setShowEditModal(false); setEditingSlot(null); }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Цвет</label>
                <div className="flex gap-2">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setEditingSlot({ ...editingSlot, color })}
                      className={`w-8 h-8 rounded-lg transition-all ${editingSlot.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Предмет</label>
                <input
                  type="text"
                  value={editingSlot.subject || ''}
                  onChange={(e) => setEditingSlot({ ...editingSlot, subject: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              {/* Teacher */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Учитель</label>
                <select
                  value={editingSlot.teacherId || ''}
                  onChange={(e) => setEditingSlot({ ...editingSlot, teacherId: e.target.value || null })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="">Не выбран</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.user.lastName} {t.user.firstName}</option>
                  ))}
                </select>
              </div>

              {/* Group */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Группа</label>
                <select
                  value={editingSlot.groupId || ''}
                  onChange={(e) => setEditingSlot({ ...editingSlot, groupId: e.target.value || null })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="">Не выбрана</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              {/* Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Начало</label>
                  <select
                    value={editingSlot.startTime}
                    onChange={(e) => setEditingSlot({ ...editingSlot, startTime: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Окончание</label>
                  <select
                    value={editingSlot.endTime}
                    onChange={(e) => setEditingSlot({ ...editingSlot, endTime: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Info */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-sm text-gray-600 dark:text-gray-300">
                <div><strong>День:</strong> {DAYS[editingSlot.dayOfWeek]}</div>
                <div><strong>Кабинет:</strong> {editingSlot.classroom.name}</div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between">
              <button
                onClick={handleDeleteSlot}
                className="px-5 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition"
              >
                Удалить
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowEditModal(false); setEditingSlot(null); }}
                  className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Отмена
                </button>
                <button
                  onClick={handleUpdateSlot}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
