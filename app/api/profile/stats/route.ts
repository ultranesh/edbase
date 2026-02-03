import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

interface Achievement {
  id: string;
  titleKey: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  unlocked: boolean;
  progress: number;
  currentValue: number;
  targetValue: number;
}

function computeStudentAchievements(stats: Record<string, number>): Achievement[] {
  const achievements: Achievement[] = [];

  achievements.push({
    id: 'firstTest',
    titleKey: 'achievement.firstTest',
    icon: '\u{1F4DD}',
    tier: 'bronze',
    unlocked: stats.testsCompleted >= 1,
    progress: Math.min(100, (stats.testsCompleted / 1) * 100),
    currentValue: stats.testsCompleted,
    targetValue: 1,
  });

  achievements.push({
    id: 'testVeteran',
    titleKey: 'achievement.testVeteran',
    icon: '\u{1F3AF}',
    tier: 'silver',
    unlocked: stats.testsCompleted >= 10,
    progress: Math.min(100, (stats.testsCompleted / 10) * 100),
    currentValue: stats.testsCompleted,
    targetValue: 10,
  });

  achievements.push({
    id: 'testMaster',
    titleKey: 'achievement.testMaster',
    icon: '\u{1F3C6}',
    tier: 'gold',
    unlocked: stats.testsCompleted >= 50,
    progress: Math.min(100, (stats.testsCompleted / 50) * 100),
    currentValue: stats.testsCompleted,
    targetValue: 50,
  });

  achievements.push({
    id: 'perfectScore',
    titleKey: 'achievement.perfectScore',
    icon: '\u{1F4AF}',
    tier: 'gold',
    unlocked: stats.hasPerfectScore === 1,
    progress: stats.hasPerfectScore === 1 ? 100 : 0,
    currentValue: stats.hasPerfectScore,
    targetValue: 1,
  });

  achievements.push({
    id: 'homeworkHero5',
    titleKey: 'achievement.homeworkHero',
    icon: '\u{1F4DA}',
    tier: 'bronze',
    unlocked: stats.homeworksDone >= 5,
    progress: Math.min(100, (stats.homeworksDone / 5) * 100),
    currentValue: stats.homeworksDone,
    targetValue: 5,
  });

  achievements.push({
    id: 'homeworkHero20',
    titleKey: 'achievement.homeworkStreak',
    icon: '\u{1F525}',
    tier: 'silver',
    unlocked: stats.homeworksDone >= 20,
    progress: Math.min(100, (stats.homeworksDone / 20) * 100),
    currentValue: stats.homeworksDone,
    targetValue: 20,
  });

  achievements.push({
    id: 'homeworkHero50',
    titleKey: 'achievement.homeworkLegend',
    icon: '\u{2B50}',
    tier: 'gold',
    unlocked: stats.homeworksDone >= 50,
    progress: Math.min(100, (stats.homeworksDone / 50) * 100),
    currentValue: stats.homeworksDone,
    targetValue: 50,
  });

  achievements.push({
    id: 'social50',
    titleKey: 'achievement.socialButterfly',
    icon: '\u{1F4AC}',
    tier: 'bronze',
    unlocked: stats.messagesSent >= 50,
    progress: Math.min(100, (stats.messagesSent / 50) * 100),
    currentValue: stats.messagesSent,
    targetValue: 50,
  });

  achievements.push({
    id: 'social200',
    titleKey: 'achievement.socialStar',
    icon: '\u{1F31F}',
    tier: 'silver',
    unlocked: stats.messagesSent >= 200,
    progress: Math.min(100, (stats.messagesSent / 200) * 100),
    currentValue: stats.messagesSent,
    targetValue: 200,
  });

  achievements.push({
    id: 'earner1000',
    titleKey: 'achievement.earner',
    icon: '\u{1F4B0}',
    tier: 'silver',
    unlocked: stats.currencyEarned >= 1000,
    progress: Math.min(100, (stats.currencyEarned / 1000) * 100),
    currentValue: stats.currencyEarned,
    targetValue: 1000,
  });

  achievements.push({
    id: 'rich5000',
    titleKey: 'achievement.richStudent',
    icon: '\u{1F48E}',
    tier: 'gold',
    unlocked: stats.balance >= 5000,
    progress: Math.min(100, (stats.balance / 5000) * 100),
    currentValue: stats.balance,
    targetValue: 5000,
  });

  achievements.push({
    id: 'earlyBird',
    titleKey: 'achievement.earlyBird',
    icon: '\u{1F426}',
    tier: 'silver',
    unlocked: stats.loginCount >= 30,
    progress: Math.min(100, (stats.loginCount / 30) * 100),
    currentValue: stats.loginCount,
    targetValue: 30,
  });

  achievements.push({
    id: 'dedicated100',
    titleKey: 'achievement.dedicated',
    icon: '\u{1F3C5}',
    tier: 'gold',
    unlocked: stats.loginCount >= 100,
    progress: Math.min(100, (stats.loginCount / 100) * 100),
    currentValue: stats.loginCount,
    targetValue: 100,
  });

  return achievements;
}

