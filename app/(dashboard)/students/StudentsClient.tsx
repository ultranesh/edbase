'use client';

import { useState, useRef, useEffect } from 'react';
import { StudentStatus } from '@prisma/client';
import StudentDetailSlideOver from './StudentDetailSlideOver';
import { useNotification } from '@/app/components/ui/NotificationProvider';
import { useLanguage } from '@/app/components/LanguageProvider';
import { useAvatarLightbox } from '@/app/components/AvatarLightbox';

interface Student {
  id: string;
  status: StudentStatus;
  // Student info
  studentIIN: string | null;
  citizenship: string | null;
  dateOfBirth: Date | null;
  gender: string | null;
  address: string | null;
  // Parent info
  parentName: string | null;
  parentPhone: string | null;
  parentIIN: string | null;
  parentDocumentType: string | null;
  parentDocumentNumber: string | null;
  // Reference relations (with IDs for editing)
  gradeLevelId: string | null;
  gradeLevel: { id: string; name: string; code: string } | null;
  languageId: string | null;
  language: { id: string; name: string; code: string } | null;
  studyDirectionId: string | null;
  studyDirection: { id: string; name: string; code: string } | null;
  cityId: string | null;
  city: { id: string; name: string } | null;
  schoolId: string | null;
  school: { id: string; name: string } | null;
  branchId: string | null;
  branch: { id: string; name: string } | null;
  subjects: { subject: { id: string; nameRu: string | null; nameKz: string | null } }[];
  specialNeeds: { specialNeed: { id: string; name: string } }[];
  allergy: string | null;
  // Study conditions
  guarantee: string | null;
  studyFormat: string | null;
  studySchedule: string | null;
  customDays: string[];
  // Subscription
  standardMonths: number;
  bonusMonths: number;
  intensiveMonths: number;
  freezeDays: number;
  freezeEndDate: Date | null;
  // Payment
  paymentPlan: string | null;
  tranche1Amount: number | null;
  tranche1Date: Date | null;
  tranche2Amount: number | null;
  tranche2Date: Date | null;
  tranche3Amount: number | null;
  tranche3Date: Date | null;
  totalAmount: number | null;
  monthlyPayment: number | null;
  // Study period
  studyStartDate: Date | null;
  studyEndDate: Date | null;
  createdAt: Date;
  contractConfirmed: boolean;
  contractConfirmedAt: Date | null;
  user: {
    firstName: string;
    lastName: string;
    middleName: string | null;
    phone: string | null;
    avatar: string | null;
  };
}

interface FilterOption {
  id: string;
  name: string;
}

interface FilterOptions {
  gradeLevels: FilterOption[];
  languages: FilterOption[];
  studyDirections: FilterOption[];
  cities: FilterOption[];
  schools: FilterOption[];
  branches: FilterOption[];
  specialNeeds: FilterOption[];
}

interface Filters {
  gradeLevel: string[];
  language: string[];
  school: string[];
  studyDirection: string[];
  studyFormat: string[];
  guarantee: string[];
  city: string[];
  branch: string[];
  studySchedule: string[];
  gender: string[];
  specialNeeds: string[];
  hasAllergy: boolean | null;
}

const emptyFilters: Filters = {
  gradeLevel: [],
  language: [],
  school: [],
  studyDirection: [],
  studyFormat: [],
  guarantee: [],
  city: [],
  branch: [],
  studySchedule: [],
  gender: [],
  specialNeeds: [],
  hasAllergy: null,
};

// Check if birthday is tomorrow (or today for the day of)
function isBirthdaySoon(dateOfBirth: Date | string | null): boolean {
  if (!dateOfBirth) return false;

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dob = new Date(dateOfBirth);

  // Check if birthday is today or tomorrow (same month and day)
  const isTodayBirthday = dob.getDate() === today.getDate() && dob.getMonth() === today.getMonth();
  const isTomorrowBirthday = dob.getDate() === tomorrow.getDate() && dob.getMonth() === tomorrow.getMonth();

  return isTodayBirthday || isTomorrowBirthday;
}

