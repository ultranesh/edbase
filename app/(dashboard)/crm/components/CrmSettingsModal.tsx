'use client';

import { useState } from 'react';
import MarSipSettings from './MarSipSettings';
import FunnelSettings from './FunnelSettings';

interface CrmSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  t: (key: string) => string;
}

type WidgetId = 'funnels' | 'marsip' | 'sipuni' | 'general';

interface Widget {
  id: WidgetId;
  labelKey: string;
  icon: React.ReactNode;
  description: string;
  category: 'settings' | 'integrations';
}

const WIDGETS: Widget[] = [
  {
    id: 'funnels',
    labelKey: 'crm.settings.funnels',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    description: 'Воронки и этапы продаж',
    category: 'settings',
  },
  {
    id: 'marsip',
    labelKey: 'crm.settings.marsip',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    ),
    description: 'SIP-телефония Tele2/Altel',
    category: 'integrations',
  },
];

export default function CrmSettingsModal({ isOpen, onClose, t }: CrmSettingsModalProps) {
  const [activeWidget, setActiveWidget] = useState<WidgetId>('funnels');

  if (!isOpen) return null;

  const renderWidgetContent = () => {
    switch (activeWidget) {
      case 'funnels':
        return <FunnelSettings t={t} />;
      case 'marsip':
        return <MarSipSettings t={t} />;
      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            {t('crm.settings.selectWidget')}
          </div>
        );
    }
  };

  const settingsWidgets = WIDGETS.filter(w => w.category === 'settings');
  const integrationWidgets = WIDGETS.filter(w => w.category === 'integrations');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-[95vw] h-[90vh] max-w-6xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-gray-50 dark:bg-gray-800/50 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          {/* Header */}
          <div className="h-[65px] px-4 flex items-center border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {t('crm.settings.title')}
            </h2>
          </div>

          {/* Widget list */}
          <div className="flex-1 overflow-y-auto p-2">
            {/* Settings section */}
            {settingsWidgets.length > 0 && (
              <>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 py-2 uppercase tracking-wider">
                  {t('crm.settings.settingsSection')}
                </div>
                {settingsWidgets.map((widget) => (
                  <button
                    key={widget.id}
                    onClick={() => setActiveWidget(widget.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      activeWidget === widget.id
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <div className={`${activeWidget === widget.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {widget.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{t(widget.labelKey)}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{widget.description}</div>
                    </div>
                  </button>
                ))}
              </>
            )}

            {/* Integrations section */}
            {integrationWidgets.length > 0 && (
              <>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 py-2 mt-4 uppercase tracking-wider">
                  {t('crm.settings.integrations')}
                </div>
                {integrationWidgets.map((widget) => (
                  <button
                    key={widget.id}
                    onClick={() => setActiveWidget(widget.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      activeWidget === widget.id
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <div className={`${activeWidget === widget.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {widget.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{t(widget.labelKey)}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{widget.description}</div>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 flex flex-col">
          {/* Header with close button */}
          <div className="h-[65px] flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t(WIDGETS.find(w => w.id === activeWidget)?.labelKey || 'crm.settings.title')}
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Widget content */}
          <div className="flex-1 overflow-y-auto p-6">
            {renderWidgetContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
