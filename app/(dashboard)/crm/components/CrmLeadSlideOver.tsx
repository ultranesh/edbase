'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import CrmWhatsAppChat from './CrmWhatsAppChat';
import CrmSocialChat from './CrmSocialChat';
import type { CrmLead } from '../CrmClient';

interface CrmLeadSlideOverProps {
  lead: CrmLead;
  isOpen: boolean;
  onClose: () => void;
  onLeadUpdated: (lead: CrmLead) => void;
  onLeadDeleted: (leadId: string) => void;
  formatAmount: (amount: number) => string;
  t: (key: string) => string;
}

interface MarSipStatus {
  hasExtension: boolean;
  marsipActive: boolean;
}

interface RefOption {
  id: string;
  name: string;
  nameRu?: string;
  nameKz?: string;
}

interface LeadFull extends CrmLead {
  studentName?: string | null;
  studentPhone?: string | null;
  gradeLevelId?: string | null;
  gradeLevel?: RefOption | null;
  studyLanguageId?: string | null;
  studyLanguage?: RefOption | null;
  goal?: string | null;
  regionId?: string | null;
  region?: RefOption | null;
  cityId?: string | null;
  city?: RefOption | null;
  schoolId?: string | null;
  school?: RefOption | null;
  meetingAt?: string | null;
  bonus?: string | null;
}