// Crown component that overlays on avatar
function BirthdayCrown() {
  return (
    <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
      <svg width="24" height="18" viewBox="0 0 24 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M2 16L4 6L8 10L12 2L16 10L20 6L22 16H2Z"
          fill="url(#crownGradient)"
          stroke="#B8860B"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <circle cx="4" cy="5" r="1.5" fill="#FFD700"/>
        <circle cx="12" cy="1.5" r="1.5" fill="#FFD700"/>
        <circle cx="20" cy="5" r="1.5" fill="#FFD700"/>
        <defs>
          <linearGradient id="crownGradient" x1="12" y1="2" x2="12" y2="16" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFD700"/>
            <stop offset="1" stopColor="#FFA500"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

interface StudentsClientProps {
  initialStudents: Student[];
  pendingStudents: Student[];
  awaitingContractStudents: Student[];
  userRole: string;
  filterOptions: FilterOptions;
}

export default function StudentsClient({
  initialStudents,
  pendingStudents,
  awaitingContractStudents,
  userRole,
  filterOptions,
}: StudentsClientProps) {
  const { openAvatar } = useAvatarLightbox();
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [pending, setPending] = useState<Student[]>(pendingStudents);
  const [awaitingContract, setAwaitingContract] = useState<Student[]>(awaitingContractStudents);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'frozen' | 'inactive'>('all');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [activeFilterCategory, setActiveFilterCategory] = useState<string | null>(null);
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const { showToast, showConfirm, showPrompt } = useNotification();
  const { t } = useLanguage();

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
  const activeFilterCount = Object.values(filters).reduce((count, value) => {
    if (Array.isArray(value)) return count + value.length;
    if (value !== null) return count + 1;
    return count;
  }, 0);

  // Toggle filter value
  const toggleFilter = (key: keyof Filters, value: string) => {
    setFilters(prev => {
      const current = prev[key];
      if (Array.isArray(current)) {
        const newValue = current.includes(value)
          ? current.filter(v => v !== value)
          : [...current, value];
        return { ...prev, [key]: newValue };
      }
      return prev;
    });
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters(emptyFilters);
  };

  const isCurator = userRole === 'CURATOR' || userRole === 'ADMIN' || userRole === 'SUPERADMIN';

  // All students for total count (only confirmed students, not pending/awaiting)
  const allStudents = students;

  // Filter function for search, status, and advanced filters
  const filterStudents = (studentList: Student[]) => {
    return studentList.filter(student => {
      // Status filter
      const statusMatch =
        statusFilter === 'all' ? true :
        statusFilter === 'active' ? student.status === StudentStatus.ACTIVE :
        statusFilter === 'frozen' ? student.status === StudentStatus.FROZEN :
        statusFilter === 'inactive' ? student.status === StudentStatus.INACTIVE :
        true;

      if (!statusMatch) return false;

      // Advanced filters
      if (filters.gradeLevel.length > 0 && !filters.gradeLevel.includes(student.gradeLevel?.name || '')) {
        return false;
      }
      if (filters.language.length > 0 && !filters.language.includes(student.language?.name || '')) {
        return false;
      }
      if (filters.school.length > 0 && !filters.school.includes(student.school?.name || '')) {
        return false;
      }
      if (filters.studyDirection.length > 0 && !filters.studyDirection.includes(student.studyDirection?.name || '')) {
        return false;
      }
      if (filters.studyFormat.length > 0 && !filters.studyFormat.includes(student.studyFormat || '')) {
        return false;
      }
      if (filters.guarantee.length > 0 && !filters.guarantee.includes(student.guarantee || '')) {
        return false;
      }
      if (filters.city.length > 0 && !filters.city.includes(student.city?.name || '')) {
        return false;
      }
      if (filters.branch.length > 0 && !filters.branch.includes(student.branch?.name || '')) {
        return false;
      }
      if (filters.studySchedule.length > 0 && !filters.studySchedule.includes(student.studySchedule || '')) {
        return false;
      }
      if (filters.gender.length > 0 && !filters.gender.includes(student.gender || '')) {
        return false;
      }
      if (filters.specialNeeds.length > 0) {
        const studentSpecialNeeds = student.specialNeeds.map(sn => sn.specialNeed.name);
        if (!filters.specialNeeds.some(need => studentSpecialNeeds.includes(need))) {
          return false;
        }
      }
      if (filters.hasAllergy === true && !student.allergy) {
        return false;
      }
      if (filters.hasAllergy === false && student.allergy) {
        return false;
      }

      // Search filter
      if (!searchQuery.trim()) return true;

      const query = searchQuery.toLowerCase().trim();
      const studentName = `${student.user.lastName} ${student.user.firstName}`.toLowerCase();
      const parentName = (student.parentName || '').toLowerCase();
      const parentPhone = (student.parentPhone || '').toLowerCase();
      const studentPhone = (student.user.phone || '').toLowerCase();
      const gradeLevel = (student.gradeLevel?.name || '').toLowerCase();
      const school = (student.school?.name || '').toLowerCase();
      const city = (student.city?.name || '').toLowerCase();

      return (
        studentName.includes(query) ||
        parentName.includes(query) ||
        parentPhone.includes(query) ||
        studentPhone.includes(query) ||
        gradeLevel.includes(query) ||
        school.includes(query) ||
        city.includes(query)
      );
    });
  };

  // Apply filters only to confirmed students (pending and awaiting are not filtered)
  const filteredStudents = filterStudents(students);
  const totalFiltered = filteredStudents.length;

  // Format date consistently for SSR and client
  const formatDate = (date: Date) => {
    const d = new Date(date);
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    return `${day.toString().padStart(2, '0')}.${month.toString().padStart(2, '0')}.${year}`;
  };

  const handleStudentClick = (student: Student) => {
    setSelectedStudent(student);
    setIsSlideOverOpen(true);
  };

  const handleUpdate = () => {
    // Refresh the page to get updated data
    window.location.reload();
  };

  const handleApprove = async (studentId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      const response = await fetch(`/api/students/${studentId}/approve`, {
        method: 'POST',
      });

      if (response.ok) {
        // Remove from pending and add to awaiting contract (not active yet!)
        const approved = pending.find(s => s.id === studentId);
        if (approved) {
          setPending(prev => prev.filter(s => s.id !== studentId));
          setAwaitingContract(prev => [...prev, { ...approved, status: StudentStatus.ACTIVE, contractConfirmed: false }]);
        }
        showToast({ message: t('students.approvedSuccess'), type: 'success' });
      } else {
        showToast({ message: t('students.errorApprove'), type: 'error' });
      }
    } catch (error) {
      console.error(error);
      showToast({ message: t('students.errorApprove'), type: 'error' });
    }
  };

  const handleReject = async (studentId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const confirmed = await showConfirm({
      title: t('students.rejectTitle'),
      message: t('students.rejectMessage'),
      confirmText: t('students.reject'),
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/students/${studentId}/reject`, {
        method: 'POST',
      });

      if (response.ok) {
        setPending(prev => prev.filter(s => s.id !== studentId));
        showToast({ message: t('students.rejectedSuccess'), type: 'success' });
      } else {
        showToast({ message: t('students.errorReject'), type: 'error' });
      }
    } catch (error) {
      console.error(error);
      showToast({ message: t('students.errorReject'), type: 'error' });
    }
  };

  const handleFreeze = async (studentId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const daysInput = await showPrompt({
      title: t('students.freezeTitle'),
      message: t('students.freezeMessage', { days: student.freezeDays }),
      placeholder: t('students.freezeDaysPlaceholder'),
      inputType: 'number',
      confirmText: t('students.freeze'),
    });

    if (!daysInput) return;

    const days = parseInt(daysInput);
    if (isNaN(days) || days <= 0) {
      showToast({ message: t('students.invalidDays'), type: 'warning' });
      return;
    }

    if (days > student.freezeDays) {
      showToast({ message: t('students.notEnoughDays', { days: student.freezeDays }), type: 'warning' });
      return;
    }

    try {
      const response = await fetch(`/api/students/${studentId}/freeze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days }),
      });

      if (response.ok) {
        const data = await response.json();
        setStudents(prev => {
          const updated = prev.map(s =>
            s.id === studentId ? { ...s, status: StudentStatus.FROZEN, freezeEndDate: data.student.freezeEndDate } : s
          );
          // Re-sort after status change
          return updated.sort((a, b) => {
            const statusOrder: Record<string, number> = {
              [StudentStatus.FROZEN]: 1,
              [StudentStatus.ACTIVE]: 2,
              [StudentStatus.INACTIVE]: 3,
            };
            const statusDiff = (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
            if (statusDiff !== 0) return statusDiff;
            return a.user.lastName.localeCompare(b.user.lastName, 'ru');
          });
        });
        showToast({ message: t('students.freezeSuccess', { days }), type: 'success' });
      } else {
        const errorData = await response.json();
        showToast({ message: errorData.error || t('students.errorFreeze'), type: 'error' });
      }
    } catch (error) {
      console.error(error);
      showToast({ message: t('students.errorFreeze'), type: 'error' });
    }
  };

  const handleUnfreeze = async (studentId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const confirmed = await showConfirm({
      title: t('students.unfreezeTitle'),
      message: t('students.unfreezeMessage'),
      confirmText: t('students.unfreeze'),
      type: 'info',
    });
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/students/${studentId}/unfreeze`, {
        method: 'POST',
      });

      if (response.ok) {
        setStudents(prev => {
          const updated = prev.map(s =>
            s.id === studentId ? { ...s, status: StudentStatus.ACTIVE, freezeEndDate: null } : s
          );
          // Re-sort after status change
          return updated.sort((a, b) => {
            const statusOrder: Record<string, number> = {
              [StudentStatus.FROZEN]: 1,
              [StudentStatus.ACTIVE]: 2,
              [StudentStatus.INACTIVE]: 3,
            };
            const statusDiff = (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
            if (statusDiff !== 0) return statusDiff;
            return a.user.lastName.localeCompare(b.user.lastName, 'ru');
          });
        });
        showToast({ message: t('students.unfreezeSuccess'), type: 'success' });
      } else {
        showToast({ message: t('students.errorUnfreeze'), type: 'error' });
      }
    } catch (error) {
      console.error(error);
      showToast({ message: t('students.errorUnfreeze'), type: 'error' });
    }
  };

  const handleDeactivate = async (studentId: string, currentStatus: StudentStatus, event: React.MouseEvent) => {
    event.stopPropagation();
    const isActive = currentStatus === StudentStatus.ACTIVE || currentStatus === StudentStatus.FROZEN;

    const confirmed = await showConfirm({
      title: isActive ? t('students.deactivateTitle') : t('students.activateTitle'),
      message: isActive ? t('students.deactivateMessage') : t('students.activateMessage'),
      confirmText: isActive ? t('students.deactivate') : t('students.activate'),
      type: isActive ? 'danger' : 'info',
    });
    if (!confirmed) return;

    try {
      const newStatus = isActive ? StudentStatus.INACTIVE : StudentStatus.ACTIVE;
      const response = await fetch(`/api/students/${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setStudents(prev => {
          const updated = prev.map(s =>
            s.id === studentId ? { ...s, status: newStatus } : s
          );
          // Re-sort after status change
          return updated.sort((a, b) => {
            const statusOrder: Record<string, number> = {
              [StudentStatus.FROZEN]: 1,
              [StudentStatus.ACTIVE]: 2,
              [StudentStatus.INACTIVE]: 3,
            };
            const statusDiff = (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
            if (statusDiff !== 0) return statusDiff;
            return a.user.lastName.localeCompare(b.user.lastName, 'ru');
          });
        });
        showToast({ message: isActive ? t('students.deactivatedSuccess') : t('students.activatedSuccess'), type: 'success' });
      } else {
        showToast({ message: t('students.errorStatus'), type: 'error' });
      }
    } catch (error) {
      console.error(error);
      showToast({ message: t('students.errorStatus'), type: 'error' });
    }
  };

  const getStatusBadge = (status: StudentStatus) => {
    const badges: Record<StudentStatus, { label: string; className: string }> = {
      PENDING_APPROVAL: { label: t('students.statusPending'), className: 'bg-yellow-50 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700' },
      ACTIVE: { label: t('students.statusActive'), className: 'bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700' },
      FROZEN: { label: t('students.statusFrozen'), className: 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700' },
      REFUND: { label: t('students.statusRefund'), className: 'bg-orange-50 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-700' },
      GRADUATED: { label: t('students.statusGraduated'), className: 'bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700' },
      INACTIVE: { label: t('students.statusInactive'), className: 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600' },
      EXPELLED: { label: t('students.statusExpelled'), className: 'bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700' },
    };
    return badges[status] || { label: status, className: 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600' };
  };

  return (
    <>
      <div className="space-y-6">
        {/* Pending approvals - only for curators (at the very top, no filtering) */}
        {isCurator && pending.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('students.pendingApproval')} ({pending.length})
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('students.pendingApprovalDesc')}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-yellow-200 dark:border-yellow-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">{t('students.title')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">{t('students.parent')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">{t('students.grade')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">{t('students.school')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">{t('common.date')}</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-yellow-100 dark:divide-yellow-900/30">
                    {pending.map((student) => (
                      <tr
                        key={student.id}
                        className="hover:bg-yellow-50/50 dark:hover:bg-yellow-900/20 transition-colors cursor-pointer"
                        onClick={() => handleStudentClick(student)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                              {isBirthdaySoon(student.dateOfBirth) && <BirthdayCrown />}
                              {student.user.avatar ? (
                                <div
                                  className="h-9 w-9 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 cursor-pointer"
                                  onClick={(e) => { e.stopPropagation(); openAvatar(student.user.avatar!, `${student.user.firstName} ${student.user.lastName}`); }}
                                >
                                  <img src={student.user.avatar} alt="" className="w-full h-full object-cover" />
                                </div>
                              ) : (
                                <div className="h-9 w-9 rounded-full bg-yellow-500 flex items-center justify-center">
                                  <span className="text-xs font-medium text-white">
                                    {student.user.firstName[0]}{student.user.lastName[0]}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {student.user.firstName} {student.user.lastName}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-white">{student.parentName || '-'}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{student.parentPhone || ''}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900 dark:text-white">{student.gradeLevel?.name || '-'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900 dark:text-white">{student.school?.name || '-'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(student.createdAt).toLocaleDateString('ru-RU')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => handleApprove(student.id, e)}
                              className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
                            >
                              {t('students.approve')}
                            </button>
                            <button
                              onClick={(e) => handleReject(student.id, e)}
                              className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors"
                            >
                              {t('students.reject')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Awaiting contract confirmation - visible for curators, button only for admins */}
        {isCurator && awaitingContract.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('students.awaitingContract')} ({awaitingContract.length})
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('students.awaitingContractDesc')}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-orange-200 dark:border-orange-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-orange-50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">{t('students.title')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">{t('students.parent')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">{t('students.grade')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">{t('students.school')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">{t('common.status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orange-100 dark:divide-orange-900/30">
                    {awaitingContract.map((student) => (
                      <tr
                        key={student.id}
                        className="hover:bg-orange-50/50 dark:hover:bg-orange-900/20 transition-colors cursor-pointer"
                        onClick={() => handleStudentClick(student)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                              {isBirthdaySoon(student.dateOfBirth) && <BirthdayCrown />}
                              {student.user.avatar ? (
                                <div
                                  className="h-9 w-9 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 cursor-pointer"
                                  onClick={(e) => { e.stopPropagation(); openAvatar(student.user.avatar!, `${student.user.firstName} ${student.user.lastName}`); }}
                                >
                                  <img src={student.user.avatar} alt="" className="w-full h-full object-cover" />
                                </div>
                              ) : (
                                <div className="h-9 w-9 rounded-full bg-orange-500 flex items-center justify-center">
                                  <span className="text-xs font-medium text-white">
                                    {student.user.firstName[0]}{student.user.lastName[0]}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {student.user.firstName} {student.user.lastName}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-white">{student.parentName || '-'}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{student.parentPhone || ''}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900 dark:text-white">{student.gradeLevel?.name || '-'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900 dark:text-white">{student.school?.name || '-'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-lg bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-700">
                            {t('students.awaitingContractBadge')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Header with filters */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('students.title')}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('common.total')}: {allStudents.length}
                </p>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2">
              {[
                { key: 'all', label: t('students.filterAll') },
                { key: 'active', label: t('students.filterActive') },
                { key: 'frozen', label: t('students.filterFrozen') },
                { key: 'inactive', label: t('students.filterInactive') },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key as typeof statusFilter)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    statusFilter === tab.key
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search input with filter */}
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
                placeholder={t('students.search')}
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

              {/* Filter dropdown panel - Two level design */}
              {showFilterPanel && (
                <div className="absolute right-0 top-full mt-2 flex items-start z-50">
                  {/* Options panel (left side) - shows when category is selected */}
                  {activeFilterCategory && (
                    <div className="w-64 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl mr-2 flex flex-col max-h-[480px]">
                      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {activeFilterCategory === 'gradeLevel' && t('students.filterGrade')}
                          {activeFilterCategory === 'language' && t('students.filterLanguage')}
                          {activeFilterCategory === 'school' && t('students.filterSchool')}
                          {activeFilterCategory === 'studyDirection' && t('students.filterDirection')}
                          {activeFilterCategory === 'studyFormat' && t('students.filterFormat')}
                          {activeFilterCategory === 'guarantee' && t('students.filterGuarantee')}
                          {activeFilterCategory === 'city' && t('students.filterCity')}
                          {activeFilterCategory === 'branch' && t('students.filterBranch')}
                          {activeFilterCategory === 'studySchedule' && t('students.filterSchedule')}
                          {activeFilterCategory === 'gender' && t('students.filterGender')}
                          {activeFilterCategory === 'specialNeeds' && t('students.filterSpecialNeeds')}
                          {activeFilterCategory === 'hasAllergy' && t('students.filterAllergy')}
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
                        {/* Класс options */}
                        {activeFilterCategory === 'gradeLevel' && filterOptions.gradeLevels.map(option => (
                          <button
                            key={option.id}
                            onClick={() => toggleFilter('gradeLevel', option.name)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              filters.gradeLevel.includes(option.name)
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            {option.name}
                          </button>
                        ))}
                        {/* Язык options */}
                        {activeFilterCategory === 'language' && filterOptions.languages.map(option => (
                          <button
                            key={option.id}
                            onClick={() => toggleFilter('language', option.name)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              filters.language.includes(option.name)
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            {option.name}
                          </button>
                        ))}
                        {/* Школа options */}
                        {activeFilterCategory === 'school' && filterOptions.schools.map(option => (
                          <button
                            key={option.id}
                            onClick={() => toggleFilter('school', option.name)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              filters.school.includes(option.name)
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            {option.name}
                          </button>
                        ))}
                        {/* Направление options */}
                        {activeFilterCategory === 'studyDirection' && filterOptions.studyDirections.map(option => (
                          <button
                            key={option.id}
                            onClick={() => toggleFilter('studyDirection', option.name)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              filters.studyDirection.includes(option.name)
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            {option.name}
                          </button>
                        ))}
                        {/* Формат options */}
                        {activeFilterCategory === 'studyFormat' && [
                          { value: 'ONLINE_GROUP', label: t('students.formatOnlineGroup') },
                          { value: 'OFFLINE_GROUP', label: t('students.formatOfflineGroup') },
                          { value: 'ONLINE_INDIVIDUAL', label: t('students.formatOnlineIndividual') },
                          { value: 'OFFLINE_INDIVIDUAL', label: t('students.formatOfflineIndividual') },
                        ].map(option => (
                          <button
                            key={option.value}
                            onClick={() => toggleFilter('studyFormat', option.value)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              filters.studyFormat.includes(option.value)
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                        {/* Гарантия options */}
                        {activeFilterCategory === 'guarantee' && [
                          { value: 'NONE', label: t('students.guaranteeNone') },
                          { value: 'FIFTY_PERCENT', label: t('students.guarantee50') },
                          { value: 'EIGHTY_PERCENT', label: t('students.guarantee80') },
                          { value: 'HUNDRED_PERCENT', label: t('students.guarantee100') },
                        ].map(option => (
                          <button
                            key={option.value}
                            onClick={() => toggleFilter('guarantee', option.value)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              filters.guarantee.includes(option.value)
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                        {/* Город options */}
                        {activeFilterCategory === 'city' && filterOptions.cities.map(option => (
                          <button
                            key={option.id}
                            onClick={() => toggleFilter('city', option.name)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              filters.city.includes(option.name)
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            {option.name}
                          </button>
                        ))}
                        {/* Филиал options */}
                        {activeFilterCategory === 'branch' && filterOptions.branches.map(option => (
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
                        {/* Дни обучения options */}
                        {activeFilterCategory === 'studySchedule' && [
                          { value: 'PSP', label: t('students.schedulePSP') },
                          { value: 'VCS', label: t('students.scheduleVCS') },
                          { value: 'CUSTOM', label: t('students.scheduleCustom') },
                        ].map(option => (
                          <button
                            key={option.value}
                            onClick={() => toggleFilter('studySchedule', option.value)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              filters.studySchedule.includes(option.value)
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                        {/* Пол options */}
                        {activeFilterCategory === 'gender' && [
                          { value: 'MALE', label: t('students.genderMale') },
                          { value: 'FEMALE', label: t('students.genderFemale') },
                        ].map(option => (
                          <button
                            key={option.value}
                            onClick={() => toggleFilter('gender', option.value)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              filters.gender.includes(option.value)
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                        {/* Особые потребности options */}
                        {activeFilterCategory === 'specialNeeds' && filterOptions.specialNeeds.map(option => (
                          <button
                            key={option.id}
                            onClick={() => toggleFilter('specialNeeds', option.name)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              filters.specialNeeds.includes(option.name)
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            {option.name}
                          </button>
                        ))}
                        {/* Аллергия options */}
                        {activeFilterCategory === 'hasAllergy' && [
                          { value: true, label: t('students.hasAllergy') },
                          { value: false, label: t('students.noAllergy') },
                        ].map(option => (
                          <button
                            key={String(option.value)}
                            onClick={() => setFilters(prev => ({
                              ...prev,
                              hasAllergy: prev.hasAllergy === option.value ? null : option.value
                            }))}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              filters.hasAllergy === option.value
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

                  {/* Categories panel (right side) */}
                  <div className="w-56 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{t('students.filtersTitle')}</span>
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
                      {/* 1. Класс */}
                      <button
                        onClick={() => setActiveFilterCategory(activeFilterCategory === 'gradeLevel' ? null : 'gradeLevel')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                          activeFilterCategory === 'gradeLevel'
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span className="text-sm">{t('students.filterGrade')}</span>
                        <div className="flex items-center gap-2">
                          {filters.gradeLevel.length > 0 && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                              {filters.gradeLevel.length}
                            </span>
                          )}
                          <svg className={`w-4 h-4 transition-transform ${activeFilterCategory === 'gradeLevel' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </div>
                      </button>

                      {/* 2. Язык обучения */}
                      <button
                        onClick={() => setActiveFilterCategory(activeFilterCategory === 'language' ? null : 'language')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                          activeFilterCategory === 'language'
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span className="text-sm">{t('students.filterLanguage')}</span>
                        <div className="flex items-center gap-2">
                          {filters.language.length > 0 && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                              {filters.language.length}
                            </span>
                          )}
                          <svg className={`w-4 h-4 transition-transform ${activeFilterCategory === 'language' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </div>
                      </button>

                      {/* 3. Филиал */}
                      <button
                        onClick={() => setActiveFilterCategory(activeFilterCategory === 'branch' ? null : 'branch')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                          activeFilterCategory === 'branch'
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span className="text-sm">{t('students.filterBranch')}</span>
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

                      {/* 4. Дни обучения */}
                      <button
                        onClick={() => setActiveFilterCategory(activeFilterCategory === 'studySchedule' ? null : 'studySchedule')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                          activeFilterCategory === 'studySchedule'
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span className="text-sm">{t('students.filterSchedule')}</span>
                        <div className="flex items-center gap-2">
                          {filters.studySchedule.length > 0 && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                              {filters.studySchedule.length}
                            </span>
                          )}
                          <svg className={`w-4 h-4 transition-transform ${activeFilterCategory === 'studySchedule' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </div>
                      </button>

                      {/* 5. Направление */}
                      <button
                        onClick={() => setActiveFilterCategory(activeFilterCategory === 'studyDirection' ? null : 'studyDirection')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                          activeFilterCategory === 'studyDirection'
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span className="text-sm">{t('students.filterDirection')}</span>
                        <div className="flex items-center gap-2">
                          {filters.studyDirection.length > 0 && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                              {filters.studyDirection.length}
                            </span>
                          )}
                          <svg className={`w-4 h-4 transition-transform ${activeFilterCategory === 'studyDirection' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </div>
                      </button>

                      {/* 6. Формат */}
                      <button
                        onClick={() => setActiveFilterCategory(activeFilterCategory === 'studyFormat' ? null : 'studyFormat')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                          activeFilterCategory === 'studyFormat'
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span className="text-sm">{t('students.filterFormat')}</span>
                        <div className="flex items-center gap-2">
                          {filters.studyFormat.length > 0 && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                              {filters.studyFormat.length}
                            </span>
                          )}
                          <svg className={`w-4 h-4 transition-transform ${activeFilterCategory === 'studyFormat' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </div>
                      </button>

                      {/* 7. Гарантия */}
                      <button
                        onClick={() => setActiveFilterCategory(activeFilterCategory === 'guarantee' ? null : 'guarantee')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                          activeFilterCategory === 'guarantee'
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span className="text-sm">{t('students.filterGuarantee')}</span>
                        <div className="flex items-center gap-2">
                          {filters.guarantee.length > 0 && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                              {filters.guarantee.length}
                            </span>
                          )}
                          <svg className={`w-4 h-4 transition-transform ${activeFilterCategory === 'guarantee' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </div>
                      </button>

                      {/* 8. Город */}
                      <button
                        onClick={() => setActiveFilterCategory(activeFilterCategory === 'city' ? null : 'city')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                          activeFilterCategory === 'city'
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span className="text-sm">{t('students.filterCity')}</span>
                        <div className="flex items-center gap-2">
                          {filters.city.length > 0 && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                              {filters.city.length}
                            </span>
                          )}
                          <svg className={`w-4 h-4 transition-transform ${activeFilterCategory === 'city' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </div>
                      </button>

                      {/* 9. Школа */}
                      <button
                        onClick={() => setActiveFilterCategory(activeFilterCategory === 'school' ? null : 'school')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                          activeFilterCategory === 'school'
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span className="text-sm">{t('students.filterSchool')}</span>
                        <div className="flex items-center gap-2">
                          {filters.school.length > 0 && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                              {filters.school.length}
                            </span>
                          )}
                          <svg className={`w-4 h-4 transition-transform ${activeFilterCategory === 'school' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </div>
                      </button>

                      {/* 10. Пол */}
                      <button
                        onClick={() => setActiveFilterCategory(activeFilterCategory === 'gender' ? null : 'gender')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                          activeFilterCategory === 'gender'
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span className="text-sm">{t('students.filterGender')}</span>
                        <div className="flex items-center gap-2">
                          {filters.gender.length > 0 && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                              {filters.gender.length}
                            </span>
                          )}
                          <svg className={`w-4 h-4 transition-transform ${activeFilterCategory === 'gender' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </div>
                      </button>

                      {/* 11. Особые потребности */}
                      <button
                        onClick={() => setActiveFilterCategory(activeFilterCategory === 'specialNeeds' ? null : 'specialNeeds')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                          activeFilterCategory === 'specialNeeds'
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span className="text-sm">{t('students.filterSpecialNeeds')}</span>
                        <div className="flex items-center gap-2">
                          {filters.specialNeeds.length > 0 && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                              {filters.specialNeeds.length}
                            </span>
                          )}
                          <svg className={`w-4 h-4 transition-transform ${activeFilterCategory === 'specialNeeds' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </div>
                      </button>

                      {/* 12. Аллергия */}
                      <button
                        onClick={() => setActiveFilterCategory(activeFilterCategory === 'hasAllergy' ? null : 'hasAllergy')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                          activeFilterCategory === 'hasAllergy'
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span className="text-sm">{t('students.filterAllergy')}</span>
                        <div className="flex items-center gap-2">
                          {filters.hasAllergy !== null && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                              1
                            </span>
                          )}
                          <svg className={`w-4 h-4 transition-transform ${activeFilterCategory === 'hasAllergy' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        {/* Students table */}
        {filteredStudents.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">{t('students.title')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">{t('students.contacts')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">{t('students.parent')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">{t('students.grade')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">{t('students.school')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">{t('common.status')}</th>
                      {isCurator && (
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300">{t('common.actions')}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredStudents.map((student) => (
                      <tr
                        key={student.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                        onClick={() => handleStudentClick(student)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                              {isBirthdaySoon(student.dateOfBirth) && <BirthdayCrown />}
                              {student.user.avatar ? (
                                <div
                                  className="h-9 w-9 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 cursor-pointer"
                                  onClick={(e) => { e.stopPropagation(); openAvatar(student.user.avatar!, `${student.user.firstName} ${student.user.lastName}`); }}
                                >
                                  <img src={student.user.avatar} alt="" className="w-full h-full object-cover" />
                                </div>
                              ) : (
                                <div className={`h-9 w-9 rounded-full flex items-center justify-center ${
                                  student.status === StudentStatus.FROZEN ? 'bg-blue-500' :
                                  student.status === StudentStatus.INACTIVE ? 'bg-gray-400' :
                                  'bg-blue-600'
                                }`}>
                                  <span className="text-xs font-medium text-white">
                                    {student.user.firstName[0]}{student.user.lastName[0]}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {student.user.firstName} {student.user.lastName}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {student.user.phone && (
                            <div className="text-sm text-gray-900 dark:text-white">{student.user.phone}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-white">{student.parentName || '-'}</div>
                          {student.parentPhone && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">{student.parentPhone}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900 dark:text-white">{student.gradeLevel?.name || '-'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900 dark:text-white">{student.school?.name || '-'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-lg ${getStatusBadge(student.status).className}`}>
                              {getStatusBadge(student.status).label}
                            </span>
                            {student.status === StudentStatus.FROZEN && student.freezeEndDate && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {t('students.until')} {formatDate(student.freezeEndDate)}
                              </span>
                            )}
                            {student.status === StudentStatus.ACTIVE && student.studyEndDate && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {t('students.until')} {formatDate(student.studyEndDate)}
                              </span>
                            )}
                          </div>
                        </td>
                        {isCurator && (
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {student.status === StudentStatus.ACTIVE && (
                                <button
                                  onClick={(e) => handleFreeze(student.id, e)}
                                  className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                >
                                  {t('students.freeze')}
                                </button>
                              )}
                              {student.status === StudentStatus.FROZEN && (
                                <button
                                  onClick={(e) => handleUnfreeze(student.id, e)}
                                  className="px-3 py-1.5 text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 rounded-lg transition-colors"
                                >
                                  {t('students.unfreeze')}
                                </button>
                              )}
                              <button
                                onClick={(e) => handleDeactivate(student.id, student.status, e)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                  student.status === StudentStatus.ACTIVE || student.status === StudentStatus.FROZEN
                                    ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30'
                                    : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30'
                                }`}
                              >
                                {student.status === StudentStatus.ACTIVE || student.status === StudentStatus.FROZEN
                                  ? t('students.deactivate')
                                  : t('students.activate')}
                              </button>
                            </div>
                          </td>
                        )}
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('students.noStudents')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {searchQuery
                    ? t('students.noStudents')
                    : statusFilter !== 'all'
                      ? t('students.noStudentsInFilter')
                      : t('students.enrollFirst')
                  }
                </p>
              </div>
            </div>
          )}
      </div>

      <StudentDetailSlideOver
        student={selectedStudent}
        isOpen={isSlideOverOpen}
        onClose={() => {
          setIsSlideOverOpen(false);
          setSelectedStudent(null);
        }}
        onUpdate={handleUpdate}
        userRole={userRole}
        filterOptions={filterOptions}
      />
    </>
  );
}
