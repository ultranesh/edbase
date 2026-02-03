import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://mz@localhost:5432/ertis_classroom?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Реальные темы диагностического теста 3 класса
const diagnosticTopics = [
  { nameRu: 'Текстовые задачи на простые математические действия', nameKz: 'Қарапайым математикалық амалдар', nameEn: 'Word problems with basic operations' },
  { nameRu: 'Десятки и единицы', nameKz: 'Ондықтар мен бірліктер', nameEn: 'Tens and units' },
  { nameRu: 'Логика', nameKz: 'Логика', nameEn: 'Logic' },
  { nameRu: 'Текстовые задачи на сравнение', nameKz: 'Мәтінді есеп. Салыстыру', nameEn: 'Comparison word problems' },
  { nameRu: 'Перевод систем исчисления', nameKz: 'Өлшем бірліктері', nameEn: 'Unit conversion' },
  { nameRu: 'Уравнения', nameKz: 'Теңдеу', nameEn: 'Equations' },
  { nameRu: 'Комбинаторика', nameKz: 'Комбинаторика', nameEn: 'Combinatorics' },
  { nameRu: 'Неравенство', nameKz: 'Теңсіздік', nameEn: 'Inequalities' },
];

// Реальный маппинг из таблицы пользователя
const questionMapping: string[] = [
  'Текстовые задачи на простые математические действия', // 1
  'Десятки и единицы', // 2
  'Логика', // 3
  'Логика', // 4
  'Текстовые задачи на простые математические действия', // 5
  'Текстовые задачи на сравнение', // 6
  'Логика', // 7
  'Текстовые задачи на простые математические действия', // 8
  'Логика', // 9
  'Перевод систем исчисления', // 10
  'Логика', // 11
  'Текстовые задачи на простые математические действия', // 12
  'Уравнения', // 13
  'Логика', // 14
  'Текстовые задачи на простые математические действия', // 15
  'Уравнения', // 16
  'Текстовые задачи на простые математические действия', // 17
  'Текстовые задачи на сравнение', // 18
  'Уравнения', // 19
  'Текстовые задачи на простые математические действия', // 20
  'Текстовые задачи на простые математические действия', // 21
  'Текстовые задачи на простые математические действия', // 22
  'Текстовые задачи на простые математические действия', // 23
  'Текстовые задачи на простые математические действия', // 24
  'Комбинаторика', // 25
  'Текстовые задачи на простые математические действия', // 26
  'Комбинаторика', // 27
  'Текстовые задачи на простые математические действия', // 28
  'Текстовые задачи на простые математические действия', // 29
  'Перевод систем исчисления', // 30
  'Текстовые задачи на простые математические действия', // 31
  'Текстовые задачи на простые математические действия', // 32
  'Текстовые задачи на простые математические действия', // 33
  'Логика', // 34
  'Текстовые задачи на простые математические действия', // 35
  'Логика', // 36
  'Текстовые задачи на простые математические действия', // 37
  'Неравенство', // 38
  'Логика', // 39
  'Логика', // 40
];

async function setup() {
  console.log('=== НАСТРОЙКА ТЕМ ДИАГНОСТИЧЕСКОГО ТЕСТА ===\n');

  const mathSubject = await prisma.taskSubject.findFirst({
    where: { nameRu: 'Математика' }
  });

  if (!mathSubject) {
    console.error('Предмет "Математика" не найден!');
    return;
  }

  // Удаляем все связи и темы
  console.log('Очистка...');
  await prisma.taskSubtopicLink.deleteMany({});
  await prisma.task.updateMany({ data: { subtopicId: null } });
  await prisma.taskSubtopic.deleteMany({ where: { topic: { subjectId: mathSubject.id } } });
  await prisma.taskTopic.deleteMany({ where: { subjectId: mathSubject.id } });

  // Создаём темы (каждая тема = одна подтема с таким же названием для простоты)
  console.log('\nСоздание тем...');
  const topicMap = new Map<string, string>(); // nameRu → subtopicId

  for (let i = 0; i < diagnosticTopics.length; i++) {
    const t = diagnosticTopics[i];

    const topic = await prisma.taskTopic.create({
      data: {
        subjectId: mathSubject.id,
        name: t.nameRu,
        nameRu: t.nameRu,
        nameKz: t.nameKz,
        nameEn: t.nameEn,
        orderIndex: i + 1
      }
    });

    // Создаём подтему с таким же названием
    const subtopic = await prisma.taskSubtopic.create({
      data: {
        topicId: topic.id,
        name: t.nameRu,
        nameRu: t.nameRu,
        nameKz: t.nameKz,
        nameEn: t.nameEn,
        orderIndex: 1
      }
    });

    topicMap.set(t.nameRu, subtopic.id);
    console.log(`✓ ${t.nameRu}`);
  }

  // Находим диагностический тест
  const diagnosticTest = await prisma.generatedTest.findFirst({
    where: { isDiagnostic: true, gradeLevel: 3 },
  });

  if (!diagnosticTest) {
    console.error('\nТест не найден!');
    return;
  }

  const taskIds = diagnosticTest.taskIds as string[];
  console.log(`\nТест: ${diagnosticTest.title}`);
  console.log(`Заданий: ${taskIds.length}\n`);

  // Привязываем задания к темам
  console.log('Привязка заданий...');

  for (let i = 0; i < taskIds.length; i++) {
    const taskId = taskIds[i];
    const topicName = questionMapping[i];
    const subtopicId = topicMap.get(topicName);

    if (!subtopicId) {
      console.log(`${i + 1}: ! Тема "${topicName}" не найдена`);
      continue;
    }

    // Создаём связь
    await prisma.taskSubtopicLink.create({
      data: { taskId, subtopicId }
    });

    // Устанавливаем основную подтему
    await prisma.task.update({
      where: { id: taskId },
      data: { subtopicId }
    });

    console.log(`${i + 1}: ${topicName}`);
  }

  console.log('\n========================================');
  console.log('Готово!');
  console.log('========================================');
}

setup()
  .catch(console.error)
  .finally(() => {
    pool.end();
    process.exit(0);
  });