export default function CrmLeadSlideOver({ lead, isOpen, onClose, onLeadUpdated, onLeadDeleted, formatAmount, t }: CrmLeadSlideOverProps) {
  const initials = `${lead.firstName[0] || ''}${lead.lastName[0] || ''}`;
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [callResult, setCallResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [msgTab, setMsgTab] = useState<'whatsapp' | 'messenger' | 'instagram'>('whatsapp');
  const [marsipStatus, setMarsipStatus] = useState<MarSipStatus | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullLead, setFullLead] = useState<LeadFull>(lead as LeadFull);

  // Reference data
  const [gradeLevels, setGradeLevels] = useState<RefOption[]>([]);
  const [languages, setLanguages] = useState<RefOption[]>([]);
  const [regions, setRegions] = useState<RefOption[]>([]);
  const [cities, setCities] = useState<RefOption[]>([]);
  const [schools, setSchools] = useState<RefOption[]>([]);

  // Form state
  const [form, setForm] = useState({
    firstName: lead.firstName,
    lastName: lead.lastName,
    phone: lead.phone || '',
    email: lead.email || '',
    parentName: lead.parentName || '',
    parentPhone: lead.parentPhone || '',
    studentName: '',
    studentPhone: '',
    gradeLevelId: '',
    studyLanguageId: '',
    goal: '',
    regionId: '',
    cityId: '',
    schoolId: '',
    meetingAt: '',
    amount: lead.amount?.toString() || '',
    description: lead.description || '',
  });

  // Handle form field change without losing scroll position
  const handleFieldChange = useCallback((field: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  // Scroll to top when lead changes
  useEffect(() => {
    if (isOpen && leftColumnRef.current) {
      leftColumnRef.current.scrollTop = 0;
    }
  }, [isOpen, lead.id]);

  // Load full lead data and reference data
  useEffect(() => {
    if (!isOpen) return;

    // Load full lead
    fetch(`/api/crm/leads/${lead.id}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setFullLead(data);
          setForm({
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            phone: data.phone || '',
            email: data.email || '',
            parentName: data.parentName || '',
            parentPhone: data.parentPhone || '',
            studentName: data.studentName || '',
            studentPhone: data.studentPhone || '',
            gradeLevelId: data.gradeLevelId || '',
            studyLanguageId: data.studyLanguageId || '',
            goal: data.goal || '',
            regionId: data.regionId || '',
            cityId: data.cityId || '',
            schoolId: data.schoolId || '',
            meetingAt: data.meetingAt ? new Date(data.meetingAt).toISOString().slice(0, 16) : '',
            amount: data.amount?.toString() || '',
            description: data.description || '',
          });
        }
      });

    // Load reference data
    Promise.all([
      fetch('/api/database/grade-levels').then(r => r.ok ? r.json() : []),
      fetch('/api/database/languages').then(r => r.ok ? r.json() : []),
      fetch('/api/database/regions').then(r => r.ok ? r.json() : []),
    ]).then(([gl, lang, reg]) => {
      setGradeLevels(gl);
      setLanguages(lang);
      setRegions(reg);
    });

  }, [isOpen, lead.id]);

  // Load cities when region changes
  useEffect(() => {
    if (form.regionId) {
      fetch(`/api/database/cities?regionId=${form.regionId}`)
        .then(r => r.ok ? r.json() : [])
        .then(setCities);
    } else {
      setCities([]);
    }
  }, [form.regionId]);

  // Load schools when city changes
  useEffect(() => {
    if (form.cityId) {
      fetch(`/api/database/schools?cityId=${form.cityId}`)
        .then(r => r.ok ? r.json() : [])
        .then(setSchools);
    } else {
      setSchools([]);
    }
  }, [form.cityId]);

  // Check if user has MarSIP extension
  useEffect(() => {
    fetch('/api/crm/settings/marsip/my-extension')
      .then(res => res.ok ? res.json() : null)
      .then(data => data && setMarsipStatus(data))
      .catch(() => {});
  }, []);

  const formatDate = (d: string | null | undefined) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleCall = (phone: string) => {
    if (marsipStatus && !marsipStatus.hasExtension) {
      setCallResult({ type: 'error', message: 'У вас нет аккаунта в MarSIP' });
      setTimeout(() => setCallResult(null), 3000);
      return;
    }
    const event = new CustomEvent('marsip:call', { detail: { phone, leadId: lead.id } });
    window.dispatchEvent(event);
    setCallResult({ type: 'success', message: t('crm.callInitiated') || 'Звонок инициирован' });
    setTimeout(() => setCallResult(null), 3000);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/crm/leads/${lead.id}`, { method: 'DELETE', cache: 'no-store' });
      if (res.ok) {
        onLeadDeleted(lead.id);
      }
    } catch { /* ignore */ }
    setDeleting(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/crm/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: form.amount ? parseFloat(form.amount) : null,
          meetingAt: form.meetingAt || null,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setFullLead(updated);
        onLeadUpdated(updated);
        setIsEditing(false);
      }
    } catch { /* ignore */ }
    setSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Compact Header */}
      <div className="px-6 py-3 shrink-0 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{initials}</span>
            </div>
            <h1 className="text-base font-semibold text-gray-900 dark:text-white">
              {fullLead.lastName} {fullLead.firstName}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? '...' : 'Сохранить'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Редактировать
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Call result notification */}
      {callResult && (
        <div className={`absolute top-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm font-medium z-50 ${
          callResult.type === 'success'
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
        }`}>
          {callResult.message}
        </div>
      )}

      {/* Content */}
      <div key={lead.id} className="flex-1 min-h-0 px-4 pb-4 pt-2">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
          {/* Left column - Info (own scroll) */}
          <div ref={leftColumnRef} className="space-y-3 overflow-y-auto lg:h-[calc(100vh-180px)] pr-2" style={{ scrollbarWidth: 'thin' }}>
              {/* Contact Info */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Контактная информация</h4>
                <div className="space-y-2">
                  <FormRow label="Телефон" value={form.phone} field="phone" isEditing={isEditing} onChange={handleFieldChange}
                    displayValue={fullLead.phone ? (
                      <span className="flex items-center gap-2">
                        <span>{fullLead.phone}</span>
                        <button onClick={() => handleCall(fullLead.phone!)} className="text-xs text-green-600 hover:text-green-700">Позвонить</button>
                      </span>
                    ) : '—'} />
                  <FormRow label="Email" value={form.email} field="email" isEditing={isEditing} onChange={handleFieldChange} displayValue={fullLead.email || '—'} />
                  <FormRow label="ФИО родителя" value={form.parentName} field="parentName" isEditing={isEditing} onChange={handleFieldChange} displayValue={fullLead.parentName || '—'} />
                  <FormRow label="Телефон родителя" value={form.parentPhone} field="parentPhone" isEditing={isEditing} onChange={handleFieldChange}
                    displayValue={fullLead.parentPhone ? (
                      <span className="flex items-center gap-2">
                        <span>{fullLead.parentPhone}</span>
                        <button onClick={() => handleCall(fullLead.parentPhone!)} className="text-xs text-green-600 hover:text-green-700">Позвонить</button>
                      </span>
                    ) : '—'} />
                </div>
              </div>

              {/* Student Profile */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Анкетные данные ученика</h4>
                <div className="space-y-2">
                  <FormRow label="ФИО ученика" value={form.studentName} field="studentName" isEditing={isEditing} onChange={handleFieldChange} displayValue={fullLead.studentName || '—'} />
                  <FormRow label="Номер ученика" value={form.studentPhone} field="studentPhone" isEditing={isEditing} onChange={handleFieldChange} displayValue={fullLead.studentPhone || '—'} />
                  <FormSelect label="Класс" value={form.gradeLevelId} field="gradeLevelId" isEditing={isEditing} onChange={handleFieldChange} options={gradeLevels} displayValue={fullLead.gradeLevel?.nameRu || fullLead.gradeLevel?.name || '—'} />
                  <FormSelect label="Язык обучения" value={form.studyLanguageId} field="studyLanguageId" isEditing={isEditing} onChange={handleFieldChange} options={languages} displayValue={fullLead.studyLanguage?.nameRu || fullLead.studyLanguage?.name || '—'} />
                  <FormTextarea label="Цель" value={form.goal} field="goal" isEditing={isEditing} onChange={handleFieldChange} displayValue={fullLead.goal || '—'} />
                  <FormSelect label="Область" value={form.regionId} field="regionId" isEditing={isEditing} onChange={handleFieldChange} options={regions} displayValue={fullLead.region?.nameRu || fullLead.region?.name || '—'} />
                  <FormSelect label="Город" value={form.cityId} field="cityId" isEditing={isEditing} onChange={handleFieldChange} options={cities} displayValue={fullLead.city?.nameRu || fullLead.city?.name || '—'} />
                  <FormSelect label="Школа" value={form.schoolId} field="schoolId" isEditing={isEditing} onChange={handleFieldChange} options={schools} displayValue={fullLead.school?.nameRu || fullLead.school?.name || '—'} />
                </div>
              </div>

              {/* Pre-consultation notes */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Заметки до консультации</h4>
                <div className="space-y-2">
                  <FormRow label="Встреча" value={form.meetingAt} field="meetingAt" type="datetime-local" isEditing={isEditing} onChange={handleFieldChange} displayValue={fullLead.meetingAt ? formatDate(fullLead.meetingAt) : '—'} />
                  <div className="flex items-start justify-between py-1.5">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Бонус</span>
                    <span className="text-sm text-gray-900 dark:text-white">{fullLead.bonus || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Deal Amount */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Сумма сделки</h4>
                <div className="space-y-2">
                  <FormRow label="Сумма" value={form.amount} field="amount" isEditing={isEditing} onChange={handleFieldChange} displayValue={fullLead.amount ? formatAmount(fullLead.amount) : '—'} />
                  {fullLead.coordinator && (
                    <div className="flex items-start justify-between py-1.5">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Координатор</span>
                      <span className="text-sm text-gray-900 dark:text-white">{fullLead.coordinator.lastName} {fullLead.coordinator.firstName}</span>
                    </div>
                  )}
                </div>
              </div>


              {/* Lost Reason */}
              {fullLead.stage === 'LOST' && fullLead.lostReason && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Причина отказа</h4>
                  <p className="text-sm text-red-600 dark:text-red-400">{fullLead.lostReason}</p>
                </div>
              )}

              {/* Footer info */}
              <div className="text-xs text-gray-400 dark:text-gray-500 space-y-1 px-1">
                <div>Создано: {formatDate(fullLead.createdAt)}</div>
                <div>Обновлено: {formatDate(fullLead.updatedAt)}</div>
                {fullLead.source && <div>Источник: {fullLead.source}</div>}
                <div>ID: {fullLead.id}</div>
              </div>

              {/* Delete */}
              <div className="pt-2">
                {!confirmDelete ? (
                  <button onClick={() => setConfirmDelete(true)} className="text-sm text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors">
                    Удалить сделку
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-red-600 dark:text-red-400">Вы уверены?</span>
                    <button onClick={handleDelete} disabled={deleting} className="px-3 py-1 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
                      {deleting ? '...' : 'Удалить'}
                    </button>
                    <button onClick={() => setConfirmDelete(false)} className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                      Отмена
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right column - Chat */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden min-h-[500px] lg:h-[calc(100vh-180px)] flex flex-col">
              <div className="flex border-b border-gray-200 dark:border-gray-700 shrink-0">
                <button
                  onClick={() => setMsgTab('whatsapp')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                    msgTab === 'whatsapp'
                      ? 'text-green-600 dark:text-green-400 border-b-2 border-green-500'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  WhatsApp
                </button>
                <button
                  onClick={() => setMsgTab('messenger')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                    msgTab === 'messenger'
                      ? 'text-[#0084FF] border-b-2 border-[#0084FF]'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.2 5.42 3.15 7.2.16.15.26.37.27.6l.05 1.88c.02.62.67 1.03 1.24.78l2.1-.93c.18-.08.38-.1.57-.06.9.25 1.86.38 2.62.38 5.64 0 10-4.13 10-9.7S17.64 2 12 2z" />
                  </svg>
                  Messenger
                </button>
                <button
                  onClick={() => setMsgTab('instagram')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                    msgTab === 'instagram'
                      ? 'text-[#E1306C] border-b-2 border-[#E1306C]'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                  </svg>
                  Instagram
                </button>
              </div>

              <div className="flex-1 overflow-hidden">
                {msgTab === 'whatsapp' && (
                  <CrmWhatsAppChat
                    leadPhone={fullLead.phone}
                    parentPhone={fullLead.parentPhone}
                    leadId={fullLead.id}
                    leadName={`${fullLead.lastName} ${fullLead.firstName}`}
                    leadLanguage={fullLead.language}
                    t={t}
                  />
                )}
                {msgTab === 'messenger' && (
                  <CrmSocialChat
                    platform="MESSENGER"
                    leadId={fullLead.id}
                    leadName={`${fullLead.lastName} ${fullLead.firstName}`}
                    t={t}
                  />
                )}
                {msgTab === 'instagram' && (
                  <CrmSocialChat
                    platform="INSTAGRAM"
                    leadId={fullLead.id}
                    leadName={`${fullLead.lastName} ${fullLead.firstName}`}
                    t={t}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}

// Separate components to prevent re-render issues
function FormRow({ label, value, field, type = 'text', isEditing, onChange, displayValue, hideLabel }: {
  label: string;
  value: string;
  field: string;
  type?: string;
  isEditing: boolean;
  onChange: (field: string, value: string) => void;
  displayValue: React.ReactNode;
  hideLabel?: boolean;
}) {
  return (
    <div className={`flex items-start justify-between py-1.5 ${hideLabel ? '' : ''}`}>
      {!hideLabel && <span className="text-sm text-gray-500 dark:text-gray-400 min-w-[100px] shrink-0">{label}</span>}
      {isEditing ? (
        <input
          type={type}
          value={value}
          onChange={e => onChange(field, e.target.value)}
          className={`${hideLabel ? 'w-full' : 'flex-1 ml-3'} px-2 py-1 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white`}
        />
      ) : (
        <span className={`text-sm text-gray-900 dark:text-white ${hideLabel ? '' : 'text-right'}`}>{displayValue}</span>
      )}
    </div>
  );
}

function FormSelect({ label, value, field, isEditing, onChange, options, displayValue }: {
  label: string;
  value: string;
  field: string;
  isEditing: boolean;
  onChange: (field: string, value: string) => void;
  options: { id: string; name: string; nameRu?: string }[];
  displayValue: string;
}) {
  return (
    <div className="flex items-start justify-between py-1.5">
      <span className="text-sm text-gray-500 dark:text-gray-400 min-w-[100px] shrink-0">{label}</span>
      {isEditing ? (
        <select
          value={value}
          onChange={e => onChange(field, e.target.value)}
          className="flex-1 ml-3 px-2 py-1 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
        >
          <option value="">—</option>
          {options.map(opt => (
            <option key={opt.id} value={opt.id}>{opt.nameRu || opt.name}</option>
          ))}
        </select>
      ) : (
        <span className="text-sm text-gray-900 dark:text-white text-right">{displayValue}</span>
      )}
    </div>
  );
}

function FormTextarea({ label, value, field, isEditing, onChange, displayValue, hideLabel }: {
  label: string;
  value: string;
  field: string;
  isEditing: boolean;
  onChange: (field: string, value: string) => void;
  displayValue: string;
  hideLabel?: boolean;
}) {
  return (
    <div className={`flex items-start justify-between py-1.5 ${hideLabel ? '' : ''}`}>
      {!hideLabel && <span className="text-sm text-gray-500 dark:text-gray-400 min-w-[100px] shrink-0">{label}</span>}
      {isEditing ? (
        <textarea
          value={value}
          onChange={e => onChange(field, e.target.value)}
          rows={2}
          className={`${hideLabel ? 'w-full' : 'flex-1 ml-3'} px-2 py-1 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white resize-none`}
        />
      ) : (
        <span className={`text-sm text-gray-900 dark:text-white ${hideLabel ? '' : 'text-right'}`}>{displayValue}</span>
      )}
    </div>
  );
}
