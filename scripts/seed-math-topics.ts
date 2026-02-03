import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://mz@localhost:5432/ertis_classroom?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ГОСО Республики Казахстан - Математика
// Все темы в порядке изучения (без привязки к классам)

interface SubtopicData {
  name: string;
  nameKz: string;
  nameRu: string;
  nameEn: string;
}

interface TopicData {
  name: string;
  nameKz: string;
  nameRu: string;
  nameEn: string;
  subtopics: SubtopicData[];
}

const mathTopics: TopicData[] = [
  // ==================== АРИФМЕТИКА ====================
  {
    name: 'Натуральные числа',
    nameKz: 'Натурал сандар',
    nameRu: 'Натуральные числа',
    nameEn: 'Natural numbers',
    subtopics: [
      { name: 'Счёт предметов', nameKz: 'Заттарды санау', nameRu: 'Счёт предметов', nameEn: 'Counting objects' },
      { name: 'Цифры и числа', nameKz: 'Цифрлар мен сандар', nameRu: 'Цифры и числа', nameEn: 'Digits and numbers' },
      { name: 'Однозначные числа', nameKz: 'Бір таңбалы сандар', nameRu: 'Однозначные числа', nameEn: 'Single-digit numbers' },
      { name: 'Двузначные числа', nameKz: 'Екі таңбалы сандар', nameRu: 'Двузначные числа', nameEn: 'Two-digit numbers' },
      { name: 'Трёхзначные числа', nameKz: 'Үш таңбалы сандар', nameRu: 'Трёхзначные числа', nameEn: 'Three-digit numbers' },
      { name: 'Многозначные числа', nameKz: 'Көп таңбалы сандар', nameRu: 'Многозначные числа', nameEn: 'Multi-digit numbers' },
      { name: 'Разряды и классы', nameKz: 'Разрядтар мен кластар', nameRu: 'Разряды и классы', nameEn: 'Place values and periods' },
      { name: 'Сравнение чисел', nameKz: 'Сандарды салыстыру', nameRu: 'Сравнение чисел', nameEn: 'Comparing numbers' },
      { name: 'Округление чисел', nameKz: 'Сандарды дөңгелектеу', nameRu: 'Округление чисел', nameEn: 'Rounding numbers' },
    ]
  },
  {
    name: 'Сложение и вычитание',
    nameKz: 'Қосу және азайту',
    nameRu: 'Сложение и вычитание',
    nameEn: 'Addition and subtraction',
    subtopics: [
      { name: 'Сложение чисел', nameKz: 'Сандарды қосу', nameRu: 'Сложение чисел', nameEn: 'Adding numbers' },
      { name: 'Вычитание чисел', nameKz: 'Сандарды азайту', nameRu: 'Вычитание чисел', nameEn: 'Subtracting numbers' },
      { name: 'Состав числа', nameKz: 'Санның құрамы', nameRu: 'Состав числа', nameEn: 'Number composition' },
      { name: 'Сложение с переходом через разряд', nameKz: 'Разряд арқылы өту арқылы қосу', nameRu: 'Сложение с переходом через разряд', nameEn: 'Addition with carrying' },
      { name: 'Вычитание с переходом через разряд', nameKz: 'Разряд арқылы өту арқылы азайту', nameRu: 'Вычитание с переходом через разряд', nameEn: 'Subtraction with borrowing' },
      { name: 'Устные приёмы вычислений', nameKz: 'Есептеудің ауызша тәсілдері', nameRu: 'Устные приёмы вычислений', nameEn: 'Mental math' },
      { name: 'Письменные приёмы вычислений', nameKz: 'Есептеудің жазбаша тәсілдері', nameRu: 'Письменные приёмы вычислений', nameEn: 'Written computation' },
    ]
  },
  {
    name: 'Умножение и деление',
    nameKz: 'Көбейту және бөлу',
    nameRu: 'Умножение и деление',
    nameEn: 'Multiplication and division',
    subtopics: [
      { name: 'Понятие умножения', nameKz: 'Көбейту түсінігі', nameRu: 'Понятие умножения', nameEn: 'Concept of multiplication' },
      { name: 'Понятие деления', nameKz: 'Бөлу түсінігі', nameRu: 'Понятие деления', nameEn: 'Concept of division' },
      { name: 'Таблица умножения', nameKz: 'Көбейту кестесі', nameRu: 'Таблица умножения', nameEn: 'Multiplication table' },
      { name: 'Деление с остатком', nameKz: 'Қалдықпен бөлу', nameRu: 'Деление с остатком', nameEn: 'Division with remainder' },
      { name: 'Умножение многозначных чисел', nameKz: 'Көп таңбалы сандарды көбейту', nameRu: 'Умножение многозначных чисел', nameEn: 'Multiplication of multi-digit numbers' },
      { name: 'Деление многозначных чисел', nameKz: 'Көп таңбалы сандарды бөлу', nameRu: 'Деление многозначных чисел', nameEn: 'Division of multi-digit numbers' },
      { name: 'Порядок действий', nameKz: 'Амалдардың реті', nameRu: 'Порядок действий', nameEn: 'Order of operations' },
    ]
  },
  {
    name: 'Делимость чисел',
    nameKz: 'Сандардың бөлінгіштігі',
    nameRu: 'Делимость чисел',
    nameEn: 'Divisibility',
    subtopics: [
      { name: 'Делители и кратные', nameKz: 'Бөлгіштер және еселіктер', nameRu: 'Делители и кратные', nameEn: 'Divisors and multiples' },
      { name: 'Признаки делимости', nameKz: 'Бөлінгіштік белгілері', nameRu: 'Признаки делимости', nameEn: 'Divisibility rules' },
      { name: 'Простые и составные числа', nameKz: 'Жай және құрама сандар', nameRu: 'Простые и составные числа', nameEn: 'Prime and composite numbers' },
      { name: 'Разложение на простые множители', nameKz: 'Жай көбейткіштерге жіктеу', nameRu: 'Разложение на простые множители', nameEn: 'Prime factorization' },
      { name: 'НОД и НОК', nameKz: 'ЕҮОБ және ЕКОЕ', nameRu: 'НОД и НОК', nameEn: 'GCD and LCM' },
    ]
  },
  {
    name: 'Обыкновенные дроби',
    nameKz: 'Жай бөлшектер',
    nameRu: 'Обыкновенные дроби',
    nameEn: 'Common fractions',
    subtopics: [
      { name: 'Понятие дроби', nameKz: 'Бөлшек түсінігі', nameRu: 'Понятие дроби', nameEn: 'Concept of fraction' },
      { name: 'Правильные и неправильные дроби', nameKz: 'Дұрыс және бұрыс бөлшектер', nameRu: 'Правильные и неправильные дроби', nameEn: 'Proper and improper fractions' },
      { name: 'Смешанные числа', nameKz: 'Аралас сандар', nameRu: 'Смешанные числа', nameEn: 'Mixed numbers' },
      { name: 'Основное свойство дроби', nameKz: 'Бөлшектің негізгі қасиеті', nameRu: 'Основное свойство дроби', nameEn: 'Fundamental property of fractions' },
      { name: 'Сокращение дробей', nameKz: 'Бөлшектерді қысқарту', nameRu: 'Сокращение дробей', nameEn: 'Reducing fractions' },
      { name: 'Приведение к общему знаменателю', nameKz: 'Ортақ бөлімге келтіру', nameRu: 'Приведение к общему знаменателю', nameEn: 'Finding common denominator' },
      { name: 'Сравнение дробей', nameKz: 'Бөлшектерді салыстыру', nameRu: 'Сравнение дробей', nameEn: 'Comparing fractions' },
      { name: 'Сложение и вычитание дробей', nameKz: 'Бөлшектерді қосу және азайту', nameRu: 'Сложение и вычитание дробей', nameEn: 'Adding and subtracting fractions' },
      { name: 'Умножение и деление дробей', nameKz: 'Бөлшектерді көбейту және бөлу', nameRu: 'Умножение и деление дробей', nameEn: 'Multiplying and dividing fractions' },
    ]
  },
  {
    name: 'Десятичные дроби',
    nameKz: 'Ондық бөлшектер',
    nameRu: 'Десятичные дроби',
    nameEn: 'Decimal fractions',
    subtopics: [
      { name: 'Понятие десятичной дроби', nameKz: 'Ондық бөлшек түсінігі', nameRu: 'Понятие десятичной дроби', nameEn: 'Concept of decimal fraction' },
      { name: 'Сравнение десятичных дробей', nameKz: 'Ондық бөлшектерді салыстыру', nameRu: 'Сравнение десятичных дробей', nameEn: 'Comparing decimals' },
      { name: 'Сложение и вычитание десятичных дробей', nameKz: 'Ондық бөлшектерді қосу және азайту', nameRu: 'Сложение и вычитание десятичных дробей', nameEn: 'Adding and subtracting decimals' },
      { name: 'Умножение десятичных дробей', nameKz: 'Ондық бөлшектерді көбейту', nameRu: 'Умножение десятичных дробей', nameEn: 'Multiplying decimals' },
      { name: 'Деление десятичных дробей', nameKz: 'Ондық бөлшектерді бөлу', nameRu: 'Деление десятичных дробей', nameEn: 'Dividing decimals' },
      { name: 'Округление десятичных дробей', nameKz: 'Ондық бөлшектерді дөңгелектеу', nameRu: 'Округление десятичных дробей', nameEn: 'Rounding decimals' },
      { name: 'Перевод дробей', nameKz: 'Бөлшектерді аудару', nameRu: 'Перевод дробей', nameEn: 'Converting fractions' },
    ]
  },
  {
    name: 'Рациональные числа',
    nameKz: 'Рационал сандар',
    nameRu: 'Рациональные числа',
    nameEn: 'Rational numbers',
    subtopics: [
      { name: 'Положительные и отрицательные числа', nameKz: 'Оң және теріс сандар', nameRu: 'Положительные и отрицательные числа', nameEn: 'Positive and negative numbers' },
      { name: 'Координатная прямая', nameKz: 'Координаталық түзу', nameRu: 'Координатная прямая', nameEn: 'Number line' },
      { name: 'Модуль числа', nameKz: 'Санның модулі', nameRu: 'Модуль числа', nameEn: 'Absolute value' },
      { name: 'Сравнение рациональных чисел', nameKz: 'Рационал сандарды салыстыру', nameRu: 'Сравнение рациональных чисел', nameEn: 'Comparing rational numbers' },
      { name: 'Действия с рациональными числами', nameKz: 'Рационал сандармен амалдар', nameRu: 'Действия с рациональными числами', nameEn: 'Operations with rational numbers' },
    ]
  },
  {
    name: 'Проценты',
    nameKz: 'Пайыздар',
    nameRu: 'Проценты',
    nameEn: 'Percentages',
    subtopics: [
      { name: 'Понятие процента', nameKz: 'Пайыз түсінігі', nameRu: 'Понятие процента', nameEn: 'Concept of percentage' },
      { name: 'Нахождение процента от числа', nameKz: 'Санның пайызын табу', nameRu: 'Нахождение процента от числа', nameEn: 'Finding percentage of a number' },
      { name: 'Нахождение числа по проценту', nameKz: 'Пайыз бойынша санды табу', nameRu: 'Нахождение числа по проценту', nameEn: 'Finding number by percentage' },
      { name: 'Задачи на проценты', nameKz: 'Пайыздарға есептер', nameRu: 'Задачи на проценты', nameEn: 'Percentage problems' },
    ]
  },
  {
    name: 'Отношения и пропорции',
    nameKz: 'Қатынастар мен пропорциялар',
    nameRu: 'Отношения и пропорции',
    nameEn: 'Ratios and proportions',
    subtopics: [
      { name: 'Понятие отношения', nameKz: 'Қатынас түсінігі', nameRu: 'Понятие отношения', nameEn: 'Concept of ratio' },
      { name: 'Пропорция', nameKz: 'Пропорция', nameRu: 'Пропорция', nameEn: 'Proportion' },
      { name: 'Прямая пропорциональность', nameKz: 'Тура пропорционалдық', nameRu: 'Прямая пропорциональность', nameEn: 'Direct proportionality' },
      { name: 'Обратная пропорциональность', nameKz: 'Кері пропорционалдық', nameRu: 'Обратная пропорциональность', nameEn: 'Inverse proportionality' },
      { name: 'Масштаб', nameKz: 'Масштаб', nameRu: 'Масштаб', nameEn: 'Scale' },
    ]
  },
  {
    name: 'Единицы измерения',
    nameKz: 'Өлшем бірліктері',
    nameRu: 'Единицы измерения',
    nameEn: 'Units of measurement',
    subtopics: [
      { name: 'Единицы длины', nameKz: 'Ұзындық бірліктері', nameRu: 'Единицы длины', nameEn: 'Length units' },
      { name: 'Единицы массы', nameKz: 'Масса бірліктері', nameRu: 'Единицы массы', nameEn: 'Mass units' },
      { name: 'Единицы времени', nameKz: 'Уақыт бірліктері', nameRu: 'Единицы времени', nameEn: 'Time units' },
      { name: 'Единицы площади', nameKz: 'Аудан бірліктері', nameRu: 'Единицы площади', nameEn: 'Area units' },
      { name: 'Единицы объёма', nameKz: 'Көлем бірліктері', nameRu: 'Единицы объёма', nameEn: 'Volume units' },
      { name: 'Перевод единиц измерения', nameKz: 'Өлшем бірліктерін аудару', nameRu: 'Перевод единиц измерения', nameEn: 'Unit conversion' },
    ]
  },
  {
    name: 'Текстовые задачи',
    nameKz: 'Мәтінді есептер',
    nameRu: 'Текстовые задачи',
    nameEn: 'Word problems',
    subtopics: [
      { name: 'Задачи на движение', nameKz: 'Қозғалысқа есептер', nameRu: 'Задачи на движение', nameEn: 'Motion problems' },
      { name: 'Скорость, время, расстояние', nameKz: 'Жылдамдық, уақыт, қашықтық', nameRu: 'Скорость, время, расстояние', nameEn: 'Speed, time, distance' },
      { name: 'Задачи на работу', nameKz: 'Жұмысқа есептер', nameRu: 'Задачи на работу', nameEn: 'Work problems' },
      { name: 'Цена, количество, стоимость', nameKz: 'Баға, саны, құны', nameRu: 'Цена, количество, стоимость', nameEn: 'Price, quantity, cost' },
      { name: 'Задачи на смеси', nameKz: 'Қоспаларға есептер', nameRu: 'Задачи на смеси', nameEn: 'Mixture problems' },
    ]
  },
  // ==================== АЛГЕБРА ====================
  {
    name: 'Алгебраические выражения',
    nameKz: 'Алгебралық өрнектер',
    nameRu: 'Алгебраические выражения',
    nameEn: 'Algebraic expressions',
    subtopics: [
      { name: 'Буквенные выражения', nameKz: 'Әріпті өрнектер', nameRu: 'Буквенные выражения', nameEn: 'Literal expressions' },
      { name: 'Упрощение выражений', nameKz: 'Өрнектерді жеңілдету', nameRu: 'Упрощение выражений', nameEn: 'Simplifying expressions' },
      { name: 'Одночлены', nameKz: 'Бірмүшелер', nameRu: 'Одночлены', nameEn: 'Monomials' },
      { name: 'Многочлены', nameKz: 'Көпмүшелер', nameRu: 'Многочлены', nameEn: 'Polynomials' },
      { name: 'Разложение на множители', nameKz: 'Көбейткіштерге жіктеу', nameRu: 'Разложение на множители', nameEn: 'Factoring' },
    ]
  },
  {
    name: 'Формулы сокращённого умножения',
    nameKz: 'Қысқаша көбейту формулалары',
    nameRu: 'Формулы сокращённого умножения',
    nameEn: 'Special product formulas',
    subtopics: [
      { name: 'Квадрат суммы и разности', nameKz: 'Қосындының және айырымның квадраты', nameRu: 'Квадрат суммы и разности', nameEn: 'Square of sum and difference' },
      { name: 'Разность квадратов', nameKz: 'Квадраттар айырымы', nameRu: 'Разность квадратов', nameEn: 'Difference of squares' },
      { name: 'Куб суммы и разности', nameKz: 'Қосындының және айырымның кубы', nameRu: 'Куб суммы и разности', nameEn: 'Cube of sum and difference' },
      { name: 'Сумма и разность кубов', nameKz: 'Кубтардың қосындысы және айырымы', nameRu: 'Сумма и разность кубов', nameEn: 'Sum and difference of cubes' },
    ]
  },
  {
    name: 'Алгебраические дроби',
    nameKz: 'Алгебралық бөлшектер',
    nameRu: 'Алгебраические дроби',
    nameEn: 'Algebraic fractions',
    subtopics: [
      { name: 'Основное свойство дроби', nameKz: 'Бөлшектің негізгі қасиеті', nameRu: 'Основное свойство дроби', nameEn: 'Fundamental property of fractions' },
      { name: 'Сложение и вычитание алгебраических дробей', nameKz: 'Алгебралық бөлшектерді қосу және азайту', nameRu: 'Сложение и вычитание алгебраических дробей', nameEn: 'Adding and subtracting algebraic fractions' },
      { name: 'Умножение и деление алгебраических дробей', nameKz: 'Алгебралық бөлшектерді көбейту және бөлу', nameRu: 'Умножение и деление алгебраических дробей', nameEn: 'Multiplying and dividing algebraic fractions' },
    ]
  },
  {
    name: 'Степени',
    nameKz: 'Дәрежелер',
    nameRu: 'Степени',
    nameEn: 'Powers',
    subtopics: [
      { name: 'Степень с натуральным показателем', nameKz: 'Натурал көрсеткішті дәреже', nameRu: 'Степень с натуральным показателем', nameEn: 'Power with natural exponent' },
      { name: 'Свойства степеней', nameKz: 'Дәрежелердің қасиеттері', nameRu: 'Свойства степеней', nameEn: 'Properties of powers' },
      { name: 'Степень с целым показателем', nameKz: 'Бүтін көрсеткішті дәреже', nameRu: 'Степень с целым показателем', nameEn: 'Power with integer exponent' },
      { name: 'Степень с рациональным показателем', nameKz: 'Рационал көрсеткішті дәреже', nameRu: 'Степень с рациональным показателем', nameEn: 'Power with rational exponent' },
      { name: 'Стандартный вид числа', nameKz: 'Санның стандартты түрі', nameRu: 'Стандартный вид числа', nameEn: 'Scientific notation' },
    ]
  },
  {
    name: 'Корни',
    nameKz: 'Түбірлер',
    nameRu: 'Корни',
    nameEn: 'Roots',
    subtopics: [
      { name: 'Квадратный корень', nameKz: 'Квадрат түбір', nameRu: 'Квадратный корень', nameEn: 'Square root' },
      { name: 'Свойства квадратных корней', nameKz: 'Квадрат түбірлердің қасиеттері', nameRu: 'Свойства квадратных корней', nameEn: 'Properties of square roots' },
      { name: 'Преобразование выражений с корнями', nameKz: 'Түбірлі өрнектерді түрлендіру', nameRu: 'Преобразование выражений с корнями', nameEn: 'Simplifying radical expressions' },
      { name: 'Корень n-й степени', nameKz: 'n-ші дәрежелі түбір', nameRu: 'Корень n-й степени', nameEn: 'n-th root' },
      { name: 'Иррациональные числа', nameKz: 'Иррационал сандар', nameRu: 'Иррациональные числа', nameEn: 'Irrational numbers' },
    ]
  },
  {
    name: 'Линейные уравнения',
    nameKz: 'Сызықтық теңдеулер',
    nameRu: 'Линейные уравнения',
    nameEn: 'Linear equations',
    subtopics: [
      { name: 'Уравнение с одной переменной', nameKz: 'Бір айнымалысы бар теңдеу', nameRu: 'Уравнение с одной переменной', nameEn: 'Equation with one variable' },
      { name: 'Решение линейных уравнений', nameKz: 'Сызықтық теңдеулерді шешу', nameRu: 'Решение линейных уравнений', nameEn: 'Solving linear equations' },
      { name: 'Уравнения с модулем', nameKz: 'Модульді теңдеулер', nameRu: 'Уравнения с модулем', nameEn: 'Equations with absolute value' },
    ]
  },
  {
    name: 'Системы линейных уравнений',
    nameKz: 'Сызықтық теңдеулер жүйесі',
    nameRu: 'Системы линейных уравнений',
    nameEn: 'Systems of linear equations',
    subtopics: [
      { name: 'Система двух уравнений', nameKz: 'Екі теңдеуден тұратын жүйе', nameRu: 'Система двух уравнений', nameEn: 'System of two equations' },
      { name: 'Метод подстановки', nameKz: 'Алмастыру әдісі', nameRu: 'Метод подстановки', nameEn: 'Substitution method' },
      { name: 'Метод сложения', nameKz: 'Қосу әдісі', nameRu: 'Метод сложения', nameEn: 'Addition method' },
      { name: 'Графический метод', nameKz: 'Графиктік әдіс', nameRu: 'Графический метод', nameEn: 'Graphical method' },
    ]
  },
  {
    name: 'Квадратные уравнения',
    nameKz: 'Квадрат теңдеулер',
    nameRu: 'Квадратные уравнения',
    nameEn: 'Quadratic equations',
    subtopics: [
      { name: 'Неполные квадратные уравнения', nameKz: 'Толық емес квадрат теңдеулер', nameRu: 'Неполные квадратные уравнения', nameEn: 'Incomplete quadratic equations' },
      { name: 'Дискриминант', nameKz: 'Дискриминант', nameRu: 'Дискриминант', nameEn: 'Discriminant' },
      { name: 'Формула корней', nameKz: 'Түбірлер формуласы', nameRu: 'Формула корней', nameEn: 'Quadratic formula' },
      { name: 'Теорема Виета', nameKz: 'Виет теоремасы', nameRu: 'Теорема Виета', nameEn: "Vieta's theorem" },
      { name: 'Биквадратные уравнения', nameKz: 'Биквадрат теңдеулер', nameRu: 'Биквадратные уравнения', nameEn: 'Biquadratic equations' },
    ]
  },
  {
    name: 'Рациональные уравнения',
    nameKz: 'Рационал теңдеулер',
    nameRu: 'Рациональные уравнения',
    nameEn: 'Rational equations',
    subtopics: [
      { name: 'Дробно-рациональные уравнения', nameKz: 'Бөлшек-рационал теңдеулер', nameRu: 'Дробно-рациональные уравнения', nameEn: 'Fractional rational equations' },
      { name: 'ОДЗ уравнения', nameKz: 'Теңдеудің АЖЖ', nameRu: 'ОДЗ уравнения', nameEn: 'Domain of equation' },
    ]
  },
  {
    name: 'Иррациональные уравнения',
    nameKz: 'Иррационал теңдеулер',
    nameRu: 'Иррациональные уравнения',
    nameEn: 'Irrational equations',
    subtopics: [
      { name: 'Метод возведения в степень', nameKz: 'Дәрежеге шығару әдісі', nameRu: 'Метод возведения в степень', nameEn: 'Method of raising to a power' },
      { name: 'Метод замены переменной', nameKz: 'Айнымалыны ауыстыру әдісі', nameRu: 'Метод замены переменной', nameEn: 'Variable substitution' },
    ]
  },
  {
    name: 'Неравенства',
    nameKz: 'Теңсіздіктер',
    nameRu: 'Неравенства',
    nameEn: 'Inequalities',
    subtopics: [
      { name: 'Числовые неравенства', nameKz: 'Сандық теңсіздіктер', nameRu: 'Числовые неравенства', nameEn: 'Numerical inequalities' },
      { name: 'Линейные неравенства', nameKz: 'Сызықтық теңсіздіктер', nameRu: 'Линейные неравенства', nameEn: 'Linear inequalities' },
      { name: 'Системы неравенств', nameKz: 'Теңсіздіктер жүйесі', nameRu: 'Системы неравенств', nameEn: 'Systems of inequalities' },
      { name: 'Квадратные неравенства', nameKz: 'Квадраттық теңсіздіктер', nameRu: 'Квадратные неравенства', nameEn: 'Quadratic inequalities' },
      { name: 'Метод интервалов', nameKz: 'Аралықтар әдісі', nameRu: 'Метод интервалов', nameEn: 'Interval method' },
    ]
  },
  // ==================== ФУНКЦИИ ====================
  {
    name: 'Функции',
    nameKz: 'Функциялар',
    nameRu: 'Функции',
    nameEn: 'Functions',
    subtopics: [
      { name: 'Понятие функции', nameKz: 'Функция түсінігі', nameRu: 'Понятие функции', nameEn: 'Concept of function' },
      { name: 'Область определения и значений', nameKz: 'Анықталу және мәндер облысы', nameRu: 'Область определения и значений', nameEn: 'Domain and range' },
      { name: 'График функции', nameKz: 'Функцияның графигі', nameRu: 'График функции', nameEn: 'Graph of function' },
      { name: 'Чётность и нечётность', nameKz: 'Жұптық және тақтық', nameRu: 'Чётность и нечётность', nameEn: 'Even and odd functions' },
      { name: 'Возрастание и убывание', nameKz: 'Өсу және кему', nameRu: 'Возрастание и убывание', nameEn: 'Increasing and decreasing' },
    ]
  },
  {
    name: 'Линейная функция',
    nameKz: 'Сызықтық функция',
    nameRu: 'Линейная функция',
    nameEn: 'Linear function',
    subtopics: [
      { name: 'График линейной функции', nameKz: 'Сызықтық функцияның графигі', nameRu: 'График линейной функции', nameEn: 'Graph of linear function' },
      { name: 'Угловой коэффициент', nameKz: 'Бұрыштық коэффициент', nameRu: 'Угловой коэффициент', nameEn: 'Slope' },
      { name: 'Прямая пропорциональность', nameKz: 'Тура пропорционалдық', nameRu: 'Прямая пропорциональность', nameEn: 'Direct proportionality' },
    ]
  },
  {
    name: 'Квадратичная функция',
    nameKz: 'Квадраттық функция',
    nameRu: 'Квадратичная функция',
    nameEn: 'Quadratic function',
    subtopics: [
      { name: 'Парабола', nameKz: 'Парабола', nameRu: 'Парабола', nameEn: 'Parabola' },
      { name: 'Вершина параболы', nameKz: 'Параболаның төбесі', nameRu: 'Вершина параболы', nameEn: 'Vertex of parabola' },
      { name: 'Построение графика', nameKz: 'Графикті салу', nameRu: 'Построение графика', nameEn: 'Graphing' },
    ]
  },
  {
    name: 'Степенная функция',
    nameKz: 'Дәрежелік функция',
    nameRu: 'Степенная функция',
    nameEn: 'Power function',
    subtopics: [
      { name: 'Функция y = xⁿ', nameKz: 'y = xⁿ функциясы', nameRu: 'Функция y = xⁿ', nameEn: 'Function y = xⁿ' },
      { name: 'Функция y = √x', nameKz: 'y = √x функциясы', nameRu: 'Функция y = √x', nameEn: 'Function y = √x' },
      { name: 'Обратная пропорциональность', nameKz: 'Кері пропорционалдық', nameRu: 'Обратная пропорциональность', nameEn: 'Inverse proportionality' },
    ]
  },
  {
    name: 'Показательная функция',
    nameKz: 'Көрсеткіштік функция',
    nameRu: 'Показательная функция',
    nameEn: 'Exponential function',
    subtopics: [
      { name: 'График показательной функции', nameKz: 'Көрсеткіштік функцияның графигі', nameRu: 'График показательной функции', nameEn: 'Graph of exponential function' },
      { name: 'Показательные уравнения', nameKz: 'Көрсеткіштік теңдеулер', nameRu: 'Показательные уравнения', nameEn: 'Exponential equations' },
      { name: 'Показательные неравенства', nameKz: 'Көрсеткіштік теңсіздіктер', nameRu: 'Показательные неравенства', nameEn: 'Exponential inequalities' },
    ]
  },
  {
    name: 'Логарифмическая функция',
    nameKz: 'Логарифмдік функция',
    nameRu: 'Логарифмическая функция',
    nameEn: 'Logarithmic function',
    subtopics: [
      { name: 'Понятие логарифма', nameKz: 'Логарифм түсінігі', nameRu: 'Понятие логарифма', nameEn: 'Concept of logarithm' },
      { name: 'Свойства логарифмов', nameKz: 'Логарифмдердің қасиеттері', nameRu: 'Свойства логарифмов', nameEn: 'Properties of logarithms' },
      { name: 'Логарифмические уравнения', nameKz: 'Логарифмдік теңдеулер', nameRu: 'Логарифмические уравнения', nameEn: 'Logarithmic equations' },
      { name: 'Логарифмические неравенства', nameKz: 'Логарифмдік теңсіздіктер', nameRu: 'Логарифмические неравенства', nameEn: 'Logarithmic inequalities' },
    ]
  },
  // ==================== ПРОГРЕССИИ ====================
  {
    name: 'Последовательности и прогрессии',
    nameKz: 'Тізбектер мен прогрессиялар',
    nameRu: 'Последовательности и прогрессии',
    nameEn: 'Sequences and progressions',
    subtopics: [
      { name: 'Понятие последовательности', nameKz: 'Тізбек түсінігі', nameRu: 'Понятие последовательности', nameEn: 'Concept of sequence' },
      { name: 'Арифметическая прогрессия', nameKz: 'Арифметикалық прогрессия', nameRu: 'Арифметическая прогрессия', nameEn: 'Arithmetic progression' },
      { name: 'Геометрическая прогрессия', nameKz: 'Геометриялық прогрессия', nameRu: 'Геометрическая прогрессия', nameEn: 'Geometric progression' },
      { name: 'Сумма членов прогрессии', nameKz: 'Прогрессия мүшелерінің қосындысы', nameRu: 'Сумма членов прогрессии', nameEn: 'Sum of progression terms' },
    ]
  },
  // ==================== ТРИГОНОМЕТРИЯ ====================
  {
    name: 'Тригонометрия',
    nameKz: 'Тригонометрия',
    nameRu: 'Тригонометрия',
    nameEn: 'Trigonometry',
    subtopics: [
      { name: 'Единичная окружность', nameKz: 'Бірлік шеңбер', nameRu: 'Единичная окружность', nameEn: 'Unit circle' },
      { name: 'Радианная мера угла', nameKz: 'Бұрыштың радиандық өлшемі', nameRu: 'Радианная мера угла', nameEn: 'Radian measure' },
      { name: 'Синус, косинус, тангенс', nameKz: 'Синус, косинус, тангенс', nameRu: 'Синус, косинус, тангенс', nameEn: 'Sine, cosine, tangent' },
      { name: 'Значения тригонометрических функций', nameKz: 'Тригонометриялық функциялардың мәндері', nameRu: 'Значения тригонометрических функций', nameEn: 'Values of trigonometric functions' },
    ]
  },
  {
    name: 'Тригонометрические формулы',
    nameKz: 'Тригонометриялық формулалар',
    nameRu: 'Тригонометрические формулы',
    nameEn: 'Trigonometric formulas',
    subtopics: [
      { name: 'Основное тригонометрическое тождество', nameKz: 'Негізгі тригонометриялық тепе-теңдік', nameRu: 'Основное тригонометрическое тождество', nameEn: 'Fundamental trigonometric identity' },
      { name: 'Формулы приведения', nameKz: 'Келтіру формулалары', nameRu: 'Формулы приведения', nameEn: 'Reduction formulas' },
      { name: 'Формулы сложения', nameKz: 'Қосу формулалары', nameRu: 'Формулы сложения', nameEn: 'Addition formulas' },
      { name: 'Формулы двойного угла', nameKz: 'Қос бұрыш формулалары', nameRu: 'Формулы двойного угла', nameEn: 'Double angle formulas' },
    ]
  },
  {
    name: 'Тригонометрические уравнения',
    nameKz: 'Тригонометриялық теңдеулер',
    nameRu: 'Тригонометрические уравнения',
    nameEn: 'Trigonometric equations',
    subtopics: [
      { name: 'Обратные тригонометрические функции', nameKz: 'Кері тригонометриялық функциялар', nameRu: 'Обратные тригонометрические функции', nameEn: 'Inverse trigonometric functions' },
      { name: 'Простейшие тригонометрические уравнения', nameKz: 'Қарапайым тригонометриялық теңдеулер', nameRu: 'Простейшие тригонометрические уравнения', nameEn: 'Basic trigonometric equations' },
      { name: 'Методы решения', nameKz: 'Шешу әдістері', nameRu: 'Методы решения', nameEn: 'Solution methods' },
    ]
  },
  // ==================== МАТЕМАТИЧЕСКИЙ АНАЛИЗ ====================
  {
    name: 'Производная',
    nameKz: 'Туынды',
    nameRu: 'Производная',
    nameEn: 'Derivative',
    subtopics: [
      { name: 'Понятие производной', nameKz: 'Туынды түсінігі', nameRu: 'Понятие производной', nameEn: 'Concept of derivative' },
      { name: 'Геометрический смысл', nameKz: 'Геометриялық мағынасы', nameRu: 'Геометрический смысл', nameEn: 'Geometric meaning' },
      { name: 'Правила дифференцирования', nameKz: 'Дифференциалдау ережелері', nameRu: 'Правила дифференцирования', nameEn: 'Differentiation rules' },
      { name: 'Производная сложной функции', nameKz: 'Құрама функцияның туындысы', nameRu: 'Производная сложной функции', nameEn: 'Chain rule' },
      { name: 'Таблица производных', nameKz: 'Туындылар кестесі', nameRu: 'Таблица производных', nameEn: 'Table of derivatives' },
    ]
  },
  {
    name: 'Применение производной',
    nameKz: 'Туындыны қолдану',
    nameRu: 'Применение производной',
    nameEn: 'Applications of derivative',
    subtopics: [
      { name: 'Уравнение касательной', nameKz: 'Жанама теңдеуі', nameRu: 'Уравнение касательной', nameEn: 'Equation of tangent' },
      { name: 'Монотонность функции', nameKz: 'Функцияның монотондылығы', nameRu: 'Монотонность функции', nameEn: 'Monotonicity' },
      { name: 'Экстремумы функции', nameKz: 'Функцияның экстремумдары', nameRu: 'Экстремумы функции', nameEn: 'Extrema' },
      { name: 'Наибольшее и наименьшее значения', nameKz: 'Ең үлкен және ең кіші мәндер', nameRu: 'Наибольшее и наименьшее значения', nameEn: 'Maximum and minimum values' },
    ]
  },
  {
    name: 'Первообразная и интеграл',
    nameKz: 'Алғашқы функция және интеграл',
    nameRu: 'Первообразная и интеграл',
    nameEn: 'Antiderivative and integral',
    subtopics: [
      { name: 'Первообразная', nameKz: 'Алғашқы функция', nameRu: 'Первообразная', nameEn: 'Antiderivative' },
      { name: 'Неопределённый интеграл', nameKz: 'Анықталмаған интеграл', nameRu: 'Неопределённый интеграл', nameEn: 'Indefinite integral' },
      { name: 'Определённый интеграл', nameKz: 'Анықталған интеграл', nameRu: 'Определённый интеграл', nameEn: 'Definite integral' },
      { name: 'Вычисление площадей', nameKz: 'Аудандарды есептеу', nameRu: 'Вычисление площадей', nameEn: 'Calculating areas' },
    ]
  },
  // ==================== ПЛАНИМЕТРИЯ ====================
  {
    name: 'Основы геометрии',
    nameKz: 'Геометрияның негіздері',
    nameRu: 'Основы геометрии',
    nameEn: 'Basics of geometry',
    subtopics: [
      { name: 'Точка, прямая, отрезок', nameKz: 'Нүкте, түзу, кесінді', nameRu: 'Точка, прямая, отрезок', nameEn: 'Point, line, segment' },
      { name: 'Луч и угол', nameKz: 'Сәуле және бұрыш', nameRu: 'Луч и угол', nameEn: 'Ray and angle' },
      { name: 'Виды углов', nameKz: 'Бұрыштардың түрлері', nameRu: 'Виды углов', nameEn: 'Types of angles' },
      { name: 'Смежные и вертикальные углы', nameKz: 'Сыбайлас және вертикаль бұрыштар', nameRu: 'Смежные и вертикальные углы', nameEn: 'Adjacent and vertical angles' },
    ]
  },
  {
    name: 'Параллельные и перпендикулярные прямые',
    nameKz: 'Параллель және перпендикуляр түзулер',
    nameRu: 'Параллельные и перпендикулярные прямые',
    nameEn: 'Parallel and perpendicular lines',
    subtopics: [
      { name: 'Параллельные прямые', nameKz: 'Параллель түзулер', nameRu: 'Параллельные прямые', nameEn: 'Parallel lines' },
      { name: 'Признаки параллельности', nameKz: 'Параллельдік белгілері', nameRu: 'Признаки параллельности', nameEn: 'Criteria for parallelism' },
      { name: 'Перпендикулярные прямые', nameKz: 'Перпендикуляр түзулер', nameRu: 'Перпендикулярные прямые', nameEn: 'Perpendicular lines' },
    ]
  },
  {
    name: 'Треугольники',
    nameKz: 'Үшбұрыштар',
    nameRu: 'Треугольники',
    nameEn: 'Triangles',
    subtopics: [
      { name: 'Виды треугольников', nameKz: 'Үшбұрыштардың түрлері', nameRu: 'Виды треугольников', nameEn: 'Types of triangles' },
      { name: 'Сумма углов треугольника', nameKz: 'Үшбұрыш бұрыштарының қосындысы', nameRu: 'Сумма углов треугольника', nameEn: 'Sum of angles' },
      { name: 'Признаки равенства', nameKz: 'Теңдік белгілері', nameRu: 'Признаки равенства', nameEn: 'Congruence criteria' },
      { name: 'Медиана, биссектриса, высота', nameKz: 'Медиана, биссектриса, биіктік', nameRu: 'Медиана, биссектриса, высота', nameEn: 'Median, bisector, altitude' },
      { name: 'Средняя линия', nameKz: 'Орта сызық', nameRu: 'Средняя линия', nameEn: 'Midsegment' },
    ]
  },
  {
    name: 'Подобие треугольников',
    nameKz: 'Үшбұрыштардың ұқсастығы',
    nameRu: 'Подобие треугольников',
    nameEn: 'Similar triangles',
    subtopics: [
      { name: 'Признаки подобия', nameKz: 'Ұқсастық белгілері', nameRu: 'Признаки подобия', nameEn: 'Similarity criteria' },
      { name: 'Коэффициент подобия', nameKz: 'Ұқсастық коэффициенті', nameRu: 'Коэффициент подобия', nameEn: 'Similarity ratio' },
      { name: 'Теорема Пифагора', nameKz: 'Пифагор теоремасы', nameRu: 'Теорема Пифагора', nameEn: 'Pythagorean theorem' },
    ]
  },
  {
    name: 'Соотношения в треугольнике',
    nameKz: 'Үшбұрыштағы қатынастар',
    nameRu: 'Соотношения в треугольнике',
    nameEn: 'Relations in triangle',
    subtopics: [
      { name: 'Теорема синусов', nameKz: 'Синустар теоремасы', nameRu: 'Теорема синусов', nameEn: 'Law of sines' },
      { name: 'Теорема косинусов', nameKz: 'Косинустар теоремасы', nameRu: 'Теорема косинусов', nameEn: 'Law of cosines' },
      { name: 'Решение треугольников', nameKz: 'Үшбұрыштарды шешу', nameRu: 'Решение треугольников', nameEn: 'Solving triangles' },
    ]
  },
  {
    name: 'Четырёхугольники',
    nameKz: 'Төртбұрыштар',
    nameRu: 'Четырёхугольники',
    nameEn: 'Quadrilaterals',
    subtopics: [
      { name: 'Параллелограмм', nameKz: 'Параллелограмм', nameRu: 'Параллелограмм', nameEn: 'Parallelogram' },
      { name: 'Прямоугольник', nameKz: 'Тіктөртбұрыш', nameRu: 'Прямоугольник', nameEn: 'Rectangle' },
      { name: 'Ромб', nameKz: 'Ромб', nameRu: 'Ромб', nameEn: 'Rhombus' },
      { name: 'Квадрат', nameKz: 'Шаршы', nameRu: 'Квадрат', nameEn: 'Square' },
      { name: 'Трапеция', nameKz: 'Трапеция', nameRu: 'Трапеция', nameEn: 'Trapezoid' },
    ]
  },
  {
    name: 'Окружность',
    nameKz: 'Шеңбер',
    nameRu: 'Окружность',
    nameEn: 'Circle',
    subtopics: [
      { name: 'Окружность и её элементы', nameKz: 'Шеңбер және оның элементтері', nameRu: 'Окружность и её элементы', nameEn: 'Circle and its elements' },
      { name: 'Касательная', nameKz: 'Жанама', nameRu: 'Касательная', nameEn: 'Tangent' },
      { name: 'Центральные и вписанные углы', nameKz: 'Центрлік және іштей сызылған бұрыштар', nameRu: 'Центральные и вписанные углы', nameEn: 'Central and inscribed angles' },
      { name: 'Вписанная и описанная окружности', nameKz: 'Іштей және сырттай сызылған шеңберлер', nameRu: 'Вписанная и описанная окружности', nameEn: 'Inscribed and circumscribed circles' },
      { name: 'Длина окружности и площадь круга', nameKz: 'Шеңбер ұзындығы және дөңгелек ауданы', nameRu: 'Длина окружности и площадь круга', nameEn: 'Circumference and area' },
    ]
  },
  {
    name: 'Площади фигур',
    nameKz: 'Фигуралардың аудандары',
    nameRu: 'Площади фигур',
    nameEn: 'Areas of figures',
    subtopics: [
      { name: 'Площадь прямоугольника', nameKz: 'Тіктөртбұрыштың ауданы', nameRu: 'Площадь прямоугольника', nameEn: 'Area of rectangle' },
      { name: 'Площадь параллелограмма', nameKz: 'Параллелограммның ауданы', nameRu: 'Площадь параллелограмма', nameEn: 'Area of parallelogram' },
      { name: 'Площадь треугольника', nameKz: 'Үшбұрыштың ауданы', nameRu: 'Площадь треугольника', nameEn: 'Area of triangle' },
      { name: 'Площадь трапеции', nameKz: 'Трапецияның ауданы', nameRu: 'Площадь трапеции', nameEn: 'Area of trapezoid' },
    ]
  },
  {
    name: 'Координаты и векторы на плоскости',
    nameKz: 'Жазықтықтағы координаталар мен векторлар',
    nameRu: 'Координаты и векторы на плоскости',
    nameEn: 'Coordinates and vectors in plane',
    subtopics: [
      { name: 'Координатная плоскость', nameKz: 'Координаталық жазықтық', nameRu: 'Координатная плоскость', nameEn: 'Coordinate plane' },
      { name: 'Расстояние между точками', nameKz: 'Нүктелер арасындағы қашықтық', nameRu: 'Расстояние между точками', nameEn: 'Distance between points' },
      { name: 'Понятие вектора', nameKz: 'Вектор түсінігі', nameRu: 'Понятие вектора', nameEn: 'Concept of vector' },
      { name: 'Действия с векторами', nameKz: 'Векторлармен амалдар', nameRu: 'Действия с векторами', nameEn: 'Operations with vectors' },
      { name: 'Скалярное произведение', nameKz: 'Скалярлық көбейтінді', nameRu: 'Скалярное произведение', nameEn: 'Dot product' },
    ]
  },
  // ==================== СТЕРЕОМЕТРИЯ ====================
  {
    name: 'Аксиомы стереометрии',
    nameKz: 'Стереометрия аксиомалары',
    nameRu: 'Аксиомы стереометрии',
    nameEn: 'Axioms of stereometry',
    subtopics: [
      { name: 'Основные понятия', nameKz: 'Негізгі түсініктер', nameRu: 'Основные понятия', nameEn: 'Basic concepts' },
      { name: 'Аксиомы и следствия', nameKz: 'Аксиомалар және салдарлар', nameRu: 'Аксиомы и следствия', nameEn: 'Axioms and consequences' },
    ]
  },
  {
    name: 'Параллельность в пространстве',
    nameKz: 'Кеңістіктегі параллельдік',
    nameRu: 'Параллельность в пространстве',
    nameEn: 'Parallelism in space',
    subtopics: [
      { name: 'Параллельные прямые в пространстве', nameKz: 'Кеңістіктегі параллель түзулер', nameRu: 'Параллельные прямые в пространстве', nameEn: 'Parallel lines in space' },
      { name: 'Параллельность прямой и плоскости', nameKz: 'Түзу мен жазықтықтың параллельдігі', nameRu: 'Параллельность прямой и плоскости', nameEn: 'Parallelism of line and plane' },
      { name: 'Параллельные плоскости', nameKz: 'Параллель жазықтықтар', nameRu: 'Параллельные плоскости', nameEn: 'Parallel planes' },
    ]
  },
  {
    name: 'Перпендикулярность в пространстве',
    nameKz: 'Кеңістіктегі перпендикулярлық',
    nameRu: 'Перпендикулярность в пространстве',
    nameEn: 'Perpendicularity in space',
    subtopics: [
      { name: 'Перпендикулярность прямой и плоскости', nameKz: 'Түзу мен жазықтықтың перпендикулярлығы', nameRu: 'Перпендикулярность прямой и плоскости', nameEn: 'Perpendicularity of line and plane' },
      { name: 'Теорема о трёх перпендикулярах', nameKz: 'Үш перпендикуляр теоремасы', nameRu: 'Теорема о трёх перпендикулярах', nameEn: 'Three perpendiculars theorem' },
      { name: 'Двугранный угол', nameKz: 'Екі қырлы бұрыш', nameRu: 'Двугранный угол', nameEn: 'Dihedral angle' },
    ]
  },
  {
    name: 'Многогранники',
    nameKz: 'Көпжақтар',
    nameRu: 'Многогранники',
    nameEn: 'Polyhedra',
    subtopics: [
      { name: 'Призма', nameKz: 'Призма', nameRu: 'Призма', nameEn: 'Prism' },
      { name: 'Параллелепипед', nameKz: 'Параллелепипед', nameRu: 'Параллелепипед', nameEn: 'Parallelepiped' },
      { name: 'Пирамида', nameKz: 'Пирамида', nameRu: 'Пирамида', nameEn: 'Pyramid' },
      { name: 'Правильные многогранники', nameKz: 'Дұрыс көпжақтар', nameRu: 'Правильные многогранники', nameEn: 'Regular polyhedra' },
    ]
  },
  {
    name: 'Тела вращения',
    nameKz: 'Айналу денелері',
    nameRu: 'Тела вращения',
    nameEn: 'Solids of revolution',
    subtopics: [
      { name: 'Цилиндр', nameKz: 'Цилиндр', nameRu: 'Цилиндр', nameEn: 'Cylinder' },
      { name: 'Конус', nameKz: 'Конус', nameRu: 'Конус', nameEn: 'Cone' },
      { name: 'Шар и сфера', nameKz: 'Шар және сфера', nameRu: 'Шар и сфера', nameEn: 'Ball and sphere' },
    ]
  },
  {
    name: 'Объёмы и площади поверхностей',
    nameKz: 'Көлемдер мен беттердің аудандары',
    nameRu: 'Объёмы и площади поверхностей',
    nameEn: 'Volumes and surface areas',
    subtopics: [
      { name: 'Объём призмы', nameKz: 'Призма көлемі', nameRu: 'Объём призмы', nameEn: 'Volume of prism' },
      { name: 'Объём пирамиды', nameKz: 'Пирамида көлемі', nameRu: 'Объём пирамиды', nameEn: 'Volume of pyramid' },
      { name: 'Объём цилиндра', nameKz: 'Цилиндр көлемі', nameRu: 'Объём цилиндра', nameEn: 'Volume of cylinder' },
      { name: 'Объём конуса', nameKz: 'Конус көлемі', nameRu: 'Объём конуса', nameEn: 'Volume of cone' },
      { name: 'Объём шара', nameKz: 'Шар көлемі', nameRu: 'Объём шара', nameEn: 'Volume of sphere' },
      { name: 'Площади поверхностей', nameKz: 'Беттердің аудандары', nameRu: 'Площади поверхностей', nameEn: 'Surface areas' },
    ]
  },
  // ==================== КОМБИНАТОРИКА И ВЕРОЯТНОСТЬ ====================
  {
    name: 'Комбинаторика',
    nameKz: 'Комбинаторика',
    nameRu: 'Комбинаторика',
    nameEn: 'Combinatorics',
    subtopics: [
      { name: 'Правило суммы и произведения', nameKz: 'Қосу және көбейту ережесі', nameRu: 'Правило суммы и произведения', nameEn: 'Addition and multiplication rules' },
      { name: 'Перестановки', nameKz: 'Орын алмастырулар', nameRu: 'Перестановки', nameEn: 'Permutations' },
      { name: 'Размещения', nameKz: 'Орналастырулар', nameRu: 'Размещения', nameEn: 'Arrangements' },
      { name: 'Сочетания', nameKz: 'Тіркестер', nameRu: 'Сочетания', nameEn: 'Combinations' },
      { name: 'Бином Ньютона', nameKz: 'Ньютон биномы', nameRu: 'Бином Ньютона', nameEn: "Newton's binomial" },
    ]
  },
  {
    name: 'Теория вероятностей',
    nameKz: 'Ықтималдықтар теориясы',
    nameRu: 'Теория вероятностей',
    nameEn: 'Probability theory',
    subtopics: [
      { name: 'Вероятность события', nameKz: 'Оқиғаның ықтималдығы', nameRu: 'Вероятность события', nameEn: 'Probability of event' },
      { name: 'Сложение и умножение вероятностей', nameKz: 'Ықтималдықтарды қосу және көбейту', nameRu: 'Сложение и умножение вероятностей', nameEn: 'Addition and multiplication of probabilities' },
      { name: 'Условная вероятность', nameKz: 'Шартты ықтималдық', nameRu: 'Условная вероятность', nameEn: 'Conditional probability' },
      { name: 'Формула Бернулли', nameKz: 'Бернулли формуласы', nameRu: 'Формула Бернулли', nameEn: "Bernoulli's formula" },
    ]
  },
  {
    name: 'Статистика',
    nameKz: 'Статистика',
    nameRu: 'Статистика',
    nameEn: 'Statistics',
    subtopics: [
      { name: 'Среднее арифметическое', nameKz: 'Арифметикалық орта', nameRu: 'Среднее арифметическое', nameEn: 'Arithmetic mean' },
      { name: 'Медиана и мода', nameKz: 'Медиана және мода', nameRu: 'Медиана и мода', nameEn: 'Median and mode' },
      { name: 'Дисперсия и стандартное отклонение', nameKz: 'Дисперсия және стандартты ауытқу', nameRu: 'Дисперсия и стандартное отклонение', nameEn: 'Variance and standard deviation' },
      { name: 'Диаграммы и графики', nameKz: 'Диаграммалар мен графиктер', nameRu: 'Диаграммы и графики', nameEn: 'Charts and graphs' },
    ]
  },
  // ==================== КОМПЛЕКСНЫЕ ЧИСЛА ====================
  {
    name: 'Комплексные числа',
    nameKz: 'Кешен сандар',
    nameRu: 'Комплексные числа',
    nameEn: 'Complex numbers',
    subtopics: [
      { name: 'Понятие комплексного числа', nameKz: 'Кешен сан түсінігі', nameRu: 'Понятие комплексного числа', nameEn: 'Concept of complex number' },
      { name: 'Алгебраическая форма', nameKz: 'Алгебралық түрі', nameRu: 'Алгебраическая форма', nameEn: 'Algebraic form' },
      { name: 'Действия с комплексными числами', nameKz: 'Кешен сандармен амалдар', nameRu: 'Действия с комплексными числами', nameEn: 'Operations with complex numbers' },
      { name: 'Тригонометрическая форма', nameKz: 'Тригонометриялық түрі', nameRu: 'Тригонометрическая форма', nameEn: 'Trigonometric form' },
    ]
  },
];

