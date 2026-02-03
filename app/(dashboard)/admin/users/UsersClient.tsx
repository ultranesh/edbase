'use client';

import { useState, useRef, useEffect } from 'react';
import { UserRole } from '@prisma/client';
import UserDetailSlideOver from './UserDetailSlideOver';
import UserModal from './UserModal';
import { useLanguage } from '@/app/components/LanguageProvider';
import { useAvatarLightbox } from '@/app/components/AvatarLightbox';

interface User {
  id: string;
  iin: string | null;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatar: string | null;
  isActive: boolean;
  phone: string | null;
  sipNumber: string | null;
  lastLogin: Date | null;
  lastSeen: Date | null;
  createdAt: Date;
}

interface RefRole {
  id: string;
  code: string;
  name: string;
  nameKz: string | null;
  nameRu: string | null;
  nameEn: string | null;
  orderIndex: number;
  isActive: boolean;
}

interface Filters {
  role: string[];
}

const emptyFilters: Filters = {
  role: [],
};

interface UsersClientProps {
  initialUsers: User[];
  currentUserRole: UserRole;
  currentUserId: string;
}

export default function UsersClient({ initialUsers, currentUserRole, currentUserId }: UsersClientProps) {
  const { t, language } = useLanguage();
  const { openAvatar } = useAvatarLightbox();
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [refRoles, setRefRoles] = useState<RefRole[]>([]);

  // Fetch reference roles from DB (only those matching the Prisma UserRole enum)
  useEffect(() => {
    const validCodes = new Set<string>(Object.values(UserRole));
    fetch('/api/database/user-roles')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: RefRole[]) => {
        const active = Array.isArray(data)
          ? data.filter((r) => r.isActive && validCodes.has(r.code))
          : [];
        setRefRoles(active);
      })
      .catch(() => setRefRoles([]));
  }, []);

  const getRoleName = (roleCode: string): string => {
    const found = refRoles.find((r) => r.code === roleCode);
    if (!found) return t(`role.${roleCode}`);
    if (language === 'kk') return found.nameKz || found.name;
    if (language === 'en') return found.nameEn || found.name;
    return found.nameRu || found.name;
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const [deleteModal, setDeleteModal] = useState<{ userId: string; userName: string } | null>(null);

  // Close filter panel on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(event.target as Node)) {
        setShowFilterPanel(false);
      }
    };

    if (showFilterPanel) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterPanel]);

  const refreshUsers = async () => {
    const response = await fetch('/api/admin/users');
    if (response.ok) {
      const data = await response.json();
      setUsers(data);
    }
  };

  const handleUserClick = (user: User) => {
    setSelectedUser(user);
    setIsSlideOverOpen(true);
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        await refreshUsers();
      }
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  };


  const handleDeleteUser = (userId: string, userName: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setDeleteModal({ userId, userName });
  };

  const confirmDeleteUser = async () => {
    if (!deleteModal) return;
    try {
      const response = await fetch(`/api/admin/users/${deleteModal.userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await refreshUsers();
      } else {
        const data = await response.json();
        alert(data.error || 'Ошибка при удалении');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
    setDeleteModal(null);
  };

  const handleAddUser = () => {
    setSelectedUser(null);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  const handleModalSuccess = async () => {
    await refreshUsers();
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

  const getRoleBadge = (role: string) => {
    const badges: Record<string, { className: string }> = {
      SUPERADMIN: { className: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700' },
      ADMIN: { className: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700' },
      TEACHER: { className: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700' },
      PARENT: { className: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700' },
    };
    return badges[role] || { className: 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600' };
  };

  // Telegram/WhatsApp-style "last seen" formatter
  const formatLastSeen = (lastLogin: Date | null): { text: string; isOnline: boolean } => {
    if (!lastLogin) return { text: 'Никогда', isOnline: false };

    const now = new Date();
    const date = new Date(lastLogin);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    // "Online" - within last 5 minutes
    if (diffMin < 5) {
      return { text: 'в сети', isOnline: true };
    }

    // Minutes ago
    if (diffMin < 60) {
      const m = diffMin;
      const lastDigit = m % 10;
      const lastTwoDigits = m % 100;
      let word = 'минут';
      if (lastDigit === 1 && lastTwoDigits !== 11) word = 'минуту';
      else if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) word = 'минуты';
      return { text: `${m} ${word} назад`, isOnline: false };
    }

    // Today
    if (date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
      const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      return { text: `сегодня в ${time}`, isOnline: false };
    }

    // Yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear()) {
      const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      return { text: `вчера в ${time}`, isOnline: false };
    }

    // Within this week (less than 7 days)
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays < 7) {
      const dayNames = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
      const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      return { text: `${dayNames[date.getDay()]} в ${time}`, isOnline: false };
    }

    // Older - show date
    const formatted = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    return { text: formatted, isOnline: false };
  };

  const filteredUsers = users.filter(u => {
    // Status filter
    if (statusFilter === 'active' && !u.isActive) return false;
    if (statusFilter === 'inactive' && u.isActive) return false;

    // Role filter
    if (filters.role.length > 0 && !filters.role.includes(u.role)) return false;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const fullName = `${u.lastName} ${u.firstName}`.toLowerCase();
      const iin = (u.iin || '').toLowerCase();

      if (!fullName.includes(query) && !iin.includes(query)) {
        return false;
      }
    }

    return true;
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('users.title')}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('users.total', { count: users.length })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Status filter tabs */}
              <div className="flex gap-2">
                {[
                  { key: 'all', label: t('users.filterAll') },
                  { key: 'active', label: t('users.filterActive') },
                  { key: 'inactive', label: t('users.filterInactive') },
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

              {/* Add user button */}
              <button
                onClick={handleAddUser}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t('users.add')}
              </button>
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
                placeholder={t('users.search')}
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
                onClick={() => setShowFilterPanel(!showFilterPanel)}
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
                <div className="absolute right-0 top-full mt-2 z-50">
                  <div className="w-64 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{t('users.role')}</span>
                      {activeFilterCount > 0 && (
                        <button
                          onClick={resetFilters}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700"
                        >
                          {t('users.reset')}
                        </button>
                      )}
                    </div>
                    <div className="p-2 space-y-1">
                      {refRoles.map(role => (
                        <button
                          key={role.code}
                          onClick={() => toggleFilter('role', role.code)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                            filters.role.includes(role.code)
                              ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          <span>{getRoleName(role.code)}</span>
                          {filters.role.includes(role.code) && (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Users Table */}
        {filteredUsers.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">{t('users.title')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">{t('users.iin')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">{t('users.role')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">{t('users.status')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">{t('users.lastLogin')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Был в сети</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                      onClick={() => handleUserClick(user)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {user.avatar ? (
                            <div
                              className="h-9 w-9 rounded-full shrink-0 overflow-hidden bg-gray-200 dark:bg-gray-700 cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); openAvatar(user.avatar!, `${user.firstName} ${user.lastName}`); }}
                            >
                              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                              !user.isActive ? 'bg-gray-400' :
                              user.role === 'SUPERADMIN' ? 'bg-purple-600' :
                              user.role === 'ADMIN' ? 'bg-blue-600' :
                              user.role === 'TEACHER' ? 'bg-emerald-600' :
                              'bg-amber-600'
                            }`}>
                              <span className="text-xs font-medium text-white">
                                {user.firstName[0]}{user.lastName[0]}
                              </span>
                            </div>
                          )}
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.firstName} {user.lastName}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700 dark:text-gray-300 font-mono">{user.iin || '—'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-lg ${getRoleBadge(user.role).className}`}>
                          {getRoleName(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-lg ${
                          user.isActive
                            ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700'
                            : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700'
                        }`}>
                          {user.isActive ? t('users.active') : t('users.inactive')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {user.lastLogin
                          ? new Date(user.lastLogin).toLocaleDateString('ru-RU', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : t('users.never')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          const { text, isOnline } = formatLastSeen(user.lastSeen ?? user.lastLogin);
                          return (
                            <div className="flex items-center gap-2">
                              {isOnline && (
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                              )}
                              <span className={`text-sm ${
                                isOnline
                                  ? 'text-green-600 dark:text-green-400 font-medium'
                                  : text === 'Никогда'
                                    ? 'text-gray-400 dark:text-gray-500'
                                    : 'text-gray-500 dark:text-gray-400'
                              }`}>
                                {text}
                              </span>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => handleToggleActive(user.id, user.isActive, e)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              user.isActive
                                ? 'text-amber-500 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                : 'text-green-500 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                            }`}
                            title={user.isActive ? t('users.deactivate') : t('users.activate')}
                          >
                            {user.isActive ? (
                              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            ) : (
                              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </button>
                          {(currentUserRole === UserRole.ADMIN || currentUserRole === UserRole.SUPERADMIN) && user.id !== currentUserId && user.role !== UserRole.SUPERADMIN && (
                            <button
                              onClick={(e) => handleDeleteUser(user.id, `${user.firstName} ${user.lastName}`, e)}
                              className="p-1.5 rounded-lg transition-colors text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                              title="Удалить навсегда"
                            >
                              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('users.noUsers')}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {searchQuery || activeFilterCount > 0 || statusFilter !== 'all'
                  ? t('users.noResults')
                  : t('users.noUsers')
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
                  {t('users.resetFilters')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <UserDetailSlideOver
        user={selectedUser}
        isOpen={isSlideOverOpen}
        onClose={() => {
          setIsSlideOverOpen(false);
          setSelectedUser(null);
        }}
        onUpdate={refreshUsers}
      />

      <UserModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        user={selectedUser}
      />

      {/* Delete confirmation modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteModal(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Удалить пользователя</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              Вы уверены, что хотите навсегда удалить пользователя <strong className="text-gray-900 dark:text-white">&ldquo;{deleteModal.userName}&rdquo;</strong>? Все данные будут удалены безвозвратно.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteModal(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={confirmDeleteUser}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Удалить навсегда
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
