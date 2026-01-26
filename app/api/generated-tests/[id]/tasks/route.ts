import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Parse answer text like "A) 52 B) 62 C) 72 D) 82" into options array
function parseAnswerText(answerText: string | null): { options: string[]; correctAnswer: number } {
  if (!answerText) {
    return { options: ['A', 'B', 'C', 'D', 'E'], correctAnswer: 0 };
  }

  // Try to extract options from format like "A) text B) text C) text D) text"
  const optionRegex = /([A-E])\)\s*([^A-E)]+?)(?=\s*[A-E]\)|$)/gi;
  const matches = [...answerText.matchAll(optionRegex)];

  if (matches.length > 0) {
    const options = matches.map(m => m[2].trim());
    // First option is typically the correct answer in this format
    return { options, correctAnswer: 0 };
  }

  // Fallback: split by common delimiters
  const parts = answerText.split(/[;,|]/).map(s => s.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { options: parts, correctAnswer: 0 };
  }

  // Last fallback
  return { options: [answerText], correctAnswer: 0 };
}

// Map difficulty level enum to number
function mapDifficulty(level: string): number {
  switch (level) {
    case 'ELEMENTARY': return 1;
    case 'INTERMEDIATE': return 2;
    case 'ADVANCED': return 3;
    default: return 2;
  }
}

// Get tasks with topics for a generated test
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

    // Get the test and verify ownership/access
    const test = await prisma.generatedTest.findUnique({
      where: { id },
      include: {
        sharedWith: {
          where: { sharedWithId: session.user.id },
        },
      },
    });

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Check if user owns the test or has access
    const isOwner = test.createdById === session.user.id;
    const hasAccess = test.sharedWith.length > 0;

    if (!isOwner && !hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const taskIds = (test.taskIds || []) as string[];

    // Fetch tasks with subtopic -> topic info
    const tasks = await prisma.task.findMany({
      where: { id: { in: taskIds } },
      select: {
        id: true,
        questionText: true,
        answerText: true,
        solutionText: true,
        difficultyLevel: true,
        subtopic: {
          select: {
            name: true,
            nameKz: true,
            topic: {
              select: {
                name: true,
                nameKz: true,
              },
            },
          },
        },
      },
    });

    // Transform to expected format and maintain order
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const orderedTasks = taskIds
      .map(id => taskMap.get(id))
      .filter(Boolean)
      .map(task => {
        const { options, correctAnswer } = parseAnswerText(task!.answerText);
        return {
          id: task!.id,
          question: task!.questionText,
          options,
          correctAnswer,
          explanation: task!.solutionText || null,
          difficulty: mapDifficulty(task!.difficultyLevel),
          topic: task!.subtopic?.topic || task!.subtopic || null,
        };
      });

    return NextResponse.json(orderedTasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}
