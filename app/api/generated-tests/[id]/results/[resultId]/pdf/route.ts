import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import puppeteer, { Browser } from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

// Function to get browser instance
async function getBrowser(): Promise<Browser> {
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    // Local development - use installed Chrome/Chromium
    const possiblePaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
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
    // Production (serverless) - use @sparticuz/chromium
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; resultId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, resultId } = await params;
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'ru';

    // Get the test with tasks
    const test = await prisma.generatedTest.findUnique({
      where: { id },
      include: {
        subject: true,
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Check access
    if (test.createdById !== session.user.id) {
      const hasAccess = await prisma.generatedTestShare.findFirst({
        where: {
          generatedTestId: id,
          sharedWithId: session.user.id,
        },
      });
      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Get the specific result
    const result = await prisma.blankResult.findUnique({
      where: { id: resultId },
    });

    if (!result || result.generatedTestId !== id) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 });
    }

    // Get all tasks for the test
    const taskIds = (test.taskIds || []) as string[];
    const tasks = await prisma.task.findMany({
      where: { id: { in: taskIds } },
      include: {
        subtopics: {
          include: {
            subtopic: {
              include: {
                topic: true,
              },
            },
          },
        },
      },
    });

    // Sort tasks by order in test
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const orderedTasks = taskIds
      .map((tid: string) => taskMap.get(tid))
      .filter((t): t is NonNullable<typeof t> => t !== undefined);

    // Generate PDF
    const html = generateResultPdfHtml(test, result, orderedTasks, lang);

    const browser = await getBrowser();

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
    });

    await browser.close();

    const studentName = result.studentName || 'Ученик';
    const fileName = `${studentName}_${test.title}_результат.pdf`;

    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (error) {
    console.error('Error generating result PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateResultPdfHtml(test: any, result: any, tasks: any[], lang: string): string {
  const tr = {
    ru: {
      diagnostics: 'Диагностика знаний',
      grade: 'Класс',
      totalScore: 'Общий балл',
      questionsBreakdown: 'Разбор вопросов',
      topicsBreakdown: 'Разбор по темам',
      correct: 'Правильные',
      incorrect: 'Неправильные',
      skipped: 'Не отмечено',
      questionTopic: 'Тема вопроса',
      status: 'Статус',
      student: 'Ученик',
      answer: 'Ответ',
    },
    kz: {
      diagnostics: 'Білім диагностикасы',
      grade: 'Сынып',
      totalScore: 'Жалпы балл',
      questionsBreakdown: 'Сұрақтарды талдау',
      topicsBreakdown: 'Тақырыптар бойынша талдау',
      correct: 'Дұрыс',
      incorrect: 'Қате',
      skipped: 'Белгіленбеген',
      questionTopic: 'Сұрақ тақырыбы',
      status: 'Мәртебе',
      student: 'Оқушы',
      answer: 'Жауап',
    },
  };

  const t = tr[lang as keyof typeof tr] || tr.ru;
  const answers = result.answers as (number | null)[];
  const optionLetters = ['A', 'B', 'C', 'D', 'E'];

  // Calculate stats
  let correctCount = 0;
  let incorrectCount = 0;
  let skippedCount = 0;

  const questionResults = tasks.map((task, idx) => {
    const studentAnswer = answers[idx];
    const correctAnswer = task.correctAnswer;
    const isCorrect = studentAnswer === correctAnswer;
    const isSkipped = studentAnswer === null || studentAnswer === undefined;

    if (isSkipped) {
      skippedCount++;
    } else if (isCorrect) {
      correctCount++;
    } else {
      incorrectCount++;
    }

    // Собираем все уникальные родительские темы
    const uniqueTopics = new Map<string, { name?: string; nameKz?: string | null; nameRu?: string | null }>();
    if (task.subtopics) {
      task.subtopics.forEach((link: { subtopic?: { topic?: { id: string; name?: string; nameKz?: string | null; nameRu?: string | null } | null } | null }) => {
        const topic = link.subtopic?.topic;
        if (topic && !uniqueTopics.has(topic.id)) {
          uniqueTopics.set(topic.id, topic);
        }
      });
    }

    const topicNames = Array.from(uniqueTopics.values()).map(tp =>
      lang === 'kz' && tp?.nameKz ? tp.nameKz : tp?.nameRu || tp?.name || ''
    ).filter(Boolean);
    const topicDisplay = topicNames.length > 0 ? topicNames.join(', ') : '-';

    return {
      number: idx + 1,
      topic: topicDisplay,
      isCorrect,
      isSkipped,
      studentAnswer: studentAnswer !== null && studentAnswer !== undefined ? optionLetters[studentAnswer] : '-',
      correctAnswer: correctAnswer != null ? optionLetters[correctAnswer] : '-',
    };
  });

  // Group by topics for topic breakdown
  const topicStats: Record<string, { name: string; correct: number; incorrect: number; skipped: number; total: number }> = {};

  questionResults.forEach((qr, idx) => {
    const task = tasks[idx];
    const uniqueTopics = new Map<string, { name?: string; nameKz?: string | null; nameRu?: string | null }>();
    if (task.subtopics) {
      task.subtopics.forEach((link: { subtopic?: { topic?: { id: string; name?: string; nameKz?: string | null; nameRu?: string | null } | null } | null }) => {
        const topic = link.subtopic?.topic;
        if (topic && !uniqueTopics.has(topic.id)) {
          uniqueTopics.set(topic.id, topic);
        }
      });
    }

    if (uniqueTopics.size === 0) {
      const noTopic = lang === 'kz' ? 'Тақырыпсыз' : 'Без темы';
      uniqueTopics.set('no-topic', { name: noTopic, nameRu: noTopic, nameKz: noTopic });
    }

    uniqueTopics.forEach((topic) => {
      const topicName = lang === 'kz' && topic?.nameKz ? topic.nameKz : topic?.nameRu || topic?.name || '-';

      if (!topicStats[topicName]) {
        topicStats[topicName] = { name: topicName, correct: 0, incorrect: 0, skipped: 0, total: 0 };
      }

      topicStats[topicName].total++;
      if (qr.isSkipped) {
        topicStats[topicName].skipped++;
      } else if (qr.isCorrect) {
        topicStats[topicName].correct++;
      } else {
        topicStats[topicName].incorrect++;
      }
    });
  });

  const topicStatsList = Object.values(topicStats);
  const percentage = Math.round(result.percentage);

  const testTitle = lang === 'kz' && test.titleKz ? test.titleKz : test.title;
  const subjectName = lang === 'kz' && test.subject?.nameKz ? test.subject.nameKz : test.subject?.nameRu || test.subject?.nameKz || '';

  // Progress bar color
  const progressColor = percentage >= 70 ? '#22c55e' : percentage >= 40 ? '#f97316' : '#ef4444';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { margin: 12mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px;
      color: #1f2937;
      line-height: 1.5;
      background: #fff;
    }

    /* Header */
    .header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding-bottom: 20px;
      margin-bottom: 24px;
      border-bottom: 1px solid #e5e7eb;
    }
    .header svg { height: 42px; width: auto; }
    .header-text { flex: 1; }
    .header-title { font-size: 20px; font-weight: 700; color: #111827; }
    .header-sub { font-size: 13px; color: #6b7280; margin-top: 2px; }

    /* Card */
    .card {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 20px;
      page-break-inside: avoid;
    }

    /* Student Section */
    .student-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .student-left { display: flex; gap: 14px; align-items: center; }
    .student-avatar {
      width: 48px; height: 48px;
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
    }
    .student-avatar svg { width: 24px; height: 24px; color: white; }
    .student-name { font-size: 18px; font-weight: 600; color: #111827; }
    .student-meta { font-size: 13px; color: #6b7280; margin-top: 2px; }
    .student-right { text-align: right; }
    .test-title { font-size: 14px; font-weight: 500; color: #374151; }
    .coordinator {
      display: inline-block;
      margin-top: 6px;
      color: #3b82f6;
      font-size: 13px;
      font-weight: 500;
    }

    /* Score Section */
    .score-section {
      background: #f9fafb;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      gap: 24px;
      align-items: center;
    }
    .score-circle {
      width: 80px; height: 80px;
      border-radius: 50%;
      background: ${percentage >= 70 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : percentage >= 40 ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'};
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .score-num { font-size: 22px; font-weight: 700; color: white; }
    .score-info { flex: 1; }
    .score-label { font-size: 12px; color: #6b7280; font-weight: 500; }
    .score-value { font-size: 28px; font-weight: 700; color: #111827; margin: 4px 0 12px; }
    .score-bar { height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
    .score-fill { height: 100%; background: ${progressColor}; border-radius: 4px; }
    .score-stats { display: flex; gap: 20px; margin-top: 12px; font-size: 13px; color: #4b5563; }
    .stat { display: flex; align-items: center; gap: 6px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; }
    .dot.g { background: #10b981; } .dot.r { background: #ef4444; } .dot.s { background: #9ca3af; }

    /* Services */
    .services-title { font-size: 15px; font-weight: 600; color: #111827; margin-bottom: 14px; }
    .services-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .srv {
      background: #f9fafb;
      border-radius: 10px;
      padding: 14px 10px;
      text-align: center;
    }
    .srv-icon {
      width: 36px; height: 36px;
      margin: 0 auto 8px;
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
    }
    .srv-icon svg { width: 18px; height: 18px; color: white; }
    .srv-name { font-size: 11px; font-weight: 600; color: #111827; }
    .srv-desc { font-size: 10px; color: #6b7280; margin-top: 2px; }
    .cta {
      margin-top: 12px;
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: white;
      padding: 12px;
      border-radius: 10px;
      text-align: center;
      font-size: 12px;
    }
    .cta b { font-weight: 600; }

    /* Recs */
    .recs { background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; overflow: hidden; margin-bottom: 20px; }
    .recs-head { padding: 12px 16px; font-weight: 600; color: #92400e; font-size: 13px; border-bottom: 1px solid #fde68a; }
    .recs-body { padding: 12px 16px; min-height: 60px; }
    .recs-line { border-bottom: 1px dashed #fcd34d; height: 20px; }

    /* Table */
    .section-title {
      color: #111827;
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 14px;
    }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { text-align: left; padding: 10px 12px; background: #f9fafb; color: #6b7280; font-weight: 500; font-size: 11px; }
    th:first-child { border-radius: 8px 0 0 8px; }
    th:last-child { border-radius: 0 8px 8px 0; }
    td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; }
    tr { page-break-inside: avoid; }
    .num { width: 40px; color: #9ca3af; font-weight: 600; }
    .badge {
      display: inline-flex; align-items: center; justify-content: center;
      width: 24px; height: 24px; border-radius: 6px; font-weight: 600; font-size: 11px;
    }
    .badge.ok { background: #d1fae5; color: #059669; }
    .badge.no { background: #fee2e2; color: #dc2626; }
    .badge.skip { background: #f3f4f6; color: #9ca3af; }
    .ans {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 26px; height: 26px; border-radius: 6px; font-weight: 600; font-size: 12px;
    }
    .ans.ok { background: #d1fae5; color: #059669; }
    .ans.no { background: #fee2e2; color: #dc2626; }
    .ans.def { background: #f3f4f6; color: #6b7280; }

    /* Topics */
    .topic {
      background: #f9fafb;
      border-radius: 12px;
      padding: 14px 18px;
      margin-bottom: 10px;
      page-break-inside: avoid;
    }
    .topic-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .topic-name { font-size: 13px; font-weight: 500; color: #111827; }
    .topic-pct { font-size: 13px; font-weight: 600; padding: 4px 10px; border-radius: 6px; }
    .topic-pct.g { background: #d1fae5; color: #059669; }
    .topic-pct.o { background: #fef3c7; color: #d97706; }
    .topic-pct.r { background: #fee2e2; color: #dc2626; }
    .topic-bar { height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; margin-bottom: 8px; }
    .topic-fill { height: 100%; border-radius: 3px; }
    .topic-fill.g { background: #10b981; }
    .topic-fill.o { background: #f59e0b; }
    .topic-fill.r { background: #ef4444; }
    .topic-stats { font-size: 11px; color: #6b7280; display: flex; gap: 14px; }

    /* Footer */
    .footer {
      text-align: center;
      padding: 16px;
      margin-top: 20px;
      color: #6b7280;
      font-size: 12px;
    }
    .footer b { color: #3b82f6; font-weight: 600; }

    .page-break { page-break-before: always; padding-top: 16px; }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <svg viewBox="0 0 285 250" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M276.944 25.9674C261.149 24.9159 245.321 26.1822 229.91 29.7437C213.143 33.6104 197.145 40.1001 182.368 49.0546C183.329 51.395 184.562 54.018 186.178 56.788C187.999 59.9085 189.887 62.5428 191.639 64.691C197.654 61.0504 205.715 56.7767 215.631 53.0456C220.187 51.3271 226.417 49.2468 233.924 47.5169C242.155 45.6175 253.812 43.7181 268.057 43.8651V115.817C267.549 123.438 266.35 130.866 264.541 138.057C243.207 133.24 223.364 133.964 205.365 140.25C187.727 146.412 176.704 156.294 167.84 164.23C158.297 172.778 152.814 177.323 144.289 177.323C144.074 177.323 143.848 177.323 143.622 177.323C143.543 177.323 143.452 177.323 143.373 177.323C143.294 177.323 143.204 177.323 143.124 177.323C142.898 177.323 142.672 177.323 142.457 177.323C133.933 177.323 128.449 172.767 118.907 164.23C110.054 156.294 99.0192 146.423 81.3816 140.25C63.0317 133.851 42.7486 133.218 20.939 138.362C19.0848 131.081 17.8637 123.551 17.3436 115.829V43.8764C31.5893 43.7294 43.246 45.6401 51.4769 47.5283C58.9841 49.2581 65.2252 51.3384 69.7703 53.057C79.6971 56.788 87.747 61.0617 93.7619 64.7023C95.5143 62.5541 97.4138 59.9198 99.2341 56.7993C100.84 54.0293 102.083 51.4063 103.044 49.0659C88.2558 40.1227 72.2689 33.6217 55.4906 29.755C40.0803 26.1935 24.2517 24.9272 8.45698 25.9787L0 26.544V107.315C0 112.448 0.271372 117.525 0.802761 122.522C8.4231 194.067 69.1371 249.999 142.672 249.999C216.207 249.999 276.933 194.079 284.542 122.522C285.073 117.525 285.345 112.448 285.345 107.315V26.544L276.888 25.9787L276.944 25.9674ZM184.324 225.849C171.299 230.439 157.325 232.927 142.74 232.927C140.117 232.927 137.528 232.848 134.939 232.678C106.097 230.914 79.844 219.348 59.4816 201.281C53.8059 196.261 48.5938 190.721 43.9018 184.751C36.9937 175.955 31.2276 166.198 26.8295 155.74C44.5801 151.805 60.8836 152.382 75.4346 157.469C89.6351 162.421 98.3635 170.245 106.798 177.809C116.544 186.538 126.618 195.56 142.525 195.56C142.831 195.56 143.125 195.56 143.441 195.537C143.746 195.537 144.052 195.56 144.357 195.56C160.265 195.56 170.327 186.538 180.084 177.809C188.519 170.245 197.247 162.421 211.448 157.469C225.659 152.495 241.533 151.828 258.809 155.468C245.151 188.222 218.016 214.011 184.369 225.849H184.324Z" fill="#1d4ed8"/>
      <path d="M258.762 155.472C245.105 188.226 217.97 214.015 184.323 225.853C171.298 230.443 157.324 232.93 142.739 232.93C140.116 232.93 137.527 232.851 134.937 232.681C106.096 230.918 79.8427 219.351 59.4803 201.284C53.8046 196.264 48.5925 190.724 43.9004 184.755C36.9924 175.958 31.2262 166.201 26.8281 155.743C44.5788 151.808 60.8822 152.385 75.4332 157.473C89.6338 162.425 98.3622 170.249 106.797 177.813C116.542 186.541 126.616 195.563 142.524 195.563C142.829 195.563 143.123 195.563 143.44 195.541C143.745 195.541 144.05 195.563 144.356 195.563C160.263 195.563 170.326 186.541 180.083 177.813C188.517 170.249 197.246 162.425 211.446 157.473C225.658 152.498 241.532 151.831 258.808 155.472H258.762Z" fill="#3b82f6"/>
      <path d="M112.785 98.7706C115.736 103.791 118.653 109.297 121.389 115.255C121.468 115.436 121.558 115.628 121.649 115.809C131.123 136.669 135.001 155.607 136.686 169.197H139.942V90.1892C133.113 88.889 127.946 82.8742 127.946 75.6721C127.946 67.5091 134.572 60.8837 142.735 60.8837C150.898 60.8837 157.523 67.5091 157.523 75.6721C157.523 82.8742 152.356 88.889 145.527 90.1892V169.197H148.784C150.457 155.607 154.346 136.669 163.832 115.809C163.9 115.628 164.002 115.436 164.081 115.255C166.817 109.285 169.723 103.791 172.673 98.7706C178.134 89.4996 183.753 81.8114 188.762 75.6835C182.612 66.4576 175.681 54.3939 169.745 39.5942C163.742 24.6361 160.406 11.0122 158.496 0H126.985C125.063 11.0122 121.728 24.6361 115.736 39.5942C109.8 54.3939 102.881 66.4576 96.7188 75.6835C101.727 81.8114 107.347 89.4996 112.796 98.7706H112.785Z" fill="#1d4ed8"/>
    </svg>
    <div class="header-text">
      <div class="header-title">Ertis Academy</div>
      <div class="header-sub">${t.diagnostics}</div>
    </div>
  </div>

  <!-- Main Card -->
  <div class="card">
    <div class="student-section">
      <div class="student-left">
        <div class="student-avatar">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
        </div>
        <div>
          <div class="student-name">${result.studentName || (lang === 'kz' ? 'Оқушы' : 'Ученик')}</div>
          <div class="student-meta">${t.grade}: ${result.studentClass || test.gradeLevel || '-'} • ${subjectName}</div>
        </div>
      </div>
      <div class="student-right">
        <div class="test-title">${testTitle}</div>
        <div class="coordinator">${test.createdBy?.firstName || ''} ${test.createdBy?.lastName || ''}</div>
      </div>
    </div>

    <div class="score-section">
      <div class="score-circle">
        <span class="score-num">${percentage}%</span>
      </div>
      <div class="score-info">
        <div class="score-label">${t.totalScore}</div>
        <div class="score-value">${correctCount} / ${tasks.length}</div>
        <div class="score-bar"><div class="score-fill" style="width: ${percentage}%"></div></div>
        <div class="score-stats">
          <span class="stat"><span class="dot g"></span> ${t.correct}: ${correctCount}</span>
          <span class="stat"><span class="dot r"></span> ${t.incorrect}: ${incorrectCount}</span>
          <span class="stat"><span class="dot s"></span> ${t.skipped}: ${skippedCount}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Services -->
  <div class="card">
    <div class="services-title">${lang === 'kz' ? 'Біздің қызметтер' : 'Наши услуги'}</div>
    <div class="services-grid">
      <div class="srv">
        <div class="srv-icon"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197"/></svg></div>
        <div class="srv-name">School Support</div>
        <div class="srv-desc">${lang === 'kz' ? 'Мектеппен байланыс' : 'Связь со школой'}</div>
      </div>
      <div class="srv">
        <div class="srv-icon"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg></div>
        <div class="srv-name">EdMap</div>
        <div class="srv-desc">${lang === 'kz' ? 'Оқу маршруты' : 'Учебный маршрут'}</div>
      </div>
      <div class="srv">
        <div class="srv-icon"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg></div>
        <div class="srv-name">Online Mentor</div>
        <div class="srv-desc">${lang === 'kz' ? 'Күнделікті көмек' : 'Ежедневная помощь'}</div>
      </div>
      <div class="srv">
        <div class="srv-icon"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
        <div class="srv-name">Ertis Drops</div>
        <div class="srv-desc">${lang === 'kz' ? 'Мотивация' : 'Мотивация'}</div>
      </div>
      <div class="srv">
        <div class="srv-icon"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
        <div class="srv-name">ESDT</div>
        <div class="srv-desc">${lang === 'kz' ? 'Диагностика' : 'Диагностика'}</div>
      </div>
      <div class="srv">
        <div class="srv-icon"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg></div>
        <div class="srv-name">${lang === 'kz' ? 'Кураторлық' : 'Кураторство'}</div>
        <div class="srv-desc">${lang === 'kz' ? 'Ата-аналармен' : 'С родителями'}</div>
      </div>
    </div>
    <div class="cta">${lang === 'kz' ? 'Көбірек:' : 'Подробнее:'} <b>ertis.academy</b> • +7 (707) 707-07-07</div>
  </div>

  <!-- Recs -->
  <div class="recs">
    <div class="recs-head">${lang === 'kz' ? 'Ұсыныстар' : 'Рекомендации'}</div>
    <div class="recs-body">
      <div class="recs-line"></div>
      <div class="recs-line"></div>
      <div class="recs-line"></div>
    </div>
  </div>

  <!-- Questions -->
  <div class="page-break"></div>
  <div class="section-title">${t.questionsBreakdown}: ${subjectName}</div>

  <table>
    <thead>
      <tr>
        <th>№</th>
        <th>${t.questionTopic}</th>
        <th>${t.status}</th>
        <th>${t.student}</th>
        <th>${t.answer}</th>
      </tr>
    </thead>
    <tbody>
      ${questionResults.map(qr => `
        <tr>
          <td class="num">${qr.number}</td>
          <td>${qr.topic}</td>
          <td><span class="badge ${qr.isSkipped ? 'skip' : qr.isCorrect ? 'ok' : 'no'}">${qr.isSkipped ? '−' : qr.isCorrect ? '✓' : '✗'}</span></td>
          <td><span class="ans ${qr.isSkipped ? 'def' : qr.isCorrect ? 'ok' : 'no'}">${qr.studentAnswer}</span></td>
          <td><span class="ans ok">${qr.correctAnswer}</span></td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- Topics -->
  <div class="page-break"></div>
  <div class="section-title">${t.topicsBreakdown}: ${subjectName}</div>

  ${topicStatsList.map((topic, idx) => {
    const pct = topic.total > 0 ? Math.round((topic.correct / topic.total) * 100) : 0;
    const cls = pct >= 70 ? 'g' : pct >= 40 ? 'o' : 'r';
    return `
      <div class="topic">
        <div class="topic-head">
          <span class="topic-name">${idx + 1}. ${topic.name}</span>
          <span class="topic-pct ${cls}">${pct}%</span>
        </div>
        <div class="topic-bar"><div class="topic-fill ${cls}" style="width: ${pct}%"></div></div>
        <div class="topic-stats">
          <span>${t.correct}: ${topic.correct}</span>
          <span>${t.incorrect}: ${topic.incorrect}</span>
          <span>${t.skipped}: ${topic.skipped}</span>
        </div>
      </div>
    `;
  }).join('')}

  <!-- Footer -->
  <div class="footer"><b>Ertis Academy</b> • ertis.academy</div>
</body>
</html>
  `;
}
