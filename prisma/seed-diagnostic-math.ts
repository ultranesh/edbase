import { prisma } from '../lib/prisma';

// 3rd grade math olympiad questions with translations (KZ, RU, EN)
const diagnosticQuestions = [
  {
    questionKz: 'Әр бала таңертең екі йогурт жейді. Төрт баланы тамақтандыру үшін 1 йогурт жетпеді. Қанша йогурт болды?',
    questionRu: 'Каждый ребёнок съедает утром два йогурта. Чтобы накормить четырёх детей, не хватило 1 йогурта. Сколько йогуртов было?',
    questionEn: 'Each child eats two yogurts in the morning. To feed four children, 1 yogurt was missing. How many yogurts were there?',
    options: [
      { kz: '8', ru: '8', en: '8' },
      { kz: '6', ru: '6', en: '6' },
      { kz: '9', ru: '9', en: '9' },
      { kz: '7', ru: '7', en: '7' },
    ],
    correctAnswer: 3, // D) 7
    solutionKz: '4 бала × 2 йогурт = 8 йогурт керек. 1 жетпеді, демек 8 - 1 = 7 йогурт болды.',
    solutionRu: '4 ребёнка × 2 йогурта = 8 йогуртов нужно. Не хватило 1, значит было 8 - 1 = 7 йогуртов.',
    solutionEn: '4 children × 2 yogurts = 8 yogurts needed. 1 was missing, so there were 8 - 1 = 7 yogurts.',
  },
  {
    questionKz: 'Әйгерім 18 данышпанмен қоштасты. Содан кейін 7 данышпан қосылды. Қанша данышпан болды?',
    questionRu: 'Айгерим попрощалась с 18 мудрецами. Потом присоединились ещё 7 мудрецов. Сколько мудрецов стало?',
    questionEn: 'Aigerim said goodbye to 18 wise men. Then 7 more wise men joined. How many wise men are there now?',
    options: [
      { kz: '24', ru: '24', en: '24' },
      { kz: '25', ru: '25', en: '25' },
      { kz: '11', ru: '11', en: '11' },
      { kz: '26', ru: '26', en: '26' },
    ],
    correctAnswer: 1, // B) 25
    solutionKz: '18 + 7 = 25 данышпан.',
    solutionRu: '18 + 7 = 25 мудрецов.',
    solutionEn: '18 + 7 = 25 wise men.',
  },
  {
    questionKz: 'Бір топ балалар үш қатарға тұрды. Әр қатарда 5 бала. Балалар саны қанша?',
    questionRu: 'Группа детей встала в три ряда. В каждом ряду по 5 детей. Сколько всего детей?',
    questionEn: 'A group of children stood in three rows. Each row has 5 children. How many children are there in total?',
    options: [
      { kz: '8', ru: '8', en: '8' },
      { kz: '15', ru: '15', en: '15' },
      { kz: '2', ru: '2', en: '2' },
      { kz: '12', ru: '12', en: '12' },
    ],
    correctAnswer: 1, // B) 15
    solutionKz: '3 қатар × 5 бала = 15 бала.',
    solutionRu: '3 ряда × 5 детей = 15 детей.',
    solutionEn: '3 rows × 5 children = 15 children.',
  },
  {
    questionKz: 'Тік төртбұрыштың периметрі 18 см, ені 3 см. Ұзындығын табыңыз.',
    questionRu: 'Периметр прямоугольника 18 см, ширина 3 см. Найдите длину.',
    questionEn: 'The perimeter of a rectangle is 18 cm, width is 3 cm. Find the length.',
    options: [
      { kz: '6 см', ru: '6 см', en: '6 cm' },
      { kz: '4 см', ru: '4 см', en: '4 cm' },
      { kz: '5 см', ru: '5 см', en: '5 cm' },
      { kz: '12 см', ru: '12 см', en: '12 cm' },
    ],
    correctAnswer: 0, // A) 6 см
    solutionKz: 'P = 2(a + b). 18 = 2(a + 3). a + 3 = 9. a = 6 см.',
    solutionRu: 'P = 2(a + b). 18 = 2(a + 3). a + 3 = 9. a = 6 см.',
    solutionEn: 'P = 2(a + b). 18 = 2(a + 3). a + 3 = 9. a = 6 cm.',
  },
  {
    questionKz: '56-дан 28-ді алып тастаңыз.',
    questionRu: 'Вычтите 28 из 56.',
    questionEn: 'Subtract 28 from 56.',
    options: [
      { kz: '28', ru: '28', en: '28' },
      { kz: '38', ru: '38', en: '38' },
      { kz: '84', ru: '84', en: '84' },
      { kz: '18', ru: '18', en: '18' },
    ],
    correctAnswer: 0, // A) 28
    solutionKz: '56 - 28 = 28.',
    solutionRu: '56 - 28 = 28.',
    solutionEn: '56 - 28 = 28.',
  },
  {
    questionKz: '9 × 4 + 6 = ?',
    questionRu: '9 × 4 + 6 = ?',
    questionEn: '9 × 4 + 6 = ?',
    options: [
      { kz: '36', ru: '36', en: '36' },
      { kz: '42', ru: '42', en: '42' },
      { kz: '30', ru: '30', en: '30' },
      { kz: '90', ru: '90', en: '90' },
    ],
    correctAnswer: 1, // B) 42
    solutionKz: '9 × 4 = 36. 36 + 6 = 42.',
    solutionRu: '9 × 4 = 36. 36 + 6 = 42.',
    solutionEn: '9 × 4 = 36. 36 + 6 = 42.',
  },
  {
    questionKz: '72-ні 8-ге бөліңіз.',
    questionRu: 'Разделите 72 на 8.',
    questionEn: 'Divide 72 by 8.',
    options: [
      { kz: '8', ru: '8', en: '8' },
      { kz: '9', ru: '9', en: '9' },
      { kz: '7', ru: '7', en: '7' },
      { kz: '6', ru: '6', en: '6' },
    ],
    correctAnswer: 1, // B) 9
    solutionKz: '72 ÷ 8 = 9.',
    solutionRu: '72 ÷ 8 = 9.',
    solutionEn: '72 ÷ 8 = 9.',
  },
  {
    questionKz: 'Шаршының периметрі 24 см. Бір қабырғасы неше см?',
    questionRu: 'Периметр квадрата 24 см. Чему равна одна сторона?',
    questionEn: 'The perimeter of a square is 24 cm. What is the length of one side?',
    options: [
      { kz: '4 см', ru: '4 см', en: '4 cm' },
      { kz: '6 см', ru: '6 см', en: '6 cm' },
      { kz: '8 см', ru: '8 см', en: '8 cm' },
      { kz: '12 см', ru: '12 см', en: '12 cm' },
    ],
    correctAnswer: 1, // B) 6 см
    solutionKz: 'P = 4a. 24 = 4a. a = 6 см.',
    solutionRu: 'P = 4a. 24 = 4a. a = 6 см.',
    solutionEn: 'P = 4a. 24 = 4a. a = 6 cm.',
  },
  {
    questionKz: '1 сағатта неше минут бар?',
    questionRu: 'Сколько минут в 1 часе?',
    questionEn: 'How many minutes are in 1 hour?',
    options: [
      { kz: '30', ru: '30', en: '30' },
      { kz: '100', ru: '100', en: '100' },
      { kz: '60', ru: '60', en: '60' },
      { kz: '45', ru: '45', en: '45' },
    ],
    correctAnswer: 2, // C) 60
    solutionKz: '1 сағат = 60 минут.',
    solutionRu: '1 час = 60 минут.',
    solutionEn: '1 hour = 60 minutes.',
  },
  {
    questionKz: 'Сандық өрнекті есептеңіз: 100 - 45 + 23',
    questionRu: 'Вычислите: 100 - 45 + 23',
    questionEn: 'Calculate: 100 - 45 + 23',
    options: [
      { kz: '78', ru: '78', en: '78' },
      { kz: '32', ru: '32', en: '32' },
      { kz: '68', ru: '68', en: '68' },
      { kz: '88', ru: '88', en: '88' },
    ],
    correctAnswer: 0, // A) 78
    solutionKz: '100 - 45 = 55. 55 + 23 = 78.',
    solutionRu: '100 - 45 = 55. 55 + 23 = 78.',
    solutionEn: '100 - 45 = 55. 55 + 23 = 78.',
  },
  {
    questionKz: '7 × 8 нешеге тең?',
    questionRu: 'Чему равно 7 × 8?',
    questionEn: 'What is 7 × 8?',
    options: [
      { kz: '54', ru: '54', en: '54' },
      { kz: '56', ru: '56', en: '56' },
      { kz: '48', ru: '48', en: '48' },
      { kz: '63', ru: '63', en: '63' },
    ],
    correctAnswer: 1, // B) 56
    solutionKz: '7 × 8 = 56.',
    solutionRu: '7 × 8 = 56.',
    solutionEn: '7 × 8 = 56.',
  },
  {
    questionKz: 'Сағат 12:30 болса, 2 сағаттан кейін неше болады?',
    questionRu: 'Если сейчас 12:30, который час будет через 2 часа?',
    questionEn: 'If it is 12:30 now, what time will it be in 2 hours?',
    options: [
      { kz: '14:30', ru: '14:30', en: '14:30' },
      { kz: '10:30', ru: '10:30', en: '10:30' },
      { kz: '2:30', ru: '2:30', en: '2:30' },
      { kz: '15:00', ru: '15:00', en: '15:00' },
    ],
    correctAnswer: 0, // A) 14:30
    solutionKz: '12:30 + 2 сағат = 14:30.',
    solutionRu: '12:30 + 2 часа = 14:30.',
    solutionEn: '12:30 + 2 hours = 14:30.',
  },
  {
    questionKz: '48-ді 6-ға бөлгендегі бөлінді мен қалдықты табыңыз.',
    questionRu: 'Найдите частное и остаток при делении 48 на 6.',
    questionEn: 'Find the quotient and remainder when dividing 48 by 6.',
    options: [
      { kz: '8, қалдық 0', ru: '8, остаток 0', en: '8, remainder 0' },
      { kz: '7, қалдық 6', ru: '7, остаток 6', en: '7, remainder 6' },
      { kz: '9, қалдық 2', ru: '9, остаток 2', en: '9, remainder 2' },
      { kz: '6, қалдық 12', ru: '6, остаток 12', en: '6, remainder 12' },
    ],
    correctAnswer: 0, // A) 8, қалдық 0
    solutionKz: '48 ÷ 6 = 8, қалдық 0 (өйткені 6 × 8 = 48).',
    solutionRu: '48 ÷ 6 = 8, остаток 0 (так как 6 × 8 = 48).',
    solutionEn: '48 ÷ 6 = 8, remainder 0 (since 6 × 8 = 48).',
  },
  {
    questionKz: '3 кг-да неше грамм бар?',
    questionRu: 'Сколько граммов в 3 кг?',
    questionEn: 'How many grams are in 3 kg?',
    options: [
      { kz: '300 г', ru: '300 г', en: '300 g' },
      { kz: '30 г', ru: '30 г', en: '30 g' },
      { kz: '3000 г', ru: '3000 г', en: '3000 g' },
      { kz: '30000 г', ru: '30000 г', en: '30000 g' },
    ],
    correctAnswer: 2, // C) 3000 г
    solutionKz: '1 кг = 1000 г. 3 кг = 3 × 1000 = 3000 г.',
    solutionRu: '1 кг = 1000 г. 3 кг = 3 × 1000 = 3000 г.',
    solutionEn: '1 kg = 1000 g. 3 kg = 3 × 1000 = 3000 g.',
  },
  {
    questionKz: 'Төрт ондық санды табыңыз: 36 + ? = 76',
    questionRu: 'Найдите неизвестное слагаемое: 36 + ? = 76',
    questionEn: 'Find the unknown addend: 36 + ? = 76',
    options: [
      { kz: '30', ru: '30', en: '30' },
      { kz: '40', ru: '40', en: '40' },
      { kz: '50', ru: '50', en: '50' },
      { kz: '112', ru: '112', en: '112' },
    ],
    correctAnswer: 1, // B) 40
    solutionKz: '? = 76 - 36 = 40.',
    solutionRu: '? = 76 - 36 = 40.',
    solutionEn: '? = 76 - 36 = 40.',
  },
  {
    questionKz: 'Санақты табыңыз: 63 ÷ 9 = ?',
    questionRu: 'Найдите частное: 63 ÷ 9 = ?',
    questionEn: 'Find the quotient: 63 ÷ 9 = ?',
    options: [
      { kz: '6', ru: '6', en: '6' },
      { kz: '7', ru: '7', en: '7' },
      { kz: '8', ru: '8', en: '8' },
      { kz: '9', ru: '9', en: '9' },
    ],
    correctAnswer: 1, // B) 7
    solutionKz: '63 ÷ 9 = 7.',
    solutionRu: '63 ÷ 9 = 7.',
    solutionEn: '63 ÷ 9 = 7.',
  },
  {
    questionKz: 'Үшбұрыштың үш бұрышы қанша градусқа тең?',
    questionRu: 'Чему равна сумма трёх углов треугольника?',
    questionEn: 'What is the sum of three angles of a triangle?',
    options: [
      { kz: '90°', ru: '90°', en: '90°' },
      { kz: '180°', ru: '180°', en: '180°' },
      { kz: '360°', ru: '360°', en: '360°' },
      { kz: '270°', ru: '270°', en: '270°' },
    ],
    correctAnswer: 1, // B) 180°
    solutionKz: 'Үшбұрыштың бұрыштарының қосындысы әрқашан 180°.',
    solutionRu: 'Сумма углов треугольника всегда равна 180°.',
    solutionEn: 'The sum of angles in a triangle is always 180°.',
  },
  {
    questionKz: '5 × 5 × 2 = ?',
    questionRu: '5 × 5 × 2 = ?',
    questionEn: '5 × 5 × 2 = ?',
    options: [
      { kz: '25', ru: '25', en: '25' },
      { kz: '50', ru: '50', en: '50' },
      { kz: '20', ru: '20', en: '20' },
      { kz: '12', ru: '12', en: '12' },
    ],
    correctAnswer: 1, // B) 50
    solutionKz: '5 × 5 = 25. 25 × 2 = 50.',
    solutionRu: '5 × 5 = 25. 25 × 2 = 50.',
    solutionEn: '5 × 5 = 25. 25 × 2 = 50.',
  },
  {
    questionKz: 'Жұп сандарды таңдаңыз: 12, 15, 18, 21, 24',
    questionRu: 'Выберите чётные числа: 12, 15, 18, 21, 24',
    questionEn: 'Select even numbers: 12, 15, 18, 21, 24',
    options: [
      { kz: '12, 15, 18', ru: '12, 15, 18', en: '12, 15, 18' },
      { kz: '12, 18, 24', ru: '12, 18, 24', en: '12, 18, 24' },
      { kz: '15, 21', ru: '15, 21', en: '15, 21' },
      { kz: '12, 18, 21', ru: '12, 18, 21', en: '12, 18, 21' },
    ],
    correctAnswer: 1, // B) 12, 18, 24
    solutionKz: 'Жұп сандар 2-ге бөлінеді: 12, 18, 24.',
    solutionRu: 'Чётные числа делятся на 2: 12, 18, 24.',
    solutionEn: 'Even numbers are divisible by 2: 12, 18, 24.',
  },
  {
    questionKz: '2 м 50 см = ... см',
    questionRu: '2 м 50 см = ... см',
    questionEn: '2 m 50 cm = ... cm',
    options: [
      { kz: '250 см', ru: '250 см', en: '250 cm' },
      { kz: '205 см', ru: '205 см', en: '205 cm' },
      { kz: '2500 см', ru: '2500 см', en: '2500 cm' },
      { kz: '25 см', ru: '25 см', en: '25 cm' },
    ],
    correctAnswer: 0, // A) 250 см
    solutionKz: '2 м = 200 см. 200 + 50 = 250 см.',
    solutionRu: '2 м = 200 см. 200 + 50 = 250 см.',
    solutionEn: '2 m = 200 cm. 200 + 50 = 250 cm.',
  },
  {
    questionKz: 'Қай сан 50-ден кіші және 45-тен үлкен?',
    questionRu: 'Какое число меньше 50 и больше 45?',
    questionEn: 'Which number is less than 50 and greater than 45?',
    options: [
      { kz: '44', ru: '44', en: '44' },
      { kz: '51', ru: '51', en: '51' },
      { kz: '47', ru: '47', en: '47' },
      { kz: '45', ru: '45', en: '45' },
    ],
    correctAnswer: 2, // C) 47
    solutionKz: '45 < 47 < 50, демек 47 дұрыс жауап.',
    solutionRu: '45 < 47 < 50, значит 47 — правильный ответ.',
    solutionEn: '45 < 47 < 50, so 47 is the correct answer.',
  },
  {
    questionKz: '81-ді 9-ға бөліңіз.',
    questionRu: 'Разделите 81 на 9.',
    questionEn: 'Divide 81 by 9.',
    options: [
      { kz: '8', ru: '8', en: '8' },
      { kz: '9', ru: '9', en: '9' },
      { kz: '7', ru: '7', en: '7' },
      { kz: '10', ru: '10', en: '10' },
    ],
    correctAnswer: 1, // B) 9
    solutionKz: '81 ÷ 9 = 9.',
    solutionRu: '81 ÷ 9 = 9.',
    solutionEn: '81 ÷ 9 = 9.',
  },
  {
    questionKz: 'Әкесінің жасы 36, ұлының жасы 4 есе аз. Ұлының жасы неше?',
    questionRu: 'Возраст отца 36 лет, сын в 4 раза младше. Сколько лет сыну?',
    questionEn: 'Father is 36 years old, son is 4 times younger. How old is the son?',
    options: [
      { kz: '9', ru: '9', en: '9' },
      { kz: '8', ru: '8', en: '8' },
      { kz: '32', ru: '32', en: '32' },
      { kz: '40', ru: '40', en: '40' },
    ],
    correctAnswer: 0, // A) 9
    solutionKz: '36 ÷ 4 = 9 жас.',
    solutionRu: '36 ÷ 4 = 9 лет.',
    solutionEn: '36 ÷ 4 = 9 years.',
  },
  {
    questionKz: '4 + 4 + 4 + 4 + 4 нешеге тең?',
    questionRu: 'Чему равно 4 + 4 + 4 + 4 + 4?',
    questionEn: 'What is 4 + 4 + 4 + 4 + 4?',
    options: [
      { kz: '16', ru: '16', en: '16' },
      { kz: '20', ru: '20', en: '20' },
      { kz: '24', ru: '24', en: '24' },
      { kz: '12', ru: '12', en: '12' },
    ],
    correctAnswer: 1, // B) 20
    solutionKz: '4 × 5 = 20.',
    solutionRu: '4 × 5 = 20.',
    solutionEn: '4 × 5 = 20.',
  },
  {
    questionKz: 'Тік төртбұрыштың ұзындығы 8 см, ені 5 см. Ауданын табыңыз.',
    questionRu: 'Длина прямоугольника 8 см, ширина 5 см. Найдите площадь.',
    questionEn: 'The length of a rectangle is 8 cm, width is 5 cm. Find the area.',
    options: [
      { kz: '40 см²', ru: '40 см²', en: '40 cm²' },
      { kz: '26 см²', ru: '26 см²', en: '26 cm²' },
      { kz: '13 см²', ru: '13 см²', en: '13 cm²' },
      { kz: '35 см²', ru: '35 см²', en: '35 cm²' },
    ],
    correctAnswer: 0, // A) 40 см²
    solutionKz: 'Аудан = ұзындық × ен = 8 × 5 = 40 см².',
    solutionRu: 'Площадь = длина × ширина = 8 × 5 = 40 см².',
    solutionEn: 'Area = length × width = 8 × 5 = 40 cm².',
  },
  {
    questionKz: 'Қай сан 3-ке де, 5-ке де бөлінеді?',
    questionRu: 'Какое число делится и на 3, и на 5?',
    questionEn: 'Which number is divisible by both 3 and 5?',
    options: [
      { kz: '10', ru: '10', en: '10' },
      { kz: '12', ru: '12', en: '12' },
      { kz: '15', ru: '15', en: '15' },
      { kz: '18', ru: '18', en: '18' },
    ],
    correctAnswer: 2, // C) 15
    solutionKz: '15 ÷ 3 = 5. 15 ÷ 5 = 3. 15 — 3-ке де, 5-ке де бөлінеді.',
    solutionRu: '15 ÷ 3 = 5. 15 ÷ 5 = 3. 15 делится и на 3, и на 5.',
    solutionEn: '15 ÷ 3 = 5. 15 ÷ 5 = 3. 15 is divisible by both 3 and 5.',
  },
  {
    questionKz: '99 санын дөңгелектеңіз (ондыққа дейін).',
    questionRu: 'Округлите число 99 до десятков.',
    questionEn: 'Round 99 to the nearest ten.',
    options: [
      { kz: '90', ru: '90', en: '90' },
      { kz: '100', ru: '100', en: '100' },
      { kz: '99', ru: '99', en: '99' },
      { kz: '110', ru: '110', en: '110' },
    ],
    correctAnswer: 1, // B) 100
    solutionKz: '99 санындағы бірлік 9 ≥ 5, сондықтан ондық жоғарылайды: 100.',
    solutionRu: 'В числе 99 единица 9 ≥ 5, поэтому десяток округляется вверх: 100.',
    solutionEn: 'In 99, the unit digit is 9 ≥ 5, so we round up: 100.',
  },
  {
    questionKz: '6 × 7 - 12 = ?',
    questionRu: '6 × 7 - 12 = ?',
    questionEn: '6 × 7 - 12 = ?',
    options: [
      { kz: '42', ru: '42', en: '42' },
      { kz: '30', ru: '30', en: '30' },
      { kz: '54', ru: '54', en: '54' },
      { kz: '24', ru: '24', en: '24' },
    ],
    correctAnswer: 1, // B) 30
    solutionKz: '6 × 7 = 42. 42 - 12 = 30.',
    solutionRu: '6 × 7 = 42. 42 - 12 = 30.',
    solutionEn: '6 × 7 = 42. 42 - 12 = 30.',
  },
  {
    questionKz: '1 тәуліктe неше сағат бар?',
    questionRu: 'Сколько часов в сутках?',
    questionEn: 'How many hours are in a day?',
    options: [
      { kz: '12', ru: '12', en: '12' },
      { kz: '48', ru: '48', en: '48' },
      { kz: '24', ru: '24', en: '24' },
      { kz: '60', ru: '60', en: '60' },
    ],
    correctAnswer: 2, // C) 24
    solutionKz: '1 тәулік = 24 сағат.',
    solutionRu: '1 сутки = 24 часа.',
    solutionEn: '1 day = 24 hours.',
  },
  {
    questionKz: '35 + 27 + 15 = ?',
    questionRu: '35 + 27 + 15 = ?',
    questionEn: '35 + 27 + 15 = ?',
    options: [
      { kz: '67', ru: '67', en: '67' },
      { kz: '77', ru: '77', en: '77' },
      { kz: '87', ru: '87', en: '87' },
      { kz: '97', ru: '97', en: '97' },
    ],
    correctAnswer: 1, // B) 77
    solutionKz: '35 + 27 = 62. 62 + 15 = 77.',
    solutionRu: '35 + 27 = 62. 62 + 15 = 77.',
    solutionEn: '35 + 27 = 62. 62 + 15 = 77.',
  },
  {
    questionKz: 'Шаршының қабырғасы 7 см. Ауданын табыңыз.',
    questionRu: 'Сторона квадрата 7 см. Найдите площадь.',
    questionEn: 'The side of a square is 7 cm. Find the area.',
    options: [
      { kz: '28 см²', ru: '28 см²', en: '28 cm²' },
      { kz: '49 см²', ru: '49 см²', en: '49 cm²' },
      { kz: '14 см²', ru: '14 см²', en: '14 cm²' },
      { kz: '56 см²', ru: '56 см²', en: '56 cm²' },
    ],
    correctAnswer: 1, // B) 49 см²
    solutionKz: 'Шаршы ауданы = a² = 7² = 49 см².',
    solutionRu: 'Площадь квадрата = a² = 7² = 49 см².',
    solutionEn: 'Area of square = a² = 7² = 49 cm².',
  },
  {
    questionKz: '100-ден 37-ні алып тастаңыз.',
    questionRu: 'Вычтите 37 из 100.',
    questionEn: 'Subtract 37 from 100.',
    options: [
      { kz: '73', ru: '73', en: '73' },
      { kz: '63', ru: '63', en: '63' },
      { kz: '137', ru: '137', en: '137' },
      { kz: '67', ru: '67', en: '67' },
    ],
    correctAnswer: 1, // B) 63
    solutionKz: '100 - 37 = 63.',
    solutionRu: '100 - 37 = 63.',
    solutionEn: '100 - 37 = 63.',
  },
  {
    questionKz: '8 × 9 = ?',
    questionRu: '8 × 9 = ?',
    questionEn: '8 × 9 = ?',
    options: [
      { kz: '64', ru: '64', en: '64' },
      { kz: '72', ru: '72', en: '72' },
      { kz: '81', ru: '81', en: '81' },
      { kz: '63', ru: '63', en: '63' },
    ],
    correctAnswer: 1, // B) 72
    solutionKz: '8 × 9 = 72.',
    solutionRu: '8 × 9 = 72.',
    solutionEn: '8 × 9 = 72.',
  },
  {
    questionKz: 'Санды тап: ? × 6 = 42',
    questionRu: 'Найдите число: ? × 6 = 42',
    questionEn: 'Find the number: ? × 6 = 42',
    options: [
      { kz: '6', ru: '6', en: '6' },
      { kz: '7', ru: '7', en: '7' },
      { kz: '8', ru: '8', en: '8' },
      { kz: '9', ru: '9', en: '9' },
    ],
    correctAnswer: 1, // B) 7
    solutionKz: '? = 42 ÷ 6 = 7.',
    solutionRu: '? = 42 ÷ 6 = 7.',
    solutionEn: '? = 42 ÷ 6 = 7.',
  },
  {
    questionKz: 'Бір жылда неше ай бар?',
    questionRu: 'Сколько месяцев в году?',
    questionEn: 'How many months are in a year?',
    options: [
      { kz: '10', ru: '10', en: '10' },
      { kz: '11', ru: '11', en: '11' },
      { kz: '12', ru: '12', en: '12' },
      { kz: '52', ru: '52', en: '52' },
    ],
    correctAnswer: 2, // C) 12
    solutionKz: 'Бір жылда 12 ай бар.',
    solutionRu: 'В году 12 месяцев.',
    solutionEn: 'There are 12 months in a year.',
  },
  {
    questionKz: 'Сағат 9:45 болса, 15 минуттан кейін неше болады?',
    questionRu: 'Если сейчас 9:45, который час будет через 15 минут?',
    questionEn: 'If it is 9:45 now, what time will it be in 15 minutes?',
    options: [
      { kz: '9:30', ru: '9:30', en: '9:30' },
      { kz: '10:00', ru: '10:00', en: '10:00' },
      { kz: '10:15', ru: '10:15', en: '10:15' },
      { kz: '9:60', ru: '9:60', en: '9:60' },
    ],
    correctAnswer: 1, // B) 10:00
    solutionKz: '9:45 + 15 минут = 10:00.',
    solutionRu: '9:45 + 15 минут = 10:00.',
    solutionEn: '9:45 + 15 minutes = 10:00.',
  },
  {
    questionKz: '54-ті 6-ға бөліңіз.',
    questionRu: 'Разделите 54 на 6.',
    questionEn: 'Divide 54 by 6.',
    options: [
      { kz: '8', ru: '8', en: '8' },
      { kz: '9', ru: '9', en: '9' },
      { kz: '7', ru: '7', en: '7' },
      { kz: '6', ru: '6', en: '6' },
    ],
    correctAnswer: 1, // B) 9
    solutionKz: '54 ÷ 6 = 9.',
    solutionRu: '54 ÷ 6 = 9.',
    solutionEn: '54 ÷ 6 = 9.',
  },
  {
    questionKz: '5 л-да неше мл бар?',
    questionRu: 'Сколько мл в 5 литрах?',
    questionEn: 'How many ml are in 5 liters?',
    options: [
      { kz: '50 мл', ru: '50 мл', en: '50 ml' },
      { kz: '500 мл', ru: '500 мл', en: '500 ml' },
      { kz: '5000 мл', ru: '5000 мл', en: '5000 ml' },
      { kz: '50000 мл', ru: '50000 мл', en: '50000 ml' },
    ],
    correctAnswer: 2, // C) 5000 мл
    solutionKz: '1 л = 1000 мл. 5 л = 5 × 1000 = 5000 мл.',
    solutionRu: '1 л = 1000 мл. 5 л = 5 × 1000 = 5000 мл.',
    solutionEn: '1 L = 1000 ml. 5 L = 5 × 1000 = 5000 ml.',
  },
  {
    questionKz: '25 + 25 + 25 + 25 = ?',
    questionRu: '25 + 25 + 25 + 25 = ?',
    questionEn: '25 + 25 + 25 + 25 = ?',
    options: [
      { kz: '75', ru: '75', en: '75' },
      { kz: '100', ru: '100', en: '100' },
      { kz: '125', ru: '125', en: '125' },
      { kz: '50', ru: '50', en: '50' },
    ],
    correctAnswer: 1, // B) 100
    solutionKz: '25 × 4 = 100.',
    solutionRu: '25 × 4 = 100.',
    solutionEn: '25 × 4 = 100.',
  },
];

