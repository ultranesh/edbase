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

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const item = await prisma.group.findUnique({
      where: { id },
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
            subject: { select: { id: true, nameRu: true, nameKz: true } },
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
    });
    if (!item) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(item);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await request.json();

    // If core fields changed, regenerate name
    const updateData: Record<string, unknown> = {};

    // Copy allowed fields
    if (data.gradeLevelId !== undefined) updateData.gradeLevelId = data.gradeLevelId || null;
    if (data.languageId !== undefined) updateData.languageId = data.languageId || null;
    if (data.studyDirectionId !== undefined) updateData.studyDirectionId = data.studyDirectionId || null;
    if (data.groupIndexId !== undefined) updateData.groupIndexId = data.groupIndexId || null;
    if (data.branchId !== undefined) updateData.branchId = data.branchId || null;
    if (data.teacherId !== undefined) updateData.teacherId = data.teacherId || null;
    if (data.studyFormat !== undefined) updateData.studyFormat = data.studyFormat || null;
    if (data.timeOfDay !== undefined) updateData.timeOfDay = data.timeOfDay || null;
    if (data.maxStudents !== undefined) updateData.maxStudents = data.maxStudents;
    if (data.maxHoursPerWeek !== undefined) updateData.maxHoursPerWeek = data.maxHoursPerWeek;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    // Regenerate name if any name-affecting field changed
    const nameFields = ['gradeLevelId', 'languageId', 'groupIndexId', 'timeOfDay', 'studyFormat', 'branchId'];
    const shouldRegenerateName = nameFields.some(field => data[field] !== undefined);

    if (shouldRegenerateName) {
      const currentGroup = await prisma.group.findUnique({ where: { id } });
      if (!currentGroup) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }

      const finalGradeLevelId = data.gradeLevelId !== undefined ? data.gradeLevelId : currentGroup.gradeLevelId;
      const finalLanguageId = data.languageId !== undefined ? data.languageId : currentGroup.languageId;
      const finalGroupIndexId = data.groupIndexId !== undefined ? data.groupIndexId : currentGroup.groupIndexId;
      const finalBranchId = data.branchId !== undefined ? data.branchId : currentGroup.branchId;
      const finalTimeOfDay = data.timeOfDay !== undefined ? data.timeOfDay : currentGroup.timeOfDay;
      const finalStudyFormat = data.studyFormat !== undefined ? data.studyFormat : currentGroup.studyFormat;

      const gradeLevel = finalGradeLevelId
        ? await prisma.refGradeLevel.findUnique({ where: { id: finalGradeLevelId } })
        : null;

      const language = finalLanguageId
        ? await prisma.refLanguage.findUnique({ where: { id: finalLanguageId } })
        : null;

      const groupIndex = finalGroupIndexId
        ? await prisma.refGroupIndex.findUnique({ where: { id: finalGroupIndexId } })
        : null;

      const branch = finalBranchId
        ? await prisma.branch.findUnique({ where: { id: finalBranchId } })
        : null;

      const gradeCode = gradeLevel?.code || '0';
      const langCode = language?.code || 'R';
      const timeCode = finalTimeOfDay === 'MORNING' ? 'M' : finalTimeOfDay === 'AFTERNOON' ? 'A' : 'E';
      const branchCode = branch ? transliterate(branch.name) : '';
      const indexName = groupIndex?.name || 'Alpha';
      const formatSuffix = finalStudyFormat?.includes('ONLINE') ? '-O' : '';

      updateData.name = `${gradeCode}${langCode}${timeCode}${branchCode}-${indexName}${formatSuffix}`;
    }

    const item = await prisma.group.update({
      where: { id },
      data: updateData,
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
            subject: { select: { id: true, nameRu: true, nameKz: true } },
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
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // First delete related records
    await prisma.groupSubject.deleteMany({ where: { groupId: id } });
    await prisma.groupStudent.deleteMany({ where: { groupId: id } });

    // Then delete the group
    await prisma.group.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
