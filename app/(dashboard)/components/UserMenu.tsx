'use client';

import { useState, useRef, useEffect } from 'react';
import { signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../../components/LanguageProvider';

interface SavedAccount {
  iin: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar?: string | null;
  switchToken?: string;
}

interface UserMenuProps {
  firstName: string;
  lastName: string;
  iin?: string;
  role: string;
  switchToken?: string;
}

export default function UserMenu({ firstName, lastName, iin, role, switchToken }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [avatar, setAvatar] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { t } = useLanguage();

  // Fetch current user avatar and save to localStorage
  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((data) => {
        setAvatar(data.avatar || null);
        if (iin) {
          const accounts: SavedAccount[] = JSON.parse(localStorage.getItem('saved_accounts') || '[]');
          const idx = accounts.findIndex((a) => a.iin === iin);
          if (idx !== -1) {
            accounts[idx].avatar = data.avatar || null;
            localStorage.setItem('saved_accounts', JSON.stringify(accounts));
          }
        }
      })
      .catch(() => {});
  }, [iin]);

  // Save current account to localStorage on mount
  useEffect(() => {
    if (!iin) return;
    const accounts: SavedAccount[] = JSON.parse(localStorage.getItem('saved_accounts') || '[]');
    const updated = accounts.filter((a) => a.iin !== iin);
    updated.push({ iin, firstName, lastName, role, switchToken });
    localStorage.setItem('saved_accounts', JSON.stringify(updated));
  }, [iin, firstName, lastName, role, switchToken]);

  // Load saved accounts when dropdown opens
  useEffect(() => {
    if (isOpen) {
      const accounts: SavedAccount[] = JSON.parse(localStorage.getItem('saved_accounts') || '[]');
      setSavedAccounts(accounts.filter((a) => a.iin !== iin));
    }
  }, [isOpen, iin]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const logLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
  };

  const getClientInfo = () => {
    const nav = navigator as any;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
    let networkType = 'Unknown';
    if (conn) {
      const type = conn.type;
      const effectiveType = conn.effectiveType;
      if (type === 'wifi') networkType = 'Wi-Fi';
      else if (type === 'ethernet') networkType = 'Ethernet';
      else if (type === 'cellular') networkType = `Cellular (${effectiveType || ''})`.trim();
      else if (effectiveType) networkType = effectiveType.toUpperCase();
    }
    const screenResolution = `${window.screen.width}x${window.screen.height}`;
    const language = navigator.language || '';
    let clientTimezone = '';
    try { clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch {}
    let connectionSpeed = '';
    if (conn) {
      const parts: string[] = [];
      if (conn.downlink) parts.push(`${conn.downlink} Mbps`);
      if (conn.rtt) parts.push(`RTT ${conn.rtt}ms`);
      if (conn.effectiveType) parts.push(conn.effectiveType);
      connectionSpeed = parts.join(', ');
    }
    return { networkType, screenResolution, language, clientTimezone, connectionSpeed };
  };

  const autoLogin = async (account: SavedAccount): Promise<boolean> => {
    if (!account.switchToken) return false;
    const info = getClientInfo();
    const result = await signIn('credentials', {
      iin: account.iin,
      switchToken: account.switchToken,
      ...info,
      redirect: false,
    });
    return !result?.error;
  };

  const handleSignOut = async () => {
    setIsOpen(false);

    // Remove current account from saved list
    const accounts: SavedAccount[] = JSON.parse(localStorage.getItem('saved_accounts') || '[]');
    const otherAccounts = accounts.filter((a) => a.iin !== iin);
    localStorage.setItem('saved_accounts', JSON.stringify(otherAccounts));

    await logLogout();
    await signOut({ redirect: false });

    // If there are other saved accounts, auto-switch to the first one
    if (otherAccounts.length > 0) {
      const target = otherAccounts[0];
      const success = await autoLogin(target);
      if (success) {
        window.location.href = '/dashboard';
        return;
      }
    }

    // No other accounts or auto-login failed
    window.location.href = '/login';
  };

  const handleSwitchAccount = async (targetIin: string) => {
    setIsOpen(false);
    const accounts: SavedAccount[] = JSON.parse(localStorage.getItem('saved_accounts') || '[]');
    const target = accounts.find((a) => a.iin === targetIin);

    await logLogout();
    await signOut({ redirect: false });

    if (target) {
      const success = await autoLogin(target);
      if (success) {
        window.location.href = '/dashboard';
        return;
      }
    }
    window.location.href = `/login?iin=${targetIin}`;
  };

  const handleAddAccount = async () => {
    setIsOpen(false);
    await logLogout();
    await signOut({ redirect: false });
    router.push('/login');
  };

  const handleRemoveAccount = (targetIin: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const accounts: SavedAccount[] = JSON.parse(localStorage.getItem('saved_accounts') || '[]');
    const filtered = accounts.filter((a) => a.iin !== targetIin);
    localStorage.setItem('saved_accounts', JSON.stringify(filtered));
    setSavedAccounts(filtered.filter((a) => a.iin !== iin));
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 pl-4 pr-1.5 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 transition-all"
      >
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:block">
          {firstName} {lastName}
        </span>
        {avatar ? (
          <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
            <img src={avatar} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
            <span className="text-xs font-semibold text-white">
              {firstName?.[0] || ''}{lastName?.[0] || ''}
            </span>
          </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50 animate-fade-in">
          {/* Current user */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {firstName} {lastName}
            </p>
            <span className="inline-block mt-2 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-lg">
              {t(`role.${role}`)}
            </span>
          </div>

          {/* Saved accounts */}
          {savedAccounts.length > 0 && (
            <div className="border-b border-gray-100 dark:border-gray-700">
              <div className="px-4 pt-3 pb-1">
                <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  {t('user.otherAccounts')}
                </p>
              </div>
              <div className="p-1.5">
                {savedAccounts.map((account) => (
                  <button
                    key={account.iin}
                    onClick={() => handleSwitchAccount(account.iin)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                  >
                    {account.avatar ? (
                      <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                        <img src={account.avatar} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                          {account.firstName?.[0] || ''}{account.lastName?.[0] || ''}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white truncate">
                        {account.firstName} {account.lastName}
                      </p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">
                        {t(`role.${account.role}`)}
                      </p>
                    </div>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={(e) => handleRemoveAccount(account.iin, e)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleRemoveAccount(account.iin, e as unknown as React.MouseEvent); }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all flex-shrink-0"
                      title="Удалить"
                    >
                      <svg className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="p-2 space-y-0.5">
            <button
              onClick={handleAddAccount}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <span className="font-medium">{t('user.addAccount')}</span>
            </button>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="font-medium">{t('user.logout')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
