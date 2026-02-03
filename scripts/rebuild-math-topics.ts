import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://mz@localhost:5432/ertis_classroom?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface Topic {
  nameRu: string;
  nameKz: string;
  nameEn: string;
  subtopics: {
    nameRu: string;
    nameKz: string;
    nameEn: string;
  }[];
}

// ============================================
// ЧАСТЬ 1: ШКОЛЬНАЯ ПРОГРАММА (ГОСО РК)
// ============================================
const schoolTopics: Topic[] = [
  // --- АРИФМЕТИКА И ЧИСЛА ---
  {
    nameRu: 'Натуральные числа',
    nameKz: 'Натурал сандар',
    nameEn: 'Natural Numbers',
    subtopics: [
      { nameRu: 'Счёт и нумерация', nameKz: 'Санау және нөмірлеу', nameEn: 'Counting and numeration' },
      { nameRu: 'Разряды и классы чисел', nameKz: 'Сандардың разрядтары мен кластары', nameEn: 'Place value' },
      { nameRu: 'Сравнение чисел', nameKz: 'Сандарды салыстыру', nameEn: 'Comparing numbers' },
      { nameRu: 'Округление чисел', nameKz: 'Сандарды дөңгелектеу', nameEn: 'Rounding numbers' },
      { nameRu: 'Римские цифры', nameKz: 'Рим цифрлары', nameEn: 'Roman numerals' },
    ]
  },
  {
    nameRu: 'Арифметические действия',
    nameKz: 'Арифметикалық амалдар',
    nameEn: 'Arithmetic Operations',
    subtopics: [
      { nameRu: 'Сложение и вычитание', nameKz: 'Қосу және азайту', nameEn: 'Addition and subtraction' },
      { nameRu: 'Умножение и деление', nameKz: 'Көбейту және бөлу', nameEn: 'Multiplication and division' },
      { nameRu: 'Порядок действий', nameKz: 'Амалдар реті', nameEn: 'Order of operations' },
      { nameRu: 'Деление с остатком', nameKz: 'Қалдықпен бөлу', nameEn: 'Division with remainder' },
      { nameRu: 'Свойства арифметических действий', nameKz: 'Арифметикалық амалдардың қасиеттері', nameEn: 'Properties of operations' },
    ]
  },
  {
    nameRu: 'Делимость чисел',
    nameKz: 'Сандардың бөлінгіштігі',
    nameEn: 'Divisibility',
    subtopics: [
      { nameRu: 'Признаки делимости', nameKz: 'Бөлінгіштік белгілері', nameEn: 'Divisibility rules' },
      { nameRu: 'Простые и составные числа', nameKz: 'Жай және құрама сандар', nameEn: 'Prime and composite numbers' },
      { nameRu: 'Разложение на простые множители', nameKz: 'Жай көбейткіштерге жіктеу', nameEn: 'Prime factorization' },
      { nameRu: 'НОД и НОК', nameKz: 'ЕҮОБ және ЕҮОЕ', nameEn: 'GCD and LCM' },
    ]
  },
  {
    nameRu: 'Дроби',
    nameKz: 'Бөлшектер',
    nameEn: 'Fractions',
    subtopics: [
      { nameRu: 'Обыкновенные дроби', nameKz: 'Жай бөлшектер', nameEn: 'Common fractions' },
      { nameRu: 'Сравнение дробей', nameKz: 'Бөлшектерді салыстыру', nameEn: 'Comparing fractions' },
      { nameRu: 'Сложение и вычитание дробей', nameKz: 'Бөлшектерді қосу және азайту', nameEn: 'Adding and subtracting fractions' },
      { nameRu: 'Умножение и деление дробей', nameKz: 'Бөлшектерді көбейту және бөлу', nameEn: 'Multiplying and dividing fractions' },
      { nameRu: 'Смешанные числа', nameKz: 'Аралас сандар', nameEn: 'Mixed numbers' },
      { nameRu: 'Десятичные дроби', nameKz: 'Ондық бөлшектер', nameEn: 'Decimal fractions' },
      { nameRu: 'Перевод дробей', nameKz: 'Бөлшектерді аудару', nameEn: 'Converting fractions' },
    ]
  },
  {
    nameRu: 'Рациональные числа',
    nameKz: 'Рационал сандар',
    nameEn: 'Rational Numbers',
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
    nameEn: 'Real Numbers',
    subtopics: [
      { nameRu: 'Иррациональные числа', nameKz: 'Иррационал сандар', nameEn: 'Irrational numbers' },
      { nameRu: 'Квадратный корень', nameKz: 'Квадрат түбір', nameEn: 'Square root' },
      { nameRu: 'Корень n-ой степени', nameKz: 'N-ші дәрежелі түбір', nameEn: 'Nth root' },
      { nameRu: 'Свойства корней', nameKz: 'Түбірлердің қасиеттері', nameEn: 'Properties of roots' },
    ]
  },
  {
    nameRu: 'Степени',
    nameKz: 'Дәрежелер',
    nameEn: 'Exponents',
    subtopics: [
      { nameRu: 'Степень с натуральным показателем', nameKz: 'Натурал көрсеткішті дәреже', nameEn: 'Natural exponents' },
      { nameRu: 'Степень с целым показателем', nameKz: 'Бүтін көрсеткішті дәреже', nameEn: 'Integer exponents' },
      { nameRu: 'Степень с рациональным показателем', nameKz: 'Рационал көрсеткішті дәреже', nameEn: 'Rational exponents' },
      { nameRu: 'Свойства степеней', nameKz: 'Дәрежелердің қасиеттері', nameEn: 'Properties of exponents' },
    ]
  },

  // --- АЛГЕБРА ---
  {
    nameRu: 'Выражения и преобразования',
    nameKz: 'Өрнектер және түрлендірулер',
    nameEn: 'Expressions and Transformations',
    subtopics: [
      { nameRu: 'Числовые выражения', nameKz: 'Сандық өрнектер', nameEn: 'Numerical expressions' },
      { nameRu: 'Буквенные выражения', nameKz: 'Әріпті өрнектер', nameEn: 'Algebraic expressions' },
      { nameRu: 'Формулы сокращённого умножения', nameKz: 'Қысқаша көбейту формулалары', nameEn: 'Special product formulas' },
      { nameRu: 'Разложение на множители', nameKz: 'Көбейткіштерге жіктеу', nameEn: 'Factoring' },
      { nameRu: 'Алгебраические дроби', nameKz: 'Алгебралық бөлшектер', nameEn: 'Algebraic fractions' },
    ]
  },
  {
    nameRu: 'Многочлены',
    nameKz: 'Көпмүшеліктер',
    nameEn: 'Polynomials',
    subtopics: [
      { nameRu: 'Одночлены и многочлены', nameKz: 'Бірмүшеліктер мен көпмүшеліктер', nameEn: 'Monomials and polynomials' },
      { nameRu: 'Действия с многочленами', nameKz: 'Көпмүшеліктермен амалдар', nameEn: 'Operations with polynomials' },
      { nameRu: 'Деление многочленов', nameKz: 'Көпмүшеліктерді бөлу', nameEn: 'Polynomial division' },
      { nameRu: 'Теорема Безу', nameKz: 'Безу теоремасы', nameEn: 'Bezout\'s theorem' },
    ]
  },
  {
    nameRu: 'Уравнения',
    nameKz: 'Теңдеулер',
    nameEn: 'Equations',
    subtopics: [
      { nameRu: 'Линейные уравнения', nameKz: 'Сызықтық теңдеулер', nameEn: 'Linear equations' },
      { nameRu: 'Квадратные уравнения', nameKz: 'Квадрат теңдеулер', nameEn: 'Quadratic equations' },
      { nameRu: 'Теорема Виета', nameKz: 'Виет теоремасы', nameEn: 'Vieta\'s theorem' },
      { nameRu: 'Дробно-рациональные уравнения', nameKz: 'Бөлшек-рационал теңдеулер', nameEn: 'Rational equations' },
      { nameRu: 'Иррациональные уравнения', nameKz: 'Иррационал теңдеулер', nameEn: 'Irrational equations' },
      { nameRu: 'Уравнения высших степеней', nameKz: 'Жоғары дәрежелі теңдеулер', nameEn: 'Higher degree equations' },
      { nameRu: 'Уравнения с модулем', nameKz: 'Модульді теңдеулер', nameEn: 'Equations with absolute value' },
      { nameRu: 'Уравнения с параметром', nameKz: 'Параметрлі теңдеулер', nameEn: 'Equations with parameters' },
    ]
  },
  {
    nameRu: 'Неравенства',
    nameKz: 'Теңсіздіктер',
    nameEn: 'Inequalities',
    subtopics: [
      { nameRu: 'Числовые неравенства', nameKz: 'Сандық теңсіздіктер', nameEn: 'Numerical inequalities' },
      { nameRu: 'Линейные неравенства', nameKz: 'Сызықтық теңсіздіктер', nameEn: 'Linear inequalities' },
      { nameRu: 'Квадратные неравенства', nameKz: 'Квадрат теңсіздіктер', nameEn: 'Quadratic inequalities' },
      { nameRu: 'Метод интервалов', nameKz: 'Интервалдар әдісі', nameEn: 'Sign chart method' },
      { nameRu: 'Системы неравенств', nameKz: 'Теңсіздіктер жүйесі', nameEn: 'Systems of inequalities' },
      { nameRu: 'Неравенства с модулем', nameKz: 'Модульді теңсіздіктер', nameEn: 'Inequalities with absolute value' },
    ]
  },
  {
    nameRu: 'Системы уравнений',
    nameKz: 'Теңдеулер жүйесі',
    nameEn: 'Systems of Equations',
    subtopics: [
      { nameRu: 'Системы линейных уравнений', nameKz: 'Сызықтық теңдеулер жүйесі', nameEn: 'Systems of linear equations' },
      { nameRu: 'Метод подстановки', nameKz: 'Қою әдісі', nameEn: 'Substitution method' },
      { nameRu: 'Метод сложения', nameKz: 'Қосу әдісі', nameEn: 'Addition method' },
      { nameRu: 'Графический метод', nameKz: 'Графиктік әдіс', nameEn: 'Graphical method' },
      { nameRu: 'Нелинейные системы', nameKz: 'Сызықтық емес жүйелер', nameEn: 'Nonlinear systems' },
    ]
  },
  {
    nameRu: 'Функции',
    nameKz: 'Функциялар',
    nameEn: 'Functions',
    subtopics: [
      { nameRu: 'Понятие функции', nameKz: 'Функция ұғымы', nameEn: 'Function concept' },
      { nameRu: 'Область определения и значений', nameKz: 'Анықталу және мәндер облысы', nameEn: 'Domain and range' },
      { nameRu: 'Линейная функция', nameKz: 'Сызықтық функция', nameEn: 'Linear function' },
      { nameRu: 'Квадратичная функция', nameKz: 'Квадраттық функция', nameEn: 'Quadratic function' },
      { nameRu: 'Степенная функция', nameKz: 'Дәрежелік функция', nameEn: 'Power function' },
      { nameRu: 'Обратная пропорциональность', nameKz: 'Кері пропорционалдық', nameEn: 'Inverse proportionality' },
      { nameRu: 'Чётность и нечётность', nameKz: 'Жұптылық және тақтылық', nameEn: 'Even and odd functions' },
      { nameRu: 'Монотонность функции', nameKz: 'Функцияның монотондығы', nameEn: 'Monotonicity' },
    ]
  },
  {
    nameRu: 'Прогрессии',
    nameKz: 'Прогрессиялар',
    nameEn: 'Progressions',
    subtopics: [
      { nameRu: 'Арифметическая прогрессия', nameKz: 'Арифметикалық прогрессия', nameEn: 'Arithmetic progression' },
      { nameRu: 'Геометрическая прогрессия', nameKz: 'Геометриялық прогрессия', nameEn: 'Geometric progression' },
      { nameRu: 'Сумма членов прогрессии', nameKz: 'Прогрессия мүшелерінің қосындысы', nameEn: 'Sum of progression' },
      { nameRu: 'Бесконечно убывающая прогрессия', nameKz: 'Шексіз кемитін прогрессия', nameEn: 'Infinite decreasing progression' },
    ]
  },
  {
    nameRu: 'Показательная функция и уравнения',
    nameKz: 'Көрсеткіштік функция және теңдеулер',
    nameEn: 'Exponential Function and Equations',
    subtopics: [
      { nameRu: 'Показательная функция', nameKz: 'Көрсеткіштік функция', nameEn: 'Exponential function' },
      { nameRu: 'Показательные уравнения', nameKz: 'Көрсеткіштік теңдеулер', nameEn: 'Exponential equations' },
      { nameRu: 'Показательные неравенства', nameKz: 'Көрсеткіштік теңсіздіктер', nameEn: 'Exponential inequalities' },
    ]
  },
  {
    nameRu: 'Логарифмы',
    nameKz: 'Логарифмдер',
    nameEn: 'Logarithms',
    subtopics: [
      { nameRu: 'Понятие логарифма', nameKz: 'Логарифм ұғымы', nameEn: 'Logarithm concept' },
      { nameRu: 'Свойства логарифмов', nameKz: 'Логарифмдердің қасиеттері', nameEn: 'Properties of logarithms' },
      { nameRu: 'Логарифмическая функция', nameKz: 'Логарифмдік функция', nameEn: 'Logarithmic function' },
      { nameRu: 'Логарифмические уравнения', nameKz: 'Логарифмдік теңдеулер', nameEn: 'Logarithmic equations' },
      { nameRu: 'Логарифмические неравенства', nameKz: 'Логарифмдік теңсіздіктер', nameEn: 'Logarithmic inequalities' },
    ]
  },
  {
    nameRu: 'Тригонометрия',
    nameKz: 'Тригонометрия',
    nameEn: 'Trigonometry',
    subtopics: [
      { nameRu: 'Тригонометрические функции угла', nameKz: 'Бұрыштың тригонометриялық функциялары', nameEn: 'Trigonometric functions of angle' },
      { nameRu: 'Единичная окружность', nameKz: 'Бірлік шеңбер', nameEn: 'Unit circle' },
      { nameRu: 'Основные тождества', nameKz: 'Негізгі тепе-теңдіктер', nameEn: 'Basic identities' },
      { nameRu: 'Формулы сложения', nameKz: 'Қосу формулалары', nameEn: 'Addition formulas' },
      { nameRu: 'Формулы двойного угла', nameKz: 'Қос бұрыш формулалары', nameEn: 'Double angle formulas' },
      { nameRu: 'Тригонометрические уравнения', nameKz: 'Тригонометриялық теңдеулер', nameEn: 'Trigonometric equations' },
      { nameRu: 'Тригонометрические неравенства', nameKz: 'Тригонометриялық теңсіздіктер', nameEn: 'Trigonometric inequalities' },
      { nameRu: 'Обратные тригонометрические функции', nameKz: 'Кері тригонометриялық функциялар', nameEn: 'Inverse trigonometric functions' },
    ]
  },

  // --- ГЕОМЕТРИЯ ---
  {
    nameRu: 'Начальные геометрические сведения',
    nameKz: 'Бастапқы геометриялық мәліметтер',
    nameEn: 'Basic Geometry',
    subtopics: [
      { nameRu: 'Точка, прямая, отрезок', nameKz: 'Нүкте, түзу, кесінді', nameEn: 'Point, line, segment' },
      { nameRu: 'Луч и угол', nameKz: 'Сәуле және бұрыш', nameEn: 'Ray and angle' },
      { nameRu: 'Виды углов', nameKz: 'Бұрыш түрлері', nameEn: 'Types of angles' },
      { nameRu: 'Смежные и вертикальные углы', nameKz: 'Сыбайлас және вертикаль бұрыштар', nameEn: 'Adjacent and vertical angles' },
      { nameRu: 'Перпендикулярные прямые', nameKz: 'Перпендикуляр түзулер', nameEn: 'Perpendicular lines' },
    ]
  },
  {
    nameRu: 'Треугольники',
    nameKz: 'Үшбұрыштар',
    nameEn: 'Triangles',
    subtopics: [
      { nameRu: 'Виды треугольников', nameKz: 'Үшбұрыш түрлері', nameEn: 'Types of triangles' },
      { nameRu: 'Признаки равенства треугольников', nameKz: 'Үшбұрыштардың теңдік белгілері', nameEn: 'Triangle congruence criteria' },
      { nameRu: 'Равнобедренный треугольник', nameKz: 'Тең бүйірлі үшбұрыш', nameEn: 'Isosceles triangle' },
      { nameRu: 'Прямоугольный треугольник', nameKz: 'Тікбұрышты үшбұрыш', nameEn: 'Right triangle' },
      { nameRu: 'Сумма углов треугольника', nameKz: 'Үшбұрыш бұрыштарының қосындысы', nameEn: 'Sum of angles in triangle' },
      { nameRu: 'Неравенство треугольника', nameKz: 'Үшбұрыш теңсіздігі', nameEn: 'Triangle inequality' },
      { nameRu: 'Медиана, биссектриса, высота', nameKz: 'Медиана, биссектриса, биіктік', nameEn: 'Median, bisector, altitude' },
      { nameRu: 'Подобие треугольников', nameKz: 'Үшбұрыштардың ұқсастығы', nameEn: 'Similar triangles' },
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
      { nameRu: 'Сумма углов многоугольника', nameKz: 'Көпбұрыш бұрыштарының қосындысы', nameEn: 'Sum of angles in polygon' },
      { nameRu: 'Правильные многоугольники', nameKz: 'Дұрыс көпбұрыштар', nameEn: 'Regular polygons' },
      { nameRu: 'Вписанные и описанные многоугольники', nameKz: 'Іштей және сырттай сызылған көпбұрыштар', nameEn: 'Inscribed and circumscribed polygons' },
    ]
  },
  {
    nameRu: 'Окружность и круг',
    nameKz: 'Шеңбер және дөңгелек',
    nameEn: 'Circle',
    subtopics: [
      { nameRu: 'Окружность и её элементы', nameKz: 'Шеңбер және оның элементтері', nameEn: 'Circle and its elements' },
      { nameRu: 'Центральный и вписанный угол', nameKz: 'Центрлік және іштей сызылған бұрыш', nameEn: 'Central and inscribed angle' },
      { nameRu: 'Касательная к окружности', nameKz: 'Шеңберге жанама', nameEn: 'Tangent to circle' },
      { nameRu: 'Вписанная и описанная окружность', nameKz: 'Іштей және сырттай сызылған шеңбер', nameEn: 'Inscribed and circumscribed circle' },
      { nameRu: 'Длина окружности и площадь круга', nameKz: 'Шеңбер ұзындығы және дөңгелек ауданы', nameEn: 'Circumference and area' },
    ]
  },
  {
    nameRu: 'Площади фигур',
    nameKz: 'Фигуралар аудандары',
    nameEn: 'Areas',
    subtopics: [
      { nameRu: 'Площадь прямоугольника и квадрата', nameKz: 'Тіктөртбұрыш пен шаршы ауданы', nameEn: 'Area of rectangle and square' },
      { nameRu: 'Площадь треугольника', nameKz: 'Үшбұрыш ауданы', nameEn: 'Area of triangle' },
      { nameRu: 'Площадь параллелограмма', nameKz: 'Параллелограмм ауданы', nameEn: 'Area of parallelogram' },
      { nameRu: 'Площадь трапеции', nameKz: 'Трапеция ауданы', nameEn: 'Area of trapezoid' },
      { nameRu: 'Формула Герона', nameKz: 'Герон формуласы', nameEn: 'Heron\'s formula' },
    ]
  },
  {
    nameRu: 'Теорема Пифагора',
    nameKz: 'Пифагор теоремасы',
    nameEn: 'Pythagorean Theorem',
    subtopics: [
      { nameRu: 'Теорема Пифагора', nameKz: 'Пифагор теоремасы', nameEn: 'Pythagorean theorem' },
      { nameRu: 'Обратная теорема', nameKz: 'Кері теорема', nameEn: 'Converse theorem' },
      { nameRu: 'Пифагоровы тройки', nameKz: 'Пифагор үштіктері', nameEn: 'Pythagorean triples' },
    ]
  },
  {
    nameRu: 'Тригонометрия в геометрии',
    nameKz: 'Геометриядағы тригонометрия',
    nameEn: 'Trigonometry in Geometry',
    subtopics: [
      { nameRu: 'Синус, косинус, тангенс угла', nameKz: 'Бұрыштың синусы, косинусы, тангенсі', nameEn: 'Sine, cosine, tangent' },
      { nameRu: 'Теорема синусов', nameKz: 'Синустар теоремасы', nameEn: 'Law of sines' },
      { nameRu: 'Теорема косинусов', nameKz: 'Косинустар теоремасы', nameEn: 'Law of cosines' },
      { nameRu: 'Решение треугольников', nameKz: 'Үшбұрыштарды шешу', nameEn: 'Solving triangles' },
    ]
  },
  {
    nameRu: 'Векторы на плоскости',
    nameKz: 'Жазықтықтағы векторлар',
    nameEn: 'Vectors in Plane',
    subtopics: [
      { nameRu: 'Понятие вектора', nameKz: 'Вектор ұғымы', nameEn: 'Vector concept' },
      { nameRu: 'Сложение и вычитание векторов', nameKz: 'Векторларды қосу және азайту', nameEn: 'Adding and subtracting vectors' },
      { nameRu: 'Умножение вектора на число', nameKz: 'Векторды санға көбейту', nameEn: 'Scalar multiplication' },
      { nameRu: 'Скалярное произведение', nameKz: 'Скалярлық көбейтінді', nameEn: 'Dot product' },
      { nameRu: 'Координаты вектора', nameKz: 'Вектор координаталары', nameEn: 'Vector coordinates' },
    ]
  },
  {
    nameRu: 'Координаты на плоскости',
    nameKz: 'Жазықтықтағы координаталар',
    nameEn: 'Coordinates in Plane',
    subtopics: [
      { nameRu: 'Координатная плоскость', nameKz: 'Координаталық жазықтық', nameEn: 'Coordinate plane' },
      { nameRu: 'Расстояние между точками', nameKz: 'Нүктелер арасындағы қашықтық', nameEn: 'Distance between points' },
      { nameRu: 'Координаты середины отрезка', nameKz: 'Кесінді ортасының координаталары', nameEn: 'Midpoint coordinates' },
      { nameRu: 'Уравнение прямой', nameKz: 'Түзу теңдеуі', nameEn: 'Line equation' },
      { nameRu: 'Уравнение окружности', nameKz: 'Шеңбер теңдеуі', nameEn: 'Circle equation' },
    ]
  },
  {
    nameRu: 'Преобразования плоскости',
    nameKz: 'Жазықтық түрлендірулері',
    nameEn: 'Plane Transformations',
    subtopics: [
      { nameRu: 'Симметрия относительно точки', nameKz: 'Нүктеге қатысты симметрия', nameEn: 'Point symmetry' },
      { nameRu: 'Симметрия относительно прямой', nameKz: 'Түзуге қатысты симметрия', nameEn: 'Line symmetry' },
      { nameRu: 'Параллельный перенос', nameKz: 'Параллель көшіру', nameEn: 'Translation' },
      { nameRu: 'Поворот', nameKz: 'Бұру', nameEn: 'Rotation' },
      { nameRu: 'Гомотетия', nameKz: 'Гомотетия', nameEn: 'Homothety' },
    ]
  },
  {
    nameRu: 'Стереометрия',
    nameKz: 'Стереометрия',
    nameEn: 'Stereometry',
    subtopics: [
      { nameRu: 'Аксиомы стереометрии', nameKz: 'Стереометрия аксиомалары', nameEn: 'Axioms of stereometry' },
      { nameRu: 'Параллельность в пространстве', nameKz: 'Кеңістіктегі параллельдік', nameEn: 'Parallelism in space' },
      { nameRu: 'Перпендикулярность в пространстве', nameKz: 'Кеңістіктегі перпендикулярлық', nameEn: 'Perpendicularity in space' },
      { nameRu: 'Многогранники', nameKz: 'Көпжақтар', nameEn: 'Polyhedra' },
      { nameRu: 'Призма', nameKz: 'Призма', nameEn: 'Prism' },
      { nameRu: 'Пирамида', nameKz: 'Пирамида', nameEn: 'Pyramid' },
      { nameRu: 'Цилиндр', nameKz: 'Цилиндр', nameEn: 'Cylinder' },
      { nameRu: 'Конус', nameKz: 'Конус', nameEn: 'Cone' },
      { nameRu: 'Сфера и шар', nameKz: 'Сфера және шар', nameEn: 'Sphere and ball' },
      { nameRu: 'Объёмы тел', nameKz: 'Дене көлемдері', nameEn: 'Volumes' },
    ]
  },

  // --- АНАЛИЗ ДАННЫХ ---
  {
    nameRu: 'Комбинаторика',
    nameKz: 'Комбинаторика',
    nameEn: 'Combinatorics',
    subtopics: [
      { nameRu: 'Правило умножения', nameKz: 'Көбейту ережесі', nameEn: 'Multiplication principle' },
      { nameRu: 'Перестановки', nameKz: 'Алмастырулар', nameEn: 'Permutations' },
      { nameRu: 'Размещения', nameKz: 'Орналастырулар', nameEn: 'Arrangements' },
      { nameRu: 'Сочетания', nameKz: 'Тіркестер', nameEn: 'Combinations' },
      { nameRu: 'Бином Ньютона', nameKz: 'Ньютон биномы', nameEn: 'Binomial theorem' },
    ]
  },
  {
    nameRu: 'Теория вероятностей',
    nameKz: 'Ықтималдықтар теориясы',
    nameEn: 'Probability Theory',
    subtopics: [
      { nameRu: 'Вероятность события', nameKz: 'Оқиға ықтималдығы', nameEn: 'Probability of event' },
      { nameRu: 'Сложение вероятностей', nameKz: 'Ықтималдықтарды қосу', nameEn: 'Addition of probabilities' },
      { nameRu: 'Умножение вероятностей', nameKz: 'Ықтималдықтарды көбейту', nameEn: 'Multiplication of probabilities' },
      { nameRu: 'Условная вероятность', nameKz: 'Шартты ықтималдық', nameEn: 'Conditional probability' },
    ]
  },
  {
    nameRu: 'Статистика',
    nameKz: 'Статистика',
    nameEn: 'Statistics',
    subtopics: [
      { nameRu: 'Среднее арифметическое', nameKz: 'Арифметикалық орта', nameEn: 'Mean' },
      { nameRu: 'Медиана и мода', nameKz: 'Медиана және мода', nameEn: 'Median and mode' },
      { nameRu: 'Размах', nameKz: 'Ауқым', nameEn: 'Range' },
      { nameRu: 'Диаграммы и графики', nameKz: 'Диаграммалар мен графиктер', nameEn: 'Charts and graphs' },
    ]
  },

  // --- ТЕКСТОВЫЕ ЗАДАЧИ ---
  {
    nameRu: 'Текстовые задачи',
    nameKz: 'Мәтінді есептер',
    nameEn: 'Word Problems',
    subtopics: [
      { nameRu: 'Задачи на части', nameKz: 'Бөліктерге есептер', nameEn: 'Part problems' },
      { nameRu: 'Задачи на проценты', nameKz: 'Пайыздарға есептер', nameEn: 'Percent problems' },
      { nameRu: 'Задачи на движение', nameKz: 'Қозғалыс есептері', nameEn: 'Motion problems' },
      { nameRu: 'Задачи на работу', nameKz: 'Жұмыс есептері', nameEn: 'Work problems' },
      { nameRu: 'Задачи на смеси и сплавы', nameKz: 'Қоспа есептері', nameEn: 'Mixture problems' },
      { nameRu: 'Задачи на концентрацию', nameKz: 'Концентрация есептері', nameEn: 'Concentration problems' },
    ]
  },
];

