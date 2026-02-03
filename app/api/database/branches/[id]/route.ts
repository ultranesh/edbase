import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Transliterate first character of Cyrillic text to Latin
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

// Generate group name from its components
const generateGroupName = (group: {
  gradeLevel?: { code: string | null } | null;
  language?: { code: string | null } | null;
  groupIndex?: { name: string } | null;
  branch?: { code: string | null; name: string } | null;
  timeOfDay: string | null;
  studyFormat: string | null;
}): string => {
  const gradeCode = group.gradeLevel?.code || '?';
  const langCode = group.language?.code || '?';
  const branchCode = group.branch ? (group.branch.code || transliterate(group.branch.name)) : '';
  const timeCode = group.timeOfDay === 'MORNING' ? 'M' : group.timeOfDay === 'AFTERNOON' ? 'A' : group.timeOfDay === 'EVENING' ? 'E' : '?';
  const indexName = group.groupIndex?.name || '???';
  const formatSuffix = group.studyFormat?.includes('ONLINE') ? '-O' : '';

  return `${gradeCode}${langCode}${branchCode}${timeCode}-${indexName}${formatSuffix}`;
};

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await request.json();

    // Get old branch data to check if code changed
    const oldBranch = await prisma.branch.findUnique({ where: { id } });

    // Update branch
    const item = await prisma.branch.update({
      where: { id },
      data: {
        name: data.name,
        nameKz: data.nameKz ?? undefined,
        nameRu: data.nameRu ?? undefined,
        nameEn: data.nameEn ?? undefined,
        code: data.code,
        address: data.address,
        latitude: data.latitude ?? undefined,
        longitude: data.longitude ?? undefined,
        isActive: data.isActive,
      }
    });

    // If code or name changed, update all group names for this branch
    if (oldBranch && (oldBranch.code !== data.code || oldBranch.name !== data.name)) {
      const groups = await prisma.group.findMany({
        where: { branchId: id },
        include: {
          gradeLevel: true,
          language: true,
          groupIndex: true,
          branch: true,
        }
      });

      // Update each group's name
      for (const group of groups) {
        const newName = generateGroupName(group);
        await prisma.group.update({
          where: { id: group.id },
          data: { name: newName }
        });
      }
    }

    return NextResponse.json(item);
  } catch (error: unknown) {
    console.error('Branch update error:', error);
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Филиал с таким названием уже существует' }, { status: 400 });
      }
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Филиал не найден' }, { status: 404 });
      }
    }
    return NextResponse.json({ error: 'Не удалось сохранить филиал' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.branch.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
