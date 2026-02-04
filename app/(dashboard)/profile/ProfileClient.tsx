'use client';

import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../components/LanguageProvider';
import { useAvatarLightbox } from '../../components/AvatarLightbox';

interface Achievement {
  id: string;
  titleKey: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  unlocked: boolean;
  progress: number;
  currentValue: number;
  targetValue: number;
}

interface ProfileUser {
  id: string;
  email: string;
  iin: string | null;
  firstName: string;
  lastName: string;
  middleName: string | null;
  phone: string | null;
  role: string;
  avatar: string | null;
  avatarLocked: boolean;
  hasPin: boolean;
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
  student: {
    id: string;
    balance: number;
    totalEarned: number;
    status: string;
    dateOfBirth: string | null;
    gradeLevel: { name: string } | null;
    language: { name: string } | null;
    studyDirection: { name: string } | null;
    school: { name: string } | null;
    city: { name: string } | null;
    branch: { name: string } | null;
  } | null;
  teacher: {
    id: string;
    status: string;
    experience: number | null;
    bio: string | null;
    dateOfBirth: string | null;
    category: { name: string } | null;
    subjects: { subject: { nameRu: string; nameKz: string } }[];
  } | null;
  parent: {
    id: string;
    occupation: string | null;
  } | null;
}

interface ProfileClientProps {
  initialUser: ProfileUser;
}

const TIER_COLORS: Record<string, { fill: string; stroke: string; glow: string }> = {
  bronze: { fill: 'fill-amber-700/20', stroke: 'stroke-amber-600', glow: 'shadow-amber-500/30' },
  silver: { fill: 'fill-gray-300/20', stroke: 'stroke-gray-400', glow: 'shadow-gray-400/30' },
  gold: { fill: 'fill-yellow-400/20', stroke: 'stroke-yellow-500', glow: 'shadow-yellow-500/30' },
  diamond: { fill: 'fill-cyan-300/20', stroke: 'stroke-cyan-400', glow: 'shadow-cyan-400/30' },
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  SUPERADMIN: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  COORDINATOR: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CHIEF_COORDINATOR: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  TEACHER: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  STUDENT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PARENT: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
};

