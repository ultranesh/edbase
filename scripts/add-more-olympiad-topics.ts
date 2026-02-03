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

interface SubtopicAddition {
  topicNameRu: string;
  subtopics: {
    nameRu: string;
    nameKz: string;
    nameEn: string;
  }[];
}

// Новые олимпиадные темы
const newOlympiadTopics: NewTopic[] = [
  {
    nameRu: 'Многочлены (олимпиадные)',
    nameKz: 'Көпмүшеліктер (олимпиадалық)',
    nameEn: 'Polynomials (Competition)',
    subtopics: [
      { nameRu: 'Корни многочленов', nameKz: 'Көпмүшеліктердің түбірлері', nameEn: 'Roots of polynomials' },
      { nameRu: 'Теорема Виета', nameKz: 'Виет теоремасы', nameEn: 'Vieta\'s theorem' },
      { nameRu: 'Неприводимость многочленов', nameKz: 'Көпмүшеліктердің жіктелмейтіндігі', nameEn: 'Irreducibility of polynomials' },
      { nameRu: 'Симметрические многочлены', nameKz: 'Симметриялық көпмүшеліктер', nameEn: 'Symmetric polynomials' },
      { nameRu: 'Многочлены Чебышёва', nameKz: 'Чебышёв көпмүшеліктері', nameEn: 'Chebyshev polynomials' },
      { nameRu: 'Интерполяция Лагранжа', nameKz: 'Лагранж интерполяциясы', nameEn: 'Lagrange interpolation' },
      { nameRu: 'Делимость многочленов', nameKz: 'Көпмүшеліктердің бөлінгіштігі', nameEn: 'Divisibility of polynomials' },
      { nameRu: 'НОД многочленов', nameKz: 'Көпмүшеліктердің ЕҮОБ', nameEn: 'GCD of polynomials' },
      { nameRu: 'Целочисленные многочлены', nameKz: 'Бүтін санды көпмүшеліктер', nameEn: 'Integer polynomials' },
    ]
  },
  {
    nameRu: 'Геометрические неравенства',
    nameKz: 'Геометриялық теңсіздіктер',
    nameEn: 'Geometric Inequalities',
    subtopics: [
      { nameRu: 'Неравенство треугольника', nameKz: 'Үшбұрыш теңсіздігі', nameEn: 'Triangle inequality' },
      { nameRu: 'Неравенство Эрдёша-Мордела', nameKz: 'Эрдёш-Мордел теңсіздігі', nameEn: 'Erdős-Mordell inequality' },
      { nameRu: 'Изопериметрические неравенства', nameKz: 'Изопериметриялық теңсіздіктер', nameEn: 'Isoperimetric inequalities' },
      { nameRu: 'Неравенства в треугольнике', nameKz: 'Үшбұрыштағы теңсіздіктер', nameEn: 'Inequalities in triangles' },
      { nameRu: 'Неравенства с радиусами', nameKz: 'Радиустармен теңсіздіктер', nameEn: 'Inequalities with radii' },
      { nameRu: 'Геометрические оценки', nameKz: 'Геометриялық бағалаулар', nameEn: 'Geometric estimates' },
    ]
  },
  {
    nameRu: 'Раскраски',
    nameKz: 'Бояулар',
    nameEn: 'Colorings',
    subtopics: [
      { nameRu: 'Раскраски шахматной доски', nameKz: 'Шахмат тақтасын бояу', nameEn: 'Chessboard colorings' },
      { nameRu: 'Раскраски в два цвета', nameKz: 'Екі түспен бояу', nameEn: 'Two-color colorings' },
      { nameRu: 'Раскраски в три цвета', nameKz: 'Үш түспен бояу', nameEn: 'Three-color colorings' },
      { nameRu: 'Раскраски графов', nameKz: 'Графтарды бояу', nameEn: 'Graph colorings' },
      { nameRu: 'Хроматическое число', nameKz: 'Хроматикалық сан', nameEn: 'Chromatic number' },
      { nameRu: 'Раскраски плоскости', nameKz: 'Жазықтықты бояу', nameEn: 'Plane colorings' },
      { nameRu: 'Доминошки и раскраски', nameKz: 'Домино және бояулар', nameEn: 'Dominos and colorings' },
    ]
  },
  {
    nameRu: 'Индукция и рекурсия',
    nameKz: 'Индукция және рекурсия',
    nameEn: 'Induction and Recursion',
    subtopics: [
      { nameRu: 'Метод математической индукции', nameKz: 'Математикалық индукция әдісі', nameEn: 'Mathematical induction method' },
      { nameRu: 'Сильная индукция', nameKz: 'Күшті индукция', nameEn: 'Strong induction' },
      { nameRu: 'Индукция по двум параметрам', nameKz: 'Екі параметр бойынша индукция', nameEn: 'Induction on two parameters' },
      { nameRu: 'Рекуррентные соотношения', nameKz: 'Рекурренттік қатынастар', nameEn: 'Recurrence relations' },
      { nameRu: 'Линейные рекурренты', nameKz: 'Сызықтық рекурренттер', nameEn: 'Linear recurrences' },
      { nameRu: 'Производящие функции', nameKz: 'Туындаушы функциялар', nameEn: 'Generating functions' },
      { nameRu: 'Числа Фибоначчи', nameKz: 'Фибоначчи сандары', nameEn: 'Fibonacci numbers' },
      { nameRu: 'Числа Каталана', nameKz: 'Каталан сандары', nameEn: 'Catalan numbers' },
    ]
  },
  {
    nameRu: 'Экстремальные принципы',
    nameKz: 'Экстремалды принциптер',
    nameEn: 'Extremal Principles',
    subtopics: [
      { nameRu: 'Метод крайнего элемента', nameKz: 'Шеткі элемент әдісі', nameEn: 'Extreme element method' },
      { nameRu: 'Минимальный контрпример', nameKz: 'Минималды қарсы мысал', nameEn: 'Minimal counterexample' },
      { nameRu: 'Бесконечный спуск', nameKz: 'Шексіз түсу', nameEn: 'Infinite descent' },
      { nameRu: 'Метод максимума', nameKz: 'Максимум әдісі', nameEn: 'Maximum method' },
      { nameRu: 'Экстремальная комбинаторика', nameKz: 'Экстремалды комбинаторика', nameEn: 'Extremal combinatorics' },
    ]
  },
  {
    nameRu: 'Конструкции и примеры',
    nameKz: 'Конструкциялар және мысалдар',
    nameEn: 'Constructions and Examples',
    subtopics: [
      { nameRu: 'Построение примеров', nameKz: 'Мысалдар құру', nameEn: 'Building examples' },
      { nameRu: 'Построение контрпримеров', nameKz: 'Қарсы мысалдар құру', nameEn: 'Building counterexamples' },
      { nameRu: 'Конструктивные задачи', nameKz: 'Конструктивті есептер', nameEn: 'Constructive problems' },
      { nameRu: 'Оценка и пример', nameKz: 'Бағалау және мысал', nameEn: 'Estimation and example' },
      { nameRu: 'Доказательство существования', nameKz: 'Болуын дәлелдеу', nameEn: 'Existence proofs' },
    ]
  },
  {
    nameRu: 'Комбинаторная геометрия',
    nameKz: 'Комбинаторлық геометрия',
    nameEn: 'Combinatorial Geometry',
    subtopics: [
      { nameRu: 'Задачи о покрытиях', nameKz: 'Жабу есептері', nameEn: 'Covering problems' },
      { nameRu: 'Задачи о разрезаниях', nameKz: 'Кесу есептері', nameEn: 'Cutting problems' },
      { nameRu: 'Выпуклая оболочка', nameKz: 'Дөңес қабық', nameEn: 'Convex hull' },
      { nameRu: 'Теорема Хелли', nameKz: 'Хелли теоремасы', nameEn: 'Helly\'s theorem' },
      { nameRu: 'Теорема Радона', nameKz: 'Радон теоремасы', nameEn: 'Radon\'s theorem' },
      { nameRu: 'Задачи о расположении точек', nameKz: 'Нүктелердің орналасуы есептері', nameEn: 'Point arrangement problems' },
      { nameRu: 'Решётки и целые точки', nameKz: 'Торлар және бүтін нүктелер', nameEn: 'Lattices and integer points' },
      { nameRu: 'Теорема Пика', nameKz: 'Пик теоремасы', nameEn: 'Pick\'s theorem' },
    ]
  },
  {
    nameRu: 'Олимпиадная тригонометрия',
    nameKz: 'Олимпиадалық тригонометрия',
    nameEn: 'Competition Trigonometry',
    subtopics: [
      { nameRu: 'Тригонометрические тождества', nameKz: 'Тригонометриялық тепе-теңдіктер', nameEn: 'Trigonometric identities' },
      { nameRu: 'Суммы и произведения', nameKz: 'Қосындылар және көбейтінділер', nameEn: 'Sums and products' },
      { nameRu: 'Комплексные числа и тригонометрия', nameKz: 'Кешенді сандар және тригонометрия', nameEn: 'Complex numbers and trigonometry' },
      { nameRu: 'Формула Муавра', nameKz: 'Муавр формуласы', nameEn: 'De Moivre\'s formula' },
      { nameRu: 'Корни из единицы', nameKz: 'Бірліктің түбірлері', nameEn: 'Roots of unity' },
      { nameRu: 'Тригонометрические уравнения', nameKz: 'Тригонометриялық теңдеулер', nameEn: 'Trigonometric equations' },
      { nameRu: 'Тригонометрические неравенства', nameKz: 'Тригонометриялық теңсіздіктер', nameEn: 'Trigonometric inequalities' },
    ]
  },
  {
    nameRu: 'Алгоритмы и процессы',
    nameKz: 'Алгоритмдер және процестер',
    nameEn: 'Algorithms and Processes',
    subtopics: [
      { nameRu: 'Алгоритм Евклида', nameKz: 'Евклид алгоритмі', nameEn: 'Euclidean algorithm' },
      { nameRu: 'Жадные алгоритмы', nameKz: 'Ашкөз алгоритмдер', nameEn: 'Greedy algorithms' },
      { nameRu: 'Бинарный поиск', nameKz: 'Екілік іздеу', nameEn: 'Binary search' },
      { nameRu: 'Итерационные процессы', nameKz: 'Итерациялық процестер', nameEn: 'Iterative processes' },
      { nameRu: 'Моделирование', nameKz: 'Модельдеу', nameEn: 'Simulation' },
      { nameRu: 'Процессы и операции', nameKz: 'Процестер және операциялар', nameEn: 'Processes and operations' },
    ]
  },
  {
    nameRu: 'Последовательности',
    nameKz: 'Тізбектер',
    nameEn: 'Sequences',
    subtopics: [
      { nameRu: 'Арифметические прогрессии', nameKz: 'Арифметикалық прогрессиялар', nameEn: 'Arithmetic progressions' },
      { nameRu: 'Геометрические прогрессии', nameKz: 'Геометриялық прогрессиялар', nameEn: 'Geometric progressions' },
      { nameRu: 'Рекуррентные последовательности', nameKz: 'Рекурренттік тізбектер', nameEn: 'Recurrent sequences' },
      { nameRu: 'Сходимость последовательностей', nameKz: 'Тізбектердің жинақталуы', nameEn: 'Convergence of sequences' },
      { nameRu: 'Периодические последовательности', nameKz: 'Периодты тізбектер', nameEn: 'Periodic sequences' },
      { nameRu: 'Монотонные последовательности', nameKz: 'Монотонды тізбектер', nameEn: 'Monotonic sequences' },
      { nameRu: 'Суммы последовательностей', nameKz: 'Тізбектер қосындылары', nameEn: 'Sums of sequences' },
    ]
  },
  {
    nameRu: 'Стереометрия (олимпиадная)',
    nameKz: 'Стереометрия (олимпиадалық)',
    nameEn: 'Stereometry (Competition)',
    subtopics: [
      { nameRu: 'Многогранники', nameKz: 'Көпжақтар', nameEn: 'Polyhedra' },
      { nameRu: 'Правильные многогранники', nameKz: 'Дұрыс көпжақтар', nameEn: 'Regular polyhedra' },
      { nameRu: 'Объёмы тел', nameKz: 'Дене көлемдері', nameEn: 'Volumes of solids' },
      { nameRu: 'Площади поверхностей', nameKz: 'Бет аудандары', nameEn: 'Surface areas' },
      { nameRu: 'Сечения многогранников', nameKz: 'Көпжақтар қималары', nameEn: 'Cross-sections of polyhedra' },
      { nameRu: 'Вписанные и описанные сферы', nameKz: 'Іштей және сырттай сызылған сфералар', nameEn: 'Inscribed and circumscribed spheres' },
      { nameRu: 'Расстояния в пространстве', nameKz: 'Кеңістіктегі қашықтықтар', nameEn: 'Distances in space' },
      { nameRu: 'Углы в пространстве', nameKz: 'Кеңістіктегі бұрыштар', nameEn: 'Angles in space' },
    ]
  },
  {
    nameRu: 'Теория множеств',
    nameKz: 'Жиындар теориясы',
    nameEn: 'Set Theory',
    subtopics: [
      { nameRu: 'Операции над множествами', nameKz: 'Жиындар операциялары', nameEn: 'Set operations' },
      { nameRu: 'Мощность множеств', nameKz: 'Жиындар қуаты', nameEn: 'Cardinality of sets' },
      { nameRu: 'Счётные множества', nameKz: 'Санаулы жиындар', nameEn: 'Countable sets' },
      { nameRu: 'Диаграммы Эйлера-Венна', nameKz: 'Эйлер-Венн диаграммалары', nameEn: 'Euler-Venn diagrams' },
      { nameRu: 'Включение-исключение', nameKz: 'Қосу-алу', nameEn: 'Inclusion-exclusion' },
      { nameRu: 'Декартово произведение', nameKz: 'Декарттық көбейтінді', nameEn: 'Cartesian product' },
    ]
  },
];