// ============================================
// ЧАСТЬ 2: ЛОГИКА
// ============================================
const logicTopics: Topic[] = [
  {
    nameRu: 'Логика',
    nameKz: 'Логика',
    nameEn: 'Logic',
    subtopics: [
      { nameRu: 'Высказывания и логические операции', nameKz: 'Пайымдаулар мен логикалық амалдар', nameEn: 'Statements and logical operations' },
      { nameRu: 'Отрицание, конъюнкция, дизъюнкция', nameKz: 'Терістеу, конъюнкция, дизъюнкция', nameEn: 'Negation, conjunction, disjunction' },
      { nameRu: 'Импликация и эквивалентность', nameKz: 'Импликация және эквиваленттілік', nameEn: 'Implication and equivalence' },
      { nameRu: 'Таблицы истинности', nameKz: 'Ақиқаттық кестелер', nameEn: 'Truth tables' },
      { nameRu: 'Логические задачи', nameKz: 'Логикалық есептер', nameEn: 'Logic puzzles' },
      { nameRu: 'Задачи на сопоставление', nameKz: 'Сәйкестендіру есептері', nameEn: 'Matching problems' },
      { nameRu: 'Рыцари и лжецы', nameKz: 'Рыцарлар мен өтірікшілер', nameEn: 'Knights and knaves' },
      { nameRu: 'Задачи на взвешивание', nameKz: 'Өлшеу есептері', nameEn: 'Weighing problems' },
      { nameRu: 'Задачи на переливание', nameKz: 'Құю есептері', nameEn: 'Pouring problems' },
      { nameRu: 'Задачи на переправу', nameKz: 'Өту есептері', nameEn: 'Crossing problems' },
    ]
  },
];

