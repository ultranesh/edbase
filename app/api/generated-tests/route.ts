import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - получить список сгенерированных тестов пользователя
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'my' | 'shared'
    const isDiagnosticParam = searchParams.get('isDiagnostic'); // 'true' | 'false'
    const isDiagnostic = isDiagnosticParam === 'true';

    if (type === 'shared') {
      // Получить тесты, которыми поделились с пользователем
      const sharedTests = await prisma.generatedTestShare.findMany({
        where: {
          sharedWithId: session.user.id,
          generatedTest: {
            isDiagnostic,
          },
        },
        include: {
          generatedTest: {
            include: {
              subject: true,
              createdBy: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json(
        sharedTests.map((share) => ({
          ...share.generatedTest,
          canEdit: share.canEdit,
          sharedAt: share.createdAt,
        }))
      );
    } else {
      // Получить собственные тесты пользователя
      const myTests = await prisma.generatedTest.findMany({
        where: {
          createdById: session.user.id,
          isDiagnostic,
        },
        include: {
          subject: true,
          sharedWith: {
            include: {
              sharedWith: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json(myTests);
    }
  } catch (error) {
    console.error('Error fetching generated tests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch generated tests' },
      { status: 500 }
    );
  }
}

// POST - создать новый сгенерированный тест
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const {
      title,
      titleKz,
      titleEn,
      format, // TEST | EXAM
      subjectId,
      gradeLevel,
      duration,
      topicIds, // массив ID тем
      difficultyConfig, // { easy: 5, medium: 10, hard: 5 }
      topicConfig, // { [topicId]: quantity } - сколько заданий с каждой темы
      isDiagnostic, // true = diagnostic test, false = regular test
    } = data;

    if (!subjectId || !gradeLevel) {
      return NextResponse.json(
        { error: 'Subject and grade level are required' },
        { status: 400 }
      );
    }

    // Построим where условие для поиска заданий
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const taskWhere: any = {
      subjectId,
      gradeLevel,
      isActive: true,
      isPublic: true,
    };

    if (topicIds && topicIds.length > 0) {
      taskWhere.topicId = { in: topicIds };
    }

    // Получим все доступные задания
    const availableTasks = await prisma.task.findMany({
      where: taskWhere,
      include: {
        subtopic: {
          include: {
            topic: true,
          },
        },
      },
    });

    if (availableTasks.length === 0) {
      return NextResponse.json(
        { error: 'No tasks available for the specified criteria' },
        { status: 400 }
      );
    }

    // Разбиваем задания по сложности (mapping DifficultyLevel enum to easy/medium/hard)
    const easyLevels = ['BEGINNER', 'ELEMENTARY'];
    const mediumLevels = ['PRE_INTERMEDIATE', 'INTERMEDIATE'];
    const hardLevels = ['UPPER_INTERMEDIATE', 'ADVANCED'];
    const tasksByDifficulty = {
      easy: availableTasks.filter((t) => easyLevels.includes(t.difficultyLevel)),
      medium: availableTasks.filter((t) => mediumLevels.includes(t.difficultyLevel)),
      hard: availableTasks.filter((t) => hardLevels.includes(t.difficultyLevel)),
    };

    // Разбиваем задания по темам (using subtopicId)
    const tasksByTopic: { [key: string]: typeof availableTasks } = {};
    availableTasks.forEach((task) => {
      if (task.subtopicId) {
        if (!tasksByTopic[task.subtopicId]) {
          tasksByTopic[task.subtopicId] = [];
        }
        tasksByTopic[task.subtopicId].push(task);
      }
    });

    // Собираем итоговый набор заданий
    const selectedTaskIds: string[] = [];
    const usedTaskIds = new Set<string>();

    // Сначала выбираем по темам, если указан topicConfig
    if (topicConfig && Object.keys(topicConfig).length > 0) {
      for (const [topicId, quantity] of Object.entries(topicConfig)) {
        const topicTasks = tasksByTopic[topicId] || [];
        const shuffled = topicTasks
          .filter((t) => !usedTaskIds.has(t.id))
          .sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, quantity as number);
        selected.forEach((t) => {
          selectedTaskIds.push(t.id);
          usedTaskIds.add(t.id);
        });
      }
    }

    // Затем добавляем по сложности, если указан difficultyConfig
    if (difficultyConfig) {
      const { easy = 0, medium = 0, hard = 0 } = difficultyConfig;

      // Easy tasks
      const easyTasks = tasksByDifficulty.easy
        .filter((t) => !usedTaskIds.has(t.id))
        .sort(() => Math.random() - 0.5)
        .slice(0, easy);
      easyTasks.forEach((t) => {
        selectedTaskIds.push(t.id);
        usedTaskIds.add(t.id);
      });

      // Medium tasks
      const mediumTasks = tasksByDifficulty.medium
        .filter((t) => !usedTaskIds.has(t.id))
        .sort(() => Math.random() - 0.5)
        .slice(0, medium);
      mediumTasks.forEach((t) => {
        selectedTaskIds.push(t.id);
        usedTaskIds.add(t.id);
      });

      // Hard tasks
      const hardTasks = tasksByDifficulty.hard
        .filter((t) => !usedTaskIds.has(t.id))
        .sort(() => Math.random() - 0.5)
        .slice(0, hard);
      hardTasks.forEach((t) => {
        selectedTaskIds.push(t.id);
        usedTaskIds.add(t.id);
      });
    }

    // Если ни topicConfig, ни difficultyConfig не указаны, берем все задания случайно
    if (selectedTaskIds.length === 0) {
      const totalTasks = data.taskCount || 20;
      const shuffled = availableTasks.sort(() => Math.random() - 0.5);
      shuffled.slice(0, totalTasks).forEach((t) => selectedTaskIds.push(t.id));
    }

    if (selectedTaskIds.length === 0) {
      return NextResponse.json(
        { error: 'Could not select any tasks with the given criteria' },
        { status: 400 }
      );
    }

    // Получим информацию о предмете для названия
    const subject = await prisma.taskSubject.findUnique({
      where: { id: subjectId },
    });

    // Создаем GeneratedTest
    const generatedTest = await prisma.generatedTest.create({
      data: {
        title: title || `${subject?.name || 'Тест'} - ${gradeLevel} класс`,
        titleKz: titleKz || null,
        titleEn: titleEn || null,
        format: format || 'TEST',
        subjectId,
        gradeLevel,
        createdById: session.user.id,
        duration: duration || selectedTaskIds.length * 2,
        taskIds: selectedTaskIds,
        topicIds: topicIds || null,
        difficultyConfig: difficultyConfig || null,
        isDiagnostic: isDiagnostic || false,
      },
      include: {
        subject: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        test: generatedTest,
        taskCount: selectedTaskIds.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating generated test:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to create generated test: ${errorMessage}` },
      { status: 500 }
    );
  }
}
