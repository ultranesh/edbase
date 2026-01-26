import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Save blank check result (manual or scanned)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { studentName, studentClass, answers, scannedImageUrl, answerKey } = body;

    // Get the test and verify ownership
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

    // Validate answers array
    if (!Array.isArray(answers)) {
      return NextResponse.json({ error: 'Invalid answers format' }, { status: 400 });
    }

    const taskIds = test.taskIds as string[];
    const totalQuestions = taskIds.length;

    // Use provided answer key or fetch from tasks
    let correctAnswers: (number | null)[];

    if (answerKey && Array.isArray(answerKey)) {
      // Use teacher-provided answer key
      correctAnswers = answerKey;
    } else {
      // Fetch correct answers from tasks
      const tasks = await prisma.task.findMany({
        where: { id: { in: taskIds } },
        select: { id: true, correctAnswer: true },
      });

      // Create a map for quick lookup and build answers array in taskIds order
      const correctAnswersMap = new Map(tasks.map(t => [t.id, t.correctAnswer]));
      correctAnswers = taskIds.map(taskId => correctAnswersMap.get(taskId) ?? null);
    }

    // Calculate score - answers are in the same order as taskIds
    let correctCount = 0;
    for (let i = 0; i < totalQuestions; i++) {
      const correctAnswer = correctAnswers[i];
      const studentAnswer = answers[i];

      if (studentAnswer !== null && correctAnswer !== null && studentAnswer === correctAnswer) {
        correctCount++;
      }
    }

    const percentage = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

    // Save the result
    const result = await prisma.blankResult.create({
      data: {
        generatedTestId: id,
        studentName: studentName || null,
        studentClass: studentClass || null,
        answers: answers,
        correctCount,
        totalQuestions,
        percentage,
        scannedImageUrl: scannedImageUrl || null,
      },
    });

    return NextResponse.json({
      success: true,
      result: {
        id: result.id,
        correctCount,
        totalQuestions,
        percentage,
      },
    });
  } catch (error) {
    console.error('Error saving blank result:', error);
    return NextResponse.json({ error: 'Failed to save result' }, { status: 500 });
  }
}
