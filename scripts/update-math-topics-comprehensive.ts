import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://mz@localhost:5432/ertis_classroom?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Новые/обновлённые темы на основе учебников
const topicsToAdd = [
  // ========== ПРИНЦИП ДИРИХЛЕ ==========
  {
    name: 'Принцип Дирихле',
    nameKz: 'Дирихле принципі',
    nameRu: 'Принцип Дирихле',
    nameEn: 'Pigeonhole principle',
    subtopics: [
      { name: 'Принцип Дирихле (основы)', nameKz: 'Дирихле принципі (негіздері)', nameRu: 'Принцип Дирихле (основы)', nameEn: 'Pigeonhole principle (basics)' },
      { name: 'Принцип Дирихле и делимость', nameKz: 'Дирихле принципі және бөлінгіштік', nameRu: 'Принцип Дирихле и делимость', nameEn: 'Pigeonhole principle and divisibility' },
      { name: 'Принцип Дирихле в геометрии', nameKz: 'Геометриядағы Дирихле принципі', nameRu: 'Принцип Дирихле в геометрии', nameEn: 'Pigeonhole principle in geometry' },
      { name: 'Окраска плоскости', nameKz: 'Жазықтықты бояу', nameRu: 'Окраска плоскости', nameEn: 'Plane coloring' },
    ]
  },
  // ========== ГРАФЫ ==========
  {
    name: 'Графы',
    nameKz: 'Графтар',
    nameRu: 'Графы',
    nameEn: 'Graphs',
    subtopics: [
      { name: 'Понятие графа', nameKz: 'Граф түсінігі', nameRu: 'Понятие графа', nameEn: 'Concept of graph' },
      { name: 'Вершины и рёбра', nameKz: 'Төбелер мен қабырғалар', nameRu: 'Вершины и рёбра', nameEn: 'Vertices and edges' },
      { name: 'Степень вершины', nameKz: 'Төбенің дәрежесі', nameRu: 'Степень вершины', nameEn: 'Degree of vertex' },
      { name: 'Эйлеровы графы', nameKz: 'Эйлер графтары', nameRu: 'Эйлеровы графы', nameEn: 'Eulerian graphs' },
      { name: 'Гамильтоновы графы', nameKz: 'Гамильтон графтары', nameRu: 'Гамильтоновы графы', nameEn: 'Hamiltonian graphs' },
      { name: 'Деревья', nameKz: 'Ағаштар', nameRu: 'Деревья', nameEn: 'Trees' },
      { name: 'Плоские графы', nameKz: 'Жазық графтар', nameRu: 'Плоские графы', nameEn: 'Planar graphs' },
      { name: 'Формула Эйлера для графов', nameKz: 'Графтар үшін Эйлер формуласы', nameRu: 'Формула Эйлера для графов', nameEn: "Euler's formula for graphs" },
      { name: 'Ориентированные графы', nameKz: 'Бағытталған графтар', nameRu: 'Ориентированные графы', nameEn: 'Directed graphs' },
      { name: 'Теория Рамсея', nameKz: 'Рамсей теориясы', nameRu: 'Теория Рамсея', nameEn: 'Ramsey theory' },
    ]
  },
  // ========== ИНВАРИАНТЫ ==========
  {
    name: 'Инварианты',
    nameKz: 'Инварианттар',
    nameRu: 'Инварианты',
    nameEn: 'Invariants',
    subtopics: [
      { name: 'Понятие инварианта', nameKz: 'Инвариант түсінігі', nameRu: 'Понятие инварианта', nameEn: 'Concept of invariant' },
      { name: 'Чётность как инвариант', nameKz: 'Инвариант ретіндегі жұптық', nameRu: 'Чётность как инвариант', nameEn: 'Parity as invariant' },
      { name: 'Раскраска как инвариант', nameKz: 'Инвариант ретіндегі бояу', nameRu: 'Раскраска как инвариант', nameEn: 'Coloring as invariant' },
      { name: 'Полуинварианты', nameKz: 'Жартылай инварианттар', nameRu: 'Полуинварианты', nameEn: 'Semi-invariants' },
      { name: 'Остатки как инвариант', nameKz: 'Инвариант ретіндегі қалдықтар', nameRu: 'Остатки как инвариант', nameEn: 'Remainders as invariant' },
    ]
  },
  // ========== ТЕОРИЯ ИГР ==========
  {
    name: 'Математические игры',
    nameKz: 'Математикалық ойындар',
    nameRu: 'Математические игры',
    nameEn: 'Mathematical games',
    subtopics: [
      { name: 'Выигрышные стратегии', nameKz: 'Жеңіс стратегиялары', nameRu: 'Выигрышные стратегии', nameEn: 'Winning strategies' },
      { name: 'Симметричная стратегия', nameKz: 'Симметриялық стратегия', nameRu: 'Симметричная стратегия', nameEn: 'Symmetric strategy' },
      { name: 'Игры с числами', nameKz: 'Сандармен ойындар', nameRu: 'Игры с числами', nameEn: 'Number games' },
      { name: 'Игры на графах', nameKz: 'Графтардағы ойындар', nameRu: 'Игры на графах', nameEn: 'Games on graphs' },
      { name: 'Игры Ним', nameKz: 'Ним ойындары', nameRu: 'Игры Ним', nameEn: 'Nim games' },
    ]
  },
  // ========== УРАВНЕНИЯ В ЦЕЛЫХ ЧИСЛАХ ==========
  {
    name: 'Уравнения в целых числах',
    nameKz: 'Бүтін сандардағы теңдеулер',
    nameRu: 'Уравнения в целых числах',
    nameEn: 'Diophantine equations',
    subtopics: [
      { name: 'Линейные диофантовы уравнения', nameKz: 'Сызықтық диофант теңдеулері', nameRu: 'Линейные диофантовы уравнения', nameEn: 'Linear Diophantine equations' },
      { name: 'Уравнения второй степени', nameKz: 'Екінші дәрежелі теңдеулер', nameRu: 'Уравнения второй степени', nameEn: 'Quadratic Diophantine equations' },
      { name: 'Метод бесконечного спуска', nameKz: 'Шексіз түсу әдісі', nameRu: 'Метод бесконечного спуска', nameEn: 'Method of infinite descent' },
      { name: 'Пифагоровы тройки', nameKz: 'Пифагор үштіктері', nameRu: 'Пифагоровы тройки', nameEn: 'Pythagorean triples' },
    ]
  },
  // ========== ТЕОРИЯ ЧИСЕЛ (ОЛИМПИАДНАЯ) ==========
  {
    name: 'Теория чисел',
    nameKz: 'Сандар теориясы',
    nameRu: 'Теория чисел',
    nameEn: 'Number theory',
    subtopics: [
      { name: 'Сравнения по модулю', nameKz: 'Модуль бойынша салыстырулар', nameRu: 'Сравнения по модулю', nameEn: 'Modular arithmetic' },
      { name: 'Малая теорема Ферма', nameKz: 'Ферманың кіші теоремасы', nameRu: 'Малая теорема Ферма', nameEn: "Fermat's little theorem" },
      { name: 'Теорема Эйлера', nameKz: 'Эйлер теоремасы', nameRu: 'Теорема Эйлера', nameEn: "Euler's theorem" },
      { name: 'Функция Эйлера', nameKz: 'Эйлер функциясы', nameRu: 'Функция Эйлера', nameEn: "Euler's totient function" },
      { name: 'Китайская теорема об остатках', nameKz: 'Қалдықтар туралы қытай теоремасы', nameRu: 'Китайская теорема об остатках', nameEn: 'Chinese remainder theorem' },
      { name: 'Квадратичные вычеты', nameKz: 'Квадраттық қалдықтар', nameRu: 'Квадратичные вычеты', nameEn: 'Quadratic residues' },
      { name: 'Символ Лежандра', nameKz: 'Лежандр символы', nameRu: 'Символ Лежандра', nameEn: 'Legendre symbol' },
    ]
  },
  // ========== ОЛИМПИАДНАЯ ГЕОМЕТРИЯ ==========
  {
    name: 'Олимпиадная геометрия',
    nameKz: 'Олимпиадалық геометрия',
    nameRu: 'Олимпиадная геометрия',
    nameEn: 'Competition geometry',
    subtopics: [
      { name: 'Вспомогательные окружности', nameKz: 'Көмекші шеңберлер', nameRu: 'Вспомогательные окружности', nameEn: 'Auxiliary circles' },
      { name: 'Радикальная ось', nameKz: 'Радикалдық ось', nameRu: 'Радикальная ось', nameEn: 'Radical axis' },
      { name: 'Степень точки', nameKz: 'Нүктенің дәрежесі', nameRu: 'Степень точки', nameEn: 'Power of a point' },
      { name: 'Инверсия', nameKz: 'Инверсия', nameRu: 'Инверсия', nameEn: 'Inversion' },
      { name: 'Проективная геометрия', nameKz: 'Проективтік геометрия', nameRu: 'Проективная геометрия', nameEn: 'Projective geometry' },
      { name: 'Аффинные преобразования', nameKz: 'Аффиндік түрлендірулер', nameRu: 'Аффинные преобразования', nameEn: 'Affine transformations' },
      { name: 'Теорема Менелая', nameKz: 'Менелай теоремасы', nameRu: 'Теорема Менелая', nameEn: "Menelaus' theorem" },
      { name: 'Теорема Чевы', nameKz: 'Чева теоремасы', nameRu: 'Теорема Чевы', nameEn: "Ceva's theorem" },
      { name: 'Теорема Птолемея', nameKz: 'Птолемей теоремасы', nameRu: 'Теорема Птолемея', nameEn: "Ptolemy's theorem" },
      { name: 'Теорема Стюарта', nameKz: 'Стюарт теоремасы', nameRu: 'Теорема Стюарта', nameEn: "Stewart's theorem" },
    ]
  },
  // ========== ОЛИМПИАДНЫЕ НЕРАВЕНСТВА ==========
  {
    name: 'Олимпиадные неравенства',
    nameKz: 'Олимпиадалық теңсіздіктер',
    nameRu: 'Олимпиадные неравенства',
    nameEn: 'Competition inequalities',
    subtopics: [
      { name: 'Неравенство о средних', nameKz: 'Орталар туралы теңсіздік', nameRu: 'Неравенство о средних', nameEn: 'AM-GM inequality' },
      { name: 'Неравенство Коши-Буняковского', nameKz: 'Коши-Буняковский теңсіздігі', nameRu: 'Неравенство Коши-Буняковского', nameEn: 'Cauchy-Schwarz inequality' },
      { name: 'Неравенство Йенсена', nameKz: 'Йенсен теңсіздігі', nameRu: 'Неравенство Йенсена', nameEn: "Jensen's inequality" },
      { name: 'Неравенство Чебышёва', nameKz: 'Чебышев теңсіздігі', nameRu: 'Неравенство Чебышёва', nameEn: "Chebyshev's inequality" },
      { name: 'Неравенство перестановок', nameKz: 'Орын алмастырулар теңсіздігі', nameRu: 'Неравенство перестановок', nameEn: 'Rearrangement inequality' },
      { name: 'Метод Мажоризации', nameKz: 'Мажоризация әдісі', nameRu: 'Метод Мажоризации', nameEn: 'Majorization' },
      { name: 'SOS метод', nameKz: 'SOS әдісі', nameRu: 'SOS метод', nameEn: 'SOS method' },
    ]
  },
  // ========== ФУНКЦИОНАЛЬНЫЕ УРАВНЕНИЯ ==========
  {
    name: 'Функциональные уравнения',
    nameKz: 'Функционалдық теңдеулер',
    nameRu: 'Функциональные уравнения',
    nameEn: 'Functional equations',
    subtopics: [
      { name: 'Уравнение Коши', nameKz: 'Коши теңдеуі', nameRu: 'Уравнение Коши', nameEn: "Cauchy's functional equation" },
      { name: 'Подстановки', nameKz: 'Алмастырулар', nameRu: 'Подстановки', nameEn: 'Substitutions' },
      { name: 'Метод математической индукции', nameKz: 'Математикалық индукция әдісі', nameRu: 'Метод математической индукции', nameEn: 'Mathematical induction method' },
      { name: 'Инъективность и сюръективность', nameKz: 'Инъективтілік және сюръективтілік', nameRu: 'Инъективность и сюръективность', nameEn: 'Injectivity and surjectivity' },
    ]
  },
];

