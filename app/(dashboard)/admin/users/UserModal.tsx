'use client';

import { useState, useEffect } from 'react';
import { UserRole } from '@prisma/client';
import { useLanguage } from '../../../components/LanguageProvider';

interface User {
  id: string;
  iin: string | null;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
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

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user?: User | null;
}

export default function UserModal({ isOpen, onClose, onSuccess, user }: UserModalProps) {
  const { language } = useLanguage();
  const [formData, setFormData] = useState({
    iin: user?.iin || '',
    password: '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    role: user?.role || UserRole.TEACHER,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [roles, setRoles] = useState<RefRole[]>([]);

  // Fetch active roles from the reference table (only valid enum values)
  useEffect(() => {
    if (!isOpen) return;
    const validCodes = new Set<string>(Object.values(UserRole));
    fetch('/api/database/user-roles')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: RefRole[]) => {
        const active = Array.isArray(data)
          ? data.filter((r) => r.isActive && validCodes.has(r.code))
          : [];
        setRoles(active);
      })
      .catch(() => setRoles([]));
  }, [isOpen]);

  const getRoleName = (role: RefRole): string => {
    if (language === 'kk') return role.nameKz || role.name;
    if (language === 'en') return role.nameEn || role.name;
    return role.nameRu || role.name;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = user
        ? `/api/admin/users/${user.id}`
        : '/api/admin/users';

      const method = user ? 'PATCH' : 'POST';

      const body = user
        ? formData.password
          ? formData
          : { ...formData, password: undefined }
        : formData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка при сохранении пользователя');
      }

      onSuccess();
      onClose();

      setFormData({
        iin: '',
        password: '',
        firstName: '',
        lastName: '',
        role: UserRole.TEACHER,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const inputClass = 'w-full px-3 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors';
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {user ? 'Редактировать пользователя' : 'Добавить пользователя'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4" autoComplete="off">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className={labelClass}>
                Имя
              </label>
              <input
                type="text"
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
                placeholder="Введите имя"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="lastName" className={labelClass}>
                Фамилия
              </label>
              <input
                type="text"
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
                placeholder="Введите фамилию"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="iin" className={labelClass}>
              ИИН
            </label>
            <input
              type="text"
              id="iin"
              inputMode="numeric"
              maxLength={12}
              value={formData.iin}
              onChange={(e) => setFormData({ ...formData, iin: e.target.value.replace(/\D/g, '') })}
              placeholder="000000000000"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="password" className={labelClass}>
              Пароль
              {user && (
                <span className="ml-1 text-xs text-gray-400 dark:text-gray-500 font-normal">
                  (оставьте пустым, чтобы не менять)
                </span>
              )}
            </label>
            <input
              type="password"
              id="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!user}
              placeholder={user ? '••••••••' : 'Введите пароль'}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="role" className={labelClass}>
              Роль
            </label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              required
              className={inputClass}
            >
              {roles.length > 0 ? (
                roles.map((role) => (
                  <option key={role.code} value={role.code}>
                    {getRoleName(role)}
                  </option>
                ))
              ) : (
                /* Fallback while loading */
                <option value={formData.role}>{formData.role}</option>
              )}
            </select>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={(e) => {
              const form = (e.target as HTMLElement).closest('.relative')?.querySelector('form');
              if (form) form.requestSubmit();
            }}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Сохранение...' : user ? 'Сохранить' : 'Создать'}
          </button>
        </div>
      </div>
    </div>
  );
}
