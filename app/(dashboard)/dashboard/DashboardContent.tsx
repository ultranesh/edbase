'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useLanguage } from '../../components/LanguageProvider';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface DashboardContentProps {
  firstName: string;
  role: string;
}

type WidgetSize = 'small' | 'medium' | 'large';

interface WidgetConfig {
  id: string;
  size: WidgetSize;
}

const WIDGET_DIMS: Record<WidgetSize, { w: number; h: number }> = {
  small: { w: 1, h: 1 },
  medium: { w: 2, h: 1 },
  large: { w: 2, h: 2 },
};

interface WidgetLayout {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

function computeLayout(widgets: WidgetConfig[], cols: number): WidgetLayout[] {
  const grid: boolean[][] = [];

  const ensureRows = (upTo: number) => {
    while (grid.length <= upTo) {
      grid.push(new Array(cols).fill(false));
    }
  };

  const fits = (x: number, y: number, w: number, h: number): boolean => {
    if (x + w > cols) return false;
    ensureRows(y + h - 1);
    for (let row = y; row < y + h; row++) {
      for (let col = x; col < x + w; col++) {
        if (grid[row][col]) return false;
      }
    }
    return true;
  };

  const place = (x: number, y: number, w: number, h: number) => {
    ensureRows(y + h - 1);
    for (let row = y; row < y + h; row++) {
      for (let col = x; col < x + w; col++) {
        grid[row][col] = true;
      }
    }
  };

  return widgets.map((widget) => {
    const { w, h } = WIDGET_DIMS[widget.size];
    for (let row = 0; ; row++) {
      ensureRows(row);
      for (let col = 0; col <= cols - w; col++) {
        if (fits(col, row, w, h)) {
          place(col, row, w, h);
          return { id: widget.id, x: col, y: row, w, h };
        }
      }
    }
  });
}

interface SortableWidgetProps {
  id: string;
  size: WidgetSize;
  gridPos: { x: number; y: number; w: number; h: number };
  children: React.ReactNode;
  isReorderMode: boolean;
  isEditMode: boolean;
  onResize: (id: string, size: WidgetSize) => void;
}

function SortableWidget({ id, size, gridPos, children, isReorderMode, isEditMode, onResize }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isReorderMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
    gridColumn: `${gridPos.x + 1} / span ${gridPos.w}`,
    gridRow: `${gridPos.y + 1} / span ${gridPos.h}`,
  };

