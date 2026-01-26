import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

// GET - Fetch schedule slots
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const classroomId = searchParams.get('classroomId');
    const dayOfWeek = searchParams.get('dayOfWeek');

    const where: any = {};
    if (branchId) where.branchId = branchId;
    if (classroomId) where.classroomId = classroomId;
    if (dayOfWeek !== null) where.dayOfWeek = parseInt(dayOfWeek);

    const slots = await prisma.scheduleSlot.findMany({
      where,
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' },
      ],
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

    return NextResponse.json(slots);
  } catch (error) {
    console.error('Get schedule slots error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedule slots' },
      { status: 500 }
    );
  }
}

// POST - Create new schedule slot
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allowedRoles: UserRole[] = [UserRole.COORDINATOR, UserRole.ADMIN, UserRole.SUPERADMIN];
    if (!allowedRoles.includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await request.json();

    console.log('=== Creating schedule slot ===');
    console.log('Request data:', JSON.stringify(data, null, 2));

    // First, let's see what's already in the database for this day/classroom
    const existingSlots = await prisma.scheduleSlot.findMany({
      where: {
        branchId: data.branchId,
        classroomId: data.classroomId,
        dayOfWeek: data.dayOfWeek,
      },
    });

    console.log('Existing slots for this day/classroom:', existingSlots.length);
    existingSlots.forEach((slot, i) => {
      console.log(`  Slot ${i + 1}:`, slot.startTime, '-', slot.endTime);
    });

    // Check for conflicts - two time slots overlap if:
    // 1. New slot starts before existing ends AND new slot ends after existing starts
    const whereClause = {
      branchId: data.branchId,
      classroomId: data.classroomId,
      dayOfWeek: data.dayOfWeek,
      AND: [
        { startTime: { lt: data.endTime } },
        { endTime: { gt: data.startTime } },
      ],
    };

    console.log('Conflict check WHERE clause:', JSON.stringify(whereClause, null, 2));

    const conflict = await prisma.scheduleSlot.findFirst({
      where: whereClause,
    });

    console.log('Conflict check result:', conflict ? 'CONFLICT FOUND' : 'NO CONFLICT');
    if (conflict) {
      console.log('Conflicting slot:', JSON.stringify(conflict, null, 2));
    }

    if (conflict) {
      return NextResponse.json(
        { error: 'Time slot conflict detected', conflict },
        { status: 400 }
      );
    }

    // Check subject hours limit if group and subject are provided
    if (data.groupId && data.subject) {
      // Get the group's subject configuration
      const groupSubject = await prisma.groupSubject.findFirst({
        where: {
          groupId: data.groupId,
          subject: {
            name: data.subject,
          },
        },
        include: {
          subject: true,
        },
      });

      if (groupSubject) {
        // Calculate hours for the new slot (in 30-minute increments)
        const timeToMinutes = (time: string) => {
          const [hours, minutes] = time.split(':').map(Number);
          return hours * 60 + minutes;
        };
        const newSlotMinutes = timeToMinutes(data.endTime) - timeToMinutes(data.startTime);
        const newSlotHours = newSlotMinutes / 60;

        // Get all existing schedule slots for this group and subject
        const existingScheduleSlots = await prisma.scheduleSlot.findMany({
          where: {
            groupId: data.groupId,
            subject: data.subject,
          },
        });

        // Calculate total scheduled hours
        let totalScheduledHours = 0;
        for (const slot of existingScheduleSlots) {
          const slotMinutes = timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime);
          totalScheduledHours += slotMinutes / 60;
        }

        const maxHoursPerWeek = groupSubject.hoursPerWeek;
        const newTotalHours = totalScheduledHours + newSlotHours;

        console.log(`Subject hours check: ${data.subject} - scheduled: ${totalScheduledHours}h, new: ${newSlotHours}h, max: ${maxHoursPerWeek}h`);

        if (newTotalHours > maxHoursPerWeek) {
          return NextResponse.json(
            {
              error: `Превышен лимит часов для предмета "${data.subject}". Максимум: ${maxHoursPerWeek} ч/нед, уже запланировано: ${totalScheduledHours} ч, новое занятие: ${newSlotHours} ч`,
              details: {
                subject: data.subject,
                maxHours: maxHoursPerWeek,
                scheduledHours: totalScheduledHours,
                newSlotHours: newSlotHours,
              }
            },
            { status: 400 }
          );
        }
      }
    }

    const slot = await prisma.scheduleSlot.create({
      data: {
        branchId: data.branchId,
        classroomId: data.classroomId,
        groupId: data.groupId || null,
        teacherId: data.teacherId || null,
        subject: data.subject || null,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        color: data.color || '#3B82F6',
        notes: data.notes || null,
        isRecurring: data.isRecurring !== false,
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

    // Update isScheduled flag for the group subject if all hours are now scheduled
    if (data.groupId && data.subject) {
      await updateGroupSubjectScheduledStatus(data.groupId, data.subject);
    }

    return NextResponse.json(slot);
  } catch (error) {
    console.error('Create schedule slot error:', error);
    return NextResponse.json(
      { error: 'Failed to create schedule slot' },
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