// Подтемы для добавления в существующие темы
const subtopicsToAddToExisting = {
  'Текстовые задачи': [
    { name: 'Задачи на части', nameKz: 'Бөліктерге есептер', nameRu: 'Задачи на части', nameEn: 'Part problems' },
    { name: 'Задачи на возраст', nameKz: 'Жасқа есептер', nameRu: 'Задачи на возраст', nameEn: 'Age problems' },
    { name: 'Задачи на движение по реке', nameKz: 'Өзен бойымен қозғалысқа есептер', nameRu: 'Задачи на движение по реке', nameEn: 'River motion problems' },
    { name: 'Задачи на бассейны', nameKz: 'Бассейндерге есептер', nameRu: 'Задачи на бассейны', nameEn: 'Pool/pipe problems' },
    { name: 'Задачи на совместную работу', nameKz: 'Бірлескен жұмысқа есептер', nameRu: 'Задачи на совместную работу', nameEn: 'Joint work problems' },
    { name: 'Нахождение чисел по сумме и разности', nameKz: 'Қосынды мен айырым бойынша сандарды табу', nameRu: 'Нахождение чисел по сумме и разности', nameEn: 'Finding numbers by sum and difference' },
  ],
  'Логика': [
    { name: 'Рыцари и лжецы', nameKz: 'Рыцарьлар мен өтіріктер', nameRu: 'Рыцари и лжецы', nameEn: 'Knights and knaves' },
    { name: 'Сюжетные логические задачи', nameKz: 'Сюжетті логикалық есептер', nameRu: 'Сюжетные логические задачи', nameEn: 'Story logic problems' },
  ],
  'Комбинаторика': [
    { name: 'Перестановки с повторениями', nameKz: 'Қайталанымды орын алмастырулар', nameRu: 'Перестановки с повторениями', nameEn: 'Permutations with repetition' },
    { name: 'Сочетания с повторениями', nameKz: 'Қайталанымды тіркестер', nameRu: 'Сочетания с повторениями', nameEn: 'Combinations with repetition' },
    { name: 'Принцип включения-исключения', nameKz: 'Қосу-алу принципі', nameRu: 'Принцип включения-исключения', nameEn: 'Inclusion-exclusion principle' },
    { name: 'Рекуррентные соотношения', nameKz: 'Рекурренттік қатынастар', nameRu: 'Рекуррентные соотношения', nameEn: 'Recurrence relations' },
    { name: 'Производящие функции', nameKz: 'Туындаушы функциялар', nameRu: 'Производящие функции', nameEn: 'Generating functions' },
  ],
  'Делимость чисел': [
    { name: 'Системы счисления', nameKz: 'Санау жүйелері', nameRu: 'Системы счисления', nameEn: 'Number systems' },
    { name: 'Алгоритм Евклида', nameKz: 'Евклид алгоритмі', nameRu: 'Алгоритм Евклида', nameEn: 'Euclidean algorithm' },
  ],
};

