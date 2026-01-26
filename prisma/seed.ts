import { PrismaClient, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL || 'postgresql://mz@localhost:5432/ertis_classroom?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Start seeding...');

  // ==========================================
  // REFERENCE TABLES (Справочные таблицы)
  // ==========================================

  // Языки обучения
  console.log('\nCreating languages...');
  const languages = [
    { name: 'Казахский', code: 'Q' },
    { name: 'Русский', code: 'R' },
    { name: 'Английский', code: 'E' },
  ];
  for (const lang of languages) {
    await prisma.refLanguage.upsert({
      where: { code: lang.code },
      update: {},
      create: lang,
    });
    console.log(`Created language: ${lang.name} (${lang.code})`);
  }

  // Классы обучения
  console.log('\nCreating grade levels...');
  const gradeLevels = [
    { name: '0 класс', code: '0', orderIndex: 0 },
    { name: '1 класс', code: '1', orderIndex: 1 },
    { name: '2 класс', code: '2', orderIndex: 2 },
    { name: '3 класс', code: '3', orderIndex: 3 },
    { name: '4 класс', code: '4', orderIndex: 4 },
    { name: '5 класс', code: '5', orderIndex: 5 },
    { name: '6 класс', code: '6', orderIndex: 6 },
    { name: '7 класс', code: '7', orderIndex: 7 },
    { name: '8 класс', code: '8', orderIndex: 8 },
    { name: '9 класс', code: '9', orderIndex: 9 },
    { name: '10 класс', code: '10', orderIndex: 10 },
    { name: '11 класс', code: '11', orderIndex: 11 },
    { name: 'Выпускник', code: 'A', orderIndex: 12 },
  ];
  for (const grade of gradeLevels) {
    await prisma.refGradeLevel.upsert({
      where: { code: grade.code },
      update: {},
      create: grade,
    });
    console.log(`Created grade level: ${grade.name}`);
  }

  // Направления обучения
  console.log('\nCreating study directions...');
  const studyDirections = [
    { name: 'СС (Спец школа)', code: 'SS' },
    { name: 'ЕНТ', code: 'ENT' },
    { name: 'IELTS', code: 'IELTS' },
    { name: 'Продленка', code: 'PROD' },
    { name: 'Робототехника', code: 'ROBOT' },
    { name: 'Шахматы', code: 'CHESS' },
    { name: 'Олимпиада', code: 'OLYMP' },
    { name: 'Программирование', code: 'PROG' },
    { name: 'TOEFL', code: 'TOEFL' },
    { name: 'SAT', code: 'SAT' },
  ];
  for (const dir of studyDirections) {
    await prisma.refStudyDirection.upsert({
      where: { code: dir.code },
      update: {},
      create: dir,
    });
    console.log(`Created study direction: ${dir.name}`);
  }

  // Индексы групп (греческие буквы)
  console.log('\nCreating group indexes...');
  const groupIndexes = [
    { name: 'Alpha', symbol: 'Alpha', orderIndex: 1 },
    { name: 'Beta', symbol: 'Beta', orderIndex: 2 },
    { name: 'Gamma', symbol: 'Gamma', orderIndex: 3 },
    { name: 'Delta', symbol: 'Delta', orderIndex: 4 },
    { name: 'Epsilon', symbol: 'Epsilon', orderIndex: 5 },
    { name: 'Zeta', symbol: 'Zeta', orderIndex: 6 },
    { name: 'Eta', symbol: 'Eta', orderIndex: 7 },
    { name: 'Theta', symbol: 'Theta', orderIndex: 8 },
    { name: 'Iota', symbol: 'Iota', orderIndex: 9 },
    { name: 'Kappa', symbol: 'Kappa', orderIndex: 10 },
    { name: 'Lambda', symbol: 'Lambda', orderIndex: 11 },
    { name: 'Omega', symbol: 'Omega', orderIndex: 12 },
  ];
  for (const idx of groupIndexes) {
    await prisma.refGroupIndex.upsert({
      where: { symbol: idx.symbol },
      update: {},
      create: idx,
    });
    console.log(`Created group index: ${idx.name}`);
  }

  // Категории преподавателей
  console.log('\nCreating teacher categories...');
  const teacherCategories = [
    { name: 'Стажер', orderIndex: 1 },
    { name: 'Без категории', orderIndex: 2 },
    { name: 'Первая категория', orderIndex: 3 },
    { name: 'Высшая категория', orderIndex: 4 },
    { name: 'Эксперт', orderIndex: 5 },
  ];
  for (const cat of teacherCategories) {
    await prisma.refTeacherCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
    console.log(`Created teacher category: ${cat.name}`);
  }

  // Особенности (специальные потребности)
  console.log('\nCreating special needs...');
  const specialNeeds = [
    { name: 'ЗПР', description: 'Задержка психического развития' },
    { name: 'СДВГ', description: 'Синдром дефицита внимания и гиперактивности' },
    { name: 'Дислексия', description: 'Нарушение способности к овладению навыком чтения' },
    { name: 'Дисграфия', description: 'Нарушение письменной речи' },
    { name: 'Аутизм', description: 'Расстройство аутистического спектра' },
    { name: 'Нарушение слуха', description: 'Ослабленный слух или глухота' },
    { name: 'Нарушение зрения', description: 'Ослабленное зрение или слепота' },
    { name: 'ДЦП', description: 'Детский церебральный паралич' },
  ];
  for (const need of specialNeeds) {
    await prisma.refSpecialNeed.upsert({
      where: { name: need.name },
      update: {},
      create: need,
    });
    console.log(`Created special need: ${need.name}`);
  }

  // Города
  console.log('\nCreating cities...');
  const cities = [
    { name: 'Астана', region: 'Астана' },
    { name: 'Алматы', region: 'Алматы' },
    { name: 'Шымкент', region: 'Шымкент' },
    { name: 'Караганда', region: 'Карагандинская область' },
    { name: 'Актобе', region: 'Актюбинская область' },
    { name: 'Тараз', region: 'Жамбылская область' },
    { name: 'Павлодар', region: 'Павлодарская область' },
    { name: 'Усть-Каменогорск', region: 'Восточно-Казахстанская область' },
    { name: 'Семей', region: 'Регион Абай' },
    { name: 'Атырау', region: 'Атырауская область' },
    { name: 'Костанай', region: 'Костанайская область' },
    { name: 'Кызылорда', region: 'Кызылординская область' },
    { name: 'Уральск', region: 'Западно-Казахстанская область' },
    { name: 'Петропавловск', region: 'Северо-Казахстанская область' },
    { name: 'Актау', region: 'Мангистауская область' },
    { name: 'Туркестан', region: 'Туркестанская область' },
    { name: 'Кокшетау', region: 'Акмолинская область' },
    { name: 'Талдыкорган', region: 'Алматинская область' },
  ];
  const createdCities: Record<string, string> = {};
  for (const city of cities) {
    const c = await prisma.refCity.upsert({
      where: { name: city.name },
      update: {},
      create: city,
    });
    createdCities[city.name] = c.id;
    console.log(`Created city: ${city.name}`);
  }

  // Школы (для Астаны как пример)
  console.log('\nCreating schools for Astana...');
  const astanaSchools = [
    { name: 'НИШ ФМН Астана', address: 'ул. Акмешит, 12' },
    { name: 'БИЛ №1', address: 'ул. Сарыарка, 15' },
    { name: 'БИЛ №2', address: 'ул. Туран, 22' },
    { name: 'РФМШ', address: 'ул. Кенесары, 40' },
    { name: 'Лицей №134', address: 'ул. Мангилик Ел, 55' },
    { name: 'Гимназия №6', address: 'пр. Абая, 30' },
    { name: 'СШ №25', address: 'ул. Сауран, 10' },
    { name: 'СШ №72', address: 'ул. Достык, 45' },
    { name: 'Назарбаев Интеллектуальная Школа', address: 'ул. Акмешит, 12' },
    { name: 'Haileybury Astana', address: 'ул. Кабанбай батыра, 53' },
    { name: 'Miras International School', address: 'ул. Туран, 37' },
  ];
  const astanaCityId = createdCities['Астана'];
  if (astanaCityId) {
    for (const school of astanaSchools) {
      await prisma.refSchool.upsert({
        where: { id: school.name }, // Will create new since id won't match
        update: {},
        create: {
          cityId: astanaCityId,
          name: school.name,
          address: school.address,
        },
      });
      console.log(`Created school: ${school.name}`);
    }
  }

  // Предметы (для справочника, не TaskSubject)
  console.log('\nCreating reference subjects...');
  const refSubjects = [
    { name: 'Математика', nameRu: 'Математика', nameKz: 'Математика', nameEn: 'Mathematics', icon: '📐', orderIndex: 1 },
    { name: 'Логика', nameRu: 'Логика', nameKz: 'Логика', nameEn: 'Logic', icon: '🧠', orderIndex: 2 },
    { name: 'Казахский язык', nameRu: 'Казахский язык', nameKz: 'Қазақ тілі', nameEn: 'Kazakh', icon: '🇰🇿', orderIndex: 3 },
    { name: 'Русский язык', nameRu: 'Русский язык', nameKz: 'Орыс тілі', nameEn: 'Russian', icon: '📚', orderIndex: 4 },
    { name: 'Английский язык', nameRu: 'Английский язык', nameKz: 'Ағылшын тілі', nameEn: 'English', icon: '🇬🇧', orderIndex: 5 },
    { name: 'Естествознание', nameRu: 'Естествознание', nameKz: 'Жаратылыстану', nameEn: 'Natural Science', icon: '🔬', orderIndex: 6 },
    { name: 'Алгебра', nameRu: 'Алгебра', nameKz: 'Алгебра', nameEn: 'Algebra', icon: '🔢', orderIndex: 7 },
    { name: 'Геометрия', nameRu: 'Геометрия', nameKz: 'Геометрия', nameEn: 'Geometry', icon: '📐', orderIndex: 8 },
    { name: 'Физика', nameRu: 'Физика', nameKz: 'Физика', nameEn: 'Physics', icon: '⚡', orderIndex: 9 },
    { name: 'Химия', nameRu: 'Химия', nameKz: 'Химия', nameEn: 'Chemistry', icon: '🧪', orderIndex: 10 },
    { name: 'Биология', nameRu: 'Биология', nameKz: 'Биология', nameEn: 'Biology', icon: '🧬', orderIndex: 11 },
    { name: 'История Казахстана', nameRu: 'История Казахстана', nameKz: 'Қазақстан тарихы', nameEn: 'History of Kazakhstan', icon: '📜', orderIndex: 12 },
    { name: 'География', nameRu: 'География', nameKz: 'География', nameEn: 'Geography', icon: '🌍', orderIndex: 13 },
    { name: 'Всемирная история', nameRu: 'Всемирная история', nameKz: 'Дүниежүзілік тарих', nameEn: 'World History', icon: '🌏', orderIndex: 14 },
    { name: 'Информатика', nameRu: 'Информатика', nameKz: 'Информатика', nameEn: 'Computer Science', icon: '💻', orderIndex: 15 },
    { name: 'Литература', nameRu: 'Литература', nameKz: 'Әдебиет', nameEn: 'Literature', icon: '📖', orderIndex: 16 },
  ];
  for (const subj of refSubjects) {
    await prisma.refSubject.upsert({
      where: { name: subj.name },
      update: {},
      create: subj,
    });
    console.log(`Created ref subject: ${subj.name}`);
  }

  // ==========================================
  // END REFERENCE TABLES
  // ==========================================

  // Хеширование паролей
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Создаем пользователей
  const users = [
    {
      email: 'admin@ertis.kz',
      password: hashedPassword,
      firstName: 'Админ',
      lastName: 'Системы',
      role: UserRole.ADMIN,
    },
    {
      email: 'superadmin@ertis.kz',
      password: hashedPassword,
      firstName: 'Супер',
      lastName: 'Админ',
      role: UserRole.SUPERADMIN,
    },
    {
      email: 'teacher@ertis.kz',
      password: hashedPassword,
      firstName: 'Айгуль',
      lastName: 'Нурланова',
      role: UserRole.TEACHER,
    },
    {
      email: 'student@ertis.kz',
      password: hashedPassword,
      firstName: 'Алихан',
      lastName: 'Касымов',
      role: UserRole.TEACHER, // Временно, так как Student требует дополнительных полей
    },
  ];

  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: userData,
    });
    console.log(`Created user: ${user.email}`);
  }

  // Создаем филиалы
  console.log('\nCreating branches...');
  const branches = [
    { name: 'Дауылпаз', address: 'ул. Дауылпаз, Астана', phone: '+7 (777) 123-45-67' },
    { name: 'Абая', address: 'пр. Абая, Астана', phone: '+7 (777) 123-45-68' },
    { name: 'Мангилик', address: 'пр. Мангилик Ел, Астана', phone: '+7 (777) 123-45-69' },
  ];

  const createdBranches = [];
  for (const branchData of branches) {
    const branch = await prisma.branch.upsert({
      where: { name: branchData.name },
      update: {},
      create: branchData,
    });
    createdBranches.push(branch);
    console.log(`Created branch: ${branch.name}`);
  }

  // Создаем аудитории для каждого филиала (по 8 аудиторий)
  console.log('\nCreating classrooms...');
  for (const branch of createdBranches) {
    for (let i = 1; i <= 8; i++) {
      await prisma.classroom.upsert({
        where: {
          branchId_name: {
            branchId: branch.id,
            name: `Аудитория ${i}`,
          },
        },
        update: {},
        create: {
          branchId: branch.id,
          name: `Аудитория ${i}`,
          capacity: 15,
          equipment: i <= 4 ? ['Проектор', 'Доска', 'WiFi'] : ['Доска', 'WiFi'],
        },
      });
      console.log(`Created classroom: ${branch.name} - Аудитория ${i}`);
    }
  }

  // Создаем предметы для библиотеки задач
  console.log('\nCreating task subjects...');
  const subjects = [
    { name: 'Математика', nameRu: 'Математика', nameKz: 'Математика', nameEn: 'Mathematics', icon: '📐', orderIndex: 1 },
    { name: 'Логика', nameRu: 'Логика', nameKz: 'Логика', nameEn: 'Logic', icon: '🧠', orderIndex: 2 },
    { name: 'Казахский язык', nameRu: 'Казахский язык', nameKz: 'Қазақ тілі', nameEn: 'Kazakh', icon: '🇰🇿', orderIndex: 3 },
    { name: 'Русский язык', nameRu: 'Русский язык', nameKz: 'Орыс тілі', nameEn: 'Russian', icon: '📚', orderIndex: 4 },
    { name: 'Английский язык', nameRu: 'Английский язык', nameKz: 'Ағылшын тілі', nameEn: 'English', icon: '🇬🇧', orderIndex: 5 },
    { name: 'Естествознание', nameRu: 'Естествознание', nameKz: 'Жаратылыстану', nameEn: 'Natural Science', icon: '🔬', orderIndex: 6 },
    { name: 'Алгебра', nameRu: 'Алгебра', nameKz: 'Алгебра', nameEn: 'Algebra', icon: '🔢', orderIndex: 7 },
    { name: 'Геометрия', nameRu: 'Геометрия', nameKz: 'Геометрия', nameEn: 'Geometry', icon: '📐', orderIndex: 8 },
    { name: 'Физика', nameRu: 'Физика', nameKz: 'Физика', nameEn: 'Physics', icon: '⚡', orderIndex: 9 },
    { name: 'Химия', nameRu: 'Химия', nameKz: 'Химия', nameEn: 'Chemistry', icon: '🧪', orderIndex: 10 },
    { name: 'Биология', nameRu: 'Биология', nameKz: 'Биология', nameEn: 'Biology', icon: '🧬', orderIndex: 11 },
    { name: 'История Казахстана', nameRu: 'История Казахстана', nameKz: 'Қазақстан тарихы', nameEn: 'History of Kazakhstan', icon: '📜', orderIndex: 12 },
    { name: 'География', nameRu: 'География', nameKz: 'География', nameEn: 'Geography', icon: '🌍', orderIndex: 13 },
    { name: 'Всемирная история', nameRu: 'Всемирная история', nameKz: 'Дүниежүзілік тарих', nameEn: 'World History', icon: '🌏', orderIndex: 14 },
    { name: 'Информатика', nameRu: 'Информатика', nameKz: 'Информатика', nameEn: 'Computer Science', icon: '💻', orderIndex: 15 },
    { name: 'Литература', nameRu: 'Литература', nameKz: 'Әдебиет', nameEn: 'Literature', icon: '📖', orderIndex: 16 },
  ];

  const mathSubject = await prisma.taskSubject.upsert({
    where: { name: 'Математика' },
    update: {},
    create: subjects[0],
  });
  console.log(`Created subject: ${mathSubject.name}`);

  // Создаем остальные предметы
  for (let i = 1; i < subjects.length; i++) {
    const subject = await prisma.taskSubject.upsert({
      where: { name: subjects[i].name },
      update: {},
      create: subjects[i],
    });
    console.log(`Created subject: ${subject.name}`);
  }

  // Создаем темы и подтемы по математике
  console.log('\nCreating math topics and subtopics...');

  const mathTopics = [
    {
      name: '🧮 Арифметика',
      nameRu: 'Арифметика',
      icon: '🧮',
      subtopics: [
        'Натуральные числа и операции',
        'Дроби (обыкновенные и десятичные)',
        'Проценты',
        'Пропорции',
        'Среднее арифметическое',
        'Делимость, НОД и НОК',
        'Простые и составные числа',
      ],
    },
    {
      name: '📐 Геометрия',
      nameRu: 'Геометрия',
      icon: '📐',
      subtopics: [
        'Точки, прямые, отрезки, углы',
        'Треугольники (виды, свойства, площадь)',
        'Четырёхугольники (параллелограмм, трапеция, ромб)',
        'Окружность и круг',
        'Многоугольники',
        'Теорема Пифагора',
        'Подобие фигур',
        'Площади плоских фигур',
        'Периметры',
      ],
    },
    {
      name: '📦 Стереометрия',
      nameRu: 'Стереометрия',
      icon: '📦',
      subtopics: [
        'Прямые и плоскости в пространстве',
        'Многогранники (призмы, пирамиды)',
        'Тела вращения (цилиндр, конус, сфера)',
        'Объёмы тел',
        'Площади поверхностей',
      ],
    },
    {
      name: '📊 Алгебра',
      nameRu: 'Алгебра',
      icon: '📊',
      subtopics: [
        'Числа и выражения (рациональные, иррациональные)',
        'Степени и корни',
        'Логарифмы',
        'Многочлены',
        'Разложение на множители',
        'Уравнения (линейные, квадратные, кубические)',
        'Системы уравнений',
        'Неравенства',
        'Системы неравенств',
      ],
    },
    {
      name: '📈 Функции',
      nameRu: 'Функции',
      icon: '📈',
      subtopics: [
        'Линейная функция',
        'Квадратичная функция',
        'Степенная функция',
        'Показательная функция',
        'Логарифмическая функция',
        'Обратные функции',
        'Графики функций',
        'Преобразования графиков',
      ],
    },
    {
      name: '🔺 Тригонометрия',
      nameRu: 'Тригонометрия',
      icon: '🔺',
      subtopics: [
        'Синус, косинус, тангенс, котангенс',
        'Тригонометрические тождества',
        'Формулы приведения',
        'Формулы двойного и половинного аргумента',
        'Тригонометрические уравнения',
        'Обратные тригонометрические функции',
      ],
    },
    {
      name: '📉 Анализ',
      nameRu: 'Анализ',
      icon: '📉',
      subtopics: [
        'Производная (определение, правила)',
        'Геометрический и физический смысл производной',
        'Применение производной (экстремумы, возрастание/убывание)',
        'Интеграл (первообразная)',
        'Определённый интеграл и площадь',
        'Пределы',
      ],
    },
    {
      name: '🔢 Последовательности',
      nameRu: 'Последовательности',
      icon: '🔢',
      subtopics: [
        'Арифметическая прогрессия',
        'Геометрическая прогрессия',
        'Рекуррентные последовательности',
      ],
    },
    {
      name: '🧠 Логика и комбинаторика',
      nameRu: 'Логика и комбинаторика',
      icon: '🧠',
      subtopics: [
        'Множества',
        'Логические операции',
        'Перестановки',
        'Размещения',
        'Сочетания',
        'Бином Ньютона',
        'Теория вероятностей (классическая)',
      ],
    },
    {
      name: '📍 Координаты и векторы',
      nameRu: 'Координаты и векторы',
      icon: '📍',
      subtopics: [
        'Декартовы координаты на плоскости',
        'Уравнения прямой',
        'Уравнения окружности',
        'Векторы на плоскости',
        'Скалярное произведение',
        'Координаты в пространстве',
        'Векторы в пространстве',
      ],
    },
    {
      name: '🧮 Прикладная математика',
      nameRu: 'Прикладная математика',
      icon: '🧮',
      subtopics: [
        'Задачи на движение',
        'Задачи на работу',
        'Задачи на смеси и сплавы',
        'Задачи на проценты',
        'Текстовые задачи',
        'Оптимизация',
      ],
    },
  ];

  for (let i = 0; i < mathTopics.length; i++) {
    const topicData = mathTopics[i];
    const topic = await prisma.taskTopic.create({
      data: {
        subjectId: mathSubject.id,
        name: topicData.name,
        nameRu: topicData.nameRu,
        icon: topicData.icon,
        orderIndex: i + 1,
      },
    });
    console.log(`Created topic: ${topic.name}`);

    // Создаем подтемы
    for (let j = 0; j < topicData.subtopics.length; j++) {
      const subtopicName = topicData.subtopics[j];
      await prisma.taskSubtopic.create({
        data: {
          topicId: topic.id,
          name: subtopicName,
          nameRu: subtopicName,
          orderIndex: j + 1,
        },
      });
      console.log(`  Created subtopic: ${subtopicName}`);
    }
  }

  console.log('\nSeeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
