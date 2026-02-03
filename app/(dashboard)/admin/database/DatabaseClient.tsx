'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  rectIntersection,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import LanguagesSection from './sections/LanguagesSection';
import GradeLevelsSection from './sections/GradeLevelsSection';
import StudyDirectionsSection from './sections/StudyDirectionsSection';
import SubjectsSection from './sections/SubjectsSection';
import TopicsSection from './sections/TopicsSection';
import RegionsSection from './sections/RegionsSection';
import CitiesSection from './sections/CitiesSection';
import SchoolsSection from './sections/SchoolsSection';
import SpecialNeedsSection from './sections/SpecialNeedsSection';
import GroupIndexesSection from './sections/GroupIndexesSection';
import TeacherCategoriesSection from './sections/TeacherCategoriesSection';
import BranchesSection from './sections/BranchesSection';
import GroupsSection from './sections/GroupsSection';
import ClassroomsSection from './sections/ClassroomsSection';
import UserRolesSection from './sections/UserRolesSection';
import GendersSection from './sections/GendersSection';
import CitizenshipsSection from './sections/CitizenshipsSection';
import StudyFormatsSection from './sections/StudyFormatsSection';
import GuaranteesSection from './sections/GuaranteesSection';
import StudySchedulesSection from './sections/StudySchedulesSection';
import ParentDocumentTypesSection from './sections/ParentDocumentTypesSection';
import GenericEnumSection from './sections/GenericEnumSection';

interface Section {
  id: string;
  name: string;
  icon: string;
  category: string;
}

const defaultSections: Section[] = [
  // Образование
  { id: 'gradeLevels', name: 'Классы', icon: '🎓', category: 'Образование' },
  { id: 'languages', name: 'Языки', icon: '🌐', category: 'Образование' },
  { id: 'studyDirections', name: 'Направления', icon: '🎯', category: 'Образование' },
  { id: 'subjects', name: 'Предметы', icon: '📚', category: 'Образование' },
  { id: 'topics', name: 'Темы', icon: '📋', category: 'Образование' },
  { id: 'studyFormats', name: 'Форматы обучения', icon: '📝', category: 'Образование' },
  { id: 'studySchedules', name: 'Расписания', icon: '📅', category: 'Образование' },
  { id: 'guarantees', name: 'Гарантии', icon: '✅', category: 'Образование' },
  { id: 'lessonTypes', name: 'Типы уроков', icon: '📖', category: 'Образование' },
  { id: 'difficultyLevels', name: 'Уровни сложности', icon: '📊', category: 'Образование' },
  // География
  { id: 'regions', name: 'Области', icon: '🗺️', category: 'География' },
  { id: 'cities', name: 'Города', icon: '🏙️', category: 'География' },
  { id: 'schools', name: 'Школы', icon: '🏫', category: 'География' },
  // Инфраструктура
  { id: 'branches', name: 'Филиалы', icon: '🏢', category: 'Инфраструктура' },
  { id: 'classrooms', name: 'Аудитории', icon: '🚪', category: 'Инфраструктура' },
  { id: 'groups', name: 'Группы', icon: '👥', category: 'Инфраструктура' },
  // Персонал
  { id: 'teacherCategories', name: 'Категории учителей', icon: '👨‍🏫', category: 'Персонал' },
  { id: 'specialNeeds', name: 'Особенности', icon: '♿', category: 'Персонал' },
  { id: 'genders', name: 'Пол', icon: '👤', category: 'Персонал' },
  { id: 'citizenships', name: 'Гражданство', icon: '🌍', category: 'Персонал' },
  { id: 'parentDocumentTypes', name: 'Типы документов', icon: '📄', category: 'Персонал' },
  // Статусы
  { id: 'studentStatuses', name: 'Статусы студентов', icon: '🎒', category: 'Статусы' },
  { id: 'teacherStatuses', name: 'Статусы учителей', icon: '👨‍🏫', category: 'Статусы' },
  { id: 'paymentStatuses', name: 'Статусы оплаты', icon: '💳', category: 'Статусы' },
  { id: 'contractStatuses', name: 'Статусы договоров', icon: '📑', category: 'Статусы' },
  { id: 'homeworkStatuses', name: 'Статусы ДЗ', icon: '📝', category: 'Статусы' },
  { id: 'orderStatuses', name: 'Статусы заказов', icon: '🛒', category: 'Статусы' },
  { id: 'messageStatuses', name: 'Статусы сообщений', icon: '✉️', category: 'Статусы' },
  // Типы и форматы
  { id: 'testTypes', name: 'Типы тестов', icon: '📋', category: 'Типы и форматы' },
  { id: 'questionTypes', name: 'Типы вопросов', icon: '❓', category: 'Типы и форматы' },
  { id: 'taskFormats', name: 'Форматы заданий', icon: '📄', category: 'Типы и форматы' },
  { id: 'generatedTestFormats', name: 'Форматы тестов', icon: '🧪', category: 'Типы и форматы' },
  { id: 'resourceTypes', name: 'Типы ресурсов', icon: '📦', category: 'Типы и форматы' },
  { id: 'notificationTypes', name: 'Типы уведомлений', icon: '🔔', category: 'Типы и форматы' },
  { id: 'transactionTypes', name: 'Типы транзакций', icon: '💱', category: 'Типы и форматы' },
  // Оплата
  { id: 'salaryFormats', name: 'Форматы зарплаты', icon: '💰', category: 'Оплата' },
  { id: 'paymentMethods', name: 'Способы оплаты', icon: '💵', category: 'Оплата' },
  { id: 'paymentPlans', name: 'Планы оплаты', icon: '📅', category: 'Оплата' },
  // Системные
  { id: 'groupIndexes', name: 'Индексы групп', icon: '🔤', category: 'Системные' },
  { id: 'userRoles', name: 'Роли пользователей', icon: '🔐', category: 'Системные' },
  { id: 'timeOfDay', name: 'Время суток', icon: '🕐', category: 'Системные' },
];

