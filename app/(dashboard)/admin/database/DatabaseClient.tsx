'use client';

import { useState } from 'react';

interface Classroom {
  id: string;
  name: string;
  capacity: number;
  equipment: string[];
  isActive: boolean;
}

interface Branch {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
  classrooms: Classroom[];
}

interface Subject {
  id: string;
  name: string;
  nameRu: string | null;
  nameKz: string | null;
  nameEn: string | null;
  icon: string | null;
  orderIndex: number;
  isActive: boolean;
}

interface Subtopic {
  id: string;
  name: string;
  orderIndex: number;
  isActive: boolean;
}

interface Topic {
  id: string;
  name: string;
  icon: string | null;
  orderIndex: number;
  isActive: boolean;
  subtopics: Subtopic[];
}

interface DatabaseClientProps {
  initialBranches: Branch[];
  initialSubjects: Subject[];
  initialMathTopics: Topic[];
  userRole: string;
}

export default function DatabaseClient({
  initialBranches,
  initialSubjects,
  initialMathTopics,
  userRole,
}: DatabaseClientProps) {
  const [activeTab, setActiveTab] = useState<'branches' | 'subjects' | 'topics'>('branches');
  const [branches, setBranches] = useState(initialBranches);
  const [subjects, setSubjects] = useState(initialSubjects);
  const [topics, setTopics] = useState(initialMathTopics);

  const tabs = [
    { id: 'branches', label: 'Филиалы и аудитории', icon: '🏢' },
    { id: 'subjects', label: 'Предметы', icon: '📚' },
    { id: 'topics', label: 'Темы по математике', icon: '🧮' },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-200 p-1.5">
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex-1 py-3 px-4 rounded-xl font-medium text-sm whitespace-nowrap transition-all
                ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50'
                }
              `}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Branches Tab */}
      {activeTab === 'branches' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Филиалы</h2>
            <button className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">
              + Добавить филиал
            </button>
          </div>

          <div className="grid gap-6">
            {branches.map((branch) => (
              <div key={branch.id} className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{branch.name}</h3>
                    {branch.address && <p className="text-sm text-gray-600 mt-1">{branch.address}</p>}
                    {branch.phone && <p className="text-sm text-gray-600">{branch.phone}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      Редактировать
                    </button>
                    <button className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      {branch.isActive ? 'Деактивировать' : 'Активировать'}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-medium text-gray-700">
                      Аудитории ({branch.classrooms.length})
                    </h4>
                    <button className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                      + Добавить аудиторию
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {branch.classrooms.map((classroom) => (
                      <div
                        key={classroom.id}
                        className={`
                          p-3 rounded-xl border transition-colors
                          ${classroom.isActive ? 'border-gray-200 bg-gray-50 hover:bg-gray-100' : 'border-gray-100 bg-gray-100 opacity-60'}
                        `}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{classroom.name}</p>
                            <p className="text-xs text-gray-600 mt-1">
                              До {classroom.capacity} чел.
                            </p>
                          </div>
                          <button className="text-gray-400 hover:text-gray-600 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>
                        </div>
                        {classroom.equipment.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {classroom.equipment.map((eq, idx) => (
                              <span
                                key={idx}
                                className="text-xs px-2 py-0.5 bg-white border border-gray-200 rounded-md text-gray-700"
                              >
                                {eq}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subjects Tab */}
      {activeTab === 'subjects' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Предметы</h2>
            <button className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">
              + Добавить предмет
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Порядок
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Иконка
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Название
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    RU
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    KZ
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    EN
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {subjects.map((subject) => (
                  <tr key={subject.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {subject.orderIndex}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-lg">
                      {subject.icon || '📚'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {subject.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {subject.nameRu || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {subject.nameKz || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {subject.nameEn || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`
                        px-2.5 py-1 inline-flex text-xs leading-5 font-medium rounded-lg border
                        ${subject.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'}
                      `}>
                        {subject.isActive ? 'Активен' : 'Неактивен'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-800 mr-3 transition-colors">
                        Редактировать
                      </button>
                      <button className="text-red-600 hover:text-red-800 transition-colors">
                        {subject.isActive ? 'Деактивировать' : 'Активировать'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Topics Tab */}
      {activeTab === 'topics' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Темы по математике</h2>
            <button className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">
              + Добавить тему
            </button>
          </div>

          <div className="space-y-4">
            {topics.map((topic) => (
              <div key={topic.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-xl">
                        {topic.icon}
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">{topic.name}</h3>
                        <p className="text-xs text-gray-500">
                          {topic.subtopics.length} подтем
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                        + Добавить подтему
                      </button>
                      <button className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        Редактировать
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <div className="grid gap-2">
                    {topic.subtopics.map((subtopic, idx) => (
                      <div
                        key={subtopic.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium text-gray-500 w-6">
                            {subtopic.orderIndex}.
                          </span>
                          <span className="text-sm font-medium text-gray-900">{subtopic.name}</span>
                        </div>
                        <div className="flex gap-2">
                          <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