async function main() {
  console.log('Обновление тем по математике...\n');

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
  let nextOrderIndex = (lastTopic?.orderIndex || 0) + 1;

  // Add new topics
  console.log('=== Добавление новых тем ===\n');
  for (const topicData of topicsToAdd) {
    let topic = await prisma.taskTopic.findFirst({
      where: { name: topicData.name, subjectId: mathSubject.id }
    });

    if (!topic) {
      topic = await prisma.taskTopic.create({
        data: {
          name: topicData.name,
          nameKz: topicData.nameKz,
          nameRu: topicData.nameRu,
          nameEn: topicData.nameEn,
          subjectId: mathSubject.id,
          orderIndex: nextOrderIndex++,
        }
      });
      console.log(`✓ Создана тема: ${topicData.nameRu}`);
    } else {
      console.log(`  Тема уже существует: ${topicData.nameRu}`);
    }

    // Add subtopics
    for (let i = 0; i < topicData.subtopics.length; i++) {
      const sub = topicData.subtopics[i];
      const exists = await prisma.taskSubtopic.findFirst({
        where: { name: sub.name, topicId: topic.id }
      });
      if (!exists) {
        await prisma.taskSubtopic.create({
          data: {
            name: sub.name,
            nameKz: sub.nameKz,
            nameRu: sub.nameRu,
            nameEn: sub.nameEn,
            topicId: topic.id,
            orderIndex: i + 1,
          }
        });
      }
    }
  }

  // Add subtopics to existing topics
  console.log('\n=== Добавление подтем в существующие темы ===\n');
  for (const [topicName, subtopics] of Object.entries(subtopicsToAddToExisting)) {
    const topic = await prisma.taskTopic.findFirst({
      where: { name: topicName, subjectId: mathSubject.id }
    });

    if (topic) {
      const existingCount = await prisma.taskSubtopic.count({ where: { topicId: topic.id } });
      let order = existingCount + 1;

      for (const sub of subtopics) {
        const exists = await prisma.taskSubtopic.findFirst({
          where: { name: sub.name, topicId: topic.id }
        });
        if (!exists) {
          await prisma.taskSubtopic.create({
            data: {
              name: sub.name,
              nameKz: sub.nameKz,
              nameRu: sub.nameRu,
              nameEn: sub.nameEn,
              topicId: topic.id,
              orderIndex: order++,
            }
          });
          console.log(`  + ${topicName} → ${sub.nameRu}`);
        }
      }
    }
  }

  console.log('\nГотово!');
}

main()
  .catch(console.error)
  .finally(async () => {
    await pool.end();
  });
