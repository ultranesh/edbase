import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://mz@localhost:5432/ertis_classroom?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Темы по ГОСО РК + логические темы
const gosoTopics = [
  // === АРИФМЕТИКА И ЧИСЛА ===
  {
    nameRu: 'Натуральные числа',
    nameKz: 'Натурал сандар',
    nameEn: 'Natural numbers',
    subtopics: [
      { nameRu: 'Счёт и нумерация', nameKz: 'Санау және нөмірлеу', nameEn: 'Counting and numeration' },
      { nameRu: 'Разряды и классы', nameKz: 'Разрядтар мен кластар', nameEn: 'Place value' },
      { nameRu: 'Сравнение чисел', nameKz: 'Сандарды салыстыру', nameEn: 'Comparing numbers' },
      { nameRu: 'Округление чисел', nameKz: 'Сандарды дөңгелектеу', nameEn: 'Rounding numbers' },
    ]
  },
  {
    nameRu: 'Арифметические действия',
    nameKz: 'Арифметикалық амалдар',
    nameEn: 'Arithmetic operations',
    subtopics: [
      { nameRu: 'Сложение', nameKz: 'Қосу', nameEn: 'Addition' },
      { nameRu: 'Вычитание', nameKz: 'Азайту', nameEn: 'Subtraction' },
      { nameRu: 'Умножение', nameKz: 'Көбейту', nameEn: 'Multiplication' },
      { nameRu: 'Деление', nameKz: 'Бөлу', nameEn: 'Division' },
      { nameRu: 'Порядок действий', nameKz: 'Амалдар реті', nameEn: 'Order of operations' },
      { nameRu: 'Деление с остатком', nameKz: 'Қалдықпен бөлу', nameEn: 'Division with remainder' },
    ]
  },
  {
    nameRu: 'Делимость чисел',
    nameKz: 'Сандардың бөлінгіштігі',
    nameEn: 'Divisibility',
    subtopics: [
      { nameRu: 'Признаки делимости', nameKz: 'Бөлінгіштік белгілері', nameEn: 'Divisibility rules' },
      { nameRu: 'Простые и составные числа', nameKz: 'Жай және құрама сандар', nameEn: 'Prime and composite numbers' },
      { nameRu: 'НОД и НОК', nameKz: 'ЕҮОБ және ЕКЕ', nameEn: 'GCD and LCM' },
      { nameRu: 'Разложение на простые множители', nameKz: 'Жай көбейткіштерге жіктеу', nameEn: 'Prime factorization' },
    ]
  },
  {
    nameRu: 'Обыкновенные дроби',
    nameKz: 'Жай бөлшектер',
    nameEn: 'Common fractions',
    subtopics: [
      { nameRu: 'Понятие дроби', nameKz: 'Бөлшек ұғымы', nameEn: 'Fraction concept' },
      { nameRu: 'Сравнение дробей', nameKz: 'Бөлшектерді салыстыру', nameEn: 'Comparing fractions' },
      { nameRu: 'Сложение и вычитание дробей', nameKz: 'Бөлшектерді қосу және азайту', nameEn: 'Adding and subtracting fractions' },
      { nameRu: 'Умножение и деление дробей', nameKz: 'Бөлшектерді көбейту және бөлу', nameEn: 'Multiplying and dividing fractions' },
      { nameRu: 'Смешанные числа', nameKz: 'Аралас сандар', nameEn: 'Mixed numbers' },
    ]
  },
  {
    nameRu: 'Десятичные дроби',
    nameKz: 'Ондық бөлшектер',
    nameEn: 'Decimal fractions',
    subtopics: [
      { nameRu: 'Понятие десятичной дроби', nameKz: 'Ондық бөлшек ұғымы', nameEn: 'Decimal concept' },
      { nameRu: 'Действия с десятичными дробями', nameKz: 'Ондық бөлшектермен амалдар', nameEn: 'Operations with decimals' },
      { nameRu: 'Перевод дробей', nameKz: 'Бөлшектерді аудару', nameEn: 'Converting fractions' },
    ]
  },
  {
    nameRu: 'Рациональные числа',
    nameKz: 'Рационал сандар',
    nameEn: 'Rational numbers',
    subtopics: [
      { nameRu: 'Положительные и отрицательные числа', nameKz: 'Оң және теріс сандар', nameEn: 'Positive and negative numbers' },
      { nameRu: 'Модуль числа', nameKz: 'Санның модулі', nameEn: 'Absolute value' },
      { nameRu: 'Действия с рациональными числами', nameKz: 'Рационал сандармен амалдар', nameEn: 'Operations with rationals' },
      { nameRu: 'Координатная прямая', nameKz: 'Координаталық түзу', nameEn: 'Number line' },
    ]
  },
  {
    nameRu: 'Действительные числа',
    nameKz: 'Нақты сандар',
    nameEn: 'Real numbers',
    subtopics: [
      { nameRu: 'Иррациональные числа', nameKz: 'Иррационал сандар', nameEn: 'Irrational numbers' },
      { nameRu: 'Корни', nameKz: 'Түбірлер', nameEn: 'Roots' },
      { nameRu: 'Степени', nameKz: 'Дәрежелер', nameEn: 'Powers' },
    ]
  },

  // === ПРОЦЕНТЫ И ОТНОШЕНИЯ ===
  {
    nameRu: 'Проценты',
    nameKz: 'Пайыздар',
    nameEn: 'Percentages',
    subtopics: [
      { nameRu: 'Понятие процента', nameKz: 'Пайыз ұғымы', nameEn: 'Percentage concept' },
      { nameRu: 'Нахождение процента от числа', nameKz: 'Санның пайызын табу', nameEn: 'Finding percentage of a number' },
      { nameRu: 'Нахождение числа по проценту', nameKz: 'Пайызы бойынша санды табу', nameEn: 'Finding number by percentage' },
      { nameRu: 'Процентное отношение', nameKz: 'Пайыздық қатынас', nameEn: 'Percentage ratio' },
    ]
  },
  {
    nameRu: 'Отношения и пропорции',
    nameKz: 'Қатынастар мен пропорциялар',
    nameEn: 'Ratios and proportions',
    subtopics: [
      { nameRu: 'Отношение чисел', nameKz: 'Сандар қатынасы', nameEn: 'Ratio of numbers' },
      { nameRu: 'Пропорции', nameKz: 'Пропорциялар', nameEn: 'Proportions' },
      { nameRu: 'Прямая пропорциональность', nameKz: 'Тура пропорционалдық', nameEn: 'Direct proportion' },
      { nameRu: 'Обратная пропорциональность', nameKz: 'Кері пропорционалдық', nameEn: 'Inverse proportion' },
      { nameRu: 'Масштаб', nameKz: 'Масштаб', nameEn: 'Scale' },
    ]
  },

  // === АЛГЕБРА ===
  {
    nameRu: 'Алгебраические выражения',
    nameKz: 'Алгебралық өрнектер',
    nameEn: 'Algebraic expressions',
    subtopics: [
      { nameRu: 'Числовые выражения', nameKz: 'Сандық өрнектер', nameEn: 'Numeric expressions' },
      { nameRu: 'Буквенные выражения', nameKz: 'Әріпті өрнектер', nameEn: 'Literal expressions' },
      { nameRu: 'Одночлены', nameKz: 'Бірмүшелер', nameEn: 'Monomials' },
      { nameRu: 'Многочлены', nameKz: 'Көпмүшелер', nameEn: 'Polynomials' },
      { nameRu: 'Формулы сокращённого умножения', nameKz: 'Қысқаша көбейту формулалары', nameEn: 'Special products' },
      { nameRu: 'Разложение на множители', nameKz: 'Көбейткіштерге жіктеу', nameEn: 'Factoring' },
    ]
  },
  {
    nameRu: 'Линейные уравнения',
    nameKz: 'Сызықтық теңдеулер',
    nameEn: 'Linear equations',
    subtopics: [
      { nameRu: 'Уравнение с одной переменной', nameKz: 'Бір айнымалысы бар теңдеу', nameEn: 'One-variable equation' },
      { nameRu: 'Системы линейных уравнений', nameKz: 'Сызықтық теңдеулер жүйесі', nameEn: 'Systems of linear equations' },
    ]
  },
  {
    nameRu: 'Квадратные уравнения',
    nameKz: 'Квадрат теңдеулер',
    nameEn: 'Quadratic equations',
    subtopics: [
      { nameRu: 'Решение квадратных уравнений', nameKz: 'Квадрат теңдеулерді шешу', nameEn: 'Solving quadratic equations' },
      { nameRu: 'Дискриминант', nameKz: 'Дискриминант', nameEn: 'Discriminant' },
      { nameRu: 'Теорема Виета', nameKz: 'Виет теоремасы', nameEn: 'Vieta\'s theorem' },
    ]
  },
  {
    nameRu: 'Неравенства',
    nameKz: 'Теңсіздіктер',
    nameEn: 'Inequalities',
    subtopics: [
      { nameRu: 'Числовые неравенства', nameKz: 'Сандық теңсіздіктер', nameEn: 'Numeric inequalities' },
      { nameRu: 'Линейные неравенства', nameKz: 'Сызықтық теңсіздіктер', nameEn: 'Linear inequalities' },
      { nameRu: 'Квадратные неравенства', nameKz: 'Квадраттық теңсіздіктер', nameEn: 'Quadratic inequalities' },
      { nameRu: 'Системы неравенств', nameKz: 'Теңсіздіктер жүйесі', nameEn: 'Systems of inequalities' },
    ]
  },
  {
    nameRu: 'Функции',
    nameKz: 'Функциялар',
    nameEn: 'Functions',
    subtopics: [
      { nameRu: 'Понятие функции', nameKz: 'Функция ұғымы', nameEn: 'Function concept' },
      { nameRu: 'Линейная функция', nameKz: 'Сызықтық функция', nameEn: 'Linear function' },
      { nameRu: 'Квадратичная функция', nameKz: 'Квадраттық функция', nameEn: 'Quadratic function' },
      { nameRu: 'Степенная функция', nameKz: 'Дәрежелік функция', nameEn: 'Power function' },
      { nameRu: 'График функции', nameKz: 'Функция графигі', nameEn: 'Function graph' },
    ]
  },
  {
    nameRu: 'Последовательности и прогрессии',
    nameKz: 'Тізбектер мен прогрессиялар',
    nameEn: 'Sequences and progressions',
    subtopics: [
      { nameRu: 'Числовые последовательности', nameKz: 'Сандық тізбектер', nameEn: 'Numeric sequences' },
      { nameRu: 'Арифметическая прогрессия', nameKz: 'Арифметикалық прогрессия', nameEn: 'Arithmetic progression' },
      { nameRu: 'Геометрическая прогрессия', nameKz: 'Геометриялық прогрессия', nameEn: 'Geometric progression' },
    ]
  },

  // === ГЕОМЕТРИЯ ===
  {
    nameRu: 'Основы геометрии',
    nameKz: 'Геометрия негіздері',
    nameEn: 'Geometry basics',
    subtopics: [
      { nameRu: 'Точка, прямая, отрезок', nameKz: 'Нүкте, түзу, кесінді', nameEn: 'Point, line, segment' },
      { nameRu: 'Луч и угол', nameKz: 'Сәуле және бұрыш', nameEn: 'Ray and angle' },
      { nameRu: 'Виды углов', nameKz: 'Бұрыш түрлері', nameEn: 'Types of angles' },
      { nameRu: 'Смежные и вертикальные углы', nameKz: 'Сыбайлас және вертикаль бұрыштар', nameEn: 'Adjacent and vertical angles' },
    ]
  },
  {
    nameRu: 'Треугольники',
    nameKz: 'Үшбұрыштар',
    nameEn: 'Triangles',
    subtopics: [
      { nameRu: 'Виды треугольников', nameKz: 'Үшбұрыш түрлері', nameEn: 'Types of triangles' },
      { nameRu: 'Сумма углов треугольника', nameKz: 'Үшбұрыш бұрыштарының қосындысы', nameEn: 'Sum of triangle angles' },
      { nameRu: 'Признаки равенства треугольников', nameKz: 'Үшбұрыштардың теңдік белгілері', nameEn: 'Triangle congruence' },
      { nameRu: 'Подобие треугольников', nameKz: 'Үшбұрыштардың ұқсастығы', nameEn: 'Similar triangles' },
      { nameRu: 'Теорема Пифагора', nameKz: 'Пифагор теоремасы', nameEn: 'Pythagorean theorem' },
      { nameRu: 'Медиана, биссектриса, высота', nameKz: 'Медиана, биссектриса, биіктік', nameEn: 'Median, bisector, altitude' },
    ]
  },
  {
    nameRu: 'Четырёхугольники',
    nameKz: 'Төртбұрыштар',
    nameEn: 'Quadrilaterals',
    subtopics: [
      { nameRu: 'Параллелограмм', nameKz: 'Параллелограмм', nameEn: 'Parallelogram' },
      { nameRu: 'Прямоугольник', nameKz: 'Тіктөртбұрыш', nameEn: 'Rectangle' },
      { nameRu: 'Ромб', nameKz: 'Ромб', nameEn: 'Rhombus' },
      { nameRu: 'Квадрат', nameKz: 'Шаршы', nameEn: 'Square' },
      { nameRu: 'Трапеция', nameKz: 'Трапеция', nameEn: 'Trapezoid' },
    ]
  },
  {
    nameRu: 'Многоугольники',
    nameKz: 'Көпбұрыштар',
    nameEn: 'Polygons',
    subtopics: [
      { nameRu: 'Правильные многоугольники', nameKz: 'Дұрыс көпбұрыштар', nameEn: 'Regular polygons' },
      { nameRu: 'Сумма углов многоугольника', nameKz: 'Көпбұрыш бұрыштарының қосындысы', nameEn: 'Sum of polygon angles' },
    ]
  },
  {
    nameRu: 'Окружность и круг',
    nameKz: 'Шеңбер және дөңгелек',
    nameEn: 'Circle',
    subtopics: [
      { nameRu: 'Элементы окружности', nameKz: 'Шеңбер элементтері', nameEn: 'Circle elements' },
      { nameRu: 'Длина окружности', nameKz: 'Шеңбер ұзындығы', nameEn: 'Circumference' },
      { nameRu: 'Площадь круга', nameKz: 'Дөңгелек ауданы', nameEn: 'Circle area' },
      { nameRu: 'Вписанные и описанные окружности', nameKz: 'Іштей және сырттай сызылған шеңберлер', nameEn: 'Inscribed and circumscribed circles' },
      { nameRu: 'Центральные и вписанные углы', nameKz: 'Центрлік және іштей бұрыштар', nameEn: 'Central and inscribed angles' },
    ]
  },
  {
    nameRu: 'Периметр и площадь',
    nameKz: 'Периметр және аудан',
    nameEn: 'Perimeter and area',
    subtopics: [
      { nameRu: 'Периметр фигур', nameKz: 'Фигуралар периметрі', nameEn: 'Perimeter of shapes' },
      { nameRu: 'Площадь прямоугольника', nameKz: 'Тіктөртбұрыш ауданы', nameEn: 'Rectangle area' },
      { nameRu: 'Площадь треугольника', nameKz: 'Үшбұрыш ауданы', nameEn: 'Triangle area' },
      { nameRu: 'Площадь параллелограмма', nameKz: 'Параллелограмм ауданы', nameEn: 'Parallelogram area' },
      { nameRu: 'Площадь трапеции', nameKz: 'Трапеция ауданы', nameEn: 'Trapezoid area' },
    ]
  },
  {
    nameRu: 'Координатная плоскость',
    nameKz: 'Координаталық жазықтық',
    nameEn: 'Coordinate plane',
    subtopics: [
      { nameRu: 'Координаты точки', nameKz: 'Нүкте координаталары', nameEn: 'Point coordinates' },
      { nameRu: 'Расстояние между точками', nameKz: 'Нүктелер арасындағы қашықтық', nameEn: 'Distance between points' },
      { nameRu: 'Уравнение прямой', nameKz: 'Түзу теңдеуі', nameEn: 'Line equation' },
    ]
  },
  {
    nameRu: 'Векторы',
    nameKz: 'Векторлар',
    nameEn: 'Vectors',
    subtopics: [
      { nameRu: 'Понятие вектора', nameKz: 'Вектор ұғымы', nameEn: 'Vector concept' },
      { nameRu: 'Действия с векторами', nameKz: 'Векторлармен амалдар', nameEn: 'Vector operations' },
      { nameRu: 'Скалярное произведение', nameKz: 'Скаляр көбейтінді', nameEn: 'Scalar product' },
    ]
  },
  {
    nameRu: 'Стереометрия',
    nameKz: 'Стереометрия',
    nameEn: 'Solid geometry',
    subtopics: [
      { nameRu: 'Призма', nameKz: 'Призма', nameEn: 'Prism' },
      { nameRu: 'Пирамида', nameKz: 'Пирамида', nameEn: 'Pyramid' },
      { nameRu: 'Цилиндр', nameKz: 'Цилиндр', nameEn: 'Cylinder' },
      { nameRu: 'Конус', nameKz: 'Конус', nameEn: 'Cone' },
      { nameRu: 'Шар и сфера', nameKz: 'Шар және сфера', nameEn: 'Sphere' },
      { nameRu: 'Объём тел', nameKz: 'Денелер көлемі', nameEn: 'Volume of solids' },
      { nameRu: 'Площадь поверхности', nameKz: 'Бет ауданы', nameEn: 'Surface area' },
    ]
  },

  // === ТРИГОНОМЕТРИЯ ===
  {
    nameRu: 'Тригонометрия',
    nameKz: 'Тригонометрия',
    nameEn: 'Trigonometry',
    subtopics: [
      { nameRu: 'Тригонометрические функции', nameKz: 'Тригонометриялық функциялар', nameEn: 'Trigonometric functions' },
      { nameRu: 'Тригонометрические тождества', nameKz: 'Тригонометриялық тепе-теңдіктер', nameEn: 'Trigonometric identities' },
      { nameRu: 'Тригонометрические уравнения', nameKz: 'Тригонометриялық теңдеулер', nameEn: 'Trigonometric equations' },
      { nameRu: 'Решение треугольников', nameKz: 'Үшбұрыштарды шешу', nameEn: 'Solving triangles' },
    ]
  },

  // === ЕДИНИЦЫ ИЗМЕРЕНИЯ ===
  {
    nameRu: 'Единицы измерения',
    nameKz: 'Өлшем бірліктері',
    nameEn: 'Units of measurement',
    subtopics: [
      { nameRu: 'Единицы длины', nameKz: 'Ұзындық бірліктері', nameEn: 'Length units' },
      { nameRu: 'Единицы массы', nameKz: 'Масса бірліктері', nameEn: 'Mass units' },
      { nameRu: 'Единицы времени', nameKz: 'Уақыт бірліктері', nameEn: 'Time units' },
      { nameRu: 'Единицы площади', nameKz: 'Аудан бірліктері', nameEn: 'Area units' },
      { nameRu: 'Единицы объёма', nameKz: 'Көлем бірліктері', nameEn: 'Volume units' },
      { nameRu: 'Перевод единиц', nameKz: 'Бірліктерді аудару', nameEn: 'Unit conversion' },
    ]
  },

  // === ТЕКСТОВЫЕ ЗАДАЧИ ===
  {
    nameRu: 'Задачи на движение',
    nameKz: 'Қозғалысқа есептер',
    nameEn: 'Motion problems',
    subtopics: [
      { nameRu: 'Движение в одном направлении', nameKz: 'Бір бағытта қозғалыс', nameEn: 'Same direction motion' },
      { nameRu: 'Встречное движение', nameKz: 'Қарама-қарсы қозғалыс', nameEn: 'Opposite direction motion' },
      { nameRu: 'Движение по реке', nameKz: 'Өзенмен қозғалыс', nameEn: 'River motion' },
    ]
  },
  {
    nameRu: 'Задачи на работу',
    nameKz: 'Жұмысқа есептер',
    nameEn: 'Work problems',
    subtopics: [
      { nameRu: 'Совместная работа', nameKz: 'Бірлескен жұмыс', nameEn: 'Joint work' },
      { nameRu: 'Производительность', nameKz: 'Өнімділік', nameEn: 'Productivity' },
    ]
  },
  {
    nameRu: 'Задачи на смеси и сплавы',
    nameKz: 'Қоспалар мен құймаларға есептер',
    nameEn: 'Mixture problems',
    subtopics: [
      { nameRu: 'Концентрация растворов', nameKz: 'Ерітінділер концентрациясы', nameEn: 'Solution concentration' },
      { nameRu: 'Смешивание', nameKz: 'Араластыру', nameEn: 'Mixing' },
    ]
  },
  {
    nameRu: 'Задачи на части',
    nameKz: 'Бөліктерге есептер',
    nameEn: 'Part problems',
    subtopics: [
      { nameRu: 'Деление на части', nameKz: 'Бөліктерге бөлу', nameEn: 'Division into parts' },
      { nameRu: 'Нахождение части от целого', nameKz: 'Бүтіннің бөлігін табу', nameEn: 'Finding part of whole' },
    ]
  },
  {
    nameRu: 'Задачи на возраст',
    nameKz: 'Жасқа есептер',
    nameEn: 'Age problems',
    subtopics: [
      { nameRu: 'Сравнение возрастов', nameKz: 'Жастарды салыстыру', nameEn: 'Comparing ages' },
    ]
  },
  {
    nameRu: 'Задачи на покупки',
    nameKz: 'Сатып алуға есептер',
    nameEn: 'Shopping problems',
    subtopics: [
      { nameRu: 'Цена, количество, стоимость', nameKz: 'Баға, саны, құны', nameEn: 'Price, quantity, cost' },
      { nameRu: 'Скидки', nameKz: 'Жеңілдіктер', nameEn: 'Discounts' },
    ]
  },

  // === СТАТИСТИКА И ВЕРОЯТНОСТЬ ===
  {
    nameRu: 'Статистика',
    nameKz: 'Статистика',
    nameEn: 'Statistics',
    subtopics: [
      { nameRu: 'Среднее арифметическое', nameKz: 'Арифметикалық орта', nameEn: 'Arithmetic mean' },
      { nameRu: 'Медиана и мода', nameKz: 'Медиана және мода', nameEn: 'Median and mode' },
      { nameRu: 'Диаграммы и графики', nameKz: 'Диаграммалар мен графиктер', nameEn: 'Charts and graphs' },
      { nameRu: 'Таблицы данных', nameKz: 'Деректер кестесі', nameEn: 'Data tables' },
    ]
  },
  {
    nameRu: 'Теория вероятностей',
    nameKz: 'Ықтималдықтар теориясы',
    nameEn: 'Probability theory',
    subtopics: [
      { nameRu: 'Понятие вероятности', nameKz: 'Ықтималдық ұғымы', nameEn: 'Probability concept' },
      { nameRu: 'Классическая вероятность', nameKz: 'Классикалық ықтималдық', nameEn: 'Classical probability' },
      { nameRu: 'Сложение и умножение вероятностей', nameKz: 'Ықтималдықтарды қосу және көбейту', nameEn: 'Addition and multiplication of probabilities' },
    ]
  },

  // === ЛОГИКА И КОМБИНАТОРИКА ===
  {
    nameRu: 'Комбинаторика',
    nameKz: 'Комбинаторика',
    nameEn: 'Combinatorics',
    subtopics: [
      { nameRu: 'Правило суммы и произведения', nameKz: 'Қосынды және көбейтінді ережесі', nameEn: 'Sum and product rule' },
      { nameRu: 'Перестановки', nameKz: 'Орын алмастырулар', nameEn: 'Permutations' },
      { nameRu: 'Размещения', nameKz: 'Орналастырулар', nameEn: 'Arrangements' },
      { nameRu: 'Сочетания', nameKz: 'Үйлесімдер', nameEn: 'Combinations' },
      { nameRu: 'Бином Ньютона', nameKz: 'Ньютон биномы', nameEn: 'Binomial theorem' },
    ]
  },
  {
    nameRu: 'Логические задачи',
    nameKz: 'Логикалық есептер',
    nameEn: 'Logic problems',
    subtopics: [
      { nameRu: 'Задачи на истину и ложь', nameKz: 'Шындық пен жалғанға есептер', nameEn: 'Truth and lie problems' },
      { nameRu: 'Логические таблицы', nameKz: 'Логикалық кестелер', nameEn: 'Logic tables' },
      { nameRu: 'Рассуждения и выводы', nameKz: 'Пайымдаулар мен қорытындылар', nameEn: 'Reasoning and conclusions' },
    ]
  },
  {
    nameRu: 'Задачи на переливание',
    nameKz: 'Құюға есептер',
    nameEn: 'Pouring problems',
    subtopics: [
      { nameRu: 'Переливание жидкостей', nameKz: 'Сұйықтықты құю', nameEn: 'Liquid pouring' },
    ]
  },
  {
    nameRu: 'Задачи на взвешивание',
    nameKz: 'Өлшеуге есептер',
    nameEn: 'Weighing problems',
    subtopics: [
      { nameRu: 'Нахождение фальшивой монеты', nameKz: 'Жалған монетаны табу', nameEn: 'Finding fake coin' },
    ]
  },
  {
    nameRu: 'Задачи на разрезание',
    nameKz: 'Кесуге есептер',
    nameEn: 'Cutting problems',
    subtopics: [
      { nameRu: 'Разрезание фигур', nameKz: 'Фигураларды кесу', nameEn: 'Cutting shapes' },
    ]
  },
  {
    nameRu: 'Задачи со спичками',
    nameKz: 'Сіріңкелермен есептер',
    nameEn: 'Matchstick problems',
    subtopics: [
      { nameRu: 'Перекладывание спичек', nameKz: 'Сіріңкелерді орналастыру', nameEn: 'Moving matchsticks' },
    ]
  },
  {
    nameRu: 'Задачи на закономерности',
    nameKz: 'Заңдылықтарға есептер',
    nameEn: 'Pattern problems',
    subtopics: [
      { nameRu: 'Числовые закономерности', nameKz: 'Сандық заңдылықтар', nameEn: 'Number patterns' },
      { nameRu: 'Геометрические закономерности', nameKz: 'Геометриялық заңдылықтар', nameEn: 'Geometric patterns' },
      { nameRu: 'Продолжение последовательности', nameKz: 'Тізбекті жалғастыру', nameEn: 'Sequence continuation' },
    ]
  },
  {
    nameRu: 'Ребусы и головоломки',
    nameKz: 'Ребустар мен жұмбақтар',
    nameEn: 'Rebuses and puzzles',
    subtopics: [
      { nameRu: 'Математические ребусы', nameKz: 'Математикалық ребустар', nameEn: 'Math rebuses' },
      { nameRu: 'Криптарифмы', nameKz: 'Криптарифмдер', nameEn: 'Cryptarithms' },
    ]
  },
  {
    nameRu: 'Шахматные задачи',
    nameKz: 'Шахмат есептері',
    nameEn: 'Chess problems',
    subtopics: [
      { nameRu: 'Задачи с шахматной доской', nameKz: 'Шахмат тақтасымен есептер', nameEn: 'Chessboard problems' },
      { nameRu: 'Ходы фигур', nameKz: 'Фигуралар жүрісі', nameEn: 'Piece moves' },
    ]
  },
  {
    nameRu: 'Задачи на графы',
    nameKz: 'Графтарға есептер',
    nameEn: 'Graph problems',
    subtopics: [
      { nameRu: 'Обход графа', nameKz: 'Графты айналып өту', nameEn: 'Graph traversal' },
      { nameRu: 'Эйлеров и Гамильтонов пути', nameKz: 'Эйлер және Гамильтон жолдары', nameEn: 'Euler and Hamilton paths' },
    ]
  },
  {
    nameRu: 'Принцип Дирихле',
    nameKz: 'Дирихле принципі',
    nameEn: 'Pigeonhole principle',
    subtopics: [
      { nameRu: 'Задачи на принцип Дирихле', nameKz: 'Дирихле принципіне есептер', nameEn: 'Pigeonhole problems' },
    ]
  },
  {
    nameRu: 'Инварианты',
    nameKz: 'Инварианттар',
    nameEn: 'Invariants',
    subtopics: [
      { nameRu: 'Чётность', nameKz: 'Жұптық', nameEn: 'Parity' },
      { nameRu: 'Раскраски', nameKz: 'Бояулар', nameEn: 'Colorings' },
    ]
  },
  {
    nameRu: 'Математическая индукция',
    nameKz: 'Математикалық индукция',
    nameEn: 'Mathematical induction',
    subtopics: [
      { nameRu: 'Метод математической индукции', nameKz: 'Математикалық индукция әдісі', nameEn: 'Induction method' },
    ]
  },
  {
    nameRu: 'Теория чисел',
    nameKz: 'Сандар теориясы',
    nameEn: 'Number theory',
    subtopics: [
      { nameRu: 'Остатки от деления', nameKz: 'Бөлуден қалдықтар', nameEn: 'Remainders' },
      { nameRu: 'Сравнения по модулю', nameKz: 'Модуль бойынша салыстыру', nameEn: 'Modular arithmetic' },
      { nameRu: 'Диофантовы уравнения', nameKz: 'Диофант теңдеулері', nameEn: 'Diophantine equations' },
    ]
  },
  {
    nameRu: 'Олимпиадные задачи',
    nameKz: 'Олимпиадалық есептер',
    nameEn: 'Olympiad problems',
    subtopics: [
      { nameRu: 'Задачи повышенной сложности', nameKz: 'Күрделілігі жоғары есептер', nameEn: 'Advanced problems' },
      { nameRu: 'Нестандартные задачи', nameKz: 'Стандартты емес есептер', nameEn: 'Non-standard problems' },
    ]
  },
];

