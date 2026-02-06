'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import CrmWhatsAppChat from './CrmWhatsAppChat';
import CrmSocialChat from './CrmSocialChat';
import CrmActivityTimeline from './CrmActivityTimeline';
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

interface FormState {
  firstName: string;
  lastName: string;
  phone: string;
  parentName: string;
  parentPhone: string;
  studentName: string;
  studentPhone: string;
  gradeLevelId: string;
  studyLanguageId: string;
  goal: string;
  regionId: string;
  cityId: string;
  schoolId: string;
  meetingAt: string;
  amount: string;
  description: string;
  notes: string;
  language: string;
}

export default function CrmLeadSlideOver({ lead, isOpen, onClose, onLeadUpdated, onLeadDeleted, formatAmount, t }: CrmLeadSlideOverProps) {
  const initials = `${lead.firstName[0] || ''}${lead.lastName[0] || ''}`;
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [callResult, setCallResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [msgTab, setMsgTab] = useState<'whatsapp' | 'messenger' | 'instagram'>('whatsapp');
  const [marsipStatus, setMarsipStatus] = useState<MarSipStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [fullLead, setFullLead] = useState<LeadFull>(lead as LeadFull);

  // Reference data
  const [gradeLevels, setGradeLevels] = useState<RefOption[]>([]);
  const [languages, setLanguages] = useState<RefOption[]>([]);
  const [regions, setRegions] = useState<RefOption[]>([]);
  const [cities, setCities] = useState<RefOption[]>([]);
  const [schools, setSchools] = useState<RefOption[]>([]);

  // Form state
  const [form, setForm] = useState<FormState>({
    firstName: lead.firstName,
    lastName: lead.lastName,
    phone: lead.phone || '',
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
    notes: '',
    language: lead.language || '',
  });

  // Track initial form state to detect changes
  const [initialForm, setInitialForm] = useState<FormState>(form);

  // Check if form has changes
  const hasChanges = useMemo(() => {
    return Object.keys(form).some(key => form[key as keyof FormState] !== initialForm[key as keyof FormState]);
  }, [form, initialForm]);

  // Handle form field change without losing scroll position
  const handleFieldChange = useCallback((field: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  // Scroll to top when lead changes
  useEffect(() => {
    if (isOpen) {
      // Use multiple attempts to ensure scroll resets
      const scrollToTop = () => {
        if (leftColumnRef.current) {
          leftColumnRef.current.scrollTop = 0;
        }
      };
      // Immediate
      scrollToTop();
      // After DOM update
      requestAnimationFrame(scrollToTop);
      // After a short delay (for any animations)
      const timeout = setTimeout(scrollToTop, 50);
      return () => clearTimeout(timeout);
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
          const newForm: FormState = {
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            phone: data.phone || '',
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
            notes: data.notes || '',
            language: data.language || '',
          };
          setForm(newForm);
          setInitialForm(newForm);
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
        // Update initial form to reflect saved state
        setInitialForm(form);
      }
    } catch { /* ignore */ }
    setSaving(false);
  };

  // Discard changes
  const handleDiscard = () => {
    setForm(initialForm);
  };

  if (!isOpen) return null;

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2 shrink-0">
        <div className="flex items-center justify-between">
          {/* Left side - back button, avatar and info */}
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <span className="text-sm font-semibold text-white">{initials}</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-base font-semibold text-gray-900 dark:text-white">
                {fullLead.lastName} {fullLead.firstName}
              </h1>
              {fullLead.stage_rel && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                  {fullLead.stage_rel.name}
                </span>
              )}
              {fullLead.amount && (
                <span className="text-xs font-medium text-green-600 dark:text-green-400">
                  {formatAmount(fullLead.amount)}
                </span>
              )}
            </div>
          </div>

          {/* Right side - actions */}
          <div className="flex items-center gap-2">
            {/* Call button in header */}
            {marsipStatus?.configured && fullLead.phone && (
              <button
                onClick={() => handleCall(fullLead.phone!)}
                className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                title="Позвонить"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </button>
            )}

            {/* Save changes button - only shown when form has changes */}
            {hasChanges && (
              <>
                <button
                  onClick={handleDiscard}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                >
                  {saving ? 'Сохранение...' : 'Сохранить изменения'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Call result notification */}
      {callResult && (
        <div className={`absolute top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg text-xs font-medium z-50 ${
          callResult.type === 'success'
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
        }`}>
          {callResult.message}
        </div>
      )}

      {/* Content */}
      <div key={lead.id} className="flex-1 min-h-0 px-4 pb-4 pt-2 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[28%_1fr_28%] gap-3 h-full">
          {/* Left column - Info (own scroll) */}
          <div ref={leftColumnRef} className="lg:max-h-[calc(100vh-160px)] overflow-y-auto space-y-3 pb-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <style>{`div::-webkit-scrollbar { display: none; }`}</style>
              {/* Contact Info */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Контактная информация</h4>
                <div className="space-y-2">
                  <FormRowEditable
                    label="Основной контакт"
                    value={form.phone}
                    field="phone"
                    onChange={handleFieldChange}
                    onCall={handleCall}
                  />
                  <FormRowEditable label="ФИО родителя" value={form.parentName} field="parentName" onChange={handleFieldChange} />
                  <FormRowEditable
                    label="Телефон родителя"
                    value={form.parentPhone}
                    field="parentPhone"
                    onChange={handleFieldChange}
                    onCall={handleCall}
                  />
                  <FormSelectEditable
                    label="Язык общения"
                    value={form.language}
                    field="language"
                    onChange={handleFieldChange}
                    options={[{ id: "RU", name: "Русский" }, { id: "KZ", name: "Қазақша" }, { id: "EN", name: "English" }]}
                  />
                </div>
              </div>

              {/* Student Profile */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Анкетные данные ученика</h4>
                <div className="space-y-2">
                  <FormRowEditable label="ФИО ученика" value={form.studentName} field="studentName" onChange={handleFieldChange} />
                  <FormRowEditable label="Номер ученика" value={form.studentPhone} field="studentPhone" onChange={handleFieldChange} onCall={handleCall} />
                  <FormSelectEditable label="Класс" value={form.gradeLevelId} field="gradeLevelId" onChange={handleFieldChange} options={gradeLevels} />
                  <FormSelectEditable label="Язык обучения" value={form.studyLanguageId} field="studyLanguageId" onChange={handleFieldChange} options={languages} />
                  <FormSelectEditable label="Цель" value={form.goal} field="goal" onChange={handleFieldChange} options={[
                    { id: "Подтянуть знания", name: "Подтянуть знания" },
                    { id: "Диагностика знаний", name: "Диагностика знаний" },
                    { id: "Подготовка к спецшколам", name: "Подготовка к спецшколам" },
                    { id: "Подготовка к ЕНТ", name: "Подготовка к ЕНТ" },
                    { id: "Продленка", name: "Продленка" },
                    { id: "Олимпиада", name: "Олимпиада" },
                    { id: "Другое", name: "Другое" },
                  ]} />
                  <FormSelectEditable label="Область" value={form.regionId} field="regionId" onChange={handleFieldChange} options={regions} />
                  <FormSelectEditable label="Город" value={form.cityId} field="cityId" onChange={handleFieldChange} options={cities} />
                  <FormSelectEditable label="Школа" value={form.schoolId} field="schoolId" onChange={handleFieldChange} options={schools} />
                </div>
              </div>

              {/* Pre-consultation notes */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Заметки до консультации</h4>
                <div className="space-y-2">
                  <FormRowEditable label="Встреча" value={form.meetingAt} field="meetingAt" type="datetime-local" onChange={handleFieldChange} />
                  <div className="flex items-start justify-between py-1.5">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Бонус</span>
                    <span className={`text-sm ${fullLead.bonus ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>{fullLead.bonus || 'Бонусов не имеется'}</span>
                  </div>
                </div>
              </div>

              {/* Deal Amount */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Сумма сделки</h4>
                <div className="space-y-2">
                  <FormRowEditable label="Сумма" value={form.amount} field="amount" onChange={handleFieldChange} />
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

          {/* Middle column - Chat */}
          <div className="flex flex-col lg:max-h-[calc(100vh-160px)]">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden h-full flex flex-col">
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

              <div className="flex-1 overflow-hidden h-full">
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

          {/* Right column - Notes & Activities */}
          <div className="lg:max-h-[calc(100vh-160px)] overflow-y-auto pb-4" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            <CrmActivityTimeline
              leadId={lead.id}
              onMeetingChange={(date) => handleFieldChange("meetingAt", date)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Always-editable form row with inline input
function FormRowEditable({ label, value, field, type = 'text', placeholder, onChange, onCall }: {
  label: string;
  value: string;
  field: string;
  type?: string;
  placeholder?: string;
  onChange: (field: string, value: string) => void;
  onCall?: (phone: string) => void;
}) {
  const isPhone = field === 'phone' || field === 'parentPhone' || field === 'studentPhone';
  const isAmount = field === 'amount';
  const isDateTime = type === 'datetime-local';
  const inputRef = useRef<HTMLInputElement>(null);

  // Format number with spaces as thousand separators
  const formatAmount = (val: string) => {
    const num = val.replace(/\s/g, '').replace(/[^\d]/g, '');
    if (!num) return '';
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  // Format phone: just digits with spaces
  const formatPhone = (val: string) => {
    let digits = (val || "").replace(/[^\d]/g, "");
    if (digits.length === 11 && (digits[0] === "8" || digits[0] === "7")) {
      digits = digits.slice(1);
    }
    if (digits.length === 0) return "";
    // Format: XXX XXX XX XX
    let result = "";
    if (digits.length > 0) result += digits.slice(0, 3);
    if (digits.length > 3) result += " " + digits.slice(3, 6);
    if (digits.length > 6) result += " " + digits.slice(6, 8);
    if (digits.length > 8) result += " " + digits.slice(8, 10);
    return result;
  };

  // Handle phone input
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let digits = e.target.value.replace(/[^\d]/g, "");
    // Handle paste with country code
    if (digits.length === 11 && (digits[0] === "8" || digits[0] === "7")) {
      digits = digits.slice(1);
    }
    onChange(field, digits.slice(0, 10));
  };
  // Handle amount input - strip spaces for storage
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\s/g, '');
    onChange(field, rawValue);
  };

  // Default placeholders based on field type
  const getPlaceholder = () => {
    if (placeholder) return placeholder;
    if (isPhone) return '000 000 00 00';
    if (field === 'parentName' || field === 'studentName') return 'Введите ФИО';
    if (isAmount) return '0 ₸';
    return 'Не указано';
  };

  // Format datetime for display
  const formatDateTimeDisplay = (val: string) => {
    if (!val) return '';
    try {
      const date = new Date(val);
      return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return val;
    }
  };

  if (isDateTime) {
    return (
      <div className="flex items-center justify-between py-1.5 gap-2">
        <span className="text-sm text-gray-500 dark:text-gray-400 min-w-[100px] shrink-0">{label}</span>
        <div className="flex items-center gap-1.5 flex-1 justify-end">
          <input
            ref={inputRef}
            type="datetime-local"
            value={value}
            onChange={e => onChange(field, e.target.value)}
            className="sr-only"
          />
          <span
            onClick={() => inputRef.current?.showPicker()}
            className={`text-sm cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 ${value ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}
          >
            {value ? formatDateTimeDisplay(value) : 'Выбрать дату'}
          </span>
          <button
            type="button"
            onClick={() => inputRef.current?.showPicker()}
            className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Get display value
  const getDisplayValue = () => {
    if (isAmount) return formatAmount(value);
    if (isPhone) return formatPhone(value);
    return value;
  };

  // Get change handler
  const getChangeHandler = () => {
    if (isAmount) return handleAmountChange;
    if (isPhone) return handlePhoneChange;
    return (e: React.ChangeEvent<HTMLInputElement>) => onChange(field, e.target.value);
  };
  return (
    <div className="flex items-center justify-between py-1.5 gap-2">
      <span className="text-sm text-gray-500 dark:text-gray-400 min-w-[100px] shrink-0">{label}</span>
      <div className="flex items-center gap-2">
        {isPhone ? (
          <>
            <div className="flex items-center">
              <span className="text-sm text-gray-900 dark:text-white">+7</span>
              <input
                type={type}
                ref={inputRef}
                value={getDisplayValue()}
                onChange={getChangeHandler()}
                placeholder={getPlaceholder()}
                className="w-[115px] px-1 py-1 text-sm bg-transparent border-0 text-gray-900 dark:text-white focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>
            {onCall && (
              <button
                onClick={() => value && onCall(value)}
                disabled={!value}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-white bg-green-500 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm whitespace-nowrap"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Позвонить
              </button>
            )}
          </>
        ) : (
          <input
            type={type}
            value={getDisplayValue()}
            onChange={getChangeHandler()}
            placeholder={getPlaceholder()}
            className="flex-1 min-w-0 px-2 py-1 text-sm bg-transparent border-0 text-gray-900 dark:text-white text-right focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
        )}
      </div>
    </div>
  );
}
// Custom dropdown select with styled menu
function FormSelectEditable({ label, value, field, onChange, options }: {
  label: string;
  value: string;
  field: string;
  onChange: (field: string, value: string) => void;
  options: { id: string; name: string; nameRu?: string }[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedLabel = options.find(o => o.id === value)?.nameRu || options.find(o => o.id === value)?.name || 'Выбрать';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (optId: string) => {
    onChange(field, optId);
    setIsOpen(false);
  };

  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-500 dark:text-gray-400 min-w-[100px] shrink-0">{label}</span>
      <div ref={dropdownRef} className="relative ml-3">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 cursor-pointer text-sm text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
        >
          <span className={!value ? 'text-gray-400 dark:text-gray-500' : ''}>{selectedLabel}</span>
          <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isOpen && (
          <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] max-h-[240px] overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg py-1">
            <button
              type="button"
              onClick={() => handleSelect('')}
              className={`w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${!value ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-400 dark:text-gray-500'}`}
            >
              Не выбрано
            </button>
            {options.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelect(opt.id)}
                className={`w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${value === opt.id ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-700 dark:text-gray-300'}`}
              >
                {opt.nameRu || opt.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Always-editable textarea
function FormTextareaEditable({ label, value, field, onChange }: {
  label: string;
  value: string;
  field: string;
  onChange: (field: string, value: string) => void;
}) {
  return (
    <div className="flex items-start justify-between py-1.5">
      <span className="text-sm text-gray-500 dark:text-gray-400 min-w-[100px] shrink-0">{label}</span>
      <textarea
        value={value}
        onChange={e => onChange(field, e.target.value)}
        rows={2}
        placeholder="—"
        className="flex-1 ml-3 px-2 py-1 text-sm bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-500 dark:hover:border-gray-600 dark:focus:border-blue-400 rounded-lg text-gray-900 dark:text-white focus:outline-none transition-colors resize-none"
      />
    </div>
  );
}
