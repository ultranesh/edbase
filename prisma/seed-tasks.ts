import { prisma } from '../lib/prisma';

const mathTasks = [
  {
    questionText: 'Вычислите: $\\frac{3}{4} + \\frac{1}{2}$',
    correctAnswer: '1¼ или 1.25',
    difficulty: 'EASY',
    grade: 4,
    points: 2,
  },
  {
    questionText: 'Решите уравнение: $2x + 5 = 13$',
    correctAnswer: 'x = 4',
    difficulty: 'MEDIUM',
    grade: 5,
    points: 3,
  },
  {
    questionText: 'Найдите площадь прямоугольника со сторонами 8 см и 5 см',
    correctAnswer: '40 см²',
    difficulty: 'EASY',
    grade: 4,
    points: 2,
  },
  {
    questionText: 'Вычислите: $\\sqrt{144}$',
    correctAnswer: '12',
    difficulty: 'EASY',
    grade: 5,
    points: 2,
  },
  {
    questionText: 'Решите систему уравнений: $\\begin{cases} x + y = 10 \\\\ x - y = 2 \\end{cases}$',
    correctAnswer: 'x = 6, y = 4',
    difficulty: 'HARD',
    grade: 7,
    points: 5,
  },
  {
    questionText: 'Найдите значение выражения: $(3^2 + 4^2) \\times 2$',
    correctAnswer: '50',
    difficulty: 'MEDIUM',
    grade: 6,
    points: 3,
  },
  {
    questionText: 'Вычислите периметр квадрата со стороной 7 см',
    correctAnswer: '28 см',
    difficulty: 'EASY',
    grade: 4,
    points: 2,
  },
  {
    questionText: 'Решите неравенство: $3x - 7 > 8$',
    correctAnswer: 'x > 5',
    difficulty: 'MEDIUM',
    grade: 6,
    points: 3,
  },
  {
    questionText: 'Найдите НОД чисел 48 и 36',
    correctAnswer: '12',
    difficulty: 'MEDIUM',
    grade: 5,
    points: 3,
  },
  {
    questionText: 'Вычислите: $\\frac{2}{3} \\times \\frac{3}{4}$',
    correctAnswer: '½ или 0.5',
    difficulty: 'MEDIUM',
    grade: 5,
    points: 3,
  },
  {
    questionText: 'Найдите сумму углов треугольника',
    correctAnswer: '180°',
    difficulty: 'EASY',
    grade: 7,
    points: 2,
  },
  {
    questionText: 'Решите уравнение: $x^2 = 25$',
    correctAnswer: 'x = ±5',
    difficulty: 'MEDIUM',
    grade: 8,
    points: 3,
  },
  {
    questionText: 'Найдите длину окружности с радиусом 7 см ($\\pi \\approx 3.14$)',
    correctAnswer: '43.96 см',
    difficulty: 'MEDIUM',
    grade: 6,
    points: 3,
  },
  {
    questionText: 'Вычислите: $5! - 3!$',
    correctAnswer: '114',
    difficulty: 'HARD',
    grade: 9,
    points: 4,
  },
  {
    questionText: 'Найдите объем куба с ребром 4 см',
    correctAnswer: '64 см³',
    difficulty: 'EASY',
    grade: 5,
    points: 2,
  },
  {
    questionText: 'Упростите выражение: $2(x + 3) - (x - 1)$',
    correctAnswer: 'x + 7',
    difficulty: 'MEDIUM',
    grade: 7,
    points: 3,
  },
  {
    questionText: 'Найдите 30% от числа 200',
    correctAnswer: '60',
    difficulty: 'EASY',
    grade: 6,
    points: 2,
  },
  {
    questionText: 'Решите уравнение: $\\frac{x}{3} + 5 = 9$',
    correctAnswer: 'x = 12',
    difficulty: 'MEDIUM',
    grade: 6,
    points: 3,
  },
  {
    questionText: 'Найдите среднее арифметическое чисел: 8, 12, 15, 9, 6',
    correctAnswer: '10',
    difficulty: 'EASY',
    grade: 5,
    points: 2,
  },
  {
    questionText: 'Вычислите: $\\sin(90^{\\circ})$',
    correctAnswer: '1',
    difficulty: 'HARD',
    grade: 9,
    points: 4,
  },
];

async function main() {
  console.log('Начинаем добавление тестовых задач...');

  // Находим нужные предметы и темы
  const mathSubject = await prisma.taskSubject.findFirst({
    where: { name: { contains: 'Математика' } },
    include: {
      taskTopics: {
        include: {
          subtopics: true,
        },
      },
    },
  });

  if (!mathSubject || !mathSubject.taskTopics.length) {
    console.error('Не найден предмет Математика или темы');
    return;
  }

  const topic = mathSubject.taskTopics[0];
  const subtopic = topic.subtopics[0];

  if (!subtopic) {
    console.error('Не найдена подтема');
    return;
  }

  // Добавляем задачи
  for (let i = 0; i < mathTasks.length; i++) {
    const taskData = mathTasks[i];

    const task = await prisma.task.create({
      data: {
        subtopicId: subtopic.id,
        format: 'NISH',
        questionText: taskData.questionText,
        answerText: taskData.correctAnswer,
        points: taskData.points,
        difficultyLevel: taskData.difficulty === 'EASY' ? 'ELEMENTARY' : taskData.difficulty === 'MEDIUM' ? 'INTERMEDIATE' : 'ADVANCED',
        tags: i % 3 === 0 ? ['ГОСО'] : i % 4 === 0 ? ['Проверено'] : [],
        timeEstimate: taskData.grade <= 5 ? 5 : taskData.grade <= 7 ? 8 : 12,
      },
    });

    console.log(`Создана задача ${i + 1}/${mathTasks.length}: ${taskData.questionText.substring(0, 50)}...`);
  }

  console.log('✅ Успешно добавлено 20 задач!');
}

main()
  .catch((e) => {
    console.error('Ошибка:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
