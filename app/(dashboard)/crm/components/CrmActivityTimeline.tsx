'use client';

import { useState, useEffect, useCallback } from 'react';

interface Activity {
  id: string;
  type: 'NOTE' | 'TASK' | 'TASK_COMPLETED' | 'STAGE_CHANGED' | 'CALL' | 'MESSAGE' | 'SYSTEM';
  content: string | null;
  createdAt: string;
  createdBy?: { firstName: string; lastName: string } | null;
  note?: { id: string; content: string } | null;
  task?: {
    id: string;
    title: string;
    taskType: 'CALL' | 'MESSAGE' | 'MEETING';
    dueDate: string | null;
    isCompleted: boolean;
    completedAt: string | null;
    completedComment: string | null;
    assignee?: { firstName: string; lastName: string } | null;
  } | null;
}

interface CrmActivityTimelineProps {
  leadId: string;
  onMeetingChange?: (date: string) => void;
}

type InputTab = 'note' | 'task';
type TaskType = 'CALL' | 'MESSAGE' | 'MEETING';

export default function CrmActivityTimeline({ leadId, onMeetingChange }: CrmActivityTimelineProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputTab, setInputTab] = useState<InputTab>('note');
  const [noteContent, setNoteContent] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('CALL');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  // Complete task modal
  const [completingTask, setCompletingTask] = useState<Activity | null>(null);
  const [completeComment, setCompleteComment] = useState('');

  const fetchActivities = useCallback(async () => {
    try {
      const res = await fetch(`/api/crm/leads/${leadId}/activities`);
      if (res.ok) {
        const data = await res.json();
        setActivities(data);
      }
    } catch (err) {
      console.error('Failed to fetch activities:', err);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handleSaveNote = async () => {
    if (!noteContent.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/crm/leads/${leadId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'NOTE', content: noteContent }),
      });
      if (res.ok) {
        setNoteContent('');
        fetchActivities();
      }
    } catch (err) {
      console.error('Failed to save note:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTask = async () => {
    if (!taskTitle.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/crm/leads/${leadId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'TASK',
          taskTitle,
          taskType,
          dueDate: taskDueDate || null,
        }),
      });
      if (res.ok) {
        setTaskTitle('');
        setTaskDueDate('');
        fetchActivities();

        // If it's a meeting task, also update the lead's meetingAt
        if (taskType === 'MEETING' && taskDueDate && onMeetingChange) {
          onMeetingChange(taskDueDate);
        }
      }
    } catch (err) {
      console.error('Failed to save task:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteTask = async () => {
    if (!completingTask?.task) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/crm/tasks/${completingTask.task.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: completeComment }),
      });
      if (res.ok) {
        setCompletingTask(null);
        setCompleteComment('');
        fetchActivities();
      }
    } catch (err) {
      console.error('Failed to complete task:', err);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatShortDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'NOTE':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        );
      case 'TASK':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
      case 'TASK_COMPLETED':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'CALL':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'NOTE': return 'bg-blue-500';
      case 'TASK': return 'bg-yellow-500';
      case 'TASK_COMPLETED': return 'bg-green-500';
      case 'CALL': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getTaskTypeLabel = (type: TaskType) => {
    switch (type) {
      case 'CALL': return 'Связаться';
      case 'MESSAGE': return 'Написать';
      case 'MEETING': return 'Встреча';
    }
  };

  return (
    <div className="space-y-3">
      {/* Input Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        {/* Tab Switcher */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setInputTab('note')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              inputTab === 'note'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Примечание
          </button>
          <button
            onClick={() => setInputTab('task')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              inputTab === 'task'
                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Задача
          </button>
        </div>

        {inputTab === 'note' ? (
          <div className="space-y-2">
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Добавить примечание..."
              className="w-full h-20 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleSaveNote}
              disabled={saving || !noteContent.trim()}
              className="w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Сохранение...' : 'Сохранить примечание'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Task Type Tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
              {(['CALL', 'MESSAGE', 'MEETING'] as TaskType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setTaskType(type)}
                  className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    taskType === type
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {getTaskTypeLabel(type)}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="Название задачи..."
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />

            <div className="flex items-center gap-2">
              <input
                type="datetime-local"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
              <button
                onClick={() => setTaskDueDate('')}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <button
              onClick={handleSaveTask}
              disabled={saving || !taskTitle.trim()}
              className="w-full px-3 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Сохранение...' : 'Создать задачу'}
            </button>
          </div>
        )}
      </div>

      {/* Activities Timeline */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Активности</h4>

        {loading ? (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
            Загрузка...
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
            Нет активностей
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="flex gap-3">
                <div className={`w-7 h-7 rounded-full ${getActivityColor(activity.type)} flex items-center justify-center text-white shrink-0`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  {activity.type === 'NOTE' && activity.note && (
                    <div className="text-sm text-gray-900 dark:text-white">{activity.note.content}</div>
                  )}

                  {activity.type === 'TASK' && activity.task && !activity.task.isCompleted && (
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 mr-1">
                            {getTaskTypeLabel(activity.task.taskType)}
                          </span>
                          <span className="text-sm text-gray-900 dark:text-white">{activity.task.title}</span>
                        </div>
                        <button
                          onClick={() => setCompletingTask(activity)}
                          className="shrink-0 p-1 text-gray-400 hover:text-green-600 dark:hover:text-green-400"
                          title="Выполнить"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      </div>
                      {activity.task.dueDate && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Срок: {formatShortDate(activity.task.dueDate)}
                        </div>
                      )}
                    </div>
                  )}

                  {activity.type === 'TASK_COMPLETED' && activity.task && (
                    <div className="space-y-1">
                      <div>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 mr-1">
                          Выполнено
                        </span>
                        <span className="text-sm text-gray-900 dark:text-white line-through">{activity.task.title}</span>
                      </div>
                      {activity.task.completedComment && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                          &quot;{activity.task.completedComment}&quot;
                        </div>
                      )}
                    </div>
                  )}

                  {activity.type === 'STAGE_CHANGED' && (
                    <div className="text-sm text-gray-900 dark:text-white">{activity.content}</div>
                  )}

                  {activity.type === 'CALL' && (
                    <div className="text-sm text-gray-900 dark:text-white">{activity.content}</div>
                  )}

                  {activity.type === 'SYSTEM' && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">{activity.content}</div>
                  )}

                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {formatDate(activity.createdAt)}
                    {activity.createdBy && (
                      <span> &middot; {activity.createdBy.lastName} {activity.createdBy.firstName}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Complete Task Modal */}
      {completingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 w-full max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Выполнить задачу
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {completingTask.task?.title}
            </p>
            <textarea
              value={completeComment}
              onChange={(e) => setCompleteComment(e.target.value)}
              placeholder="Комментарий (необязательно)..."
              className="w-full h-20 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent mb-3"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setCompletingTask(null);
                  setCompleteComment('');
                }}
                className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleCompleteTask}
                disabled={saving}
                className="flex-1 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Сохранение...' : 'Выполнить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
