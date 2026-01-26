import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Get subjects for group
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: groupId } = await params;

    const subjects = await prisma.groupSubject.findMany({
      where: { groupId },
      include: {
        subject: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(subjects);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

// Add/update subject in group
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: groupId } = await params;
    const { subjectId, hoursPerWeek } = await request.json();

    // Check total hours constraint (max 9 hours per week)
    const existingSubjects = await prisma.groupSubject.findMany({
      where: { groupId, NOT: { subjectId } },
    });

    const currentTotalHours = existingSubjects.reduce((sum, s) => sum + s.hoursPerWeek, 0);
    if (currentTotalHours + hoursPerWeek > 9) {
      return NextResponse.json(
        { error: `Превышен лимит часов в неделю. Доступно: ${9 - currentTotalHours} ч.` },
        { status: 400 }
      );
    }

    // Upsert subject
    const groupSubject = await prisma.groupSubject.upsert({
      where: {
        groupId_subjectId: { groupId, subjectId },
      },
      update: {
        hoursPerWeek,
        totalHours: hoursPerWeek * 4 * 9, // 9 months
      },
      create: {
        groupId,
        subjectId,
        hoursPerWeek,
        totalHours: hoursPerWeek * 4 * 9,
      },
      include: {
        subject: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(groupSubject);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to add subject' }, { status: 500 });
  }
}

// Remove subject from group
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: groupId } = await params;
    const { subjectId } = await request.json();

    await prisma.groupSubject.delete({
      where: {
        groupId_subjectId: { groupId, subjectId },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to remove subject' }, { status: 500 });
  }
}

// Update scheduled status
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: groupId } = await params;
    const { subjectId, isScheduled } = await request.json();

    const groupSubject = await prisma.groupSubject.update({
      where: {
        groupId_subjectId: { groupId, subjectId },
      },
      data: { isScheduled },
      include: {
        subject: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(groupSubject);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
