import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Add student to group
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: groupId } = await params;
    const { studentId } = await request.json();

    // Check if group exists and has capacity
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        students: true,
        gradeLevel: true,
        language: true,
        studyDirection: true,
      },
    });

    if (!group) {
      return NextResponse.json({ error: 'Группа не найдена' }, { status: 404 });
    }

    if (group.students.length >= group.maxStudents) {
      return NextResponse.json({ error: 'Группа заполнена' }, { status: 400 });
    }

    // Check if student matches group parameters
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        gradeLevel: true,
        language: true,
        studyDirection: true,
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Ученик не найден' }, { status: 404 });
    }

    // Validate match (optional - can be strict or loose)
    const warnings: string[] = [];
    if (group.gradeLevelId && student.gradeLevelId !== group.gradeLevelId) {
      warnings.push('Класс ученика не совпадает с группой');
    }
    if (group.languageId && student.languageId !== group.languageId) {
      warnings.push('Язык обучения не совпадает');
    }
    if (group.studyDirectionId && student.studyDirectionId !== group.studyDirectionId) {
      warnings.push('Направление обучения не совпадает');
    }

    // Create connection
    const groupStudent = await prisma.groupStudent.create({
      data: {
        groupId,
        studentId,
      },
      include: {
        student: {
          select: {
            id: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    return NextResponse.json({ ...groupStudent, warnings });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to add student' }, { status: 500 });
  }
}

// Remove student from group
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: groupId } = await params;
    const { studentId } = await request.json();

    await prisma.groupStudent.delete({
      where: {
        groupId_studentId: {
          groupId,
          studentId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to remove student' }, { status: 500 });
  }
}
