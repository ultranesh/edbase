import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Транслитерация для первой буквы филиала
const transliterate = (text: string): string => {
  const map: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
    'ы': 'y', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    'ә': 'a', 'і': 'i', 'ң': 'n', 'ғ': 'g', 'ү': 'u', 'ұ': 'u', 'қ': 'q', 'ө': 'o', 'һ': 'h',
  };
  const firstChar = text.charAt(0).toLowerCase();
  return (map[firstChar] || firstChar).toUpperCase();
};

export async function GET() {
  try {
    const items = await prisma.group.findMany({
      include: {
        gradeLevel: { select: { id: true, name: true, code: true } },
        language: { select: { id: true, name: true, code: true } },
        studyDirection: { select: { id: true, name: true, code: true } },
        groupIndex: { select: { id: true, name: true, symbol: true } },
        branch: { select: { id: true, name: true } },
        teacher: {
          select: {
            id: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
        subjects: {
          include: {
            subject: { select: { id: true, name: true } },
          },
        },
        students: {
          include: {
            student: {
              select: {
                id: true,
                user: { select: { firstName: true, lastName: true } },
                gradeLevel: { select: { name: true, code: true } },
                language: { select: { name: true, code: true } },
                studyDirection: { select: { name: true, code: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Fetch related data for name generation
    const gradeLevel = data.gradeLevelId
      ? await prisma.refGradeLevel.findUnique({ where: { id: data.gradeLevelId } })
      : null;
    const language = data.languageId
      ? await prisma.refLanguage.findUnique({ where: { id: data.languageId } })
      : null;
    const groupIndex = data.groupIndexId
      ? await prisma.refGroupIndex.findUnique({ where: { id: data.groupIndexId } })
      : null;
    const branch = data.branchId
      ? await prisma.branch.findUnique({ where: { id: data.branchId } })
      : null;

    // Build name: 5RMA-Omega-O (class + language + time + branch first letter + index + online suffix)
    const gradeCode = gradeLevel?.code || '0';
    const langCode = language?.code || 'R';
    const timeCode = data.timeOfDay === 'MORNING' ? 'M' : data.timeOfDay === 'AFTERNOON' ? 'A' : 'E';
    const branchCode = branch ? transliterate(branch.name) : '';
    const indexName = groupIndex?.name || 'Alpha';
    const formatSuffix = data.studyFormat?.includes('ONLINE') ? '-O' : '';

    const generatedName = `${gradeCode}${langCode}${timeCode}${branchCode}-${indexName}${formatSuffix}`;

    const item = await prisma.group.create({
      data: {
        name: generatedName,
        gradeLevelId: data.gradeLevelId || null,
        languageId: data.languageId || null,
        studyDirectionId: data.studyDirectionId || null,
        groupIndexId: data.groupIndexId || null,
        branchId: data.branchId || null,
        teacherId: data.teacherId || null,
        studyFormat: data.studyFormat || null,
        timeOfDay: data.timeOfDay || null,
        maxStudents: data.maxStudents || 15,
        isActive: true,
      },
      include: {
        gradeLevel: { select: { id: true, name: true, code: true } },
        language: { select: { id: true, name: true, code: true } },
        studyDirection: { select: { id: true, name: true, code: true } },
        groupIndex: { select: { id: true, name: true, symbol: true } },
        branch: { select: { id: true, name: true } },
        teacher: {
          select: {
            id: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
        subjects: {
          include: {
            subject: { select: { id: true, name: true } },
          },
        },
        students: {
          include: {
            student: {
              select: {
                id: true,
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });

    // Add subjects if provided
    if (data.subjects && data.subjects.length > 0) {
      await prisma.groupSubject.createMany({
        data: data.subjects.map((s: { subjectId: string; hoursPerWeek: number }) => ({
          groupId: item.id,
          subjectId: s.subjectId,
          hoursPerWeek: s.hoursPerWeek || 0,
          totalHours: (s.hoursPerWeek || 0) * 4 * 9, // approx 9 months
        })),
      });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}
