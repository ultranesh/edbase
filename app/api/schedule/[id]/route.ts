import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

// PATCH - Update schedule slot
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allowedRoles: UserRole[] = [UserRole.COORDINATOR, UserRole.ADMIN, UserRole.SUPERADMIN];
    if (!allowedRoles.includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await request.json();

    const slot = await prisma.scheduleSlot.update({
      where: { id },
      data: {
        groupId: data.groupId || null,
        teacherId: data.teacherId || null,
        subject: data.subject,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        color: data.color,
        notes: data.notes,
        isRecurring: data.isRecurring,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
      include: {
        branch: true,
        classroom: true,
        group: {
          include: {
            course: true,
          },
        },
        teacher: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                middleName: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(slot);
  } catch (error) {
    console.error('Update schedule slot error:', error);
    return NextResponse.json(
      { error: 'Failed to update schedule slot' },
      { status: 500 }
    );
  }
}

// DELETE - Delete schedule slot
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    console.log('=== Deleting schedule slot ===');
    console.log('Slot ID:', id);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allowedRoles: UserRole[] = [UserRole.COORDINATOR, UserRole.ADMIN, UserRole.SUPERADMIN];
    if (!allowedRoles.includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // First check if slot exists
    const existingSlot = await prisma.scheduleSlot.findUnique({
      where: { id },
    });

    if (!existingSlot) {
      console.log('Slot not found in database');
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 });
    }

    console.log('Slot found, deleting:', JSON.stringify(existingSlot, null, 2));

    // Store group and subject info before deleting
    const groupId = existingSlot.groupId;
    const subject = existingSlot.subject;

    await prisma.scheduleSlot.delete({
      where: { id },
    });

    console.log('Slot deleted successfully');

    // Update isScheduled flag for the group subject after deletion
    if (groupId && subject) {
      await updateGroupSubjectScheduledStatus(groupId, subject);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete schedule slot error:', error);
    return NextResponse.json(
      { error: 'Failed to delete schedule slot' },
      { status: 500 }
    );
  }
}

// Helper function to update isScheduled status for a group subject
async function updateGroupSubjectScheduledStatus(groupId: string, subjectName: string) {
  try {
    const groupSubject = await prisma.groupSubject.findFirst({
      where: {
        groupId: groupId,
        subject: {
          name: subjectName,
        },
      },
      include: {
        subject: true,
      },
    });

    if (!groupSubject) return;

    // Calculate total scheduled hours for this subject
    const timeToMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const existingScheduleSlots = await prisma.scheduleSlot.findMany({
      where: {
        groupId: groupId,
        subject: subjectName,
      },
    });

    let totalScheduledHours = 0;
    for (const slot of existingScheduleSlots) {
      const slotMinutes = timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime);
      totalScheduledHours += slotMinutes / 60;
    }

    // Update isScheduled flag - true if all hours are scheduled
    const isFullyScheduled = totalScheduledHours >= groupSubject.hoursPerWeek;

    await prisma.groupSubject.update({
      where: { id: groupSubject.id },
      data: { isScheduled: isFullyScheduled },
    });

    console.log(`Updated ${subjectName} isScheduled: ${isFullyScheduled} (${totalScheduledHours}/${groupSubject.hoursPerWeek} hours)`);
  } catch (error) {
    console.error('Error updating group subject scheduled status:', error);
  }
}