async function addGosoTopics() {
  console.log('=== ДОБАВЛЕНИЕ ТЕМ ПО ГОСО РК ===\n');

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
  console.log(`Существующих тем: ${existingNames.size}`);
  console.log('');

  // Находим максимальный orderIndex
  const maxOrder = await prisma.taskTopic.aggregate({
    where: { subjectId: mathSubject.id },
    _max: { orderIndex: true }
  });
  let orderIndex = (maxOrder._max.orderIndex || 0) + 1;

  let addedTopics = 0;
  let addedSubtopics = 0;
  let skippedTopics = 0;

  for (const topicData of gosoTopics) {
    // Пропускаем если тема уже существует
    if (existingNames.has(topicData.nameRu)) {
      console.log(`⏭ ${topicData.nameRu}`);
      skippedTopics++;
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
  console.log(`Пропущено (уже существуют): ${skippedTopics} тем`);
  console.log(`========================================`);

  // Показываем итоговое количество
  const totalTopics = await prisma.taskTopic.count({
    where: { subjectId: mathSubject.id }
  });
  const totalSubtopics = await prisma.taskSubtopic.count({
    where: { topic: { subjectId: mathSubject.id } }
  });

  console.log(`\nВсего в базе: ${totalTopics} тем, ${totalSubtopics} подтем`);
}

addGosoTopics()
  .catch(console.error)
  .finally(() => {
    pool.end();
    process.exit(0);
  });
