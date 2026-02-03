'use client';

import { useState } from 'react';
import type { CrmLead } from '../CrmClient';

interface CrmLeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadCreated: (lead: CrmLead) => void;
  t: (key: string) => string;
}

export default function CrmLeadFormModal({ isOpen, onClose, onLeadCreated, t }: CrmLeadFormModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;

    setSaving(true);
    try {
      const res = await fetch('/api/crm/leads', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          parentName: parentName.trim() || undefined,
          parentPhone: parentPhone.trim() || undefined,
          source: source || undefined,
          amount: amount.trim() || undefined,
          description: description.trim() || undefined,
          language: language || undefined,
        }),
      });

      if (res.ok) {
        const lead = await res.json();
        onLeadCreated(lead);
      }
    } catch { /* ignore */ }
    setSaving(false);
  };

  const inputClass = 'w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('crm.addLead')}</h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('crm.lastName')} *</label>
              <input value={lastName} onChange={e => setLastName(e.target.value)} className={inputClass} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('crm.firstName')} *</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} className={inputClass} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('crm.phone')}</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} placeholder="+7 777 123 4567" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('crm.email')}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('crm.parentName')}</label>
              <input value={parentName} onChange={e => setParentName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('crm.parentPhone')}</label>
              <input value={parentPhone} onChange={e => setParentPhone(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('crm.source')}</label>
              <select value={source} onChange={e => setSource(e.target.value)} className={inputClass}>
                <option value="">—</option>
                <option value="Instagram">Входящий Instagram</option>
                <option value="WhatsApp">Входящий WhatsApp</option>
                <option value="Facebook">Входящий Facebook</option>
                <option value="mektepte">mektepte</option>
                <option value="Звонок">Входящий звонок</option>
                <option value="Другое">Другое</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('crm.amount')}</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('crm.language')}</label>
              <select value={language} onChange={e => setLanguage(e.target.value)} className={inputClass}>
                <option value="">—</option>
                <option value="KZ">KZ</option>
                <option value="RU">RU</option>
                <option value="EN">EN</option>
              </select>
            </div>
            <div />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('crm.description')}</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving || !firstName.trim() || !lastName.trim()}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? '...' : t('crm.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
