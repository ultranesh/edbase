import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Get all results for a test
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

    // Fetch all results for this test
    const results = await prisma.blankResult.findMany({
      where: { generatedTestId: id },
      orderBy: { scannedAt: 'desc' },
      select: {
        id: true,
        studentName: true,
        studentClass: true,
        answers: true,
        correctCount: true,
        totalQuestions: true,
        percentage: true,
        scannedAt: true,
      },
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error fetching results:', error);
    return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 });
  }
}

// Delete a specific result
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
    const { searchParams } = new URL(request.url);
    const resultId = searchParams.get('resultId');

    if (!resultId) {
      return NextResponse.json({ error: 'Result ID required' }, { status: 400 });
    }

    // Get the test and verify ownership
    const test = await prisma.generatedTest.findUnique({
      where: { id },
    });

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Only owner can delete results
    if (test.createdById !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete the result
    await prisma.blankResult.delete({
      where: { id: resultId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting result:', error);
    return NextResponse.json({ error: 'Failed to delete result' }, { status: 500 });
  }
}
