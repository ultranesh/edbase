import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://mz@localhost:5432/ertis_classroom?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface NewTopic {
  nameRu: string;
  nameKz: string;
  nameEn: string;
  subtopics: {
    nameRu: string;
    nameKz: string;
    nameEn: string;
  }[];
}

// Классические олимпиадные темы
const classicOlympiadTopics: NewTopic[] = [
  {
    nameRu: 'Головы и ноги',
    nameKz: 'Бастар мен аяқтар',
    nameEn: 'Heads and Legs',
    subtopics: [
      { nameRu: 'Классические задачи про кур и кроликов', nameKz: 'Тауықтар мен қояндар туралы классикалық есептер', nameEn: 'Classic chicken and rabbit problems' },
      { nameRu: 'Задачи с тремя типами объектов', nameKz: 'Үш түрлі объектілермен есептер', nameEn: 'Problems with three object types' },
      { nameRu: 'Задачи про колёса', nameKz: 'Дөңгелектер туралы есептер', nameEn: 'Problems about wheels' },
      { nameRu: 'Обобщённые задачи на подсчёт', nameKz: 'Жалпыланған санау есептері', nameEn: 'Generalized counting problems' },
    ]
  },
  {
    nameRu: 'Пространственное мышление',
    nameKz: 'Кеңістіктік ойлау',
    nameEn: 'Spatial Reasoning',
    subtopics: [
      { nameRu: 'Развёртки куба', nameKz: 'Куб жазбалары', nameEn: 'Cube nets' },
      { nameRu: 'Развёртки многогранников', nameKz: 'Көпжақтар жазбалары', nameEn: 'Polyhedra nets' },
      { nameRu: 'Вращение фигур', nameKz: 'Фигураларды айналдыру', nameEn: 'Rotation of figures' },
      { nameRu: 'Проекции', nameKz: 'Проекциялар', nameEn: 'Projections' },
      { nameRu: 'Виды спереди, сбоку, сверху', nameKz: 'Алдыңғы, бүйірлік, үстіңгі көріністер', nameEn: 'Front, side, top views' },
      { nameRu: 'Сечения объёмных фигур', nameKz: 'Көлемді фигуралар қималары', nameEn: 'Cross-sections of 3D figures' },
      { nameRu: 'Подсчёт кубиков', nameKz: 'Кубиктерді санау', nameEn: 'Counting cubes' },
      { nameRu: 'Складывание фигур', nameKz: 'Фигураларды бүктеу', nameEn: 'Folding figures' },
    ]
  },
  {
    nameRu: 'Задачи на сопоставление',
    nameKz: 'Сәйкестендіру есептері',
    nameEn: 'Matching Problems',
    subtopics: [
      { nameRu: 'Логические таблицы', nameKz: 'Логикалық кестелер', nameEn: 'Logic tables' },
      { nameRu: 'Задачи типа "Кто есть кто"', nameKz: '"Кім кім" типті есептер', nameEn: 'Who is who problems' },
      { nameRu: 'Задачи на соответствие', nameKz: 'Сәйкестік есептері', nameEn: 'Correspondence problems' },
      { nameRu: 'Задачи с условиями-ограничениями', nameKz: 'Шектеулі шарттармен есептер', nameEn: 'Problems with constraints' },
      { nameRu: 'Расстановка по местам', nameKz: 'Орындарға орналастыру', nameEn: 'Placement problems' },
    ]
  },
  {
    nameRu: 'Переливания',
    nameKz: 'Құю есептері',
    nameEn: 'Pouring Problems',
    subtopics: [
      { nameRu: 'Классические переливания', nameKz: 'Классикалық құю есептері', nameEn: 'Classic pouring problems' },
      { nameRu: 'Переливания с тремя сосудами', nameKz: 'Үш ыдыспен құю', nameEn: 'Three container pouring' },
      { nameRu: 'Минимальное число переливаний', nameKz: 'Ең аз құю саны', nameEn: 'Minimum number of pourings' },
      { nameRu: 'Переливания с ограничениями', nameKz: 'Шектеулі құю', nameEn: 'Pouring with constraints' },
    ]
  },
  {
    nameRu: 'Взвешивания',
    nameKz: 'Өлшеу есептері',
    nameEn: 'Weighing Problems',
    subtopics: [
      { nameRu: 'Нахождение фальшивой монеты', nameKz: 'Жалған монетаны табу', nameEn: 'Finding counterfeit coin' },
      { nameRu: 'Взвешивания на чашечных весах', nameKz: 'Табақшалы таразыда өлшеу', nameEn: 'Balance scale weighing' },
      { nameRu: 'Взвешивания с гирями', nameKz: 'Салмақтармен өлшеу', nameEn: 'Weighing with weights' },
      { nameRu: 'Минимальное число взвешиваний', nameKz: 'Ең аз өлшеу саны', nameEn: 'Minimum weighings' },
      { nameRu: 'Взвешивания с неизвестным результатом', nameKz: 'Белгісіз нәтижелі өлшеу', nameEn: 'Weighing with unknown outcome' },
    ]
  },
  {
    nameRu: 'Разрезания и складывания',
    nameKz: 'Кесу және бүктеу',
    nameEn: 'Cutting and Folding',
    subtopics: [
      { nameRu: 'Разрезание на равные части', nameKz: 'Тең бөліктерге кесу', nameEn: 'Cutting into equal parts' },
      { nameRu: 'Танграм', nameKz: 'Танграм', nameEn: 'Tangram' },
      { nameRu: 'Пентамино', nameKz: 'Пентамино', nameEn: 'Pentomino' },
      { nameRu: 'Разрезание фигур на заданные части', nameKz: 'Фигураларды берілген бөліктерге кесу', nameEn: 'Cutting figures into given parts' },
      { nameRu: 'Складывание из частей', nameKz: 'Бөліктерден құрастыру', nameEn: 'Assembling from parts' },
      { nameRu: 'Паркеты и замощения', nameKz: 'Паркеттер және төсемдер', nameEn: 'Tilings and tessellations' },
    ]
  },
  {
    nameRu: 'Задачи на движение',
    nameKz: 'Қозғалыс есептері',
    nameEn: 'Motion Problems',
    subtopics: [
      { nameRu: 'Встречное движение', nameKz: 'Қарсы қозғалыс', nameEn: 'Opposite motion' },
      { nameRu: 'Движение в одном направлении', nameKz: 'Бір бағытта қозғалыс', nameEn: 'Same direction motion' },
      { nameRu: 'Движение по реке', nameKz: 'Өзен бойымен қозғалыс', nameEn: 'River motion' },
      { nameRu: 'Движение по кругу', nameKz: 'Шеңбер бойымен қозғалыс', nameEn: 'Circular motion' },
      { nameRu: 'Относительное движение', nameKz: 'Салыстырмалы қозғалыс', nameEn: 'Relative motion' },
      { nameRu: 'Средняя скорость', nameKz: 'Орташа жылдамдық', nameEn: 'Average speed' },
      { nameRu: 'Задачи про часы', nameKz: 'Сағат туралы есептер', nameEn: 'Clock problems' },
    ]
  },
  {
    nameRu: 'Задачи на работу',
    nameKz: 'Жұмыс есептері',
    nameEn: 'Work Problems',
    subtopics: [
      { nameRu: 'Совместная работа', nameKz: 'Бірлескен жұмыс', nameEn: 'Joint work' },
      { nameRu: 'Бассейны и трубы', nameKz: 'Бассейндер мен құбырлар', nameEn: 'Pools and pipes' },
      { nameRu: 'Производительность труда', nameKz: 'Еңбек өнімділігі', nameEn: 'Work productivity' },
      { nameRu: 'Задачи на части работы', nameKz: 'Жұмыс бөліктері есептері', nameEn: 'Partial work problems' },
    ]
  },
  {
    nameRu: 'Календарь и время',
    nameKz: 'Күнтізбе және уақыт',
    nameEn: 'Calendar and Time',
    subtopics: [
      { nameRu: 'Дни недели', nameKz: 'Апта күндері', nameEn: 'Days of the week' },
      { nameRu: 'Вычисление дат', nameKz: 'Күндерді есептеу', nameEn: 'Date calculations' },
      { nameRu: 'Високосные годы', nameKz: 'Кібісе жылдар', nameEn: 'Leap years' },
      { nameRu: 'Задачи про часы и стрелки', nameKz: 'Сағат және тілдер туралы есептер', nameEn: 'Clock hands problems' },
      { nameRu: 'Возраст и время', nameKz: 'Жас және уақыт', nameEn: 'Age and time' },
    ]
  },
  {
    nameRu: 'Закономерности и последовательности',
    nameKz: 'Заңдылықтар және тізбектер',
    nameEn: 'Patterns and Sequences',
    subtopics: [
      { nameRu: 'Поиск закономерности', nameKz: 'Заңдылықты табу', nameEn: 'Finding patterns' },
      { nameRu: 'Числовые последовательности', nameKz: 'Сандық тізбектер', nameEn: 'Number sequences' },
      { nameRu: 'Геометрические узоры', nameKz: 'Геометриялық өрнектер', nameEn: 'Geometric patterns' },
      { nameRu: 'Продолжение ряда', nameKz: 'Қатарды жалғастыру', nameEn: 'Continuing series' },
      { nameRu: 'Буквенные последовательности', nameKz: 'Әріптік тізбектер', nameEn: 'Letter sequences' },
    ]
  },
  {
    nameRu: 'Ребусы и головоломки',
    nameKz: 'Ребустар және жұмбақтар',
    nameEn: 'Rebuses and Puzzles',
    subtopics: [
      { nameRu: 'Числовые ребусы', nameKz: 'Сандық ребустар', nameEn: 'Number rebuses' },
      { nameRu: 'Буквенные ребусы', nameKz: 'Әріптік ребустар', nameEn: 'Letter rebuses' },
      { nameRu: 'Криптарифмы', nameKz: 'Криптарифмдер', nameEn: 'Cryptarithms' },
      { nameRu: 'Судоку', nameKz: 'Судоку', nameEn: 'Sudoku' },
      { nameRu: 'Какуро', nameKz: 'Какуро', nameEn: 'Kakuro' },
      { nameRu: 'Магические квадраты', nameKz: 'Сиқырлы квадраттар', nameEn: 'Magic squares' },
    ]
  },
  {
    nameRu: 'Задачи на оптимизацию',
    nameKz: 'Оптимизация есептері',
    nameEn: 'Optimization Problems',
    subtopics: [
      { nameRu: 'Поиск максимума', nameKz: 'Максимумды табу', nameEn: 'Finding maximum' },
      { nameRu: 'Поиск минимума', nameKz: 'Минимумды табу', nameEn: 'Finding minimum' },
      { nameRu: 'Оптимальный путь', nameKz: 'Оңтайлы жол', nameEn: 'Optimal path' },
      { nameRu: 'Задачи о наилучшем выборе', nameKz: 'Ең жақсы таңдау есептері', nameEn: 'Best choice problems' },
      { nameRu: 'Экстремальные задачи', nameKz: 'Экстремалды есептер', nameEn: 'Extremal problems' },
    ]
  },
  {
    nameRu: 'Принцип крайнего',
    nameKz: 'Шеткі принципі',
    nameEn: 'Extreme Principle',
    subtopics: [
      { nameRu: 'Выбор крайнего элемента', nameKz: 'Шеткі элементті таңдау', nameEn: 'Choosing extreme element' },
      { nameRu: 'Метод граничных случаев', nameKz: 'Шекаралық жағдайлар әдісі', nameEn: 'Boundary cases method' },
      { nameRu: 'Задачи на упорядочение', nameKz: 'Реттеу есептері', nameEn: 'Ordering problems' },
    ]
  },
  {
    nameRu: 'Чётность и делимость',
    nameKz: 'Жұптылық және бөлінгіштік',
    nameEn: 'Parity and Divisibility',
    subtopics: [
      { nameRu: 'Чётность суммы', nameKz: 'Қосынды жұптылығы', nameEn: 'Parity of sum' },
      { nameRu: 'Чётность произведения', nameKz: 'Көбейтінді жұптылығы', nameEn: 'Parity of product' },
      { nameRu: 'Задачи на остатки', nameKz: 'Қалдықтар есептері', nameEn: 'Remainder problems' },
      { nameRu: 'Признаки делимости в задачах', nameKz: 'Есептердегі бөлінгіштік белгілері', nameEn: 'Divisibility rules in problems' },
    ]
  },
  {
    nameRu: 'Шифры и коды',
    nameKz: 'Шифрлар және кодтар',
    nameEn: 'Ciphers and Codes',
    subtopics: [
      { nameRu: 'Шифр Цезаря', nameKz: 'Цезарь шифры', nameEn: 'Caesar cipher' },
      { nameRu: 'Числовые шифры', nameKz: 'Сандық шифрлар', nameEn: 'Number ciphers' },
      { nameRu: 'Замена символов', nameKz: 'Символдарды ауыстыру', nameEn: 'Symbol substitution' },
      { nameRu: 'Декодирование сообщений', nameKz: 'Хабарламаларды декодтау', nameEn: 'Message decoding' },
    ]
  },
  {
    nameRu: 'Задачи про возраст',
    nameKz: 'Жас туралы есептер',
    nameEn: 'Age Problems',
    subtopics: [
      { nameRu: 'Сравнение возрастов', nameKz: 'Жастарды салыстыру', nameEn: 'Comparing ages' },
      { nameRu: 'Возраст в прошлом и будущем', nameKz: 'Өткен және болашақтағы жас', nameEn: 'Age in past and future' },
      { nameRu: 'Соотношение возрастов', nameKz: 'Жастар қатынасы', nameEn: 'Age ratios' },
      { nameRu: 'Задачи про семью', nameKz: 'Отбасы туралы есептер', nameEn: 'Family age problems' },
    ]
  },
  {
    nameRu: 'Задачи на проценты и доли',
    nameKz: 'Пайыздар және үлестер есептері',
    nameEn: 'Percent and Fraction Problems',
    subtopics: [
      { nameRu: 'Нахождение процента от числа', nameKz: 'Саннан пайызды табу', nameEn: 'Finding percent of number' },
      { nameRu: 'Нахождение числа по проценту', nameKz: 'Пайыз бойынша санды табу', nameEn: 'Finding number from percent' },
      { nameRu: 'Процентное соотношение', nameKz: 'Пайыздық қатынас', nameEn: 'Percentage ratio' },
      { nameRu: 'Задачи на смеси и сплавы', nameKz: 'Қоспалар мен балқымалар есептері', nameEn: 'Mixture and alloy problems' },
      { nameRu: 'Скидки и наценки', nameKz: 'Жеңілдіктер мен үстемелер', nameEn: 'Discounts and markups' },
    ]
  },
  {
    nameRu: 'Задачи на построение',
    nameKz: 'Салу есептері',
    nameEn: 'Construction Problems',
    subtopics: [
      { nameRu: 'Построение циркулем и линейкой', nameKz: 'Циркуль мен сызғышпен салу', nameEn: 'Compass and straightedge' },
      { nameRu: 'Построение одним циркулем', nameKz: 'Тек циркульмен салу', nameEn: 'Compass only construction' },
      { nameRu: 'Построение одной линейкой', nameKz: 'Тек сызғышпен салу', nameEn: 'Straightedge only construction' },
      { nameRu: 'Геометрическое место точек', nameKz: 'Нүктелердің геометриялық орны', nameEn: 'Locus of points' },
    ]
  },
  {
    nameRu: 'Задачи на доказательство',
    nameKz: 'Дәлелдеу есептері',
    nameEn: 'Proof Problems',
    subtopics: [
      { nameRu: 'Прямое доказательство', nameKz: 'Тікелей дәлелдеу', nameEn: 'Direct proof' },
      { nameRu: 'Доказательство от противного', nameKz: 'Кері дәлелдеу', nameEn: 'Proof by contradiction' },
      { nameRu: 'Доказательство по индукции', nameKz: 'Индукция бойынша дәлелдеу', nameEn: 'Proof by induction' },
      { nameRu: 'Контрпример', nameKz: 'Қарсы мысал', nameEn: 'Counterexample' },
    ]
  },
  {
    nameRu: 'Счёт и вычисления',
    nameKz: 'Санау және есептеулер',
    nameEn: 'Counting and Calculations',
    subtopics: [
      { nameRu: 'Устный счёт', nameKz: 'Ауызша санау', nameEn: 'Mental math' },
      { nameRu: 'Быстрые вычисления', nameKz: 'Жылдам есептеулер', nameEn: 'Quick calculations' },
      { nameRu: 'Приёмы рационального счёта', nameKz: 'Ұтымды санау тәсілдері', nameEn: 'Rational calculation techniques' },
      { nameRu: 'Вычисление сумм', nameKz: 'Қосындыларды есептеу', nameEn: 'Sum calculations' },
      { nameRu: 'Округление и оценка', nameKz: 'Дөңгелектеу және бағалау', nameEn: 'Rounding and estimation' },
    ]
  },
];