async function main() {
  console.log('Starting diagnostic math test seed...');

  // Find or create Math subject
  let mathSubject = await prisma.taskSubject.findFirst({
    where: { name: { contains: 'Математика' } },
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
        isActive: true,
      },
    });
    console.log('Created Math subject');
  }

  // Find or create topic for 3rd grade olympiad
  let mathTopic = await prisma.taskTopic.findFirst({
    where: {
      subjectId: mathSubject.id,
      name: { contains: '3 класс' },
    },
  });

  if (!mathTopic) {
    mathTopic = await prisma.taskTopic.create({
      data: {
        subjectId: mathSubject.id,
        name: 'Олимпиада 3 класс',
        nameKz: 'Олимпиада 3 сынып',
        nameRu: 'Олимпиада 3 класс',
        nameEn: '3rd Grade Olympiad',
        orderIndex: 1,
        isActive: true,
      },
    });
    console.log('Created 3rd grade olympiad topic');
  }

  // Find or create subtopic
  let subtopic = await prisma.taskSubtopic.findFirst({
    where: {
      topicId: mathTopic.id,
    },
  });

  if (!subtopic) {
    subtopic = await prisma.taskSubtopic.create({
      data: {
        topicId: mathTopic.id,
        name: 'Диагностический тест',
        nameKz: 'Диагностикалық тест',
        nameRu: 'Диагностический тест',
        nameEn: 'Diagnostic Test',
        orderIndex: 1,
        isActive: true,
      },
    });
    console.log('Created diagnostic test subtopic');
  }

  // Create tasks
  const taskIds: string[] = [];

  for (let i = 0; i < diagnosticQuestions.length; i++) {
    const q = diagnosticQuestions[i];

    const task = await prisma.task.create({
      data: {
        subtopicId: subtopic.id,
        format: 'OLYMPIAD',
        difficultyLevel: 'ELEMENTARY',
        questionText: q.questionRu, // Default to Russian
        questionTextKz: q.questionKz,
        questionTextRu: q.questionRu,
        questionTextEn: q.questionEn,
        options: q.options,
        correctAnswer: q.correctAnswer,
        solutionText: q.solutionRu,
        solutionTextKz: q.solutionKz,
        solutionTextRu: q.solutionRu,
        solutionTextEn: q.solutionEn,
        hintsKz: [q.solutionKz.split('.')[0] + '.'],
        hintsRu: [q.solutionRu.split('.')[0] + '.'],
        hintsEn: [q.solutionEn.split('.')[0] + '.'],
        points: 1,
        timeEstimate: 2,
        tags: ['3 класс', 'олимпиада', 'диагностика'],
        isActive: true,
      },
    });

    taskIds.push(task.id);
    console.log(`Created task ${i + 1}/${diagnosticQuestions.length}`);
  }

  // Find a coordinator/admin user to assign as creator
  const adminUser = await prisma.user.findFirst({
    where: {
      role: { in: ['SUPERADMIN', 'ADMIN', 'COORDINATOR'] },
    },
  });

  if (!adminUser) {
    console.error('No admin/coordinator user found. Please create a user first.');
    return;
  }

  // Create the diagnostic test
  const diagnosticTest = await prisma.generatedTest.create({
    data: {
      title: 'Математика - Диагностический тест 3 класс',
      titleKz: 'Математика - 3 сынып диагностикалық тесті',
      titleEn: 'Mathematics - 3rd Grade Diagnostic Test',
      format: 'TEST',
      subjectId: mathSubject.id,
      gradeLevel: 3,
      createdById: adminUser.id,
      duration: 60,
      taskIds: taskIds,
      isDiagnostic: true,
      isShared: false,
    },
  });

  console.log(`\nCreated diagnostic test: ${diagnosticTest.title}`);
  console.log(`Test ID: ${diagnosticTest.id}`);
  console.log(`Total questions: ${taskIds.length}`);
  console.log('\nDiagnostic math test seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
