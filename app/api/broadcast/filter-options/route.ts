import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { BROADCAST_SENDER_ROLES } from '@/lib/broadcast';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!BROADCAST_SENDER_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [gradeLevels, regions, cities, schools, branches, languages] = await Promise.all([
      prisma.refGradeLevel.findMany({ where: { isActive: true }, orderBy: { orderIndex: 'asc' }, select: { id: true, name: true, code: true } }),
      prisma.refRegion.findMany({ where: { isActive: true }, orderBy: { orderIndex: 'asc' }, select: { id: true, name: true } }),
      prisma.refCity.findMany({ where: { isActive: true }, orderBy: { orderIndex: 'asc' }, select: { id: true, name: true, regionId: true } }),
      prisma.refSchool.findMany({ where: { isActive: true }, select: { id: true, name: true, cityId: true } }),
      prisma.branch.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
      prisma.refLanguage.findMany({ where: { isActive: true }, orderBy: { orderIndex: 'asc' }, select: { id: true, name: true, code: true } }),
    ]);

    return NextResponse.json({
      gradeLevels,
      regions,
      cities,
      schools,
      branches,
      languages,
      studySchedules: [
        { code: 'PSP', name: 'Пн-Ср-Пт' },
        { code: 'VCS', name: 'Вт-Чт-Сб' },
      ],
    });
  } catch (error) {
    console.error('Broadcast filter options error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
