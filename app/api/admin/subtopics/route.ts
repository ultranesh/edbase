import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

// GET - Fetch all subtopics for a topic
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const topicId = searchParams.get('topicId');

    const where = topicId ? { topicId } : {};

    const subtopics = await prisma.taskSubtopic.findMany({
      where,
      orderBy: { orderIndex: 'asc' },
    });

    return NextResponse.json(subtopics);
  } catch (error) {
    console.error('Get subtopics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subtopics' },
      { status: 500 }
    );
  }
}

// POST - Create new subtopic
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await request.json();

    // Get max order index for this topic
    const maxOrder = await prisma.taskSubtopic.findFirst({
      where: { topicId: data.topicId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });

    const subtopic = await prisma.taskSubtopic.create({
      data: {
        topicId: data.topicId,
        name: data.name,
        nameRu: data.nameRu,
        nameKz: data.nameKz,
        nameEn: data.nameEn,
        orderIndex: (maxOrder?.orderIndex || 0) + 1,
        isActive: true,
      },
    });

    return NextResponse.json(subtopic);
  } catch (error) {
    console.error('Create subtopic error:', error);
    return NextResponse.json(
      { error: 'Failed to create subtopic' },
      { status: 500 }
    );
  }
}
