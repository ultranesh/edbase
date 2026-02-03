'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import 'katex/dist/katex.min.css';
import LatexRenderer from '@/components/LatexRenderer';
import { useNotification } from '@/app/components/ui/NotificationProvider';

interface TaskEditorProps {
  isOpen?: boolean;
  onClose: () => void;
  task?: any;
  subjects: any[];
  onSave?: (task: any) => void;
}

interface AnswerOption {
  id: string;
  textRu: string;
  textKz: string;
  textEn: string;
  isCorrect: boolean;
  imageUrl: string;
}

interface GradeLevel {
  grade: number;
  difficulty: number;
}

interface SelectedSubtopic {
  id: string;
  name: string;
  topicName: string;
  subjectName: string;
}

type LanguageTab = 'kz' | 'ru' | 'en';

// LaTeX categories organized like mektepte
const latexCategories = [
  {
    name: 'Основные',
    symbols: [
      { label: '+', latex: '+' },
      { label: '−', latex: '-' },
      { label: '×', latex: '\\times' },
      { label: '÷', latex: '\\div' },
      { label: '±', latex: '\\pm' },
      { label: '=', latex: '=' },
      { label: '≠', latex: '\\neq' },
      { label: '<', latex: '<' },
      { label: '>', latex: '>' },
      { label: '≤', latex: '\\leq' },
      { label: '≥', latex: '\\geq' },
      { label: '≈', latex: '\\approx' },
    ],
  },
  {
    name: 'Дроби и степени',
    symbols: [
      { label: 'a/b', latex: '\\frac{a}{b}' },
      { label: 'xⁿ', latex: 'x^{n}' },
      { label: 'x²', latex: 'x^{2}' },
      { label: 'x³', latex: 'x^{3}' },
      { label: 'xᵢ', latex: 'x_{i}' },
      { label: 'xₙ', latex: 'x_{n}' },
      { label: 'aⁿₘ', latex: 'a^{n}_{m}' },
    ],
  },
  {
    name: 'Корни',
    symbols: [
      { label: '√', latex: '\\sqrt{}' },
      { label: '√x', latex: '\\sqrt{x}' },
      { label: '³√', latex: '\\sqrt[3]{}' },
      { label: 'ⁿ√', latex: '\\sqrt[n]{}' },
    ],
  },
  {
    name: 'Греческие',
    symbols: [
      { label: 'α', latex: '\\alpha' },
      { label: 'β', latex: '\\beta' },
      { label: 'γ', latex: '\\gamma' },
      { label: 'δ', latex: '\\delta' },
      { label: 'ε', latex: '\\varepsilon' },
      { label: 'θ', latex: '\\theta' },
      { label: 'λ', latex: '\\lambda' },
      { label: 'μ', latex: '\\mu' },
      { label: 'π', latex: '\\pi' },
      { label: 'σ', latex: '\\sigma' },
      { label: 'φ', latex: '\\varphi' },
      { label: 'ω', latex: '\\omega' },
      { label: 'Δ', latex: '\\Delta' },
      { label: 'Σ', latex: '\\Sigma' },
      { label: 'Ω', latex: '\\Omega' },
    ],
  },
  {
    name: 'Тригонометрия',
    symbols: [
      { label: 'sin', latex: '\\sin' },
      { label: 'cos', latex: '\\cos' },
      { label: 'tan', latex: '\\tan' },
      { label: 'cot', latex: '\\cot' },
      { label: 'arcsin', latex: '\\arcsin' },
      { label: 'arccos', latex: '\\arccos' },
      { label: 'arctan', latex: '\\arctan' },
      { label: 'sin²', latex: '\\sin^{2}' },
      { label: 'cos²', latex: '\\cos^{2}' },
    ],
  },
  {
    name: 'Логарифмы',
    symbols: [
      { label: 'log', latex: '\\log' },
      { label: 'logₐ', latex: '\\log_{a}' },
      { label: 'lg', latex: '\\lg' },
      { label: 'ln', latex: '\\ln' },
    ],
  },
  {
    name: 'Пределы и суммы',
    symbols: [
      { label: 'lim', latex: '\\lim_{x \\to a}' },
      { label: '∞', latex: '\\infty' },
      { label: '→', latex: '\\to' },
      { label: '∑', latex: '\\sum_{i=1}^{n}' },
      { label: '∏', latex: '\\prod_{i=1}^{n}' },
    ],
  },
  {
    name: 'Интегралы',
    symbols: [
      { label: '∫', latex: '\\int' },
      { label: '∫ᵃᵇ', latex: '\\int_{a}^{b}' },
      { label: 'd/dx', latex: '\\frac{d}{dx}' },
      { label: "f'", latex: "f'" },
    ],
  },
  {
    name: 'Множества',
    symbols: [
      { label: '∈', latex: '\\in' },
      { label: '∉', latex: '\\notin' },
      { label: '⊂', latex: '\\subset' },
      { label: '⊃', latex: '\\supset' },
      { label: '∪', latex: '\\cup' },
      { label: '∩', latex: '\\cap' },
      { label: '∅', latex: '\\emptyset' },
      { label: 'ℕ', latex: '\\mathbb{N}' },
      { label: 'ℤ', latex: '\\mathbb{Z}' },
      { label: 'ℚ', latex: '\\mathbb{Q}' },
      { label: 'ℝ', latex: '\\mathbb{R}' },
    ],
  },
  {
    name: 'Геометрия',
    symbols: [
      { label: '∠', latex: '\\angle' },
      { label: '°', latex: '^{\\circ}' },
      { label: '⊥', latex: '\\perp' },
      { label: '∥', latex: '\\parallel' },
      { label: '△', latex: '\\triangle' },
      { label: '□', latex: '\\square' },
      { label: '∼', latex: '\\sim' },
      { label: '≅', latex: '\\cong' },
    ],
  },
  {
    name: 'Скобки',
    symbols: [
      { label: '()', latex: '\\left( \\right)' },
      { label: '[]', latex: '\\left[ \\right]' },
      { label: '{}', latex: '\\left\\{ \\right\\}' },
      { label: '||', latex: '\\left| \\right|' },
    ],
  },
  {
    name: 'Матрицы',
    symbols: [
      { label: '2×2', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
      { label: '[ ]', latex: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}' },
    ],
  },
  {
    name: 'Системы',
    symbols: [
      { label: '{ =', latex: '\\begin{cases} x + y = 1 \\\\ x - y = 0 \\end{cases}' },
    ],
  },
  {
    name: 'Векторы',
    symbols: [
      { label: '→a', latex: '\\vec{a}' },
      { label: '|a|', latex: '|\\vec{a}|' },
      { label: 'a⃗·b⃗', latex: '\\vec{a} \\cdot \\vec{b}' },
    ],
  },
  {
    name: 'Прочее',
    symbols: [
      { label: '...', latex: '\\ldots' },
      { label: '⇒', latex: '\\Rightarrow' },
      { label: '⇔', latex: '\\Leftrightarrow' },
      { label: '∀', latex: '\\forall' },
      { label: '∃', latex: '\\exists' },
    ],
  },
];

// Image upload component
function ImageUpload({
  value,
  onChange,
  label
}: {
  value: string;
  onChange: (url: string) => void;
  label: string;
}) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = () => {
        onChange(reader.result as string);
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Upload failed:', err);
      setUploading(false);
    }
  };

  return (
    <div className="mt-3">
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {value ? (
        <div className="relative inline-block">
          <img src={value} alt="Preview" className="max-h-32 rounded-lg border border-gray-200" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
          >
            ×
          </button>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-blue-200 rounded-xl p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <svg className="w-6 h-6 mx-auto text-blue-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs text-blue-600">
            {uploading ? 'Загрузка...' : 'Загрузить'}
          </span>
        </div>
      )}
    </div>
  );
}

