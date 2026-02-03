import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allowedRoles = ['COORDINATOR', 'COORDINATOR_MANAGER', 'ADMIN', 'SUPERADMIN'];
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1));
  const year = parseInt(searchParams.get('year') || String(now.getFullYear()));
  const planAmount = parseFloat(searchParams.get('planAmount') || '0') || 0;

  // Current month range
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  // Previous month range
  const prevStartDate = new Date(year, month - 2, 1);
  const prevEndDate = new Date(year, month - 1, 0, 23, 59, 59, 999);

  // 13 months ago for trend
  const trendStart = new Date(year, month - 13, 1);

  // Fetch all payments from last 13 months in one query
  const allPayments = await prisma.payment.findMany({
    where: {
      createdAt: { gte: trendStart },
    },
    select: {
      id: true,
      amount: true,
      actualAmount: true,
      method: true,
      status: true,
      isConfirmed: true,
      coordinatorId: true,
      createdAt: true,
      studentId: true,
      coordinator: {
        select: { id: true, firstName: true, lastName: true },
      },
      student: {
        select: {
          id: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  // Helper: get payment amount (prefer actualAmount, fallback to amount)
  const getAmount = (p: typeof allPayments[0]) => p.actualAmount ?? p.amount;

  // Filter payments by period
  const currentMonthPayments = allPayments.filter(p => p.createdAt >= startDate && p.createdAt <= endDate);
  const prevMonthPayments = allPayments.filter(p => p.createdAt >= prevStartDate && p.createdAt <= prevEndDate);

  // ── SUMMARY ──
  const paidPayments = currentMonthPayments.filter(p => p.status === 'PAID');
  const totalPaymentsCount = paidPayments.length;
  const totalPaymentsAmount = paidPayments.reduce((sum, p) => sum + getAmount(p), 0);
  const confirmedPayments = paidPayments.filter(p => p.isConfirmed);
  const confirmedCount = confirmedPayments.length;
  const confirmedAmount = confirmedPayments.reduce((sum, p) => sum + getAmount(p), 0);
  const unconfirmedCount = totalPaymentsCount - confirmedCount;
  const unconfirmedAmount = totalPaymentsAmount - confirmedAmount;
  const averagePaymentAmount = totalPaymentsCount > 0 ? totalPaymentsAmount / totalPaymentsCount : 0;

  const planCompletedAmount = totalPaymentsAmount;
  const planRemainingAmount = planAmount > 0 ? Math.max(0, planAmount - planCompletedAmount) : 0;
  const planPercentage = planAmount > 0 ? Math.min(100, (planCompletedAmount / planAmount) * 100) : 0;

  const prevPaid = prevMonthPayments.filter(p => p.status === 'PAID');
  const previousMonthAmount = prevPaid.reduce((sum, p) => sum + getAmount(p), 0);
  const previousMonthCount = prevPaid.length;
  const amountChangePercent = previousMonthAmount > 0 ? ((totalPaymentsAmount - previousMonthAmount) / previousMonthAmount) * 100 : 0;
  const countChangePercent = previousMonthCount > 0 ? ((totalPaymentsCount - previousMonthCount) / previousMonthCount) * 100 : 0;

  const overduePayments = currentMonthPayments.filter(p => p.status === 'OVERDUE');
  const overdueCount = overduePayments.length;
  const overdueAmount = overduePayments.reduce((sum, p) => sum + getAmount(p), 0);

  // ── COORDINATOR RANKINGS ──
  const coordMap = new Map<string, {
    coordinatorId: string;
    coordinatorName: string;
    paymentCount: number;
    totalAmount: number;
    confirmedCount: number;
  }>();

  for (const p of paidPayments) {
    const cId = p.coordinatorId || '_unassigned';
    const cName = p.coordinator
      ? `${p.coordinator.lastName} ${p.coordinator.firstName}`
      : 'Не указан';
    if (!coordMap.has(cId)) {
      coordMap.set(cId, { coordinatorId: cId, coordinatorName: cName, paymentCount: 0, totalAmount: 0, confirmedCount: 0 });
    }
    const entry = coordMap.get(cId)!;
    entry.paymentCount++;
    entry.totalAmount += getAmount(p);
    if (p.isConfirmed) entry.confirmedCount++;
  }

  // Previous month coordinator ranks
  const prevCoordMap = new Map<string, number>();
  const prevCoordTotals: { id: string; amount: number }[] = [];
  for (const p of prevPaid) {
    const cId = p.coordinatorId || '_unassigned';
    prevCoordTotals.push({ id: cId, amount: getAmount(p) });
  }
  const prevCoordAgg = new Map<string, number>();
  for (const { id, amount } of prevCoordTotals) {
    prevCoordAgg.set(id, (prevCoordAgg.get(id) || 0) + amount);
  }
  const prevSorted = [...prevCoordAgg.entries()].sort((a, b) => b[1] - a[1]);
  prevSorted.forEach(([id], i) => prevCoordMap.set(id, i + 1));

  const coordinatorRankings = [...coordMap.values()]
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .map((c, i) => ({
      ...c,
      averageAmount: c.paymentCount > 0 ? c.totalAmount / c.paymentCount : 0,
      confirmedPercent: c.paymentCount > 0 ? Math.round((c.confirmedCount / c.paymentCount) * 100) : 0,
      currentRank: i + 1,
      previousRank: prevCoordMap.get(c.coordinatorId) ?? null,
    }));

  // ── DAILY BREAKDOWN ──
  const daysInMonth = new Date(year, month, 0).getDate();
  const dailyCoordMap = new Map<string, {
    coordinatorId: string;
    coordinatorName: string;
    days: Record<number, { count: number; amount: number }>;
    totalCount: number;
    totalAmount: number;
  }>();
  const dailyTotals: Record<number, { count: number; amount: number }> = {};

  for (const p of paidPayments) {
    const day = p.createdAt.getDate();
    const cId = p.coordinatorId || '_unassigned';
    const cName = p.coordinator
      ? `${p.coordinator.lastName} ${p.coordinator.firstName}`
      : 'Не указан';
    const amt = getAmount(p);

    if (!dailyCoordMap.has(cId)) {
      dailyCoordMap.set(cId, { coordinatorId: cId, coordinatorName: cName, days: {}, totalCount: 0, totalAmount: 0 });
    }
    const entry = dailyCoordMap.get(cId)!;
    if (!entry.days[day]) entry.days[day] = { count: 0, amount: 0 };
    entry.days[day].count++;
    entry.days[day].amount += amt;
    entry.totalCount++;
    entry.totalAmount += amt;

    if (!dailyTotals[day]) dailyTotals[day] = { count: 0, amount: 0 };
    dailyTotals[day].count++;
    dailyTotals[day].amount += amt;
  }

  const dailyBreakdown = {
    daysInMonth,
    year,
    month,
    coordinators: [...dailyCoordMap.values()].sort((a, b) => b.totalAmount - a.totalAmount),
    dailyTotals,
  };

  // ── PAYMENT METHOD DISTRIBUTION ──
  const methodMap = new Map<string, { count: number; amount: number }>();
  for (const p of paidPayments) {
    if (!methodMap.has(p.method)) methodMap.set(p.method, { count: 0, amount: 0 });
    const entry = methodMap.get(p.method)!;
    entry.count++;
    entry.amount += getAmount(p);
  }
  const methodDistribution = [...methodMap.entries()]
    .map(([method, data]) => ({
      method,
      count: data.count,
      amount: data.amount,
      percentage: totalPaymentsAmount > 0 ? Math.round((data.amount / totalPaymentsAmount) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // ── MONTHLY TREND ──
  const monthlyMap = new Map<string, { year: number; month: number; totalAmount: number; totalCount: number }>();
  for (let i = 11; i >= 0; i--) {
    const tMonth = month - i;
    let tYear = year;
    let actualMonth = tMonth;
    if (actualMonth <= 0) {
      actualMonth += 12;
      tYear--;
    }
    const key = `${tYear}-${actualMonth}`;
    monthlyMap.set(key, { year: tYear, month: actualMonth, totalAmount: 0, totalCount: 0 });
  }

  for (const p of allPayments) {
    if (p.status !== 'PAID') continue;
    const pMonth = p.createdAt.getMonth() + 1;
    const pYear = p.createdAt.getFullYear();
    const key = `${pYear}-${pMonth}`;
    if (monthlyMap.has(key)) {
      const entry = monthlyMap.get(key)!;
      entry.totalAmount += getAmount(p);
      entry.totalCount++;
    }
  }

  const monthlyTrend = [...monthlyMap.values()];

  // ── TOP STUDENTS ──
  const studentMap = new Map<string, {
    studentId: string;
    studentName: string;
    totalPaid: number;
    paymentCount: number;
  }>();

  for (const p of paidPayments) {
    if (!studentMap.has(p.studentId)) {
      const name = p.student?.user
        ? `${p.student.user.lastName} ${p.student.user.firstName}`
        : 'Неизвестный';
      studentMap.set(p.studentId, { studentId: p.studentId, studentName: name, totalPaid: 0, paymentCount: 0 });
    }
    const entry = studentMap.get(p.studentId)!;
    entry.totalPaid += getAmount(p);
    entry.paymentCount++;
  }

  const topStudents = [...studentMap.values()]
    .sort((a, b) => b.totalPaid - a.totalPaid)
    .slice(0, 10);

  return NextResponse.json({
    summary: {
      totalPaymentsCount,
      totalPaymentsAmount,
      confirmedCount,
      confirmedAmount,
      unconfirmedCount,
      unconfirmedAmount,
      averagePaymentAmount,
      planAmount,
      planCompletedAmount,
      planRemainingAmount,
      planPercentage,
      previousMonthAmount,
      previousMonthCount,
      amountChangePercent,
      countChangePercent,
      overdueCount,
      overdueAmount,
    },
    coordinatorRankings,
    dailyBreakdown,
    methodDistribution,
    monthlyTrend,
    topStudents,
  });
}
