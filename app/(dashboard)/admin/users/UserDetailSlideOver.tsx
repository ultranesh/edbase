'use client';

import { useState, useEffect, useRef } from 'react';
import SlideOver from '../../components/SlideOver';
import { UserRole } from '@prisma/client';
import { useNotification } from '@/app/components/ui/NotificationProvider';
import { useLanguage } from '@/app/components/LanguageProvider';
import { useAvatarLightbox } from '@/app/components/AvatarLightbox';

interface User {
  id: string;
  iin: string | null;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  phone: string | null;
  sipNumber: string | null;
  lastLogin: Date | null;
  lastSeen: Date | null;
  createdAt: Date;
}

interface LoginSession {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  deviceType: string | null;
  browser: string | null;
  browserVersion: string | null;
  os: string | null;
  deviceModel: string | null;
  network: string | null;
  isp: string | null;
  org: string | null;
  asName: string | null;
  city: string | null;
  regionName: string | null;
  country: string | null;
  lat: number | null;
  lon: number | null;
  timezone: string | null;
  isProxy: boolean | null;
  isHosting: boolean | null;
  isMobileNetwork: boolean | null;
  screenResolution: string | null;
  language: string | null;
  clientTimezone: string | null;
  connectionSpeed: string | null;
  loginAt: string;
  logoutAt: string | null;
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

interface UserDetailSlideOverProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

// Format phone number as +7 XXX XXX XX XX
const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  let normalized = digits;
  if (digits.startsWith('8') && digits.length > 1) {
    normalized = '7' + digits.slice(1);
  } else if (!digits.startsWith('7') && digits.length > 0) {
    normalized = '7' + digits;
  }
  const limited = normalized.slice(0, 11);
  if (limited.length === 0) return '';
  let formatted = '+7';
  if (limited.length > 1) formatted += ' ' + limited.slice(1, 4);
  if (limited.length > 4) formatted += ' ' + limited.slice(4, 7);
  if (limited.length > 7) formatted += ' ' + limited.slice(7, 9);
  if (limited.length > 9) formatted += ' ' + limited.slice(9, 11);
  return formatted;
};

const getDeviceIcon = (deviceType: string | null) => {
  if (deviceType === 'mobile') {
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    );
  }
  if (deviceType === 'tablet') {
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 19.5h3m-6.75 2.25h10.5a2.25 2.25 0 002.25-2.25V4.5a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 4.5v15a2.25 2.25 0 002.25 2.25z" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z" />
    </svg>
  );
};

