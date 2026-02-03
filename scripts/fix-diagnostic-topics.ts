import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://mz@localhost:5432/ertis_classroom?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Простой маппинг на новые темы
// Формат: 'ключ' → название родительской темы
const topicsMapping: Record<string, string> = {
  'Арифметика': 'Арифметика',
  'Числа': 'Числа',
  'Единицы': 'Единицы измерения',
  'Уравнения': 'Уравнения',
  'Геометрия': 'Геометрия',
  'Текстовые': 'Текстовые задачи',
  'Логика': 'Логика',
};

// Маппинг 40 заданий диагностического теста 3 класса
// Смотрю на КАЖДОЕ задание внимательно:
const questionTopics: string[][] = [
  // 1. Каждый ребёнок съедает утром два йогурта... - текстовая задача
  ['Текстовые', 'Арифметика'],
  // 2. Айгерим попрощалась с 18 мудрецами... - текстовая задача на сложение
  ['Текстовые', 'Арифметика'],
  // 3. Сколько треугольников на рисунке? - логика + геометрия (подсчёт фигур)
  ['Логика', 'Геометрия'],
  // 4. Периметр прямоугольника 18 см, ширина 3 см... - геометрия
  ['Геометрия'],
  // 5. Вычтите 28 из 56. - арифметика
  ['Арифметика'],
  // 6. 9 × 4 + 6 = ? - арифметика (порядок действий)
  ['Арифметика'],
  // 7. Разделите 72 на 8. - арифметика (деление)
  ['Арифметика'],
  // 8. Периметр квадрата 24 см... - геометрия
  ['Геометрия'],
  // 9. Сколько минут в 1 часе? - единицы измерения
  ['Единицы'],
  // 10. Вычислите: 100 - 45 + 23 - арифметика
  ['Арифметика'],
  // 11. Чему равно 7 × 8? - арифметика
  ['Арифметика'],
  // 12. Если сейчас 12:30, который час будет через 2 часа? - единицы измерения (время)
  ['Единицы'],
  // 13. Найдите частное и остаток при делении 48 на 6. - арифметика
  ['Арифметика'],
  // 14. Сколько граммов в 3 кг? - единицы измерения
  ['Единицы'],
  // 15. Найдите неизвестное слагаемое: 36 + ? = 76 - уравнения
  ['Уравнения'],
  // 16. Найдите частное: 63 ÷ 9 = ? - арифметика
  ['Арифметика'],
  // 17. Чему равна сумма трёх углов треугольника? - геометрия
  ['Геометрия'],
  // 18. 5 × 5 × 2 = ? - арифметика
  ['Арифметика'],
  // 19. Выберите чётные числа: 12, 15, 18, 21, 24 - числа (делимость)
  ['Числа'],
  // 20. 2 м 50 см = ... см - единицы измерения
  ['Единицы'],
  // 21. Какое число меньше 50 и больше 45? - уравнения (неравенства)
  ['Уравнения'],
  // 22. Разделите 81 на 9. - арифметика
  ['Арифметика'],
  // 23. Возраст отца 36 лет, сын в 4 раза младше... - текстовая задача
  ['Текстовые', 'Арифметика'],
  // 24. Чему равно 4 + 4 + 4 + 4 + 4? - арифметика
  ['Арифметика'],
  // 25. Длина прямоугольника 8 см, ширина 5 см. Найдите площадь. - геометрия
  ['Геометрия'],
  // 26. Какое число делится и на 3, и на 5? - числа (делимость)
  ['Числа'],
  // 27. Округлите число 99 до десятков. - числа
  ['Числа'],
  // 28. 6 × 7 - 12 = ? - арифметика
  ['Арифметика'],
  // 29. Сколько часов в сутках? - единицы измерения
  ['Единицы'],
  // 30. 35 + 27 + 15 = ? - арифметика
  ['Арифметика'],
  // 31. Сторона квадрата 7 см. Найдите площадь. - геометрия
  ['Геометрия'],
  // 32. Вычтите 37 из 100. - арифметика
  ['Арифметика'],
  // 33. 8 × 9 = ? - арифметика
  ['Арифметика'],
  // 34. Найдите число: ? × 6 = 42 - уравнения
  ['Уравнения'],
  // 35. Сколько месяцев в году? - единицы измерения
  ['Единицы'],
  // 36. Если сейчас 9:45, который час будет через 15 минут? - единицы измерения
  ['Единицы'],
  // 37. Разделите 54 на 6. - арифметика
  ['Арифметика'],
  // 38. Сколько мл в 5 литрах? - единицы измерения
  ['Единицы'],
  // 39. 25 + 25 + 25 + 25 = ? - арифметика
  ['Арифметика'],
  // 40. Сколько дней в неделе? - единицы измерения
  ['Единицы'],
];

