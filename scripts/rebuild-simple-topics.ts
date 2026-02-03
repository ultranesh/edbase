import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://mz@localhost:5432/ertis_classroom?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Простые, общие темы без олимпиадных
const simpleTopics = [
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
    nameRu: 'Уравнения',
    nameKz: 'Теңдеулер',
    nameEn: 'Equations',
    subtopics: [
      { nameRu: 'Простые уравнения', nameKz: 'Қарапайым теңдеулер', nameEn: 'Simple equations' },
      { nameRu: 'Неравенства', nameKz: 'Теңсіздіктер', nameEn: 'Inequalities' },
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
    nameRu: 'Логика',
    nameKz: 'Логика',
    nameEn: 'Logic',
    subtopics: [
      { nameRu: 'Логические задачи', nameKz: 'Логикалық есептер', nameEn: 'Logic puzzles' },
      { nameRu: 'Комбинаторика', nameKz: 'Комбинаторика', nameEn: 'Combinatorics' },
    ]
  },
];

async function rebuildTopics() {
  console.log('=== ПЕРЕСБОРКА ПРОСТЫХ ТЕМ ===\n');

  const mathSubject = await prisma.taskSubject.findFirst({
    where: { nameRu: 'Математика' }
  });

  if (!mathSubject) {
    console.error('Предмет "Математика" не найден!');
    return;
  }

  // Удаляем ВСЕ связи TaskSubtopicLink
  console.log('Удаление связей...');
  await prisma.taskSubtopicLink.deleteMany({});

  // Обнуляем subtopicId у всех тасков
  await prisma.task.updateMany({
    data: { subtopicId: null }
  });

  // Удаляем все подтемы и темы
  console.log('Удаление старых тем...');
  await prisma.taskSubtopic.deleteMany({
    where: { topic: { subjectId: mathSubject.id } }
  });
  await prisma.taskTopic.deleteMany({
    where: { subjectId: mathSubject.id }
  });

  console.log('Создание новых тем...\n');

  let totalTopics = 0;
  let totalSubtopics = 0;

  for (let i = 0; i < simpleTopics.length; i++) {
    const topicData = simpleTopics[i];

    const topic = await prisma.taskTopic.create({
      data: {
        subjectId: mathSubject.id,
        name: topicData.nameRu,
        nameRu: topicData.nameRu,
        nameKz: topicData.nameKz,
        nameEn: topicData.nameEn,
        orderIndex: i + 1
      }
    });
    totalTopics++;

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
      totalSubtopics++;
    }

    console.log(`✓ ${topicData.nameRu} (${topicData.subtopics.length} подтем)`);
  }

  console.log(`\n========================================`);
  console.log(`Создано: ${totalTopics} тем, ${totalSubtopics} подтем`);
  console.log(`========================================`);
}

rebuildTopics()
  .catch(console.error)
  .finally(() => {
    pool.end();
    process.exit(0);
  });
