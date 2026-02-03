import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://mz@localhost:5432/ertis_classroom?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Общие темы по математике (которые были удалены ранее)
const generalTopics = [
  {
    nameRu: 'Арифметика',
    nameKz: 'Арифметика',
    nameEn: 'Arithmetic',
    subtopics: [
      { nameRu: 'Сложение и вычитание', nameKz: 'Қосу және азайту', nameEn: 'Addition and subtraction' },
      { nameRu: 'Умножение и деление', nameKz: 'Көбейту және бөлу', nameEn: 'Multiplication and division' },
      { nameRu: 'Порядок действий', nameKz: 'Амалдар реті', nameEn: 'Order of operations' },
    ]
  },
  {
    nameRu: 'Числа',
    nameKz: 'Сандар',
    nameEn: 'Numbers',
    subtopics: [
      { nameRu: 'Натуральные числа', nameKz: 'Натурал сандар', nameEn: 'Natural numbers' },
      { nameRu: 'Дроби', nameKz: 'Бөлшектер', nameEn: 'Fractions' },
      { nameRu: 'Делимость', nameKz: 'Бөлінгіштік', nameEn: 'Divisibility' },
    ]
  },
  {
    nameRu: 'Единицы измерения',
    nameKz: 'Өлшем бірліктері',
    nameEn: 'Units of measurement',
    subtopics: [
      { nameRu: 'Время', nameKz: 'Уақыт', nameEn: 'Time' },
      { nameRu: 'Длина и масса', nameKz: 'Ұзындық және масса', nameEn: 'Length and mass' },
      { nameRu: 'Объём', nameKz: 'Көлем', nameEn: 'Volume' },
    ]
  },
  {
    nameRu: 'Геометрия',
    nameKz: 'Геометрия',
    nameEn: 'Geometry',
    subtopics: [
      { nameRu: 'Треугольники', nameKz: 'Үшбұрыштар', nameEn: 'Triangles' },
      { nameRu: 'Четырёхугольники', nameKz: 'Төртбұрыштар', nameEn: 'Quadrilaterals' },
      { nameRu: 'Периметр и площадь', nameKz: 'Периметр және аудан', nameEn: 'Perimeter and area' },
    ]
  },
  {
    nameRu: 'Текстовые задачи',
    nameKz: 'Мәтінді есептер',
    nameEn: 'Word problems',
    subtopics: [
      { nameRu: 'Задачи на части', nameKz: 'Бөліктер есептері', nameEn: 'Part problems' },
      { nameRu: 'Задачи на движение', nameKz: 'Қозғалыс есептері', nameEn: 'Motion problems' },
      { nameRu: 'Задачи на работу', nameKz: 'Жұмыс есептері', nameEn: 'Work problems' },
    ]
  },
  {
    nameRu: 'Алгебра',
    nameKz: 'Алгебра',
    nameEn: 'Algebra',
    subtopics: [
      { nameRu: 'Выражения', nameKz: 'Өрнектер', nameEn: 'Expressions' },
      { nameRu: 'Уравнения', nameKz: 'Теңдеулер', nameEn: 'Equations' },
      { nameRu: 'Неравенства', nameKz: 'Теңсіздіктер', nameEn: 'Inequalities' },
    ]
  },
  {
    nameRu: 'Логика и комбинаторика',
    nameKz: 'Логика және комбинаторика',
    nameEn: 'Logic and combinatorics',
    subtopics: [
      { nameRu: 'Логические задачи', nameKz: 'Логикалық есептер', nameEn: 'Logic puzzles' },
      { nameRu: 'Комбинаторика', nameKz: 'Комбинаторика', nameEn: 'Combinatorics' },
      { nameRu: 'Вероятность', nameKz: 'Ықтималдық', nameEn: 'Probability' },
    ]
  },
  {
    nameRu: 'Проценты и пропорции',
    nameKz: 'Пайыздар және пропорциялар',
    nameEn: 'Percentages and proportions',
    subtopics: [
      { nameRu: 'Проценты', nameKz: 'Пайыздар', nameEn: 'Percentages' },
      { nameRu: 'Пропорции', nameKz: 'Пропорциялар', nameEn: 'Proportions' },
    ]
  },
];

async function restoreTopics() {
  console.log('=== ВОССТАНОВЛЕНИЕ ОБЩИХ ТЕМ ===\n');

  const mathSubject = await prisma.taskSubject.findFirst({
    where: { nameRu: 'Математика' }
  });

  if (!mathSubject) {
    console.error('Предмет "Математика" не найден!');
    return;
  }

  // Получаем существующие темы
  const existingTopics = await prisma.taskTopic.findMany({
    where: { subjectId: mathSubject.id },
    select: { nameRu: true }
  });

  const existingNames = new Set(existingTopics.map(t => t.nameRu));
  console.log('Существующие темы:', Array.from(existingNames).join(', '));
  console.log('');

  // Находим максимальный orderIndex
  const maxOrder = await prisma.taskTopic.aggregate({
    where: { subjectId: mathSubject.id },
    _max: { orderIndex: true }
  });
  let orderIndex = (maxOrder._max.orderIndex || 0) + 1;

  let addedTopics = 0;
  let addedSubtopics = 0;

  for (const topicData of generalTopics) {
    // Пропускаем если тема уже существует
    if (existingNames.has(topicData.nameRu)) {
      console.log(`⏭ ${topicData.nameRu} - уже существует`);
      continue;
    }

    const topic = await prisma.taskTopic.create({
      data: {
        subjectId: mathSubject.id,
        name: topicData.nameRu,
        nameRu: topicData.nameRu,
        nameKz: topicData.nameKz,
        nameEn: topicData.nameEn,
        orderIndex: orderIndex++
      }
    });
    addedTopics++;

    for (let j = 0; j < topicData.subtopics.length; j++) {
      const sub = topicData.subtopics[j];
      await prisma.taskSubtopic.create({
        data: {
          topicId: topic.id,
          name: sub.nameRu,
          nameRu: sub.nameRu,
          nameKz: sub.nameKz,
          nameEn: sub.nameEn,
          orderIndex: j + 1
        }
      });
      addedSubtopics++;
    }

    console.log(`✓ ${topicData.nameRu} (${topicData.subtopics.length} подтем)`);
  }

  console.log(`\n========================================`);
  console.log(`Добавлено: ${addedTopics} тем, ${addedSubtopics} подтем`);
  console.log(`========================================`);

  // Показываем итоговый список тем
  const allTopics = await prisma.taskTopic.findMany({
    where: { subjectId: mathSubject.id },
    orderBy: { orderIndex: 'asc' },
    select: { nameRu: true }
  });

  console.log('\nВсе темы в базе:');
  allTopics.forEach((t, i) => {
    console.log(`  ${i + 1}. ${t.nameRu}`);
  });
}

restoreTopics()
  .catch(console.error)
  .finally(() => {
    pool.end();
    process.exit(0);
  });