function computeTeacherAchievements(stats: Record<string, number>): Achievement[] {
  const achievements: Achievement[] = [];

  achievements.push({
    id: 'firstGroup',
    titleKey: 'achievement.firstGroup',
    icon: '\u{1F465}',
    tier: 'bronze',
    unlocked: stats.groupsTaught >= 1,
    progress: Math.min(100, (stats.groupsTaught / 1) * 100),
    currentValue: stats.groupsTaught,
    targetValue: 1,
  });

  achievements.push({
    id: 'mentorMaster',
    titleKey: 'achievement.mentorMaster',
    icon: '\u{1F393}',
    tier: 'gold',
    unlocked: stats.groupsTaught >= 5,
    progress: Math.min(100, (stats.groupsTaught / 5) * 100),
    currentValue: stats.groupsTaught,
    targetValue: 5,
  });

  achievements.push({
    id: 'testCreator',
    titleKey: 'achievement.testCreator',
    icon: '\u{1F4CB}',
    tier: 'silver',
    unlocked: stats.testsCreated >= 10,
    progress: Math.min(100, (stats.testsCreated / 10) * 100),
    currentValue: stats.testsCreated,
    targetValue: 10,
  });

  achievements.push({
    id: 'lessonArchitect',
    titleKey: 'achievement.lessonArchitect',
    icon: '\u{1F3DB}',
    tier: 'gold',
    unlocked: stats.lessonsCreated >= 50,
    progress: Math.min(100, (stats.lessonsCreated / 50) * 100),
    currentValue: stats.lessonsCreated,
    targetValue: 50,
  });

  achievements.push({
    id: 'social50',
    titleKey: 'achievement.socialButterfly',
    icon: '\u{1F4AC}',
    tier: 'bronze',
    unlocked: stats.messagesSent >= 50,
    progress: Math.min(100, (stats.messagesSent / 50) * 100),
    currentValue: stats.messagesSent,
    targetValue: 50,
  });

  achievements.push({
    id: 'earlyBird',
    titleKey: 'achievement.earlyBird',
    icon: '\u{1F426}',
    tier: 'silver',
    unlocked: stats.loginCount >= 30,
    progress: Math.min(100, (stats.loginCount / 30) * 100),
    currentValue: stats.loginCount,
    targetValue: 30,
  });

  achievements.push({
    id: 'dedicated100',
    titleKey: 'achievement.dedicated',
    icon: '\u{1F3C5}',
    tier: 'gold',
    unlocked: stats.loginCount >= 100,
    progress: Math.min(100, (stats.loginCount / 100) * 100),
    currentValue: stats.loginCount,
    targetValue: 100,
  });

  return achievements;
}

