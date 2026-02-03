import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PUT - обновить темы задания
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: taskId } = await params;
    const { topicIds } = await request.json();

    if (!Array.isArray(topicIds)) {
      return NextResponse.json({ error: 'topicIds must be an array' }, { status: 400 });
    }

    // Удаляем старые связи
    await prisma.taskSubtopicLink.deleteMany({
      where: { taskId }
    });

    // Создаём новые связи
    if (topicIds.length > 0) {
      // Получаем subtopicId для каждого topicId (первая подтема темы)
      const topics = await prisma.taskTopic.findMany({
        where: { id: { in: topicIds } },
        include: { subtopics: { take: 1 } }
      });

      for (const topic of topics) {
        if (topic.subtopics.length > 0) {
          await prisma.taskSubtopicLink.create({
            data: {
              taskId,
              subtopicId: topic.subtopics[0].id
            }
          });
        }
      }

      // Устанавливаем основную подтему (первую тему)
      const firstTopic = topics[0];
      if (firstTopic?.subtopics.length > 0) {
        await prisma.task.update({
          where: { id: taskId },
          data: { subtopicId: firstTopic.subtopics[0].id }
        });
      }
    } else {
      // Если нет тем, обнуляем subtopicId
      await prisma.task.update({
        where: { id: taskId },
        data: { subtopicId: null }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating task topics:', error);
    return NextResponse.json(
      { error: 'Failed to update task topics' },
      { status: 500 }
    );
  }
}
