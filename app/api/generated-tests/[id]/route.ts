import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - получить тест по ID с заданиями
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const generatedTest = await prisma.generatedTest.findUnique({
      where: { id },
      include: {
        subject: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        sharedWith: {
          where: {
            sharedWithId: session.user.id,
          },
        },
      },
    });

    if (!generatedTest) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Проверяем доступ: создатель или тот, с кем поделились
    const isOwner = generatedTest.createdById === session.user.id;
    const isSharedWith = generatedTest.sharedWith.length > 0;

    if (!isOwner && !isSharedWith) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Получаем задания по их ID
    const taskIds = generatedTest.taskIds as string[];
    const rawTasks = await prisma.task.findMany({
      where: {
        id: { in: taskIds },
      },
      select: {
        id: true,
        questionText: true,
        questionTextKz: true,
        questionTextRu: true,
        questionTextEn: true,
        questionImage: true,
        answerText: true,
        options: true, // JSON field with multi-language options
        correctAnswer: true,
        solutionText: true,
        solutionTextKz: true,
        solutionTextRu: true,
        solutionTextEn: true,
        hints: true,
        hintsKz: true,
        hintsRu: true,
        hintsEn: true,
        difficultyLevel: true,
        subtopic: {
          select: {
            name: true,
            nameKz: true,
            nameRu: true,
            nameEn: true,
            topic: {
              select: {
                name: true,
                nameKz: true,
                nameRu: true,
                nameEn: true,
              },
            },
          },
        },
        // Получаем все связанные подтемы через many-to-many
        subtopics: {
          select: {
            subtopic: {
              select: {
                id: true,
                name: true,
                nameKz: true,
                nameRu: true,
                nameEn: true,
                topic: {
                  select: {
                    id: true,
                    name: true,
                    nameKz: true,
                    nameRu: true,
                    nameEn: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Parse answer text like "A) 52 B) 62 C) 72 D) 82" into options array
    const parseAnswerText = (answerText: string | null): { options: string[]; correctAnswer: number } => {
      if (!answerText) {
        return { options: ['A', 'B', 'C', 'D', 'E'], correctAnswer: 0 };
      }
      const optionRegex = /([A-E])\)\s*([^A-E)]+?)(?=\s*[A-E]\)|$)/gi;
      const matches = [...answerText.matchAll(optionRegex)];
      if (matches.length > 0) {
        const options = matches.map(m => m[2].trim());
        return { options, correctAnswer: 0 };
      }
      const parts = answerText.split(/[;,|]/).map(s => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        return { options: parts, correctAnswer: 0 };
      }
      return { options: [answerText], correctAnswer: 0 };
    };

    // Map difficulty level enum to number
    const mapDifficulty = (level: string): number => {
      switch (level) {
        case 'ELEMENTARY': return 1;
        case 'INTERMEDIATE': return 2;
        case 'ADVANCED': return 3;
        default: return 2;
      }
    };

    // Transform tasks to expected format with multi-language support
    const tasks = rawTasks.map(task => {
      // Check if task has new multi-language options format
      const hasMultiLangOptions = task.options && Array.isArray(task.options);

      let options: string[];
      let optionsKz: string[];
      let optionsRu: string[];
      let optionsEn: string[];
      let correctAnswerIndex: number;

      if (hasMultiLangOptions) {
        // New format: options is JSON array with {kz, ru, en} objects
        const multiLangOptions = task.options as Array<{ kz?: string; ru?: string; en?: string }>;
        optionsKz = multiLangOptions.map(o => o.kz || o.ru || '');
        optionsRu = multiLangOptions.map(o => o.ru || o.kz || '');
        optionsEn = multiLangOptions.map(o => o.en || o.ru || o.kz || '');
        options = optionsRu; // Default to Russian
        correctAnswerIndex = task.correctAnswer ?? 0;
      } else {
        // Legacy format: parse from answerText
        const parsed = parseAnswerText(task.answerText);
        options = parsed.options;
        optionsKz = parsed.options;
        optionsRu = parsed.options;
        optionsEn = parsed.options;
        correctAnswerIndex = parsed.correctAnswer;
      }

      return {
        id: task.id,
        question: task.questionTextRu || task.questionText,
        questionKz: task.questionTextKz || task.questionText,
        questionRu: task.questionTextRu || task.questionText,
        questionEn: task.questionTextEn || task.questionTextRu || task.questionText,
        questionImage: task.questionImage || null,
        options,
        optionsKz,
        optionsRu,
        optionsEn,
        correctAnswer: correctAnswerIndex,
        explanation: task.solutionTextRu || task.solutionText || null,
        explanationKz: task.solutionTextKz || task.solutionText || null,
        explanationRu: task.solutionTextRu || task.solutionText || null,
        explanationEn: task.solutionTextEn || task.solutionTextRu || task.solutionText || null,
        hint: task.hintsRu?.[0] || task.hints?.[0] || null,
        hintKz: task.hintsKz?.[0] || task.hints?.[0] || null,
        hintRu: task.hintsRu?.[0] || task.hints?.[0] || null,
        hintEn: task.hintsEn?.[0] || task.hintsRu?.[0] || task.hints?.[0] || null,
        difficulty: mapDifficulty(task.difficultyLevel),
        topic: task.subtopic?.topic ? {
          name: task.subtopic.topic.name,
          nameKz: task.subtopic.topic.nameKz,
          nameRu: task.subtopic.topic.nameRu,
          nameEn: task.subtopic.topic.nameEn,
        } : task.subtopic ? {
          name: task.subtopic.name,
          nameKz: task.subtopic.nameKz,
          nameRu: task.subtopic.nameRu,
          nameEn: task.subtopic.nameEn,
        } : null,
        // Все связанные темы и подтемы
        linkedSubtopics: task.subtopics?.map(link => ({
          id: link.subtopic.id,
          name: link.subtopic.name,
          nameKz: link.subtopic.nameKz,
          nameRu: link.subtopic.nameRu,
          nameEn: link.subtopic.nameEn,
          topic: link.subtopic.topic ? {
            id: link.subtopic.topic.id,
            name: link.subtopic.topic.name,
            nameKz: link.subtopic.topic.nameKz,
            nameRu: link.subtopic.topic.nameRu,
            nameEn: link.subtopic.topic.nameEn,
          } : null,
        })) || [],
      };
    });

    // Сортируем задания в том порядке, в котором они хранятся
    const orderedTasks = taskIds.map((taskId) =>
      tasks.find((t) => t.id === taskId)
    ).filter(Boolean);

    return NextResponse.json({
      ...generatedTest,
      tasks: orderedTasks,
      isOwner,
    });
  } catch (error) {
    console.error('Error fetching generated test:', error);
    return NextResponse.json(
      { error: 'Failed to fetch generated test' },
      { status: 500 }
    );
  }
}

// PUT - обновить тест
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();

    // Проверяем, что пользователь - создатель теста
    const existingTest = await prisma.generatedTest.findUnique({
      where: { id },
      include: {
        sharedWith: {
          where: {
            sharedWithId: session.user.id,
            canEdit: true,
          },
        },
      },
    });

    if (!existingTest) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    const isOwner = existingTest.createdById === session.user.id;
    const canEdit = existingTest.sharedWith.length > 0;

    if (!isOwner && !canEdit) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const updatedTest = await prisma.generatedTest.update({
      where: { id },
      data: {
        title: data.title ?? existingTest.title,
        titleKz: data.titleKz ?? existingTest.titleKz,
        titleEn: data.titleEn ?? existingTest.titleEn,
        format: data.format ?? existingTest.format,
        duration: data.duration ?? existingTest.duration,
        isShared: data.isShared ?? existingTest.isShared,
      },
      include: {
        subject: true,
      },
    });

    return NextResponse.json(updatedTest);
  } catch (error) {
    console.error('Error updating generated test:', error);
    return NextResponse.json(
      { error: 'Failed to update generated test' },
      { status: 500 }
    );
  }
}

// DELETE - удалить тест
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Проверяем, что пользователь - создатель теста
    const existingTest = await prisma.generatedTest.findUnique({
      where: { id },
    });

    if (!existingTest) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    if (existingTest.createdById !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await prisma.generatedTest.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting generated test:', error);
    return NextResponse.json(
      { error: 'Failed to delete generated test' },
      { status: 500 }
    );
  }
}
