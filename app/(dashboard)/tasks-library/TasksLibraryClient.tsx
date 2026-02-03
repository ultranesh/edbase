'use client';

import { useState, useEffect, useRef } from 'react';
import TaskEditor from './TaskEditor';
import LatexRenderer from '@/components/LatexRenderer';
import { useLanguage } from '@/app/components/LanguageProvider';
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
  nameRu: string | null;
  nameKz: string | null;
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
        nameRu: string | null;
        nameKz: string | null;
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
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [activeFilterCategory, setActiveFilterCategory] = useState<string | null>(null);
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  const canCreateTasks = ['TEACHER', 'COORDINATOR', 'ADMIN', 'SUPERADMIN'].includes(userRole);

  // Close filter panel when clicking outside
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
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilterPanel]);

  // Count active filters
  const activeFilterCount =
    (selectedSubject ? 1 : 0) +
    (selectedTopic ? 1 : 0) +
    (selectedSubtopic ? 1 : 0) +
    selectedFormats.length +
    selectedDifficulties.length +
    selectedGrades.length +
    selectedTags.length;

  // Reset all filters
  const resetFilters = () => {
    setSelectedSubject('');
    setSelectedTopic('');
    setSelectedSubtopic('');
    setSelectedFormats([]);
    setSelectedDifficulties([]);
    setSelectedGrades([]);
    setSelectedTags([]);
    setPage(1);
  };

  // Toggle array filter
  const toggleArrayFilter = <T extends string>(
    current: T[],
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    value: T
  ) => {
    if (current.includes(value)) {
      setter(current.filter(v => v !== value));
    } else {
      setter([...current, value]);
    }
    setPage(1);
  };

  const selectedSubjectData = subjects.find(s => s.id === selectedSubject);
  const selectedTopicData = selectedSubjectData?.taskTopics.find(t => t.id === selectedTopic);

  useEffect(() => {
    loadTasks();
  }, [selectedSubject, selectedTopic, selectedSubtopic, selectedFormats, selectedDifficulties, selectedGrades, selectedTags, page]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSubtopic) params.append('subtopicId', selectedSubtopic);
      else if (selectedTopic) params.append('topicId', selectedTopic);
      else if (selectedSubject) params.append('subjectId', selectedSubject);
      if (selectedFormats.length > 0) params.append('format', selectedFormats.join(','));
      if (selectedDifficulties.length > 0) params.append('difficulty', selectedDifficulties.join(','));
      if (selectedGrades.length > 0) params.append('grade', selectedGrades.join(','));
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
      BEGINNER: t('tasksLibrary.beginner'),
      ELEMENTARY: t('tasksLibrary.elementary'),
      PRE_INTERMEDIATE: t('tasksLibrary.preIntermediate'),
      INTERMEDIATE: t('tasksLibrary.intermediate'),
      UPPER_INTERMEDIATE: t('tasksLibrary.upperIntermediate'),
      ADVANCED: t('tasksLibrary.advanced'),
    };
    return map[level] || level;
  };

  const formatTaskFormat = (format: string) => {
    const map: Record<string, string> = {
      NISH: t('tasksLibrary.formatNISH'),
      BIL: t('tasksLibrary.formatBIL'),
      RFMSH: t('tasksLibrary.formatRFMSH'),
      ENT: t('tasksLibrary.formatENT'),
      OLYMPIAD: t('tasksLibrary.formatOlympiad'),
      SAT: t('tasksLibrary.formatSAT'),
    };
    return map[format] || format;
  };

  const formatTagDisplay = (tag: string) => {
    const map: Record<string, string> = {
      'ГОСО': t('tasksLibrary.tagGOSO'),
      'Ertis Academy': t('tasksLibrary.tagErtisAcademy'),
      'Проверено': t('tasksLibrary.tagVerified'),
    };
    return map[tag] || tag;
  };

  const [searchQuery, setSearchQuery] = useState('');

  // Filter tasks by search query
  const filteredTasks = tasks.filter(task => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      task.questionText.toLowerCase().includes(query) ||
      (task.answerText && task.answerText.toLowerCase().includes(query)) ||
      task.subtopic.name.toLowerCase().includes(query) ||
      task.subtopic.topic.name.toLowerCase().includes(query) ||
      (task.subtopic.topic.subject.nameRu || task.subtopic.topic.subject.nameKz || '').toLowerCase().includes(query)
    );
  });

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

      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('tasksLibrary.libraryTitle')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('common.total')}: {tasks.length}
              </p>
            </div>
          </div>

          {canCreateTasks && (
            <button
              onClick={handleCreateTask}
              className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              {t('tasksLibrary.add')}
            </button>
          )}
        </div>

        {/* Search input with filter button */}
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
              placeholder={t('tasksLibrary.search')}
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

          {/* Filter button */}
          <div className="relative" ref={filterPanelRef}>
            <button
              onClick={() => {
                setShowFilterPanel(!showFilterPanel);
                setActiveFilterCategory(null);
              }}
              className={`px-3 py-2.5 rounded-xl border transition-colors flex items-center gap-2 ${
                activeFilterCount > 0 || showFilterPanel
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
                {/* Options panel (left side) - shows when category is selected */}
                {activeFilterCategory && (
                  <div className="w-64 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl mr-2 flex flex-col max-h-[480px]">
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {activeFilterCategory === 'subject' && t('tasksLibrary.subject')}
                        {activeFilterCategory === 'topic' && t('tasksLibrary.topic')}
                        {activeFilterCategory === 'subtopic' && t('tasksLibrary.subtopic')}
                        {activeFilterCategory === 'format' && t('tasksLibrary.format')}
                        {activeFilterCategory === 'difficulty' && t('tasksLibrary.difficulty')}
                        {activeFilterCategory === 'grade' && t('tasksLibrary.grade')}
                        {activeFilterCategory === 'tags' && t('tasksLibrary.tags')}
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
                      {/* Subject options */}
                      {activeFilterCategory === 'subject' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedSubject('');
                              setSelectedTopic('');
                              setSelectedSubtopic('');
                              setPage(1);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              !selectedSubject
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            {t('common.all')}
                          </button>
                          {subjects.map(subject => (
                            <button
                              key={subject.id}
                              onClick={() => {
                                setSelectedSubject(subject.id);
                                setSelectedTopic('');
                                setSelectedSubtopic('');
                                setPage(1);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                selectedSubject === subject.id
                                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                            >
                              {subject.nameRu || subject.nameKz}
                            </button>
                          ))}
                        </>
                      )}
                      {/* Topic options */}
                      {activeFilterCategory === 'topic' && selectedSubjectData && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedTopic('');
                              setSelectedSubtopic('');
                              setPage(1);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              !selectedTopic
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            {t('common.all')}
                          </button>
                          {selectedSubjectData.taskTopics.map(topic => (
                            <button
                              key={topic.id}
                              onClick={() => {
                                setSelectedTopic(topic.id);
                                setSelectedSubtopic('');
                                setPage(1);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                selectedTopic === topic.id
                                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                            >
                              {topic.name}
                            </button>
                          ))}
                        </>
                      )}
                      {activeFilterCategory === 'topic' && !selectedSubjectData && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 px-3 py-2">
                          {t('tasksLibrary.selectSubject')}
                        </p>
                      )}
                      {/* Subtopic options */}
                      {activeFilterCategory === 'subtopic' && selectedTopicData && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedSubtopic('');
                              setPage(1);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              !selectedSubtopic
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            {t('common.all')}
                          </button>
                          {selectedTopicData.subtopics.map(subtopic => (
                            <button
                              key={subtopic.id}
                              onClick={() => {
                                setSelectedSubtopic(subtopic.id);
                                setPage(1);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                selectedSubtopic === subtopic.id
                                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                            >
                              {subtopic.name}
                            </button>
                          ))}
                        </>
                      )}
                      {activeFilterCategory === 'subtopic' && !selectedTopicData && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 px-3 py-2">
                          {t('tasksLibrary.selectTopic')}
                        </p>
                      )}
                      {/* Format options - multi-select */}
                      {activeFilterCategory === 'format' && (
                        <>
                          {formats.map(format => (
                            <button
                              key={format}
                              onClick={() => toggleArrayFilter(selectedFormats, setSelectedFormats, format)}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                                selectedFormats.includes(format)
                                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                            >
                              {formatTaskFormat(format)}
                              {selectedFormats.includes(format) && (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>
                          ))}
                        </>
                      )}
                      {/* Difficulty options - multi-select */}
                      {activeFilterCategory === 'difficulty' && (
                        <>
                          {difficulties.map(difficulty => (
                            <button
                              key={difficulty}
                              onClick={() => toggleArrayFilter(selectedDifficulties, setSelectedDifficulties, difficulty)}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                                selectedDifficulties.includes(difficulty)
                                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                            >
                              {formatDifficulty(difficulty)}
                              {selectedDifficulties.includes(difficulty) && (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>
                          ))}
                        </>
                      )}
                      {/* Grade options - multi-select */}
                      {activeFilterCategory === 'grade' && (
                        <>
                          {[4, 5, 6, 7, 8, 9, 10, 11].map(grade => (
                            <button
                              key={grade}
                              onClick={() => toggleArrayFilter(selectedGrades, setSelectedGrades, String(grade))}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                                selectedGrades.includes(String(grade))
                                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                            >
                              {grade} {t('tasksLibrary.grade')}
                              {selectedGrades.includes(String(grade)) && (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>
                          ))}
                        </>
                      )}
                      {/* Tags options */}
                      {activeFilterCategory === 'tags' && (
                        <>
                          {['ГОСО', 'Ertis Academy', 'Проверено'].map(tag => (
                            <button
                              key={tag}
                              onClick={() => {
                                if (selectedTags.includes(tag)) {
                                  setSelectedTags(selectedTags.filter(t => t !== tag));
                                } else {
                                  setSelectedTags([...selectedTags, tag]);
                                }
                                setPage(1);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                                selectedTags.includes(tag)
                                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                {formatTagDisplay(tag)}
                                {tag === 'Проверено' && (
                                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </span>
                              {selectedTags.includes(tag) && (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Categories panel (right side) */}
                <div className="w-56 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{t('tasksLibrary.filters')}</span>
                    {activeFilterCount > 0 && (
                      <button
                        onClick={resetFilters}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700"
                      >
                        {t('common.reset')}
                      </button>
                    )}
                  </div>
                  <div className="p-2 space-y-0.5">
                    {/* Subject */}
                    <button
                      onClick={() => setActiveFilterCategory(activeFilterCategory === 'subject' ? null : 'subject')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                        activeFilterCategory === 'subject'
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span className="text-sm">{t('tasksLibrary.subject')}</span>
                      <div className="flex items-center gap-2">
                        {selectedSubject && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                            1
                          </span>
                        )}
                        <svg className={`w-4 h-4 transition-transform ${activeFilterCategory === 'subject' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </div>
                    </button>

                    {/* Topic (only if subject selected) */}
                    {selectedSubject && (
                      <button
                        onClick={() => setActiveFilterCategory(activeFilterCategory === 'topic' ? null : 'topic')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                          activeFilterCategory === 'topic'
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span className="text-sm">{t('tasksLibrary.topic')}</span>
                        <div className="flex items-center gap-2">
                          {selectedTopic && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                              1
                            </span>
                          )}
                          <svg className={`w-4 h-4 transition-transform ${activeFilterCategory === 'topic' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </div>
                      </button>
                    )}

                    {/* Subtopic (only if topic selected) */}
                    {selectedTopic && (
                      <button
                        onClick={() => setActiveFilterCategory(activeFilterCategory === 'subtopic' ? null : 'subtopic')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                          activeFilterCategory === 'subtopic'
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span className="text-sm">{t('tasksLibrary.subtopic')}</span>
                        <div className="flex items-center gap-2">
                          {selectedSubtopic && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                              1
                            </span>
                          )}
                          <svg className={`w-4 h-4 transition-transform ${activeFilterCategory === 'subtopic' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </div>
                      </button>
                    )}

                    {/* Format */}
                    <button
                      onClick={() => setActiveFilterCategory(activeFilterCategory === 'format' ? null : 'format')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                        activeFilterCategory === 'format'
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span className="text-sm">{t('tasksLibrary.format')}</span>
                      <div className="flex items-center gap-2">
                        {selectedFormats.length > 0 && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                            {selectedFormats.length}
                          </span>
                        )}
                        <svg className={`w-4 h-4 transition-transform ${activeFilterCategory === 'format' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </div>
                    </button>

                    {/* Difficulty */}
                    <button
                      onClick={() => setActiveFilterCategory(activeFilterCategory === 'difficulty' ? null : 'difficulty')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                        activeFilterCategory === 'difficulty'
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span className="text-sm">{t('tasksLibrary.difficulty')}</span>
                      <div className="flex items-center gap-2">
                        {selectedDifficulties.length > 0 && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                            {selectedDifficulties.length}
                          </span>
                        )}
                        <svg className={`w-4 h-4 transition-transform ${activeFilterCategory === 'difficulty' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </div>
                    </button>

                    {/* Grade */}
                    <button
                      onClick={() => setActiveFilterCategory(activeFilterCategory === 'grade' ? null : 'grade')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                        activeFilterCategory === 'grade'
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span className="text-sm">{t('tasksLibrary.grade')}</span>
                      <div className="flex items-center gap-2">
                        {selectedGrades.length > 0 && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                            {selectedGrades.length}
                          </span>
                        )}
                        <svg className={`w-4 h-4 transition-transform ${activeFilterCategory === 'grade' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </div>
                    </button>

                    {/* Tags */}
                    <button
                      onClick={() => setActiveFilterCategory(activeFilterCategory === 'tags' ? null : 'tags')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                        activeFilterCategory === 'tags'
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span className="text-sm">{t('tasksLibrary.tags')}</span>
                      <div className="flex items-center gap-2">
                        {selectedTags.length > 0 && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                            {selectedTags.length}
                          </span>
                        )}
                        <svg className={`w-4 h-4 transition-transform ${activeFilterCategory === 'tags' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{t('common.loading')}</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('tasksLibrary.noTasksFound')}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {searchQuery ? t('tasksLibrary.noTasks') : t('tasksLibrary.noTasksDesc')}
          </p>
          {canCreateTasks && tasks.length === 0 && (
            <button
              onClick={handleCreateTask}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700"
            >
              {t('tasksLibrary.add')}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            {filteredTasks.map((task) => {
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
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => handleEditTask(task)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <span className="text-xs px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full font-medium">
                          {formatTaskFormat(task.format)}
                        </span>
                        {task.tags && task.tags.length > 0 && task.tags.map((tag: string) => (
                          <span key={tag} className="text-xs px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full font-medium flex items-center gap-1">
                            {tag === 'Проверено' && (
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                            {formatTagDisplay(tag)}
                          </span>
                        ))}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {task.subtopic.topic.subject.nameRu || task.subtopic.topic.subject.nameKz} → {task.subtopic.topic.name} → {task.subtopic.name}
                      </div>
                    </div>
                  </div>

                  <div className="prose prose-sm max-w-none mb-4 dark:prose-invert">
                    <LatexRenderer
                      text={task.questionText}
                      className="text-gray-900 dark:text-white text-base"
                    />
                    {task.questionImage && (
                      <img
                        src={task.questionImage}
                        alt="Question"
                        className="mt-3 max-w-md rounded-lg border border-gray-200 dark:border-gray-700"
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                      {task.gradeLevels && task.gradeLevels.map((gradeLevel: { grade: number; difficulty: string }) => (
                        <div key={gradeLevel.grade} className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{gradeLevel.grade} {t('tasksLibrary.grade')}</span>
                          {renderStars(gradeLevel)}
                        </div>
                      ))}
                    </div>
                    {task.correctAnswer && (
                      <div className="text-sm">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">{t('tasksLibrary.answer')}:</span>
                        <span className="ml-2 px-3 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg font-semibold">
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
                className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('common.back')}
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium px-4">
                {t('common.pageOf', { page, total: totalPages })}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('common.forward')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
