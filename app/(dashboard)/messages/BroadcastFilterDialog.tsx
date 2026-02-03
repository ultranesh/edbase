'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface FilterOption {
  id: string;
  name: string;
  code?: string;
  regionId?: string;
  cityId?: string;
}

interface ScheduleOption {
  code: string;
  name: string;
}

interface FilterOptions {
  gradeLevels: FilterOption[];
  regions: FilterOption[];
  cities: FilterOption[];
  schools: FilterOption[];
  branches: FilterOption[];
  languages: FilterOption[];
  studySchedules: ScheduleOption[];
}

export interface BroadcastFilters {
  recipientType: 'PARENT' | 'STUDENT';
  gradeLevelIds?: string[];
  regionIds?: string[];
  cityIds?: string[];
  schoolIds?: string[];
  branchIds?: string[];
  languageIds?: string[];
  studySchedules?: string[];
}

interface BroadcastFilterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (filters: BroadcastFilters) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function MultiSelectSection({
  title,
  options,
  selectedIds,
  onToggle,
  onSelectAll,
  onDeselectAll,
  isOpen,
  onToggleOpen,
  t,
}: {
  title: string;
  options: { id: string; name: string }[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  t: (key: string) => string;
}) {
  const allSelected = options.length > 0 && selectedIds.length === options.length;

  return (
    <div className="border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onToggleOpen}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</span>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-full">
              {selectedIds.length}
            </span>
          )}
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {isOpen && (
        <div className="p-3 max-h-48 overflow-y-auto">
          {options.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">—</p>
          ) : (
            <>
              <div className="flex justify-end mb-2">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); allSelected ? onDeselectAll() : onSelectAll(); }}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
                >
                  {allSelected ? t('broadcast.deselectAll') : t('broadcast.selectAll')}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {options.map((opt) => {
                  const isSelected = selectedIds.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onToggle(opt.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border-2 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/30'
                      }`}
                    >
                      {opt.name}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function BroadcastFilterDialog({ isOpen, onClose, onSend, t }: BroadcastFilterDialogProps) {
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [recipientType, setRecipientType] = useState<'PARENT' | 'STUDENT' | null>(null);
  const [gradeLevelIds, setGradeLevelIds] = useState<string[]>([]);
  const [regionIds, setRegionIds] = useState<string[]>([]);
  const [cityIds, setCityIds] = useState<string[]>([]);
  const [schoolIds, setSchoolIds] = useState<string[]>([]);
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [languageIds, setLanguageIds] = useState<string[]>([]);
  const [studySchedules, setStudySchedules] = useState<string[]>([]);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch filter options on open
  useEffect(() => {
    if (isOpen && !options) {
      setLoading(true);
      fetch('/api/broadcast/filter-options')
        .then((r) => r.json())
        .then((data) => setOptions(data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [isOpen, options]);

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      setRecipientType(null);
      setGradeLevelIds([]);
      setRegionIds([]);
      setCityIds([]);
      setSchoolIds([]);
      setBranchIds([]);
      setLanguageIds([]);
      setStudySchedules([]);
      setRecipientCount(null);
      setOpenSections({});
    }
  }, [isOpen]);

  // Debounced recipient count
  const resolveCount = useCallback(() => {
    if (!recipientType) {
      setRecipientCount(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setCountLoading(true);
      try {
        const filters: BroadcastFilters = { recipientType };
        if (gradeLevelIds.length) filters.gradeLevelIds = gradeLevelIds;
        if (regionIds.length) filters.regionIds = regionIds;
        if (cityIds.length) filters.cityIds = cityIds;
        if (schoolIds.length) filters.schoolIds = schoolIds;
        if (branchIds.length) filters.branchIds = branchIds;
        if (languageIds.length) filters.languageIds = languageIds;
        if (studySchedules.length) filters.studySchedules = studySchedules;

        const res = await fetch('/api/broadcast/resolve-recipients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(filters),
        });
        if (res.ok) {
          const data = await res.json();
          setRecipientCount(data.count);
        }
      } catch {
        setRecipientCount(null);
      } finally {
        setCountLoading(false);
      }
    }, 500);
  }, [recipientType, gradeLevelIds, regionIds, cityIds, schoolIds, branchIds, languageIds, studySchedules]);

  useEffect(() => {
    resolveCount();
  }, [resolveCount]);

  const toggleId = (list: string[], setList: (v: string[]) => void, id: string) => {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Filter cities by selected regions
  const filteredCities = options?.cities.filter((c) => {
    if (regionIds.length === 0) return true;
    return regionIds.includes(c.regionId || '');
  }) || [];

  const handleSend = () => {
    if (!recipientType || recipientCount === 0) return;
    const filters: BroadcastFilters = { recipientType };
    if (gradeLevelIds.length) filters.gradeLevelIds = gradeLevelIds;
    if (regionIds.length) filters.regionIds = regionIds;
    if (cityIds.length) filters.cityIds = cityIds;
    if (schoolIds.length) filters.schoolIds = schoolIds;
    if (branchIds.length) filters.branchIds = branchIds;
    if (languageIds.length) filters.languageIds = languageIds;
    if (studySchedules.length) filters.studySchedules = studySchedules;
    onSend(filters);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {t('broadcast.filterTitle')}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Recipient type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('broadcast.recipientType')}
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setRecipientType('PARENT')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors border-2 ${
                      recipientType === 'PARENT'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                    }`}
                  >
                    {t('broadcast.parents')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientType('STUDENT')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors border-2 ${
                      recipientType === 'STUDENT'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                    }`}
                  >
                    {t('broadcast.students')}
                  </button>
                </div>
              </div>

              {recipientType && options && (
                <div className="space-y-2">
                  <MultiSelectSection
                    title={t('broadcast.gradeLevel')}
                    options={options.gradeLevels.map((g) => ({ id: g.id, name: g.code || g.name }))}
                    selectedIds={gradeLevelIds}
                    onToggle={(id) => toggleId(gradeLevelIds, setGradeLevelIds, id)}
                    onSelectAll={() => setGradeLevelIds(options.gradeLevels.map((g) => g.id))}
                    onDeselectAll={() => setGradeLevelIds([])}
                    isOpen={!!openSections.grades}
                    onToggleOpen={() => toggleSection('grades')}
                    t={t}
                  />
                  <MultiSelectSection
                    title={t('broadcast.region')}
                    options={options.regions}
                    selectedIds={regionIds}
                    onToggle={(id) => {
                      const newRegionIds = regionIds.includes(id) ? regionIds.filter((x) => x !== id) : [...regionIds, id];
                      setRegionIds(newRegionIds);
                      if (newRegionIds.length > 0) {
                        const validCityIds = options.cities.filter((c) => newRegionIds.includes(c.regionId || '')).map((c) => c.id);
                        setCityIds(cityIds.filter((cid) => validCityIds.includes(cid)));
                      }
                    }}
                    onSelectAll={() => {
                      setRegionIds(options.regions.map((r) => r.id));
                    }}
                    onDeselectAll={() => {
                      setRegionIds([]);
                      setCityIds([]);
                    }}
                    isOpen={!!openSections.regions}
                    onToggleOpen={() => toggleSection('regions')}
                    t={t}
                  />
                  <MultiSelectSection
                    title={t('broadcast.city')}
                    options={filteredCities}
                    selectedIds={cityIds}
                    onToggle={(id) => toggleId(cityIds, setCityIds, id)}
                    onSelectAll={() => setCityIds(filteredCities.map((c) => c.id))}
                    onDeselectAll={() => setCityIds([])}
                    isOpen={!!openSections.cities}
                    onToggleOpen={() => toggleSection('cities')}
                    t={t}
                  />
                  <MultiSelectSection
                    title={t('broadcast.school')}
                    options={options.schools}
                    selectedIds={schoolIds}
                    onToggle={(id) => toggleId(schoolIds, setSchoolIds, id)}
                    onSelectAll={() => setSchoolIds(options.schools.map((s) => s.id))}
                    onDeselectAll={() => setSchoolIds([])}
                    isOpen={!!openSections.schools}
                    onToggleOpen={() => toggleSection('schools')}
                    t={t}
                  />
                  <MultiSelectSection
                    title={t('broadcast.branch')}
                    options={options.branches}
                    selectedIds={branchIds}
                    onToggle={(id) => toggleId(branchIds, setBranchIds, id)}
                    onSelectAll={() => setBranchIds(options.branches.map((b) => b.id))}
                    onDeselectAll={() => setBranchIds([])}
                    isOpen={!!openSections.branches}
                    onToggleOpen={() => toggleSection('branches')}
                    t={t}
                  />
                  <MultiSelectSection
                    title={t('broadcast.language')}
                    options={options.languages.map((l) => ({ id: l.id, name: l.name }))}
                    selectedIds={languageIds}
                    onToggle={(id) => toggleId(languageIds, setLanguageIds, id)}
                    onSelectAll={() => setLanguageIds(options.languages.map((l) => l.id))}
                    onDeselectAll={() => setLanguageIds([])}
                    isOpen={!!openSections.languages}
                    onToggleOpen={() => toggleSection('languages')}
                    t={t}
                  />
                  <MultiSelectSection
                    title={t('broadcast.studySchedule')}
                    options={options.studySchedules.map((s) => ({ id: s.code, name: s.name }))}
                    selectedIds={studySchedules}
                    onToggle={(id) => toggleId(studySchedules, setStudySchedules, id)}
                    onSelectAll={() => setStudySchedules(options.studySchedules.map((s) => s.code))}
                    onDeselectAll={() => setStudySchedules([])}
                    isOpen={!!openSections.schedules}
                    onToggleOpen={() => toggleSection('schedules')}
                    t={t}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {countLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </span>
            ) : recipientCount !== null ? (
              <span className={recipientCount === 0 ? 'text-red-500' : 'text-green-600 dark:text-green-400 font-medium'}>
                {t('broadcast.recipientCount', { count: recipientCount })}
              </span>
            ) : (
              <span>{t('broadcast.selectRecipientType')}</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSend}
              disabled={!recipientType || recipientCount === null || recipientCount === 0 || countLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {t('broadcast.send')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
