'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useLanguage } from '../../components/LanguageProvider';
import CrmKanbanBoard from './components/CrmKanbanBoard';
import CrmTableView from './components/CrmTableView';
import CrmLeadSlideOver from './components/CrmLeadSlideOver';
import CrmLeadFormModal from './components/CrmLeadFormModal';
import CrmSettingsModal from './components/CrmSettingsModal';
import { useCrmSocket, type NewLeadEvent } from '@/lib/socket/useSocket';

export interface CrmLead {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  parentName: string | null;
  parentPhone: string | null;
  source: string | null;
  stage: string;
  funnelId: string | null;
  stageId: string | null;
  amount: number | null;
  description: string | null;
  lostReason: string | null;
  language: string | null;
  coordinatorId: string | null;
  coordinator: { firstName: string; lastName: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineStage {
  status: string;
  labelKey: string;
  label?: string; // Direct label (for dynamic stages)
  dotClass: string;
  headerBg: string;
  textClass: string;
  borderClass: string;
  bgClass: string;
  color?: string; // Hex color for inline styles
}

// Color mapping from hex to Tailwind classes (muted colors for better dark mode experience)
const COLOR_MAP: Record<string, { dot: string; header: string; text: string; border: string; bg: string }> = {
  '#FCD34D': { dot: 'bg-amber-400', header: 'bg-amber-50/80 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-400/90', border: 'border-amber-200/60 dark:border-amber-800/40', bg: 'bg-amber-50/50 dark:bg-amber-950/20' },
  '#F59E0B': { dot: 'bg-amber-500', header: 'bg-amber-50/80 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-400/90', border: 'border-amber-200/60 dark:border-amber-800/40', bg: 'bg-amber-50/50 dark:bg-amber-950/20' },
  '#60A5FA': { dot: 'bg-blue-400', header: 'bg-blue-50/80 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-400/90', border: 'border-blue-200/60 dark:border-blue-800/40', bg: 'bg-blue-50/50 dark:bg-blue-950/20' },
  '#3B82F6': { dot: 'bg-blue-500', header: 'bg-blue-50/80 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-400/90', border: 'border-blue-200/60 dark:border-blue-800/40', bg: 'bg-blue-50/50 dark:bg-blue-950/20' },
  '#818CF8': { dot: 'bg-indigo-400', header: 'bg-indigo-50/80 dark:bg-indigo-950/40', text: 'text-indigo-700 dark:text-indigo-400/90', border: 'border-indigo-200/60 dark:border-indigo-800/40', bg: 'bg-indigo-50/50 dark:bg-indigo-950/20' },
  '#6366F1': { dot: 'bg-indigo-500', header: 'bg-indigo-50/80 dark:bg-indigo-950/40', text: 'text-indigo-700 dark:text-indigo-400/90', border: 'border-indigo-200/60 dark:border-indigo-800/40', bg: 'bg-indigo-50/50 dark:bg-indigo-950/20' },
  '#A78BFA': { dot: 'bg-violet-400', header: 'bg-violet-50/80 dark:bg-violet-950/40', text: 'text-violet-700 dark:text-violet-400/90', border: 'border-violet-200/60 dark:border-violet-800/40', bg: 'bg-violet-50/50 dark:bg-violet-950/20' },
  '#8B5CF6': { dot: 'bg-violet-500', header: 'bg-violet-50/80 dark:bg-violet-950/40', text: 'text-violet-700 dark:text-violet-400/90', border: 'border-violet-200/60 dark:border-violet-800/40', bg: 'bg-violet-50/50 dark:bg-violet-950/20' },
  '#F472B6': { dot: 'bg-pink-400', header: 'bg-pink-50/80 dark:bg-pink-950/40', text: 'text-pink-700 dark:text-pink-400/90', border: 'border-pink-200/60 dark:border-pink-800/40', bg: 'bg-pink-50/50 dark:bg-pink-950/20' },
  '#EC4899': { dot: 'bg-pink-500', header: 'bg-pink-50/80 dark:bg-pink-950/40', text: 'text-pink-700 dark:text-pink-400/90', border: 'border-pink-200/60 dark:border-pink-800/40', bg: 'bg-pink-50/50 dark:bg-pink-950/20' },
  '#34D399': { dot: 'bg-emerald-400', header: 'bg-emerald-50/80 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400/90', border: 'border-emerald-200/60 dark:border-emerald-800/40', bg: 'bg-emerald-50/50 dark:bg-emerald-950/20' },
  '#10B981': { dot: 'bg-emerald-500', header: 'bg-emerald-50/80 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400/90', border: 'border-emerald-200/60 dark:border-emerald-800/40', bg: 'bg-emerald-50/50 dark:bg-emerald-950/20' },
  '#22C55E': { dot: 'bg-green-500', header: 'bg-green-50/80 dark:bg-green-950/40', text: 'text-green-700 dark:text-green-400/90', border: 'border-green-200/60 dark:border-green-800/40', bg: 'bg-green-50/50 dark:bg-green-950/20' },
  '#F87171': { dot: 'bg-red-400', header: 'bg-red-50/80 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-400/90', border: 'border-red-200/60 dark:border-red-800/40', bg: 'bg-red-50/50 dark:bg-red-950/20' },
  '#EF4444': { dot: 'bg-red-500', header: 'bg-red-50/80 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-400/90', border: 'border-red-200/60 dark:border-red-800/40', bg: 'bg-red-50/50 dark:bg-red-950/20' },
  '#FB923C': { dot: 'bg-orange-400', header: 'bg-orange-50/80 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-400/90', border: 'border-orange-200/60 dark:border-orange-800/40', bg: 'bg-orange-50/50 dark:bg-orange-950/20' },
  '#F97316': { dot: 'bg-orange-500', header: 'bg-orange-50/80 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-400/90', border: 'border-orange-200/60 dark:border-orange-800/40', bg: 'bg-orange-50/50 dark:bg-orange-950/20' },
  '#A3E635': { dot: 'bg-lime-400', header: 'bg-lime-50/80 dark:bg-lime-950/40', text: 'text-lime-700 dark:text-lime-400/90', border: 'border-lime-200/60 dark:border-lime-800/40', bg: 'bg-lime-50/50 dark:bg-lime-950/20' },
  '#22D3EE': { dot: 'bg-cyan-400', header: 'bg-cyan-50/80 dark:bg-cyan-950/40', text: 'text-cyan-700 dark:text-cyan-400/90', border: 'border-cyan-200/60 dark:border-cyan-800/40', bg: 'bg-cyan-50/50 dark:bg-cyan-950/20' },
  '#FACC15': { dot: 'bg-yellow-400', header: 'bg-yellow-50/80 dark:bg-yellow-950/40', text: 'text-yellow-700 dark:text-yellow-400/90', border: 'border-yellow-200/60 dark:border-yellow-800/40', bg: 'bg-yellow-50/50 dark:bg-yellow-950/20' },
  '#EAB308': { dot: 'bg-yellow-500', header: 'bg-yellow-50/80 dark:bg-yellow-950/40', text: 'text-yellow-700 dark:text-yellow-400/90', border: 'border-yellow-200/60 dark:border-yellow-800/40', bg: 'bg-yellow-50/50 dark:bg-yellow-950/20' },
  '#6B7280': { dot: 'bg-gray-500', header: 'bg-gray-100/80 dark:bg-gray-800/40', text: 'text-gray-700 dark:text-gray-400', border: 'border-gray-200/60 dark:border-gray-700/40', bg: 'bg-gray-50/50 dark:bg-gray-800/20' },
};

// Default colors for fallback
const DEFAULT_COLORS = { dot: 'bg-gray-500', header: 'bg-gray-100/80 dark:bg-gray-800/40', text: 'text-gray-700 dark:text-gray-400', border: 'border-gray-200/60 dark:border-gray-700/40', bg: 'bg-gray-50/50 dark:bg-gray-800/20' };

// Get color classes from hex color
function getColorClasses(hexColor: string) {
  const upperHex = hexColor.toUpperCase();
  return COLOR_MAP[upperHex] || DEFAULT_COLORS;
}

// Fallback static stages (used when no funnels exist) - muted colors for better dark mode
export const PIPELINE_STAGES: PipelineStage[] = [
  { status: 'NEW_APPLICATION', labelKey: 'crm.stageNewApplication', dotClass: 'bg-amber-500', headerBg: 'bg-amber-50/80 dark:bg-amber-950/40', textClass: 'text-amber-700 dark:text-amber-400/90', borderClass: 'border-amber-200/60 dark:border-amber-800/40', bgClass: 'bg-amber-50/50 dark:bg-amber-950/20' },
  { status: 'INITIAL_CONTACT', labelKey: 'crm.stageInitialContact', dotClass: 'bg-blue-500', headerBg: 'bg-blue-50/80 dark:bg-blue-950/40', textClass: 'text-blue-700 dark:text-blue-400/90', borderClass: 'border-blue-200/60 dark:border-blue-800/40', bgClass: 'bg-blue-50/50 dark:bg-blue-950/20' },
  { status: 'DIAGNOSTIC', labelKey: 'crm.stageDiagnostic', dotClass: 'bg-indigo-500', headerBg: 'bg-indigo-50/80 dark:bg-indigo-950/40', textClass: 'text-indigo-700 dark:text-indigo-400/90', borderClass: 'border-indigo-200/60 dark:border-indigo-800/40', bgClass: 'bg-indigo-50/50 dark:bg-indigo-950/20' },
  { status: 'NEGOTIATION', labelKey: 'crm.stageNegotiation', dotClass: 'bg-violet-500', headerBg: 'bg-violet-50/80 dark:bg-violet-950/40', textClass: 'text-violet-700 dark:text-violet-400/90', borderClass: 'border-violet-200/60 dark:border-violet-800/40', bgClass: 'bg-violet-50/50 dark:bg-violet-950/20' },
  { status: 'CONTRACT', labelKey: 'crm.stageContract', dotClass: 'bg-orange-500', headerBg: 'bg-orange-50/80 dark:bg-orange-950/40', textClass: 'text-orange-700 dark:text-orange-400/90', borderClass: 'border-orange-200/60 dark:border-orange-800/40', bgClass: 'bg-orange-50/50 dark:bg-orange-950/20' },
  { status: 'PAYMENT', labelKey: 'crm.stagePayment', dotClass: 'bg-yellow-500', headerBg: 'bg-yellow-50/80 dark:bg-yellow-950/40', textClass: 'text-yellow-700 dark:text-yellow-400/90', borderClass: 'border-yellow-200/60 dark:border-yellow-800/40', bgClass: 'bg-yellow-50/50 dark:bg-yellow-950/20' },
  { status: 'WON', labelKey: 'crm.stageWon', dotClass: 'bg-green-500', headerBg: 'bg-green-50/80 dark:bg-green-950/40', textClass: 'text-green-700 dark:text-green-400/90', borderClass: 'border-green-200/60 dark:border-green-800/40', bgClass: 'bg-green-50/50 dark:bg-green-950/20' },
  { status: 'LOST', labelKey: 'crm.stageLost', dotClass: 'bg-red-500', headerBg: 'bg-red-50/80 dark:bg-red-950/40', textClass: 'text-red-700 dark:text-red-400/90', borderClass: 'border-red-200/60 dark:border-red-800/40', bgClass: 'bg-red-50/50 dark:bg-red-950/20' },
];

interface CrmClientProps {
  initialLeads: CrmLead[];
  initialFunnels?: Funnel[];
  userRole: string;
  userId: string;
  coordinators: { id: string; name: string }[];
}

interface Funnel {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
  stages: {
    id: string;
    name: string;
    color: string;
    order: number;
    isWon: boolean;
    isLost: boolean;
  }[];
}

export default function CrmClient({ initialLeads, initialFunnels, userRole, userId, coordinators }: CrmClientProps) {
  const { t } = useLanguage();

  // Lock body scroll on mount
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);
  const [leads, setLeads] = useState<CrmLead[]>(initialLeads);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [coordinatorFilter, setCoordinatorFilter] = useState('');
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [coordDropdownOpen, setCoordDropdownOpen] = useState(false);
  const coordDropdownRef = useRef<HTMLDivElement>(null);
  const [waUnreadMap, setWaUnreadMap] = useState<Record<string, number>>({});
  const [socialUnreadMap, setSocialUnreadMap] = useState<Record<string, number>>({});

  // Funnels - use initialFunnels to avoid flash
  const [funnels, setFunnels] = useState<Funnel[]>(initialFunnels || []);
  const defaultFunnel = initialFunnels?.find(f => f.isDefault) || initialFunnels?.[0];
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(defaultFunnel?.id || null);
  const [funnelDropdownOpen, setFunnelDropdownOpen] = useState(false);
  const funnelDropdownRef = useRef<HTMLDivElement>(null);

  // Load funnels (skip if already have initialFunnels)
  useEffect(() => {
    if (initialFunnels && initialFunnels.length > 0) return;

    const loadFunnels = async () => {
      try {
        const res = await fetch('/api/crm/funnels');
        if (res.ok) {
          const data = await res.json();
          setFunnels(data);
          // Select default funnel or first one
          const defaultF = data.find((f: Funnel) => f.isDefault) || data[0];
          if (defaultF && !selectedFunnelId) {
            setSelectedFunnelId(defaultF.id);
          }
        }
      } catch (error) {
        console.error('Failed to load funnels:', error);
      }
    };
    loadFunnels();
  }, [initialFunnels]);

  // Close funnel dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (funnelDropdownRef.current && !funnelDropdownRef.current.contains(e.target as Node)) {
        setFunnelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get current funnel and its stages
  const currentFunnel = funnels.find(f => f.id === selectedFunnelId);

  // Convert funnel stages to PipelineStage format
  const dynamicStages: PipelineStage[] = useMemo(() => {
    if (!currentFunnel || currentFunnel.stages.length === 0) {
      return PIPELINE_STAGES; // Fallback to static stages
    }
    return currentFunnel.stages
      .sort((a, b) => a.order - b.order)
      .map(stage => {
        const colors = getColorClasses(stage.color);
        return {
          status: stage.id,
          labelKey: '', // Not used for dynamic stages
          label: stage.name,
          dotClass: colors.dot,
          headerBg: colors.header,
          textClass: colors.text,
          borderClass: colors.border,
          bgClass: colors.bg,
          color: stage.color,
        };
      });
  }, [currentFunnel]);

  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPERADMIN';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (coordDropdownRef.current && !coordDropdownRef.current.contains(e.target as Node)) {
        setCoordDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listen for MarSIP open-lead event (when dialing a number that matches a lead)
  useEffect(() => {
    const handleOpenLead = (e: CustomEvent<{ leadId: string }>) => {
      const { leadId } = e.detail;
      const lead = leads.find(l => l.id === leadId);
      if (lead) {
        setSelectedLead(lead);
        setSlideOverOpen(true);
      }
    };

    window.addEventListener('marsip:open-lead', handleOpenLead as EventListener);
    return () => window.removeEventListener('marsip:open-lead', handleOpenLead as EventListener);
  }, [leads]);

  // Socket.io real-time updates
  const { onNewLead, onNewMessage, onLeadUpdated } = useCrmSocket();

  // Listen for new leads via Socket.io
  useEffect(() => {
    const unsubscribe = onNewLead((lead: NewLeadEvent) => {
      // Check if lead already exists
      setLeads(prev => {
        if (prev.some(l => l.id === lead.id)) return prev;
        // Add new lead at the beginning
        const newLead: CrmLead = {
          id: lead.id,
          firstName: lead.firstName,
          lastName: lead.lastName,
          phone: lead.phone,
          email: null,
          parentName: null,
          parentPhone: null,
          source: lead.source,
          stage: lead.stageId || 'NEW_APPLICATION',
          funnelId: lead.funnelId,
          stageId: lead.stageId,
          amount: null,
          description: null,
          lostReason: null,
          language: null,
          coordinatorId: null,
          coordinator: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return [newLead, ...prev];
      });
    });
    return unsubscribe;
  }, [onNewLead]);

  // Listen for new messages (update unread badge)
  useEffect(() => {
    const unsubscribe = onNewMessage((data: { leadId: string; unreadCount: number }) => {
      setWaUnreadMap(prev => ({
        ...prev,
        [data.leadId]: data.unreadCount,
      }));
    });
    return unsubscribe;
  }, [onNewMessage]);

  // Listen for lead updates
  useEffect(() => {
    const unsubscribe = onLeadUpdated((data) => {
      setLeads(prev => prev.map(l =>
        l.id === data.id
          ? { ...l, stageId: data.stageId, funnelId: data.funnelId, stage: data.stageId || l.stage }
          : l
      ));
    });
    return unsubscribe;
  }, [onLeadUpdated]);

  // Poll leads + WhatsApp + Social unread counts (every 30 seconds as backup)
  useEffect(() => {
    const poll = async () => {
      try {
        const ts = Date.now(); // Cache buster
        const fetchOptions = {
          cache: 'no-store' as const,
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
        };

        const [leadsRes, waRes, socialRes] = await Promise.all([
          fetch(`/api/crm/leads?_t=${ts}`, fetchOptions),
          fetch(`/api/whatsapp/conversations?_t=${ts}`, fetchOptions),
          fetch(`/api/social/conversations?_t=${ts}`, fetchOptions),
        ]);

        if (leadsRes.ok) {
          const freshLeads: CrmLead[] = await leadsRes.json();
          setLeads(freshLeads);
        }

        if (waRes.ok) {
          const convos: { lead?: { id: string } | null; unreadCount: number }[] = await waRes.json();
          const map: Record<string, number> = {};
          for (const c of convos) {
            if (c.lead?.id && c.unreadCount > 0) {
              map[c.lead.id] = c.unreadCount;
            }
          }
          setWaUnreadMap(map);
        }

        if (socialRes.ok) {
          const convos: { lead?: { id: string } | null; unreadCount: number }[] = await socialRes.json();
          const map: Record<string, number> = {};
          for (const c of convos) {
            if (c.lead?.id && c.unreadCount > 0) {
              map[c.lead.id] = (map[c.lead.id] || 0) + c.unreadCount;
            }
          }
          setSocialUnreadMap(map);
        }
      } catch { /* ignore */ }
    };

    // Initial poll immediately
    poll();

    const interval = setInterval(poll, 30000); // Poll every 30 seconds (backup for Socket.io)
    return () => clearInterval(interval);
  }, []);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ru-RU').format(Math.round(amount)) + ' ' + t('payments.tenge');
  };

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const name = `${l.lastName} ${l.firstName}`.toLowerCase();
        const phone = (l.phone || l.parentPhone || '').toLowerCase();
        if (!name.includes(q) && !phone.includes(q)) return false;
      }
      if (coordinatorFilter && l.coordinatorId !== coordinatorFilter) return false;
      return true;
    });
  }, [leads, searchQuery, coordinatorFilter]);

  // Group by stage, leads with unread messages first (WhatsApp + Social)
  const leadsByStage = useMemo(() => {
    const map: Record<string, CrmLead[]> = {};
    for (const stage of dynamicStages) {
      map[stage.status] = [];
    }
    for (const l of filteredLeads) {
      // For dynamic stages, lead.stage contains stage ID; for static - status string
      if (map[l.stage]) {
        map[l.stage].push(l);
      } else if (l.stageId && map[l.stageId]) {
        // Support stageId field for funnel-based leads
        map[l.stageId].push(l);
      }
    }
    // Sort: leads with unread messages first (combine WA + Social)
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => {
        const aUnread = (waUnreadMap[a.id] || 0) + (socialUnreadMap[a.id] || 0);
        const bUnread = (waUnreadMap[b.id] || 0) + (socialUnreadMap[b.id] || 0);
        if (aUnread > 0 && bUnread === 0) return -1;
        if (aUnread === 0 && bUnread > 0) return 1;
        return 0;
      });
    }
    return map;
  }, [filteredLeads, waUnreadMap, socialUnreadMap, dynamicStages]);

  // Stage totals
  const stageTotals = useMemo(() => {
    return dynamicStages.map(stage => {
      const stageLeads = leadsByStage[stage.status] || [];
      return {
        ...stage,
        count: stageLeads.length,
        totalAmount: stageLeads.reduce((sum, l) => sum + (l.amount || 0), 0),
      };
    });
  }, [leadsByStage, dynamicStages]);

  const handleCardClick = useCallback((lead: CrmLead) => {
    setSelectedLead(lead);
    setSlideOverOpen(true);
  }, []);

  const handleStageChange = useCallback(async (leadId: string, _fromStage: string, toStage: string) => {
    // Optimistic update - set both stage and stageId for proper grouping
    const prevLeads = [...leads];
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: toStage, stageId: toStage } : l));

    try {
      const res = await fetch(`/api/crm/leads/${leadId}`, {
        method: 'PATCH',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId: toStage }),
      });
      if (!res.ok) {
        setLeads(prevLeads);
      } else {
        const updated = await res.json();
        setLeads(prev => prev.map(l => l.id === leadId ? updated : l));
      }
    } catch {
      setLeads(prevLeads);
    }
  }, [leads]);

  const handleLeadCreated = useCallback((newLead: CrmLead) => {
    setLeads(prev => [newLead, ...prev]);
    setFormModalOpen(false);
  }, []);

  const handleLeadUpdated = useCallback((updated: CrmLead) => {
    setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
    setSelectedLead(updated);
  }, []);

  const handleLeadDeleted = useCallback((leadId: string) => {
    setLeads(prev => prev.filter(l => l.id !== leadId));
    setSlideOverOpen(false);
    setSelectedLead(null);
  }, []);

  const hasFilters = searchQuery || coordinatorFilter;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden -mt-4 -mx-6">
      {/* ── FILTERS BAR ── */}
      {!slideOverOpen && (
      <div className="flex flex-wrap items-center gap-3 shrink-0 px-6 pt-4">
        {/* Funnel selector */}
        <div className="relative" ref={funnelDropdownRef}>
          <button
            onClick={() => setFunnelDropdownOpen(!funnelDropdownOpen)}
            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {currentFunnel && (
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: currentFunnel.color }}
              />
            )}
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="truncate max-w-[140px]">
              {currentFunnel?.name || t('crm.selectFunnel')}
            </span>
            <svg className={`w-4 h-4 transition-transform ${funnelDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {funnelDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-20 py-1">
              {funnels.length > 0 ? (
                funnels.map(funnel => (
                  <button
                    key={funnel.id}
                    onClick={() => {
                      setSelectedFunnelId(funnel.id);
                      setFunnelDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                      selectedFunnelId === funnel.id
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: funnel.color }}
                    />
                    <span className="flex-1 truncate">{funnel.name}</span>
                    {funnel.isDefault && (
                      <span className="text-xs text-green-600 dark:text-green-400">✓</span>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-center">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    {t('crm.settings.noFunnels')}
                  </div>
                  <button
                    onClick={() => {
                      setFunnelDropdownOpen(false);
                      setSettingsModalOpen(true);
                    }}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {t('crm.settings.createFirstFunnel')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* View mode toggle */}
        <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button
            onClick={() => setViewMode('kanban')}
            title={t('crm.viewKanban')}
            className={`px-2.5 py-2 text-sm font-medium flex items-center transition-colors ${
              viewMode === 'kanban'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('table')}
            title={t('crm.viewTable')}
            className={`px-2.5 py-2 text-sm font-medium flex items-center transition-colors ${
              viewMode === 'table'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-[360px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('crm.searchPlaceholder')}
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Coordinator */}
        {isAdmin && (
          <div className="relative" ref={coordDropdownRef}>
            <button
              onClick={() => setCoordDropdownOpen(!coordDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-w-[160px]"
            >
              <span className="flex-1 text-left truncate">
                {coordinatorFilter
                  ? coordinators.find(c => c.id === coordinatorFilter)?.name || t('crm.allCoordinators')
                  : t('crm.allCoordinators')}
              </span>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${coordDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {coordDropdownOpen && (
              <div className="absolute right-0 mt-1 w-full min-w-[200px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 py-1 max-h-60 overflow-y-auto animate-fade-in">
                <button
                  onClick={() => { setCoordinatorFilter(''); setCoordDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    !coordinatorFilter
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {t('crm.allCoordinators')}
                </button>
                {coordinators.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setCoordinatorFilter(c.id); setCoordDropdownOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      coordinatorFilter === c.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {hasFilters && (
          <button
            onClick={() => { setSearchQuery(''); setCoordinatorFilter(''); }}
            className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Add Lead Button */}
        <button
          onClick={() => setFormModalOpen(true)}
          className="ml-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('crm.addLead')}
        </button>

        {/* Settings Button (Admin only) */}
        {isAdmin && (
          <button
            onClick={() => setSettingsModalOpen(true)}
            className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            title={t('crm.settings.title')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        )}

              </div>
      )}

      {/* ── STAGE SUMMARY ── */}
      {!slideOverOpen && (
      <div className="flex gap-1.5 mt-3 mb-3 shrink-0 overflow-x-auto px-6" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {stageTotals.map(stage => (
          <div key={stage.status} className={`${stage.bgClass} border ${stage.borderClass} rounded-lg px-2.5 py-1.5 flex items-center gap-2`}>
            <div className={`w-1.5 h-1.5 rounded-full ${stage.dotClass}`} />
            <span className={`text-xs ${stage.textClass} truncate max-w-[80px]`}>
              {stage.label || t(stage.labelKey)}
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{stage.count}</span>
            {stage.totalAmount > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">{formatAmount(stage.totalAmount)}</span>
            )}
          </div>
        ))}
      </div>
      )}

      {/* ── MAIN VIEW ── */}
      <div className={`flex-1 min-h-0 ${slideOverOpen ? '' : 'px-6 pb-4'}`}>
      {slideOverOpen && selectedLead ? (
        <CrmLeadSlideOver
          lead={selectedLead}
          isOpen={slideOverOpen}
          onClose={() => { setSlideOverOpen(false); setSelectedLead(null); }}
          onLeadUpdated={handleLeadUpdated}
          onLeadDeleted={handleLeadDeleted}
          formatAmount={formatAmount}
          t={t}
        />
      ) : viewMode === 'kanban' ? (
        <CrmKanbanBoard
          leadsByStage={leadsByStage}
          stages={dynamicStages}
          onStageChange={handleStageChange}
          onCardClick={handleCardClick}
          formatAmount={formatAmount}
          t={t}
          waUnreadMap={waUnreadMap}
          socialUnreadMap={socialUnreadMap}
        />
      ) : (
        <CrmTableView
          leads={filteredLeads}
          stages={dynamicStages}
          onCardClick={handleCardClick}
          formatAmount={formatAmount}
          t={t}
        />
      )}
      </div>

      {/* ── ADD LEAD MODAL ── */}
      {formModalOpen && (
        <CrmLeadFormModal
          isOpen={formModalOpen}
          onClose={() => setFormModalOpen(false)}
          onLeadCreated={handleLeadCreated}
          t={t}
        />
      )}

      {/* ── SETTINGS MODAL ── */}
      <CrmSettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        t={t}
      />

    </div>
  );
}
