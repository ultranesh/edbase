'use client';

import { useState, useEffect } from 'react';
import { useNotification } from '@/app/components/ui/NotificationProvider';

interface Subject {
  id: string;
  name: string;
}

interface Topic {
  id: string;
  subjectId: string;
  name: string;
  orderIndex: number;
  isActive: boolean;
  subtopics: Subtopic[];
}

interface Subtopic {
  id: string;
  topicId: string;
  name: string;
  orderIndex: number;
  isActive: boolean;
}

export default function TopicsSection() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [isAddingSubtopic, setIsAddingSubtopic] = useState<string | null>(null);
  const [topicForm, setTopicForm] = useState({ name: '', orderIndex: 0 });
  const [subtopicForm, setSubtopicForm] = useState({ name: '', orderIndex: 0 });
  const [saving, setSaving] = useState(false);
  const { showToast, showConfirm } = useNotification();

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (selectedSubject) fetchTopics(selectedSubject);
  }, [selectedSubject]);

  const fetchSubjects = async () => {
    try {
      const response = await fetch('/api/database/subjects');
      if (response.ok) {
        const data = await response.json();
        setSubjects(data);
        if (data.length > 0) setSelectedSubject(data[0].id);
      }
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  const fetchTopics = async (subjectId: string) => {
    try {
      const response = await fetch(`/api/database/topics?subjectId=${subjectId}`);
      if (response.ok) {
        const data = await response.json();
        setTopics(data.sort((a: Topic, b: Topic) => a.orderIndex - b.orderIndex));
      }
    } catch (error) { console.error('Error:', error); }
  };

  const handleAddTopic = async () => {
    if (!topicForm.name.trim() || !selectedSubject) return;
    setSaving(true);
    try {
      const response = await fetch('/api/database/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...topicForm, subjectId: selectedSubject }),
      });
      if (response.ok) {
        await fetchTopics(selectedSubject);
        setTopicForm({ name: '', orderIndex: topics.length });
        setIsAddingTopic(false);
      }
    } catch (error) { console.error('Error:', error); }
    finally { setSaving(false); }
  };

  const handleAddSubtopic = async (topicId: string) => {
    if (!subtopicForm.name.trim()) return;
    setSaving(true);
    try {
      const response = await fetch('/api/database/subtopics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...subtopicForm, topicId }),
      });
      if (response.ok) {
        if (selectedSubject) await fetchTopics(selectedSubject);
        setSubtopicForm({ name: '', orderIndex: 0 });
        setIsAddingSubtopic(null);
      }
    } catch (error) { console.error('Error:', error); }
    finally { setSaving(false); }
  };

  const handleDeleteTopic = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Удалить тему',
      message: 'Вы уверены, что хотите удалить тему и все подтемы?',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await fetch(`/api/database/topics/${id}`, { method: 'DELETE' });
      showToast({ message: 'Тема удалена', type: 'success' });
      if (selectedSubject) await fetchTopics(selectedSubject);
    } catch (error) {
      console.error('Error:', error);
      showToast({ message: 'Ошибка при удалении', type: 'error' });
    }
  };

  const handleDeleteSubtopic = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Удалить подтему',
      message: 'Вы уверены, что хотите удалить подтему?',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await fetch(`/api/database/subtopics/${id}`, { method: 'DELETE' });
      showToast({ message: 'Подтема удалена', type: 'success' });
      if (selectedSubject) await fetchTopics(selectedSubject);
    } catch (error) {
      console.error('Error:', error);
      showToast({ message: 'Ошибка при удалении', type: 'error' });
    }
  };

  if (loading) return <div className="text-center py-8 text-gray-500">Загрузка...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Темы и подтемы</h2>
      </div>

      {/* Subject selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Выберите предмет</label>
        <select
          value={selectedSubject || ''}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>{subject.name}</option>
          ))}
        </select>
      </div>

      {/* Add topic button */}
      <div className="mb-4">
        {!isAddingTopic ? (
          <button onClick={() => { setIsAddingTopic(true); setTopicForm({ name: '', orderIndex: topics.length }); }} className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Добавить тему
          </button>
        ) : (
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="Название темы" value={topicForm.name} onChange={(e) => setTopicForm({ ...topicForm, name: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg" />
              <input type="number" placeholder="Порядок" value={topicForm.orderIndex} onChange={(e) => setTopicForm({ ...topicForm, orderIndex: parseInt(e.target.value) || 0 })} className="px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={handleAddTopic} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg disabled:opacity-50">{saving ? 'Сохранение...' : 'Сохранить'}</button>
              <button onClick={() => setIsAddingTopic(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg">Отмена</button>
            </div>
          </div>
        )}
      </div>

      {/* Topics list */}
      <div className="space-y-2">
        {topics.map((topic) => (
          <div key={topic.id} className="border border-gray-200 rounded-lg overflow-hidden">
            <div
              className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
              onClick={() => setExpandedTopic(expandedTopic === topic.id ? null : topic.id)}
            >
              <div className="flex items-center gap-3">
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedTopic === topic.id ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="font-medium text-gray-900">{topic.name}</span>
                <span className="text-xs text-gray-500">({topic.subtopics?.length || 0} подтем)</span>
              </div>
              <button onClick={(e) => { e.stopPropagation(); handleDeleteTopic(topic.id); }} className="text-sm text-red-600 hover:text-red-800">
                Удалить
              </button>
            </div>

            {expandedTopic === topic.id && (
              <div className="p-4 bg-white border-t border-gray-200">
                {/* Subtopics */}
                <div className="space-y-2 mb-4">
                  {topic.subtopics?.map((subtopic) => (
                    <div key={subtopic.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-700">{subtopic.name}</span>
                      <button onClick={() => handleDeleteSubtopic(subtopic.id)} className="text-xs text-red-600 hover:text-red-800">
                        Удалить
                      </button>
                    </div>
                  ))}
                  {(!topic.subtopics || topic.subtopics.length === 0) && (
                    <p className="text-sm text-gray-500 italic">Нет подтем</p>
                  )}
                </div>

                {/* Add subtopic */}
                {isAddingSubtopic === topic.id ? (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" placeholder="Название подтемы" value={subtopicForm.name} onChange={(e) => setSubtopicForm({ ...subtopicForm, name: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      <input type="number" placeholder="Порядок" value={subtopicForm.orderIndex} onChange={(e) => setSubtopicForm({ ...subtopicForm, orderIndex: parseInt(e.target.value) || 0 })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => handleAddSubtopic(topic.id)} disabled={saving} className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg disabled:opacity-50">{saving ? '...' : 'Добавить'}</button>
                      <button onClick={() => setIsAddingSubtopic(null)} className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-200 rounded-lg">Отмена</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setIsAddingSubtopic(topic.id); setSubtopicForm({ name: '', orderIndex: topic.subtopics?.length || 0 }); }} className="text-sm text-blue-600 hover:text-blue-800">
                    + Добавить подтему
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        {topics.length === 0 && (
          <p className="text-center py-8 text-gray-500">Нет тем для этого предмета</p>
        )}
      </div>
    </div>
  );
}
