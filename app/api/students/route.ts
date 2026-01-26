import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { StudentStatus } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const gradeLevelId = searchParams.get('gradeLevelId');
    const languageId = searchParams.get('languageId');
    const studyDirectionId = searchParams.get('studyDirectionId');

    const where: Record<string, unknown> = {};

    // Filter by status (default: active students only)
    if (status) {
      where.status = status as StudentStatus;
    } else {
      where.status = { not: StudentStatus.PENDING_APPROVAL };
    }

    // Filter by parameters (for matching groups)
    if (gradeLevelId) where.gradeLevelId = gradeLevelId;
    if (languageId) where.languageId = languageId;
    if (studyDirectionId) where.studyDirectionId = studyDirectionId;

    const students = await prisma.student.findMany({
      where,
      select: {
        id: true,
        status: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        gradeLevel: { select: { id: true, name: true, code: true } },
        language: { select: { id: true, name: true, code: true } },
        studyDirection: { select: { id: true, name: true, code: true } },
        city: { select: { id: true, name: true } },
        school: { select: { id: true, name: true } },
        subjects: {
          select: {
            subject: { select: { id: true, name: true } },
          },
        },
        groupStudents: {
          select: {
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        user: { lastName: 'asc' },
      },
    });

    return NextResponse.json(students);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
  }
}