function computeGenericAchievements(stats: Record<string, number>): Achievement[] {
  const achievements: Achievement[] = [];

  achievements.push({
    id: 'social50',
    titleKey: 'achievement.socialButterfly',
    icon: '\u{1F4AC}',
    tier: 'bronze',
    unlocked: stats.messagesSent >= 50,
    progress: Math.min(100, (stats.messagesSent / 50) * 100),
    currentValue: stats.messagesSent,
    targetValue: 50,
  });

  achievements.push({
    id: 'earlyBird',
    titleKey: 'achievement.earlyBird',
    icon: '\u{1F426}',
    tier: 'silver',
    unlocked: stats.loginCount >= 30,
    progress: Math.min(100, (stats.loginCount / 30) * 100),
    currentValue: stats.loginCount,
    targetValue: 30,
  });

  achievements.push({
    id: 'dedicated100',
    titleKey: 'achievement.dedicated',
    icon: '\u{1F3C5}',
    tier: 'gold',
    unlocked: stats.loginCount >= 100,
    progress: Math.min(100, (stats.loginCount / 100) * 100),
    currentValue: stats.loginCount,
    targetValue: 100,
  });

  return achievements;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const role = session.user.role;

    const messageCount = await prisma.message.count({ where: { senderId: userId } });
    const loginCount = await prisma.loginSession.count({ where: { userId } });

    let stats: Record<string, number> = { messagesSent: messageCount, loginCount };
    let achievements: Achievement[] = [];

    if (role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { userId },
        select: {
          id: true,
          balance: true,
          totalEarned: true,
          _count: {
            select: {
              testAttempts: true,
              groupStudents: true,
            },
          },
        },
      });

      if (student) {
        const homeworksDone = await prisma.homeworkSubmission.count({
          where: {
            studentId: student.id,
            status: { in: ['SUBMITTED', 'CHECKED'] },
          },
        });

        const testScores = await prisma.testAttempt.findMany({
          where: { studentId: student.id, score: { not: null } },
          select: { score: true },
        });
        const avgScore = testScores.length > 0
          ? Math.round(testScores.reduce((sum, t) => sum + (t.score || 0), 0) / testScores.length)
          : 0;

        const perfectScore = await prisma.testAttempt.findFirst({
          where: { studentId: student.id, score: 100 },
          select: { id: true },
        });

        const earnedResult = await prisma.currencyTransaction.aggregate({
          where: {
            studentId: student.id,
            type: { in: ['EARNED', 'BONUS'] },
          },
          _sum: { amount: true },
        });

        stats = {
          ...stats,
          testsCompleted: student._count.testAttempts,
          averageScore: avgScore,
          homeworksDone,
          groupsJoined: student._count.groupStudents,
          balance: student.balance,
          currencyEarned: earnedResult._sum.amount || 0,
          hasPerfectScore: perfectScore ? 1 : 0,
        };

        const xp = (student._count.testAttempts * 50)
          + (homeworksDone * 30)
          + (messageCount * 5)
          + (loginCount * 2)
          + Math.floor((earnedResult._sum.amount || 0) / 10);

        stats.xp = xp;
        stats.level = Math.floor(xp / 500) + 1;
        stats.xpForCurrentLevel = xp % 500;
        stats.xpForNextLevel = 500;

        achievements = computeStudentAchievements(stats);
      }
    } else if (role === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({
        where: { userId },
        select: {
          id: true,
          _count: { select: { groups: true, lessons: true } },
        },
      });

      const testsCreated = await prisma.test.count({ where: { createdById: userId } });
      const generatedTestsCreated = await prisma.generatedTest.count({ where: { createdById: userId } });

      stats = {
        ...stats,
        groupsTaught: teacher?._count.groups || 0,
        lessonsCreated: teacher?._count.lessons || 0,
        testsCreated: testsCreated + generatedTestsCreated,
      };

      const xp = ((teacher?._count.groups || 0) * 100)
        + ((teacher?._count.lessons || 0) * 30)
        + (stats.testsCreated * 50)
        + (messageCount * 5)
        + (loginCount * 2);

      stats.xp = xp;
      stats.level = Math.floor(xp / 500) + 1;
      stats.xpForCurrentLevel = xp % 500;
      stats.xpForNextLevel = 500;

      achievements = computeTeacherAchievements(stats);
    } else {
      const xp = (messageCount * 5) + (loginCount * 2);
      stats.xp = xp;
      stats.level = Math.floor(xp / 500) + 1;
      stats.xpForCurrentLevel = xp % 500;
      stats.xpForNextLevel = 500;
      achievements = computeGenericAchievements(stats);
    }

    return NextResponse.json({ stats, achievements });
  } catch (error) {
    console.error('Profile stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
