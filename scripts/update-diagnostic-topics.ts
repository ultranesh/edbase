import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://mz@localhost:5432/ertis_classroom?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Темы из таблицы пользователя для диагностического теста 3 класса
const diagnosticTopicsData = [
  { nameRu: 'Текстовые задачи на простые математические действия', nameKz: 'Қарапайым математикалық амалдар', nameEn: 'Word problems with basic operations' },
  { nameRu: 'Десятки и единицы', nameKz: 'Ондықтар мен бірліктер', nameEn: 'Tens and units' },
  { nameRu: 'Логика', nameKz: 'Логика', nameEn: 'Logic' },
  { nameRu: 'Текстовые задачи на сравнение', nameKz: 'Мәтінді есеп. Салыстыру', nameEn: 'Comparison word problems' },
  { nameRu: 'Перевод систем исчисления', nameKz: 'Өлшем бірліктері', nameEn: 'Unit conversion' },
  { nameRu: 'Уравнения', nameKz: 'Теңдеу', nameEn: 'Equations' },
  { nameRu: 'Комбинаторика', nameKz: 'Комбинаторика', nameEn: 'Combinatorics' },
  { nameRu: 'Неравенство', nameKz: 'Теңсіздік', nameEn: 'Inequalities' },
];

// Маппинг заданий к темам (из таблицы пользователя)
// Индекс = номер вопроса - 1
const questionTopicMapping: string[] = [
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

async function updateDiagnosticTopics() {
  console.log('Обновление тем диагностического теста...\n');

  // Находим предмет Математика
  const mathSubject = await prisma.taskSubject.findFirst({
    where: { nameRu: 'Математика' }
  });

  if (!mathSubject) {
    console.error('Предмет "Математика" не найден!');
    return;
  }

  // Находим или создаём тему "Диагностика 3 класс"
  let diagnosticTopic = await prisma.taskTopic.findFirst({
    where: {
      subjectId: mathSubject.id,
      nameRu: 'Диагностика 3 класс'
    }
  });

  if (!diagnosticTopic) {
    const maxOrder = await prisma.taskTopic.findFirst({
      where: { subjectId: mathSubject.id },
      orderBy: { orderIndex: 'desc' }
    });

    diagnosticTopic = await prisma.taskTopic.create({
      data: {
        subjectId: mathSubject.id,
        name: 'Диагностика 3 класс',
        nameRu: 'Диагностика 3 класс',
        nameKz: '3 сынып диагностикасы',
        nameEn: 'Grade 3 Diagnostics',
        orderIndex: (maxOrder?.orderIndex || 0) + 1
      }
    });
    console.log('✓ Создана тема "Диагностика 3 класс"');
  }

  // Создаём подтемы для диагностики
  const subtopicMap = new Map<string, string>();

  for (let i = 0; i < diagnosticTopicsData.length; i++) {
    const topicData = diagnosticTopicsData[i];

    // Проверяем, существует ли подтема
    let subtopic = await prisma.taskSubtopic.findFirst({
      where: {
        topicId: diagnosticTopic.id,
        nameRu: topicData.nameRu
      }
    });

    if (!subtopic) {
      subtopic = await prisma.taskSubtopic.create({
        data: {
          topicId: diagnosticTopic.id,
          name: topicData.nameRu,
          nameRu: topicData.nameRu,
          nameKz: topicData.nameKz,
          nameEn: topicData.nameEn,
          orderIndex: i + 1
        }
      });
      console.log(`✓ Создана подтема: ${topicData.nameRu}`);
    }

    subtopicMap.set(topicData.nameRu, subtopic.id);
  }

  // Находим диагностический тест для 3 класса
  const diagnosticTest = await prisma.generatedTest.findFirst({
    where: {
      isDiagnostic: true,
      gradeLevel: 3,
    },
  });

  if (!diagnosticTest) {
    console.error('Диагностический тест для 3 класса не найден!');
    return;
  }

  console.log(`\nНайден тест: ${diagnosticTest.title}`);
  const taskIds = diagnosticTest.taskIds as string[];
  console.log(`Количество заданий: ${taskIds.length}\n`);

  // Удаляем старые связи
  const deletedLinks = await prisma.taskSubtopicLink.deleteMany({
    where: {
      taskId: { in: taskIds },
    },
  });
  console.log(`Удалено ${deletedLinks.count} старых связей\n`);

  // Также обновляем основную связь subtopicId
  let linksCreated = 0;

  for (let i = 0; i < taskIds.length; i++) {
    const taskId = taskIds[i];
    const topicName = questionTopicMapping[i];

    if (!topicName) {
      console.log(`Задание ${i + 1}: нет маппинга`);
      continue;
    }

    const subtopicId = subtopicMap.get(topicName);

    if (!subtopicId) {
      console.log(`Задание ${i + 1}: подтема "${topicName}" не найдена`);
      continue;
    }

    // Создаём связь через TaskSubtopicLink
    await prisma.taskSubtopicLink.create({
      data: {
        taskId,
        subtopicId,
      },
    });

    // Также обновляем основную связь subtopicId для обратной совместимости
    await prisma.task.update({
      where: { id: taskId },
      data: { subtopicId }
    });

    linksCreated++;
    console.log(`Задание ${i + 1}: ${topicName}`);
  }

  console.log('\n========================================');
  console.log(`Обновлено связей: ${linksCreated}`);
  console.log('========================================');
}

updateDiagnosticTopics()
  .catch(console.error)
  .finally(() => {
    pool.end();
    process.exit(0);
  });
