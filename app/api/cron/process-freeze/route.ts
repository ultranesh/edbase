import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { StudentStatus } from '@prisma/client';

// Vercel Cron calls GET, so we use GET method
// This endpoint should be called daily by a cron job
export async function GET(request: Request) {
  try {
    // Verify cron secret for security (optional - for Vercel Cron)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Get all frozen students
    const frozenStudents = await prisma.student.findMany({
      where: {
        status: StudentStatus.FROZEN,
        freezeEndDate: {
          not: null,
        },
      },
    });

    const now = new Date();
    const updates = [];

    for (const student of frozenStudents) {
      if (!student.freezeEndDate) continue;

      // Check if freeze period has ended
      if (now >= student.freezeEndDate) {
        // Automatically unfreeze the student
        updates.push(
          prisma.student.update({
            where: { id: student.id },
            data: {
              status: StudentStatus.ACTIVE,
              freezeEndDate: null,
            },
          })
        );
      } else {
        // Still frozen - decrement freezeDays and extend studyEndDate by 1 day
        const updateData: any = {};

        if (student.freezeDays > 0) {
          updateData.freezeDays = Math.max(0, student.freezeDays - 1);
        }

        // Extend studyEndDate by 1 day
        if (student.studyEndDate) {
          const newStudyEndDate = new Date(student.studyEndDate);
          newStudyEndDate.setDate(newStudyEndDate.getDate() + 1);
          updateData.studyEndDate = newStudyEndDate;
        }

        if (Object.keys(updateData).length > 0) {
          updates.push(
            prisma.student.update({
              where: { id: student.id },
              data: updateData,
            })
          );
        }
      }
    }

    // Execute all updates
    await Promise.all(updates);

    return NextResponse.json({
      success: true,
      processed: frozenStudents.length,
      updated: updates.length,
    });
  } catch (error) {
    console.error('Process freeze error:', error);
    return NextResponse.json(
      { error: 'Failed to process freeze' },
      { status: 500 }
    );
  }
}
