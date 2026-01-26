'use client';

import { useState, useEffect } from 'react';
import TaskEditor from './TaskEditor';
import LatexRenderer from '@/components/LatexRenderer';
import 'katex/dist/katex.min.css';

interface Subtopic {
  id: string;
  name: string;
  orderIndex: number;
}

interface Topic {
  id: string;
  name: string;
  icon: string | null;
  orderIndex: number;
  subtopics: Subtopic[];
}

interface Subject {
  id: string;
  name: string;
  icon: string | null;
  taskTopics: Topic[];
}

interface Task {
  id: string;
  questionText: string;
  questionImage: string | null;
  answerText: string | null;
  format: string;
  difficultyLevel: string;
  points: number;
  timeEstimate: number | null;
  tags: string[];
  gradeLevels?: { grade: number; difficulty: string }[];
  correctAnswer?: number;
  subtopic: {
    id: string;
    name: string;
    topic: {
      id: string;
      name: string;
      subject: {
        id: string;
        name: string;
      };
    };
  };
}

interface TasksLibraryClientProps {
  subjects: Subject[];
  formats: string[];
  difficulties: string[];
  userRole: string;
}

export default function TasksLibraryClient({
  subjects,
  formats,
  difficulties,
  userRole,
}: TasksLibraryClientProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [selectedSubtopic, setSelectedSubtopic] = useState<string>('');
  const [selectedFormat, setSelectedFormat] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const canCreateTasks = ['TEACHER', 'COORDINATOR', 'ADMIN', 'SUPERADMIN'].includes(userRole);

  const selectedSubjectData = subjects.find(s => s.id === selectedSubject);
  const selectedTopicData = selectedSubjectData?.taskTopics.find(t => t.id === selectedTopic);

  useEffect(() => {
    loadTasks();
  }, [selectedSubject, selectedTopic, selectedSubtopic, selectedFormat, selectedDifficulty, selectedGrade, selectedTags, page]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSubtopic) params.append('subtopicId', selectedSubtopic);
      else if (selectedTopic) params.append('topicId', selectedTopic);
      else if (selectedSubject) params.append('subjectId', selectedSubject);
      if (selectedFormat) params.append('format', selectedFormat);
      if (selectedDifficulty) params.append('difficulty', selectedDifficulty);
      if (selectedGrade) params.append('grade', selectedGrade);
      if (selectedTags.length > 0) params.append('tags', selectedTags.join(','));
      params.append('page', page.toString());

      const response = await fetch(`/api/tasks?${params}`);
      const data = await response.json();

      setTasks(data.tasks || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = () => {
    setEditingTask(null);
    setShowEditor(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowEditor(true);
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
    setEditingTask(null);
    loadTasks();
  };

  const formatDifficulty = (level: string) => {
    const map: Record<string, string> = {
      BEGINNER: 'Начинающий',
      ELEMENTARY: 'Элементарный',
      PRE_INTERMEDIATE: 'Ниже среднего',
      INTERMEDIATE: 'Средний',
      UPPER_INTERMEDIATE: 'Выше среднего',
      ADVANCED: 'Продвинутый',
    };
    return map[level] || level;
  };

  const formatTaskFormat = (format: string) => {
    const map: Record<string, string> = {
      NISH: 'НИШ',
      BIL: 'БИЛ',
      RFMSH: 'РФМШ',
      ENT: 'ЕНТ',
      OLYMPIAD: 'Олимпиадная',
      SAT: 'SAT',
    };
    return map[format] || format;
  };

  return (
    <div className="space-y-6">
      {showEditor && (
        <TaskEditor
          task={editingTask}
          subjects={subjects}
          onClose={handleCloseEditor}
          isOpen={showEditor}
        />
      )}
      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Фильтры</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Subject */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Предмет
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setSelectedTopic('');
                setSelectedSubtopic('');
                setPage(1);
              }}
              className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all hover:border-gray-300 text-gray-900 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%228%22%20viewBox%3D%220%200%2012%208%22%3E%3Cpath%20fill%3D%22%236B7280%22%20d%3D%22M1.41%200L6%204.59%2010.59%200%2012%201.41l-6%206-6-6z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px_12px] bg-[position:right_1rem_center] bg-no-repeat pr-10"
            >
              <option value="">Все предметы</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          {/* Topic */}
          {selectedSubjectData && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Тема
              </label>
              <select
                value={selectedTopic}
                onChange={(e) => {
                  setSelectedTopic(e.target.value);
                  setSelectedSubtopic('');
                  setPage(1);
                }}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all hover:border-gray-300 text-gray-900 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%228%22%20viewBox%3D%220%200%2012%208%22%3E%3Cpath%20fill%3D%22%236B7280%22%20d%3D%22M1.41%200L6%204.59%2010.59%200%2012%201.41l-6%206-6-6z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px_12px] bg-[position:right_1rem_center] bg-no-repeat pr-10"
              >
                <option value="">Все темы</option>
                {selectedSubjectData.taskTopics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Subtopic */}
          {selectedTopicData && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Подтема
              </label>
              <select
                value={selectedSubtopic}
                onChange={(e) => {
                  setSelectedSubtopic(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all hover:border-gray-300 text-gray-900 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%228%22%20viewBox%3D%220%200%2012%208%22%3E%3Cpath%20fill%3D%22%236B7280%22%20d%3D%22M1.41%200L6%204.59%2010.59%200%2012%201.41l-6%206-6-6z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px_12px] bg-[position:right_1rem_center] bg-no-repeat pr-10"
              >
                <option value="">Все подтемы</option>
                {selectedTopicData.subtopics.map((subtopic) => (
                  <option key={subtopic.id} value={subtopic.id}>
                    {subtopic.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Format */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Формат
            </label>
            <select
              value={selectedFormat}
              onChange={(e) => {
                setSelectedFormat(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all hover:border-gray-300 text-gray-900 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%228%22%20viewBox%3D%220%200%2012%208%22%3E%3Cpath%20fill%3D%22%236B7280%22%20d%3D%22M1.41%200L6%204.59%2010.59%200%2012%201.41l-6%206-6-6z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px_12px] bg-[position:right_1rem_center] bg-no-repeat pr-10"
            >
              <option value="">Все форматы</option>
              {formats.map((format) => (
                <option key={format} value={format}>
                  {formatTaskFormat(format)}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Сложность
            </label>
            <select
              value={selectedDifficulty}
              onChange={(e) => {
                setSelectedDifficulty(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all hover:border-gray-300 text-gray-900 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%228%22%20viewBox%3D%220%200%2012%208%22%3E%3Cpath%20fill%3D%22%236B7280%22%20d%3D%22M1.41%200L6%204.59%2010.59%200%2012%201.41l-6%206-6-6z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px_12px] bg-[position:right_1rem_center] bg-no-repeat pr-10"
            >
              <option value="">Все уровни</option>
              {difficulties.map((difficulty) => (
                <option key={difficulty} value={difficulty}>
                  {formatDifficulty(difficulty)}
                </option>
              ))}
            </select>
          </div>

          {/* Grade */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Класс
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => {
                setSelectedGrade(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all hover:border-gray-300 text-gray-900 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%228%22%20viewBox%3D%220%200%2012%208%22%3E%3Cpath%20fill%3D%22%236B7280%22%20d%3D%22M1.41%200L6%204.59%2010.59%200%2012%201.41l-6%206-6-6z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px_12px] bg-[position:right_1rem_center] bg-no-repeat pr-10"
            >
              <option value="">Все классы</option>
              {[4, 5, 6, 7, 8, 9, 10, 11].map((grade) => (
                <option key={grade} value={grade}>
                  {grade} класс
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tags */}
        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Теги
          </label>
          <div className="flex flex-wrap gap-3">
            {['ГОСО', 'Ertis Academy', 'Проверено'].map((tag) => (
              <label key={tag} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedTags.includes(tag)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedTags([...selectedTags, tag]);
                    } else {
                      setSelectedTags(selectedTags.filter(t => t !== tag));
                    }
                    setPage(1);
                  }}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-900">{tag}</span>
                {tag === 'Проверено' && (
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </label>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => {
              setSelectedSubject('');
              setSelectedTopic('');
              setSelectedSubtopic('');
              setSelectedFormat('');
              setSelectedDifficulty('');
              setSelectedGrade('');
              setSelectedTags([]);
              setPage(1);
            }}
            className="text-sm text-gray-700 hover:text-gray-900 font-medium"
          >
            Сбросить фильтры
          </button>

          {canCreateTasks && (
            <button
              onClick={handleCreateTask}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              + Добавить задачу
            </button>
          )}
        </div>
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-700">Загрузка...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-700 font-medium">Задачи не найдены</p>
          {canCreateTasks && (
            <button
              onClick={handleCreateTask}
              className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              Создать первую задачу
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            {tasks.map((task) => {
              const renderStars = (gradeLevel: { grade: number; difficulty: string }) => {
                const filledStars = gradeLevel.difficulty === 'HARD' ? 3 : gradeLevel.difficulty === 'MEDIUM' ? 2 : 1;
                return (
                  <div className="flex items-center gap-1">
                    {[1, 2, 3].map((star) => (
                      <svg
                        key={star}
                        className={`w-4 h-4 ${star <= filledStars ? 'text-yellow-400 fill-current' : 'text-gray-300 fill-current'}`}
                        viewBox="0 0 20 20"
                      >
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                      </svg>
                    ))}
                  </div>
                );
              };

              return (
                <div
                  key={task.id}
                  className="bg-white rounded-xl border border-gray-200 p-6 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => handleEditTask(task)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <span className="text-xs px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                          {formatTaskFormat(task.format)}
                        </span>
                        {task.tags && task.tags.length > 0 && task.tags.map((tag: string) => (
                          <span key={tag} className="text-xs px-3 py-1.5 bg-green-100 text-green-700 rounded-full font-medium flex items-center gap-1">
                            {tag === 'Проверено' && (
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        {task.subtopic.topic.subject.name} → {task.subtopic.topic.name} → {task.subtopic.name}
                      </div>
                    </div>
                  </div>

                  <div className="prose prose-sm max-w-none mb-4">
                    <LatexRenderer
                      text={task.questionText}
                      className="text-gray-900 text-base"
                    />
                    {task.questionImage && (
                      <img
                        src={task.questionImage}
                        alt="Question"
                        className="mt-3 max-w-md rounded-lg border border-gray-200"
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-4">
                      {task.gradeLevels && task.gradeLevels.map((gradeLevel: { grade: number; difficulty: string }) => (
                        <div key={gradeLevel.grade} className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">{gradeLevel.grade} класс</span>
                          {renderStars(gradeLevel)}
                        </div>
                      ))}
                    </div>
                    {task.correctAnswer && (
                      <div className="text-sm">
                        <span className="text-gray-600 font-medium">Ответ:</span>
                        <span className="ml-2 px-3 py-1 bg-green-50 text-green-700 rounded-lg font-semibold">
                          {task.correctAnswer}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Назад
              </button>
              <span className="text-sm text-gray-700 font-medium">
                Страница {page} из {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Вперёд
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
