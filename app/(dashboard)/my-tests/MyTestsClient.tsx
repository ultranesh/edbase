'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNotification } from '@/app/components/ui/NotificationProvider';
import LatexRenderer from '@/components/LatexRenderer';
import { scanBlank, createScanPreview, ScanResult, GridBoundsRatio } from '@/lib/blankScanner';
import InteractiveOverlay from '@/app/components/InteractiveOverlay';

interface GeneratedTest {
  id: string;
  title: string;
  titleKz: string | null;
  titleEn: string | null;
  format: 'TEST' | 'EXAM';
  gradeLevel: number | null;
  duration: number | null;
  taskIds: string[];
  topicIds: string[] | null;
  difficultyConfig: { easy?: number; medium?: number; hard?: number } | null;
  isShared: boolean;
  createdAt: string;
  subject: {
    id: string;
    nameRu: string | null;
    nameKz: string | null;
  } | null;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  sharedWith?: Array<{
    sharedWith: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }>;
  canEdit?: boolean;
  sharedAt?: string;
}

interface Subject {
  id: string;
  nameRu: string | null;
  nameKz: string | null;
}

interface Topic {
  id: string;
  name: string;
  nameKz: string | null;
  subjectId: string;
  gradeLevel: number;
  parentId: string | null;
  children?: Topic[];
  _count?: { tasks: number };
}

interface TaskCountByTopic {
  [topicId: string]: number;
}

interface DifficultyConfig {
  easy: number;
  medium: number;
  hard: number;
}

interface MyTestsClientProps {
  isDiagnostic?: boolean;
}