async function addClassicOlympiadTopics() {
  console.log('Добавление классических олимпиадных тем...\n');

  const mathSubject = await prisma.taskSubject.findFirst({
    where: { nameRu: 'Математика' }
  });

  if (!mathSubject) {
    console.error('Предмет "Математика" не найден!');
    return;
  }

  const maxOrderTopic = await prisma.taskTopic.findFirst({
    where: { subjectId: mathSubject.id },
    orderBy: { orderIndex: 'desc' }
  });
  let currentOrderIndex = (maxOrderTopic?.orderIndex || 0) + 1;

  let topicsAdded = 0;
  let subtopicsAdded = 0;

  for (const topic of classicOlympiadTopics) {
    const existingTopic = await prisma.taskTopic.findFirst({
      where: {
        subjectId: mathSubject.id,
        nameRu: topic.nameRu
      }
    });

    if (existingTopic) {
      console.log(`Тема "${topic.nameRu}" уже существует, пропускаем`);
      continue;
    }

    const newTopic = await prisma.taskTopic.create({
      data: {
        subjectId: mathSubject.id,
        name: topic.nameRu,
        nameRu: topic.nameRu,
        nameKz: topic.nameKz,
        nameEn: topic.nameEn,
        orderIndex: currentOrderIndex++
      }
    });
    topicsAdded++;
    console.log(`✓ Добавлена тема: ${topic.nameRu}`);

    for (let i = 0; i < topic.subtopics.length; i++) {
      const subtopic = topic.subtopics[i];
      await prisma.taskSubtopic.create({
        data: {
          topicId: newTopic.id,
          name: subtopic.nameRu,
          nameRu: subtopic.nameRu,
          nameKz: subtopic.nameKz,
          nameEn: subtopic.nameEn,
          orderIndex: i + 1
        }
      });
      subtopicsAdded++;
    }
    console.log(`  + ${topic.subtopics.length} подтем`);
  }

  console.log('\n========================================');
  console.log(`Добавлено новых тем: ${topicsAdded}`);
  console.log(`Добавлено новых подтем: ${subtopicsAdded}`);
  console.log('========================================');
}

addClassicOlympiadTopics()
  .catch(console.error)
  .finally(() => {
    pool.end();
    process.exit(0);
  });
