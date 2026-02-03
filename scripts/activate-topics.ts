import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://mz@localhost:5432/ertis_classroom?schema=public' });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function activate() {
  console.log('Активация всех тем и подтем...\n');

  // Активируем все темы
  const result = await prisma.taskTopic.updateMany({
    where: { isActive: false },
    data: { isActive: true }
  });
  console.log(`Активировано тем: ${result.count}`);

  // Активируем все подтемы
  const result2 = await prisma.taskSubtopic.updateMany({
    where: { isActive: false },
    data: { isActive: true }
  });
  console.log(`Активировано подтем: ${result2.count}`);

  // Проверяем итог
  const totalTopics = await prisma.taskTopic.count({ where: { isActive: true } });
  const totalSubtopics = await prisma.taskSubtopic.count({ where: { isActive: true } });

  console.log(`\nВсего активных: ${totalTopics} тем, ${totalSubtopics} подтем`);
}

activate()
  .catch(console.error)
  .finally(() => {
    pool.end();
    process.exit(0);
  });
