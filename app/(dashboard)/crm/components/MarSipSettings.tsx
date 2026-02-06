'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface MarSipSettingsProps {
  t: (key: string) => string;
}

// Custom Select Component
function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-left hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
      >
        <span className={selectedOption ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}>
          {selectedOption?.label || placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg max-h-60 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                option.value === value
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'text-gray-900 dark:text-white'
              }`}
            >
              {option.value === value && (
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
              <span className={option.value === value ? '' : 'ml-6'}>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface Extension {
  id: string;
  extensionNumber: string;
  displayName: string | null;
  userId: string | null;
  isActive: boolean;
  isOnline: boolean;
  forwardNumber: string | null;
  voicemailEnabled: boolean;
  callerId: string | null;
}

interface MarSipConfig {
  id: string;
  sipServer: string;
  sipLogin: string | null;
  sipPassword: string | null;
  sipPort: number;
  isActive: boolean;
  recordCalls: boolean;
  autoCreateLead: boolean;
  showLeadCard: boolean;
  logCallsToLead: boolean;
  ringTimeout: number;
  forwardNumber: string | null;
  voicemailEnabled: boolean;
  extensions: Extension[];
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function MarSipSettings({ t }: MarSipSettingsProps) {
  const [config, setConfig] = useState<MarSipConfig | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'connection' | 'extensions' | 'features'>('connection');

  // New extension form
  const [newExtNumber, setNewExtNumber] = useState('');
  const [newExtName, setNewExtName] = useState('');
  const [newExtUserId, setNewExtUserId] = useState('');
  const [newExtCallerId, setNewExtCallerId] = useState('');
  const [addingExt, setAddingExt] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/crm/settings/marsip');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Failed to fetch MarSIP config:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users/search?roles=SUPERADMIN,ADMIN,COORDINATOR,CHIEF_COORDINATOR&limit=100');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
    fetchUsers();
  }, [fetchConfig, fetchUsers]);

  const saveConfig = async (updates: Partial<MarSipConfig>) => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch('/api/crm/settings/marsip', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, ...updates }),
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Failed to save MarSIP config:', error);
    } finally {
      setSaving(false);
    }
  };

  const addExtension = async () => {
    if (!newExtNumber.trim()) return;
    setAddingExt(true);
    try {
      const res = await fetch('/api/crm/settings/marsip/extensions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extensionNumber: newExtNumber.trim(),
          displayName: newExtName.trim() || null,
          userId: newExtUserId || null,
          callerId: newExtCallerId.trim() || null,
        }),
      });
      if (res.ok) {
        setNewExtNumber('');
        setNewExtName('');
        setNewExtUserId('');
        setNewExtCallerId('');
        fetchConfig();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to add extension');
      }
    } catch (error) {
      console.error('Failed to add extension:', error);
    } finally {
      setAddingExt(false);
    }
  };

  const deleteExtension = async (id: string) => {
    if (!confirm(t('crm.settings.confirmDeleteExtension'))) return;
    try {
      const res = await fetch('/api/crm/settings/marsip/extensions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        fetchConfig();
      }
    } catch (error) {
      console.error('Failed to delete extension:', error);
    }
  };

  const updateExtension = async (id: string, updates: Partial<Extension>) => {
    try {
      const res = await fetch('/api/crm/settings/marsip/extensions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      if (res.ok) {
        fetchConfig();
      }
    } catch (error) {
      console.error('Failed to update extension:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        {t('crm.settings.configError')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div className={`p-4 rounded-xl flex items-center justify-between ${
        config.isActive
          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
          : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${config.isActive ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
          <div>
            <div className={`font-medium ${config.isActive ? 'text-green-800 dark:text-green-200' : 'text-yellow-800 dark:text-yellow-200'}`}>
              {config.isActive ? t('crm.settings.marsipActive') : t('crm.settings.marsipInactive')}
            </div>
            <div className={`text-sm ${config.isActive ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
              {config.isActive ? t('crm.settings.marsipActiveDesc') : t('crm.settings.marsipInactiveDesc')}
            </div>
          </div>
        </div>
        <button
          onClick={() => saveConfig({ isActive: !config.isActive })}
          disabled={saving}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            config.isActive
              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {saving ? '...' : config.isActive ? t('crm.settings.disable') : t('crm.settings.enable')}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
        {(['connection', 'extensions', 'features'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {t(`crm.settings.tab.${tab}`)}
          </button>
        ))}
      </div>

      {/* Connection tab */}
      {activeTab === 'connection' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SIP Server */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('crm.settings.sipServer')}
              </label>
              <select
                value={config.sipServer}
                onChange={(e) => saveConfig({ sipServer: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="almpbx.tele2.kz">almpbx.tele2.kz (Алматы)</option>
                <option value="astpbx.tele2.kz">astpbx.tele2.kz (Астана)</option>
              </select>
            </div>

            {/* SIP Port */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('crm.settings.sipPort')}
              </label>
              <input
                type="number"
                value={config.sipPort}
                onChange={(e) => saveConfig({ sipPort: parseInt(e.target.value) || 5060 })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* SIP Login */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('crm.settings.sipLogin')}
              </label>
              <input
                type="text"
                value={config.sipLogin || ''}
                onChange={(e) => saveConfig({ sipLogin: e.target.value })}
                placeholder="7tiWgPpD"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* SIP Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('crm.settings.sipPassword')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={config.sipPassword || ''}
                  onChange={(e) => saveConfig({ sipPassword: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Ring timeout */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('crm.settings.ringTimeout')} ({config.ringTimeout} {t('crm.settings.seconds')})
            </label>
            <input
              type="range"
              min="10"
              max="60"
              value={config.ringTimeout}
              onChange={(e) => saveConfig({ ringTimeout: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>

          {/* Forward number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('crm.settings.forwardNumber')}
            </label>
            <input
              type="text"
              value={config.forwardNumber || ''}
              onChange={(e) => saveConfig({ forwardNumber: e.target.value || null })}
              placeholder="+7 777 123 4567"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t('crm.settings.forwardNumberHint')}
            </p>
          </div>
        </div>
      )}

      {/* Extensions tab */}
      {activeTab === 'extensions' && (
        <div className="space-y-4">
          {/* Add new extension */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">
              {t('crm.settings.addExtension')}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <input
                type="text"
                value={newExtNumber}
                onChange={(e) => setNewExtNumber(e.target.value)}
                placeholder={t('crm.settings.extensionNumber')}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              />
              <input
                type="text"
                value={newExtName}
                onChange={(e) => setNewExtName(e.target.value)}
                placeholder={t('crm.settings.displayName')}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              />
              <CustomSelect
                value={newExtUserId}
                onChange={(val) => setNewExtUserId(val)}
                placeholder={t('crm.settings.selectUser')}
                options={[
                  { value: '', label: t('crm.settings.selectUser') },
                  ...users.map((user) => ({
                    value: user.id,
                    label: `${user.lastName} ${user.firstName}`,
                  })),
                ]}
              />
              <input
                type="text"
                value={newExtCallerId}
                onChange={(e) => setNewExtCallerId(e.target.value)}
                placeholder="CallerID (+7...)"
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              />
              <button
                onClick={addExtension}
                disabled={addingExt || !newExtNumber.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {addingExt ? '...' : t('crm.settings.add')}
              </button>
            </div>
          </div>

          {/* Extensions list */}
          <div className="space-y-2">
            {config.extensions.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {t('crm.settings.noExtensions')}
              </div>
            ) : (
              config.extensions.map((ext) => (
                <div
                  key={ext.id}
                  className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
                >
                  {/* Extension number badge */}
                  <div className="flex items-center justify-center w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {ext.extensionNumber}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {ext.displayName || t('crm.settings.noName')}
                      </span>
                      <span className={`w-2 h-2 rounded-full ${ext.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {ext.userId
                        ? users.find(u => u.id === ext.userId)?.email || t('crm.settings.userLinked')
                        : t('crm.settings.notLinked')
                      }
                    </div>
                  </div>

                  {/* User select */}
                  <div className="w-48">
                    <CustomSelect
                      value={ext.userId || ''}
                      onChange={(val) => updateExtension(ext.id, { userId: val || null })}
                      placeholder={t('crm.settings.selectUser')}
                      options={[
                        { value: '', label: t('crm.settings.selectUser') },
                        ...users.map((user) => ({
                          value: user.id,
                          label: `${user.lastName} ${user.firstName}`,
                        })),
                      ]}
                    />
                  </div>

                  {/* CallerID */}
                  <div className="w-36">
                    <input
                      type="text"
                      value={ext.callerId || ''}
                      onChange={(e) => updateExtension(ext.id, { callerId: e.target.value || null })}
                      placeholder="CallerID"
                      className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400"
                    />
                  </div>

                  {/* Toggle active */}
                  <button
                    onClick={() => updateExtension(ext.id, { isActive: !ext.isActive })}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                      ext.isActive
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {ext.isActive ? t('crm.settings.active') : t('crm.settings.inactive')}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => deleteExtension(ext.id)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Features tab */}
      {activeTab === 'features' && (
        <div className="space-y-4">
          {/* Toggle options */}
          {[
            { key: 'recordCalls', label: 'crm.settings.recordCalls', desc: 'crm.settings.recordCallsDesc' },
            { key: 'autoCreateLead', label: 'crm.settings.autoCreateLead', desc: 'crm.settings.autoCreateLeadDesc' },
            { key: 'showLeadCard', label: 'crm.settings.showLeadCard', desc: 'crm.settings.showLeadCardDesc' },
            { key: 'logCallsToLead', label: 'crm.settings.logCallsToLead', desc: 'crm.settings.logCallsToLeadDesc' },
            { key: 'voicemailEnabled', label: 'crm.settings.voicemail', desc: 'crm.settings.voicemailDesc' },
          ].map((option) => (
            <div
              key={option.key}
              className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
            >
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {t(option.label)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {t(option.desc)}
                </div>
              </div>
              <button
                onClick={() => saveConfig({ [option.key]: !config[option.key as keyof MarSipConfig] })}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  config[option.key as keyof MarSipConfig]
                    ? 'bg-blue-600'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    config[option.key as keyof MarSipConfig] ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