async function main() {
  console.log('Создание списка тем по математике (ГОСО РК)...\n');

  let mathSubject = await prisma.taskSubject.findFirst({
    where: { name: { contains: 'Математика' } }
  });

  if (!mathSubject) {
    mathSubject = await prisma.taskSubject.create({
      data: {
        name: 'Математика',
        nameKz: 'Математика',
        nameRu: 'Математика',
        nameEn: 'Mathematics',
        icon: 'calculator',
        orderIndex: 1,
      }
    });
    console.log('Создан предмет: Математика');
  }

  let topicsCreated = 0;
  let subtopicsCreated = 0;

  for (let i = 0; i < mathTopics.length; i++) {
    const topicData = mathTopics[i];

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
          orderIndex: i + 1,
        }
      });
      topicsCreated++;
      console.log(`Создана тема: ${topicData.nameRu}`);
    }

    for (let j = 0; j < topicData.subtopics.length; j++) {
      const subtopicData = topicData.subtopics[j];

      const existingSubtopic = await prisma.taskSubtopic.findFirst({
        where: { name: subtopicData.name, topicId: topic.id }
      });

      if (!existingSubtopic) {
        await prisma.taskSubtopic.create({
          data: {
            name: subtopicData.name,
            nameKz: subtopicData.nameKz,
            nameRu: subtopicData.nameRu,
            nameEn: subtopicData.nameEn,
            topicId: topic.id,
            orderIndex: j + 1,
          }
        });
        subtopicsCreated++;
      }
    }
  }

  console.log(`\n✓ Создано тем: ${topicsCreated}`);
  console.log(`✓ Создано подтем: ${subtopicsCreated}`);
  console.log('\nГотово!');
}

main()
  .catch(console.error)
  .finally(async () => {
    await pool.end();
  });
