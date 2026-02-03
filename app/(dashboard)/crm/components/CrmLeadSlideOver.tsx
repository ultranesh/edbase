'use client';

import { useState } from 'react';
import SlideOver from '../../components/SlideOver';
import CrmWhatsAppChat from './CrmWhatsAppChat';
import CrmSocialChat from './CrmSocialChat';
import type { CrmLead } from '../CrmClient';
import { PIPELINE_STAGES } from '../CrmClient';

interface CrmLeadSlideOverProps {
  lead: CrmLead;
  isOpen: boolean;
  onClose: () => void;
  onLeadUpdated: (lead: CrmLead) => void;
  onLeadDeleted: (leadId: string) => void;
  formatAmount: (amount: number) => string;
  t: (key: string) => string;
}

export default function CrmLeadSlideOver({ lead, isOpen, onClose, onLeadUpdated, onLeadDeleted, formatAmount, t }: CrmLeadSlideOverProps) {
  const stage = PIPELINE_STAGES.find(s => s.status === lead.stage);
  const initials = `${lead.firstName[0] || ''}${lead.lastName[0] || ''}`;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [callResult, setCallResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [msgTab, setMsgTab] = useState<'whatsapp' | 'messenger' | 'instagram'>('whatsapp');

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleStageChange = async (newStage: string) => {
    try {
      const res = await fetch(`/api/crm/leads/${lead.id}`, {
        method: 'PATCH',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId: newStage }),
      });
      if (res.ok) {
        const updated = await res.json();
        onLeadUpdated(updated);
      }
    } catch { /* ignore */ }
  };

  const handleCall = (phone: string) => {
    // Dispatch custom event to open MarSIP widget and initiate call
    const event = new CustomEvent('marsip:call', {
      detail: { phone, leadId: lead.id }
    });
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

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{title}</h4>
      {children}
    </div>
  );

  const Row = ({ label, value }: { label: string; value: string | React.ReactNode }) => (
    <div className="flex items-start justify-between py-1.5">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-white text-right max-w-[60%]">{value}</span>
    </div>
  );

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title={t('crm.leadDetails')}
    >
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
            <span className="text-lg font-medium text-blue-600 dark:text-blue-400">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {lead.lastName} {lead.firstName}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              {stage && (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${stage.headerBg} ${stage.textClass}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${stage.dotClass}`} />
                  {t(stage.labelKey)}
                </span>
              )}
              {/* Language dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowLangDropdown(!showLangDropdown)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    lead.language
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                  {lead.language || t('crm.language')}
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showLangDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowLangDropdown(false)} />
                    <div className="absolute left-0 top-full mt-1 z-20 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg py-1 min-w-[180px]">
                      <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold">{t('crm.language')}</p>
                      {[
                        { code: 'KZ', label: 'Қазақша' },
                        { code: 'RU', label: 'Русский' },
                        { code: 'EN', label: 'English' },
                      ].map(lang => (
                        <button
                          key={lang.code}
                          onClick={async () => {
                            const newLang = lead.language === lang.code ? null : lang.code;
                            setShowLangDropdown(false);
                            try {
                              const res = await fetch(`/api/crm/leads/${lead.id}`, {
                                method: 'PATCH',
                                cache: 'no-store',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ language: newLang || '' }),
                              });
                              if (res.ok) {
                                const updated = await res.json();
                                onLeadUpdated(updated);
                              }
                            } catch { /* ignore */ }
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                            lead.language === lang.code
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            lead.language === lang.code
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                          }`}>{lang.code[0]}</span>
                          <span className="font-medium">{lang.label}</span>
                          {lead.language === lang.code && (
                            <svg className="w-4 h-4 ml-auto text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline Stage Selector */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('crm.stageChanged').split(' ')[0] || 'Stage'}</h4>
          <div className="flex flex-wrap gap-2">
            {PIPELINE_STAGES.map(s => (
              <button
                key={s.status}
                onClick={() => s.status !== lead.stage && handleStageChange(s.status)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  s.status === lead.stage
                    ? `${s.headerBg} ${s.textClass} ring-2 ring-offset-1 ring-current`
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${s.status === lead.stage ? s.dotClass : 'bg-gray-400'}`} />
                {t(s.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Call result notification */}
        {callResult && (
          <div className={`px-4 py-2.5 rounded-xl text-sm font-medium animate-fade-in ${
            callResult.type === 'success'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
          }`}>
            {callResult.message}
          </div>
        )}

        {/* Contact Info */}
        <Section title={t('crm.contactInfo')}>
          <Row label={t('crm.phone')} value={
            lead.phone ? (
              <span className="flex items-center gap-2">
                <span>{lead.phone}</span>
                <button
                  onClick={() => handleCall(lead.phone!)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/40 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {t('crm.call') || 'Позвонить'}
                </button>
              </span>
            ) : '—'
          } />
          <Row label={t('crm.email')} value={lead.email || '—'} />
          <Row label={t('crm.parentName')} value={lead.parentName || '—'} />
          <Row label={t('crm.parentPhone')} value={
            lead.parentPhone ? (
              <span className="flex items-center gap-2">
                <span>{lead.parentPhone}</span>
                <button
                  onClick={() => handleCall(lead.parentPhone!)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/40 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {t('crm.call') || 'Позвонить'}
                </button>
              </span>
            ) : '—'
          } />
        </Section>

        {/* Deal Info */}
        <Section title={t('crm.amount')}>
          <Row label={t('crm.amount')} value={lead.amount ? formatAmount(lead.amount) : '—'} />
          <Row label={t('crm.source')} value={lead.source || '—'} />
          {lead.coordinator && (
            <Row label={t('crm.allCoordinators').replace('Все ', '').replace('All ', '').replace('Барлық ', '') || 'Coordinator'} value={`${lead.coordinator.lastName} ${lead.coordinator.firstName}`} />
          )}
        </Section>

        {/* Messaging Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setMsgTab('whatsapp')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${
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
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${
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
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${
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

          {/* Tab content */}
          {msgTab === 'whatsapp' && (
            <CrmWhatsAppChat
              leadPhone={lead.phone}
              parentPhone={lead.parentPhone}
              leadId={lead.id}
              leadName={`${lead.lastName} ${lead.firstName}`}
              leadLanguage={lead.language}
              t={t}
            />
          )}
          {msgTab === 'messenger' && (
            <CrmSocialChat
              platform="MESSENGER"
              leadId={lead.id}
              leadName={`${lead.lastName} ${lead.firstName}`}
              t={t}
            />
          )}
          {msgTab === 'instagram' && (
            <CrmSocialChat
              platform="INSTAGRAM"
              leadId={lead.id}
              leadName={`${lead.lastName} ${lead.firstName}`}
              t={t}
            />
          )}
        </div>

        {/* Lost Reason */}
        {lead.stage === 'LOST' && lead.lostReason && (
          <Section title={t('crm.lostReason')}>
            <p className="text-sm text-red-600 dark:text-red-400">{lead.lostReason}</p>
          </Section>
        )}

        {/* Dates + Source */}
        <div className="space-y-1.5 text-xs text-gray-400 dark:text-gray-500 pt-2">
          <div className="flex items-center justify-between">
            <span>{t('crm.created')}: {formatDate(lead.createdAt)}</span>
            <span>{t('crm.updated')}: {formatDate(lead.updatedAt)}</span>
          </div>
          {(lead.source || lead.coordinator) && (
            <div className="flex items-center gap-1.5">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                {lead.source
                  ? (() => {
                      const platforms = ['Instagram', 'WhatsApp', 'Facebook'];
                      const s = lead.source;
                      if (platforms.includes(s)) return `Входящий ${s}`;
                      if (s === 'Звонок') return 'Входящий звонок';
                      return s;
                    })()
                  : lead.coordinator
                    ? `${lead.coordinator.lastName} ${lead.coordinator.firstName}`
                    : ''}
              </span>
            </div>
          )}
        </div>

        {/* Delete */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-sm text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
            >
              {t('crm.deleteLead')}
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-red-600 dark:text-red-400">{t('crm.deleteConfirm')}</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-1 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? '...' : t('crm.deleteLead')}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {t('common.cancel')}
              </button>
            </div>
          )}
        </div>
      </div>
    </SlideOver>
  );
}