// Дополнительные подтемы к существующим темам
const additionalSubtopics: SubtopicAddition[] = [
  {
    topicNameRu: 'Комбинаторика',
    subtopics: [
      { nameRu: 'Биномиальные коэффициенты', nameKz: 'Биномиалды коэффициенттер', nameEn: 'Binomial coefficients' },
      { nameRu: 'Треугольник Паскаля', nameKz: 'Паскаль үшбұрышы', nameEn: 'Pascal\'s triangle' },
      { nameRu: 'Формула включений-исключений', nameKz: 'Қосу-алу формуласы', nameEn: 'Inclusion-exclusion formula' },
      { nameRu: 'Числа Стирлинга', nameKz: 'Стирлинг сандары', nameEn: 'Stirling numbers' },
      { nameRu: 'Разбиения числа', nameKz: 'Сан бөліктері', nameEn: 'Integer partitions' },
      { nameRu: 'Латинские квадраты', nameKz: 'Латын квадраттары', nameEn: 'Latin squares' },
    ]
  },
  {
    topicNameRu: 'Теория чисел',
    subtopics: [
      { nameRu: 'Китайская теорема об остатках', nameKz: 'Қалдықтар туралы қытай теоремасы', nameEn: 'Chinese remainder theorem' },
      { nameRu: 'Теорема Вильсона', nameKz: 'Вильсон теоремасы', nameEn: 'Wilson\'s theorem' },
      { nameRu: 'Квадратичные вычеты', nameKz: 'Квадраттық қалдықтар', nameEn: 'Quadratic residues' },
      { nameRu: 'Символ Лежандра', nameKz: 'Лежандр символы', nameEn: 'Legendre symbol' },
      { nameRu: 'Первообразные корни', nameKz: 'Алғашқы түбірлер', nameEn: 'Primitive roots' },
      { nameRu: 'Функция Мёбиуса', nameKz: 'Мёбиус функциясы', nameEn: 'Möbius function' },
      { nameRu: 'Мультипликативные функции', nameKz: 'Мультипликативті функциялар', nameEn: 'Multiplicative functions' },
    ]
  },
  {
    topicNameRu: 'Графы',
    subtopics: [
      { nameRu: 'Планарные графы', nameKz: 'Жазық графтар', nameEn: 'Planar graphs' },
      { nameRu: 'Формула Эйлера для графов', nameKz: 'Графтар үшін Эйлер формуласы', nameEn: 'Euler\'s formula for graphs' },
      { nameRu: 'Теорема Куратовского', nameKz: 'Куратовский теоремасы', nameEn: 'Kuratowski\'s theorem' },
      { nameRu: 'Двудольные графы', nameKz: 'Екі үлесті графтар', nameEn: 'Bipartite graphs' },
      { nameRu: 'Паросочетания', nameKz: 'Жұптастырулар', nameEn: 'Matchings' },
      { nameRu: 'Потоки в сетях', nameKz: 'Желілердегі ағындар', nameEn: 'Network flows' },
      { nameRu: 'Теорема Менгера', nameKz: 'Менгер теоремасы', nameEn: 'Menger\'s theorem' },
    ]
  },
  {
    topicNameRu: 'Логика',
    subtopics: [
      { nameRu: 'Парадоксы', nameKz: 'Парадокстар', nameEn: 'Paradoxes' },
      { nameRu: 'Рыцари и лжецы', nameKz: 'Рыцарлар және өтірікшілер', nameEn: 'Knights and knaves' },
      { nameRu: 'Логические игры', nameKz: 'Логикалық ойындар', nameEn: 'Logic games' },
      { nameRu: 'Криптарифмы', nameKz: 'Криптарифмдер', nameEn: 'Cryptarithms' },
      { nameRu: 'Логика высказываний', nameKz: 'Пайымдаулар логикасы', nameEn: 'Propositional logic' },
      { nameRu: 'Кванторы', nameKz: 'Кванторлар', nameEn: 'Quantifiers' },
    ]
  },
  {
    topicNameRu: 'Олимпиадная геометрия',
    subtopics: [
      { nameRu: 'Проективная геометрия', nameKz: 'Проективті геометрия', nameEn: 'Projective geometry' },
      { nameRu: 'Теорема Дезарга', nameKz: 'Дезарг теоремасы', nameEn: 'Desargues\' theorem' },
      { nameRu: 'Теорема Паппа', nameKz: 'Папп теоремасы', nameEn: 'Pappus\' theorem' },
      { nameRu: 'Полюс и поляра', nameKz: 'Полюс және поляра', nameEn: 'Pole and polar' },
      { nameRu: 'Спиральные подобия', nameKz: 'Спиральді ұқсастықтар', nameEn: 'Spiral similarities' },
      { nameRu: 'Инверсия в пространстве', nameKz: 'Кеңістіктегі инверсия', nameEn: 'Inversion in space' },
    ]
  },
  {
    topicNameRu: 'Математические игры',
    subtopics: [
      { nameRu: 'Игры с выбором', nameKz: 'Таңдау ойындары', nameEn: 'Selection games' },
      { nameRu: 'Комбинаторные игры', nameKz: 'Комбинаторлық ойындар', nameEn: 'Combinatorial games' },
      { nameRu: 'Теорема Цермело', nameKz: 'Цермело теоремасы', nameEn: 'Zermelo\'s theorem' },
      { nameRu: 'Игры на графах', nameKz: 'Графтардағы ойындар', nameEn: 'Games on graphs' },
      { nameRu: 'Игры преследования', nameKz: 'Қуу ойындары', nameEn: 'Pursuit games' },
    ]
  },
  {
    topicNameRu: 'Уравнения в целых числах',
    subtopics: [
      { nameRu: 'Уравнение Пелля', nameKz: 'Пелль теңдеуі', nameEn: 'Pell\'s equation' },
      { nameRu: 'Цепные дроби', nameKz: 'Тізбекті бөлшектер', nameEn: 'Continued fractions' },
      { nameRu: 'Теорема Безу', nameKz: 'Безу теоремасы', nameEn: 'Bézout\'s identity' },
      { nameRu: 'Примитивные решения', nameKz: 'Қарапайым шешімдер', nameEn: 'Primitive solutions' },
    ]
  },
  {
    topicNameRu: 'Инварианты',
    subtopics: [
      { nameRu: 'Полуинварианты', nameKz: 'Жартылай инварианттар', nameEn: 'Semi-invariants' },
      { nameRu: 'Монотонные величины', nameKz: 'Монотонды шамалар', nameEn: 'Monotonic quantities' },
      { nameRu: 'Инварианты чётности', nameKz: 'Жұптылық инварианттары', nameEn: 'Parity invariants' },
      { nameRu: 'Инварианты по модулю', nameKz: 'Модуль бойынша инварианттар', nameEn: 'Modular invariants' },
    ]
  },
  {
    topicNameRu: 'Функциональные уравнения',
    subtopics: [
      { nameRu: 'Уравнение Коши', nameKz: 'Коши теңдеуі', nameEn: 'Cauchy\'s equation' },
      { nameRu: 'Функциональные неравенства', nameKz: 'Функционалдық теңсіздіктер', nameEn: 'Functional inequalities' },
      { nameRu: 'Уравнения с итерациями', nameKz: 'Итерациялы теңдеулер', nameEn: 'Equations with iterations' },
      { nameRu: 'Мультипликативные уравнения', nameKz: 'Мультипликативті теңдеулер', nameEn: 'Multiplicative equations' },
    ]
  },
  {
    topicNameRu: 'Олимпиадные неравенства',
    subtopics: [
      { nameRu: 'Неравенство Чебышёва', nameKz: 'Чебышёв теңсіздігі', nameEn: 'Chebyshev\'s inequality' },
      { nameRu: 'Неравенство Шура', nameKz: 'Шур теңсіздігі', nameEn: 'Schur\'s inequality' },
      { nameRu: 'Неравенство Гёльдера', nameKz: 'Гёльдер теңсіздігі', nameEn: 'Hölder\'s inequality' },
      { nameRu: 'Неравенство Минковского', nameKz: 'Минковский теңсіздігі', nameEn: 'Minkowski\'s inequality' },
      { nameRu: 'SOS метод', nameKz: 'SOS әдісі', nameEn: 'SOS method' },
      { nameRu: 'Метод Мурхеда', nameKz: 'Мурхед әдісі', nameEn: 'Muirhead\'s method' },
    ]
  },
  {
    topicNameRu: 'Делимость чисел',
    subtopics: [
      { nameRu: 'Порядок числа по модулю', nameKz: 'Модуль бойынша сан реті', nameEn: 'Order of a number modulo' },
      { nameRu: 'Дискретный логарифм', nameKz: 'Дискретті логарифм', nameEn: 'Discrete logarithm' },
      { nameRu: 'p-адические числа', nameKz: 'p-адикалық сандар', nameEn: 'p-adic numbers' },
      { nameRu: 'Лифтинг корней', nameKz: 'Түбірлерді көтеру', nameEn: 'Hensel\'s lemma' },
    ]
  },
  {
    topicNameRu: 'Принцип Дирихле',
    subtopics: [
      { nameRu: 'Обобщённый принцип Дирихле', nameKz: 'Жалпыланған Дирихле принципі', nameEn: 'Generalized pigeonhole' },
      { nameRu: 'Принцип в комбинаторике', nameKz: 'Комбинаторикадағы принцип', nameEn: 'Pigeonhole in combinatorics' },
      { nameRu: 'Принцип в геометрии', nameKz: 'Геометриядағы принцип', nameEn: 'Pigeonhole in geometry' },
      { nameRu: 'Теорема Рамсея', nameKz: 'Рамсей теоремасы', nameEn: 'Ramsey\'s theorem' },
    ]
  },
];

