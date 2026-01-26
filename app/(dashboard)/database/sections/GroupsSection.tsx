'use client';

import { useState, useEffect } from 'react';
import { useNotification } from '@/app/components/ui/NotificationProvider';

interface RefOption {
  id: string;
  name: string;
  code?: string;
  symbol?: string;
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
  };
}

interface Teacher {
  id: string;
  user: { firstName: string; lastName: string };
}

interface Group {
  id: string;
  name: string;
  gradeLevel: RefOption | null;
  language: RefOption | null;
  studyDirection: RefOption | null;
  groupIndex: RefOption | null;
  branch: { id: string; name: string } | null;
  teacher: Teacher | null;
  studyFormat: string | null;
  timeOfDay: string | null;
  maxStudents: number;
  isActive: boolean;
  subjects: GroupSubject[];
  students: GroupStudent[];
}

interface Student {
  id: string;
  user: { firstName: string; lastName: string };
  gradeLevel: { name: string; code: string } | null;
  language: { name: string; code: string } | null;
  studyDirection: { name: string; code: string } | null;
}

export default function GroupsSection() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showToast, showConfirm } = useNotification();

  // Reference data
  const [gradeLevels, setGradeLevels] = useState<RefOption[]>([]);
  const [languages, setLanguages] = useState<RefOption[]>([]);
  const [studyDirections, setStudyDirections] = useState<RefOption[]>([]);
  const [groupIndexes, setGroupIndexes] = useState<RefOption[]>([]);
  const [branches, setBranches] = useState<RefOption[]>([]);
  const [subjects, setSubjects] = useState<RefOption[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);

  // Form data
  const [formData, setFormData] = useState({
    gradeLevelId: '',
    languageId: '',
    studyDirectionId: '',
    groupIndexId: '',
    branchId: '',
    teacherId: '',
    studyFormat: '',
    timeOfDay: '',
    maxStudents: 15,
  });

  // Add subject form
  const [addingSubjectToGroup, setAddingSubjectToGroup] = useState<string | null>(null);
  const [subjectForm, setSubjectForm] = useState({ subjectId: '', hoursPerWeek: 1 });

  // Add student form
  const [addingStudentToGroup, setAddingStudentToGroup] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [
        groupsRes,
        gradeLevelsRes,
        languagesRes,
        directionsRes,
        indexesRes,
        branchesRes,
        subjectsRes,
        teachersRes,
        studentsRes,
      ] = await Promise.all([
        fetch('/api/database/groups'),
        fetch('/api/database/grade-levels'),
        fetch('/api/database/languages'),
        fetch('/api/database/study-directions'),
        fetch('/api/database/group-indexes'),
        fetch('/api/database/branches'),
        fetch('/api/database/subjects'),
        fetch('/api/teachers'),
        fetch('/api/students'),
      ]);

      if (groupsRes.ok) setGroups(await groupsRes.json());
      if (gradeLevelsRes.ok) setGradeLevels(await gradeLevelsRes.json());
      if (languagesRes.ok) setLanguages(await languagesRes.json());
      if (directionsRes.ok) setStudyDirections(await directionsRes.json());
      if (indexesRes.ok) setGroupIndexes(await indexesRes.json());
      if (branchesRes.ok) setBranches(await branchesRes.json());
      if (subjectsRes.ok) setSubjects(await subjectsRes.json());
      if (teachersRes.ok) setTeachers(await teachersRes.json());
      if (studentsRes.ok) setAvailableStudents(await studentsRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGroup = async () => {
    if (!formData.gradeLevelId || !formData.languageId || !formData.groupIndexId) {
      showToast({ message: 'Выберите класс, язык и индекс группы', type: 'warning' });
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
        await fetchData();
        setFormData({
          gradeLevelId: '',
          languageId: '',
          studyDirectionId: '',
          groupIndexId: '',
          branchId: '',
          teacherId: '',
          studyFormat: '',
          timeOfDay: '',
          maxStudents: 15,
        });
        setIsAdding(false);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Удалить группу',
      message: 'Вы уверены, что хотите удалить группу?',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await fetch(`/api/database/groups/${id}`, { method: 'DELETE' });
      showToast({ message: 'Группа удалена', type: 'success' });
      await fetchData();
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
      await fetchData();
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
        await fetchData();
        setSubjectForm({ subjectId: '', hoursPerWeek: 1 });
        setAddingSubjectToGroup(null);
        showToast({ message: 'Предмет добавлен', type: 'success' });
      } else {
        const errorData = await response.json();
        showToast({ message: errorData.error || 'Ошибка при добавлении', type: 'error' });
      }
    } catch (error) {
      console.error('Error:', error);
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
      await fetchData();
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
        await fetchData();
        setSelectedStudentId('');
        setAddingStudentToGroup(null);
      } else {
        const errorData = await response.json();
        showToast({ message: errorData.error || 'Ошибка при добавлении', type: 'error' });
      }
    } catch (error) {
      console.error('Error:', error);
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
      await fetchData();
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

  // Filter students that match group parameters
  const getMatchingStudents = (group: Group) => {
    const groupStudentIds = group.students.map((gs) => gs.studentId);
    return availableStudents.filter((student) => {
      if (groupStudentIds.includes(student.id)) return false;
      // Optionally filter by matching parameters
      return true;
    });
  };

  if (loading) return <div className="text-center py-8 text-gray-500">Загрузка...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Группы</h2>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Создать группу
          </button>
        )}
      </div>

      {/* Add Group Form */}
      {isAdding && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Новая группа</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Класс *</label>
              <select
                value={formData.gradeLevelId}
                onChange={(e) => setFormData({ ...formData, gradeLevelId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Выберите класс</option>
                {gradeLevels.map((gl) => (
                  <option key={gl.id} value={gl.id}>{gl.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Язык *</label>
              <select
                value={formData.languageId}
                onChange={(e) => setFormData({ ...formData, languageId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Выберите язык</option>
                {languages.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Направление</label>
              <select
                value={formData.studyDirectionId}
                onChange={(e) => setFormData({ ...formData, studyDirectionId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Выберите направление</option>
                {studyDirections.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Индекс группы *</label>
              <select
                value={formData.groupIndexId}
                onChange={(e) => setFormData({ ...formData, groupIndexId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Выберите индекс</option>
                {groupIndexes.map((gi) => (
                  <option key={gi.id} value={gi.id}>{gi.name} ({gi.symbol})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Время занятий</label>
              <select
                value={formData.timeOfDay}
                onChange={(e) => setFormData({ ...formData, timeOfDay: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Выберите время</option>
                <option value="MORNING">Утро (M)</option>
                <option value="AFTERNOON">Обед (A)</option>
                <option value="EVENING">Вечер (E)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Формат обучения</label>
              <select
                value={formData.studyFormat}
                onChange={(e) => setFormData({ ...formData, studyFormat: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Выберите формат</option>
                <option value="ONLINE_GROUP">Онлайн (группа)</option>
                <option value="ONLINE_INDIVIDUAL">Онлайн (индивидуально)</option>
                <option value="OFFLINE_GROUP">Очно (группа)</option>
                <option value="OFFLINE_INDIVIDUAL">Очно (индивидуально)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Филиал</label>
              <select
                value={formData.branchId}
                onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Выберите филиал</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Преподаватель</label>
              <select
                value={formData.teacherId}
                onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Выберите преподавателя</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.user.lastName} {t.user.firstName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Макс. учеников</label>
              <input
                type="number"
                min="1"
                value={formData.maxStudents}
                onChange={(e) => setFormData({ ...formData, maxStudents: parseInt(e.target.value) || 15 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddGroup}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg disabled:opacity-50"
            >
              {saving ? 'Сохранение...' : 'Создать'}
            </button>
            <button
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Groups List */}
      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.id} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Header */}
            <div
              className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
              onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}
            >
              <div className="flex items-center gap-3">
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${expandedGroup === group.id ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <div>
                  <span className="font-bold text-gray-900 text-lg">{group.name}</span>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs text-gray-500">{group.gradeLevel?.name || '-'}</span>
                    <span className="text-xs text-gray-400">|</span>
                    <span className="text-xs text-gray-500">{group.language?.name || '-'}</span>
                    <span className="text-xs text-gray-400">|</span>
                    <span className="text-xs text-gray-500">{formatStudyFormat(group.studyFormat)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  {group.students.length}/{group.maxStudents} уч.
                </span>
                <span className="text-sm text-gray-600">
                  {getTotalHours(group)}/9 ч.
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleActive(group.id, group.isActive);
                  }}
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    group.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {group.isActive ? 'Активна' : 'Неактивна'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteGroup(group.id);
                  }}
                  className="text-sm text-red-600"
                >
                  Удалить
                </button>
              </div>
            </div>

            {/* Expanded Content */}
            {expandedGroup === group.id && (
              <div className="p-4 bg-white border-t border-gray-200">
                <div className="grid grid-cols-2 gap-6">
                  {/* Subjects */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      Предметы ({getTotalHours(group)}/9 часов в неделю)
                    </h4>
                    <div className="space-y-2 mb-3">
                      {group.subjects.map((gs) => (
                        <div key={gs.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            {gs.isScheduled && (
                              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            <span className="text-sm">{gs.subject.name}</span>
                            <span className="text-xs text-gray-500">({gs.hoursPerWeek} ч/нед)</span>
                          </div>
                          <button
                            onClick={() => handleRemoveSubject(group.id, gs.subjectId)}
                            className="text-xs text-red-600"
                          >
                            Убрать
                          </button>
                        </div>
                      ))}
                      {group.subjects.length === 0 && (
                        <p className="text-sm text-gray-500 italic">Нет предметов</p>
                      )}
                    </div>

                    {addingSubjectToGroup === group.id ? (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="flex gap-2 mb-2">
                          <select
                            value={subjectForm.subjectId}
                            onChange={(e) => setSubjectForm({ ...subjectForm, subjectId: e.target.value })}
                            className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
                          >
                            <option value="">Выберите предмет</option>
                            {subjects
                              .filter((s) => !group.subjects.find((gs) => gs.subjectId === s.id))
                              .map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                          </select>
                          <input
                            type="number"
                            min="1"
                            max={9 - getTotalHours(group)}
                            value={subjectForm.hoursPerWeek}
                            onChange={(e) => setSubjectForm({ ...subjectForm, hoursPerWeek: parseInt(e.target.value) || 1 })}
                            className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm"
                            placeholder="ч/нед"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAddSubject(group.id)}
                            disabled={saving}
                            className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded"
                          >
                            Добавить
                          </button>
                          <button
                            onClick={() => setAddingSubjectToGroup(null)}
                            className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      getTotalHours(group) < 9 && (
                        <button
                          onClick={() => {
                            setAddingSubjectToGroup(group.id);
                            setSubjectForm({ subjectId: '', hoursPerWeek: 1 });
                          }}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          + Добавить предмет
                        </button>
                      )
                    )}
                  </div>

                  {/* Students */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      Ученики ({group.students.length}/{group.maxStudents})
                    </h4>
                    <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                      {group.students.map((gs) => (
                        <div key={gs.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm">
                            {gs.student.user.lastName} {gs.student.user.firstName}
                          </span>
                          <button
                            onClick={() => handleRemoveStudent(group.id, gs.studentId)}
                            className="text-xs text-red-600"
                          >
                            Убрать
                          </button>
                        </div>
                      ))}
                      {group.students.length === 0 && (
                        <p className="text-sm text-gray-500 italic">Нет учеников</p>
                      )}
                    </div>

                    {addingStudentToGroup === group.id ? (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <select
                          value={selectedStudentId}
                          onChange={(e) => setSelectedStudentId(e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm mb-2"
                        >
                          <option value="">Выберите ученика</option>
                          {getMatchingStudents(group).map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.user.lastName} {s.user.firstName}
                              {s.gradeLevel && ` (${s.gradeLevel.name})`}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAddStudent(group.id)}
                            disabled={saving}
                            className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded"
                          >
                            Добавить
                          </button>
                          <button
                            onClick={() => setAddingStudentToGroup(null)}
                            className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      group.students.length < group.maxStudents && (
                        <button
                          onClick={() => {
                            setAddingStudentToGroup(group.id);
                            setSelectedStudentId('');
                          }}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          + Добавить ученика
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Group Info */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="grid grid-cols-4 gap-4 text-xs text-gray-500">
                    <div>
                      <span className="font-medium">Направление:</span> {group.studyDirection?.name || '-'}
                    </div>
                    <div>
                      <span className="font-medium">Филиал:</span> {group.branch?.name || '-'}
                    </div>
                    <div>
                      <span className="font-medium">Преподаватель:</span>{' '}
                      {group.teacher ? `${group.teacher.user.lastName} ${group.teacher.user.firstName}` : '-'}
                    </div>
                    <div>
                      <span className="font-medium">Время:</span> {formatTimeOfDay(group.timeOfDay)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {groups.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Нет групп. Нажмите &quot;Создать группу&quot; чтобы добавить первую группу.
          </div>
        )}
      </div>
    </div>
  );
}
