import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subjectId');

    const where: { isActive: boolean; subjectId?: string } = { isActive: true };
    if (subjectId) {
      where.subjectId = subjectId;
    }

    const topics = await prisma.taskTopic.findMany({
      where,
      orderBy: { orderIndex: 'asc' },
      include: {
        subtopics: {
          where: { isActive: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    return NextResponse.json(topics, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error fetching task topics:', error);
    return NextResponse.json({ error: 'Failed to fetch topics' }, { status: 500 });
  }
}
