'use client';

import { useState, useRef, useEffect } from 'react';
import TeacherDetailSlideOver from './TeacherDetailSlideOver';
import { useLanguage } from '@/app/components/LanguageProvider';
import { useAvatarLightbox } from '@/app/components/AvatarLightbox';

interface RefOption {
  id: string;
  name: string;
}

interface SubjectOption {
  id: string;
  nameRu: string | null;
  nameKz: string | null;
}

interface Teacher {
  id: string;
  dateOfBirth: Date | null;
  iin: string | null;
  phone: string | null;
  categoryId: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'RESERVE';
  salaryFormat: 'HOURLY' | 'MONTHLY' | null;
  salaryAmount: number | null;
  isActive: boolean;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    middleName: string | null;
    phone: string | null;
    avatar: string | null;
    lastLogin: Date | null;
    createdAt: Date;
  };
  category: RefOption | null;
  subjects: { id: string; subject: SubjectOption }[];
  branches: { id: string; branch: RefOption }[];
}

interface Filters {
  subject: string[];
  category: string[];
  branch: string[];
}

const emptyFilters: Filters = {
  subject: [],
  category: [],
  branch: [],
};

interface TeachersClientProps {
  initialTeachers: Teacher[];
  subjects: SubjectOption[];
  branches: RefOption[];
  categories: RefOption[];
  userRole: string;
}

