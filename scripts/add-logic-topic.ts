import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://mz@localhost:5432/ertis_classroom?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const logicTopic = {
  name: 'Логика',
  nameKz: 'Логика',
  nameRu: 'Логика',
  nameEn: 'Logic',
  subtopics: [
    { name: 'Высказывания', nameKz: 'Пікірлер', nameRu: 'Высказывания', nameEn: 'Statements' },
    { name: 'Истинность и ложность', nameKz: 'Ақиқаттық және жалғандық', nameRu: 'Истинность и ложность', nameEn: 'Truth and falsity' },
    { name: 'Отрицание', nameKz: 'Терістеу', nameRu: 'Отрицание', nameEn: 'Negation' },
    { name: 'Конъюнкция (И)', nameKz: 'Конъюнкция (ЖӘНЕ)', nameRu: 'Конъюнкция (И)', nameEn: 'Conjunction (AND)' },
    { name: 'Дизъюнкция (ИЛИ)', nameKz: 'Дизъюнкция (НЕМЕСЕ)', nameRu: 'Дизъюнкция (ИЛИ)', nameEn: 'Disjunction (OR)' },
    { name: 'Импликация', nameKz: 'Импликация', nameRu: 'Импликация', nameEn: 'Implication' },
    { name: 'Эквиваленция', nameKz: 'Эквиваленция', nameRu: 'Эквиваленция', nameEn: 'Equivalence' },
    { name: 'Таблицы истинности', nameKz: 'Ақиқаттық кестелері', nameRu: 'Таблицы истинности', nameEn: 'Truth tables' },
    { name: 'Законы логики', nameKz: 'Логика заңдары', nameRu: 'Законы логики', nameEn: 'Laws of logic' },
    { name: 'Логические выражения', nameKz: 'Логикалық өрнектер', nameRu: 'Логические выражения', nameEn: 'Logical expressions' },
    { name: 'Упрощение логических выражений', nameKz: 'Логикалық өрнектерді жеңілдету', nameRu: 'Упрощение логических выражений', nameEn: 'Simplifying logical expressions' },
    { name: 'Кванторы', nameKz: 'Кванторлар', nameRu: 'Кванторы', nameEn: 'Quantifiers' },
    { name: 'Множества', nameKz: 'Жиындар', nameRu: 'Множества', nameEn: 'Sets' },
    { name: 'Операции над множествами', nameKz: 'Жиындармен амалдар', nameRu: 'Операции над множествами', nameEn: 'Set operations' },
    { name: 'Диаграммы Эйлера-Венна', nameKz: 'Эйлер-Венн диаграммалары', nameRu: 'Диаграммы Эйлера-Венна', nameEn: 'Euler-Venn diagrams' },
    { name: 'Логические задачи', nameKz: 'Логикалық есептер', nameRu: 'Логические задачи', nameEn: 'Logic problems' },
    { name: 'Задачи на истинность и ложность', nameKz: 'Ақиқаттық пен жалғандыққа есептер', nameRu: 'Задачи на истинность и ложность', nameEn: 'Truth and lie problems' },
    { name: 'Задачи на соответствие', nameKz: 'Сәйкестік есептері', nameRu: 'Задачи на соответствие', nameEn: 'Matching problems' },
    { name: 'Задачи на взвешивание', nameKz: 'Өлшеу есептері', nameRu: 'Задачи на взвешивание', nameEn: 'Weighing problems' },
    { name: 'Задачи на переливание', nameKz: 'Құю есептері', nameRu: 'Задачи на переливание', nameEn: 'Pouring problems' },
    { name: 'Задачи на переправу', nameKz: 'Өту есептері', nameRu: 'Задачи на переправу', nameEn: 'River crossing problems' },
    { name: 'Математическая индукция', nameKz: 'Математикалық индукция', nameRu: 'Математическая индукция', nameEn: 'Mathematical induction' },
    { name: 'Доказательство от противного', nameKz: 'Қарама-қайшылықпен дәлелдеу', nameRu: 'Доказательство от противного', nameEn: 'Proof by contradiction' },
    { name: 'Необходимое и достаточное условие', nameKz: 'Қажетті және жеткілікті шарт', nameRu: 'Необходимое и достаточное условие', nameEn: 'Necessary and sufficient condition' },
  ]
};

async function main() {
  console.log('Добавление темы "Логика"...\n');

  const mathSubject = await prisma.taskSubject.findFirst({
    where: { name: { contains: 'Математика' } }
  });

  if (!mathSubject) {
    console.error('Предмет "Математика" не найден!');
    return;
  }

  // Get max orderIndex
  const lastTopic = await prisma.taskTopic.findFirst({
    where: { subjectId: mathSubject.id },
    orderBy: { orderIndex: 'desc' }
  });
  const nextOrderIndex = (lastTopic?.orderIndex || 0) + 1;

  // Check if topic exists
  let topic = await prisma.taskTopic.findFirst({
    where: { name: logicTopic.name, subjectId: mathSubject.id }
  });

  if (!topic) {
    topic = await prisma.taskTopic.create({
      data: {
        name: logicTopic.name,
        nameKz: logicTopic.nameKz,
        nameRu: logicTopic.nameRu,
        nameEn: logicTopic.nameEn,
        subjectId: mathSubject.id,
        orderIndex: nextOrderIndex,
      }
    });
    console.log(`Создана тема: ${logicTopic.nameRu}`);
  } else {
    console.log(`Тема "${logicTopic.nameRu}" уже существует`);
  }

  // Add subtopics
  let subtopicsCreated = 0;
  for (let i = 0; i < logicTopic.subtopics.length; i++) {
    const subtopicData = logicTopic.subtopics[i];

    const existing = await prisma.taskSubtopic.findFirst({
      where: { name: subtopicData.name, topicId: topic.id }
    });

    if (!existing) {
      await prisma.taskSubtopic.create({
        data: {
          name: subtopicData.name,
          nameKz: subtopicData.nameKz,
          nameRu: subtopicData.nameRu,
          nameEn: subtopicData.nameEn,
          topicId: topic.id,
          orderIndex: i + 1,
        }
      });
      subtopicsCreated++;
    }
  }

  console.log(`\n✓ Создано подтем: ${subtopicsCreated}`);
  console.log('Готово!');
}

main()
  .catch(console.error)
  .finally(async () => {
    await pool.end();
  });
