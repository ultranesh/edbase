import { prisma } from '@/lib/prisma';

export const BROADCAST_CHAT_ID = 'ertis-academy-broadcast';

export const BROADCAST_SENDER_ROLES = ['ADMIN', 'SUPERADMIN', 'COORDINATOR', 'CHIEF_COORDINATOR'];

export interface BroadcastFilters {
  recipientType: 'PARENT' | 'STUDENT';
  gradeLevelIds?: string[];
  regionIds?: string[];
  cityIds?: string[];
  schoolIds?: string[];
  branchIds?: string[];
  languageIds?: string[];
  studySchedules?: string[];
}

export async function resolveFilterToUserIds(filters: BroadcastFilters): Promise<string[]> {
  // Build student WHERE clause from non-empty filter arrays
  const studentWhere: any = { status: 'ACTIVE' };

  if (filters.gradeLevelIds?.length) {
    studentWhere.gradeLevelId = { in: filters.gradeLevelIds };
  }
  if (filters.schoolIds?.length) {
    studentWhere.schoolId = { in: filters.schoolIds };
  }
  if (filters.branchIds?.length) {
    studentWhere.branchId = { in: filters.branchIds };
  }
  if (filters.languageIds?.length) {
    studentWhere.languageId = { in: filters.languageIds };
  }
  if (filters.studySchedules?.length) {
    studentWhere.studySchedule = { in: filters.studySchedules };
  }

  // Handle region -> city resolution
  if (filters.regionIds?.length && !filters.cityIds?.length) {
    const citiesInRegions = await prisma.refCity.findMany({
      where: { regionId: { in: filters.regionIds } },
      select: { id: true },
    });
    studentWhere.cityId = { in: citiesInRegions.map(c => c.id) };
  } else if (filters.cityIds?.length) {
    studentWhere.cityId = { in: filters.cityIds };
  }

  // Fetch matching students
  const students = await prisma.student.findMany({
    where: studentWhere,
    select: { userId: true, parentId: true },
  });

  if (filters.recipientType === 'STUDENT') {
    // Return deduplicated student userIds
    return [...new Set(students.map(s => s.userId))];
  } else {
    // PARENT: resolve parent -> user mapping
    const parentIds = [...new Set(students.filter(s => s.parentId).map(s => s.parentId!))];
    if (parentIds.length === 0) return [];

    const parents = await prisma.parent.findMany({
      where: { id: { in: parentIds } },
      select: { userId: true },
    });
    return [...new Set(parents.map(p => p.userId))];
  }
}