// ============================================
// ЧАСТЬ 3: ОЛИМПИАДНЫЕ ТЕМЫ
// ============================================
const olympiadTopics: Topic[] = [
  {
    nameRu: 'Принцип Дирихле',
    nameKz: 'Дирихле принципі',
    nameEn: 'Pigeonhole Principle',
    subtopics: [
      { nameRu: 'Классический принцип Дирихле', nameKz: 'Классикалық Дирихле принципі', nameEn: 'Classic pigeonhole principle' },
      { nameRu: 'Обобщённый принцип', nameKz: 'Жалпыланған принцип', nameEn: 'Generalized principle' },
      { nameRu: 'Применение в геометрии', nameKz: 'Геометрияда қолдану', nameEn: 'Applications in geometry' },
      { nameRu: 'Применение в комбинаторике', nameKz: 'Комбинаторикада қолдану', nameEn: 'Applications in combinatorics' },
    ]
  },
  {
    nameRu: 'Инварианты',
    nameKz: 'Инварианттар',
    nameEn: 'Invariants',
    subtopics: [
      { nameRu: 'Понятие инварианта', nameKz: 'Инвариант ұғымы', nameEn: 'Invariant concept' },
      { nameRu: 'Инварианты чётности', nameKz: 'Жұптылық инварианттары', nameEn: 'Parity invariants' },
      { nameRu: 'Инварианты по модулю', nameKz: 'Модуль бойынша инварианттар', nameEn: 'Modular invariants' },
      { nameRu: 'Полуинварианты', nameKz: 'Жартылай инварианттар', nameEn: 'Semi-invariants' },
      { nameRu: 'Раскраски', nameKz: 'Бояулар', nameEn: 'Colorings' },
    ]
  },
  {
    nameRu: 'Графы',
    nameKz: 'Графтар',
    nameEn: 'Graphs',
    subtopics: [
      { nameRu: 'Основные понятия теории графов', nameKz: 'Граф теориясының негізгі ұғымдары', nameEn: 'Basic graph concepts' },
      { nameRu: 'Степени вершин', nameKz: 'Төбелер дәрежелері', nameEn: 'Vertex degrees' },
      { nameRu: 'Эйлеровы и гамильтоновы пути', nameKz: 'Эйлер және Гамильтон жолдары', nameEn: 'Eulerian and Hamiltonian paths' },
      { nameRu: 'Деревья', nameKz: 'Ағаштар', nameEn: 'Trees' },
      { nameRu: 'Планарные графы', nameKz: 'Жазық графтар', nameEn: 'Planar graphs' },
      { nameRu: 'Раскраска графов', nameKz: 'Графтарды бояу', nameEn: 'Graph coloring' },
    ]
  },
  {
    nameRu: 'Математические игры',
    nameKz: 'Математикалық ойындар',
    nameEn: 'Mathematical Games',
    subtopics: [
      { nameRu: 'Игры с симметрией', nameKz: 'Симметриялы ойындар', nameEn: 'Symmetry games' },
      { nameRu: 'Игра Ним', nameKz: 'Ним ойыны', nameEn: 'Nim game' },
      { nameRu: 'Выигрышные позиции', nameKz: 'Жеңіс позициялары', nameEn: 'Winning positions' },
      { nameRu: 'Стратегия первого и второго игрока', nameKz: 'Бірінші және екінші ойыншы стратегиясы', nameEn: 'First and second player strategy' },
    ]
  },
  {
    nameRu: 'Теория чисел (олимпиадная)',
    nameKz: 'Сандар теориясы (олимпиадалық)',
    nameEn: 'Number Theory (Olympiad)',
    subtopics: [
      { nameRu: 'Алгоритм Евклида', nameKz: 'Евклид алгоритмі', nameEn: 'Euclidean algorithm' },
      { nameRu: 'Линейные диофантовы уравнения', nameKz: 'Сызықтық диофант теңдеулері', nameEn: 'Linear Diophantine equations' },
      { nameRu: 'Сравнения по модулю', nameKz: 'Модуль бойынша салыстыру', nameEn: 'Modular arithmetic' },
      { nameRu: 'Малая теорема Ферма', nameKz: 'Ферманың кіші теоремасы', nameEn: 'Fermat\'s little theorem' },
      { nameRu: 'Функция Эйлера', nameKz: 'Эйлер функциясы', nameEn: 'Euler\'s totient function' },
      { nameRu: 'Китайская теорема об остатках', nameKz: 'Қалдықтар туралы қытай теоремасы', nameEn: 'Chinese remainder theorem' },
    ]
  },
  {
    nameRu: 'Уравнения в целых числах',
    nameKz: 'Бүтін сандардағы теңдеулер',
    nameEn: 'Diophantine Equations',
    subtopics: [
      { nameRu: 'Методы решения диофантовых уравнений', nameKz: 'Диофант теңдеулерін шешу әдістері', nameEn: 'Methods for Diophantine equations' },
      { nameRu: 'Уравнение Пифагора', nameKz: 'Пифагор теңдеуі', nameEn: 'Pythagorean equation' },
      { nameRu: 'Уравнение Пелля', nameKz: 'Пелль теңдеуі', nameEn: 'Pell\'s equation' },
      { nameRu: 'Метод бесконечного спуска', nameKz: 'Шексіз түсу әдісі', nameEn: 'Infinite descent' },
    ]
  },
  {
    nameRu: 'Олимпиадная геометрия',
    nameKz: 'Олимпиадалық геометрия',
    nameEn: 'Olympiad Geometry',
    subtopics: [
      { nameRu: 'Замечательные точки треугольника', nameKz: 'Үшбұрыштың ерекше нүктелері', nameEn: 'Notable points of triangle' },
      { nameRu: 'Прямая Эйлера', nameKz: 'Эйлер түзуі', nameEn: 'Euler line' },
      { nameRu: 'Окружность Эйлера', nameKz: 'Эйлер шеңбері', nameEn: 'Nine-point circle' },
      { nameRu: 'Теорема Менелая', nameKz: 'Менелай теоремасы', nameEn: 'Menelaus theorem' },
      { nameRu: 'Теорема Чевы', nameKz: 'Чева теоремасы', nameEn: 'Ceva\'s theorem' },
      { nameRu: 'Теорема Птолемея', nameKz: 'Птолемей теоремасы', nameEn: 'Ptolemy\'s theorem' },
      { nameRu: 'Инверсия', nameKz: 'Инверсия', nameEn: 'Inversion' },
      { nameRu: 'Радикальная ось', nameKz: 'Радикал осі', nameEn: 'Radical axis' },
    ]
  },
  {
    nameRu: 'Олимпиадные неравенства',
    nameKz: 'Олимпиадалық теңсіздіктер',
    nameEn: 'Olympiad Inequalities',
    subtopics: [
      { nameRu: 'Неравенство о средних', nameKz: 'Орталар туралы теңсіздік', nameEn: 'AM-GM inequality' },
      { nameRu: 'Неравенство Коши-Буняковского', nameKz: 'Коши-Буняковский теңсіздігі', nameEn: 'Cauchy-Schwarz inequality' },
      { nameRu: 'Неравенство Йенсена', nameKz: 'Йенсен теңсіздігі', nameEn: 'Jensen\'s inequality' },
      { nameRu: 'Метод замены переменных', nameKz: 'Айнымалыларды ауыстыру әдісі', nameEn: 'Substitution method' },
      { nameRu: 'Метод Мурхеда', nameKz: 'Мурхед әдісі', nameEn: 'Muirhead\'s method' },
    ]
  },
  {
    nameRu: 'Функциональные уравнения',
    nameKz: 'Функционалдық теңдеулер',
    nameEn: 'Functional Equations',
    subtopics: [
      { nameRu: 'Уравнение Коши', nameKz: 'Коши теңдеуі', nameEn: 'Cauchy\'s equation' },
      { nameRu: 'Методы решения', nameKz: 'Шешу әдістері', nameEn: 'Solution methods' },
      { nameRu: 'Подстановка значений', nameKz: 'Мәндерді қою', nameEn: 'Value substitution' },
      { nameRu: 'Функциональные неравенства', nameKz: 'Функционалдық теңсіздіктер', nameEn: 'Functional inequalities' },
    ]
  },
  {
    nameRu: 'Комбинаторика (олимпиадная)',
    nameKz: 'Комбинаторика (олимпиадалық)',
    nameEn: 'Combinatorics (Olympiad)',
    subtopics: [
      { nameRu: 'Принцип включений-исключений', nameKz: 'Қосу-алу принципі', nameEn: 'Inclusion-exclusion' },
      { nameRu: 'Биномиальные коэффициенты', nameKz: 'Биномиалды коэффициенттер', nameEn: 'Binomial coefficients' },
      { nameRu: 'Числа Каталана', nameKz: 'Каталан сандары', nameEn: 'Catalan numbers' },
      { nameRu: 'Рекуррентные соотношения', nameKz: 'Рекурренттік қатынастар', nameEn: 'Recurrence relations' },
      { nameRu: 'Производящие функции', nameKz: 'Туындаушы функциялар', nameEn: 'Generating functions' },
    ]
  },
  {
    nameRu: 'Индукция',
    nameKz: 'Индукция',
    nameEn: 'Induction',
    subtopics: [
      { nameRu: 'Метод математической индукции', nameKz: 'Математикалық индукция әдісі', nameEn: 'Mathematical induction' },
      { nameRu: 'Сильная индукция', nameKz: 'Күшті индукция', nameEn: 'Strong induction' },
      { nameRu: 'Индукция в комбинаторике', nameKz: 'Комбинаторикадағы индукция', nameEn: 'Induction in combinatorics' },
      { nameRu: 'Индукция в геометрии', nameKz: 'Геометриядағы индукция', nameEn: 'Induction in geometry' },
    ]
  },
  {
    nameRu: 'Классические олимпиадные задачи',
    nameKz: 'Классикалық олимпиадалық есептер',
    nameEn: 'Classic Olympiad Problems',
    subtopics: [
      { nameRu: 'Головы и ноги', nameKz: 'Бастар мен аяқтар', nameEn: 'Heads and legs' },
      { nameRu: 'Задачи на часы', nameKz: 'Сағат есептері', nameEn: 'Clock problems' },
      { nameRu: 'Задачи на календарь', nameKz: 'Күнтізбе есептері', nameEn: 'Calendar problems' },
      { nameRu: 'Числовые ребусы', nameKz: 'Сандық ребустар', nameEn: 'Number rebuses' },
      { nameRu: 'Магические квадраты', nameKz: 'Сиқырлы квадраттар', nameEn: 'Magic squares' },
      { nameRu: 'Задачи на разрезание', nameKz: 'Кесу есептері', nameEn: 'Cutting problems' },
    ]
  },
  {
    nameRu: 'Экстремальные принципы',
    nameKz: 'Экстремалды принциптер',
    nameEn: 'Extremal Principles',
    subtopics: [
      { nameRu: 'Метод крайнего', nameKz: 'Шеткі әдіс', nameEn: 'Extreme element method' },
      { nameRu: 'Метод минимального контрпримера', nameKz: 'Минималды қарсы мысал әдісі', nameEn: 'Minimal counterexample' },
      { nameRu: 'Оценка и пример', nameKz: 'Бағалау және мысал', nameEn: 'Estimation and example' },
    ]
  },
  {
    nameRu: 'Конструкции',
    nameKz: 'Конструкциялар',
    nameEn: 'Constructions',
    subtopics: [
      { nameRu: 'Построение примеров', nameKz: 'Мысалдар құру', nameEn: 'Building examples' },
      { nameRu: 'Построение контрпримеров', nameKz: 'Қарсы мысалдар құру', nameEn: 'Building counterexamples' },
      { nameRu: 'Доказательство существования', nameKz: 'Болуын дәлелдеу', nameEn: 'Existence proofs' },
    ]
  },
  {
    nameRu: 'Пространственное мышление',
    nameKz: 'Кеңістіктік ойлау',
    nameEn: 'Spatial Reasoning',
    subtopics: [
      { nameRu: 'Развёртки', nameKz: 'Жазбалар', nameEn: 'Nets' },
      { nameRu: 'Проекции', nameKz: 'Проекциялар', nameEn: 'Projections' },
      { nameRu: 'Сечения', nameKz: 'Қималар', nameEn: 'Cross-sections' },
      { nameRu: 'Подсчёт кубиков', nameKz: 'Кубиктерді санау', nameEn: 'Counting cubes' },
    ]
  },
];