async function addMoreOlympiadTopics() {
  console.log('Добавление дополнительных олимпиадных тем и подтем...\n');

  // Находим предмет Математика
  const mathSubject = await prisma.taskSubject.findFirst({
    where: { nameRu: 'Математика' }
  });

  if (!mathSubject) {
    console.error('Предмет "Математика" не найден!');
    return;
  }

  // Получаем максимальный orderIndex
  const maxOrderTopic = await prisma.taskTopic.findFirst({
    where: { subjectId: mathSubject.id },
    orderBy: { orderIndex: 'desc' }
  });
  let currentOrderIndex = (maxOrderTopic?.orderIndex || 0) + 1;

  let topicsAdded = 0;
  let subtopicsAdded = 0;

  // Добавляем новые темы
  for (const topic of newOlympiadTopics) {
    // Проверяем, существует ли тема
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

    // Создаём тему
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

    // Добавляем подтемы
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

  // Добавляем подтемы к существующим темам
  console.log('\nДобавление подтем к существующим темам...\n');

  for (const addition of additionalSubtopics) {
    const existingTopic = await prisma.taskTopic.findFirst({
      where: {
        subjectId: mathSubject.id,
        nameRu: addition.topicNameRu
      }
    });

    if (!existingTopic) {
      console.log(`Тема "${addition.topicNameRu}" не найдена, пропускаем`);
      continue;
    }

    // Получаем максимальный orderIndex для подтем
    const maxOrderSubtopic = await prisma.taskSubtopic.findFirst({
      where: { topicId: existingTopic.id },
      orderBy: { orderIndex: 'desc' }
    });
    let subtopicOrderIndex = (maxOrderSubtopic?.orderIndex || 0) + 1;

    let addedCount = 0;
    for (const subtopic of addition.subtopics) {
      // Проверяем, существует ли подтема
      const existingSubtopic = await prisma.taskSubtopic.findFirst({
        where: {
          topicId: existingTopic.id,
          nameRu: subtopic.nameRu
        }
      });

      if (existingSubtopic) {
        continue;
      }

      await prisma.taskSubtopic.create({
        data: {
          topicId: existingTopic.id,
          name: subtopic.nameRu,
          nameRu: subtopic.nameRu,
          nameKz: subtopic.nameKz,
          nameEn: subtopic.nameEn,
          orderIndex: subtopicOrderIndex++
        }
      });
      addedCount++;
      subtopicsAdded++;
    }

    if (addedCount > 0) {
      console.log(`✓ К теме "${addition.topicNameRu}" добавлено ${addedCount} новых подтем`);
    }
  }

  console.log('\n========================================');
  console.log(`Добавлено новых тем: ${topicsAdded}`);
  console.log(`Добавлено новых подтем: ${subtopicsAdded}`);
  console.log('========================================');
}

addMoreOlympiadTopics()
  .catch(console.error)
  .finally(() => {
    pool.end();
    process.exit(0);
  });
