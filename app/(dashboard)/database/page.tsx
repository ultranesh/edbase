'use client';

import { useState } from 'react';
import LanguagesSection from './sections/LanguagesSection';
import GradeLevelsSection from './sections/GradeLevelsSection';
import StudyDirectionsSection from './sections/StudyDirectionsSection';
import SubjectsSection from './sections/SubjectsSection';
import TopicsSection from './sections/TopicsSection';
import CitiesSection from './sections/CitiesSection';
import SchoolsSection from './sections/SchoolsSection';
import SpecialNeedsSection from './sections/SpecialNeedsSection';
import GroupIndexesSection from './sections/GroupIndexesSection';
import TeacherCategoriesSection from './sections/TeacherCategoriesSection';
import BranchesSection from './sections/BranchesSection';
import GroupsSection from './sections/GroupsSection';

interface Section {
  id: string;
  name: string;
  icon: string;
  description: string;
}

const sections: Section[] = [
  { id: 'groups', name: 'Группы', icon: '👥', description: 'Учебные группы с учениками и предметами' },
  { id: 'languages', name: 'Языки', icon: '🌐', description: 'Языки обучения (казахский, русский, английский)' },
  { id: 'gradeLevels', name: 'Классы', icon: '🎓', description: 'Уровни обучения (0-11 класс, выпускник)' },
  { id: 'studyDirections', name: 'Направления', icon: '🎯', description: 'Направления обучения (СС, ЕНТ, IELTS и др.)' },
  { id: 'subjects', name: 'Предметы', icon: '📚', description: 'Учебные предметы' },
  { id: 'topics', name: 'Темы и подтемы', icon: '📋', description: 'Темы и подтемы по предметам' },
  { id: 'cities', name: 'Города', icon: '🏙️', description: 'Города Казахстана' },
  { id: 'schools', name: 'Школы', icon: '🏫', description: 'Школы по городам' },
  { id: 'specialNeeds', name: 'Особенности', icon: '♿', description: 'Особые образовательные потребности' },
  { id: 'groupIndexes', name: 'Индексы групп', icon: '🔤', description: 'Греческие буквы для названий групп' },
  { id: 'teacherCategories', name: 'Категории преподавателей', icon: '👨‍🏫', description: 'Категории квалификации преподавателей' },
  { id: 'branches', name: 'Филиалы', icon: '🏢', description: 'Филиалы и аудитории' },
];

export default function DatabasePage() {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const renderSection = () => {
    switch (activeSection) {
      case 'groups':
        return <GroupsSection />;
      case 'languages':
        return <LanguagesSection />;
      case 'gradeLevels':
        return <GradeLevelsSection />;
      case 'studyDirections':
        return <StudyDirectionsSection />;
      case 'subjects':
        return <SubjectsSection />;
      case 'topics':
        return <TopicsSection />;
      case 'cities':
        return <CitiesSection />;
      case 'schools':
        return <SchoolsSection />;
      case 'specialNeeds':
        return <SpecialNeedsSection />;
      case 'groupIndexes':
        return <GroupIndexesSection />;
      case 'teacherCategories':
        return <TeacherCategoriesSection />;
      case 'branches':
        return <BranchesSection />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">База данных</h1>
          <p className="mt-1 text-sm text-gray-500">
            Управление справочными таблицами системы
          </p>
        </div>
        {activeSection && (
          <button
            onClick={() => setActiveSection(null)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Назад к разделам
          </button>
        )}
      </div>

      {/* Content */}
      {activeSection ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {renderSection()}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className="flex items-start p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-left group"
            >
              <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-blue-50 rounded-lg text-2xl group-hover:bg-blue-100 transition-colors">
                {section.icon}
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {section.name}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {section.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