export default function MyTestsClient({ isDiagnostic = false }: MyTestsClientProps) {
  const { showToast, showConfirm } = useNotification();
  const locale = 'ru' as 'ru' | 'kz' | 'en'; // Fixed to Russian for now

  // Main tabs: my tests / shared with me
  const [activeTab, setActiveTab] = useState<'my' | 'shared'>('my');
  const [myTests, setMyTests] = useState<GeneratedTest[]>([]);
  const [sharedTests, setSharedTests] = useState<GeneratedTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false);

  // Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<'all' | 'TEST' | 'EXAM'>('all');
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Pagination
  const [myPage, setMyPage] = useState(1);
  const [sharedPage, setSharedPage] = useState(1);
  const TESTS_PER_PAGE = 10;

  // Generator modal
  const [showGenerator, setShowGenerator] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [generating, setGenerating] = useState(false);

  // Generator form
  const [genForm, setGenForm] = useState({
    title: '',
    titleKz: '',
    titleEn: '',
    format: 'TEST' as 'TEST' | 'EXAM',
    subjectId: '',
    gradeLevel: 11,
    duration: 60,
    taskCount: 20,
    selectedTopics: [] as string[],
    topicCounts: {} as TaskCountByTopic,
    difficultyConfig: { easy: 5, medium: 10, hard: 5 } as DifficultyConfig,
    useDifficulty: false,
    useTopics: false,
  });
  const [titleLang, setTitleLang] = useState<'kz' | 'ru' | 'en'>('kz');
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  // Preview / Download modal
  const [previewTest, setPreviewTest] = useState<GeneratedTest | null>(null);
  const [previewTasks, setPreviewTasks] = useState<Array<{
    id: string;
    question: string;
    questionKz?: string;
    questionRu?: string;
    questionEn?: string;
    questionImage?: string | null;
    options: string[];
    optionsKz?: string[];
    optionsRu?: string[];
    optionsEn?: string[];
    correctAnswer: number;
    explanation: string | null;
    explanationKz?: string | null;
    explanationRu?: string | null;
    explanationEn?: string | null;
    hint?: string | null;
    hintKz?: string | null;
    hintRu?: string | null;
    hintEn?: string | null;
    difficulty: number;
    topic: { name: string; nameKz?: string | null; nameRu?: string | null; nameEn?: string | null } | null;
    linkedSubtopics?: Array<{
      id: string;
      name: string;
      nameKz?: string | null;
      nameRu?: string | null;
      nameEn?: string | null;
      topic?: { id: string; name: string; nameKz?: string | null; nameRu?: string | null; nameEn?: string | null } | null;
    }>;
  }>>([]);
  const [downloadLang, setDownloadLang] = useState<'ru' | 'kz' | 'en'>('kz');
  const [showPreview, setShowPreview] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Share modal
  const [shareTest, setShareTest] = useState<GeneratedTest | null>(null);
  const [sharePhone, setSharePhone] = useState('');
  const [sharing, setSharing] = useState(false);

  // Check test modal
  const [checkTest, setCheckTest] = useState<GeneratedTest | null>(null);
  const [checkMode, setCheckMode] = useState<'upload' | 'manual'>('upload');
  const [manualAnswers, setManualAnswers] = useState<(number | null)[]>([]);
  const [manualStudentName, setManualStudentName] = useState('');
  const [manualStudentClass, setManualStudentClass] = useState('');
  const [savingResult, setSavingResult] = useState(false);
  const [checkTaskTopics, setCheckTaskTopics] = useState<Array<{ id: string; topicName: string; topicNameKz: string | null }>>([]);
  const [answerKey, setAnswerKey] = useState<(number | null)[]>([]);
  const [showAnswerKeyInput, setShowAnswerKeyInput] = useState(false);

  // Results modal
  const [resultsTest, setResultsTest] = useState<GeneratedTest | null>(null);
  const [testResults, setTestResults] = useState<Array<{
    id: string;
    studentName: string | null;
    studentClass: string | null;
    correctCount: number;
    totalQuestions: number;
    percentage: number;
    answers: (number | null)[];
    scannedAt: string;
  }>>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  // Scanning state
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [reportingError, setReportingError] = useState(false);
  const [errorReported, setErrorReported] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const filterPanelRef = useRef<HTMLDivElement>(null);

  // Interactive overlay calibration
  const [showOverlay, setShowOverlay] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Edit topics modal
  const [showEditTopics, setShowEditTopics] = useState(false);
  const [editTopicsLoading, setEditTopicsLoading] = useState(false);
  const [savingTopics, setSavingTopics] = useState(false);
  const [availableTopics, setAvailableTopics] = useState<Array<{
    id: string;
    name: string;
    nameKz: string | null;
    nameRu: string | null;
  }>>([]);
  const [taskTopicSelections, setTaskTopicSelections] = useState<Record<string, string[]>>({});

  // Legacy calibration state (kept for compatibility)
  const [calibrationMode, setCalibrationMode] = useState(false);
  const [calibrationStep, setCalibrationStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  // Steps: 0=not started, 1=top-left, 2=top-right, 3=bottom-left, 4=bottom-right
  const [gridCalibration, setGridCalibration] = useState<{
    markerTL?: { x: number; y: number };
    markerTR?: { x: number; y: number };
    markerBL?: { x: number; y: number };
    markerBR?: { x: number; y: number };
  }>({});

  const translations = {
    ru: {
      title: 'Мои тесты',
      subtitle: 'Созданные тесты и тесты, которыми с вами поделились',
      myTests: 'Мои тесты',
      sharedWithMe: 'Мне предоставлены',
      generate: 'Создать тест',
      noMyTests: 'У вас еще нет созданных тестов',
      noSharedTests: 'С вами еще не поделились тестами',
      createFirst: 'Создайте свой первый тест',
      test: 'Тест',
      exam: 'Экзамен',
      questions: 'вопросов',
      minutes: 'мин',
      preview: 'Просмотр',
      download: 'Скачать',
      share: 'Поделиться',
      delete: 'Удалить',
      sharedBy: 'От',
      // Generator
      generatorTitle: 'Генератор тестов',
      testTitle: 'Название теста',
      format: 'Формат',
      subject: 'Предмет',
      selectSubject: 'Выберите предмет',
      grade: 'Класс',
      duration: 'Время (мин)',
      taskCount: 'Количество вопросов',
      topics: 'Темы',
      selectTopics: 'Выберите темы',
      noTopics: 'Нет тем для этого предмета и класса',
      questionsPerTopic: 'Вопросов с темы',
      difficulty: 'Сложность',
      easy: 'Легкий',
      medium: 'Средний',
      hard: 'Сложный',
      useDifficulty: 'Распределить по сложности',
      useTopics: 'Выбрать по темам',
      cancel: 'Отмена',
      create: 'Создать',
      creating: 'Создание...',
      // Preview
      previewTitle: 'Просмотр теста',
      downloadTest: 'Скачать тест',
      downloadKeys: 'Скачать ключи',
      downloadSolutions: 'Скачать решения',
      downloadBlank: 'Скачать бланк',
      language: 'Язык',
      question: 'Вопрос',
      answer: 'Ответ',
      explanation: 'Объяснение',
      close: 'Закрыть',
      // Share
      shareTitle: 'Поделиться тестом',
      enterPhone: 'Введите номер телефона',
      shareBtn: 'Поделиться',
      shareSuccess: 'Тест успешно отправлен',
      shareError: 'Не удалось поделиться тестом',
      userNotFound: 'Пользователь не найден',
      deleteConfirm: 'Удалить этот тест?',
      deleted: 'Тест удален',
      // Check test
      checkTest: 'Проверить тест',
      checkTestTitle: 'Проверка теста',
      uploadPhoto: 'Загрузить фото',
      takePhoto: 'Сделать фото',
      orDragDrop: 'или перетащите файл сюда',
      processing: 'Обработка...',
      scanAgain: 'Сканировать еще',
      results: 'Результаты',
      viewResults: 'Результаты',
      noResults: 'Нет результатов проверки',
      studentName: 'Имя ученика',
      studentClass: 'Класс',
      score: 'Баллы',
      date: 'Дата',
      correct: 'Правильно',
      incorrect: 'Неправильно',
      skipped: 'Пропущено',
      enterManually: 'Ввести вручную',
      saveResult: 'Сохранить результат',
      resultSaved: 'Результат сохранен',
      answerKey: 'Ключ ответов',
      enterAnswerKey: 'Введите правильные ответы',
      correctAnswer: 'Правильный ответ',
      // Pagination
      page: 'Страница',
      of: 'из',
      prev: 'Назад',
      next: 'Вперед',
      // Edit topics
      editTopics: 'Редактировать темы',
      editTopicsTitle: 'Редактирование тем задач',
      selectTopicsForTask: 'Выберите темы',
      noTopicsSelected: 'Темы не выбраны',
      saveTopics: 'Сохранить',
      topicsSaved: 'Темы сохранены',
      topicsSaveError: 'Ошибка сохранения тем',
    },
    kz: {
      title: 'Менің тесттерім',
      subtitle: 'Жасалған тесттер және сізбен бөліскен тесттер',
      myTests: 'Менің тесттерім',
      sharedWithMe: 'Маған берілген',
      generate: 'Тест жасау',
      noMyTests: 'Сізде жасалған тесттер жоқ',
      noSharedTests: 'Сізбен әлі тесттер бөліспеген',
      createFirst: 'Алғашқы тестіңізді жасаңыз',
      test: 'Тест',
      exam: 'Емтихан',
      questions: 'сұрақ',
      minutes: 'мин',
      preview: 'Қарау',
      download: 'Жүктеу',
      share: 'Бөлісу',
      delete: 'Жою',
      sharedBy: 'Кімнен',
      // Generator
      generatorTitle: 'Тест генераторы',
      testTitle: 'Тест атауы',
      format: 'Формат',
      subject: 'Пән',
      selectSubject: 'Пәнді таңдаңыз',
      grade: 'Сынып',
      duration: 'Уақыт (мин)',
      taskCount: 'Сұрақ саны',
      topics: 'Тақырыптар',
      selectTopics: 'Тақырыптарды таңдаңыз',
      noTopics: 'Бұл пән мен сынып үшін тақырыптар жоқ',
      questionsPerTopic: 'Тақырыптан сұрақтар',
      difficulty: 'Қиындық',
      easy: 'Жеңіл',
      medium: 'Орташа',
      hard: 'Қиын',
      useDifficulty: 'Қиындыққа бөлу',
      useTopics: 'Тақырыптар бойынша таңдау',
      cancel: 'Бас тарту',
      create: 'Жасау',
      creating: 'Жасалуда...',
      // Preview
      previewTitle: 'Тестті қарау',
      downloadTest: 'Тестті жүктеу',
      downloadKeys: 'Кілттерді жүктеу',
      downloadSolutions: 'Шешімдерді жүктеу',
      downloadBlank: 'Бланкты жүктеу',
      language: 'Тіл',
      question: 'Сұрақ',
      answer: 'Жауап',
      explanation: 'Түсіндірме',
      close: 'Жабу',
      // Share
      shareTitle: 'Тестпен бөлісу',
      enterPhone: 'Телефон нөмірін енгізіңіз',
      shareBtn: 'Бөлісу',
      shareSuccess: 'Тест сәтті жіберілді',
      shareError: 'Тестпен бөлісу мүмкін болмады',
      userNotFound: 'Қолданушы табылмады',
      deleteConfirm: 'Бұл тестті жою керек пе?',
      deleted: 'Тест жойылды',
      // Check test
      checkTest: 'Тестті тексеру',
      checkTestTitle: 'Тестті тексеру',
      uploadPhoto: 'Фото жүктеу',
      takePhoto: 'Фото түсіру',
      orDragDrop: 'немесе файлды осында сүйреңіз',
      processing: 'Өңделуде...',
      scanAgain: 'Қайта сканерлеу',
      results: 'Нәтижелер',
      viewResults: 'Нәтижелер',
      noResults: 'Тексеру нәтижелері жоқ',
      studentName: 'Оқушы аты',
      studentClass: 'Сынып',
      score: 'Балл',
      date: 'Күні',
      correct: 'Дұрыс',
      incorrect: 'Қате',
      skipped: 'Өткізілген',
      enterManually: 'Қолмен енгізу',
      saveResult: 'Нәтижені сақтау',
      resultSaved: 'Нәтиже сақталды',
      answerKey: 'Жауап кілті',
      enterAnswerKey: 'Дұрыс жауаптарды енгізіңіз',
      correctAnswer: 'Дұрыс жауап',
      // Pagination
      page: 'Бет',
      of: '/',
      prev: 'Артқа',
      next: 'Алға',
      // Edit topics
      editTopics: 'Тақырыптарды өзгерту',
      editTopicsTitle: 'Тапсырмалар тақырыптарын өзгерту',
      selectTopicsForTask: 'Тақырыптарды таңдаңыз',
      noTopicsSelected: 'Тақырыптар таңдалмаған',
      saveTopics: 'Сақтау',
      topicsSaved: 'Тақырыптар сақталды',
      topicsSaveError: 'Тақырыптарды сақтау қатесі',
    },
    en: {
      title: 'My Tests',
      subtitle: 'Created tests and tests shared with you',
      myTests: 'My Tests',
      sharedWithMe: 'Shared with me',
      generate: 'Create Test',
      noMyTests: 'You have no created tests yet',
      noSharedTests: 'No tests have been shared with you yet',
      createFirst: 'Create your first test',
      test: 'Test',
      exam: 'Exam',
      questions: 'questions',
      minutes: 'min',
      preview: 'Preview',
      download: 'Download',
      share: 'Share',
      delete: 'Delete',
      sharedBy: 'From',
      // Generator
      generatorTitle: 'Test Generator',
      testTitle: 'Test title',
      format: 'Format',
      subject: 'Subject',
      selectSubject: 'Select subject',
      grade: 'Grade',
      duration: 'Duration (min)',
      taskCount: 'Number of questions',
      topics: 'Topics',
      selectTopics: 'Select topics',
      noTopics: 'No topics for this subject and grade',
      questionsPerTopic: 'Questions per topic',
      difficulty: 'Difficulty',
      easy: 'Easy',
      medium: 'Medium',
      hard: 'Hard',
      useDifficulty: 'Distribute by difficulty',
      useTopics: 'Select by topics',
      cancel: 'Cancel',
      create: 'Create',
      creating: 'Creating...',
      // Preview
      previewTitle: 'Test Preview',
      downloadTest: 'Download test',
      downloadKeys: 'Download keys',
      downloadSolutions: 'Download solutions',
      downloadBlank: 'Download blank',
      language: 'Language',
      question: 'Question',
      answer: 'Answer',
      explanation: 'Explanation',
      close: 'Close',
      // Share
      shareTitle: 'Share Test',
      enterPhone: 'Enter phone number',
      shareBtn: 'Share',
      shareSuccess: 'Test shared successfully',
      shareError: 'Failed to share test',
      userNotFound: 'User not found',
      deleteConfirm: 'Delete this test?',
      deleted: 'Test deleted',
      // Check test
      checkTest: 'Check test',
      checkTestTitle: 'Check test',
      uploadPhoto: 'Upload photo',
      takePhoto: 'Take photo',
      orDragDrop: 'or drag and drop file here',
      processing: 'Processing...',
      scanAgain: 'Scan again',
      results: 'Results',
      viewResults: 'Results',
      noResults: 'No check results',
      studentName: 'Student name',
      studentClass: 'Class',
      score: 'Score',
      date: 'Date',
      correct: 'Correct',
      incorrect: 'Incorrect',
      skipped: 'Skipped',
      enterManually: 'Enter manually',
      saveResult: 'Save result',
      resultSaved: 'Result saved',
      answerKey: 'Answer Key',
      enterAnswerKey: 'Enter correct answers',
      correctAnswer: 'Correct answer',
      // Pagination
      page: 'Page',
      of: 'of',
      prev: 'Previous',
      next: 'Next',
      // Edit topics
      editTopics: 'Edit topics',
      editTopicsTitle: 'Edit task topics',
      selectTopicsForTask: 'Select topics',
      noTopicsSelected: 'No topics selected',
      saveTopics: 'Save',
      topicsSaved: 'Topics saved',
      topicsSaveError: 'Failed to save topics',
    },
  };

  const tr = translations[downloadLang as keyof typeof translations] || translations.ru;

  // Filter tests based on search and format filter
  const filterTests = (tests: GeneratedTest[]) => {
    return tests.filter(test => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const titleMatch = test.title?.toLowerCase().includes(query) ||
                          test.titleKz?.toLowerCase().includes(query) ||
                          test.titleEn?.toLowerCase().includes(query);
        const subjectMatch = test.subject?.nameRu?.toLowerCase().includes(query) ||
                            test.subject?.nameKz?.toLowerCase().includes(query);
        if (!titleMatch && !subjectMatch) return false;
      }
      // Format filter
      if (formatFilter !== 'all' && test.format !== formatFilter) return false;
      return true;
    });
  };

  const filteredMyTests = filterTests(myTests);
  const filteredSharedTests = filterTests(sharedTests);

  const fetchMyTests = useCallback(async () => {
    try {
      const res = await fetch(`/api/generated-tests?type=my&isDiagnostic=${isDiagnostic}`);
      if (res.ok) {
        const data = await res.json();
        setMyTests(data);
      }
    } catch (error) {
      console.error('Error fetching my tests:', error);
    }
  }, [isDiagnostic]);

  const fetchSharedTests = useCallback(async () => {
    try {
      const res = await fetch(`/api/generated-tests?type=shared&isDiagnostic=${isDiagnostic}`);
      if (res.ok) {
        const data = await res.json();
        setSharedTests(data);
      }
    } catch (error) {
      console.error('Error fetching shared tests:', error);
    }
  }, [isDiagnostic]);

  const fetchSubjects = useCallback(async () => {
    try {
      const res = await fetch('/api/subjects');
      if (res.ok) {
        const data = await res.json();
        setSubjects(data);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  }, []);

  const fetchTopics = useCallback(async () => {
    if (!genForm.subjectId) return;
    try {
      const res = await fetch(`/api/topics?subjectId=${genForm.subjectId}&gradeLevel=${genForm.gradeLevel}`);
      if (res.ok) {
        const data = await res.json();
        setTopics(data);
      }
    } catch (error) {
      console.error('Error fetching topics:', error);
    }
  }, [genForm.subjectId, genForm.gradeLevel]);

  useEffect(() => {
    Promise.all([fetchMyTests(), fetchSharedTests(), fetchSubjects()]).finally(() => {
      setIsLoading(false);
      setShowSkeleton(false);
    });
  }, [fetchMyTests, fetchSharedTests, fetchSubjects]);

  // Show skeleton only if loading takes more than 200ms
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => setShowSkeleton(true), 200);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // Close filter panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(event.target as Node)) {
        setShowFilterPanel(false);
      }
    };
    if (showFilterPanel) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilterPanel]);

  // Reset page when search or filter changes
  useEffect(() => {
    setMyPage(1);
    setSharedPage(1);
  }, [searchQuery, formatFilter]);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  const getTitle = (test: GeneratedTest) => {
    if (downloadLang === 'kz' && test.titleKz) return test.titleKz;
    if (downloadLang === 'en' && test.titleEn) return test.titleEn;
    return test.title;
  };

  const getSubjectName = (subject: Subject | null) => {
    if (!subject) return '';
    if (downloadLang === 'kz' && subject.nameKz) return subject.nameKz;
    return subject.nameRu || subject.nameKz || '';
  };

  const handleGenerate = async () => {
    if (!genForm.subjectId) {
      showToast({ message: 'Выберите предмет', type: 'error' });
      return;
    }

    setGenerating(true);
    try {
      const defaultTitle = `${getSubjectName(subjects.find(s => s.id === genForm.subjectId) || null)} - ${genForm.gradeLevel} ${locale === 'kz' ? 'сынып' : 'класс'}`;
      const payload: Record<string, unknown> = {
        title: genForm.title || defaultTitle,
        titleKz: genForm.titleKz || null,
        titleEn: genForm.titleEn || null,
        format: genForm.format,
        subjectId: genForm.subjectId,
        gradeLevel: genForm.gradeLevel,
        duration: genForm.duration,
        taskCount: genForm.taskCount,
        isDiagnostic,
      };

      if (genForm.useTopics && genForm.selectedTopics.length > 0) {
        payload.topicIds = genForm.selectedTopics;
        payload.topicConfig = genForm.topicCounts;
      }

      if (genForm.useDifficulty) {
        payload.difficultyConfig = genForm.difficultyConfig;
      }

      const res = await fetch('/api/generated-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        showToast({ message: 'Тест успешно создан!', type: 'success' });
        setShowGenerator(false);
        resetGenForm();
        fetchMyTests();
        // Open preview
        openPreview(data.test);
      } else {
        const error = await res.json();
        showToast({ message: error.error || 'Произошла ошибка', type: 'error' });
      }
    } catch (error) {
      console.error('Error generating test:', error);
      showToast({ message: 'Произошла ошибка', type: 'error' });
    } finally {
      setGenerating(false);
    }
  };

  const resetGenForm = () => {
    setGenForm({
      title: '',
      titleKz: '',
      titleEn: '',
      format: 'TEST',
      subjectId: '',
      gradeLevel: 11,
      duration: 60,
      taskCount: 20,
      selectedTopics: [],
      topicCounts: {},
      difficultyConfig: { easy: 5, medium: 10, hard: 5 },
      useDifficulty: false,
      useTopics: false,
    });
    setTopics([]);
    setTitleLang('kz');
  };

  const openPreview = async (test: GeneratedTest) => {
    setPreviewTest(test);
    setShowPreview(true);
    setLoadingPreview(true);

    try {
      const res = await fetch(`/api/generated-tests/${test.id}`);
      if (res.ok) {
        const data = await res.json();
        setPreviewTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Error fetching test details:', error);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDownload = async (type: 'test' | 'keys' | 'solutions' | 'blank') => {
    if (!previewTest) return;

    try {
      showToast({ message: 'Создание PDF...', type: 'info' });

      const res = await fetch(`/api/generated-tests/${previewTest.id}/pdf?type=${type}&lang=${downloadLang}`);

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        const fileName = type === 'test'
          ? `${getTitle(previewTest)}.pdf`
          : type === 'keys'
            ? `${getTitle(previewTest)}_keys.pdf`
            : type === 'blank'
              ? `${getTitle(previewTest)}_blank.pdf`
              : `${getTitle(previewTest)}_solutions.pdf`;

        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        showToast({ message: 'PDF скачан!', type: 'success' });
      } else {
        const error = await res.json();
        console.error('PDF generation error:', error);
        showToast({ message: 'Ошибка скачивания', type: 'error' });
      }
    } catch (error) {
      console.error('Error downloading:', error);
      showToast({ message: 'Ошибка скачивания', type: 'error' });
    }
  };

  const handleOpenEditTopics = async () => {
    if (!previewTest) return;

    setEditTopicsLoading(true);
    setShowEditTopics(true);

    try {
      // Load available topics (with cache bust to get fresh data)
      const subjectId = previewTest.subject?.id;
      const cacheBust = Date.now();
      const url = subjectId
        ? `/api/task-topics?subjectId=${subjectId}&_=${cacheBust}`
        : `/api/task-topics?_=${cacheBust}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const topics = await res.json();
        setAvailableTopics(topics);
      }

      // Initialize selections from current task topics
      const selections: Record<string, string[]> = {};
      for (const task of previewTasks) {
        const topicIds: string[] = [];
        if (task.linkedSubtopics) {
          task.linkedSubtopics.forEach(sub => {
            if (sub.topic && !topicIds.includes(sub.topic.id)) {
              topicIds.push(sub.topic.id);
            }
          });
        }
        selections[task.id] = topicIds;
      }
      setTaskTopicSelections(selections);
    } catch (error) {
      console.error('Error loading topics:', error);
      showToast({ message: 'Ошибка загрузки тем', type: 'error' });
    } finally {
      setEditTopicsLoading(false);
    }
  };

  const handleSaveTopics = async () => {
    setSavingTopics(true);

    try {
      let successCount = 0;
      const taskIds = Object.keys(taskTopicSelections);

      for (const taskId of taskIds) {
        const topicIds = taskTopicSelections[taskId];
        const res = await fetch(`/api/tasks/${taskId}/topics`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topicIds }),
        });

        if (res.ok) {
          successCount++;
        }
      }

      if (successCount === taskIds.length) {
        showToast({ message: tr.topicsSaved, type: 'success' });
        setShowEditTopics(false);
        // Reload preview to show updated topics
        if (previewTest) {
          openPreview(previewTest);
        }
      } else {
        showToast({ message: tr.topicsSaveError, type: 'error' });
      }
    } catch (error) {
      console.error('Error saving topics:', error);
      showToast({ message: tr.topicsSaveError, type: 'error' });
    } finally {
      setSavingTopics(false);
    }
  };

  const toggleTaskTopic = (taskId: string, topicId: string) => {
    setTaskTopicSelections(prev => {
      const current = prev[taskId] || [];
      const newSelection = current.includes(topicId)
        ? current.filter(id => id !== topicId)
        : [...current, topicId];
      return { ...prev, [taskId]: newSelection };
    });
  };

  const handleShare = async () => {
    if (!shareTest || !sharePhone.trim()) return;

    setSharing(true);
    try {
      const res = await fetch(`/api/generated-tests/${shareTest.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: sharePhone.trim(), canEdit: false }),
      });

      if (res.ok) {
        showToast({ message: tr.shareSuccess, type: 'success' });
        setShareTest(null);
        setSharePhone('');
        fetchMyTests();
      } else {
        const error = await res.json();
        if (error.error?.includes('not found')) {
          showToast({ message: tr.userNotFound, type: 'error' });
        } else {
          showToast({ message: tr.shareError, type: 'error' });
        }
      }
    } catch (error) {
      console.error('Error sharing test:', error);
      showToast({ message: tr.shareError, type: 'error' });
    } finally {
      setSharing(false);
    }
  };

  const handleDelete = async (testId: string) => {
    const confirmed = await showConfirm({
      title: tr.delete,
      message: tr.deleteConfirm,
      confirmText: tr.delete,
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/generated-tests/${testId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        showToast({ message: tr.deleted, type: 'success' });
        fetchMyTests();
      }
    } catch (error) {
      console.error('Error deleting test:', error);
    }
  };

  const openCheckModal = async (test: GeneratedTest) => {
    setCheckTest(test);
    setCheckMode('upload');
    setManualAnswers(new Array(test.taskIds.length).fill(null));
    setAnswerKey(new Array(test.taskIds.length).fill(null));
    setShowAnswerKeyInput(true); // Always show answer key input since tasks don't have correct answers stored
    setManualStudentName('');
    setManualStudentClass('');
    setCheckTaskTopics([]);

    // Fetch task topics
    try {
      const res = await fetch(`/api/generated-tests/${test.id}/tasks`);
      if (res.ok) {
        const tasks = await res.json();
        // Sort by the order in taskIds
        const taskMap = new Map(tasks.map((t: { id: string; topic?: { name: string; nameKz: string | null } }) => [t.id, t]));
        const orderedTopics = test.taskIds.map(id => {
          const task = taskMap.get(id) as { id: string; topic?: { name: string; nameKz: string | null } } | undefined;
          return {
            id,
            topicName: task?.topic?.name || '',
            topicNameKz: task?.topic?.nameKz || null,
          };
        });
        setCheckTaskTopics(orderedTopics);
      }
    } catch (error) {
      console.error('Error fetching task topics:', error);
    }
  };

  const openResultsModal = async (test: GeneratedTest) => {
    setResultsTest(test);
    setLoadingResults(true);
    try {
      const res = await fetch(`/api/generated-tests/${test.id}/results`);
      if (res.ok) {
        const data = await res.json();
        setTestResults(data);
      }
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoadingResults(false);
    }
  };

  const handleSaveManualResult = async () => {
    if (!checkTest) return;

    // Fetch correct answers to calculate score
    setSavingResult(true);
    try {
      const res = await fetch(`/api/generated-tests/${checkTest.id}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: manualStudentName.trim() || null,
          studentClass: manualStudentClass.trim() || null,
          answers: manualAnswers,
          answerKey: answerKey.some(a => a !== null) ? answerKey : undefined,
        }),
      });

      if (res.ok) {
        showToast({ message: tr.resultSaved, type: 'success' });
        setCheckTest(null);
        // Refresh results if viewing
        if (resultsTest?.id === checkTest.id) {
          openResultsModal(checkTest);
        }
      } else {
        const error = await res.json();
        showToast({ message: error.error || 'Ошибка сохранения', type: 'error' });
      }
    } catch (error) {
      console.error('Error saving result:', error);
      showToast({ message: 'Ошибка сохранения', type: 'error' });
    } finally {
      setSavingResult(false);
    }
  };

  const handleFileSelect = async (file: File) => {
    console.log('[FileSelect] handleFileSelect called with:', file.name, 'type:', file.type, 'size:', file.size);

    // Check if it's a HEIC file - need to convert for display in Chrome/Firefox
    const isHeic = file.name.toLowerCase().endsWith('.heic') ||
                   file.name.toLowerCase().endsWith('.heif') ||
                   file.type.includes('heic') ||
                   file.type.includes('heif');

    let fileForDisplay: File | Blob = file;

    if (isHeic) {
      console.log('[FileSelect] HEIC file detected, attempting conversion for display...');
      try {
        const heic2any = (await import('heic2any')).default;
        const convertedBlob = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.9
        });
        fileForDisplay = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
        console.log('[FileSelect] HEIC converted successfully, new size:', fileForDisplay.size);
      } catch (heicError) {
        console.error('[FileSelect] HEIC conversion failed:', heicError);
        showToast({ message: 'HEIC файл не поддерживается. Загрузите JPG или PNG.', type: 'error' });
        return;
      }
    }

    setSelectedFile(file); // Keep original for scanning
    setScanResult(null);
    // Create object URL for the interactive overlay (using converted file if HEIC)
    const url = URL.createObjectURL(fileForDisplay);
    console.log('[FileSelect] Created object URL:', url);
    setImageUrl(url);
    setShowOverlay(true);
    // Reset legacy calibration
    setCalibrationMode(false);
    setCalibrationStep(0);
    setGridCalibration({});
  };

  // Draw image on canvas when file is selected (after component re-renders)
  useEffect(() => {
    if (!selectedFile || !calibrationMode) return;

    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      const maxSize = 600;
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = URL.createObjectURL(selectedFile);

    return () => {
      URL.revokeObjectURL(img.src);
    };
  }, [selectedFile, calibrationMode]);

  // Handle canvas click for calibration (6 steps: 4 markers + 1A + 60E)
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!calibrationMode || calibrationStep === 0 || calibrationStep > 6) return;

    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    // Calculate the scale between displayed size and actual canvas size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Get click position relative to canvas (in canvas pixels)
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    // Convert to 0-1 ratio based on actual canvas dimensions
    const x = canvasX / canvas.width;
    const y = canvasY / canvas.height;

    const newCalibration = { ...gridCalibration };

    // Step labels and colors for each calibration step (4 markers only)
    const stepConfig: Record<number, { key: keyof typeof newCalibration; label: string; color: string; borderColor: string }> = {
      1: { key: 'markerTL', label: 'TL', color: '#ef4444', borderColor: '#991b1b' },
      2: { key: 'markerTR', label: 'TR', color: '#ef4444', borderColor: '#991b1b' },
      3: { key: 'markerBL', label: 'BL', color: '#ef4444', borderColor: '#991b1b' },
      4: { key: 'markerBR', label: 'BR', color: '#ef4444', borderColor: '#991b1b' },
    };

    const config = stepConfig[calibrationStep];
    if (config) {
      newCalibration[config.key] = { x, y };
      setGridCalibration(newCalibration);

      // Draw marker on canvas at the exact click position
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = config.color;
        ctx.strokeStyle = config.borderColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Add label
        ctx.fillStyle = 'white';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(config.label, canvasX, canvasY);
      }

      // Move to next step or complete
      if (calibrationStep < 4) {
        setCalibrationStep((calibrationStep + 1) as 1 | 2 | 3 | 4);
      } else {
        // All 4 markers selected - run the scan
        runScanWithCalibration(newCalibration);
      }
    }
  };

  // Handle overlay confirmation from InteractiveOverlay
  const handleOverlayConfirm = async (markers: { tl: { x: number; y: number }; tr: { x: number; y: number }; bl: { x: number; y: number }; br: { x: number; y: number } }) => {
    setShowOverlay(false);
    // Clean up image URL
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
      setImageUrl(null);
    }
    // Run scan with the overlay markers
    runScanWithCalibration({
      markerTL: markers.tl,
      markerTR: markers.tr,
      markerBL: markers.bl,
      markerBR: markers.br,
    });
  };

  // Handle overlay cancel
  const handleOverlayCancel = () => {
    setShowOverlay(false);
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
      setImageUrl(null);
    }
    setSelectedFile(null);
  };

  // Run scan after user calibration (using 4 corner markers)
  const runScanWithCalibration = async (calibration: typeof gridCalibration) => {
    if (!selectedFile || !calibration.markerTL || !calibration.markerTR ||
        !calibration.markerBL || !calibration.markerBR) return;

    setCalibrationMode(false);
    setCalibrationStep(0);
    setScanning(true);

    try {
      const mTL = calibration.markerTL;
      const mTR = calibration.markerTR;
      const mBL = calibration.markerBL;
      const mBR = calibration.markerBR;

      console.log('[Calibration] Markers:', { TL: mTL, TR: mTR, BL: mBL, BR: mBR });

      // With homography, we only need the 4 marker positions.
      // The overlay will use perspective transformation to map
      // the ideal PDF coordinates to the photo coordinates.
      // All other ratios are now computed from PDF spec + homography.
      const gridBoundsRatio: GridBoundsRatio = {
        // These ratios are only used for bubble scanning fallback
        topRatio: 0,
        bottomRatio: 1,
        leftRatio: 0,
        rightRatio: 1,
        centerGapRatio: 0.024,
        // Marker positions for homography-based overlay
        markers: {
          tl: { x: mTL.x, y: mTL.y },
          tr: { x: mTR.x, y: mTR.y },
          bl: { x: mBL.x, y: mBL.y },
          br: { x: mBR.x, y: mBR.y },
        },
      };

      console.log('[Calibration] Using homography with markers:', gridBoundsRatio.markers);

      // Run scanner with user-defined bounds
      const result = await scanBlank(selectedFile, checkTest?.id, gridBoundsRatio);
      setScanResult(result);

      if (result.success && result.answers.length > 0) {
        setManualAnswers(result.answers);

        // Show preview with overlay
        if (previewCanvasRef.current) {
          await createScanPreview(previewCanvasRef.current, selectedFile, result.answers, gridBoundsRatio);
        }

        const answersCount = result.answers.filter((a: number | null) => a !== null).length;
        showToast({ message: `Сканирование успешно! Обнаружено ${answersCount} ответов.`, type: 'success' });
      } else if (result.error) {
        showToast({ message: result.error || 'Ошибка сканирования', type: 'error' });
      }
    } catch (error) {
      console.error('Scan error:', error);
      showToast({ message: 'Ошибка сканирования', type: 'error' });
    } finally {
      setScanning(false);
    }
  };

  const handleScanAndSave = async () => {
    if (!checkTest || !scanResult?.success) return;

    setSavingResult(true);
    try {
      const res = await fetch(`/api/generated-tests/${checkTest.id}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: manualStudentName.trim() || null,
          studentClass: manualStudentClass.trim() || null,
          answers: scanResult.answers,
          answerKey: answerKey.some(a => a !== null) ? answerKey : undefined,
        }),
      });

      if (res.ok) {
        showToast({ message: tr.resultSaved, type: 'success' });
        setCheckTest(null);
        setScanResult(null);
        setSelectedFile(null);
        if (resultsTest?.id === checkTest.id) {
          openResultsModal(checkTest);
        }
      } else {
        const error = await res.json();
        showToast({ message: error.error || 'Ошибка сохранения', type: 'error' });
      }
    } catch (error) {
      console.error('Error saving result:', error);
      showToast({ message: 'Ошибка сохранения', type: 'error' });
    } finally {
      setSavingResult(false);
    }
  };

  const resetScan = () => {
    setScanResult(null);
    setSelectedFile(null);
    setCalibrationMode(false);
    setCalibrationStep(0);
    setGridCalibration({});
    setErrorReported(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const reportScanError = async () => {
    if (!previewCanvasRef.current) {
      console.error('[ReportError] Canvas not found');
      showToast({ message: 'Canvas не найден', type: 'error' });
      return;
    }
    if (reportingError) return;

    setReportingError(true);
    try {
      // Get the image from canvas as base64 (reduced quality to fit request limits)
      const imageData = previewCanvasRef.current.toDataURL('image/jpeg', 0.5);
      console.log('[ReportError] Image data length:', imageData.length, 'bytes (~', Math.round(imageData.length / 1024), 'KB)');

      const res = await fetch('/api/feedback/scan-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Ошибка сканирования. Обнаружено ${scanResult?.answers.filter(a => a !== null).length || 0} ответов.`,
          imageData,
          testId: checkTest?.id,
          detectedAnswers: scanResult?.answers,
        }),
      });

      if (res.ok) {
        setErrorReported(true);
        showToast({ message: 'Сообщение отправлено!', type: 'success' });
      } else {
        const errorData = await res.json();
        console.error('[ReportError] Server error:', res.status, errorData);
        showToast({ message: errorData.error || 'Ошибка отправки', type: 'error' });
      }
    } catch (error) {
      console.error('[ReportError] Error:', error);
      showToast({ message: 'Ошибка отправки', type: 'error' });
    } finally {
      setReportingError(false);
    }
  };

  const toggleTopicSelection = (topicId: string) => {
    setGenForm(prev => {
      const isSelected = prev.selectedTopics.includes(topicId);
      const newSelectedTopics = isSelected
        ? prev.selectedTopics.filter(id => id !== topicId)
        : [...prev.selectedTopics, topicId];

      const newTopicCounts = { ...prev.topicCounts };
      if (!isSelected) {
        newTopicCounts[topicId] = 5; // default count
      } else {
        delete newTopicCounts[topicId];
      }

      return {
        ...prev,
        selectedTopics: newSelectedTopics,
        topicCounts: newTopicCounts,
      };
    });
  };

  const TestCard = ({ test, isShared = false }: { test: GeneratedTest; isShared?: boolean }) => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              test.format === 'EXAM' ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400' : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400'
            }`}>
              {test.format === 'EXAM' ? tr.exam : tr.test}
            </span>
            {test.subject && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                {getSubjectName(test.subject)}
              </span>
            )}
            {test.gradeLevel && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                {test.gradeLevel} {locale === 'kz' ? 'сынып' : 'класс'}
              </span>
            )}
          </div>

          <h3 className="font-semibold text-gray-900 dark:text-white mb-1 truncate">
            {getTitle(test)}
          </h3>

          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span>{test.taskIds.length} {tr.questions}</span>
            {test.duration && <span>{test.duration} {tr.minutes}</span>}
            {isShared && test.createdBy && (
              <span>{tr.sharedBy}: {test.createdBy.firstName} {test.createdBy.lastName}</span>
            )}
          </div>

          <div className="text-xs text-gray-400 mt-2">
            {new Date(isShared && test.sharedAt ? test.sharedAt : test.createdAt).toLocaleDateString(locale === 'kz' ? 'kk-KZ' : 'ru-RU', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {/* Верхний ряд - действия */}
          <div className="flex items-center gap-1">
            <div className="relative group">
              <button
                onClick={() => openPreview(test)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">
                {tr.preview}
              </span>
            </div>

            {!isShared && (
              <>
                <div className="relative group">
                  <button
                    onClick={() => openCheckModal(test)}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </button>
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">
                    {tr.checkTest}
                  </span>
                </div>

                <div className="relative group">
                  <button
                    onClick={() => openResultsModal(test)}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </button>
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">
                    {tr.viewResults}
                  </span>
                </div>

                <div className="relative group">
                  <button
                    onClick={() => setShareTest(test)}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </button>
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">
                    {tr.share}
                  </span>
                </div>

                <div className="relative group">
                  <button
                    onClick={() => handleDelete(test.id)}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">
                    {tr.delete}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Нижний ряд - скачивание */}
          <div className="flex items-center gap-1 justify-end">
            <div className="relative group">
              <button
                onClick={() => openPreview(test)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 rounded-lg transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">
                {tr.downloadTest}
              </span>
            </div>

            <div className="relative group">
              <button
                onClick={() => openPreview(test)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                </svg>
              </button>
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">
                {tr.downloadSolutions}
              </span>
            </div>

            <div className="relative group">
              <button
                onClick={() => openPreview(test)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </button>
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">
                {tr.downloadBlank}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{tr.title}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {activeTab === 'my'
                  ? `Всего: ${filteredMyTests.length}${filteredMyTests.length !== myTests.length ? ` из ${myTests.length}` : ''}`
                  : `Всего: ${filteredSharedTests.length}${filteredSharedTests.length !== sharedTests.length ? ` из ${sharedTests.length}` : ''}`
                }
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('my')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'my'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {tr.myTests}
            </button>
            <button
              onClick={() => setActiveTab('shared')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'shared'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {tr.sharedWithMe}
            </button>
          </div>
        </div>

        {/* Search and action bar */}
        <div className="flex gap-2">
          {/* Search input */}
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
              placeholder="Поиск по названию теста, предмету..."
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
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`px-3 py-2.5 rounded-xl border transition-colors flex items-center gap-2 ${
                showFilterPanel || formatFilter !== 'all'
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              {formatFilter !== 'all' && (
                <span className="text-xs font-medium bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center">
                  1
                </span>
              )}
            </button>

            {/* Filter dropdown */}
            {showFilterPanel && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl z-50 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{tr.format}</span>
                </div>
                <div className="p-2 space-y-1">
                  {[
                    { key: 'all', label: 'Все' },
                    { key: 'TEST', label: tr.test },
                    { key: 'EXAM', label: tr.exam },
                  ].map(option => (
                    <button
                      key={option.key}
                      onClick={() => {
                        setFormatFilter(option.key as 'all' | 'TEST' | 'EXAM');
                        setShowFilterPanel(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        formatFilter === option.key
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
          </div>

          {/* Create button */}
          <button
            onClick={() => setShowGenerator(true)}
            className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            + {tr.generate}
          </button>
        </div>
      </div>

        {/* Content */}
        {isLoading ? (
          showSkeleton ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                </div>
              ))}
            </div>
          ) : null
        ) : activeTab === 'my' ? (
          filteredMyTests.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {myTests.length === 0 ? tr.noMyTests : 'Ничего не найдено'}
              </h3>
              {myTests.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400">{tr.createFirst}</p>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {filteredMyTests
                  .slice((myPage - 1) * TESTS_PER_PAGE, myPage * TESTS_PER_PAGE)
                  .map((test) => (
                    <TestCard key={test.id} test={test} />
                  ))}
              </div>
              {filteredMyTests.length > TESTS_PER_PAGE && (
                <div className="flex items-center justify-center gap-4 mt-6">
                  <button
                    onClick={() => setMyPage(p => Math.max(1, p - 1))}
                    disabled={myPage === 1}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {tr.prev}
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {tr.page} {myPage} {tr.of} {Math.ceil(filteredMyTests.length / TESTS_PER_PAGE)}
                  </span>
                  <button
                    onClick={() => setMyPage(p => Math.min(Math.ceil(filteredMyTests.length / TESTS_PER_PAGE), p + 1))}
                    disabled={myPage >= Math.ceil(filteredMyTests.length / TESTS_PER_PAGE)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {tr.next}
                  </button>
                </div>
              )}
            </>
          )
        ) : (
          filteredSharedTests.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {sharedTests.length === 0 ? tr.noSharedTests : 'Ничего не найдено'}
              </h3>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {filteredSharedTests
                  .slice((sharedPage - 1) * TESTS_PER_PAGE, sharedPage * TESTS_PER_PAGE)
                  .map((test) => (
                    <TestCard key={test.id} test={test} isShared />
                  ))}
              </div>
              {filteredSharedTests.length > TESTS_PER_PAGE && (
                <div className="flex items-center justify-center gap-4 mt-6">
                  <button
                    onClick={() => setSharedPage(p => Math.max(1, p - 1))}
                    disabled={sharedPage === 1}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {tr.prev}
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {tr.page} {sharedPage} {tr.of} {Math.ceil(filteredSharedTests.length / TESTS_PER_PAGE)}
                  </span>
                  <button
                    onClick={() => setSharedPage(p => Math.min(Math.ceil(filteredSharedTests.length / TESTS_PER_PAGE), p + 1))}
                    disabled={sharedPage >= Math.ceil(filteredSharedTests.length / TESTS_PER_PAGE)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {tr.next}
                  </button>
                </div>
              )}
            </>
          )
        )}

        {/* Generator Modal */}
        {showGenerator && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{tr.generatorTitle}</h2>
                  <button
                    onClick={() => { setShowGenerator(false); resetGenForm(); }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                  >
                    <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Title with Language Tabs */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{tr.testTitle}</label>
                    <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
                      {(['kz', 'ru', 'en'] as const).map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => setTitleLang(lang)}
                          className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                            titleLang === lang
                              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                          }`}
                        >
                          {lang.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  {titleLang === 'kz' && (
                    <input
                      type="text"
                      value={genForm.titleKz}
                      onChange={(e) => setGenForm({ ...genForm, titleKz: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="Тест атауын енгізіңіз"
                    />
                  )}
                  {titleLang === 'ru' && (
                    <input
                      type="text"
                      value={genForm.title}
                      onChange={(e) => setGenForm({ ...genForm, title: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="Введите название теста"
                    />
                  )}
                  {titleLang === 'en' && (
                    <input
                      type="text"
                      value={genForm.titleEn}
                      onChange={(e) => setGenForm({ ...genForm, titleEn: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="Enter test title"
                    />
                  )}
                </div>

                {/* Format */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{tr.format}</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setGenForm({ ...genForm, format: 'TEST' })}
                      className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition border-2 ${
                        genForm.format === 'TEST'
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      {tr.test}
                    </button>
                    <button
                      type="button"
                      onClick={() => setGenForm({ ...genForm, format: 'EXAM' })}
                      className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition border-2 ${
                        genForm.format === 'EXAM'
                          ? 'border-red-600 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      {tr.exam}
                    </button>
                  </div>
                </div>

                {/* Subject & Grade */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{tr.subject}</label>
                    <select
                      value={genForm.subjectId}
                      onChange={(e) => setGenForm({ ...genForm, subjectId: e.target.value, selectedTopics: [], topicCounts: {} })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white dark:bg-gray-700"
                    >
                      <option value="">{tr.selectSubject}</option>
                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {getSubjectName(subject)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{tr.grade}</label>
                    <select
                      value={genForm.gradeLevel}
                      onChange={(e) => setGenForm({ ...genForm, gradeLevel: parseInt(e.target.value), selectedTopics: [], topicCounts: {} })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white dark:bg-gray-700"
                    >
                      {Array.from({ length: 11 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1} {locale === 'kz' ? 'сынып' : 'класс'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Duration & Task Count */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{tr.taskCount}</label>
                    <select
                      value={genForm.taskCount}
                      onChange={(e) => setGenForm({ ...genForm, taskCount: parseInt(e.target.value) })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white dark:bg-gray-700"
                    >
                      {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60].map((num) => (
                        <option key={num} value={num}>
                          {num} {locale === 'kz' ? 'сұрақ' : locale === 'en' ? 'questions' : 'вопросов'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{tr.duration}</label>
                    <input
                      type="number"
                      value={genForm.duration}
                      onChange={(e) => setGenForm({ ...genForm, duration: parseInt(e.target.value) || 60 })}
                      min={10}
                      max={180}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>

                {/* Topics Selection */}
                {genForm.subjectId && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{tr.topics}</label>
                      <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <input
                          type="checkbox"
                          checked={genForm.useTopics}
                          onChange={(e) => setGenForm({ ...genForm, useTopics: e.target.checked })}
                          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                        {tr.useTopics}
                      </label>
                    </div>
                    {genForm.useTopics && (
                      topics.length > 0 ? (
                        <div className="border border-gray-200 dark:border-gray-600 rounded-xl max-h-72 overflow-y-auto">
                          {topics.map((topic) => {
                            const hasChildren = topic.children && topic.children.length > 0;
                            const isExpanded = expandedTopics.has(topic.id);
                            const getTopicName = (t: Topic) => locale === 'kz' && t.nameKz ? t.nameKz : t.name;

                            return (
                              <div key={topic.id} className="border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                                {/* Parent topic row */}
                                <div className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700">
                                  {hasChildren ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setExpandedTopics(prev => {
                                          const next = new Set(prev);
                                          if (next.has(topic.id)) {
                                            next.delete(topic.id);
                                          } else {
                                            next.add(topic.id);
                                          }
                                          return next;
                                        });
                                      }}
                                      className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:text-gray-400"
                                    >
                                      <svg
                                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    </button>
                                  ) : (
                                    <input
                                      type="checkbox"
                                      checked={genForm.selectedTopics.includes(topic.id)}
                                      onChange={() => toggleTopicSelection(topic.id)}
                                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                  )}
                                  <span className={`text-sm flex-1 ${hasChildren ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-700'}`}>
                                    {getTopicName(topic)}
                                  </span>
                                  {topic._count && topic._count.tasks > 0 && !hasChildren && (
                                    <span className="text-xs text-gray-400">
                                      {topic._count.tasks} {locale === 'kz' ? 'сұрақ' : 'вопр.'}
                                    </span>
                                  )}
                                  {genForm.selectedTopics.includes(topic.id) && !hasChildren && (
                                    <input
                                      type="number"
                                      value={genForm.topicCounts[topic.id] || 5}
                                      onChange={(e) => setGenForm({
                                        ...genForm,
                                        topicCounts: {
                                          ...genForm.topicCounts,
                                          [topic.id]: parseInt(e.target.value) || 1,
                                        },
                                      })}
                                      min={1}
                                      max={20}
                                      className="w-14 px-2 py-1 border border-gray-200 rounded text-sm text-center text-gray-900 dark:text-white"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  )}
                                </div>

                                {/* Children topics */}
                                {hasChildren && isExpanded && (
                                  <div className="bg-gray-50 dark:bg-gray-700">
                                    {topic.children!.map((child) => (
                                      <div
                                        key={child.id}
                                        className="flex items-center gap-2 pl-10 pr-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-600 border-t border-gray-100 dark:border-gray-700"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={genForm.selectedTopics.includes(child.id)}
                                          onChange={() => toggleTopicSelection(child.id)}
                                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                                          {getTopicName(child)}
                                        </span>
                                        {child._count && child._count.tasks > 0 && (
                                          <span className="text-xs text-gray-400">
                                            {child._count.tasks} {locale === 'kz' ? 'сұрақ' : 'вопр.'}
                                          </span>
                                        )}
                                        {genForm.selectedTopics.includes(child.id) && (
                                          <input
                                            type="number"
                                            value={genForm.topicCounts[child.id] || 5}
                                            onChange={(e) => setGenForm({
                                              ...genForm,
                                              topicCounts: {
                                                ...genForm.topicCounts,
                                                [child.id]: parseInt(e.target.value) || 1,
                                              },
                                            })}
                                            min={1}
                                            max={20}
                                            className="w-14 px-2 py-1 border border-gray-200 rounded text-sm text-center text-gray-900 dark:text-white"
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="border border-gray-200 rounded-xl p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                          {tr.noTopics}
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* Difficulty Distribution */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">{tr.difficulty}</label>
                    <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <input
                        type="checkbox"
                        checked={genForm.useDifficulty}
                        onChange={(e) => setGenForm({ ...genForm, useDifficulty: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      {tr.useDifficulty}
                    </label>
                  </div>
                  {genForm.useDifficulty && (
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{tr.easy}</label>
                        <input
                          type="number"
                          value={genForm.difficultyConfig.easy}
                          onChange={(e) => setGenForm({
                            ...genForm,
                            difficultyConfig: { ...genForm.difficultyConfig, easy: parseInt(e.target.value) || 0 },
                          })}
                          min={0}
                          className="w-full px-3 py-2 border border-green-200 bg-green-50 rounded-lg text-sm text-center text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{tr.medium}</label>
                        <input
                          type="number"
                          value={genForm.difficultyConfig.medium}
                          onChange={(e) => setGenForm({
                            ...genForm,
                            difficultyConfig: { ...genForm.difficultyConfig, medium: parseInt(e.target.value) || 0 },
                          })}
                          min={0}
                          className="w-full px-3 py-2 border border-amber-200 bg-amber-50 rounded-lg text-sm text-center text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{tr.hard}</label>
                        <input
                          type="number"
                          value={genForm.difficultyConfig.hard}
                          onChange={(e) => setGenForm({
                            ...genForm,
                            difficultyConfig: { ...genForm.difficultyConfig, hard: parseInt(e.target.value) || 0 },
                          })}
                          min={0}
                          className="w-full px-3 py-2 border border-red-200 bg-red-50 rounded-lg text-sm text-center text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex gap-3">
                <button
                  onClick={() => { setShowGenerator(false); resetGenForm(); }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 dark:bg-gray-700 transition"
                >
                  {tr.cancel}
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generating || !genForm.subjectId}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {generating ? tr.creating : tr.create}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {showPreview && previewTest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{getTitle(previewTest)}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {previewTest.taskIds.length} {tr.questions}
                      {previewTest.duration && ` • ${previewTest.duration} ${tr.minutes}`}
                    </p>
                  </div>
                  <button
                    onClick={() => { setShowPreview(false); setPreviewTest(null); setPreviewTasks([]); }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                  >
                    <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Download Controls */}
                <div className="flex items-center gap-3 mt-4 flex-wrap">
                  {/* Language Tabs */}
                  <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                    {(['kz', 'ru', 'en'] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setDownloadLang(lang)}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                          downloadLang === lang
                            ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                      >
                        {lang.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => handleDownload('test')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/70 transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    {tr.downloadTest}
                  </button>

                  <button
                    onClick={() => handleDownload('solutions')}
                    className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium hover:bg-green-200 dark:hover:bg-green-900/70 transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {tr.downloadSolutions}
                  </button>

                  <button
                    onClick={() => handleDownload('blank')}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-lg text-sm font-medium hover:bg-purple-200 dark:hover:bg-purple-900/70 transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {tr.downloadBlank}
                  </button>

                  <button
                    onClick={handleOpenEditTopics}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-lg text-sm font-medium hover:bg-amber-200 dark:hover:bg-amber-900/70 transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    {tr.editTopics}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 min-h-[200px]">
                {loadingPreview ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent"></div>
                  </div>
                ) : previewTasks.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                    {locale === 'kz' ? 'Сұрақтар жоқ' : locale === 'en' ? 'No questions' : 'Нет вопросов'}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {previewTasks.map((task, index) => (
                      <div key={task.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-5">
                        <div className="flex items-start justify-between mb-3 gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{tr.question} {index + 1}</span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              task.difficulty === 1 ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' :
                              task.difficulty === 2 ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300' :
                              'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                            }`}>
                              {task.difficulty === 1 ? tr.easy : task.difficulty === 2 ? tr.medium : tr.hard}
                            </span>
                          </div>
                          {/* Темы (только родительские, без дублей) */}
                          {task.linkedSubtopics && task.linkedSubtopics.length > 0 && (
                            <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
                              {(() => {
                                // Собираем уникальные родительские темы
                                type SubtopicType = NonNullable<typeof task.linkedSubtopics>[0];
                                const uniqueTopics = new Map<string, SubtopicType['topic']>();
                                task.linkedSubtopics!.forEach((sub: SubtopicType) => {
                                  if (sub.topic && !uniqueTopics.has(sub.topic.id)) {
                                    uniqueTopics.set(sub.topic.id, sub.topic);
                                  }
                                });

                                return Array.from(uniqueTopics.values()).map((topic, idx) => (
                                  <span key={idx} className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded font-medium">
                                    {downloadLang === 'kz' && topic?.nameKz ? topic.nameKz :
                                     downloadLang === 'en' && topic?.nameEn ? topic.nameEn :
                                     topic?.nameRu || topic?.name}
                                  </span>
                                ));
                              })()}
                            </div>
                          )}
                        </div>

                        <LatexRenderer
                          text={
                            downloadLang === 'kz' ? (task.questionKz || task.question) :
                            downloadLang === 'en' ? (task.questionEn || task.questionRu || task.question) :
                            (task.questionRu || task.question)
                          }
                          className="text-gray-900 dark:text-white mb-4"
                        />

                        {task.questionImage && (
                          <div className="mb-4">
                            <img
                              src={task.questionImage}
                              alt="Question illustration"
                              className="max-w-xs h-auto max-h-40 rounded-lg border border-gray-200 dark:border-gray-700"
                            />
                          </div>
                        )}

                        <div className="space-y-2">
                          {(() => {
                            const currentOptions =
                              downloadLang === 'kz' ? (task.optionsKz || task.options) :
                              downloadLang === 'en' ? (task.optionsEn || task.optionsRu || task.options) :
                              (task.optionsRu || task.options);
                            return currentOptions.map((option, optIndex) => (
                              <div
                                key={optIndex}
                                className={`flex items-center gap-3 p-3 rounded-lg ${
                                  optIndex === task.correctAnswer
                                    ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800'
                                    : 'bg-gray-50 dark:bg-gray-700'
                                }`}
                              >
                                <span className={`w-6 h-6 flex items-center justify-center rounded-full text-sm font-medium ${
                                  optIndex === task.correctAnswer
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                                }`}>
                                  {String.fromCharCode(65 + optIndex)}
                                </span>
                                <LatexRenderer text={option} className="text-gray-700 dark:text-gray-300 flex-1" />
                                {optIndex === task.correctAnswer && (
                                  <svg className="w-5 h-5 text-green-600 dark:text-green-400 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            ));
                          })()}
                        </div>

                        {/* Hint - yellow with lightbulb */}
                        {(() => {
                          const hint =
                            downloadLang === 'kz' ? (task.hintKz || task.hint) :
                            downloadLang === 'en' ? (task.hintEn || task.hintRu || task.hint) :
                            (task.hintRu || task.hint);
                          return hint ? (
                            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2">
                              <span className="text-amber-500 mt-0.5">💡</span>
                              <LatexRenderer text={hint} className="text-sm text-amber-700 dark:text-amber-300" />
                            </div>
                          ) : null;
                        })()}

                        {/* Explanation/Solution - blue */}
                        {(() => {
                          const explanation =
                            downloadLang === 'kz' ? (task.explanationKz || task.explanation) :
                            downloadLang === 'en' ? (task.explanationEn || task.explanationRu || task.explanation) :
                            (task.explanationRu || task.explanation);
                          return explanation ? (
                            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">
                                {downloadLang === 'kz' ? 'Дұрыс жауап:' : downloadLang === 'en' ? 'Correct answer:' : 'Правильный ответ:'}
                              </p>
                              <LatexRenderer text={explanation} className="text-sm text-blue-700 dark:text-blue-300" />
                            </div>
                          ) : null;
                        })()}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => { setShowPreview(false); setPreviewTest(null); setPreviewTasks([]); }}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  {tr.close}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Topics Modal */}
        {showEditTopics && previewTest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{tr.editTopicsTitle}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{getTitle(previewTest)}</p>
                  </div>
                  <button
                    onClick={() => setShowEditTopics(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                  >
                    <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {editTopicsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {previewTasks.map((task, index) => {
                      const questionText = downloadLang === 'kz' ? (task.questionKz || task.question) :
                        downloadLang === 'en' ? (task.questionEn || task.questionRu || task.question) :
                        (task.questionRu || task.question);
                      const selectedTopics = taskTopicSelections[task.id] || [];

                      return (
                        <div key={task.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                          <div className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium">
                              {index + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900 dark:text-white line-clamp-2 mb-3">
                                {questionText.length > 100 ? questionText.substring(0, 100) + '...' : questionText}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {availableTopics.map(topic => {
                                  const isSelected = selectedTopics.includes(topic.id);
                                  const topicName = downloadLang === 'kz' && topic.nameKz ? topic.nameKz :
                                    topic.nameRu || topic.name;

                                  return (
                                    <button
                                      key={topic.id}
                                      onClick={() => toggleTaskTopic(task.id, topic.id)}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                                        isSelected
                                          ? 'bg-blue-600 text-white'
                                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                      }`}
                                    >
                                      {topicName}
                                    </button>
                                  );
                                })}
                              </div>
                              {selectedTopics.length === 0 && (
                                <p className="text-xs text-gray-400 mt-2">{tr.noTopicsSelected}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                <button
                  onClick={() => setShowEditTopics(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  {tr.cancel}
                </button>
                <button
                  onClick={handleSaveTopics}
                  disabled={savingTopics}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {savingTopics ? '...' : tr.saveTopics}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Share Modal */}
        {shareTest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{tr.shareTitle}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{getTitle(shareTest)}</p>
              </div>

              <div className="p-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{tr.enterPhone}</label>
                <input
                  type="tel"
                  value={sharePhone}
                  onChange={(e) => setSharePhone(e.target.value)}
                  placeholder="+7 777 123 4567"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                <button
                  onClick={() => { setShareTest(null); setSharePhone(''); }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  {tr.cancel}
                </button>
                <button
                  onClick={handleShare}
                  disabled={sharing || !sharePhone.trim()}
                  className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 transition"
                >
                  {sharing ? '...' : tr.shareBtn}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Check Test Modal */}
        {checkTest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{tr.checkTestTitle}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{getTitle(checkTest)}</p>
                  </div>
                  <button
                    onClick={() => setCheckTest(null)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                  >
                    <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Mode Toggle */}
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mt-4">
                  <button
                    onClick={() => setCheckMode('upload')}
                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition ${
                      checkMode === 'upload'
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {tr.uploadPhoto}
                  </button>
                  <button
                    onClick={() => setCheckMode('manual')}
                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition ${
                      checkMode === 'manual'
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {tr.enterManually}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {checkMode === 'upload' ? (
                  <div className="space-y-4">
                    {/* Student Info - always visible */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{tr.studentName}</label>
                        <input
                          type="text"
                          value={manualStudentName}
                          onChange={(e) => setManualStudentName(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                          placeholder={locale === 'kz' ? 'Оқушының аты-жөні' : 'ФИО ученика'}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{tr.studentClass}</label>
                        <input
                          type="text"
                          value={manualStudentClass}
                          onChange={(e) => setManualStudentClass(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                          placeholder={locale === 'kz' ? '11А' : '11А'}
                        />
                      </div>
                    </div>

                    {/* Upload Area or Preview */}
                    {!selectedFile ? (
                      <div
                        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center cursor-pointer hover:border-purple-400 dark:hover:border-purple-500 transition"
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.add('border-purple-500', 'bg-purple-50');
                        }}
                        onDragLeave={(e) => {
                          e.currentTarget.classList.remove('border-purple-500', 'bg-purple-50');
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('border-purple-500', 'bg-purple-50');
                          const file = e.dataTransfer.files[0];
                          console.log('[FileSelect] Drop - file:', file?.name, 'type:', file?.type);
                          // Accept image/* OR HEIC/HEIF files (which may have empty or different MIME type)
                          const isImage = file?.type.startsWith('image/');
                          const isHeic = file?.name.toLowerCase().endsWith('.heic') || file?.name.toLowerCase().endsWith('.heif');
                          if (file && (isImage || isHeic)) {
                            handleFileSelect(file);
                          }
                        }}
                      >
                        <svg className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-gray-600 dark:text-gray-400 mb-2">{tr.uploadPhoto}</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">{tr.orDragDrop}</p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,.heic,.heif"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            console.log('[FileSelect] Input change - file:', file?.name, 'type:', file?.type, 'size:', file?.size);
                            if (file) handleFileSelect(file);
                          }}
                        />
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {tr.takePhoto}
                        </button>
                      </div>
                    ) : showOverlay && imageUrl ? (
                      /* Interactive Overlay for calibration */
                      <InteractiveOverlay
                        imageUrl={imageUrl}
                        onConfirm={handleOverlayConfirm}
                        onCancel={handleOverlayCancel}
                      />
                    ) : (
                      <div className="space-y-4">
                        {/* Scanning indicator */}
                        {scanning && (
                          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center gap-3">
                              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
                              <span className="text-blue-700 dark:text-blue-300">{tr.processing}</span>
                            </div>
                          </div>
                        )}

                        {/* Scan Preview */}
                        <div className="relative bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden flex items-center justify-center min-h-[200px]">
                          <canvas
                            ref={previewCanvasRef}
                            className="max-w-full max-h-[500px]"
                            style={{ display: 'block' }}
                          />
                        </div>

                        {/* Scan Result */}
                        {scanResult && (
                          <div className={`p-4 rounded-xl ${
                            scanResult.success ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800'
                          }`}>
                            {scanResult.success ? (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="font-medium">
                                      {locale === 'kz' ? 'Сканерлеу сәтті!' : 'Сканирование успешно!'}
                                    </span>
                                  </div>
                                  {!errorReported ? (
                                    <button
                                      onClick={reportScanError}
                                      disabled={reportingError}
                                      className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 flex items-center gap-1 transition"
                                      title={locale === 'kz' ? 'Қате туралы хабарлау' : 'Сообщить об ошибке'}
                                    >
                                      {reportingError ? (
                                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                      ) : (
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                      )}
                                      <span>{locale === 'kz' ? 'Қате' : 'Ошибка?'}</span>
                                    </button>
                                  ) : (
                                    <span className="text-xs text-green-600 flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                      {locale === 'kz' ? 'Жіберілді' : 'Отправлено'}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-green-600 dark:text-green-400">
                                  {locale === 'kz'
                                    ? `${scanResult.answers.filter(a => a !== null).length} жауап анықталды (сенімділік: ${Math.round(scanResult.confidence * 100)}%)`
                                    : `Обнаружено ${scanResult.answers.filter(a => a !== null).length} ответов (уверенность: ${Math.round(scanResult.confidence * 100)}%)`
                                  }
                                </p>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="font-medium">{scanResult.error}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Answer Key Input Section */}
                        {scanResult?.success && (
                          <div className="mt-4 border border-purple-200 dark:border-purple-800 rounded-xl overflow-hidden">
                            <button
                              onClick={() => setShowAnswerKeyInput(!showAnswerKeyInput)}
                              className="w-full px-4 py-3 bg-purple-50 dark:bg-purple-900/30 flex items-center justify-between hover:bg-purple-100 dark:hover:bg-purple-900/50 transition"
                            >
                              <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                                <span className="font-medium text-purple-700 dark:text-purple-300">{tr.answerKey}</span>
                              </div>
                              <svg
                                className={`w-5 h-5 text-purple-600 dark:text-purple-400 transition-transform ${showAnswerKeyInput ? 'rotate-180' : ''}`}
                                fill="none" stroke="currentColor" viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            {showAnswerKeyInput && (
                              <div className="p-4 bg-white dark:bg-gray-800">
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{tr.enterAnswerKey}</p>
                                <div className="max-h-[200px] overflow-y-auto">
                                  <div className="grid grid-cols-5 gap-2">
                                    {answerKey.map((answer, idx) => (
                                      <div key={idx} className="flex items-center gap-1 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-6">{idx + 1}.</span>
                                        <div className="flex gap-1">
                                          {['A', 'B', 'C', 'D', 'E'].map((opt, optIdx) => (
                                            <button
                                              key={opt}
                                              onClick={() => {
                                                const newKey = [...answerKey];
                                                newKey[idx] = newKey[idx] === optIdx ? null : optIdx;
                                                setAnswerKey(newKey);
                                              }}
                                              className={`w-6 h-6 text-xs font-medium rounded transition ${
                                                answer === optIdx
                                                  ? 'bg-purple-600 text-white'
                                                  : 'bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 text-gray-600 dark:text-gray-300 hover:border-purple-300 dark:hover:border-purple-500'
                                              }`}
                                            >
                                              {opt}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Rescan Button */}
                        <button
                          onClick={resetScan}
                          className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          {tr.scanAgain}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Student Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{tr.studentName}</label>
                        <input
                          type="text"
                          value={manualStudentName}
                          onChange={(e) => setManualStudentName(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                          placeholder={locale === 'kz' ? 'Аты-жөні' : 'ФИО ученика'}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{tr.studentClass}</label>
                        <input
                          type="text"
                          value={manualStudentClass}
                          onChange={(e) => setManualStudentClass(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                          placeholder={locale === 'kz' ? '11А' : '11А'}
                        />
                      </div>
                    </div>

                    {/* Answer Grid */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        {locale === 'kz' ? 'Жауаптар' : locale === 'en' ? 'Answers' : 'Ответы'}
                      </label>
                      <div className="max-h-[400px] overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-2xl">
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                          {manualAnswers.map((answer, idx) => {
                            const topic = checkTaskTopics[idx];
                            const topicName = topic ? (locale === 'kz' && topic.topicNameKz ? topic.topicNameKz : topic.topicName) : '';
                            return (
                              <div key={idx} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                <span className="text-sm font-bold text-gray-900 dark:text-white w-8">{idx + 1}.</span>
                                <span className="flex-1 text-sm text-gray-500 dark:text-gray-400 truncate" title={topicName}>
                                  {topicName || '...'}
                                </span>
                                <div className="flex gap-1.5 shrink-0">
                                  {['A', 'B', 'C', 'D', 'E'].map((opt, optIdx) => (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() => {
                                        const newAnswers = [...manualAnswers];
                                        newAnswers[idx] = newAnswers[idx] === optIdx ? null : optIdx;
                                        setManualAnswers(newAnswers);
                                      }}
                                      className={`w-9 h-9 rounded-lg text-sm font-semibold transition-all ${
                                        answer === optIdx
                                          ? 'bg-purple-600 text-white shadow-md scale-105'
                                          : 'bg-white dark:bg-gray-600 border-2 border-gray-200 dark:border-gray-500 text-gray-600 dark:text-gray-300 hover:border-purple-400 dark:hover:border-purple-500 hover:text-purple-600 dark:hover:text-purple-400'
                                      }`}
                                    >
                                      {opt}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                <button
                  onClick={() => {
                    setCheckTest(null);
                    resetScan();
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  {tr.cancel}
                </button>
                {checkMode === 'manual' && (
                  <button
                    onClick={handleSaveManualResult}
                    disabled={savingResult}
                    className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50 transition"
                  >
                    {savingResult ? '...' : tr.saveResult}
                  </button>
                )}
                {checkMode === 'upload' && scanResult?.success && (
                  <button
                    onClick={handleScanAndSave}
                    disabled={savingResult}
                    className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50 transition"
                  >
                    {savingResult ? '...' : tr.saveResult}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Results Modal */}
        {resultsTest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{tr.results}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{getTitle(resultsTest)}</p>
                  </div>
                  <button
                    onClick={() => { setResultsTest(null); setTestResults([]); }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                  >
                    <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {loadingResults ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
                  </div>
                ) : testResults.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-7 h-7 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">{tr.noResults}</h3>
                    <button
                      onClick={() => {
                        setResultsTest(null);
                        openCheckModal(resultsTest);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition mt-4"
                    >
                      {tr.checkTest}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-white dark:bg-gray-700 rounded-xl p-5 text-center border border-gray-200 dark:border-gray-600">
                        <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">{testResults.length}</div>
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          {locale === 'kz' ? 'Жауаптар' : locale === 'en' ? 'Responses' : 'Ответов'}
                        </div>
                      </div>
                      <div className="bg-white dark:bg-gray-700 rounded-xl p-5 text-center border border-gray-200 dark:border-gray-600">
                        <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
                          {testResults.length > 0
                            ? Math.round(testResults.reduce((sum, r) => sum + r.percentage, 0) / testResults.length)
                            : 0}%
                        </div>
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          {locale === 'kz' ? 'Орташа балл' : locale === 'en' ? 'Average' : 'Средний балл'}
                        </div>
                      </div>
                      <div className="bg-white dark:bg-gray-700 rounded-xl p-5 text-center border border-gray-200 dark:border-gray-600">
                        <div className="text-3xl font-bold text-amber-600 dark:text-amber-400 mb-1">
                          {testResults.length > 0
                            ? Math.round(Math.max(...testResults.map(r => r.percentage)))
                            : 0}%
                        </div>
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          {locale === 'kz' ? 'Максимум' : locale === 'en' ? 'Max score' : 'Максимум'}
                        </div>
                      </div>
                    </div>

                    {/* Results Table */}
                    <div className="border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-5 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">{tr.studentName}</th>
                            <th className="px-5 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">{tr.studentClass}</th>
                            <th className="px-5 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">{tr.score}</th>
                            <th className="px-5 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">%</th>
                            <th className="px-5 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">{tr.date}</th>
                            <th className="px-5 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                          {testResults.map((result) => (
                            <tr key={result.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                              <td className="px-5 py-3">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {result.studentName || (locale === 'kz' ? 'Белгісіз' : locale === 'en' ? 'Unknown' : 'Неизвестно')}
                                </span>
                              </td>
                              <td className="px-5 py-3">
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  {result.studentClass || '-'}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-center">
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {result.correctCount}/{result.totalQuestions}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-center">
                                <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                  result.percentage >= 80 ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' :
                                  result.percentage >= 50 ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300' :
                                  'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                                }`}>
                                  {Math.round(result.percentage)}%
                                </span>
                              </td>
                              <td className="px-5 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
                                {new Date(result.scannedAt).toLocaleDateString(locale === 'kz' ? 'kk-KZ' : 'ru-RU', {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                              </td>
                              <td className="px-5 py-3 text-center">
                                <button
                                  onClick={() => {
                                    window.open(`/api/generated-tests/${resultsTest.id}/results/${result.id}/pdf?lang=${locale}`, '_blank');
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
                                  title={locale === 'kz' ? 'PDF жүктеу' : 'Скачать PDF'}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  PDF
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                <button
                  onClick={() => { setResultsTest(null); setTestResults([]); }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  {tr.close}
                </button>
                <button
                  onClick={() => {
                    const test = resultsTest;
                    setResultsTest(null);
                    openCheckModal(test);
                  }}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition"
                >
                  {tr.checkTest}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