export default function UserDetailSlideOver({
  user,
  isOpen,
  onClose,
  onUpdate,
}: UserDetailSlideOverProps) {
  const { openAvatar } = useAvatarLightbox();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [plainPassword, setPlainPassword] = useState<string | null>(null);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [sessions, setSessions] = useState<LoginSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [refRoles, setRefRoles] = useState<RefRole[]>([]);
  const { showToast } = useNotification();
  const { t, language } = useLanguage();

  // PIN management state
  const [hasPin, setHasPin] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinDigits, setPinDigits] = useState(['', '', '', '']);
  const [confirmPinDigits, setConfirmPinDigits] = useState(['', '', '', '']);
  const [pinStep, setPinStep] = useState<'enter' | 'confirm'>('enter');
  const [pinError, setPinError] = useState('');
  const [pinSaving, setPinSaving] = useState(false);
  const pinRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const confirmPinRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  // Avatar management state
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [avatarLocked, setAvatarLocked] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

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

  // Fetch user details (hasPin, avatar, avatarLocked) when slide-over opens
  useEffect(() => {
    if (!isOpen || !user) return;
    fetch(`/api/admin/users/${user.id}`)
      .then((res) => res.json())
      .then((data) => {
        setPlainPassword(data.plainPassword || null);
        setHasPin(data.hasPin || false);
        setUserAvatar(data.avatar || null);
        setAvatarLocked(data.avatarLocked || false);
      })
      .catch(() => {});
  }, [isOpen, user?.id]);

  // Reset state when user changes or slide-over closes
  useEffect(() => {
    if (!isOpen) {
      setShowPassword(false);
      setPlainPassword(null);
      setEditingPassword(false);
      setNewPassword('');
      setShowSessions(false);
      setSessions([]);
      setIsEditing(false);
      setHasPin(false);
      setShowPinModal(false);
      setPinDigits(['', '', '', '']);
      setConfirmPinDigits(['', '', '', '']);
      setPinStep('enter');
      setPinError('');
      setUserAvatar(null);
      setAvatarLocked(false);
    }
  }, [isOpen]);

  if (!user) return null;

  // ── Password handlers ──

  const fetchPlainPassword = async () => {
    if (plainPassword !== null) {
      setShowPassword(!showPassword);
      return;
    }
    setLoadingPassword(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`);
      const data = await res.json();
      setPlainPassword(data.plainPassword || null);
      setShowPassword(true);
    } catch {
      showToast({ message: 'Ошибка загрузки пароля', type: 'error' });
    } finally {
      setLoadingPassword(false);
    }
  };

  const handleSavePassword = async () => {
    if (!newPassword.trim()) return;
    setSavingPassword(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });
      if (res.ok) {
        setPlainPassword(newPassword);
        setEditingPassword(false);
        setNewPassword('');
        showToast({ message: 'Пароль обновлен', type: 'success' });
      } else {
        showToast({ message: 'Ошибка при сохранении пароля', type: 'error' });
      }
    } catch {
      showToast({ message: 'Ошибка при сохранении пароля', type: 'error' });
    } finally {
      setSavingPassword(false);
    }
  };

  // ── Session handlers ──

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/sessions`);
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch {
      showToast({ message: 'Ошибка загрузки сеансов', type: 'error' });
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleShowSessions = () => {
    if (!showSessions) {
      fetchSessions();
    }
    setShowSessions(!showSessions);
  };

  // ── Edit handlers ──

  const handleEdit = () => {
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      iin: user.iin || '',
      phone: user.phone || '',
      sipNumber: user.sipNumber || '',
      role: user.role,
      isActive: user.isActive,
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setIsEditing(false);
        onUpdate();
      } else {
        showToast({ message: 'Ошибка при сохранении', type: 'error' });
      }
    } catch (error) {
      console.error(error);
      showToast({ message: 'Ошибка при сохранении', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async () => {
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      });

      if (response.ok) {
        onUpdate();
      } else {
        showToast({ message: 'Ошибка при изменении статуса', type: 'error' });
      }
    } catch (error) {
      console.error(error);
      showToast({ message: 'Ошибка при изменении статуса', type: 'error' });
    }
  };

  // ── PIN handlers ──

  const handlePinDigit = (index: number, value: string, isConfirm: boolean) => {
    if (!/^\d?$/.test(value)) return;
    const digits = isConfirm ? [...confirmPinDigits] : [...pinDigits];
    digits[index] = value;
    if (isConfirm) setConfirmPinDigits(digits);
    else setPinDigits(digits);
    if (value && index < 3) {
      const refs = isConfirm ? confirmPinRefs : pinRefs;
      refs[index + 1].current?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent, isConfirm: boolean) => {
    if (e.key === 'Backspace') {
      const digits = isConfirm ? confirmPinDigits : pinDigits;
      if (!digits[index] && index > 0) {
        const refs = isConfirm ? confirmPinRefs : pinRefs;
        refs[index - 1].current?.focus();
      }
    }
  };

  const resetPinModal = () => {
    setShowPinModal(false);
    setPinDigits(['', '', '', '']);
    setConfirmPinDigits(['', '', '', '']);
    setPinStep('enter');
    setPinError('');
  };

  const handleAdminSetPin = async () => {
    setPinError('');
    const pin = pinDigits.join('');
    const confirmPin = confirmPinDigits.join('');

    if (pinStep === 'enter') {
      if (pin.length !== 4) return;
      setPinStep('confirm');
      setTimeout(() => confirmPinRefs[0].current?.focus(), 100);
      return;
    }

    if (pin !== confirmPin) {
      setPinError(t('profile.pinMismatch'));
      return;
    }

    setPinSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        setHasPin(true);
        resetPinModal();
        showToast({ message: t('users.pinSet'), type: 'success' });
      } else {
        setPinError('Error setting PIN');
      }
    } catch {
      setPinError('Error');
    } finally {
      setPinSaving(false);
    }
  };

  const handleAdminRemovePin = async () => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}/pin`, { method: 'DELETE' });
      if (res.ok) {
        setHasPin(false);
        showToast({ message: t('users.pinRemoved'), type: 'success' });
      }
    } catch {
      showToast({ message: 'Error removing PIN', type: 'error' });
    }
  };

  // ── Avatar handlers ──

  const handleAdminAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await fetch(`/api/admin/users/${user.id}/avatar`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setUserAvatar(data.url);
        showToast({ message: t('users.uploadAvatar'), type: 'success' });
        onUpdate();
      }
    } catch {
      showToast({ message: 'Error uploading avatar', type: 'error' });
    } finally {
      setUploadingAvatar(false);
      if (avatarFileInputRef.current) avatarFileInputRef.current.value = '';
    }
  };

  const handleAdminRemoveAvatar = async () => {
    setUploadingAvatar(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/avatar`, { method: 'DELETE' });
      if (res.ok) {
        setUserAvatar(null);
        showToast({ message: t('users.removeAvatar'), type: 'success' });
        onUpdate();
      }
    } catch {
      showToast({ message: 'Error removing avatar', type: 'error' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleToggleAvatarLock = async () => {
    const newValue = !avatarLocked;
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarLocked: newValue }),
      });
      if (res.ok) {
        setAvatarLocked(newValue);
        showToast({
          message: newValue ? t('users.avatarLocked') : t('users.avatarUnlocked'),
          type: 'success',
        });
      }
    } catch {
      showToast({ message: 'Error', type: 'error' });
    }
  };

  // ── Helpers ──

  const getRoleBadgeColor = (role: UserRole) => {
    const colors: Record<UserRole, string> = {
      SUPERADMIN: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
      ADMIN: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
      DEPARTMENT_HEAD: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
      CURATOR: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
      COORDINATOR: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
      COORDINATOR_MANAGER: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
      TEACHER: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
      PARENT: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
      ONLINE_MENTOR: 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300',
    };
    return colors[role] || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
  };

  const getRoleLabel = (role: UserRole) => {
    const found = refRoles.find((r) => r.code === role);
    if (!found) return role;
    if (language === 'kk') return found.nameKz || found.name;
    if (language === 'en') return found.nameEn || found.name;
    return found.nameRu || found.name;
  };

  const inputClass = "w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 transition-all hover:border-gray-300 dark:hover:border-gray-500 text-gray-900 dark:text-white";
  const selectClass = "w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 transition-all hover:border-gray-300 dark:hover:border-gray-500 text-gray-900 dark:text-white appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%228%22%20viewBox%3D%220%200%2012%208%22%3E%3Cpath%20fill%3D%22%236B7280%22%20d%3D%22M1.41%200L6%204.59%2010.59%200%2012%201.41l-6%206-6-6z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px_12px] bg-[position:right_1rem_center] bg-no-repeat pr-10";
  const labelClass = "text-xs text-gray-600 dark:text-gray-400";
  const valueClass = "text-sm font-medium text-gray-900 dark:text-white";
  const sectionHeaderClass = "text-sm font-semibold text-gray-900 dark:text-white mb-3";

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={() => {
        setIsEditing(false);
        onClose();
      }}
      title={`${user.firstName} ${user.lastName}`}
    >
      <div className="px-6 py-6 space-y-6">
        {/* Header with Avatar, Status and Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-16 w-16 rounded-full overflow-hidden ring-2 ring-gray-200 dark:ring-gray-600">
                {userAvatar ? (
                  <img
                    src={userAvatar}
                    alt=""
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => openAvatar(userAvatar, `${user.firstName} ${user.lastName}`)}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-900 dark:bg-gray-700 flex items-center justify-center">
                    <span className="text-2xl font-medium text-white">
                      {user.firstName[0]}{user.lastName[0]}
                    </span>
                  </div>
                )}
              </div>
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <button
                onClick={() => avatarFileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 p-1.5 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
                title={t('users.uploadAvatar')}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <input
                ref={avatarFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAdminAvatarUpload}
              />
            </div>
            <div>
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
                {getRoleLabel(user.role)}
              </span>
              <div className="mt-2">
                <button
                  onClick={handleToggleActive}
                  className={`px-3 py-1 text-xs font-medium rounded-full ${
                    user.isActive
                      ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/60'
                      : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60'
                  } transition-colors`}
                >
                  {user.isActive ? 'Активен' : 'Неактивен'}
                </button>
              </div>
            </div>
          </div>
          {!isEditing && (
            <button
              onClick={handleEdit}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Редактировать
            </button>
          )}
          {isEditing && (
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-blue-600 rounded-lg hover:bg-gray-800 dark:hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          )}
        </div>

        {/* Avatar Actions Row */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => avatarFileInputRef.current?.click()}
            className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            {t('users.uploadAvatar')}
          </button>
          {userAvatar && (
            <button
              onClick={handleAdminRemoveAvatar}
              className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              {t('users.removeAvatar')}
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {avatarLocked ? t('users.avatarLocked') : t('users.lockAvatar')}
            </span>
            <button
              type="button"
              onClick={handleToggleAvatarLock}
              className={`relative w-11 h-6 rounded-full transition-all duration-200 cursor-pointer ${
                avatarLocked
                  ? 'bg-green-500/20 border-2 border-green-500'
                  : 'bg-transparent border-2 border-gray-500'
              }`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200 ${
                avatarLocked
                  ? 'translate-x-5 bg-green-500'
                  : 'translate-x-0.5 bg-gray-500'
              }`} />
            </button>
          </div>
        </div>

        {/* Personal Information */}
        <div>
          <h3 className={sectionHeaderClass}>Личная информация</h3>
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Имя</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className={inputClass}
                />
              ) : (
                <div className={valueClass}>{user.firstName}</div>
              )}
            </div>
            <div>
              <label className={labelClass}>Фамилия</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className={inputClass}
                />
              ) : (
                <div className={valueClass}>{user.lastName}</div>
              )}
            </div>
            <div>
              <label className={labelClass}>ИИН</label>
              {isEditing ? (
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={12}
                  value={formData.iin}
                  onChange={(e) => setFormData({ ...formData, iin: e.target.value.replace(/\D/g, '') })}
                  placeholder="000000000000"
                  className={inputClass}
                />
              ) : (
                <div className={`${valueClass} font-mono`}>{user.iin || '—'}</div>
              )}
            </div>
            <div>
              <label className={labelClass}>Телефон</label>
              {isEditing ? (
                <input
                  type="tel"
                  value={formatPhone(formData.phone || '')}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                  placeholder="+7 XXX XXX XX XX"
                  className={inputClass}
                />
              ) : (
                <div className={valueClass}>{user.phone ? formatPhone(user.phone) : '-'}</div>
              )}
            </div>
            <div>
              <label className={labelClass}>Sipuni номер</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.sipNumber || ''}
                  onChange={(e) => setFormData({ ...formData, sipNumber: e.target.value.replace(/\D/g, '') })}
                  placeholder="207"
                  className={inputClass}
                />
              ) : (
                <div className={valueClass}>{user.sipNumber || '-'}</div>
              )}
            </div>
            <div>
              <label className={labelClass}>Роль</label>
              {isEditing ? (
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className={selectClass}
                >
                  {refRoles.length > 0 ? (
                    refRoles.map((role) => (
                      <option key={role.code} value={role.code}>
                        {getRoleLabel(role.code as UserRole)}
                      </option>
                    ))
                  ) : (
                    <option value={formData.role}>{formData.role}</option>
                  )}
                </select>
              ) : (
                <div className={valueClass}>{getRoleLabel(user.role)}</div>
              )}
            </div>
          </div>
        </div>

        {/* Password */}
        <div>
          <h3 className={sectionHeaderClass}>Пароль</h3>
          {!editingPassword ? (
            <div className="flex items-center gap-2">
              <div className={`${valueClass} font-mono flex-1`}>
                {showPassword && plainPassword ? plainPassword : '••••••••'}
                {showPassword && plainPassword === null && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-sans ml-2">не сохранен</span>
                )}
              </div>
              <button
                onClick={() => {
                  if (showPassword) {
                    setShowPassword(false);
                  } else {
                    fetchPlainPassword();
                  }
                }}
                disabled={loadingPassword}
                className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
              >
                {loadingPassword ? (
                  <svg className="w-4.5 h-4.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : showPassword ? (
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
              <button
                onClick={() => setEditingPassword(true)}
                className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                title="Изменить пароль"
              >
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Новый пароль"
                  className={`${inputClass} pr-10`}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showNewPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingPassword(false);
                    setNewPassword('');
                    setShowNewPassword(false);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSavePassword}
                  disabled={savingPassword || !newPassword.trim()}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {savingPassword ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Security - PIN */}
        <div>
          <h3 className={sectionHeaderClass}>{t('users.security')}</h3>
          <div className="flex items-center gap-3 py-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">PIN</span>
            <div className="ml-auto flex items-center gap-2">
              {hasPin && (
                <button
                  onClick={() => {
                    setShowPinModal(true);
                    setTimeout(() => pinRefs[0].current?.focus(), 100);
                  }}
                  className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title={t('users.changePin')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (hasPin) {
                    handleAdminRemovePin();
                  } else {
                    setShowPinModal(true);
                    setTimeout(() => pinRefs[0].current?.focus(), 100);
                  }
                }}
                className={`relative w-11 h-6 rounded-full transition-all duration-200 cursor-pointer ${
                  hasPin
                    ? 'bg-green-500/20 border-2 border-green-500'
                    : 'bg-transparent border-2 border-gray-500'
                }`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200 ${
                  hasPin
                    ? 'translate-x-5 bg-green-500'
                    : 'translate-x-0.5 bg-gray-500'
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Activity Information */}
        <div>
          <h3 className={sectionHeaderClass}>Активность</h3>
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-2">
                <label className={labelClass}>Последний вход</label>
                <button
                  onClick={handleShowSessions}
                  className="p-1 rounded-md text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  title="История сеансов"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
              <div className={valueClass}>
                {user.lastLogin
                  ? new Date(user.lastLogin).toLocaleDateString('ru-RU', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Никогда'}
              </div>
            </div>

            {/* Sessions history */}
            {showSessions && (
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    История сеансов
                  </h4>
                  <button
                    onClick={() => setShowSessions(false)}
                    className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {loadingSessions ? (
                  <div className="px-4 py-8 text-center">
                    <svg className="w-5 h-5 animate-spin mx-auto text-gray-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <p className="text-xs text-gray-400 mt-2">Загрузка...</p>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-xs text-gray-400 dark:text-gray-500">Нет записей о сеансах</p>
                  </div>
                ) : (
                  <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                    {sessions.map((s) => (
                      <div key={s.id} className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 text-gray-400 dark:text-gray-500">
                            {getDeviceIcon(s.deviceType)}
                          </div>
                          <div className="flex-1 min-w-0 space-y-1.5">
                            {/* Date, time, login/logout */}
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs font-medium text-gray-900 dark:text-white">
                                {new Date(s.loginAt).toLocaleDateString('ru-RU', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                {new Date(s.loginAt).toLocaleTimeString('ru-RU', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                })}
                              </span>
                              <span className="inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                                Вход
                              </span>
                              {s.logoutAt && (
                                <>
                                  <span className="text-gray-300 dark:text-gray-600">&rarr;</span>
                                  <span className="text-xs text-gray-400 dark:text-gray-500">
                                    {new Date(s.logoutAt).toLocaleTimeString('ru-RU', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      second: '2-digit',
                                    })}
                                  </span>
                                  <span className="inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                                    Выход
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Browser, OS, Device */}
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                              {s.browser && (
                                <span className="inline-flex items-center gap-1">
                                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.6 9h16.8M3.6 15h16.8M12 3a15.3 15.3 0 014 9 15.3 15.3 0 01-4 9 15.3 15.3 0 01-4-9 15.3 15.3 0 014-9z" />
                                  </svg>
                                  {s.browser}{s.browserVersion ? ` ${s.browserVersion}` : ''}
                                </span>
                              )}
                              {s.os && (
                                <span>{s.os}</span>
                              )}
                              {s.deviceModel && (
                                <span className="font-medium">{s.deviceModel}</span>
                              )}
                            </div>

                            {/* Network & ISP */}
                            {(s.network || s.isp || s.connectionSpeed) && (
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                                {s.network && (
                                  <span className="inline-flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
                                    </svg>
                                    {s.network}
                                  </span>
                                )}
                                {s.isp && (
                                  <span className="font-medium text-gray-600 dark:text-gray-300">{s.isp}</span>
                                )}
                                {s.org && s.org !== s.isp && (
                                  <span>({s.org})</span>
                                )}
                                {s.connectionSpeed && (
                                  <span className="text-gray-400 dark:text-gray-500">{s.connectionSpeed}</span>
                                )}
                              </div>
                            )}

                            {/* Location */}
                            {(s.city || s.regionName || s.country) && (
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                                <span className="inline-flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                                  </svg>
                                  {[s.city, s.regionName, s.country].filter(Boolean).join(', ')}
                                </span>
                                {s.timezone && (
                                  <span className="text-gray-400 dark:text-gray-500">({s.timezone})</span>
                                )}
                              </div>
                            )}

                            {/* Screen, Language, Timezone */}
                            {(s.screenResolution || s.language || s.clientTimezone) && (
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-400 dark:text-gray-500">
                                {s.screenResolution && (
                                  <span className="inline-flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z" />
                                    </svg>
                                    {s.screenResolution}
                                  </span>
                                )}
                                {s.language && (
                                  <span>{s.language}</span>
                                )}
                                {s.clientTimezone && (
                                  <span>{s.clientTimezone}</span>
                                )}
                              </div>
                            )}

                            {/* Flags: Proxy, VPN, Hosting, Mobile network */}
                            {(s.isProxy || s.isHosting || s.isMobileNetwork) && (
                              <div className="flex flex-wrap items-center gap-1.5">
                                {s.isProxy && (
                                  <span className="inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
                                    VPN/Proxy
                                  </span>
                                )}
                                {s.isHosting && (
                                  <span className="inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                                    Хостинг/ДЦ
                                  </span>
                                )}
                                {s.isMobileNetwork && (
                                  <span className="inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                    Мобильная сеть
                                  </span>
                                )}
                              </div>
                            )}

                            {/* IP + AS */}
                            {(s.ipAddress || s.asName) && (
                              <div className="text-[11px] font-mono text-gray-400 dark:text-gray-500">
                                {s.ipAddress && <span>IP: {s.ipAddress}</span>}
                                {s.asName && <span className="ml-2 font-sans">{s.asName}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className={labelClass}>Дата регистрации</label>
              <div className={valueClass}>
                {new Date(user.createdAt).toLocaleDateString('ru-RU', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Set PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={resetPinModal}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
              {hasPin ? t('users.changePin') : t('users.setPin')}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">{t('users.enterPin')}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  {t('profile.enterPin')}
                </label>
                <div className="flex justify-center gap-3">
                  {pinDigits.map((digit, i) => (
                    <input
                      key={i}
                      ref={pinRefs[i]}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handlePinDigit(i, e.target.value, false)}
                      onKeyDown={(e) => handlePinKeyDown(i, e, false)}
                      disabled={pinStep === 'confirm'}
                      className="w-14 h-14 text-center text-2xl font-bold bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50 transition-colors"
                    />
                  ))}
                </div>
              </div>

              {pinStep === 'confirm' && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                    {t('profile.confirmPin')}
                  </label>
                  <div className="flex justify-center gap-3">
                    {confirmPinDigits.map((digit, i) => (
                      <input
                        key={i}
                        ref={confirmPinRefs[i]}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handlePinDigit(i, e.target.value, true)}
                        onKeyDown={(e) => handlePinKeyDown(i, e, true)}
                        className="w-14 h-14 text-center text-2xl font-bold bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-colors"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {pinError && (
              <p className="mt-2 text-sm text-red-500 text-center">{pinError}</p>
            )}

            <div className="mt-6 flex gap-2 justify-end">
              <button
                onClick={resetPinModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleAdminSetPin}
                disabled={pinSaving || (pinStep === 'enter' ? pinDigits.join('').length !== 4 : confirmPinDigits.join('').length !== 4)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {pinSaving ? '...' : pinStep === 'enter' ? 'Далее' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SlideOver>
  );
}