async function fixDiagnosticTopics() {
  console.log('=== ПРИВЯЗКА ЗАДАНИЙ К ТЕМАМ ===\n');

  const mathSubject = await prisma.taskSubject.findFirst({
    where: { nameRu: 'Математика' }
  });

  if (!mathSubject) {
    console.error('Предмет не найден!');
    return;
  }

  // Получаем все темы
  const topics = await prisma.taskTopic.findMany({
    where: { subjectId: mathSubject.id },
    include: { subtopics: true }
  });

  // Создаём маппинг: название темы → первая подтема (для связи)
  const topicToSubtopicId = new Map<string, string>();
  for (const topic of topics) {
    if (topic.subtopics.length > 0 && topic.nameRu) {
      topicToSubtopicId.set(topic.nameRu, topic.subtopics[0].id);
    }
  }

  console.log('Темы в базе:');
  for (const [name] of topicToSubtopicId) {
    console.log(`  ${name}`);
  }
  console.log('');

  // Находим диагностический тест
  const diagnosticTest = await prisma.generatedTest.findFirst({
    where: { isDiagnostic: true, gradeLevel: 3 },
  });

  if (!diagnosticTest) {
    console.error('Тест не найден!');
    return;
  }

  const taskIds = diagnosticTest.taskIds as string[];
  console.log(`Тест: ${diagnosticTest.title}`);
  console.log(`Заданий: ${taskIds.length}\n`);

  // Удаляем старые связи
  await prisma.taskSubtopicLink.deleteMany({
    where: { taskId: { in: taskIds } },
  });

  // Создаём новые связи
  let linksCreated = 0;

  for (let i = 0; i < taskIds.length; i++) {
    const taskId = taskIds[i];
    const topicKeys = questionTopics[i];

    if (!topicKeys || topicKeys.length === 0) {
      console.log(`${i + 1}: нет маппинга`);
      continue;
    }

    const linkedNames: string[] = [];

    for (const key of topicKeys) {
      const topicName = topicsMapping[key];
      const subtopicId = topicToSubtopicId.get(topicName);

      if (!subtopicId) {
        console.log(`  ! Тема "${topicName}" не найдена`);
        continue;
      }

      await prisma.taskSubtopicLink.create({
        data: { taskId, subtopicId },
      });
      linksCreated++;
      linkedNames.push(topicName);
    }

    // Первая тема - основная
    const primaryTopicName = topicsMapping[topicKeys[0]];
    const primarySubtopicId = topicToSubtopicId.get(primaryTopicName);
    if (primarySubtopicId) {
      await prisma.task.update({
        where: { id: taskId },
        data: { subtopicId: primarySubtopicId }
      });
    }

    console.log(`${i + 1}: ${linkedNames.join(' + ')}`);
  }

  console.log(`\n========================================`);
  console.log(`Создано связей: ${linksCreated}`);
  console.log(`========================================`);
}

fixDiagnosticTopics()
  .catch(console.error)
  .finally(() => {
    pool.end();
    process.exit(0);
  });
