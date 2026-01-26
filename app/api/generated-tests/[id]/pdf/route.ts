import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import puppeteer, { Browser } from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

// Функция для получения браузера
async function getBrowser(): Promise<Browser> {
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    // Локальная разработка - используем установленный Chrome/Chromium
    const possiblePaths = [
      // macOS
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      // Linux
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      // Windows
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ];

    let executablePath: string | undefined;
    for (const path of possiblePaths) {
      try {
        const fs = await import('fs');
        if (fs.existsSync(path)) {
          executablePath = path;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!executablePath) {
      throw new Error('Chrome/Chromium not found. Please install Google Chrome.');
    }

    return puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  } else {
    // Production (serverless) - используем @sparticuz/chromium
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }
}

// GET - генерация PDF
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let browser: Browser | null = null;

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'test'; // test | keys | solutions | blank
    const lang = searchParams.get('lang') || 'kz'; // kz | ru | en

    const generatedTest = await prisma.generatedTest.findUnique({
      where: { id },
      include: {
        subject: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        sharedWith: {
          where: {
            sharedWithId: session.user.id,
          },
        },
      },
    });

    if (!generatedTest) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Проверяем доступ
    const isOwner = generatedTest.createdById === session.user.id;
    const isSharedWith = generatedTest.sharedWith.length > 0;

    if (!isOwner && !isSharedWith) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Получаем задания
    const taskIds = generatedTest.taskIds as string[];
    const rawTasks = await prisma.task.findMany({
      where: {
        id: { in: taskIds },
      },
      select: {
        id: true,
        questionText: true,
        answerText: true,
        solutionText: true,
        difficultyLevel: true,
        subtopic: {
          select: {
            name: true,
            nameKz: true,
            topic: {
              select: {
                name: true,
                nameKz: true,
              },
            },
          },
        },
      },
    });

    // Parse answer text like "A) 52 B) 62 C) 72 D) 82" into options array
    const parseAnswerText = (answerText: string | null): { options: string[]; correctAnswer: number } => {
      if (!answerText) {
        return { options: ['A', 'B', 'C', 'D', 'E'], correctAnswer: 0 };
      }
      const optionRegex = /([A-E])\)\s*([^A-E)]+?)(?=\s*[A-E]\)|$)/gi;
      const matches = [...answerText.matchAll(optionRegex)];
      if (matches.length > 0) {
        const options = matches.map(m => m[2].trim());
        return { options, correctAnswer: 0 };
      }
      const parts = answerText.split(/[;,|]/).map(s => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        return { options: parts, correctAnswer: 0 };
      }
      return { options: [answerText], correctAnswer: 0 };
    };

    // Map difficulty level enum to number
    const mapDifficulty = (level: string): number => {
      switch (level) {
        case 'ELEMENTARY': return 1;
        case 'INTERMEDIATE': return 2;
        case 'ADVANCED': return 3;
        default: return 2;
      }
    };

    // Transform tasks to expected format
    const tasks = rawTasks.map(task => {
      const { options, correctAnswer } = parseAnswerText(task.answerText);
      return {
        id: task.id,
        question: task.questionText,
        options,
        correctAnswer,
        explanation: task.solutionText || null,
        difficulty: mapDifficulty(task.difficultyLevel),
        topic: task.subtopic?.topic || task.subtopic || null,
      };
    });

    // Сортируем задания в том порядке, в котором они хранятся
    const orderedTasks = taskIds
      .map((taskId) => tasks.find((t) => t.id === taskId))
      .filter(Boolean);

    // Генерируем HTML для PDF
    const html = generatePdfHtml(generatedTest, orderedTasks, type, lang);

    // Генерируем PDF через Puppeteer
    browser = await getBrowser();

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Ждем загрузки KaTeX
    await page.waitForFunction(() => {
      return typeof (window as unknown as { renderMathInElement?: unknown }).renderMathInElement !== 'undefined';
    }, { timeout: 5000 }).catch(() => {
      // KaTeX может не загрузиться, продолжаем
    });

    // Дополнительная задержка для рендеринга формул
    await new Promise(resolve => setTimeout(resolve, 1000));

    // For blank type, use zero margins so markers are at page edges
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: type === 'blank' ? {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0',
      } : {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm',
      },
      printBackground: true,
    });

    await browser.close();
    browser = null;

    // Формируем имя файла
    const getTitle = () => {
      if (lang === 'kz' && generatedTest.titleKz) return generatedTest.titleKz;
      if (lang === 'en' && generatedTest.titleEn) return generatedTest.titleEn;
      return generatedTest.title;
    };

    const fileName = type === 'test'
      ? `${getTitle()}.pdf`
      : type === 'keys'
        ? `${getTitle()}_keys.pdf`
        : type === 'blank'
          ? `${getTitle()}_blank.pdf`
          : `${getTitle()}_solutions.pdf`;

    // Возвращаем PDF
    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generatePdfHtml(test: any, tasks: any[], type: string, lang: string): string {
  const translations = {
    ru: {
      test: 'Тест',
      exam: 'Экзамен',
      answerKeys: 'Ключи ответов',
      solutions: 'Решения',
      answerSheet: 'Бланк ответов',
      grade: 'Класс',
      subject: 'Предмет',
      questionsCount: 'Количество вопросов',
      duration: 'Время',
      minutes: 'минут',
      question: 'Вопрос',
      answer: 'Ответ',
      correctAnswer: 'Правильный ответ',
      explanation: 'Объяснение',
      topic: 'Тема',
      difficulty: 'Сложность',
      easy: 'Легкий',
      medium: 'Средний',
      hard: 'Сложный',
      page: 'Страница',
      name: 'ФИО',
      date: 'Дата',
      score: 'Баллы',
      variant: 'Вариант',
      sources: 'Источники',
      taskLibrary: 'Библиотека заданий составлена',
      visitWebsite: 'Посетите наш сайт',
      instructions: 'Инструкция',
      fillBubble: 'Закрасьте кружок полностью',
      oneAnswer: 'Выберите только один ответ',
      useBlackPen: 'Используйте черную или синюю ручку',
    },
    kz: {
      test: 'Тест',
      exam: 'Емтихан',
      answerKeys: 'Жауап кілттері',
      solutions: 'Шешімдер',
      answerSheet: 'Жауап парағы',
      grade: 'Сынып',
      subject: 'Пән',
      questionsCount: 'Сұрақ саны',
      duration: 'Уақыт',
      minutes: 'минут',
      question: 'Сұрақ',
      answer: 'Жауап',
      correctAnswer: 'Дұрыс жауап',
      explanation: 'Түсіндірме',
      topic: 'Тақырып',
      difficulty: 'Қиындық',
      easy: 'Жеңіл',
      medium: 'Орташа',
      hard: 'Қиын',
      page: 'Бет',
      name: 'Аты-жөні',
      date: 'Күні',
      score: 'Балл',
      variant: 'Нұсқа',
      sources: 'Дереккөздер',
      taskLibrary: 'Тапсырмалар кітапханасын құрастырған',
      visitWebsite: 'Біздің сайтқа кіріңіз',
      instructions: 'Нұсқаулық',
      fillBubble: 'Шеңберді толық бояңыз',
      oneAnswer: 'Тек бір жауапты таңдаңыз',
      useBlackPen: 'Қара немесе көк қаламды қолданыңыз',
    },
    en: {
      test: 'Test',
      exam: 'Exam',
      answerKeys: 'Answer Keys',
      solutions: 'Solutions',
      answerSheet: 'Answer Sheet',
      grade: 'Grade',
      subject: 'Subject',
      questionsCount: 'Number of questions',
      duration: 'Duration',
      minutes: 'minutes',
      question: 'Question',
      answer: 'Answer',
      correctAnswer: 'Correct answer',
      explanation: 'Explanation',
      topic: 'Topic',
      difficulty: 'Difficulty',
      easy: 'Easy',
      medium: 'Medium',
      hard: 'Hard',
      page: 'Page',
      name: 'Name',
      date: 'Date',
      score: 'Score',
      variant: 'Variant',
      sources: 'Sources',
      taskLibrary: 'Task library compiled by',
      visitWebsite: 'Visit our website',
      instructions: 'Instructions',
      fillBubble: 'Fill the bubble completely',
      oneAnswer: 'Select only one answer',
      useBlackPen: 'Use black or blue pen',
    },
  };

  const tr = translations[lang as keyof typeof translations] || translations.ru;

  const getTitle = () => {
    if (lang === 'kz' && test.titleKz) return test.titleKz;
    if (lang === 'en' && test.titleEn) return test.titleEn;
    return test.title;
  };

  const getSubjectName = () => {
    if (!test.subject) return '';
    if (lang === 'kz' && test.subject.nameKz) return test.subject.nameKz;
    return test.subject.name;
  };

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty === 1) return tr.easy;
    if (difficulty === 2) return tr.medium;
    return tr.hard;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getTaskQuestion = (task: any) => {
    return task.question;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getTaskOptions = (task: any) => {
    const options = task.options as string[];
    return options;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getTopicName = (task: any) => {
    if (!task.topic) return '';
    if (lang === 'kz' && task.topic.nameKz) return task.topic.nameKz;
    return task.topic.name;
  };

  const documentTitle =
    type === 'keys'
      ? `${getTitle()} - ${tr.answerKeys}`
      : type === 'solutions'
        ? `${getTitle()} - ${tr.solutions}`
        : type === 'blank'
          ? `${getTitle()} - ${tr.answerSheet}`
          : getTitle();

  const formatLabel = test.format === 'EXAM' ? tr.exam : tr.test;

  let content = '';

  if (type === 'test') {
    // Генерируем тест с заданиями
    content = `
      <div class="header-info">
        <div class="info-row">
          <span><strong>${tr.name}:</strong> _________________________________</span>
          <span><strong>${tr.date}:</strong> _______________</span>
        </div>
        <div class="info-row">
          <span><strong>${tr.grade}:</strong> ${test.gradeLevel || ''}</span>
          <span><strong>${tr.variant}:</strong> 1</span>
          <span><strong>${tr.score}:</strong> ______ / ${tasks.length}</span>
        </div>
      </div>

      <div class="tasks">
        ${tasks
          .map(
            (task, index) => `
          <div class="task">
            <div class="task-header">
              <span class="task-number">${tr.question} ${index + 1}</span>
              ${task.topic ? `<span class="task-topic">${getTopicName(task)}</span>` : ''}
            </div>
            <div class="task-question">${getTaskQuestion(task)}</div>
            ${task.imageUrl ? `<img src="${task.imageUrl}" class="task-image" />` : ''}
            <div class="task-options">
              ${getTaskOptions(task)
                .map(
                  (option, optIndex) => `
                <div class="option">
                  <span class="option-letter">${String.fromCharCode(65 + optIndex)})</span>
                  <span class="option-text">${option}</span>
                </div>
              `
                )
                .join('')}
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  } else if (type === 'solutions') {
    // Генерируем ключи + решения
    const getDifficultyClass = (difficulty: number) => {
      if (difficulty === 1) return 'easy';
      if (difficulty === 2) return 'medium';
      return 'hard';
    };

    content = `
      <!-- Секция ключей -->
      <div class="keys-section">
        <h2 class="section-title">${tr.answerKeys}</h2>
        <div class="keys-grid">
          ${tasks
            .map(
              (task, index) => `
            <div class="key-item">
              <span class="key-number">${index + 1}.</span>
              <span class="key-answer">${String.fromCharCode(65 + task.correctAnswer)}</span>
            </div>
          `
            )
            .join('')}
        </div>
      </div>

      <!-- Секция решений -->
      <div class="solutions-section">
        <h2 class="section-title">${tr.solutions}</h2>
        <div class="solutions">
          ${tasks
            .map(
              (task, index) => `
            <div class="solution">
              <div class="solution-header">
                <span class="solution-number">${tr.question} ${index + 1}</span>
                <span class="solution-difficulty ${getDifficultyClass(task.difficulty)}">${getDifficultyLabel(task.difficulty)}</span>
              </div>
              <div class="solution-question">${getTaskQuestion(task)}</div>
              ${task.imageUrl ? `<img src="${task.imageUrl}" class="solution-image" />` : ''}
              <div class="solution-options">
                ${getTaskOptions(task)
                  .map(
                    (option, optIndex) => `
                  <div class="option ${optIndex === task.correctAnswer ? 'correct' : ''}">
                    <span class="option-letter">${String.fromCharCode(65 + optIndex)})</span>
                    <span class="option-text">${option}</span>
                    ${optIndex === task.correctAnswer ? '<span class="correct-mark">✓</span>' : ''}
                  </div>
                `
                  )
                  .join('')}
              </div>
              <div class="solution-answer">
                <strong>${tr.correctAnswer}:</strong> ${String.fromCharCode(65 + task.correctAnswer)}
              </div>
              ${
                task.explanation
                  ? `
                <div class="solution-explanation">
                  <strong>${tr.explanation}:</strong>
                  <p>${task.explanation}</p>
                </div>
              `
                  : ''
              }
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `;
  }
  // Note: type === 'blank' is handled by generateBlankHtml() and returns early

  // Источники заданий - используем дефолтный
  const taskSources = ['ERTIS Academy'];

  // Секция источников
  const ertisDescriptions = {
    ru: {
      description: 'Подготовка к НИШ, БИЛ, РФМШ, Зерде, Дарын, ЕНТ, IELTS, SAT, СОР/СОЧ',
      format: 'Очно и онлайн',
      sources: 'Источники заданий'
    },
    kz: {
      description: 'НЗМ, БИЛ, РФММ, Зерде, Дарын, ҰБТ, IELTS, SAT, БЖБ/ТЖБ-ға дайындық',
      format: 'Офлайн және онлайн',
      sources: 'Тапсырмалар көздері'
    },
    en: {
      description: 'NIS, BIL, RFMS, Zerde, Daryn, UNT, IELTS, SAT, SOR/SOC prep',
      format: 'In-person & online',
      sources: 'Task sources'
    }
  };

  const ertisText = ertisDescriptions[lang as keyof typeof ertisDescriptions] || ertisDescriptions.ru;

  const sourcesSection = `
    <div class="sources-section">
      <div class="sources-row">
        <div class="ertis-block">
          <svg class="ertis-logo" viewBox="0 0 830 250" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M276.944 25.9674C261.149 24.9159 245.321 26.1822 229.91 29.7437C213.143 33.6104 197.145 40.1001 182.368 49.0546C183.329 51.395 184.562 54.018 186.178 56.788C187.999 59.9085 189.887 62.5428 191.639 64.691C197.654 61.0504 205.715 56.7767 215.631 53.0456C220.187 51.3271 226.417 49.2468 233.924 47.5169C242.155 45.6175 253.812 43.7181 268.057 43.8651V115.817C267.549 123.438 266.35 130.866 264.541 138.057C243.207 133.24 223.364 133.964 205.365 140.25C187.727 146.412 176.704 156.294 167.84 164.23C158.297 172.778 152.814 177.323 144.289 177.323C144.074 177.323 143.848 177.323 143.622 177.323C143.543 177.323 143.452 177.323 143.373 177.323C143.294 177.323 143.204 177.323 143.124 177.323C142.898 177.323 142.672 177.323 142.457 177.323C133.933 177.323 128.449 172.767 118.907 164.23C110.054 156.294 99.0192 146.423 81.3816 140.25C63.0318 133.851 42.7486 133.218 20.939 138.362C19.0848 131.081 17.8637 123.551 17.3436 115.829V43.8764C31.5893 43.7294 43.246 45.6401 51.4769 47.5283C58.9841 49.2581 65.2252 51.3384 69.7703 53.057C79.6971 56.788 87.747 61.0617 93.7619 64.7023C95.5143 62.5541 97.4138 59.9198 99.2341 56.7993C100.84 54.0293 102.083 51.4063 103.044 49.0659C88.2558 40.1227 72.2689 33.6217 55.4906 29.755C40.0803 26.1935 24.2517 24.9272 8.45698 25.9787L0 26.544V107.315C0 112.448 0.271372 117.525 0.802761 122.522C8.4231 194.067 69.1371 249.999 142.672 249.999C216.207 249.999 276.933 194.079 284.542 122.522C285.073 117.525 285.345 112.448 285.345 107.315V26.544L276.888 25.9787L276.944 25.9674ZM184.324 225.849C171.299 230.439 157.325 232.927 142.74 232.927C140.117 232.927 137.528 232.848 134.939 232.678C106.097 230.914 79.844 219.348 59.4816 201.281C53.8059 196.261 48.5938 190.721 43.9018 184.751C36.9937 175.955 31.2276 166.198 26.8295 155.74C44.5801 151.805 60.8836 152.382 75.4346 157.469C89.6351 162.421 98.3635 170.245 106.798 177.809C116.544 186.537 126.618 195.56 142.525 195.56C142.831 195.56 143.125 195.56 143.441 195.537C143.746 195.537 144.052 195.56 144.357 195.56C160.265 195.56 170.327 186.537 180.084 177.809C188.519 170.245 197.247 162.421 211.448 157.469C225.659 152.495 241.533 151.828 258.809 155.468C245.151 188.222 218.016 214.011 184.369 225.849H184.324Z" fill="#1B485F"/>
            <path d="M258.762 155.472C245.105 188.226 217.97 214.015 184.323 225.853C171.298 230.443 157.324 232.93 142.739 232.93C140.116 232.93 137.527 232.851 134.937 232.681C106.096 230.918 79.8427 219.351 59.4803 201.284C53.8046 196.264 48.5925 190.724 43.9004 184.755C36.9924 175.958 31.2262 166.201 26.8281 155.743C44.5788 151.808 60.8822 152.385 75.4332 157.473C89.6338 162.425 98.3622 170.249 106.797 177.813C116.542 186.541 126.616 195.563 142.524 195.563C142.829 195.563 143.123 195.563 143.44 195.541C143.745 195.541 144.05 195.563 144.356 195.563C160.263 195.563 170.326 186.541 180.083 177.813C188.517 170.249 197.246 162.425 211.446 157.473C225.658 152.498 241.532 151.831 258.808 155.472H258.762Z" fill="#44AABF"/>
            <path d="M112.785 98.7706C115.736 103.791 118.653 109.297 121.389 115.255C121.468 115.436 121.558 115.628 121.649 115.809C131.123 136.669 135.001 155.607 136.686 169.197H139.942V90.1892C133.113 88.889 127.946 82.8742 127.946 75.6721C127.946 67.5091 134.572 60.8837 142.735 60.8837C150.898 60.8837 157.523 67.5091 157.523 75.6721C157.523 82.8742 152.356 88.889 145.527 90.1892V169.197H148.784C150.457 155.607 154.346 136.669 163.832 115.809C163.9 115.628 164.002 115.436 164.081 115.255C166.817 109.285 169.723 103.791 172.673 98.7706C178.134 89.4996 183.753 81.8114 188.762 75.6835C182.612 66.4576 175.681 54.3939 169.745 39.5942C163.742 24.6361 160.406 11.0122 158.496 0H126.985C125.063 11.0122 121.728 24.6361 115.736 39.5942C109.8 54.3939 102.881 66.4576 96.7188 75.6835C101.727 81.8114 107.347 89.4996 112.796 98.7706H112.785Z" fill="#1B485F"/>
            <path d="M828.402 180.254L811.608 208.39V224.119H799.2V208.202L782.469 180.254H795.566L805.968 197.675L816.371 180.254H828.402Z" fill="#1B485F"/>
            <path d="M754.267 224.119H742.862L742.737 200.871L731.457 219.796H725.943L714.726 201.497V224.119H703.258V180.254H713.472L728.888 205.571L743.927 180.254H754.142L754.267 224.119Z" fill="#1B485F"/>
            <path d="M648.368 214.532H671.304V224.119H636.086V180.254H670.489V189.842H648.368V197.236H667.857V206.511H648.368V214.532Z" fill="#1B485F"/>
            <path d="M559.25 224.119V180.254H579.992C594.53 180.254 604.494 188.714 604.494 202.187C604.494 215.66 594.53 224.119 579.992 224.119H559.25ZM571.658 214.218H579.491C586.948 214.218 591.961 209.769 591.961 202.187C591.961 194.604 586.948 190.155 579.491 190.155H571.658V214.218Z" fill="#1B485F"/>
            <path d="M517.757 224.119L514.31 215.597H495.761L492.315 224.119H479.656L499.02 180.254H511.239L530.666 224.119H517.757ZM499.396 206.448H510.675L505.036 192.411L499.396 206.448Z" fill="#1B485F"/>
            <path d="M436.196 224.999C422.285 224.999 412.07 215.537 412.07 202.189C412.07 188.841 422.285 179.379 436.196 179.379C444.28 179.379 450.797 182.324 455.059 187.651L447.163 194.795C444.405 191.473 441.022 189.656 436.823 189.656C429.617 189.656 424.603 194.669 424.603 202.189C424.603 209.709 429.617 214.722 436.823 214.722C441.022 214.722 444.405 212.905 447.163 209.583L455.059 216.727C450.797 222.054 444.28 224.999 436.196 224.999Z" fill="#1B485F"/>
            <path d="M373.444 224.119L369.997 215.597H351.449L348.002 224.119H335.344L354.707 180.254H366.927L386.353 224.119H373.444ZM355.083 206.448H366.363L360.723 192.411L355.083 206.448Z" fill="#1B485F"/>
            <path d="M780.352 149.077C761.568 149.077 742.784 143.218 732.789 134.601L740.544 117.196C750.194 124.951 765.532 130.465 780.352 130.465C799.136 130.465 807.063 123.744 807.063 114.783C807.063 88.7616 735.374 105.822 735.374 61.0167C735.374 41.5436 750.884 25 783.971 25C798.446 25 813.611 28.7912 824.123 35.6844L817.058 53.0896C806.201 46.7134 794.31 43.6115 783.798 43.6115C765.187 43.6115 757.604 50.8493 757.604 59.9827C757.604 85.6597 829.121 68.9438 829.121 113.232C829.121 132.533 813.439 149.077 780.352 149.077Z" fill="#1B485F"/>
            <path d="M687.93 147.357V26.7266H710.332V147.357H687.93Z" fill="#1B485F"/>
            <path d="M608.738 147.357V45.6827H568.758V26.7266H671.121V45.6827H631.141V147.357H608.738Z" fill="#1B485F"/>
            <path d="M562.959 147.357H538.833L514.19 112.029C512.639 112.202 511.088 112.202 509.537 112.202H482.309V147.357H459.906V26.7266H509.537C541.245 26.7266 560.891 42.9255 560.891 69.6364C560.891 87.9033 551.585 101.345 535.214 107.721L562.959 147.357ZM538.316 69.6364C538.316 54.4715 528.148 45.6827 508.503 45.6827H482.309V93.7625H508.503C528.148 93.7625 538.316 84.8014 538.316 69.6364Z" fill="#1B485F"/>
            <path d="M366.856 128.573H434.926V147.357H344.453V26.7266H432.513V45.5104H366.856V76.8742H425.103V95.3134H366.856V128.573Z" fill="#1B485F"/>
          </svg>
          <div class="ertis-info">
            <span class="ertis-desc">${ertisText.description}</span>
            <span class="ertis-format">${ertisText.format}</span>
          </div>
          <div class="ertis-site">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=32x32&data=https://ertis.academy" alt="QR" />
            <span>ertis.academy</span>
          </div>
        </div>
        <div class="sources-block">
          <span class="sources-label">${ertisText.sources}:</span>
          <span class="sources-list">${taskSources.join(' • ')}</span>
        </div>
      </div>
    </div>
  `;

  // For blank type, use special layout with markers at page edges
  if (type === 'blank') {
    return generateBlankHtml(test, tasks, lang, tr);
  }

  return `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${documentTitle}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
  <style>
    @page {
      size: A4;
      margin: 12mm 15mm 12mm 15mm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html, body {
      width: 100%;
      height: 100%;
    }

    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9.5pt;
      line-height: 1.35;
      color: #1a1a1a;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .document {
      max-width: 100%;
      padding-bottom: 30px;
    }

    /* Header Section */
    /* Watermark */
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      pointer-events: none;
      z-index: 1;
      opacity: 0.06;
    }

    .watermark svg {
      width: 700px;
      height: auto;
    }

    /* Header Section */
    .document-header {
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 2px solid #286786;
    }

    .header-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .logo-svg {
      height: 28px;
      width: auto;
    }

    .header-info-right {
      text-align: right;
      font-size: 8pt;
      color: #666;
    }

    .document-title {
      font-size: 14pt;
      font-weight: bold;
      color: #1a1a1a;
      text-align: center;
      margin: 8px 0 4px 0;
    }

    .document-subtitle {
      font-size: 10pt;
      color: #555;
      text-align: center;
    }

    .document-meta {
      display: flex;
      justify-content: center;
      gap: 20px;
      margin-top: 6px;
      font-size: 9pt;
      color: #444;
    }

    /* Student Info Section */
    .header-info {
      margin-bottom: 12px;
      padding: 8px 12px;
      border: 1px solid #ccc;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
      font-size: 9pt;
    }

    .info-row:last-child {
      margin-bottom: 0;
    }

    /* Tasks Section */
    .tasks {
      margin-top: 10px;
      column-count: 2;
      column-gap: 20px;
    }

    .task {
      margin-bottom: 12px;
      padding: 8px 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      page-break-inside: avoid;
      break-inside: avoid;
      background: rgba(255, 255, 255, 0.85);
    }

    .task-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
      padding-bottom: 4px;
      border-bottom: 1px solid #eee;
    }

    .task-number {
      font-weight: bold;
      font-size: 9.5pt;
      color: #333;
    }

    .task-topic {
      font-size: 7pt;
      color: #666;
      font-style: italic;
    }

    .task-question {
      margin-bottom: 6px;
      font-size: 9pt;
      line-height: 1.4;
      color: #222;
    }

    .task-image {
      max-width: 100%;
      max-height: 80px;
      margin: 6px auto;
      display: block;
    }

    .task-options {
      margin-left: 4px;
    }

    .option {
      display: flex;
      align-items: flex-start;
      margin-bottom: 3px;
      padding: 3px 6px;
      background: rgba(248, 248, 248, 0.9);
      border-radius: 3px;
    }

    .option-letter {
      font-weight: bold;
      min-width: 20px;
      color: #333;
      font-size: 9pt;
    }

    .option-text {
      flex: 1;
      color: #333;
      font-size: 9pt;
      line-height: 1.3;
    }

    .option.correct {
      background: rgba(212, 237, 218, 0.9);
      border: 1px solid #a5d6a7;
    }

    .correct-mark {
      color: #28a745;
      font-weight: bold;
      font-size: 10pt;
      margin-left: 4px;
    }

    /* Section Titles */
    .section-title {
      font-size: 12pt;
      font-weight: bold;
      color: #333;
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid #ddd;
    }

    /* Keys Section */
    .keys-section {
      margin-bottom: 20px;
    }

    .keys-grid {
      display: grid;
      grid-template-columns: repeat(10, 1fr);
      gap: 4px;
      margin: 10px 0;
    }

    .key-item {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 6px 4px;
      background: rgba(245, 245, 245, 0.85);
      border: 1px solid #ddd;
      border-radius: 3px;
      font-size: 9pt;
    }

    .key-number {
      font-weight: bold;
      margin-right: 2px;
      color: #555;
    }

    .key-answer {
      font-weight: bold;
      color: #286786;
      font-size: 10pt;
    }

    /* Solutions Section */
    .solutions-section {
      margin-top: 16px;
    }

    .solutions {
      margin-top: 10px;
      column-count: 2;
      column-gap: 20px;
    }

    .solution {
      margin-bottom: 12px;
      padding: 8px 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      page-break-inside: avoid;
      break-inside: avoid;
      background: rgba(255, 255, 255, 0.85);
    }

    .solution-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
      padding-bottom: 4px;
      border-bottom: 1px solid #eee;
    }

    .solution-number {
      font-weight: bold;
      font-size: 9.5pt;
      color: #333;
    }

    .solution-difficulty {
      font-size: 7pt;
      padding: 2px 6px;
      border-radius: 8px;
      font-weight: 500;
    }

    .solution-difficulty.easy {
      background: #d4edda;
      color: #155724;
    }

    .solution-difficulty.medium {
      background: #fff3cd;
      color: #856404;
    }

    .solution-difficulty.hard {
      background: #f8d7da;
      color: #721c24;
    }

    .solution-question {
      margin-bottom: 6px;
      font-size: 9pt;
      line-height: 1.4;
    }

    .solution-image {
      max-width: 100%;
      max-height: 80px;
      margin: 6px auto;
      display: block;
    }

    .solution-options {
      margin: 6px 0 6px 4px;
    }

    .solution-answer {
      margin-top: 6px;
      padding: 4px 8px;
      background: #e3f2fd;
      font-size: 9pt;
      border-left: 3px solid #286786;
    }

    .solution-explanation {
      margin-top: 6px;
      padding: 6px 8px;
      background: #fffde7;
      border-left: 3px solid #ffc107;
      font-size: 8pt;
    }

    .solution-explanation strong {
      color: #856404;
      font-size: 8pt;
    }

    .solution-explanation p {
      margin-top: 4px;
      font-size: 8pt;
      line-height: 1.4;
      color: #555;
    }

    /* Sources Section */
    .sources-section {
      margin-top: 20px;
      padding: 10px 14px;
      background: #f8fafb;
      border-top: 2px solid #1B485F;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .sources-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }

    .ertis-block {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .ertis-logo {
      height: 26px;
      width: auto;
      flex-shrink: 0;
    }

    .ertis-info {
      display: flex;
      flex-direction: column;
      gap: 1px;
      font-size: 6.5pt;
      color: #666;
    }

    .ertis-info .ertis-desc {
      color: #444;
    }

    .ertis-info .ertis-format {
      font-style: italic;
    }

    .ertis-site {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 3px 6px;
      background: #fff;
      border: 1px solid #44AABF;
      border-radius: 3px;
    }

    .ertis-site img {
      width: 24px;
      height: 24px;
    }

    .ertis-site span {
      font-size: 7.5pt;
      font-weight: 600;
      color: #1B485F;
    }

    .sources-block {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 7pt;
    }

    .sources-label {
      color: #888;
      font-weight: 500;
    }

    .sources-list {
      color: #333;
    }

    /* Footer */
    .page-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 8px 15px;
      border-top: 1px solid #e0e0e0;
      text-align: center;
      font-size: 8pt;
      color: #888;
      background: #fff;
    }

    .footer-logo {
      display: inline-flex;
      align-items: center;
      vertical-align: middle;
    }

    .footer-logo svg {
      height: 14px;
      width: auto;
    }

    /* Print Styles */
    @media print {
      body {
        padding: 0;
        margin: 0;
        padding-bottom: 30px;
      }

      .watermark {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-45deg);
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .tasks, .solutions {
        column-count: 2;
      }

      .task, .solution {
        page-break-inside: avoid;
        break-inside: avoid;
      }

      .page-footer {
        position: fixed;
        bottom: 0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <!-- Watermark - ERTIS Academy logo -->
  <div class="watermark">
    <svg viewBox="0 0 830 250" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M276.944 25.9674C261.149 24.9159 245.321 26.1822 229.91 29.7437C213.143 33.6104 197.145 40.1001 182.368 49.0546C183.329 51.395 184.562 54.018 186.178 56.788C187.999 59.9085 189.887 62.5428 191.639 64.691C197.654 61.0504 205.715 56.7767 215.631 53.0456C220.187 51.3271 226.417 49.2468 233.924 47.5169C242.155 45.6175 253.812 43.7181 268.057 43.8651V115.817C267.549 123.438 266.35 130.866 264.541 138.057C243.207 133.24 223.364 133.964 205.365 140.25C187.727 146.412 176.704 156.294 167.84 164.23C158.297 172.778 152.814 177.323 144.289 177.323C144.074 177.323 143.848 177.323 143.622 177.323C143.543 177.323 143.452 177.323 143.373 177.323C143.294 177.323 143.204 177.323 143.124 177.323C142.898 177.323 142.672 177.323 142.457 177.323C133.933 177.323 128.449 172.767 118.907 164.23C110.054 156.294 99.0192 146.423 81.3816 140.25C63.0317 133.851 42.7486 133.218 20.939 138.362C19.0848 131.081 17.8637 123.551 17.3436 115.829V43.8764C31.5893 43.7294 43.246 45.6401 51.4769 47.5283C58.9841 49.2581 65.2252 51.3384 69.7703 53.057C79.6971 56.788 87.747 61.0617 93.7619 64.7023C95.5143 62.5541 97.4138 59.9198 99.2341 56.7993C100.84 54.0293 102.083 51.4063 103.044 49.0659C88.2558 40.1227 72.2689 33.6217 55.4906 29.755C40.0803 26.1935 24.2517 24.9272 8.45698 25.9787L0 26.544V107.315C0 112.448 0.271372 117.525 0.802761 122.522C8.4231 194.067 69.1371 249.999 142.672 249.999C216.207 249.999 276.933 194.079 284.542 122.522C285.073 117.525 285.345 112.448 285.345 107.315V26.544L276.888 25.9787L276.944 25.9674ZM184.324 225.849C171.299 230.439 157.325 232.927 142.74 232.927C140.117 232.927 137.528 232.848 134.939 232.678C106.097 230.914 79.844 219.348 59.4816 201.281C53.8059 196.261 48.5938 190.721 43.9018 184.751C36.9937 175.955 31.2276 166.198 26.8295 155.74C44.5801 151.805 60.8836 152.382 75.4346 157.469C89.6351 162.421 98.3635 170.245 106.798 177.809C116.544 186.538 126.618 195.56 142.525 195.56C142.831 195.56 143.125 195.56 143.441 195.537C143.746 195.537 144.052 195.56 144.357 195.56C160.265 195.56 170.327 186.538 180.084 177.809C188.519 170.245 197.247 162.421 211.448 157.469C225.659 152.495 241.533 151.828 258.809 155.468C245.151 188.222 218.016 214.011 184.369 225.849H184.324Z" fill="#333"/>
      <path d="M258.762 155.472C245.105 188.226 217.97 214.015 184.323 225.853C171.298 230.443 157.324 232.93 142.739 232.93C140.116 232.93 137.527 232.851 134.937 232.681C106.096 230.918 79.8427 219.351 59.4803 201.284C53.8046 196.264 48.5925 190.724 43.9004 184.755C36.9924 175.958 31.2262 166.201 26.8281 155.743C44.5788 151.808 60.8822 152.385 75.4332 157.473C89.6338 162.425 98.3622 170.249 106.797 177.813C116.542 186.541 126.616 195.563 142.524 195.563C142.829 195.563 143.123 195.563 143.44 195.541C143.745 195.541 144.05 195.563 144.356 195.563C160.263 195.563 170.326 186.541 180.083 177.813C188.517 170.249 197.246 162.425 211.446 157.473C225.658 152.498 241.532 151.831 258.808 155.472H258.762Z" fill="#333"/>
      <path d="M112.785 98.7706C115.736 103.791 118.653 109.297 121.389 115.255C121.468 115.436 121.558 115.628 121.649 115.809C131.123 136.669 135.001 155.607 136.686 169.197H139.942V90.1892C133.113 88.889 127.946 82.8742 127.946 75.6721C127.946 67.5091 134.572 60.8837 142.735 60.8837C150.898 60.8837 157.523 67.5091 157.523 75.6721C157.523 82.8742 152.356 88.889 145.527 90.1892V169.197H148.784C150.457 155.607 154.346 136.669 163.832 115.809C163.9 115.628 164.002 115.436 164.081 115.255C166.817 109.285 169.723 103.791 172.673 98.7706C178.134 89.4996 183.753 81.8114 188.762 75.6835C182.612 66.4576 175.681 54.3939 169.745 39.5942C163.742 24.6361 160.406 11.0122 158.496 0H126.985C125.063 11.0122 121.728 24.6361 115.736 39.5942C109.8 54.3939 102.881 66.4576 96.7188 75.6835C101.727 81.8114 107.347 89.4996 112.796 98.7706H112.785Z" fill="#333"/>
      <path d="M828.402 180.254L811.608 208.39V224.119H799.2V208.202L782.469 180.254H795.566L805.968 197.675L816.371 180.254H828.402Y" fill="#333"/>
      <path d="M754.267 224.119H742.862L742.737 200.871L731.457 219.796H725.943L714.726 201.497V224.119H703.258V180.254H713.472L728.888 205.571L743.927 180.254H754.142L754.267 224.119Z" fill="#333"/>
      <path d="M648.368 214.532H671.304V224.119H636.086V180.254H670.489V189.842H648.368V197.236H667.857V206.511H648.368V214.532Z" fill="#333"/>
      <path d="M559.25 224.119V180.254H579.992C594.53 180.254 604.494 188.714 604.494 202.187C604.494 215.66 594.53 224.119 579.992 224.119H559.25ZM571.658 214.218H579.491C586.948 214.218 591.961 209.769 591.961 202.187C591.961 194.604 586.948 190.155 579.491 190.155H571.658V214.218Z" fill="#333"/>
      <path d="M517.757 224.119L514.31 215.597H495.761L492.315 224.119H479.656L499.02 180.254H511.239L530.666 224.119H517.757ZM499.396 206.448H510.675L505.036 192.411L499.396 206.448Z" fill="#333"/>
      <path d="M436.196 224.999C422.285 224.999 412.07 215.537 412.07 202.189C412.07 188.841 422.285 179.379 436.196 179.379C444.28 179.379 450.797 182.324 455.059 187.651L447.163 194.795C444.405 191.473 441.022 189.656 436.823 189.656C429.617 189.656 424.603 194.669 424.603 202.189C424.603 209.709 429.617 214.722 436.823 214.722C441.022 214.722 444.405 212.905 447.163 209.583L455.059 216.727C450.797 222.054 444.28 224.999 436.196 224.999Z" fill="#333"/>
      <path d="M373.444 224.119L369.997 215.597H351.449L348.002 224.119H335.344L354.707 180.254H366.927L386.353 224.119H373.444ZM355.083 206.448H366.363L360.723 192.411L355.083 206.448Z" fill="#333"/>
      <path d="M780.352 149.077C761.568 149.077 742.784 143.218 732.789 134.601L740.544 117.196C750.194 124.951 765.532 130.465 780.352 130.465C799.136 130.465 807.063 123.744 807.063 114.783C807.063 88.7616 735.374 105.822 735.374 61.0167C735.374 41.5436 750.884 25 783.971 25C798.446 25 813.611 28.7912 824.123 35.6844L817.058 53.0896C806.201 46.7134 794.31 43.6115 783.798 43.6115C765.187 43.6115 757.604 50.8493 757.604 59.9827C757.604 85.6597 829.121 68.9438 829.121 113.232C829.121 132.533 813.439 149.077 780.352 149.077Z" fill="#333"/>
      <path d="M687.93 147.357V26.7266H710.332V147.357H687.93Z" fill="#333"/>
      <path d="M608.738 147.357V45.6827H568.758V26.7266H671.121V45.6827H631.141V147.357H608.738Z" fill="#333"/>
      <path d="M562.959 147.357H538.833L514.19 112.029C512.639 112.202 511.088 112.202 509.537 112.202H482.309V147.357H459.906V26.7266H509.537C541.245 26.7266 560.891 42.9255 560.891 69.6364C560.891 87.9033 551.585 101.345 535.214 107.721L562.959 147.357ZM538.316 69.6364C538.316 54.4715 528.148 45.6827 508.503 45.6827H482.309V93.7625H508.503C528.148 93.7625 538.316 84.8014 538.316 69.6364Z" fill="#333"/>
      <path d="M366.856 128.573H434.926V147.357H344.453V26.7266H432.513V45.5104H366.856V76.8742H425.103V95.3134H366.856V128.573Z" fill="#333"/>
    </svg>
  </div>

  <div class="document">
    <div class="document-header">
      <div class="header-top">
        <div class="logo">
          <svg class="logo-svg" viewBox="0 0 830 250" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M276.944 25.9674C261.149 24.9159 245.321 26.1822 229.91 29.7437C213.143 33.6104 197.145 40.1001 182.368 49.0546C183.329 51.395 184.562 54.018 186.178 56.788C187.999 59.9085 189.887 62.5428 191.639 64.691C197.654 61.0504 205.715 56.7767 215.631 53.0456C220.187 51.3271 226.417 49.2468 233.924 47.5169C242.155 45.6175 253.812 43.7181 268.057 43.8651V115.817C267.549 123.438 266.35 130.866 264.541 138.057C243.207 133.24 223.364 133.964 205.365 140.25C187.727 146.412 176.704 156.294 167.84 164.23C158.297 172.778 152.814 177.323 144.289 177.323C144.074 177.323 143.848 177.323 143.622 177.323C143.543 177.323 143.452 177.323 143.373 177.323C143.294 177.323 143.204 177.323 143.124 177.323C142.898 177.323 142.672 177.323 142.457 177.323C133.933 177.323 128.449 172.767 118.907 164.23C110.054 156.294 99.0192 146.423 81.3816 140.25C63.0317 133.851 42.7486 133.218 20.939 138.362C19.0848 131.081 17.8637 123.551 17.3436 115.829V43.8764C31.5893 43.7294 43.246 45.6401 51.4769 47.5283C58.9841 49.2581 65.2252 51.3384 69.7703 53.057C79.6971 56.788 87.747 61.0617 93.7619 64.7023C95.5143 62.5541 97.4138 59.9198 99.2341 56.7993C100.84 54.0293 102.083 51.4063 103.044 49.0659C88.2558 40.1227 72.2689 33.6217 55.4906 29.755C40.0803 26.1935 24.2517 24.9272 8.45698 25.9787L0 26.544V107.315C0 112.448 0.271372 117.525 0.802761 122.522C8.4231 194.067 69.1371 249.999 142.672 249.999C216.207 249.999 276.933 194.079 284.542 122.522C285.073 117.525 285.345 112.448 285.345 107.315V26.544L276.888 25.9787L276.944 25.9674ZM184.324 225.849C171.299 230.439 157.325 232.927 142.74 232.927C140.117 232.927 137.528 232.848 134.939 232.678C106.097 230.914 79.844 219.348 59.4816 201.281C53.8059 196.261 48.5938 190.721 43.9018 184.751C36.9937 175.955 31.2276 166.198 26.8295 155.74C44.5801 151.805 60.8836 152.382 75.4346 157.469C89.6351 162.421 98.3635 170.245 106.798 177.809C116.544 186.538 126.618 195.56 142.525 195.56C142.831 195.56 143.125 195.56 143.441 195.537C143.746 195.537 144.052 195.56 144.357 195.56C160.265 195.56 170.327 186.538 180.084 177.809C188.519 170.245 197.247 162.421 211.448 157.469C225.659 152.495 241.533 151.828 258.809 155.468C245.151 188.222 218.016 214.011 184.369 225.849H184.324Z" fill="#1B485F"/>
            <path d="M258.762 155.472C245.105 188.226 217.97 214.015 184.323 225.853C171.298 230.443 157.324 232.93 142.739 232.93C140.116 232.93 137.527 232.851 134.937 232.681C106.096 230.918 79.8427 219.351 59.4803 201.284C53.8046 196.264 48.5925 190.724 43.9004 184.755C36.9924 175.958 31.2262 166.201 26.8281 155.743C44.5788 151.808 60.8822 152.385 75.4332 157.473C89.6338 162.425 98.3622 170.249 106.797 177.813C116.542 186.541 126.616 195.563 142.524 195.563C142.829 195.563 143.123 195.563 143.44 195.541C143.745 195.541 144.05 195.563 144.356 195.563C160.263 195.563 170.326 186.541 180.083 177.813C188.517 170.249 197.246 162.425 211.446 157.473C225.658 152.498 241.532 151.831 258.808 155.472H258.762Z" fill="#44AABF"/>
            <path d="M112.785 98.7706C115.736 103.791 118.653 109.297 121.389 115.255C121.468 115.436 121.558 115.628 121.649 115.809C131.123 136.669 135.001 155.607 136.686 169.197H139.942V90.1892C133.113 88.889 127.946 82.8742 127.946 75.6721C127.946 67.5091 134.572 60.8837 142.735 60.8837C150.898 60.8837 157.523 67.5091 157.523 75.6721C157.523 82.8742 152.356 88.889 145.527 90.1892V169.197H148.784C150.457 155.607 154.346 136.669 163.832 115.809C163.9 115.628 164.002 115.436 164.081 115.255C166.817 109.285 169.723 103.791 172.673 98.7706C178.134 89.4996 183.753 81.8114 188.762 75.6835C182.612 66.4576 175.681 54.3939 169.745 39.5942C163.742 24.6361 160.406 11.0122 158.496 0H126.985C125.063 11.0122 121.728 24.6361 115.736 39.5942C109.8 54.3939 102.881 66.4576 96.7188 75.6835C101.727 81.8114 107.347 89.4996 112.796 98.7706H112.785Z" fill="#1B485F"/>
            <path d="M828.402 180.254L811.608 208.39V224.119H799.2V208.202L782.469 180.254H795.566L805.968 197.675L816.371 180.254H828.402Y" fill="#1B485F"/>
            <path d="M754.267 224.119H742.862L742.737 200.871L731.457 219.796H725.943L714.726 201.497V224.119H703.258V180.254H713.472L728.888 205.571L743.927 180.254H754.142L754.267 224.119Z" fill="#1B485F"/>
            <path d="M648.368 214.532H671.304V224.119H636.086V180.254H670.489V189.842H648.368V197.236H667.857V206.511H648.368V214.532Z" fill="#1B485F"/>
            <path d="M559.25 224.119V180.254H579.992C594.53 180.254 604.494 188.714 604.494 202.187C604.494 215.66 594.53 224.119 579.992 224.119H559.25ZM571.658 214.218H579.491C586.948 214.218 591.961 209.769 591.961 202.187C591.961 194.604 586.948 190.155 579.491 190.155H571.658V214.218Z" fill="#1B485F"/>
            <path d="M517.757 224.119L514.31 215.597H495.761L492.315 224.119H479.656L499.02 180.254H511.239L530.666 224.119H517.757ZM499.396 206.448H510.675L505.036 192.411L499.396 206.448Z" fill="#1B485F"/>
            <path d="M436.196 224.999C422.285 224.999 412.07 215.537 412.07 202.189C412.07 188.841 422.285 179.379 436.196 179.379C444.28 179.379 450.797 182.324 455.059 187.651L447.163 194.795C444.405 191.473 441.022 189.656 436.823 189.656C429.617 189.656 424.603 194.669 424.603 202.189C424.603 209.709 429.617 214.722 436.823 214.722C441.022 214.722 444.405 212.905 447.163 209.583L455.059 216.727C450.797 222.054 444.28 224.999 436.196 224.999Z" fill="#1B485F"/>
            <path d="M373.444 224.119L369.997 215.597H351.449L348.002 224.119H335.344L354.707 180.254H366.927L386.353 224.119H373.444ZM355.083 206.448H366.363L360.723 192.411L355.083 206.448Z" fill="#1B485F"/>
            <path d="M780.352 149.077C761.568 149.077 742.784 143.218 732.789 134.601L740.544 117.196C750.194 124.951 765.532 130.465 780.352 130.465C799.136 130.465 807.063 123.744 807.063 114.783C807.063 88.7616 735.374 105.822 735.374 61.0167C735.374 41.5436 750.884 25 783.971 25C798.446 25 813.611 28.7912 824.123 35.6844L817.058 53.0896C806.201 46.7134 794.31 43.6115 783.798 43.6115C765.187 43.6115 757.604 50.8493 757.604 59.9827C757.604 85.6597 829.121 68.9438 829.121 113.232C829.121 132.533 813.439 149.077 780.352 149.077Z" fill="#1B485F"/>
            <path d="M687.93 147.357V26.7266H710.332V147.357H687.93Z" fill="#1B485F"/>
            <path d="M608.738 147.357V45.6827H568.758V26.7266H671.121V45.6827H631.141V147.357H608.738Z" fill="#1B485F"/>
            <path d="M562.959 147.357H538.833L514.19 112.029C512.639 112.202 511.088 112.202 509.537 112.202H482.309V147.357H459.906V26.7266H509.537C541.245 26.7266 560.891 42.9255 560.891 69.6364C560.891 87.9033 551.585 101.345 535.214 107.721L562.959 147.357ZM538.316 69.6364C538.316 54.4715 528.148 45.6827 508.503 45.6827H482.309V93.7625H508.503C528.148 93.7625 538.316 84.8014 538.316 69.6364Z" fill="#1B485F"/>
            <path d="M366.856 128.573H434.926V147.357H344.453V26.7266H432.513V45.5104H366.856V76.8742H425.103V95.3134H366.856V128.573Z" fill="#1B485F"/>
          </svg>
        </div>
        <div class="header-info-right">
          ertis.academy
        </div>
      </div>
      <div class="document-title">${documentTitle}</div>
      <div class="document-subtitle">${formatLabel}</div>
      <div class="document-meta">
        <span>${tr.subject}: ${getSubjectName()}</span>
        <span>${tr.grade}: ${test.gradeLevel || ''}</span>
        <span>${tr.questionsCount}: ${tasks.length}</span>
        ${test.duration ? `<span>${tr.duration}: ${test.duration} ${tr.minutes}</span>` : ''}
      </div>
    </div>

    ${content}

    ${type !== 'blank' ? sourcesSection : ''}

    <div class="page-footer">
      <span class="footer-logo">
        <svg viewBox="0 0 830 250" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M276.944 25.9674C261.149 24.9159 245.321 26.1822 229.91 29.7437C213.143 33.6104 197.145 40.1001 182.368 49.0546C183.329 51.395 184.562 54.018 186.178 56.788C187.999 59.9085 189.887 62.5428 191.639 64.691C197.654 61.0504 205.715 56.7767 215.631 53.0456C220.187 51.3271 226.417 49.2468 233.924 47.5169C242.155 45.6175 253.812 43.7181 268.057 43.8651V115.817C267.549 123.438 266.35 130.866 264.541 138.057C243.207 133.24 223.364 133.964 205.365 140.25C187.727 146.412 176.704 156.294 167.84 164.23C158.297 172.778 152.814 177.323 144.289 177.323C144.074 177.323 143.848 177.323 143.622 177.323C143.543 177.323 143.452 177.323 143.373 177.323C143.294 177.323 143.204 177.323 143.124 177.323C142.898 177.323 142.672 177.323 142.457 177.323C133.933 177.323 128.449 172.767 118.907 164.23C110.054 156.294 99.0192 146.423 81.3816 140.25C63.0317 133.851 42.7486 133.218 20.939 138.362C19.0848 131.081 17.8637 123.551 17.3436 115.829V43.8764C31.5893 43.7294 43.246 45.6401 51.4769 47.5283C58.9841 49.2581 65.2252 51.3384 69.7703 53.057C79.6971 56.788 87.747 61.0617 93.7619 64.7023C95.5143 62.5541 97.4138 59.9198 99.2341 56.7993C100.84 54.0293 102.083 51.4063 103.044 49.0659C88.2558 40.1227 72.2689 33.6217 55.4906 29.755C40.0803 26.1935 24.2517 24.9272 8.45698 25.9787L0 26.544V107.315C0 112.448 0.271372 117.525 0.802761 122.522C8.4231 194.067 69.1371 249.999 142.672 249.999C216.207 249.999 276.933 194.079 284.542 122.522C285.073 117.525 285.345 112.448 285.345 107.315V26.544L276.888 25.9787L276.944 25.9674ZM184.324 225.849C171.299 230.439 157.325 232.927 142.74 232.927C140.117 232.927 137.528 232.848 134.939 232.678C106.097 230.914 79.844 219.348 59.4816 201.281C53.8059 196.261 48.5938 190.721 43.9018 184.751C36.9937 175.955 31.2276 166.198 26.8295 155.74C44.5801 151.805 60.8836 152.382 75.4346 157.469C89.6351 162.421 98.3635 170.245 106.798 177.809C116.544 186.538 126.618 195.56 142.525 195.56C142.831 195.56 143.125 195.56 143.441 195.537C143.746 195.537 144.052 195.56 144.357 195.56C160.265 195.56 170.327 186.538 180.084 177.809C188.519 170.245 197.247 162.421 211.448 157.469C225.659 152.495 241.533 151.828 258.809 155.468C245.151 188.222 218.016 214.011 184.369 225.849H184.324Z" fill="#1B485F"/>
          <path d="M258.762 155.472C245.105 188.226 217.97 214.015 184.323 225.853C171.298 230.443 157.324 232.93 142.739 232.93C140.116 232.93 137.527 232.851 134.937 232.681C106.096 230.918 79.8427 219.351 59.4803 201.284C53.8046 196.264 48.5925 190.724 43.9004 184.755C36.9924 175.958 31.2262 166.201 26.8281 155.743C44.5788 151.808 60.8822 152.385 75.4332 157.473C89.6338 162.425 98.3622 170.249 106.797 177.813C116.542 186.541 126.616 195.563 142.524 195.563C142.829 195.563 143.123 195.563 143.44 195.541C143.745 195.541 144.05 195.563 144.356 195.563C160.263 195.563 170.326 186.541 180.083 177.813C188.517 170.249 197.246 162.425 211.446 157.473C225.658 152.498 241.532 151.831 258.808 155.472H258.762Z" fill="#44AABF"/>
          <path d="M112.785 98.7706C115.736 103.791 118.653 109.297 121.389 115.255C121.468 115.436 121.558 115.628 121.649 115.809C131.123 136.669 135.001 155.607 136.686 169.197H139.942V90.1892C133.113 88.889 127.946 82.8742 127.946 75.6721C127.946 67.5091 134.572 60.8837 142.735 60.8837C150.898 60.8837 157.523 67.5091 157.523 75.6721C157.523 82.8742 152.356 88.889 145.527 90.1892V169.197H148.784C150.457 155.607 154.346 136.669 163.832 115.809C163.9 115.628 164.002 115.436 164.081 115.255C166.817 109.285 169.723 103.791 172.673 98.7706C178.134 89.4996 183.753 81.8114 188.762 75.6835C182.612 66.4576 175.681 54.3939 169.745 39.5942C163.742 24.6361 160.406 11.0122 158.496 0H126.985C125.063 11.0122 121.728 24.6361 115.736 39.5942C109.8 54.3939 102.881 66.4576 96.7188 75.6835C101.727 81.8114 107.347 89.4996 112.796 98.7706H112.785Z" fill="#1B485F"/>
          <path d="M828.402 180.254L811.608 208.39V224.119H799.2V208.202L782.469 180.254H795.566L805.968 197.675L816.371 180.254H828.402Y" fill="#1B485F"/>
          <path d="M754.267 224.119H742.862L742.737 200.871L731.457 219.796H725.943L714.726 201.497V224.119H703.258V180.254H713.472L728.888 205.571L743.927 180.254H754.142L754.267 224.119Z" fill="#1B485F"/>
          <path d="M648.368 214.532H671.304V224.119H636.086V180.254H670.489V189.842H648.368V197.236H667.857V206.511H648.368V214.532Z" fill="#1B485F"/>
          <path d="M559.25 224.119V180.254H579.992C594.53 180.254 604.494 188.714 604.494 202.187C604.494 215.66 594.53 224.119 579.992 224.119H559.25ZM571.658 214.218H579.491C586.948 214.218 591.961 209.769 591.961 202.187C591.961 194.604 586.948 190.155 579.491 190.155H571.658V214.218Z" fill="#1B485F"/>
          <path d="M517.757 224.119L514.31 215.597H495.761L492.315 224.119H479.656L499.02 180.254H511.239L530.666 224.119H517.757ZM499.396 206.448H510.675L505.036 192.411L499.396 206.448Z" fill="#1B485F"/>
          <path d="M436.196 224.999C422.285 224.999 412.07 215.537 412.07 202.189C412.07 188.841 422.285 179.379 436.196 179.379C444.28 179.379 450.797 182.324 455.059 187.651L447.163 194.795C444.405 191.473 441.022 189.656 436.823 189.656C429.617 189.656 424.603 194.669 424.603 202.189C424.603 209.709 429.617 214.722 436.823 214.722C441.022 214.722 444.405 212.905 447.163 209.583L455.059 216.727C450.797 222.054 444.28 224.999 436.196 224.999Z" fill="#1B485F"/>
          <path d="M373.444 224.119L369.997 215.597H351.449L348.002 224.119H335.344L354.707 180.254H366.927L386.353 224.119H373.444ZM355.083 206.448H366.363L360.723 192.411L355.083 206.448Z" fill="#1B485F"/>
          <path d="M780.352 149.077C761.568 149.077 742.784 143.218 732.789 134.601L740.544 117.196C750.194 124.951 765.532 130.465 780.352 130.465C799.136 130.465 807.063 123.744 807.063 114.783C807.063 88.7616 735.374 105.822 735.374 61.0167C735.374 41.5436 750.884 25 783.971 25C798.446 25 813.611 28.7912 824.123 35.6844L817.058 53.0896C806.201 46.7134 794.31 43.6115 783.798 43.6115C765.187 43.6115 757.604 50.8493 757.604 59.9827C757.604 85.6597 829.121 68.9438 829.121 113.232C829.121 132.533 813.439 149.077 780.352 149.077Z" fill="#1B485F"/>
          <path d="M687.93 147.357V26.7266H710.332V147.357H687.93Z" fill="#1B485F"/>
          <path d="M608.738 147.357V45.6827H568.758V26.7266H671.121V45.6827H631.141V147.357H608.738Z" fill="#1B485F"/>
          <path d="M562.959 147.357H538.833L514.19 112.029C512.639 112.202 511.088 112.202 509.537 112.202H482.309V147.357H459.906V26.7266H509.537C541.245 26.7266 560.891 42.9255 560.891 69.6364C560.891 87.9033 551.585 101.345 535.214 107.721L562.959 147.357ZM538.316 69.6364C538.316 54.4715 528.148 45.6827 508.503 45.6827H482.309V93.7625H508.503C528.148 93.7625 538.316 84.8014 538.316 69.6364Z" fill="#1B485F"/>
          <path d="M366.856 128.573H434.926V147.357H344.453V26.7266H432.513V45.5104H366.856V76.8742H425.103V95.3134H366.856V128.573Z" fill="#1B485F"/>
        </svg>
      </span> | ${type === 'test' ? 'ertis.academy' : documentTitle}
    </div>
  </div>
  <script>
    document.addEventListener("DOMContentLoaded", function() {
      if (typeof renderMathInElement !== 'undefined') {
        renderMathInElement(document.body, {
          delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false},
            {left: '\\\\(', right: '\\\\)', display: false},
            {left: '\\\\[', right: '\\\\]', display: true}
          ],
          throwOnError: false
        });
      }
    });
  </script>
</body>
</html>
  `;
}

// Answer sheet - exact replica of original design with SVG logo
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateBlankHtml(test: any, tasks: any[], lang: string, tr: any): string {
  // QR код ведёт на сайт ertis.academy
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent('https://ertis.academy')}`;

  const optionLetters = ['A', 'B', 'C', 'D', 'E'];
  const actualQuestions = tasks.length; // Реальное количество вопросов для подсчёта баллов

  // Бланк ВСЕГДА на 60 вопросов (независимо от количества в тесте)
  // НЕ МЕНЯТЬ! Позиции пузырьков калиброваны для 60 вопросов
  const col1Count = 30;
  const col2Count = 30;

  const getTitle = () => {
    if (lang === 'kz' && test.titleKz) return test.titleKz;
    if (lang === 'en' && test.titleEn) return test.titleEn;
    return test.title;
  };

  // SVG logo inline - ERTIS Academy brand colors: #1B485F (dark blue), #44AABF (teal accent)
  const logoSvg = `<svg width="140" height="42" viewBox="0 0 830 250" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M276.944 25.9674C261.149 24.9159 245.321 26.1822 229.91 29.7437C213.143 33.6104 197.145 40.1001 182.368 49.0546C183.329 51.395 184.562 54.018 186.178 56.788C187.999 59.9085 189.887 62.5428 191.639 64.691C197.654 61.0504 205.715 56.7767 215.631 53.0456C220.187 51.3271 226.417 49.2468 233.924 47.5169C242.155 45.6175 253.812 43.7181 268.057 43.8651V115.817C267.549 123.438 266.35 130.866 264.541 138.057C243.207 133.24 223.364 133.964 205.365 140.25C187.727 146.412 176.704 156.294 167.84 164.23C158.297 172.778 152.814 177.323 144.289 177.323C144.074 177.323 143.848 177.323 143.622 177.323C143.543 177.323 143.452 177.323 143.373 177.323C143.294 177.323 143.204 177.323 143.124 177.323C142.898 177.323 142.672 177.323 142.457 177.323C133.933 177.323 128.449 172.767 118.907 164.23C110.054 156.294 99.0192 146.423 81.3816 140.25C63.0317 133.851 42.7486 133.218 20.939 138.362C19.0848 131.081 17.8637 123.551 17.3436 115.829V43.8764C31.5893 43.7294 43.246 45.6401 51.4769 47.5283C58.9841 49.2581 65.2252 51.3384 69.7703 53.057C79.6971 56.788 87.747 61.0617 93.7619 64.7023C95.5143 62.5541 97.4138 59.9198 99.2341 56.7993C100.84 54.0293 102.083 51.4063 103.044 49.0659C88.2558 40.1227 72.2689 33.6217 55.4906 29.755C40.0803 26.1935 24.2517 24.9272 8.45698 25.9787L0 26.544V107.315C0 112.448 0.271372 117.525 0.802761 122.522C8.4231 194.067 69.1371 249.999 142.672 249.999C216.207 249.999 276.933 194.079 284.542 122.522C285.073 117.525 285.345 112.448 285.345 107.315V26.544L276.888 25.9787L276.944 25.9674ZM184.324 225.849C171.299 230.439 157.325 232.927 142.74 232.927C140.117 232.927 137.528 232.848 134.939 232.678C106.097 230.914 79.844 219.348 59.4816 201.281C53.8059 196.261 48.5938 190.721 43.9018 184.751C36.9937 175.955 31.2276 166.198 26.8295 155.74C44.5801 151.805 60.8836 152.382 75.4346 157.469C89.6351 162.421 98.3635 170.245 106.798 177.809C116.544 186.538 126.618 195.56 142.525 195.56C142.831 195.56 143.125 195.56 143.441 195.537C143.746 195.537 144.052 195.56 144.357 195.56C160.265 195.56 170.327 186.538 180.084 177.809C188.519 170.245 197.247 162.421 211.448 157.469C225.659 152.495 241.533 151.828 258.809 155.468C245.151 188.222 218.016 214.011 184.369 225.849H184.324Z" fill="#1B485F"/>
<path d="M258.762 155.472C245.105 188.226 217.97 214.015 184.323 225.853C171.298 230.443 157.324 232.93 142.739 232.93C140.116 232.93 137.527 232.851 134.937 232.681C106.096 230.918 79.8427 219.351 59.4803 201.284C53.8046 196.264 48.5925 190.724 43.9004 184.755C36.9924 175.958 31.2262 166.201 26.8281 155.743C44.5788 151.808 60.8822 152.385 75.4332 157.473C89.6338 162.425 98.3622 170.249 106.797 177.813C116.542 186.541 126.616 195.563 142.524 195.563C142.829 195.563 143.123 195.563 143.44 195.541C143.745 195.541 144.05 195.563 144.356 195.563C160.263 195.563 170.326 186.541 180.083 177.813C188.517 170.249 197.246 162.425 211.446 157.473C225.658 152.498 241.532 151.831 258.808 155.472H258.762Z" fill="#44AABF"/>
<path d="M112.785 98.7706C115.736 103.791 118.653 109.297 121.389 115.255C121.468 115.436 121.558 115.628 121.649 115.809C131.123 136.669 135.001 155.607 136.686 169.197H139.942V90.1892C133.113 88.889 127.946 82.8742 127.946 75.6721C127.946 67.5091 134.572 60.8837 142.735 60.8837C150.898 60.8837 157.523 67.5091 157.523 75.6721C157.523 82.8742 152.356 88.889 145.527 90.1892V169.197H148.784C150.457 155.607 154.346 136.669 163.832 115.809C163.9 115.628 164.002 115.436 164.081 115.255C166.817 109.285 169.723 103.791 172.673 98.7706C178.134 89.4996 183.753 81.8114 188.762 75.6835C182.612 66.4576 175.681 54.3939 169.745 39.5942C163.742 24.6361 160.406 11.0122 158.496 0H126.985C125.063 11.0122 121.728 24.6361 115.736 39.5942C109.8 54.3939 102.881 66.4576 96.7188 75.6835C101.727 81.8114 107.347 89.4996 112.796 98.7706H112.785Z" fill="#1B485F"/>
<path d="M828.402 180.254L811.608 208.39V224.119H799.2V208.202L782.469 180.254H795.566L805.968 197.675L816.371 180.254H828.402Z" fill="#1B485F"/>
<path d="M754.267 224.119H742.862L742.737 200.871L731.457 219.796H725.943L714.726 201.497V224.119H703.258V180.254H713.472L728.888 205.571L743.927 180.254H754.142L754.267 224.119Z" fill="#1B485F"/>
<path d="M648.368 214.532H671.304V224.119H636.086V180.254H670.489V189.842H648.368V197.236H667.857V206.511H648.368V214.532Z" fill="#1B485F"/>
<path d="M559.25 224.119V180.254H579.992C594.53 180.254 604.494 188.714 604.494 202.187C604.494 215.66 594.53 224.119 579.992 224.119H559.25ZM571.658 214.218H579.491C586.948 214.218 591.961 209.769 591.961 202.187C591.961 194.604 586.948 190.155 579.491 190.155H571.658V214.218Z" fill="#1B485F"/>
<path d="M517.757 224.119L514.31 215.597H495.761L492.315 224.119H479.656L499.02 180.254H511.239L530.666 224.119H517.757ZM499.396 206.448H510.675L505.036 192.411L499.396 206.448Z" fill="#1B485F"/>
<path d="M436.196 224.999C422.285 224.999 412.07 215.537 412.07 202.189C412.07 188.841 422.285 179.379 436.196 179.379C444.28 179.379 450.797 182.324 455.059 187.651L447.163 194.795C444.405 191.473 441.022 189.656 436.823 189.656C429.617 189.656 424.603 194.669 424.603 202.189C424.603 209.709 429.617 214.722 436.823 214.722C441.022 214.722 444.405 212.905 447.163 209.583L455.059 216.727C450.797 222.054 444.28 224.999 436.196 224.999Z" fill="#1B485F"/>
<path d="M373.444 224.119L369.997 215.597H351.449L348.002 224.119H335.344L354.707 180.254H366.927L386.353 224.119H373.444ZM355.083 206.448H366.363L360.723 192.411L355.083 206.448Z" fill="#1B485F"/>
<path d="M780.352 149.077C761.568 149.077 742.784 143.218 732.789 134.601L740.544 117.196C750.194 124.951 765.532 130.465 780.352 130.465C799.136 130.465 807.063 123.744 807.063 114.783C807.063 88.7616 735.374 105.822 735.374 61.0167C735.374 41.5436 750.884 25 783.971 25C798.446 25 813.611 28.7912 824.123 35.6844L817.058 53.0896C806.201 46.7134 794.31 43.6115 783.798 43.6115C765.187 43.6115 757.604 50.8493 757.604 59.9827C757.604 85.6597 829.121 68.9438 829.121 113.232C829.121 132.533 813.439 149.077 780.352 149.077Z" fill="#1B485F"/>
<path d="M687.93 147.357V26.7266H710.332V147.357H687.93Z" fill="#1B485F"/>
<path d="M608.738 147.357V45.6827H568.758V26.7266H671.121V45.6827H631.141V147.357H608.738Z" fill="#1B485F"/>
<path d="M562.959 147.357H538.833L514.19 112.029C512.639 112.202 511.088 112.202 509.537 112.202H482.309V147.357H459.906V26.7266H509.537C541.245 26.7266 560.891 42.9255 560.891 69.6364C560.891 87.9033 551.585 101.345 535.214 107.721L562.959 147.357ZM538.316 69.6364C538.316 54.4715 528.148 45.6827 508.503 45.6827H482.309V93.7625H508.503C528.148 93.7625 538.316 84.8014 538.316 69.6364Z" fill="#1B485F"/>
<path d="M366.856 128.573H434.926V147.357H344.453V26.7266H432.513V45.5104H366.856V76.8742H425.103V95.3134H366.856V128.573Z" fill="#1B485F"/>
</svg>`;

  // Generate rows
  const generateRows = () => {
    const rows = [];
    for (let i = 0; i < col1Count; i++) {
      const num1 = i + 1;
      const num2 = 31 + i;
      const hasNum2 = i < col2Count;

      rows.push(`
        <tr>
          <td class="num">${num1}</td>
          ${optionLetters.map(() => `<td class="cell"><div class="bubble"></div></td>`).join('')}
          <td class="gap"></td>
          ${hasNum2 ? `
            <td class="num">${num2}</td>
            ${optionLetters.map(() => `<td class="cell"><div class="bubble"></div></td>`).join('')}
          ` : `<td class="empty"></td><td class="empty" colspan="5"></td>`}
        </tr>
      `);
    }
    return rows.join('');
  };

  return `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <title>${getTitle()} - ${tr.answerSheet}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }

    html, body {
      width: 210mm;
      height: 297mm;
      font-family: Arial, sans-serif;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Corner markers */
    .marker {
      position: fixed;
      width: 8mm;
      height: 8mm;
      background: #000;
    }
    .m-tl { top: 5mm; left: 5mm; }
    .m-tr { top: 5mm; right: 5mm; }
    .m-bl { bottom: 5mm; left: 5mm; }
    .m-br { bottom: 5mm; right: 5mm; }

    /* Content */
    .content {
      position: absolute;
      top: 16mm;
      left: 18mm;
      right: 18mm;
      bottom: 16mm;
    }

    /* Header */
    .top-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2mm;
    }
    .logo svg { height: 7mm; width: auto; }
    .site { font-size: 9pt; color: #286786; font-weight: 500; }

    /* Form box */
    .form-box {
      border: 1.5px solid #286786;
      padding: 2mm 3mm;
      margin-bottom: 1mm;
      display: flex;
      align-items: center;
    }
    .form-fields {
      flex: 1;
      display: flex;
      align-items: flex-end;
      gap: 6mm;
    }
    .field {
      display: flex;
      align-items: flex-end;
      gap: 1.5mm;
    }
    .field.grow { flex: 1; }
    .field label {
      font-weight: bold;
      font-size: 9pt;
      color: #5D5D5D;
    }
    .field .line {
      flex: 1;
      min-width: 18mm;
      border-bottom: 1px solid #000;
      height: 5mm;
    }
    .qr {
      width: 15mm;
      height: 15mm;
      margin-left: 3mm;
    }

    /* Grid - compact with brand colors */
    /* FIXED column widths for precise overlay alignment:
     * Content width: 174mm, Gap: 5mm, Each half: 84.5mm
     * Num column: 7mm, Each cell: (84.5-7)/5 = 15.5mm
     */
    .grid {
      border-collapse: collapse;
      width: 100%;
      table-layout: fixed;
    }
    .grid th {
      background: #286786;
      color: #fff;
      font-size: 9pt;
      font-weight: bold;
      padding: 1mm;
      border: 1px solid #1d5066;
      text-align: center;
    }
    .grid th.num {
      width: 7mm;
    }
    .grid th.cell {
      width: 15.5mm;
    }
    .grid th.gap {
      background: transparent;
      border: none;
      width: 5mm;
    }
    .grid td.num {
      width: 7mm;
      font-size: 8pt;
      font-weight: bold;
      text-align: center;
      background: #f0f7f9;
      color: #286786;
      border: 1px solid #ccc;
      padding: 0.5mm;
    }
    .grid td.cell {
      width: 15.5mm;
      text-align: center;
      vertical-align: middle;
      padding: 0.5mm;
      border: 1px solid #ddd;
    }
    .grid td.gap {
      border: none;
      width: 5mm;
    }
    .grid td.empty {
      border: none;
    }
    .grid tr {
      height: 7mm;
    }

    .bubble {
      width: 5.5mm;
      height: 5.5mm;
      border: 1.2px solid #333;
      border-radius: 50%;
      margin: 0 auto;
    }

    /* Footer */
    .footer {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 2mm;
      border-top: 1px solid #ddd;
    }
    .footer-left { font-size: 8pt; color: #666; }
    .footer-score {
      font-size: 9pt;
      font-weight: bold;
      padding: 1.5mm 3mm;
      border: 2px solid #286786;
      color: #286786;
    }

    @media print {
      .marker, .bubble, .grid th, .grid td.num {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <!-- Corner markers -->
  <div class="marker m-tl"></div>
  <div class="marker m-tr"></div>
  <div class="marker m-bl"></div>
  <div class="marker m-br"></div>

  <div class="content">
    <!-- Header -->
    <div class="top-header">
      <div class="logo">${logoSvg}</div>
      <div class="site">ertis.academy</div>
    </div>

    <!-- Form -->
    <div class="form-box">
      <div class="form-fields">
        <div class="field grow">
          <label>${tr.name}:</label>
          <div class="line"></div>
        </div>
        <div class="field">
          <label>${tr.grade}:</label>
          <div class="line" style="min-width: 25mm"></div>
        </div>
        <div class="field">
          <label style="font-weight: 600; color: #286786;">${getTitle()}</label>
        </div>
      </div>
      <img src="${qrCodeUrl}" class="qr" alt="QR" />
    </div>

    <!-- Grid -->
    <table class="grid">
      <thead>
        <tr>
          <th class="num">№</th>
          ${optionLetters.map(l => `<th class="cell">${l}</th>`).join('')}
          <th class="gap"></th>
          <th class="num">№</th>
          ${optionLetters.map(l => `<th class="cell">${l}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${generateRows()}
      </tbody>
    </table>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-left">ertis.academy | ${tr.answerSheet}</div>
      <div class="footer-score">${tr.score}: _______ / ${actualQuestions}</div>
    </div>
  </div>
</body>
</html>
  `;
}