export default function TaskEditor({
  isOpen = true,
  onClose,
  task,
  subjects,
  onSave,
}: TaskEditorProps) {
  const { showToast } = useNotification();
  const [selectedSubject, setSelectedSubject] = useState(task?.subtopic?.topic?.subjectId || '');
  const [selectedTopic, setSelectedTopic] = useState(task?.subtopic?.topicId || '');
  const [activeLanguage, setActiveLanguage] = useState<LanguageTab>('ru');
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Основные');
  const [activeTextareaId, setActiveTextareaId] = useState<string>('questionRu');
  const textareaRefs = useRef<Map<string, HTMLTextAreaElement | HTMLInputElement>>(new Map());

  // Initialize selected subtopics from task data
  const getInitialSubtopics = (): SelectedSubtopic[] => {
    if (task?.subtopics && task.subtopics.length > 0) {
      return task.subtopics.map((link: any) => ({
        id: link.subtopic?.id || link.subtopicId,
        name: link.subtopic?.name || '',
        topicName: link.subtopic?.topic?.name || '',
        subjectName: link.subtopic?.topic?.subject?.name || '',
      }));
    }
    if (task?.subtopic) {
      return [{
        id: task.subtopic.id,
        name: task.subtopic.name,
        topicName: task.subtopic.topic?.name || '',
        subjectName: task.subtopic.topic?.subject?.name || '',
      }];
    }
    return [];
  };

  const [selectedSubtopics, setSelectedSubtopics] = useState<SelectedSubtopic[]>(getInitialSubtopics());
  const [currentSubtopicId, setCurrentSubtopicId] = useState(''); // For adding new subtopics

  const [formData, setFormData] = useState({
    subtopicIds: task?.subtopics?.map((s: any) => s.subtopicId || s.subtopic?.id) || (task?.subtopicId ? [task.subtopicId] : []),
    format: task?.format || 'NISH',
    source: task?.source || '',
    tags: task?.tags || [],
    questionRu: task?.questionText || '',
    questionKz: '',
    questionEn: '',
    questionImage: task?.questionImage || '',
    hintRu: task?.hintText || '',
    hintKz: '',
    hintEn: '',
    solutionRu: task?.solutionText || '',
    solutionKz: '',
    solutionEn: '',
  });

  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>(
    task?.gradeLevels?.map((g: any) => ({ grade: g.grade, difficulty: g.difficulty === 'EASY' ? 1 : g.difficulty === 'MEDIUM' ? 3 : 5 })) ||
    [{ grade: 7, difficulty: 3 }]
  );

  const [answerOptions, setAnswerOptions] = useState<AnswerOption[]>(
    task?.answerOptions || [
      { id: '1', textRu: '', textKz: '', textEn: '', isCorrect: false, imageUrl: '' },
      { id: '2', textRu: '', textKz: '', textEn: '', isCorrect: false, imageUrl: '' },
      { id: '3', textRu: '', textKz: '', textEn: '', isCorrect: false, imageUrl: '' },
      { id: '4', textRu: '', textKz: '', textEn: '', isCorrect: false, imageUrl: '' },
    ]
  );

  const selectedSubjectData = subjects.find(s => s.id === selectedSubject);
  const selectedTopicData = selectedSubjectData?.taskTopics?.find((t: any) => t.id === selectedTopic);

  const addSubtopic = () => {
    if (!currentSubtopicId) return;

    // Check if already added
    if (selectedSubtopics.some(s => s.id === currentSubtopicId)) {
      showToast({ message: 'Эта подтема уже добавлена', type: 'warning' });
      return;
    }

    const subtopic = selectedTopicData?.subtopics?.find((s: any) => s.id === currentSubtopicId);
    if (subtopic) {
      const newSubtopic: SelectedSubtopic = {
        id: subtopic.id,
        name: subtopic.name,
        topicName: selectedTopicData?.name || '',
        subjectName: selectedSubjectData?.name || '',
      };
      setSelectedSubtopics([...selectedSubtopics, newSubtopic]);
      setFormData(prev => ({
        ...prev,
        subtopicIds: [...prev.subtopicIds, subtopic.id],
      }));
      setCurrentSubtopicId('');
    }
  };

  const removeSubtopic = (subtopicId: string) => {
    setSelectedSubtopics(selectedSubtopics.filter(s => s.id !== subtopicId));
    setFormData(prev => ({
      ...prev,
      subtopicIds: prev.subtopicIds.filter((id: string) => id !== subtopicId),
    }));
  };

  const formats = [
    { value: 'NISH', label: 'НИШ' },
    { value: 'BIL', label: 'БИЛ' },
    { value: 'RFMSH', label: 'РФМШ' },
    { value: 'ENT', label: 'ЕНТ' },
    { value: 'OLYMPIAD', label: 'Олимпиадная' },
    { value: 'SAT', label: 'SAT' },
  ];

  const registerTextarea = useCallback((id: string, el: HTMLTextAreaElement | HTMLInputElement | null) => {
    if (el) {
      textareaRefs.current.set(id, el);
    } else {
      textareaRefs.current.delete(id);
    }
  }, []);

  const insertLatex = (latex: string) => {
    const element = textareaRefs.current.get(activeTextareaId);

    if (!element) {
      if (activeTextareaId.startsWith('question') || activeTextareaId.startsWith('hint') || activeTextareaId.startsWith('solution')) {
        const key = activeTextareaId as keyof typeof formData;
        setFormData(prev => ({
          ...prev,
          [key]: ((prev as any)[key] || '') + `$${latex}$`,
        }));
      }
      return;
    }

    const start = element.selectionStart || 0;
    const end = element.selectionEnd || 0;
    const text = element.value;

    let insideDollar = false;
    let dollarCount = 0;
    for (let i = 0; i < start; i++) {
      if (text[i] === '$') dollarCount++;
    }
    insideDollar = dollarCount % 2 === 1;

    const before = text.substring(0, start);
    const after = text.substring(end);
    const insertText = insideDollar ? latex : `$${latex}$`;
    const newText = before + insertText + after;

    if (activeTextareaId.startsWith('question') || activeTextareaId.startsWith('hint') || activeTextareaId.startsWith('solution')) {
      const key = activeTextareaId as keyof typeof formData;
      setFormData(prev => ({
        ...prev,
        [key]: newText,
      }));
    } else if (activeTextareaId.startsWith('option')) {
      const match = activeTextareaId.match(/option(\d+)(Ru|Kz|En)/);
      if (match) {
        const index = parseInt(match[1]);
        const lang = `text${match[2]}` as 'textRu' | 'textKz' | 'textEn';
        const newOptions = [...answerOptions];
        newOptions[index][lang] = newText;
        setAnswerOptions(newOptions);
      }
    }

    setTimeout(() => {
      element.focus();
      const newPos = start + insertText.length;
      element.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const addAnswerOption = () => {
    if (answerOptions.length < 8) {
      const newId = (answerOptions.length + 1).toString();
      setAnswerOptions([
        ...answerOptions,
        { id: newId, textRu: '', textKz: '', textEn: '', isCorrect: false, imageUrl: '' },
      ]);
    }
  };

  const removeAnswerOption = (id: string) => {
    if (answerOptions.length <= 2) {
      showToast({ message: 'Должно быть минимум 2 варианта ответа', type: 'warning' });
      return;
    }
    setAnswerOptions(answerOptions.filter(opt => opt.id !== id));
  };

  const toggleCorrectAnswer = (id: string) => {
    setAnswerOptions(
      answerOptions.map(opt =>
        opt.id === id ? { ...opt, isCorrect: !opt.isCorrect } : opt
      )
    );
  };

  const updateAnswerOption = (id: string, field: keyof AnswerOption, value: string | boolean) => {
    setAnswerOptions(
      answerOptions.map(opt =>
        opt.id === id ? { ...opt, [field]: value } : opt
      )
    );
  };

  const addGradeLevel = () => {
    if (gradeLevels.length < 11) {
      const usedGrades = gradeLevels.map(g => g.grade);
      const availableGrade = [4, 5, 6, 7, 8, 9, 10, 11].find(g => !usedGrades.includes(g)) || 7;
      setGradeLevels([...gradeLevels, { grade: availableGrade, difficulty: 3 }]);
    }
  };

  const removeGradeLevel = (index: number) => {
    if (gradeLevels.length > 1) {
      setGradeLevels(gradeLevels.filter((_, i) => i !== index));
    }
  };

  const updateGradeLevel = (index: number, field: 'grade' | 'difficulty', value: number) => {
    const newLevels = [...gradeLevels];
    newLevels[index][field] = value;
    setGradeLevels(newLevels);
  };

  const getCurrentQuestion = () => {
    switch (activeLanguage) {
      case 'kz': return formData.questionKz;
      case 'en': return formData.questionEn;
      default: return formData.questionRu;
    }
  };

  const getCurrentHint = () => {
    switch (activeLanguage) {
      case 'kz': return formData.hintKz;
      case 'en': return formData.hintEn;
      default: return formData.hintRu;
    }
  };

  const getCurrentSolution = () => {
    switch (activeLanguage) {
      case 'kz': return formData.solutionKz;
      case 'en': return formData.solutionEn;
      default: return formData.solutionRu;
    }
  };

  const getOptionText = (option: AnswerOption) => {
    switch (activeLanguage) {
      case 'kz': return option.textKz;
      case 'en': return option.textEn;
      default: return option.textRu;
    }
  };

  const handleSave = async () => {
    if (formData.subtopicIds.length === 0 || !formData.questionRu || !formData.solutionRu) {
      showToast({ message: 'Заполните обязательные поля (выберите хотя бы одну тему, вопрос и решение на русском языке)', type: 'warning' });
      return;
    }

    if (gradeLevels.length === 0) {
      showToast({ message: 'Добавьте хотя бы один класс', type: 'warning' });
      return;
    }

    const hasCorrectAnswer = answerOptions.some(opt => opt.isCorrect);
    if (!hasCorrectAnswer) {
      showToast({ message: 'Выберите хотя бы один правильный ответ', type: 'warning' });
      return;
    }

    try {
      const taskData = {
        ...formData,
        // For backward compatibility, set subtopicId to first selected subtopic
        subtopicId: formData.subtopicIds[0],
        questionText: formData.questionRu,
        hintText: formData.hintRu,
        solutionText: formData.solutionRu,
        gradeLevels: gradeLevels.map(g => ({
          grade: g.grade,
          difficulty: g.difficulty <= 2 ? 'EASY' : g.difficulty <= 4 ? 'MEDIUM' : 'HARD'
        })),
        answerOptions: JSON.stringify(answerOptions.map(opt => ({
          ...opt,
          text: opt.textRu,
        }))),
      };

      const method = task?.id ? 'PUT' : 'POST';
      const url = task?.id ? `/api/tasks/${task.id}` : '/api/tasks';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });

      if (response.ok) {
        if (onSave) {
          onSave({ ...formData, answerOptions, gradeLevels, selectedSubtopics });
        }
        onClose();
      } else {
        const error = await response.json();
        showToast({ message: `Ошибка: ${error.message || 'Не удалось сохранить задачу'}`, type: 'error' });
      }
    } catch (error) {
      console.error('Failed to save task:', error);
      showToast({ message: 'Ошибка при сохранении задачи', type: 'error' });
    }
  };

  const LanguageTabs = () => (
    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
      {(['kz', 'ru', 'en'] as LanguageTab[]).map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => setActiveLanguage(lang)}
          className={`px-3 py-1 text-sm font-medium rounded-md transition ${
            activeLanguage === lang
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Main slide-over container */}
      <div className="relative ml-auto flex h-full w-full max-w-6xl bg-white shadow-2xl">
        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {task ? 'Редактировать задачу' : 'Новая задача'}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">Заполните информацию о задании</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Subject, Topic, Subtopic Card */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Темы задачи</h3>

                {/* Selected subtopics */}
                {selectedSubtopics.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Выбранные темы ({selectedSubtopics.length})
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {selectedSubtopics.map((subtopic) => (
                        <div
                          key={subtopic.id}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-sm"
                        >
                          <span className="text-blue-800">
                            {subtopic.subjectName} → {subtopic.topicName} → {subtopic.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeSubtopic(subtopic.id)}
                            className="text-blue-400 hover:text-red-500 transition"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add new subtopic */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Добавить тему
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Предмет</label>
                      <select
                        value={selectedSubject}
                        onChange={(e) => {
                          setSelectedSubject(e.target.value);
                          setSelectedTopic('');
                          setCurrentSubtopicId('');
                        }}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white"
                      >
                        <option value="">Выберите предмет</option>
                        {subjects.map((subject) => (
                          <option key={subject.id} value={subject.id}>
                            {subject.nameRu || subject.nameKz}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Тема</label>
                      <select
                        value={selectedTopic}
                        onChange={(e) => {
                          setSelectedTopic(e.target.value);
                          setCurrentSubtopicId('');
                        }}
                        disabled={!selectedSubjectData}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white disabled:bg-gray-100"
                      >
                        <option value="">Выберите тему</option>
                        {selectedSubjectData?.taskTopics.map((topic: any) => (
                          <option key={topic.id} value={topic.id}>
                            {topic.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Подтема</label>
                      <select
                        value={currentSubtopicId}
                        onChange={(e) => setCurrentSubtopicId(e.target.value)}
                        disabled={!selectedTopicData}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white disabled:bg-gray-100"
                      >
                        <option value="">Выберите подтему</option>
                        {selectedTopicData?.subtopics.map((subtopic: any) => (
                          <option
                            key={subtopic.id}
                            value={subtopic.id}
                            disabled={selectedSubtopics.some(s => s.id === subtopic.id)}
                          >
                            {subtopic.name} {selectedSubtopics.some(s => s.id === subtopic.id) ? '(добавлено)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={addSubtopic}
                    disabled={!currentSubtopicId}
                    className="mt-3 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Добавить тему
                  </button>
                </div>

                {/* Format and Source */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Формат <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.format}
                      onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white"
                    >
                      {formats.map((format) => (
                        <option key={format.value} value={format.value}>
                          {format.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Источник
                    </label>
                    <select
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white"
                    >
                      <option value="">Не указан</option>
                      <option value="gorbach">Горбачёв Н. В. Сборник олимпиадных задач по математике</option>
                      <option value="ertis">Ertis Academy</option>
                    </select>
                  </div>
                </div>

                {/* Tags */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Теги
                  </label>
                  <div className="flex gap-4">
                    {['ГОСО', 'Ertis Academy', 'Проверено'].map((tag) => (
                      <label key={tag} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.tags.includes(tag)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, tags: [...formData.tags, tag] });
                            } else {
                              setFormData({ ...formData, tags: formData.tags.filter((t: string) => t !== tag) });
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm text-gray-700">{tag}</span>
                        {tag === 'Проверено' && (
                          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Grade Levels with Star Rating */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Классы и сложность</h3>
                  {gradeLevels.length < 11 && (
                    <button
                      type="button"
                      onClick={addGradeLevel}
                      className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      + Добавить класс
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {gradeLevels.map((level, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                      <div className="flex-shrink-0">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Класс</label>
                        <select
                          value={level.grade}
                          onChange={(e) => updateGradeLevel(index, 'grade', parseInt(e.target.value))}
                          className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white"
                        >
                          {[4, 5, 6, 7, 8, 9, 10, 11].map((g) => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Сложность</label>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => updateGradeLevel(index, 'difficulty', d)}
                              className="p-1 transition hover:scale-110"
                            >
                              <svg
                                className={`w-7 h-7 ${d <= level.difficulty ? 'text-yellow-400' : 'text-gray-300'}`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            </button>
                          ))}
                        </div>
                      </div>

                      {gradeLevels.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeGradeLevel(index)}
                          className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Question Text with Language Tabs */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Текст вопроса</h3>
                  <LanguageTabs />
                </div>

                <div>
                  {/* Russian */}
                  <div className={activeLanguage === 'ru' ? '' : 'hidden'}>
                    <textarea
                      ref={(el) => registerTextarea('questionRu', el)}
                      value={formData.questionRu}
                      onChange={(e) => setFormData({ ...formData, questionRu: e.target.value })}
                      onFocus={() => setActiveTextareaId('questionRu')}
                      rows={4}
                      placeholder="Введите текст вопроса на русском языке"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>

                  {/* Kazakh */}
                  <div className={activeLanguage === 'kz' ? '' : 'hidden'}>
                    <textarea
                      ref={(el) => registerTextarea('questionKz', el)}
                      value={formData.questionKz}
                      onChange={(e) => setFormData({ ...formData, questionKz: e.target.value })}
                      onFocus={() => setActiveTextareaId('questionKz')}
                      rows={4}
                      placeholder="Сұрақ мәтінін қазақ тілінде енгізіңіз"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>

                  {/* English */}
                  <div className={activeLanguage === 'en' ? '' : 'hidden'}>
                    <textarea
                      ref={(el) => registerTextarea('questionEn', el)}
                      value={formData.questionEn}
                      onChange={(e) => setFormData({ ...formData, questionEn: e.target.value })}
                      onFocus={() => setActiveTextareaId('questionEn')}
                      rows={4}
                      placeholder="Enter question text in English"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>

                  {/* Question Image Upload */}
                  <ImageUpload
                    value={formData.questionImage}
                    onChange={(url) => setFormData({ ...formData, questionImage: url })}
                    label="Изображение вопроса"
                  />

                  {/* Preview */}
                  {getCurrentQuestion() && (
                    <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                      <p className="text-xs font-medium text-blue-700 mb-2">Предпросмотр:</p>
                      <LatexRenderer text={getCurrentQuestion()} className="text-sm text-gray-900" />
                      {formData.questionImage && (
                        <img src={formData.questionImage} alt="Question" className="mt-2 max-h-40 rounded-lg" />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Answer Options */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Варианты ответов</h3>
                  <div className="flex items-center gap-3">
                    <LanguageTabs />
                    {answerOptions.length < 8 && (
                      <button
                        type="button"
                        onClick={addAnswerOption}
                        className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                      >
                        + Добавить
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {answerOptions.map((option, index) => (
                    <div
                      key={option.id}
                      className={`p-4 border-2 rounded-xl transition ${
                        option.isCorrect
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      {/* Header row with number, correct checkbox */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                            option.isCorrect ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'
                          }`}>
                            {index + 1}
                          </span>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={option.isCorrect}
                              onChange={() => toggleCorrectAnswer(option.id)}
                              className="w-4 h-4 text-green-600 rounded"
                            />
                            <span className={`text-sm font-medium ${
                              option.isCorrect ? 'text-green-700' : 'text-gray-600'
                            }`}>
                              Правильный
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* Content row: textarea on left, image upload on right */}
                      <div className="flex gap-4 items-stretch">
                        {/* Russian */}
                        <textarea
                          ref={(el) => registerTextarea(`option${index}Ru`, el)}
                          value={option.textRu}
                          onChange={(e) => updateAnswerOption(option.id, 'textRu', e.target.value)}
                          onFocus={() => setActiveTextareaId(`option${index}Ru`)}
                          placeholder="Текст ответа (RU)"
                          rows={2}
                          className={`flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y min-h-[80px] ${activeLanguage !== 'ru' ? 'hidden' : ''}`}
                        />
                        {/* Kazakh */}
                        <textarea
                          ref={(el) => registerTextarea(`option${index}Kz`, el)}
                          value={option.textKz}
                          onChange={(e) => updateAnswerOption(option.id, 'textKz', e.target.value)}
                          onFocus={() => setActiveTextareaId(`option${index}Kz`)}
                          placeholder="Жауап мәтіні (KZ)"
                          rows={2}
                          className={`flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y min-h-[80px] ${activeLanguage !== 'kz' ? 'hidden' : ''}`}
                        />
                        {/* English */}
                        <textarea
                          ref={(el) => registerTextarea(`option${index}En`, el)}
                          value={option.textEn}
                          onChange={(e) => updateAnswerOption(option.id, 'textEn', e.target.value)}
                          onFocus={() => setActiveTextareaId(`option${index}En`)}
                          placeholder="Answer text (EN)"
                          rows={2}
                          className={`flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y min-h-[80px] ${activeLanguage !== 'en' ? 'hidden' : ''}`}
                        />

                        {/* Image upload on right - stretches with textarea */}
                        <div className="flex-shrink-0 w-32">
                          {option.imageUrl ? (
                            <div className="relative h-full">
                              <img src={option.imageUrl} alt="Preview" className="w-full h-full object-cover rounded-lg border border-gray-200 min-h-[80px]" />
                              <button
                                type="button"
                                onClick={() => updateAnswerOption(option.id, 'imageUrl', '')}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center w-full h-full min-h-[80px] border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = () => updateAnswerOption(option.id, 'imageUrl', reader.result as string);
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="hidden"
                              />
                              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="text-xs text-gray-500 mt-1">Изображение</span>
                            </label>
                          )}
                        </div>
                      </div>

                      {/* Option Preview - below the input row */}
                      {getOptionText(option) && (
                        <div className="mt-3 p-3 bg-white border border-gray-200 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Предпросмотр:</p>
                          <LatexRenderer text={getOptionText(option)} className="text-sm text-gray-900" />
                          {option.imageUrl && (
                            <img src={option.imageUrl} alt={`Option ${index + 1}`} className="mt-2 max-h-24 rounded" />
                          )}
                        </div>
                      )}

                      {/* Delete button at bottom */}
                      {answerOptions.length > 2 && (
                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeAnswerOption(option.id)}
                            className="flex items-center gap-1 px-3 py-1.5 text-red-500 hover:bg-red-100 rounded-lg transition text-sm"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>Удалить</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Hint with Language Tabs */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Подсказка</h3>
                  <LanguageTabs />
                </div>

                <div>
                  {/* Russian */}
                  <div className={activeLanguage === 'ru' ? '' : 'hidden'}>
                    <textarea
                      ref={(el) => registerTextarea('hintRu', el)}
                      value={formData.hintRu}
                      onChange={(e) => setFormData({ ...formData, hintRu: e.target.value })}
                      onFocus={() => setActiveTextareaId('hintRu')}
                      rows={2}
                      placeholder="Краткая подсказка для ученика"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>

                  {/* Kazakh */}
                  <div className={activeLanguage === 'kz' ? '' : 'hidden'}>
                    <textarea
                      ref={(el) => registerTextarea('hintKz', el)}
                      value={formData.hintKz}
                      onChange={(e) => setFormData({ ...formData, hintKz: e.target.value })}
                      onFocus={() => setActiveTextareaId('hintKz')}
                      rows={2}
                      placeholder="Оқушыға қысқа кеңес"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>

                  {/* English */}
                  <div className={activeLanguage === 'en' ? '' : 'hidden'}>
                    <textarea
                      ref={(el) => registerTextarea('hintEn', el)}
                      value={formData.hintEn}
                      onChange={(e) => setFormData({ ...formData, hintEn: e.target.value })}
                      onFocus={() => setActiveTextareaId('hintEn')}
                      rows={2}
                      placeholder="Short hint for the student"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>

                  {/* Preview */}
                  {getCurrentHint() && (
                    <div className="mt-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                      <p className="text-xs font-medium text-yellow-700 mb-2">Предпросмотр:</p>
                      <LatexRenderer text={getCurrentHint()} className="text-sm text-gray-900" />
                    </div>
                  )}
                </div>
              </div>

              {/* Solution with Language Tabs */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Решение</h3>
                  <LanguageTabs />
                </div>

                <div>
                  {/* Russian */}
                  <div className={activeLanguage === 'ru' ? '' : 'hidden'}>
                    <textarea
                      ref={(el) => registerTextarea('solutionRu', el)}
                      value={formData.solutionRu}
                      onChange={(e) => setFormData({ ...formData, solutionRu: e.target.value })}
                      onFocus={() => setActiveTextareaId('solutionRu')}
                      rows={6}
                      placeholder="Пошаговое решение задачи с объяснениями на русском языке"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>

                  {/* Kazakh */}
                  <div className={activeLanguage === 'kz' ? '' : 'hidden'}>
                    <textarea
                      ref={(el) => registerTextarea('solutionKz', el)}
                      value={formData.solutionKz}
                      onChange={(e) => setFormData({ ...formData, solutionKz: e.target.value })}
                      onFocus={() => setActiveTextareaId('solutionKz')}
                      rows={6}
                      placeholder="Есептің қадамдық шешімін қазақ тілінде түсіндірумен"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>

                  {/* English */}
                  <div className={activeLanguage === 'en' ? '' : 'hidden'}>
                    <textarea
                      ref={(el) => registerTextarea('solutionEn', el)}
                      value={formData.solutionEn}
                      onChange={(e) => setFormData({ ...formData, solutionEn: e.target.value })}
                      onFocus={() => setActiveTextareaId('solutionEn')}
                      rows={6}
                      placeholder="Step-by-step solution of the task with explanations in English"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>

                  {/* Preview */}
                  {getCurrentSolution() && (
                    <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                      <p className="text-xs font-medium text-blue-700 mb-2">Предпросмотр:</p>
                      <LatexRenderer text={getCurrentSolution()} className="text-sm text-gray-900" />
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4 justify-center pb-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={task ? "M5 13l4 4L19 7" : "M12 4v16m8-8H4"} />
                  </svg>
                  {task ? 'Сохранить изменения' : 'Создать задачу'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* LaTeX Panel - Right Side (Sticky) */}
        <div className="hidden lg:block w-72 border-l border-gray-200 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
          <div className="sticky top-0 p-4 max-h-screen overflow-y-auto">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              <span className="text-sm font-bold text-gray-800">LaTeX Символы</span>
            </div>
            <p className="text-xs text-gray-500 mb-4">Нажмите на символ для вставки</p>

            <div className="space-y-2">
              {latexCategories.map((category) => (
                <div key={category.name} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedCategory(expandedCategory === category.name ? null : category.name)}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 flex justify-between items-center"
                  >
                    <span>{category.name}</span>
                    <svg
                      className={`w-4 h-4 transition-transform ${expandedCategory === category.name ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expandedCategory === category.name && (
                    <div className="px-2 pb-2 flex flex-wrap gap-1">
                      {category.symbols.map((sample) => (
                        <button
                          key={sample.label}
                          type="button"
                          onClick={() => insertLatex(sample.latex)}
                          className="px-2 py-1 text-xs font-medium bg-gray-50 border border-gray-200 rounded hover:bg-blue-100 hover:border-blue-300 text-gray-700 transition"
                        >
                          {sample.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