export default function TeachersClient({
  initialTeachers,
  subjects,
  branches,
  categories,
  userRole,
}: TeachersClientProps) {
  const { t } = useLanguage();
  const { openAvatar } = useAvatarLightbox();
  const [teachers] = useState<Teacher[]>(initialTeachers);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'reserve'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [activeFilterCategory, setActiveFilterCategory] = useState<keyof Filters | null>(null);
  const filterPanelRef = useRef<HTMLDivElement>(null);

  // Close filter panel on outside click
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

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterPanel]);

  const handleTeacherClick = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setIsSlideOverOpen(true);
  };

  const handleCloseSlideOver = () => {
    setIsSlideOverOpen(false);
    setSelectedTeacher(null);
  };

  const handleUpdate = () => {
    window.location.reload();
  };

  const toggleFilter = (category: keyof Filters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [category]: prev[category].includes(value)
        ? prev[category].filter(v => v !== value)
        : [...prev[category], value],
    }));
  };

  const resetFilters = () => {
    setFilters(emptyFilters);
  };

  const activeFilterCount = Object.values(filters).flat().length;

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      ACTIVE: { label: t('teachers.statusActive'), className: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700' },
      SUSPENDED: { label: t('teachers.statusSuspended'), className: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700' },
      RESERVE: { label: t('teachers.statusReserve'), className: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700' },
    };
    return badges[status] || { label: status, className: 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600' };
  };

  const filteredTeachers = teachers.filter(t => {
    // Status filter
    const statusMatch =
      statusFilter === 'all' ? true :
      statusFilter === 'active' ? t.status === 'ACTIVE' :
      statusFilter === 'suspended' ? t.status === 'SUSPENDED' :
      statusFilter === 'reserve' ? t.status === 'RESERVE' :
      true;

    if (!statusMatch) return false;

    // Advanced filters
    if (filters.subject.length > 0) {
      const teacherSubjects = t.subjects.map(s => s.subject.nameRu || s.subject.nameKz || '');
      if (!filters.subject.some(s => teacherSubjects.includes(s))) {
        return false;
      }
    }
    if (filters.category.length > 0 && !filters.category.includes(t.category?.name || '')) {
      return false;
    }
    if (filters.branch.length > 0) {
      const teacherBranches = t.branches.map(b => b.branch.name);
      if (!filters.branch.some(b => teacherBranches.includes(b))) {
        return false;
      }
    }

    // Search filter
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase().trim();
    const fullName = `${t.user.lastName} ${t.user.firstName} ${t.user.middleName || ''}`.toLowerCase();
    const phone = (t.phone || t.user.phone || '').toLowerCase();

    return fullName.includes(query) || phone.includes(query);
  });

  return (
    <>
      <div className="space-y-6">
        {/* Header with filters */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('teachers.title')}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('teachers.total', { count: teachers.length })}
                </p>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2">
              {[
                { key: 'all', label: t('teachers.filterAll') },
                { key: 'active', label: t('teachers.filterActive') },
                { key: 'suspended', label: t('teachers.filterSuspended') },
                { key: 'reserve', label: t('teachers.filterReserve') },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key as typeof statusFilter)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    statusFilter === tab.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search and filter bar */}
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
                placeholder={t('teachers.search')}
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

            {/* Filter button and panel */}
            <div className="relative" ref={filterPanelRef}>
              <button
                onClick={() => {
                  setShowFilterPanel(!showFilterPanel);
                  if (showFilterPanel) setActiveFilterCategory(null);
                }}
                className={`px-3 py-2.5 rounded-xl border transition-colors flex items-center gap-2 ${
                  showFilterPanel || activeFilterCount > 0
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
                  {/* Options panel (left side) */}
                  {activeFilterCategory && (
                    <div className="w-64 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl mr-2 flex flex-col max-h-[480px]">
                      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {activeFilterCategory === 'subject' && t('teachers.subject')}
                          {activeFilterCategory === 'category' && t('teachers.category')}
                          {activeFilterCategory === 'branch' && t('teachers.branch')}
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
                        {activeFilterCategory === 'subject' && subjects.map(option => (
                          <button
                            key={option.id}
                            onClick={() => toggleFilter('subject', option.nameRu || option.nameKz || '')}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              filters.subject.includes(option.nameRu || option.nameKz || '')
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            {option.nameRu || option.nameKz}
                          </button>
                        ))}
                        {/* Category options */}
                        {activeFilterCategory === 'category' && categories.map(option => (
                          <button
                            key={option.id}
                            onClick={() => toggleFilter('category', option.name)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              filters.category.includes(option.name)
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            {option.name}
                          </button>
                        ))}
                        {/* Branch options */}
                        {activeFilterCategory === 'branch' && branches.map(option => (
                          <button
                            key={option.id}
                            onClick={() => toggleFilter('branch', option.name)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              filters.branch.includes(option.name)
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            {option.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Categories panel (right side) */}
                  <div className="w-56 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{t('teachers.filters')}</span>
                      {activeFilterCount > 0 && (
                        <button
                          onClick={resetFilters}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700"
                        >
                          {t('teachers.reset')}
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
                        <span className="text-sm">{t('teachers.subject')}</span>
                        <div className="flex items-center gap-2">
                          {filters.subject.length > 0 && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                              {filters.subject.length}
                            </span>
                          )}
                          <svg className={`w-4 h-4 transition-transform ${activeFilterCategory === 'subject' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </div>
                      </button>

                      {/* Category */}
                      <button
                        onClick={() => setActiveFilterCategory(activeFilterCategory === 'category' ? null : 'category')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                          activeFilterCategory === 'category'
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span className="text-sm">{t('teachers.category')}</span>
                        <div className="flex items-center gap-2">
                          {filters.category.length > 0 && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                              {filters.category.length}
                            </span>
                          )}
                          <svg className={`w-4 h-4 transition-transform ${activeFilterCategory === 'category' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </div>
                      </button>

                      {/* Branch */}
                      <button
                        onClick={() => setActiveFilterCategory(activeFilterCategory === 'branch' ? null : 'branch')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                          activeFilterCategory === 'branch'
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span className="text-sm">{t('teachers.branch')}</span>
                        <div className="flex items-center gap-2">
                          {filters.branch.length > 0 && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                              {filters.branch.length}
                            </span>
                          )}
                          <svg className={`w-4 h-4 transition-transform ${activeFilterCategory === 'branch' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        {/* Teachers Table */}
        {filteredTeachers.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">{t('teachers.title')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">{t('teachers.contacts')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">{t('teachers.category')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">{t('teachers.subjects')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">{t('teachers.branches')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">{t('teachers.status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredTeachers.map((teacher) => (
                    <tr
                      key={teacher.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                      onClick={() => handleTeacherClick(teacher)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {teacher.user.avatar ? (
                            <div
                              className="h-9 w-9 rounded-full shrink-0 overflow-hidden bg-gray-200 dark:bg-gray-700 cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); openAvatar(teacher.user.avatar!, `${teacher.user.firstName} ${teacher.user.lastName}`); }}
                            >
                              <img src={teacher.user.avatar} alt="" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                              teacher.status === 'SUSPENDED' ? 'bg-red-500' :
                              teacher.status === 'RESERVE' ? 'bg-amber-500' :
                              'bg-blue-600'
                            }`}>
                              <span className="text-xs font-medium text-white">
                                {teacher.user.firstName[0]}{teacher.user.lastName[0]}
                              </span>
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {teacher.user.lastName} {teacher.user.firstName}
                            </div>
                            {teacher.user.middleName && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">{teacher.user.middleName}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">{teacher.phone || teacher.user.phone || '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900 dark:text-white">{teacher.category?.name || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {teacher.subjects.slice(0, 2).map((s) => (
                            <span
                              key={s.id}
                              className="px-2 py-0.5 text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded"
                            >
                              {s.subject.nameRu || s.subject.nameKz}
                            </span>
                          ))}
                          {teacher.subjects.length > 2 && (
                            <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded">
                              +{teacher.subjects.length - 2}
                            </span>
                          )}
                          {teacher.subjects.length === 0 && (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {teacher.branches.slice(0, 2).map((b) => (
                            <span
                              key={b.id}
                              className="px-2 py-0.5 text-xs bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded"
                            >
                              {b.branch.name}
                            </span>
                          ))}
                          {teacher.branches.length > 2 && (
                            <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded">
                              +{teacher.branches.length - 2}
                            </span>
                          )}
                          {teacher.branches.length === 0 && (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-lg ${getStatusBadge(teacher.status).className}`}>
                          {getStatusBadge(teacher.status).label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('teachers.noTeachersFound')}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {searchQuery || activeFilterCount > 0
                  ? t('teachers.noResults')
                  : statusFilter !== 'all'
                    ? t('teachers.noTeachersStatus')
                    : t('teachers.addFirst')
                }
              </p>
              {(searchQuery || activeFilterCount > 0) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    resetFilters();
                  }}
                  className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  {t('teachers.resetFilters')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <TeacherDetailSlideOver
        teacher={selectedTeacher}
        isOpen={isSlideOverOpen}
        onClose={handleCloseSlideOver}
        onUpdate={handleUpdate}
        userRole={userRole}
        subjects={subjects}
        branches={branches}
        categories={categories}
      />
    </>
  );
}
