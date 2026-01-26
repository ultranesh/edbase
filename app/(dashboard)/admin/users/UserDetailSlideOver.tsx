'use client';

import { useState } from 'react';
import SlideOver from '../../components/SlideOver';
import { UserRole } from '@prisma/client';
import { useNotification } from '@/app/components/ui/NotificationProvider';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  phone: string | null;
  lastLogin: Date | null;
  createdAt: Date;
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

export default function UserDetailSlideOver({
  user,
  isOpen,
  onClose,
  onUpdate,
}: UserDetailSlideOverProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useNotification();

  if (!user) return null;

  const handleEdit = () => {
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      isActive: user.isActive,
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/users/${user.id}`, {
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

  const getRoleBadgeColor = (role: UserRole) => {
    const colors: Record<UserRole, string> = {
      SUPERADMIN: 'bg-purple-100 text-purple-700',
      ADMIN: 'bg-red-100 text-red-700',
      DEPARTMENT_HEAD: 'bg-orange-100 text-orange-700',
      CURATOR: 'bg-yellow-100 text-yellow-700',
      COORDINATOR: 'bg-green-100 text-green-700',
      TEACHER: 'bg-blue-100 text-blue-700',
      PARENT: 'bg-gray-100 text-gray-700',
      ONLINE_MENTOR: 'bg-cyan-100 text-cyan-700',
    };
    return colors[role] || 'bg-gray-100 text-gray-700';
  };

  const getRoleLabel = (role: UserRole) => {
    const labels: Record<UserRole, string> = {
      SUPERADMIN: 'Суперадмин',
      ADMIN: 'Админ',
      DEPARTMENT_HEAD: 'Руководитель отдела',
      CURATOR: 'Куратор',
      COORDINATOR: 'Координатор',
      TEACHER: 'Преподаватель',
      PARENT: 'Родитель',
      ONLINE_MENTOR: 'Онлайн-ментор',
    };
    return labels[role] || role;
  };

  const inputClass = "w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all hover:border-gray-300 text-gray-900";
  const selectClass = "w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all hover:border-gray-300 text-gray-900 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%228%22%20viewBox%3D%220%200%2012%208%22%3E%3Cpath%20fill%3D%22%236B7280%22%20d%3D%22M1.41%200L6%204.59%2010.59%200%2012%201.41l-6%206-6-6z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px_12px] bg-[position:right_1rem_center] bg-no-repeat pr-10";

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
        {/* Header with Status and Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 rounded-full bg-gray-900 flex items-center justify-center">
              <span className="text-2xl font-medium text-white">
                {user.firstName[0]}{user.lastName[0]}
              </span>
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
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
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
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Редактировать
            </button>
          )}
          {isEditing && (
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          )}
        </div>

        {/* Personal Information */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Личная информация</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-600">Имя</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className={inputClass}
                />
              ) : (
                <div className="text-sm font-medium text-gray-900">{user.firstName}</div>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-600">Фамилия</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className={inputClass}
                />
              ) : (
                <div className="text-sm font-medium text-gray-900">{user.lastName}</div>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-600">Email</label>
              {isEditing ? (
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={inputClass}
                />
              ) : (
                <div className="text-sm font-medium text-gray-900">{user.email}</div>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-600">Телефон</label>
              {isEditing ? (
                <input
                  type="tel"
                  value={formatPhone(formData.phone || '')}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                  placeholder="+7 XXX XXX XX XX"
                  className={inputClass}
                />
              ) : (
                <div className="text-sm font-medium text-gray-900">{user.phone ? formatPhone(user.phone) : '-'}</div>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-600">Роль</label>
              {isEditing ? (
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className={selectClass}
                >
                  <option value="TEACHER">Преподаватель</option>
                  <option value="PARENT">Родитель</option>
                  <option value="COORDINATOR">Координатор</option>
                  <option value="CURATOR">Куратор</option>
                  <option value="DEPARTMENT_HEAD">Руководитель отдела</option>
                  <option value="ADMIN">Админ</option>
                  <option value="SUPERADMIN">Суперадмин</option>
                  <option value="ONLINE_MENTOR">Онлайн-ментор</option>
                </select>
              ) : (
                <div className="text-sm font-medium text-gray-900">{getRoleLabel(user.role)}</div>
              )}
            </div>
          </div>
        </div>

        {/* Activity Information */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Активность</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-600">Последний вход</label>
              <div className="text-sm font-medium text-gray-900">
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
            <div>
              <label className="text-xs text-gray-600">Дата регистрации</label>
              <div className="text-sm font-medium text-gray-900">
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
    </SlideOver>
  );
}