export default function ProfileClient({ initialUser }: ProfileClientProps) {
  const { t } = useLanguage();
  const { openAvatar } = useAvatarLightbox();
  const [user, setUser] = useState(initialUser);
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    middleName: user.middleName || '',
    phone: user.phone || '',
  });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Modals
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);

  // Password form
  const [passwordForm, setPasswordForm] = useState({ current: '', newPwd: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  // PIN form
  const [pinDigits, setPinDigits] = useState(['', '', '', '']);
  const [confirmPinDigits, setConfirmPinDigits] = useState(['', '', '', '']);
  const [pinStep, setPinStep] = useState<'enter' | 'confirm'>('enter');
  const [pinError, setPinError] = useState('');
  const [pinSaving, setPinSaving] = useState(false);
  const [showDisablePinModal, setShowDisablePinModal] = useState(false);
  const [disablePinDigits, setDisablePinDigits] = useState(['', '', '', '']);
  const [disablePinError, setDisablePinError] = useState('');
  const [disablePinSaving, setDisablePinSaving] = useState(false);
  const pinRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const confirmPinRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const disablePinRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  // Avatar
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Fetch stats
  useEffect(() => {
    fetch('/api/profile/stats')
      .then((r) => r.json())
      .then((data) => {
        setStats(data.stats);
        setAchievements(data.achievements || []);
      })
      .catch(() => {})
      .finally(() => setLoadingStats(false));
  }, []);

  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();

  // Avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await fetch('/api/profile/avatar', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        setUser((prev) => ({ ...prev, avatar: data.url }));
      }
    } catch {
      // silent
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    try {
      const res = await fetch('/api/profile/avatar', { method: 'DELETE' });
      if (res.ok) {
        setUser((prev) => ({ ...prev, avatar: null }));
      }
    } catch {
      // silent
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Save profile
  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveMessage('');
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        const data = await res.json();
        setUser((prev) => ({ ...prev, ...data }));
        setEditing(false);
        setSaveMessage(t('profile.saved'));
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  // Change password
  const handleChangePassword = async () => {
    setPasswordError('');
    if (passwordForm.newPwd !== passwordForm.confirm) {
      setPasswordError(t('profile.passwordMismatch'));
      return;
    }
    if (passwordForm.newPwd.length < 4) {
      setPasswordError(t('profile.passwordMismatch'));
      return;
    }
    setPasswordSaving(true);
    try {
      const res = await fetch('/api/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: passwordForm.current, newPassword: passwordForm.newPwd }),
      });
      if (res.ok) {
        setShowPasswordModal(false);
        setPasswordForm({ current: '', newPwd: '', confirm: '' });
        setSaveMessage(t('profile.passwordChanged'));
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        const data = await res.json();
        setPasswordError(data.error === 'Wrong password' ? t('profile.wrongPassword') : data.error);
      }
    } catch {
      setPasswordError('Error');
    } finally {
      setPasswordSaving(false);
    }
  };

  // PIN handling
  const handlePinDigit = (index: number, value: string, isConfirm: boolean) => {
    if (!/^\d?$/.test(value)) return;
    const digits = isConfirm ? [...confirmPinDigits] : [...pinDigits];
    digits[index] = value;
    if (isConfirm) {
      setConfirmPinDigits(digits);
    } else {
      setPinDigits(digits);
    }
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

  const handleSetPin = async () => {
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
      const res = await fetch('/api/profile/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        setShowPinModal(false);
        setPinDigits(['', '', '', '']);
        setConfirmPinDigits(['', '', '', '']);
        setPinStep('enter');
        setUser((prev) => ({ ...prev, hasPin: true }));
        setSaveMessage(t('profile.pinChanged'));
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch {
      setPinError('Error');
    } finally {
      setPinSaving(false);
    }
  };

  const resetPinModal = () => {
    setShowPinModal(false);
    setPinDigits(['', '', '', '']);
    setConfirmPinDigits(['', '', '', '']);
    setPinStep('enter');
    setPinError('');
  };

  // Disable PIN
  const handleDisablePinDigit = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const digits = [...disablePinDigits];
    digits[index] = value;
    setDisablePinDigits(digits);
    if (value && index < 3) {
      disablePinRefs[index + 1].current?.focus();
    }
  };

  const handleDisablePinKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !disablePinDigits[index] && index > 0) {
      disablePinRefs[index - 1].current?.focus();
    }
  };

  const handleDisablePin = async () => {
    setDisablePinError('');
    const pin = disablePinDigits.join('');
    if (pin.length !== 4) return;

    setDisablePinSaving(true);
    try {
      const res = await fetch('/api/profile/pin', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        setShowDisablePinModal(false);
        setDisablePinDigits(['', '', '', '']);
        setUser((prev) => ({ ...prev, hasPin: false }));
        setSaveMessage(t('profile.pinDisabled'));
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        const data = await res.json();
        setDisablePinError(data.error === 'Wrong PIN' ? t('profile.wrongPin') : data.error);
      }
    } catch {
      setDisablePinError('Error');
    } finally {
      setDisablePinSaving(false);
    }
  };

  const resetDisablePinModal = () => {
    setShowDisablePinModal(false);
    setDisablePinDigits(['', '', '', '']);
    setDisablePinError('');
  };

  // Stat cards config
  const studentStatCards = [
    { key: 'testsCompleted', labelKey: 'stats.testsCompleted', icon: '📝', bg: 'bg-blue-50 dark:bg-blue-900/20', color: 'text-blue-600 dark:text-blue-400' },
    { key: 'averageScore', labelKey: 'stats.averageScore', icon: '📊', bg: 'bg-emerald-50 dark:bg-emerald-900/20', color: 'text-emerald-600 dark:text-emerald-400', suffix: '%' },
    { key: 'homeworksDone', labelKey: 'stats.homeworksDone', icon: '📚', bg: 'bg-purple-50 dark:bg-purple-900/20', color: 'text-purple-600 dark:text-purple-400' },
    { key: 'groupsJoined', labelKey: 'stats.groupsJoined', icon: '👥', bg: 'bg-cyan-50 dark:bg-cyan-900/20', color: 'text-cyan-600 dark:text-cyan-400' },
    { key: 'balance', labelKey: 'stats.balance', icon: '💰', bg: 'bg-amber-50 dark:bg-amber-900/20', color: 'text-amber-600 dark:text-amber-400' },
    { key: 'messagesSent', labelKey: 'stats.messagesSent', icon: '💬', bg: 'bg-rose-50 dark:bg-rose-900/20', color: 'text-rose-600 dark:text-rose-400' },
  ];

  const teacherStatCards = [
    { key: 'groupsTaught', labelKey: 'stats.groupsTaught', icon: '👥', bg: 'bg-blue-50 dark:bg-blue-900/20', color: 'text-blue-600 dark:text-blue-400' },
    { key: 'lessonsCreated', labelKey: 'stats.lessonsCreated', icon: '📖', bg: 'bg-emerald-50 dark:bg-emerald-900/20', color: 'text-emerald-600 dark:text-emerald-400' },
    { key: 'testsCreated', labelKey: 'stats.testsCreated', icon: '📝', bg: 'bg-purple-50 dark:bg-purple-900/20', color: 'text-purple-600 dark:text-purple-400' },
    { key: 'messagesSent', labelKey: 'stats.messagesSent', icon: '💬', bg: 'bg-cyan-50 dark:bg-cyan-900/20', color: 'text-cyan-600 dark:text-cyan-400' },
    { key: 'loginCount', labelKey: 'stats.loginCount', icon: '🔑', bg: 'bg-amber-50 dark:bg-amber-900/20', color: 'text-amber-600 dark:text-amber-400' },
  ];

  const genericStatCards = [
    { key: 'messagesSent', labelKey: 'stats.messagesSent', icon: '💬', bg: 'bg-blue-50 dark:bg-blue-900/20', color: 'text-blue-600 dark:text-blue-400' },
    { key: 'loginCount', labelKey: 'stats.loginCount', icon: '🔑', bg: 'bg-emerald-50 dark:bg-emerald-900/20', color: 'text-emerald-600 dark:text-emerald-400' },
  ];

  const statCards = user.role === 'STUDENT' ? studentStatCards
    : user.role === 'TEACHER' ? teacherStatCards
    : genericStatCards;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Success message */}
      {saveMessage && (
        <div className="mb-4 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-700 dark:text-green-400 font-medium">
          {saveMessage}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column */}
        <div className="lg:w-1/3 space-y-6">
          {/* Avatar Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 text-center">
            <div className="relative inline-block">
              <div className="w-32 h-32 rounded-full overflow-hidden mx-auto ring-4 ring-gray-100 dark:ring-gray-700">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt=""
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => openAvatar(user.avatar!, `${user.firstName} ${user.lastName}`)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 text-white text-3xl font-bold">
                    {initials}
                  </div>
                )}
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                    <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              {user.avatarLocked ? (
                <div className="absolute bottom-1 right-1 p-2 bg-gray-500 text-white rounded-full shadow-lg cursor-not-allowed">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-1 right-1 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>

            {user.avatarLocked ? (
              <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                {t('profile.avatarLocked')}
              </p>
            ) : (
              <div className="mt-4 flex justify-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                >
                  {t('profile.uploadPhoto')}
                </button>
                {user.avatar && (
                  <button
                    onClick={handleRemoveAvatar}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  >
                    {t('profile.removePhoto')}
                  </button>
                )}
              </div>
            )}

            <h2 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">
              {user.firstName} {user.lastName}
            </h2>
            <span className={`inline-block mt-1 px-3 py-1 text-xs font-semibold rounded-full ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-700'}`}>
              {t(`role.${user.role}`)}
            </span>
          </div>

          {/* User Info Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-3">
            {user.email && (
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{user.email}</span>
              </div>
            )}
            {user.iin && (
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" />
                </svg>
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('profile.iin')}: {user.iin}</span>
              </div>
            )}
            {user.phone && (
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="text-sm text-gray-700 dark:text-gray-300">{user.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm text-gray-500 dark:text-gray-400">{t('profile.memberSince')}: {formatDate(user.createdAt)}</span>
            </div>
            {user.lastLogin && (
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('profile.lastLogin')}: {formatDate(user.lastLogin)}</span>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
            <button
              onClick={() => setShowPasswordModal(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              {t('profile.changePassword')}
            </button>
            <div className="w-full flex items-center gap-3 px-4 py-3 rounded-xl">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">PIN</span>
              <div className="ml-auto flex items-center gap-2">
                {user.hasPin && (
                  <button
                    onClick={() => setShowPinModal(true)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title={t('profile.changePin')}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (user.hasPin) {
                      setShowDisablePinModal(true);
                      setTimeout(() => disablePinRefs[0].current?.focus(), 100);
                    } else {
                      setShowPinModal(true);
                    }
                  }}
                  className={`relative w-11 h-6 rounded-full transition-all duration-200 cursor-pointer ${
                    user.hasPin
                      ? 'bg-green-500/20 border-2 border-green-500'
                      : 'bg-transparent border-2 border-gray-500'
                  }`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200 ${
                    user.hasPin
                      ? 'translate-x-5 bg-green-500'
                      : 'translate-x-0.5 bg-gray-500'
                  }`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:w-2/3 space-y-6">
          {/* Level Banner */}
          {stats && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-5">
                {/* Level hexagon */}
                <div className="w-16 h-16 flex-shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <defs>
                      <linearGradient id="hexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                    <polygon
                      points="50,2 95,25 95,75 50,98 5,75 5,25"
                      fill="url(#hexGrad)"
                      stroke="#60a5fa"
                      strokeWidth="2"
                    />
                    <text x="50" y="58" textAnchor="middle" fill="white" fontSize="28" fontWeight="bold">
                      {stats.level}
                    </text>
                  </svg>
                </div>

                {/* XP info */}
                <div className="flex-1 min-w-0">
                  <div className="text-base font-semibold text-gray-900 dark:text-white">{t('profile.level')} {stats.level}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{stats.xp} XP {t('profile.experience')}</div>
                  <div className="mt-2.5 h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-1000"
                      style={{ width: `${(stats.xpForCurrentLevel / stats.xpForNextLevel) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {stats.xpForCurrentLevel} / {stats.xpForNextLevel} XP {t('profile.nextLevel')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">{t('profile.statistics')}</h3>
            {loadingStats ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : stats ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {statCards.map((card) => (
                  <div key={card.key} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center text-lg`}>
                        {card.icon}
                      </div>
                      <div>
                        <div className={`text-2xl font-bold ${card.color}`}>
                          {stats[card.key] ?? 0}{(card as any).suffix || ''}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{t(card.labelKey)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* Achievements */}
          {achievements.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">{t('profile.achievements')}</h3>
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-6">
                  {achievements.map((ach) => {
                    const colors = TIER_COLORS[ach.tier] || TIER_COLORS.bronze;
                    return (
                      <div
                        key={ach.id}
                        className={`flex flex-col items-center gap-2 group cursor-default transition-transform hover:scale-105`}
                      >
                        <div className={`relative w-16 h-16 ${ach.unlocked ? '' : 'opacity-40 grayscale'}`}>
                          <svg viewBox="0 0 100 100" className={`w-full h-full ${ach.unlocked ? `drop-shadow-lg ${colors.glow}` : ''}`}>
                            <polygon
                              points="50,2 95,25 95,75 50,98 5,75 5,25"
                              className={`${colors.fill} ${colors.stroke}`}
                              strokeWidth="3"
                            />
                            <text x="50" y="58" textAnchor="middle" fontSize="30">
                              {ach.icon}
                            </text>
                          </svg>
                          {!ach.unlocked && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-gray-800/80 px-1.5 py-0.5 rounded-full">
                                {Math.round(ach.progress)}%
                              </span>
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-center text-gray-600 dark:text-gray-400 font-medium leading-tight">
                          {t(ach.titleKey)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Edit Profile */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('profile.editProfile')}</h3>
              {!editing && (
                <button
                  onClick={() => {
                    setEditForm({
                      firstName: user.firstName,
                      lastName: user.lastName,
                      middleName: user.middleName || '',
                      phone: user.phone || '',
                    });
                    setEditing(true);
                  }}
                  className="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                >
                  {t('profile.editProfile')}
                </button>
              )}
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('profile.firstName')}</label>
                  {editing ? (
                    <input
                      value={editForm.firstName}
                      onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user.firstName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('profile.lastName')}</label>
                  {editing ? (
                    <input
                      value={editForm.lastName}
                      onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user.lastName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('profile.middleName')}</label>
                  {editing ? (
                    <input
                      value={editForm.middleName}
                      onChange={(e) => setEditForm((f) => ({ ...f, middleName: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user.middleName || '—'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('profile.phone')}</label>
                  {editing ? (
                    <input
                      value={editForm.phone}
                      onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user.phone || '—'}</p>
                  )}
                </div>
              </div>
              {editing && (
                <div className="mt-4 flex gap-2 justify-end">
                  <button
                    onClick={() => setEditing(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? '...' : t('profile.save')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPasswordModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">{t('profile.changePassword')}</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('profile.currentPassword')}</label>
                <div className="relative">
                  <input
                    type={showCurrentPwd ? 'text' : 'password'}
                    value={passwordForm.current}
                    onChange={(e) => setPasswordForm((f) => ({ ...f, current: e.target.value }))}
                    className="w-full px-3 py-2.5 pr-10 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {showCurrentPwd ? (
                      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg>
                    ) : (
                      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('profile.newPassword')}</label>
                <div className="relative">
                  <input
                    type={showNewPwd ? 'text' : 'password'}
                    value={passwordForm.newPwd}
                    onChange={(e) => setPasswordForm((f) => ({ ...f, newPwd: e.target.value }))}
                    className="w-full px-3 py-2.5 pr-10 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPwd(!showNewPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {showNewPwd ? (
                      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg>
                    ) : (
                      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('profile.confirmPassword')}</label>
                <div className="relative">
                  <input
                    type={showConfirmPwd ? 'text' : 'password'}
                    value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm((f) => ({ ...f, confirm: e.target.value }))}
                    className="w-full px-3 py-2.5 pr-10 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {showConfirmPwd ? (
                      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg>
                    ) : (
                      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {passwordError && (
              <p className="mt-2 text-sm text-red-500">{passwordError}</p>
            )}

            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={() => { setShowPasswordModal(false); setPasswordForm({ current: '', newPwd: '', confirm: '' }); setPasswordError(''); setShowCurrentPwd(false); setShowNewPwd(false); setShowConfirmPwd(false); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleChangePassword}
                disabled={passwordSaving || !passwordForm.current || !passwordForm.newPwd || !passwordForm.confirm}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {passwordSaving ? '...' : t('profile.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={resetPinModal}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
              {user.hasPin ? t('profile.changePin') : t('profile.setPin')}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">{t('profile.pinDescription')}</p>

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
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSetPin}
                disabled={pinSaving || (pinStep === 'enter' ? pinDigits.join('').length !== 4 : confirmPinDigits.join('').length !== 4)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {pinSaving ? '...' : pinStep === 'enter' ? t('common.next') || 'Next' : t('profile.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disable PIN Modal */}
      {showDisablePinModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={resetDisablePinModal}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
              {t('profile.disablePin')}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">{t('profile.disablePinDescription')}</p>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                {t('profile.enterCurrentPin')}
              </label>
              <div className="flex justify-center gap-3">
                {disablePinDigits.map((digit, i) => (
                  <input
                    key={i}
                    ref={disablePinRefs[i]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDisablePinDigit(i, e.target.value)}
                    onKeyDown={(e) => handleDisablePinKeyDown(i, e)}
                    className="w-14 h-14 text-center text-2xl font-bold bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/30 transition-colors"
                  />
                ))}
              </div>
            </div>

            {disablePinError && (
              <p className="mt-2 text-sm text-red-500 text-center">{disablePinError}</p>
            )}

            <div className="mt-6 flex gap-2 justify-end">
              <button
                onClick={resetDisablePinModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDisablePin}
                disabled={disablePinSaving || disablePinDigits.join('').length !== 4}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {disablePinSaving ? '...' : t('profile.disablePin')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
