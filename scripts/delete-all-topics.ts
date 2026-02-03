import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://mz@localhost:5432/ertis_classroom?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Удаление всех тем из базы данных...\n');

  // Сначала убираем связи задач с подтемами
  const updatedTasks = await prisma.task.updateMany({
    where: { subtopicId: { not: null } },
    data: { subtopicId: null }
  });
  console.log(`Отвязано задач от подтем: ${updatedTasks.count}`);

  // Удаляем связи в TaskSubtopicLink
  const deletedLinks = await prisma.taskSubtopicLink.deleteMany({});
  console.log(`Удалено связей TaskSubtopicLink: ${deletedLinks.count}`);

  // Удаляем все подтемы
  const deletedSubtopics = await prisma.taskSubtopic.deleteMany({});
  console.log(`Удалено подтем: ${deletedSubtopics.count}`);

  // Удаляем все темы
  const deletedTopics = await prisma.taskTopic.deleteMany({});
  console.log(`Удалено тем: ${deletedTopics.count}`);

  console.log('\n✓ Все темы удалены!');
}

main()
  .catch(console.error)
  .finally(async () => {
    await pool.end();
  });
