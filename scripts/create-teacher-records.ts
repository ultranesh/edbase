import { prisma } from '../lib/prisma';
import { UserRole } from '@prisma/client';

async function createTeacherRecords() {
  try {
    // Find all users with TEACHER role
    const teacherUsers = await prisma.user.findMany({
      where: {
        role: UserRole.TEACHER,
      },
      include: {
        teacher: true,
      },
    });

    console.log(`Found ${teacherUsers.length} teacher users`);

    // Create Teacher records for users who don't have one
    for (const user of teacherUsers) {
      if (!user.teacher) {
        console.log(`Creating Teacher record for ${user.firstName} ${user.lastName}`);
        await prisma.teacher.create({
          data: {
            userId: user.id,
            specialization: [],
            subjects: [],
            branches: [],
            category: 'NO_CATEGORY',
            isActive: true,
          },
        });
      } else {
        console.log(`Teacher record already exists for ${user.firstName} ${user.lastName}`);
      }
    }

    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTeacherRecords();
