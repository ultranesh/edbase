import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://mz@localhost:5432/ertis_classroom?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Маппинг заданий к подтемам (по индексу задания 0-39)
// Каждое задание может относиться к нескольким подтемам
const questionTopicMapping: { [index: number]: string[] } = {
  // 1. Йогурты - текстовая задача, умножение, вычитание
  0: ['Умножение и деление', 'Сложение и вычитание', 'Задачи на части'],

  // 2. Мудрецы - сложение
  1: ['Сложение и вычитание'],

  // 3. Дети в рядах - умножение
  2: ['Умножение и деление'],

  // 4. Периметр прямоугольника - геометрия, уравнения
  3: ['Прямоугольник', 'Линейные уравнения'],

  // 5. 56 - 28 - вычитание
  4: ['Сложение и вычитание'],

  // 6. 9 × 4 + 6 - порядок действий
  5: ['Порядок действий', 'Умножение и деление'],

  // 7. 72 ÷ 8 - деление
  6: ['Умножение и деление'],

  // 8. Периметр квадрата
  7: ['Квадрат'],

  // 9. Минуты в часе - единицы измерения времени
  8: ['Задачи на части'],

  // 10. 100 - 45 + 23 - порядок действий
  9: ['Порядок действий', 'Сложение и вычитание'],

  // 11. 7 × 8 - умножение
  10: ['Умножение и деление'],

  // 12. Время через 2 часа
  11: ['Задачи на части'],

  // 13. Деление с остатком 48 ÷ 6
  12: ['Деление с остатком', 'Умножение и деление'],

  // 14. Граммы в килограммах - единицы измерения
  13: ['Задачи на части'],

  // 15. Неизвестное слагаемое 36 + ? = 76
  14: ['Линейные уравнения', 'Сложение и вычитание'],

  // 16. 63 ÷ 9 - деление
  15: ['Умножение и деление'],

  // 17. Сумма углов треугольника
  16: ['Сумма углов треугольника', 'Виды треугольников'],

  // 18. 5 × 5 × 2 - умножение
  17: ['Умножение и деление', 'Порядок действий'],

  // 19. Чётные числа - делимость
  18: ['Признаки делимости'],

  // 20. 2 м 50 см = см - единицы измерения
  19: ['Задачи на части'],

  // 21. Число между 45 и 50 - сравнение
  20: ['Сравнение чисел'],

  // 22. 81 ÷ 9 - деление
  21: ['Умножение и деление'],

  // 23. Возраст отца и сына - текстовая задача на деление
  22: ['Умножение и деление', 'Задачи на части'],

  // 24. 4 + 4 + 4 + 4 + 4 - умножение как сложение
  23: ['Умножение и деление', 'Сложение и вычитание'],

  // 25. Площадь прямоугольника 8 × 5
  24: ['Площадь прямоугольника и квадрата', 'Прямоугольник'],

  // 26. Делимость на 3 и 5
  25: ['Признаки делимости', 'НОД и НОК'],

  // 27. Округление 99 до десятков
  26: ['Округление чисел'],

  // 28. 6 × 7 - 12 - порядок действий
  27: ['Порядок действий', 'Умножение и деление'],

  // 29. Часов в сутках
  28: ['Задачи на части'],

  // 30. 35 + 27 + 15 - сложение
  29: ['Сложение и вычитание'],

  // 31. Площадь квадрата 7²
  30: ['Площадь прямоугольника и квадрата', 'Квадрат'],

  // 32. 100 - 37 - вычитание
  31: ['Сложение и вычитание'],

  // 33. 8 × 9 - умножение
  32: ['Умножение и деление'],

  // 34. ? × 6 = 42 - неизвестный множитель
  33: ['Линейные уравнения', 'Умножение и деление'],

  // 35. Месяцев в году
  34: ['Задачи на части'],

  // 36. Время 9:45 + 15 мин
  35: ['Задачи на части'],

  // 37. 54 ÷ 6 - деление
  36: ['Умножение и деление'],

  // 38. Миллилитры в литрах
  37: ['Задачи на части'],

  // 39. 25 + 25 + 25 + 25 - умножение как сложение
  38: ['Умножение и деление', 'Сложение и вычитание'],

  // 40 (индекс 39) - последнее задание если есть
  39: ['Сложение и вычитание'],
};

async function linkDiagnosticToTopics() {
  console.log('Привязка заданий диагностического теста к темам...\n');

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

  console.log(`Найден тест: ${diagnosticTest.title}`);
  console.log(`Количество заданий: ${diagnosticTest.taskIds.length}\n`);

  // Получаем все подтемы
  const allSubtopics = await prisma.taskSubtopic.findMany({
    include: { topic: true },
  });

  // Создаём мапу подтем по имени
  const subtopicMap = new Map<string, string>();
  for (const subtopic of allSubtopics) {
    subtopicMap.set(subtopic.nameRu || subtopic.name, subtopic.id);
  }

  console.log(`Загружено ${allSubtopics.length} подтем\n`);

  // Удаляем старые связи для заданий этого теста
  const deletedLinks = await prisma.taskSubtopicLink.deleteMany({
    where: {
      taskId: { in: diagnosticTest.taskIds },
    },
  });
  console.log(`Удалено ${deletedLinks.count} старых связей\n`);

  let linksCreated = 0;
  let errors: string[] = [];

  // Для каждого задания создаём связи с подтемами
  for (let i = 0; i < diagnosticTest.taskIds.length; i++) {
    const taskId = diagnosticTest.taskIds[i];
    const subtopicNames = questionTopicMapping[i] || [];

    if (subtopicNames.length === 0) {
      console.log(`Задание ${i + 1}: нет маппинга`);
      continue;
    }

    const linkedSubtopics: string[] = [];

    for (const subtopicName of subtopicNames) {
      const subtopicId = subtopicMap.get(subtopicName);

      if (!subtopicId) {
        errors.push(`Подтема "${subtopicName}" не найдена (задание ${i + 1})`);
        continue;
      }

      try {
        await prisma.taskSubtopicLink.create({
          data: {
            taskId,
            subtopicId,
          },
        });
        linkedSubtopics.push(subtopicName);
        linksCreated++;
      } catch (e: any) {
        if (e.code !== 'P2002') { // Не уникальная ошибка
          errors.push(`Ошибка создания связи: ${e.message}`);
        }
      }
    }

    console.log(`Задание ${i + 1}: ${linkedSubtopics.join(', ') || 'нет связей'}`);
  }

  console.log('\n========================================');
  console.log(`Создано связей: ${linksCreated}`);

  if (errors.length > 0) {
    console.log(`\nОшибки (${errors.length}):`);
    errors.forEach(e => console.log(`  - ${e}`));
  }

  console.log('========================================');
}

linkDiagnosticToTopics()
  .catch(console.error)
  .finally(() => {
    pool.end();
    process.exit(0);
  });