async function rebuildMathTopics() {
  console.log('=== ПЕРЕСБОРКА БАЗЫ ТЕМ ПО МАТЕМАТИКЕ ===\n');

  // Находим предмет Математика
  const mathSubject = await prisma.taskSubject.findFirst({
    where: { nameRu: 'Математика' }
  });

  if (!mathSubject) {
    console.error('Предмет "Математика" не найден!');
    return;
  }

  // Удаляем все существующие темы
  console.log('Удаление существующих тем...');
  const deletedSubtopics = await prisma.taskSubtopic.deleteMany({
    where: { topic: { subjectId: mathSubject.id } }
  });
  const deletedTopics = await prisma.taskTopic.deleteMany({
    where: { subjectId: mathSubject.id }
  });
  console.log(`Удалено: ${deletedTopics.count} тем, ${deletedSubtopics.count} подтем\n`);

  let orderIndex = 1;
  let totalTopics = 0;
  let totalSubtopics = 0;

  // Функция для добавления тем
  async function addTopics(topics: Topic[], sectionName: string) {
    console.log(`--- ${sectionName} ---`);
    for (const topic of topics) {
      const newTopic = await prisma.taskTopic.create({
        data: {
          subjectId: mathSubject.id,
          name: topic.nameRu,
          nameRu: topic.nameRu,
          nameKz: topic.nameKz,
          nameEn: topic.nameEn,
          orderIndex: orderIndex++
        }
      });
      totalTopics++;

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
        totalSubtopics++;
      }
      console.log(`✓ ${topic.nameRu} (${topic.subtopics.length} подтем)`);
    }
    console.log('');
  }

  // Добавляем темы по разделам
  await addTopics(schoolTopics, 'ШКОЛЬНАЯ ПРОГРАММА (ГОСО РК)');
  await addTopics(logicTopics, 'ЛОГИКА');
  await addTopics(olympiadTopics, 'ОЛИМПИАДНЫЕ ТЕМЫ');

  console.log('========================================');
  console.log(`ИТОГО: ${totalTopics} тем, ${totalSubtopics} подтем`);
  console.log('========================================');
}

rebuildMathTopics()
  .catch(console.error)
  .finally(() => {
    pool.end();
    process.exit(0);
  });