  const sizes: WidgetSize[] = ['small', 'medium', 'large'];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative"
    >
      {isReorderMode && (
        <div
          className="absolute inset-0 z-10 cursor-grab active:cursor-grabbing rounded-2xl border-2 border-dashed border-blue-400 bg-blue-500/10"
          {...attributes}
          {...listeners}
        >
          <div className="absolute top-2 left-2 p-1 bg-blue-500 rounded-md text-white">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </div>
        </div>
      )}
      {isEditMode && (
        <div className="absolute -top-1 -right-1 z-20 flex gap-0.5 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 p-0.5">
          {sizes.map((s) => (
            <button
              key={s}
              onClick={() => onResize(id, s)}
              className={`p-1 rounded transition-colors ${
                size === s
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title={s === 'small' ? 'S' : s === 'medium' ? 'M' : 'L'}
            >
              {s === 'small' && (
                <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="6" y="6" width="4" height="4" rx="0.5" />
                </svg>
              )}
              {s === 'medium' && (
                <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="3" y="6" width="10" height="4" rx="0.5" />
                </svg>
              )}
              {s === 'large' && (
                <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="3" y="3" width="10" height="10" rx="0.5" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
      <div className="h-full">{children}</div>
    </div>
  );
}

export default function DashboardContent({ firstName, role }: DashboardContentProps) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(100);
  const [columns, setColumns] = useState(8);

  const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(role);
  const isCoordinator = role === 'COORDINATOR';
  const isTeacher = role === 'TEACHER';

  const getDefaultWidgets = (): WidgetConfig[] => {
    const widgets: WidgetConfig[] = [];

    if (isAdmin) {
      widgets.push({ id: 'students', size: 'small' });
      widgets.push({ id: 'teachers', size: 'small' });
      widgets.push({ id: 'groups', size: 'small' });
      widgets.push({ id: 'contracts', size: 'small' });
      widgets.push({ id: 'revenue', size: 'large' });
      widgets.push({ id: 'payments', size: 'medium' });
      widgets.push({ id: 'overduePayments', size: 'medium' });
      widgets.push({ id: 'monthlyCashflow', size: 'large' });
      widgets.push({ id: 'enrollmentFunnel', size: 'medium' });
      widgets.push({ id: 'studentStatusBreakdown', size: 'medium' });
      widgets.push({ id: 'groupOccupancy', size: 'medium' });
      widgets.push({ id: 'expiringContracts', size: 'medium' });
      widgets.push({ id: 'todaySchedule', size: 'medium' });
      widgets.push({ id: 'teacherWorkload', size: 'medium' });
      widgets.push({ id: 'branchComparison', size: 'large' });
      widgets.push({ id: 'recentActivity', size: 'large' });
      widgets.push({ id: 'quickActions', size: 'small' });
    }

    if (isCoordinator) {
      widgets.push({ id: 'myGroups', size: 'medium' });
      widgets.push({ id: 'unassignedStudents', size: 'small' });
      widgets.push({ id: 'contractAlerts', size: 'small' });
      widgets.push({ id: 'pendingApprovals', size: 'medium' });
      widgets.push({ id: 'todayLessons', size: 'medium' });
      widgets.push({ id: 'studentAttendance', size: 'medium' });
      widgets.push({ id: 'homeworkStatus', size: 'medium' });
      widgets.push({ id: 'weekSchedule', size: 'large' });
      widgets.push({ id: 'groupPerformance', size: 'large' });
      widgets.push({ id: 'teacherAvailability', size: 'medium' });
      widgets.push({ id: 'recentEnrollments', size: 'medium' });
    }

    if (isTeacher) {
      widgets.push({ id: 'nextLesson', size: 'small' });
      widgets.push({ id: 'myStudents', size: 'small' });
      widgets.push({ id: 'homeworkCompletion', size: 'small' });
      widgets.push({ id: 'myTestsCreated', size: 'small' });
      widgets.push({ id: 'todaySchedule', size: 'large' });
      widgets.push({ id: 'myGroups', size: 'medium' });
      widgets.push({ id: 'pendingHomework', size: 'medium' });
      widgets.push({ id: 'upcomingTests', size: 'medium' });
      widgets.push({ id: 'lessonsProgress', size: 'medium' });
      widgets.push({ id: 'recentTestResults', size: 'large' });
      widgets.push({ id: 'studentPerformance', size: 'large' });
    }

    widgets.push({ id: 'notifications', size: 'medium' });
    widgets.push({ id: 'events', size: 'medium' });

    return widgets;
  };

  const [widgets, setWidgets] = useState<WidgetConfig[]>(getDefaultWidgets);

  useEffect(() => {
    const storageKey = `dashboard_widgets_v4_${role}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as WidgetConfig[];
        const defaultWidgets = getDefaultWidgets();
        if (parsed.every(p => defaultWidgets.some(d => d.id === p.id)) &&
            defaultWidgets.every(d => parsed.some(p => p.id === d.id))) {
          setWidgets(parsed);
        }
      } catch { /* ignore */ }
    }
    setMounted(true);
  }, [role]);

  useEffect(() => {
    const gridEl = gridRef.current;
    if (!gridEl) return;

    const updateCellSize = () => {
      const width = gridEl.clientWidth;
      const cols = window.innerWidth >= 768 ? 8 : 4;
      const gap = 8; // gap-2 = 0.5rem = 8px
      const size = (width - (cols - 1) * gap) / cols;
      setCellSize(size);
      setColumns(cols);
    };

    updateCellSize();
    const observer = new ResizeObserver(updateCellSize);
    observer.observe(gridEl);

    return () => observer.disconnect();
  }, [mounted]);

  const saveWidgets = (newWidgets: WidgetConfig[]) => {
    setWidgets(newWidgets);
    localStorage.setItem(`dashboard_widgets_v4_${role}`, JSON.stringify(newWidgets));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = widgets.findIndex(w => w.id === active.id);
      const newIndex = widgets.findIndex(w => w.id === over.id);
      const newWidgets = arrayMove(widgets, oldIndex, newIndex);
      saveWidgets(newWidgets);
    }
  };

  const layout = useMemo(() => computeLayout(widgets, columns), [widgets, columns]);

  const handleResize = (id: string, size: WidgetSize) => {
    const newWidgets = widgets.map(w => w.id === id ? { ...w, size } : w);
    saveWidgets(newWidgets);
  };

  const renderWidgetContent = (id: string, size: WidgetSize) => {
    const isSmall = size === 'small';
    const isLarge = size === 'large';
    const C = 94.25; // circle circumference for progress rings

    // Translation helper: t() returns the key itself when missing, so || fallback never triggers
    const tl = (key: string, fallback: string) => { const r = t(key); return r === key ? fallback : r; };

    // ─── Helper: stat widget (single number + icon) ─────────────────
    const statWidget = (icon: React.ReactNode, label: string, color: string, barColor: string, value: string, trend: string, bars: number[] = [40, 65, 45, 80, 55, 70, 50, 75, 60, 85, 45, 90]) => (
      <div className="h-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden flex flex-col">
        {isSmall ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-1.5 p-2">
            <div className={`w-9 h-9 ${color} rounded-xl flex items-center justify-center`}>
              {icon}
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white leading-none">{value}</span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 text-center leading-tight truncate w-full">{label}</span>
          </div>
        ) : isLarge ? (
          <div className="flex-1 flex flex-col p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center shrink-0`}>
                {icon}
              </div>
              <div className="min-w-0">
                <span className="text-sm text-gray-500 dark:text-gray-400 truncate block">{label}</span>
                <p className="text-4xl font-bold text-gray-900 dark:text-white leading-tight">{value}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400 dark:text-gray-500">за 12 мес</span>
              <span className={`text-xs font-semibold ${trend.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>{trend}</span>
            </div>
            <div className="flex-1 flex items-end gap-1">
              {bars.map((h, i) => (
                <div key={i} className={`flex-1 ${barColor} rounded-sm`} style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col p-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center shrink-0`}>
                {icon}
              </div>
              <div className="min-w-0">
                <span className="text-sm text-gray-500 dark:text-gray-400 truncate block">{label}</span>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-bold text-gray-900 dark:text-white leading-tight">{value}</p>
                  <span className={`text-sm font-semibold ${trend.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>{trend}</span>
                </div>
              </div>
            </div>
            <div className="flex-1 flex items-end gap-0.5 mt-1">
              {bars.slice(0, 10).map((h, i) => (
                <div key={i} className={`flex-1 ${barColor} rounded-sm`} style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        )}
      </div>
    );

    // ─── Helper: info widget (feed/list with items) ─────────────────
    const infoWidget = (title: string, icon: React.ReactNode, items: { text: string; sub: string; dot?: string }[]) => (
      <div className="h-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden flex flex-col">
        {isSmall ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-1.5 p-2">
            <div className="relative">
              <div className="w-8 h-8 text-gray-400 dark:text-gray-500">{icon}</div>
              {items.length > 0 && <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center"><span className="text-[8px] font-bold text-white">{items.length}</span></div>}
            </div>
            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 text-center leading-tight truncate w-full">{title}</span>
          </div>
        ) : isLarge ? (
          <div className="flex-1 flex flex-col p-5">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">{title}</h3>
            <div className="flex-1 flex flex-col gap-2 overflow-hidden">
              {items.map((item, i) => (
                <div key={i} className="flex-1 flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl min-h-0">
                  <div className={`w-2.5 h-2.5 ${item.dot || 'bg-blue-400'} rounded-full shrink-0`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{item.text}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col p-4">
            <h3 className="text-xs font-semibold text-gray-900 dark:text-white mb-1.5">{title}</h3>
            <div className="flex-1 flex flex-col gap-1.5 overflow-hidden">
              {items.slice(0, 3).map((item, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 ${item.dot || 'bg-blue-400'} rounded-full shrink-0`} />
                  <span className="text-[11px] text-gray-600 dark:text-gray-300 truncate">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );

    // ─── Helper: chart widget (bar chart) ───────────────────────────
    const chartWidget = (title: string, icon: React.ReactNode, color: string, barColor: string, value: string, trend: string, bars: number[] = [35, 55, 40, 70, 45, 65, 50, 80, 55, 75, 60, 85]) => (
      <div className="h-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden flex flex-col">
        {isSmall ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-1.5 p-2">
            <div className={`w-9 h-9 ${color} rounded-xl flex items-center justify-center`}>
              {icon}
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white leading-none">{value}</span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 text-center leading-tight truncate w-full">{title}</span>
          </div>
        ) : isLarge ? (
          <div className="flex-1 flex flex-col p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 ${color} rounded-2xl flex items-center justify-center shrink-0`}>
                  {icon}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white leading-tight">{value}</p>
                </div>
              </div>
              <span className={`text-xs font-semibold ${trend.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>{trend}</span>
            </div>
            <div className="flex-1 flex items-end gap-1">
              {bars.map((h, i) => (
                <div key={i} className={`flex-1 ${barColor} rounded-sm`} style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-gray-400">Янв</span>
              <span className="text-[10px] text-gray-400">Дек</span>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center shrink-0`}>
                {icon}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate block">{title}</span>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{value}</p>
                  <span className={`text-xs font-medium ${trend.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>{trend}</span>
                </div>
              </div>
            </div>
            <div className="flex-1 flex items-end gap-0.5 mt-2">
              {bars.slice(0, 8).map((h, i) => (
                <div key={i} className={`flex-1 ${barColor} rounded-sm`} style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        )}
      </div>
    );

    // ─── Helper: schedule widget (time slots with subjects) ─────────
    const scheduleWidget = (title: string, icon: React.ReactNode, color: string, slots: { time: string; label: string; c: string }[]) => (
      <div className="h-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden flex flex-col">
        {isSmall ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-1.5 p-2">
            <div className={`w-9 h-9 ${color} rounded-xl flex items-center justify-center`}>
              {icon}
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white leading-none">{slots.length}</span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 text-center leading-tight truncate w-full">{title}</span>
          </div>
        ) : isLarge ? (
          <div className="flex-1 flex flex-col p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 ${color} rounded-2xl flex items-center justify-center shrink-0`}>{icon}</div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
              </div>
              <span className="text-sm text-gray-400">{slots.length} уроков</span>
            </div>
            <div className="flex-1 flex flex-col gap-2 overflow-hidden">
              {slots.map((slot, i) => (
                <div key={i} className="flex-1 flex items-center gap-2.5 px-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl min-h-0">
                  <span className="text-xs font-mono text-gray-400 w-11 shrink-0">{slot.time}</span>
                  <div className={`w-1 h-5 ${slot.c} rounded-full shrink-0`} />
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{slot.label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 ${color} rounded-lg flex items-center justify-center shrink-0`}>{icon}</div>
                <h3 className="text-xs font-semibold text-gray-900 dark:text-white truncate">{title}</h3>
              </div>
              <span className="text-[10px] text-gray-400">{slots.length}</span>
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              {slots.slice(0, 3).map((slot, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-gray-400 w-9 shrink-0">{slot.time}</span>
                  <div className={`w-0.5 h-3.5 ${slot.c} rounded-full shrink-0`} />
                  <span className="text-[11px] text-gray-600 dark:text-gray-300 truncate">{slot.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );

    // ─── Helper: list widget (alert/pending items with badge) ───────
    const listWidget = (title: string, icon: React.ReactNode, color: string, badgeColor: string, items: { label: string; detail: string; accent?: string }[]) => (
      <div className="h-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden flex flex-col">
        {isSmall ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-1.5 p-2">
            <div className="relative">
              <div className={`w-9 h-9 ${color} rounded-xl flex items-center justify-center`}>{icon}</div>
              <div className={`absolute -top-1 -right-1 w-4.5 h-4.5 ${badgeColor} rounded-full flex items-center justify-center`}>
                <span className="text-[8px] font-bold text-white">{items.length}</span>
              </div>
            </div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 text-center leading-tight truncate w-full">{title}</span>
          </div>
        ) : isLarge ? (
          <div className="flex-1 flex flex-col p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
              <span className={`px-2.5 py-1 ${badgeColor} text-white text-xs font-bold rounded-full`}>{items.length}</span>
            </div>
            <div className="flex-1 flex flex-col gap-2 overflow-hidden">
              {items.map((item, i) => (
                <div key={i} className="flex-1 flex items-center justify-between px-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl min-h-0">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{item.label}</span>
                  <span className={`text-sm font-bold shrink-0 ml-2 ${item.accent || 'text-gray-500'}`}>{item.detail}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col p-4">
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-xs font-semibold text-gray-900 dark:text-white">{title}</h3>
              <span className={`px-1.5 py-0.5 ${badgeColor} text-white text-[10px] font-bold rounded-full`}>{items.length}</span>
            </div>
            <div className="flex-1 flex flex-col gap-1.5 overflow-hidden">
              {items.slice(0, 3).map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-600 dark:text-gray-300 truncate">{item.label}</span>
                  <span className={`text-[11px] font-semibold shrink-0 ml-1 ${item.accent || 'text-gray-500'}`}>{item.detail}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );

    // ─── Helper: progress widget (percentage indicator) ─────────────
    const progressWidget = (icon: React.ReactNode, label: string, color: string, barColor: string, percent: number) => (
      <div className="h-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden flex flex-col">
        {isSmall ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-1.5 p-2">
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" className="text-gray-200 dark:text-gray-700" strokeWidth="3" />
                <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" className={barColor} strokeWidth="3" strokeDasharray={`${C * percent / 100} ${C}`} strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-900 dark:text-white">{percent}%</span>
            </div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 text-center leading-tight truncate w-full">{label}</span>
          </div>
        ) : isLarge ? (
          <div className="flex-1 flex flex-col p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center shrink-0`}>
                {icon}
              </div>
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
                <p className="text-4xl font-bold text-gray-900 dark:text-white leading-tight">{percent}%</p>
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-5">
                <div className={`h-5 rounded-full ${color} transition-all`} style={{ width: `${percent}%` }} />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-xs text-gray-400">0%</span>
                <span className={`text-xs font-semibold ${barColor}`}>{percent}%</span>
                <span className="text-xs text-gray-400">100%</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center gap-3 p-4">
            <div className="relative w-12 h-12 shrink-0">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" className="text-gray-200 dark:text-gray-700" strokeWidth="3" />
                <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" className={barColor} strokeWidth="3" strokeDasharray={`${C * percent / 100} ${C}`} strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-gray-900 dark:text-white">{percent}%</span>
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate block">{label}</span>
              <p className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{percent}%</p>
            </div>
          </div>
        )}
      </div>
    );

    // ─── Helper: distribution widget (colored segments with values) ──
    const distributionWidget = (title: string, segments: { label: string; value: string; color: string; lightColor: string; textColor: string }[]) => (
      <div className="h-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden flex flex-col">
        {isSmall ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-1.5 p-2">
            <div className="flex gap-1.5">
              {segments.map((s, i) => (
                <div key={i} className={`w-2.5 h-2.5 ${s.color} rounded-full`} />
              ))}
            </div>
            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 text-center leading-tight truncate w-full">{title}</span>
          </div>
        ) : isLarge ? (
          <div className="flex-1 flex flex-col p-5">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">{title}</h3>
            <div className="flex-1 flex flex-col gap-2">
              {segments.map((s, i) => (
                <div key={i} className={`flex-1 flex items-center justify-between px-4 ${s.lightColor} rounded-xl min-h-0`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-3 h-3 ${s.color} rounded-full shrink-0`} />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{s.label}</span>
                  </div>
                  <span className={`text-xl font-bold ${s.textColor}`}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col p-4">
            <h3 className="text-xs font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
            <div className="flex-1 flex flex-col justify-center gap-2">
              {segments.map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 ${s.color} rounded-full`} />
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">{s.label}</span>
                  </div>
                  <span className={`text-xs font-semibold ${s.textColor}`}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );

    // ─── Icons ──────────────────────────────────────────────────────
    const icons = {
      students: <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
      teachers: <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
      groups: <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
      contracts: <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
      money: <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      warning: <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
      chartBar: <svg className="w-4 h-4 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
      clipboard: <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
      academic: <svg className="w-4 h-4 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" /></svg>,
      lightning: <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
      building: <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
      trending: <svg className="w-4 h-4 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
      filter: <svg className="w-4 h-4 text-sky-600 dark:text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>,
      userCheck: <svg className="w-4 h-4 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 8l2 2-4 4" /></svg>,
      door: <svg className="w-4 h-4 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>,
      check: <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      clock: <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      clockSmall: <svg className="w-4 h-4 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      bell: <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
      calendar: <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
      calendarSmall: <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    };

    // ─── Widget Map ─────────────────────────────────────────────────
    const widgetMap: Record<string, React.ReactNode> = {
      // ── Admin KPI Stats ───────────────────────────────────────────
      students: statWidget(icons.students, tl('dashboard.totalStudents', 'Всего учеников'), 'bg-blue-100 dark:bg-blue-900/30', 'bg-blue-400', '247', '+12%'),
      teachers: statWidget(icons.teachers, tl('dashboard.totalTeachers', 'Всего учителей'), 'bg-green-100 dark:bg-green-900/30', 'bg-green-400', '32', '+3'),
      groups: statWidget(icons.groups, tl('dashboard.totalGroups', 'Всего групп'), 'bg-purple-100 dark:bg-purple-900/30', 'bg-purple-400', '18', '+2'),
      contracts: statWidget(icons.contracts, tl('dashboard.activeContracts', 'Активные контракты'), 'bg-orange-100 dark:bg-orange-900/30', 'bg-orange-400', '156', '+8%'),

      // ── Admin Financial ───────────────────────────────────────────
      revenue: chartWidget(tl('dashboard.revenue', 'Выручка'), icons.money, 'bg-emerald-100 dark:bg-emerald-900/30', 'bg-emerald-400', '12.5M ₸', '+15%', [30, 42, 38, 55, 48, 62, 58, 75, 70, 85, 80, 92]),
      monthlyCashflow: chartWidget(tl('dashboard.monthlyCashflow', 'Кэшфлоу'), icons.chartBar, 'bg-teal-100 dark:bg-teal-900/30', 'bg-teal-400', '3.2M ₸', '+8%', [50, 35, 60, 45, 70, 55, 65, 50, 75, 60, 80, 70]),
      payments: distributionWidget(tl('dashboard.paymentStatus', 'Статус оплат'), [
        { label: tl('dashboard.paid', 'Оплачено'), value: '89', color: 'bg-green-500', lightColor: 'bg-green-100 dark:bg-green-900/20', textColor: 'text-green-600 dark:text-green-400' },
        { label: tl('dashboard.partiallyPaid', 'Частично оплачено'), value: '34', color: 'bg-yellow-500', lightColor: 'bg-yellow-100 dark:bg-yellow-900/20', textColor: 'text-yellow-600 dark:text-yellow-400' },
        { label: tl('dashboard.unpaid', 'Не оплачено'), value: '12', color: 'bg-red-500', lightColor: 'bg-red-100 dark:bg-red-900/20', textColor: 'text-red-600 dark:text-red-400' },
      ]),
      overduePayments: listWidget(tl('dashboard.overduePayments', 'Просроченные оплаты'), icons.warning, 'bg-red-100 dark:bg-red-900/30', 'bg-red-500', [
        { label: 'Алиев Д.', detail: '145 000 ₸', accent: 'text-red-500' },
        { label: 'Серикова А.', detail: '98 000 ₸', accent: 'text-red-500' },
        { label: 'Нурланов К.', detail: '210 000 ₸', accent: 'text-red-500' },
        { label: 'Тасова М.', detail: '67 000 ₸', accent: 'text-red-500' },
      ]),
      expiringContracts: listWidget(tl('dashboard.expiringContracts', 'Истекающие контракты'), icons.contracts, 'bg-orange-100 dark:bg-orange-900/30', 'bg-orange-500', [
        { label: 'Иванов А.', detail: '3 дня', accent: 'text-orange-500' },
        { label: 'Петрова С.', detail: '5 дней', accent: 'text-orange-500' },
        { label: 'Ким Д.', detail: '7 дней', accent: 'text-amber-500' },
      ]),

      // ── Admin Operations ──────────────────────────────────────────
      enrollmentFunnel: distributionWidget(tl('dashboard.enrollmentFunnel', 'Воронка записи'), [
        { label: tl('dashboard.pending', 'Ожидание'), value: '23', color: 'bg-sky-500', lightColor: 'bg-sky-100 dark:bg-sky-900/20', textColor: 'text-sky-600 dark:text-sky-400' },
        { label: tl('dashboard.approved', 'Одобрено'), value: '15', color: 'bg-blue-500', lightColor: 'bg-blue-100 dark:bg-blue-900/20', textColor: 'text-blue-600 dark:text-blue-400' },
        { label: tl('dashboard.active', 'Активно'), value: '42', color: 'bg-green-500', lightColor: 'bg-green-100 dark:bg-green-900/20', textColor: 'text-green-600 dark:text-green-400' },
      ]),
      studentStatusBreakdown: distributionWidget(tl('dashboard.studentStatusBreakdown', 'Статусы учеников'), [
        { label: tl('dashboard.active', 'Активные'), value: '189', color: 'bg-green-500', lightColor: 'bg-green-100 dark:bg-green-900/20', textColor: 'text-green-600 dark:text-green-400' },
        { label: tl('dashboard.frozen', 'Замороженные'), value: '28', color: 'bg-blue-500', lightColor: 'bg-blue-100 dark:bg-blue-900/20', textColor: 'text-blue-600 dark:text-blue-400' },
        { label: tl('dashboard.graduated', 'Выпускники'), value: '18', color: 'bg-purple-500', lightColor: 'bg-purple-100 dark:bg-purple-900/20', textColor: 'text-purple-600 dark:text-purple-400' },
        { label: tl('dashboard.other', 'Другие'), value: '12', color: 'bg-gray-500', lightColor: 'bg-gray-100 dark:bg-gray-900/20', textColor: 'text-gray-600 dark:text-gray-400' },
      ]),
      groupOccupancy: distributionWidget(tl('dashboard.groupOccupancy', 'Заполненность групп'), [
        { label: tl('dashboard.full', 'Полные'), value: '8', color: 'bg-green-500', lightColor: 'bg-green-100 dark:bg-green-900/20', textColor: 'text-green-600 dark:text-green-400' },
        { label: tl('dashboard.partial', 'Частичные'), value: '7', color: 'bg-yellow-500', lightColor: 'bg-yellow-100 dark:bg-yellow-900/20', textColor: 'text-yellow-600 dark:text-yellow-400' },
        { label: tl('dashboard.empty', 'Пустые'), value: '3', color: 'bg-red-500', lightColor: 'bg-red-100 dark:bg-red-900/20', textColor: 'text-red-600 dark:text-red-400' },
      ]),
      todaySchedule: scheduleWidget(tl('dashboard.todaySchedule', 'Расписание сегодня'), icons.clockSmall, 'bg-slate-100 dark:bg-slate-900/30', [
        { time: '09:00', label: 'Математика — 7А', c: 'bg-blue-400' },
        { time: '10:30', label: 'Физика — 8Б', c: 'bg-purple-400' },
        { time: '12:00', label: 'Химия — 9В', c: 'bg-green-400' },
        { time: '14:00', label: 'Английский — 6А', c: 'bg-orange-400' },
        { time: '15:30', label: 'Информатика — 10Б', c: 'bg-cyan-400' },
      ]),
      teacherWorkload: listWidget(tl('dashboard.teacherWorkload', 'Нагрузка учителей'), icons.teachers, 'bg-green-100 dark:bg-green-900/30', 'bg-green-500', [
        { label: 'Касымова А.', detail: '24 ч/нед', accent: 'text-green-500' },
        { label: 'Нурпеисов Б.', detail: '22 ч/нед', accent: 'text-green-500' },
        { label: 'Ахметова Д.', detail: '18 ч/нед', accent: 'text-emerald-500' },
        { label: 'Сулейменов К.', detail: '28 ч/нед', accent: 'text-red-500' },
      ]),
      branchComparison: chartWidget(tl('dashboard.branchComparison', 'Филиалы'), icons.building, 'bg-indigo-100 dark:bg-indigo-900/30', 'bg-indigo-400', '4', '+12%', [75, 60, 85, 45]),
      enrollments: infoWidget(tl('dashboard.pendingEnrollments', 'Ожидают записи'), icons.check, [
        { text: 'Ахметов Данияр', sub: '5 класс · Математика', dot: 'bg-blue-400' },
        { text: 'Касымова Лаура', sub: '7 класс · Физика', dot: 'bg-purple-400' },
        { text: 'Нурланов Тимур', sub: '9 класс · Химия', dot: 'bg-green-400' },
      ]),
      recentActivity: infoWidget(tl('dashboard.recentActivity', 'Последняя активность'), icons.clock, [
        { text: 'Новый ученик записан', sub: '15 мин назад', dot: 'bg-green-400' },
        { text: 'Оплата получена — 120 000 ₸', sub: '1 час назад', dot: 'bg-emerald-400' },
        { text: 'Тест завершён — 8Б класс', sub: '2 часа назад', dot: 'bg-blue-400' },
        { text: 'Урок отменён — 10А', sub: '3 часа назад', dot: 'bg-red-400' },
      ]),

      // ── Admin Quick Actions ───────────────────────────────────────
      quickActions: (
        <div className="h-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden flex flex-col">
          {isSmall ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-1 p-2">
              <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
                {icons.lightning}
              </div>
              <span className="text-[9px] text-gray-500 dark:text-gray-400 text-center leading-tight">{tl('dashboard.quickActions', 'Действия')}</span>
            </div>
          ) : isLarge ? (
            <div className="flex-1 flex flex-col p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{tl('dashboard.quickActions', 'Быстрые действия')}</h3>
              <div className="flex-1 grid grid-cols-2 gap-2">
                {[
                  { icon: icons.students, label: tl('dashboard.addStudent', 'Добавить ученика'), color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' },
                  { icon: icons.groups, label: tl('dashboard.createGroup', 'Создать группу'), color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' },
                  { icon: icons.contracts, label: tl('dashboard.newContract', 'Новый контракт'), color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' },
                  { icon: icons.academic, label: tl('dashboard.createTest', 'Создать тест'), color: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400' },
                ].map((action, i) => (
                  <button key={i} className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl ${action.color} transition-opacity hover:opacity-80`}>
                    <div className="w-6 h-6 flex items-center justify-center">{action.icon}</div>
                    <span className="text-[10px] font-medium text-center leading-tight">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-2 p-3">
              {[
                { icon: icons.students, color: 'bg-blue-50 dark:bg-blue-900/20' },
                { icon: icons.groups, color: 'bg-purple-50 dark:bg-purple-900/20' },
                { icon: icons.contracts, color: 'bg-orange-50 dark:bg-orange-900/20' },
              ].map((action, i) => (
                <button key={i} className={`flex-1 h-full flex items-center justify-center rounded-xl ${action.color} transition-opacity hover:opacity-80`}>
                  <div className="w-5 h-5">{action.icon}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      ),

      // ── Coordinator Widgets ───────────────────────────────────────
      myGroups: statWidget(icons.groups, tl('dashboard.myGroups', 'Мои группы'), 'bg-purple-100 dark:bg-purple-900/30', 'bg-purple-400', '6', '+1'),
      unassignedStudents: statWidget(icons.students, tl('dashboard.unassignedStudents', 'Без группы'), 'bg-amber-100 dark:bg-amber-900/30', 'bg-amber-400', '14', '-3'),
      contractAlerts: statWidget(icons.warning, tl('dashboard.contractAlerts', 'Алерты контрактов'), 'bg-red-100 dark:bg-red-900/30', 'bg-red-400', '5', '+2'),
      pendingApprovals: listWidget(tl('dashboard.pendingApprovals', 'Ожидают одобрения'), icons.userCheck, 'bg-amber-100 dark:bg-amber-900/30', 'bg-amber-500', [
        { label: 'Жумагулов А.', detail: 'Запись', accent: 'text-amber-500' },
        { label: 'Бекенова С.', detail: 'Перевод', accent: 'text-blue-500' },
        { label: 'Муратов Д.', detail: 'Запись', accent: 'text-amber-500' },
      ]),
      todayLessons: scheduleWidget(tl('dashboard.todayLessons', 'Уроки сегодня'), icons.calendarSmall, 'bg-blue-100 dark:bg-blue-900/30', [
        { time: '09:00', label: 'Математика — 5А', c: 'bg-blue-400' },
        { time: '10:30', label: 'Физика — 7Б', c: 'bg-purple-400' },
        { time: '12:00', label: 'Английский — 6В', c: 'bg-orange-400' },
        { time: '14:00', label: 'Биология — 8А', c: 'bg-green-400' },
      ]),
      studentAttendance: progressWidget(icons.userCheck, tl('dashboard.studentAttendance', 'Посещаемость'), 'bg-teal-100 dark:bg-teal-900/30', 'text-teal-500', 92),
      homeworkStatus: distributionWidget(tl('dashboard.homeworkStatus', 'Статус ДЗ'), [
        { label: tl('dashboard.submitted', 'Сдано'), value: '34', color: 'bg-green-500', lightColor: 'bg-green-100 dark:bg-green-900/20', textColor: 'text-green-600 dark:text-green-400' },
        { label: tl('dashboard.pending', 'Ожидается'), value: '12', color: 'bg-yellow-500', lightColor: 'bg-yellow-100 dark:bg-yellow-900/20', textColor: 'text-yellow-600 dark:text-yellow-400' },
        { label: tl('dashboard.late', 'Просрочено'), value: '6', color: 'bg-red-500', lightColor: 'bg-red-100 dark:bg-red-900/20', textColor: 'text-red-600 dark:text-red-400' },
      ]),
      weekSchedule: (
        <div className="h-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden flex flex-col">
          {isSmall ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-1 p-2">
              <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                {icons.calendarSmall}
              </div>
              <span className="text-[9px] text-gray-500 dark:text-gray-400 text-center leading-tight">{tl('dashboard.weekSchedule', 'Неделя')}</span>
            </div>
          ) : isLarge ? (
            <div className="flex-1 flex flex-col p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{tl('dashboard.weekSchedule', 'Расписание недели')}</h3>
              <div className="flex-1 grid grid-cols-6 gap-1">
                {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'].map((day, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <span className="text-[9px] font-medium text-gray-400 text-center">{day}</span>
                    <div className="flex-1 flex flex-col gap-0.5">
                      {Array.from({ length: 3 + Math.floor(Math.random() * 2) }).map((_, j) => (
                        <div key={j} className={`h-3 rounded-sm ${['bg-blue-300', 'bg-purple-300', 'bg-green-300', 'bg-orange-300', 'bg-pink-300'][j % 5]} opacity-50`} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col p-3">
              <h3 className="text-[11px] font-semibold text-gray-900 dark:text-white mb-1">{tl('dashboard.weekSchedule', 'Неделя')}</h3>
              <div className="flex-1 grid grid-cols-6 gap-0.5">
                {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'].map((day, i) => (
                  <div key={i} className="flex flex-col gap-0.5">
                    <span className="text-[7px] text-gray-400 text-center">{day}</span>
                    <div className="flex-1 flex flex-col gap-0.5">
                      {Array.from({ length: 2 }).map((_, j) => (
                        <div key={j} className={`h-2 rounded-sm ${['bg-blue-300', 'bg-purple-300'][j % 2]} opacity-40`} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ),
      groupPerformance: chartWidget(tl('dashboard.groupPerformance', 'Успеваемость групп'), icons.academic, 'bg-violet-100 dark:bg-violet-900/30', 'bg-violet-400', '82%', '+5%', [60, 72, 68, 75, 80, 78, 85, 82, 88, 80, 90, 82]),
      teacherAvailability: listWidget(tl('dashboard.teacherAvailability', 'Доступность учителей'), icons.teachers, 'bg-green-100 dark:bg-green-900/30', 'bg-green-500', [
        { label: 'Исаева А.', detail: 'Свободна', accent: 'text-green-500' },
        { label: 'Байжанов К.', detail: 'На уроке', accent: 'text-amber-500' },
        { label: 'Токаева С.', detail: 'Свободна', accent: 'text-green-500' },
      ]),
      recentEnrollments: listWidget(tl('dashboard.recentEnrollments', 'Новые записи'), icons.students, 'bg-blue-100 dark:bg-blue-900/30', 'bg-blue-500', [
        { label: 'Омаров А.', detail: '7 класс', accent: 'text-blue-500' },
        { label: 'Ли С.', detail: '5 класс', accent: 'text-blue-500' },
        { label: 'Бектурсунов Д.', detail: '9 класс', accent: 'text-blue-500' },
      ]),

      // ── Teacher Widgets ───────────────────────────────────────────
      nextLesson: statWidget(icons.door, tl('dashboard.nextLesson', 'Следующий урок'), 'bg-rose-100 dark:bg-rose-900/30', 'bg-rose-400', '14:30', '+2ч'),
      myStudents: statWidget(icons.students, tl('dashboard.myStudents', 'Мои ученики'), 'bg-blue-100 dark:bg-blue-900/30', 'bg-blue-400', '48', '+5'),
      homeworkCompletion: progressWidget(icons.clipboard, tl('dashboard.homeworkCompletion', 'Выполнение ДЗ'), 'bg-amber-100 dark:bg-amber-900/30', 'text-amber-500', 78),
      myTestsCreated: statWidget(icons.academic, tl('dashboard.testsCreated', 'Мои тесты'), 'bg-violet-100 dark:bg-violet-900/30', 'bg-violet-400', '12', '+3'),
      pendingHomework: listWidget(tl('dashboard.pendingHomework', 'ДЗ на проверку'), icons.clipboard, 'bg-amber-100 dark:bg-amber-900/30', 'bg-amber-500', [
        { label: 'Алгебра — 7А', detail: '8 работ', accent: 'text-amber-500' },
        { label: 'Геометрия — 8Б', detail: '12 работ', accent: 'text-amber-500' },
        { label: 'Алгебра — 9В', detail: '5 работ', accent: 'text-amber-500' },
      ]),
      upcomingTests: listWidget(tl('dashboard.upcomingTests', 'Предстоящие тесты'), icons.academic, 'bg-violet-100 dark:bg-violet-900/30', 'bg-violet-500', [
        { label: 'СОР — Математика 7А', detail: '2 фев', accent: 'text-violet-500' },
        { label: 'СОЧ — Алгебра 9В', detail: '5 фев', accent: 'text-violet-500' },
        { label: 'Контрольная — 8Б', detail: '8 фев', accent: 'text-violet-500' },
      ]),
      lessonsProgress: progressWidget(icons.trending, tl('dashboard.lessonsProgress', 'Прогресс уроков'), 'bg-cyan-100 dark:bg-cyan-900/30', 'text-cyan-500', 65),
      recentTestResults: chartWidget(tl('dashboard.recentTestResults', 'Результаты тестов'), icons.academic, 'bg-purple-100 dark:bg-purple-900/30', 'bg-purple-400', '76%', '+4%', [30, 45, 60, 55, 70, 65, 80, 75, 85, 70, 90, 76]),
      studentPerformance: chartWidget(tl('dashboard.studentPerformance', 'Успеваемость'), icons.trending, 'bg-amber-100 dark:bg-amber-900/30', 'bg-amber-400', '79%', '+3%'),

      // ── Common Widgets ────────────────────────────────────────────
      notifications: infoWidget(tl('dashboard.notifications', 'Уведомления'), icons.bell, [
        { text: 'Новая оплата от родителя', sub: '10 мин назад', dot: 'bg-green-400' },
        { text: 'Урок перенесён на 15:00', sub: '30 мин назад', dot: 'bg-amber-400' },
        { text: 'ДЗ сдано — Ахметов Д.', sub: '1 час назад', dot: 'bg-blue-400' },
      ]),
      events: infoWidget(tl('dashboard.upcomingEvents', 'Предстоящие события'), icons.calendar, [
        { text: 'Родительское собрание', sub: '1 фев, 18:00', dot: 'bg-purple-400' },
        { text: 'Олимпиада по математике', sub: '5 фев, 10:00', dot: 'bg-blue-400' },
        { text: 'День открытых дверей', sub: '10 фев, 12:00', dot: 'bg-green-400' },
      ]),
    };

    return widgetMap[id] || null;
  };

  if (!mounted) {
    return (
      <div className="relative">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
            <div>
              <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className={`${i < 2 ? 'col-span-1 row-span-1' : i < 4 ? 'col-span-1 row-span-1' : 'col-span-2 row-span-1'} bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse`} style={{ minHeight: 100 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Action Buttons */}
      <div className="absolute top-0 right-0 flex items-center gap-2">
        <button
          onClick={() => {
            setIsReorderMode(!isReorderMode);
            if (isEditMode) setIsEditMode(false);
          }}
          className={`p-2 rounded-xl transition-colors ${
            isReorderMode
              ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
          }`}
          title={t('dashboard.reorderWidgets')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>
        <button
          onClick={() => {
            setIsEditMode(!isEditMode);
            if (isReorderMode) setIsReorderMode(false);
          }}
          className={`p-2 rounded-xl transition-colors ${
            isEditMode
              ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
          }`}
          title={t('dashboard.editWidgets')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>

      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('dashboard.welcome', { name: firstName })}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t(`role.${role}`)}
            </p>
          </div>
        </div>
      </div>

      {/* Widgets Grid */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={widgets.map(w => w.id)} strategy={rectSortingStrategy}>
          <div ref={gridRef} className="grid grid-cols-4 md:grid-cols-8 gap-2" style={{ gridAutoRows: cellSize }}>
            {widgets.map((widget) => {
              const pos = layout.find(l => l.id === widget.id)!;
              return (
                <SortableWidget
                  key={widget.id}
                  id={widget.id}
                  size={widget.size}
                  gridPos={pos}
                  isReorderMode={isReorderMode}
                  isEditMode={isEditMode}
                  onResize={handleResize}
                >
                  {renderWidgetContent(widget.id, widget.size)}
                </SortableWidget>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
