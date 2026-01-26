import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subjectId');
    const gradeLevel = searchParams.get('gradeLevel');

    if (!subjectId) {
      return NextResponse.json(
        { error: 'Subject ID is required' },
        { status: 400 }
      );
    }

    const where: Record<string, unknown> = {
      subjectId,
      isActive: true,
    };

    if (gradeLevel) {
      where.gradeLevel = parseInt(gradeLevel);
    }

    const topics = await prisma.topic.findMany({
      where: {
        ...where,
        parentId: null, // Only get top-level topics
      },
      include: {
        _count: {
          select: {
            tasks: true,
          },
        },
        children: {
          where: { isActive: true },
          include: {
            _count: {
              select: {
                tasks: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json(topics);
  } catch (error) {
    console.error('Get topics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch topics' },
      { status: 500 }
    );
  }
}