const defaultCategories = ['Образование', 'География', 'Инфраструктура', 'Персонал', 'Статусы', 'Типы и форматы', 'Оплата', 'Системные'];

interface Stats {
  [key: string]: number;
}

interface DatabaseClientProps {
  userRole: string;
}

// Sortable Card Component
function SortableCard({
  section,
  isReorderMode,
  onClick,
  getSectionIcon,
  stats,
  loadingStats,
}: {
  section: Section;
  isReorderMode: boolean;
  onClick: () => void;
  getSectionIcon: (id: string) => React.ReactNode;
  stats: Stats;
  loadingStats: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all group ${isReorderMode ? '' : 'cursor-pointer'}`}
      onClick={() => !isReorderMode && onClick()}
    >
      {isReorderMode && (
        <div
          {...attributes}
          {...listeners}
          className="p-1.5 cursor-grab active:cursor-grabbing bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shrink-0"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </div>
      )}
      <div className="w-12 h-12 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-xl flex-shrink-0 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
        {getSectionIcon(section.id)}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {section.name}
        </span>
      </div>
      <span className="text-sm font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded-lg">
        {loadingStats ? '...' : stats[section.id] || 0}
      </span>
    </div>
  );
}

// Sortable Category Component
function SortableCategory({
  category,
  children,
  isReorderMode,
  isEmpty,
  onDelete,
}: {
  category: string;
  children: React.ReactNode;
  isReorderMode: boolean;
  isEmpty?: boolean;
  onDelete?: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `category-${category}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-center gap-3 mb-4">
        {isReorderMode && (
          <div
            {...attributes}
            {...listeners}
            className="p-2 cursor-grab active:cursor-grabbing bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center justify-center"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </div>
        )}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{category}</h3>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        {isReorderMode && isEmpty && onDelete && (
          <button
            onClick={onDelete}
            className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
            title="Удалить раздел"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

export default function DatabaseClient({ userRole: _userRole }: DatabaseClientProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({});
  const [loadingStats, setLoadingStats] = useState(true);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [categories, setCategories] = useState<string[]>(defaultCategories);
  const [sections, setSections] = useState<Section[]>(defaultSections);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load category order and sections from localStorage
  useEffect(() => {
    const savedCategories = localStorage.getItem('db-category-order');
    if (savedCategories) {
      try {
        const parsed = JSON.parse(savedCategories);
        // Merge saved order with default categories (in case new ones were added)
        const allCategories = [...new Set([...parsed, ...defaultCategories])];
        setCategories(allCategories);
      } catch {
        setCategories(defaultCategories);
      }
    }

    const savedSections = localStorage.getItem('db-sections-order');
    if (savedSections) {
      try {
        const parsed = JSON.parse(savedSections);
        // Merge with default sections (keep all defaults, update categories from saved)
        const mergedSections = defaultSections.map(defaultSection => {
          const saved = parsed.find((s: Section) => s.id === defaultSection.id);
          return saved ? { ...defaultSection, category: saved.category } : defaultSection;
        });
        setSections(mergedSections);
      } catch {
        setSections(defaultSections);
      }
    }
  }, []);

  // Save category order to localStorage
  const saveCategoryOrder = (newOrder: string[]) => {
    localStorage.setItem('db-category-order', JSON.stringify(newOrder));
    setCategories(newOrder);
  };

  // Save sections order to localStorage
  const saveSectionsOrder = (newSections: Section[]) => {
    localStorage.setItem('db-sections-order', JSON.stringify(newSections));
    setSections(newSections);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    // Only handle card over category
    if (!activeIdStr.startsWith('category-') && overIdStr.startsWith('category-')) {
      const targetCategory = overIdStr.replace('category-', '');
      const activeSection = sections.find(s => s.id === activeIdStr);

      if (activeSection && activeSection.category !== targetCategory) {
        const newSections = sections.map(s =>
          s.id === activeIdStr ? { ...s, category: targetCategory } : s
        );
        saveSectionsOrder(newSections);
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    // Handle category reordering
    if (activeIdStr.startsWith('category-') && overIdStr.startsWith('category-')) {
      const activeCategory = activeIdStr.replace('category-', '');
      const overCategory = overIdStr.replace('category-', '');
      const oldIndex = categories.indexOf(activeCategory);
      const newIndex = categories.indexOf(overCategory);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(categories, oldIndex, newIndex);
        saveCategoryOrder(newOrder);
      }
      return;
    }

    // Handle card reordering within/between categories
    if (!activeIdStr.startsWith('category-')) {
      const activeSection = sections.find(s => s.id === activeIdStr);
      if (!activeSection) return;

      // If dropping on a category
      if (overIdStr.startsWith('category-')) {
        const targetCategory = overIdStr.replace('category-', '');
        if (activeSection.category !== targetCategory) {
          const newSections = sections.map(s =>
            s.id === activeIdStr ? { ...s, category: targetCategory } : s
          );
          saveSectionsOrder(newSections);
        }
        return;
      }

      // If dropping on another card
      const overSection = sections.find(s => s.id === overIdStr);
      if (!overSection) return;

      // Move to target category and reorder
      const targetCategory = overSection.category;
      if (activeSection.category === targetCategory) {
        // Reorder within same category
        const allInCategory = sections.filter(s => s.category === targetCategory);
        const oldIdx = allInCategory.findIndex(s => s.id === activeIdStr);
        const newIdx = allInCategory.findIndex(s => s.id === overIdStr);
        const reordered = arrayMove(allInCategory, oldIdx, newIdx);

        // Rebuild sections array preserving order
        const newSections = sections.filter(s => s.category !== targetCategory);
        const insertIndex = sections.findIndex(s => s.category === targetCategory);
        newSections.splice(insertIndex >= 0 ? insertIndex : newSections.length, 0, ...reordered);
        saveSectionsOrder(newSections);
      } else {
        // Move to different category
        const newSections = sections.map(s =>
          s.id === activeIdStr ? { ...s, category: targetCategory } : s
        );
        saveSectionsOrder(newSections);
      }
    }
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim() && !categories.includes(newCategoryName.trim())) {
      const newCategories = [...categories, newCategoryName.trim()];
      saveCategoryOrder(newCategories);
      setNewCategoryName('');
      setShowAddCategory(false);
    }
  };

  const handleDeleteCategory = (categoryToDelete: string) => {
    // Check if category has any sections
    const hasSections = defaultSections.some(s => s.category === categoryToDelete);
    if (hasSections) {
      alert('Нельзя удалить раздел, в котором есть карточки');
      return;
    }
    const newCategories = categories.filter(c => c !== categoryToDelete);
    saveCategoryOrder(newCategories);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const endpoints = [
        { key: 'languages', url: '/api/database/languages' },
        { key: 'gradeLevels', url: '/api/database/grade-levels' },
        { key: 'studyDirections', url: '/api/database/study-directions' },
        { key: 'subjects', url: '/api/database/subjects' },
        { key: 'topics', url: '/api/database/topics' },
        { key: 'regions', url: '/api/database/regions' },
        { key: 'cities', url: '/api/database/cities' },
        { key: 'schools', url: '/api/database/schools' },
        { key: 'branches', url: '/api/database/branches' },
        { key: 'classrooms', url: '/api/database/classrooms' },
        { key: 'groups', url: '/api/database/groups' },
        { key: 'teacherCategories', url: '/api/database/teacher-categories' },
        { key: 'specialNeeds', url: '/api/database/special-needs' },
        { key: 'groupIndexes', url: '/api/database/group-indexes' },
        { key: 'userRoles', url: '/api/database/user-roles' },
        { key: 'genders', url: '/api/database/genders' },
        { key: 'citizenships', url: '/api/database/citizenships' },
        { key: 'studyFormats', url: '/api/database/study-formats' },
        { key: 'guarantees', url: '/api/database/guarantees' },
        { key: 'studySchedules', url: '/api/database/study-schedules' },
        { key: 'parentDocumentTypes', url: '/api/database/parent-document-types' },
        // Статусы
        { key: 'studentStatuses', url: '/api/database/student-statuses' },
        { key: 'teacherStatuses', url: '/api/database/teacher-statuses' },
        { key: 'paymentStatuses', url: '/api/database/payment-statuses' },
        { key: 'contractStatuses', url: '/api/database/contract-statuses' },
        { key: 'homeworkStatuses', url: '/api/database/homework-statuses' },
        { key: 'orderStatuses', url: '/api/database/order-statuses' },
        { key: 'messageStatuses', url: '/api/database/message-statuses' },
        // Типы и форматы
        { key: 'testTypes', url: '/api/database/test-types' },
        { key: 'questionTypes', url: '/api/database/question-types' },
        { key: 'taskFormats', url: '/api/database/task-formats' },
        { key: 'lessonTypes', url: '/api/database/lesson-types' },
        { key: 'difficultyLevels', url: '/api/database/difficulty-levels' },
        { key: 'generatedTestFormats', url: '/api/database/generated-test-formats' },
        { key: 'resourceTypes', url: '/api/database/resource-types' },
        { key: 'notificationTypes', url: '/api/database/notification-types' },
        { key: 'transactionTypes', url: '/api/database/transaction-types' },
        // Оплата
        { key: 'salaryFormats', url: '/api/database/salary-formats' },
        { key: 'paymentMethods', url: '/api/database/payment-methods' },
        { key: 'paymentPlans', url: '/api/database/payment-plans' },
        // Системные
        { key: 'timeOfDay', url: '/api/database/time-of-day' },
      ];

      const results = await Promise.all(
        endpoints.map(async (ep) => {
          try {
            const res = await fetch(ep.url);
            if (res.ok) {
              const data = await res.json();
              return { key: ep.key, count: Array.isArray(data) ? data.length : 0 };
            }
            return { key: ep.key, count: 0 };
          } catch {
            return { key: ep.key, count: 0 };
          }
        })
      );

      const statsObj: Stats = {};
      results.forEach((r) => {
        statsObj[r.key] = r.count;
      });
      setStats(statsObj);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'groups': return <GroupsSection />;
      case 'languages': return <LanguagesSection />;
      case 'gradeLevels': return <GradeLevelsSection />;
      case 'studyDirections': return <StudyDirectionsSection />;
      case 'subjects': return <SubjectsSection />;
      case 'topics': return <TopicsSection />;
      case 'regions': return <RegionsSection />;
      case 'cities': return <CitiesSection />;
      case 'schools': return <SchoolsSection />;
      case 'specialNeeds': return <SpecialNeedsSection />;
      case 'groupIndexes': return <GroupIndexesSection />;
      case 'teacherCategories': return <TeacherCategoriesSection />;
      case 'branches': return <BranchesSection />;
      case 'classrooms': return <ClassroomsSection />;
      case 'userRoles': return <UserRolesSection />;
      case 'genders': return <GendersSection />;
      case 'citizenships': return <CitizenshipsSection />;
      case 'studyFormats': return <StudyFormatsSection />;
      case 'guarantees': return <GuaranteesSection />;
      case 'studySchedules': return <StudySchedulesSection />;
      case 'parentDocumentTypes': return <ParentDocumentTypesSection />;
      // Статусы
      case 'studentStatuses': return <GenericEnumSection apiEndpoint="/api/database/student-statuses" itemName="Статус студента" itemNamePlural="Статусы студентов" showColor />;
      case 'teacherStatuses': return <GenericEnumSection apiEndpoint="/api/database/teacher-statuses" itemName="Статус учителя" itemNamePlural="Статусы учителей" showColor />;
      case 'paymentStatuses': return <GenericEnumSection apiEndpoint="/api/database/payment-statuses" itemName="Статус оплаты" itemNamePlural="Статусы оплаты" showColor />;
      case 'contractStatuses': return <GenericEnumSection apiEndpoint="/api/database/contract-statuses" itemName="Статус договора" itemNamePlural="Статусы договоров" showColor />;
      case 'homeworkStatuses': return <GenericEnumSection apiEndpoint="/api/database/homework-statuses" itemName="Статус ДЗ" itemNamePlural="Статусы ДЗ" showColor />;
      case 'orderStatuses': return <GenericEnumSection apiEndpoint="/api/database/order-statuses" itemName="Статус заказа" itemNamePlural="Статусы заказов" showColor />;
      case 'messageStatuses': return <GenericEnumSection apiEndpoint="/api/database/message-statuses" itemName="Статус сообщения" itemNamePlural="Статусы сообщений" />;
      // Типы и форматы
      case 'testTypes': return <GenericEnumSection apiEndpoint="/api/database/test-types" itemName="Тип теста" itemNamePlural="Типы тестов" />;
      case 'questionTypes': return <GenericEnumSection apiEndpoint="/api/database/question-types" itemName="Тип вопроса" itemNamePlural="Типы вопросов" />;
      case 'taskFormats': return <GenericEnumSection apiEndpoint="/api/database/task-formats" itemName="Формат задания" itemNamePlural="Форматы заданий" />;
      case 'lessonTypes': return <GenericEnumSection apiEndpoint="/api/database/lesson-types" itemName="Тип урока" itemNamePlural="Типы уроков" />;
      case 'difficultyLevels': return <GenericEnumSection apiEndpoint="/api/database/difficulty-levels" itemName="Уровень сложности" itemNamePlural="Уровни сложности" />;
      case 'generatedTestFormats': return <GenericEnumSection apiEndpoint="/api/database/generated-test-formats" itemName="Формат теста" itemNamePlural="Форматы тестов" />;
      case 'resourceTypes': return <GenericEnumSection apiEndpoint="/api/database/resource-types" itemName="Тип ресурса" itemNamePlural="Типы ресурсов" showIcon />;
      case 'notificationTypes': return <GenericEnumSection apiEndpoint="/api/database/notification-types" itemName="Тип уведомления" itemNamePlural="Типы уведомлений" showIcon showColor />;
      case 'transactionTypes': return <GenericEnumSection apiEndpoint="/api/database/transaction-types" itemName="Тип транзакции" itemNamePlural="Типы транзакций" />;
      // Оплата
      case 'salaryFormats': return <GenericEnumSection apiEndpoint="/api/database/salary-formats" itemName="Формат зарплаты" itemNamePlural="Форматы зарплаты" />;
      case 'paymentMethods': return <GenericEnumSection apiEndpoint="/api/database/payment-methods" itemName="Способ оплаты" itemNamePlural="Способы оплаты" showCommission />;
      case 'paymentPlans': return <GenericEnumSection apiEndpoint="/api/database/payment-plans" itemName="План оплаты" itemNamePlural="Планы оплаты" />;
      // Системные
      case 'timeOfDay': return <GenericEnumSection apiEndpoint="/api/database/time-of-day" itemName="Время суток" itemNamePlural="Время суток" />;
      default: return null;
    }
  };

  const activeSectionData = defaultSections.find((s: Section) => s.id === activeSection);

  const getSectionIcon = (sectionId: string) => {
    const icons: { [key: string]: React.ReactNode } = {
      gradeLevels: (
        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
        </svg>
      ),
      languages: (
        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
      ),
      subjects: (
        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
      ),
      users: (
        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      ),
    };
    return icons[sectionId] || (
      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
      </svg>
    );
  };

  if (activeSection) {
    const itemCount = stats[activeSection] || 0;

    return (
      <div className="relative">
        {/* Header with back button */}
        <div className="mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveSection(null)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="w-10 h-10 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 rounded-xl flex-shrink-0">
              {getSectionIcon(activeSection)}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {activeSectionData?.name} ({itemCount})
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Всего: {itemCount}</p>
            </div>
          </div>
        </div>

        {/* Section Content */}
        {renderSection()}
      </div>
    );
  }

  // Calculate total sections count
  const totalSections = defaultSections.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              База данных
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Всего: {totalSections} разделов
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsReorderMode(!isReorderMode)}
            className={`p-2.5 rounded-xl transition-colors ${
              isReorderMode
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
            title={isReorderMode ? 'Выйти из режима сортировки' : 'Изменить порядок разделов'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
          <button
            onClick={() => setShowAddCategory(true)}
            className="p-2.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-xl transition-colors"
            title="Добавить раздел"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск разделов..."
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

      {/* Add Category Modal */}
      {showAddCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Добавить новый раздел
            </h3>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Название раздела"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddCategory();
                if (e.key === 'Escape') setShowAddCategory(false);
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddCategory(false);
                  setNewCategoryName('');
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleAddCategory}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={categories.map(c => `category-${c}`)} strategy={verticalListSortingStrategy}>
          <div className="space-y-8">
            {categories.map((category) => {
              const categorySections = sections.filter((s: Section) =>
                s.category === category &&
                (!searchQuery.trim() || s.name.toLowerCase().includes(searchQuery.trim().toLowerCase()))
              );
              if (categorySections.length === 0 && !isReorderMode) return null;

              return (
                <SortableCategory
                  key={category}
                  category={category}
                  isReorderMode={isReorderMode}
                  isEmpty={categorySections.length === 0}
                  onDelete={() => handleDeleteCategory(category)}
                >
                  {/* Section Cards */}
                  {categorySections.length > 0 ? (
                    <SortableContext items={categorySections.map(s => s.id)} strategy={rectSortingStrategy}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {categorySections.map((section: Section) => (
                          <SortableCard
                            key={section.id}
                            section={section}
                            isReorderMode={isReorderMode}
                            onClick={() => setActiveSection(section.id)}
                            getSectionIcon={getSectionIcon}
                            stats={stats}
                            loadingStats={loadingStats}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  ) : (
                    <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl">
                      Пустой раздел
                    </div>
                  )}
                </SortableCategory>
              );
            })}
          </div>
        </SortableContext>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeId && !activeId.startsWith('category-') && (
            <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border-2 border-blue-500 shadow-xl">
              <div className="w-12 h-12 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-xl flex-shrink-0">
                {getSectionIcon(activeId)}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {sections.find(s => s.id === activeId)?.name}
                </span>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
