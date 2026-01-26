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
        subtopic: {
          include: {
            topic: {
              select: { name: true, nameKz: true },
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
      testLanguage: 'Язык тестирования',
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
      correctAnswer: 'Правильно',
      incorrectAnswer: 'Неправильно',
      notAnswered: 'Пропущено',
    },
    kz: {
      diagnostics: 'Білім диагностикасы',
      testLanguage: 'Тестілеу тілі',
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
      correctAnswer: 'Дұрыс',
      incorrectAnswer: 'Қате',
      notAnswered: 'Өткізілді',
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

    return {
      number: idx + 1,
      topic: lang === 'kz' && task.subtopic?.topic?.nameKz ? task.subtopic.topic.nameKz : task.subtopic?.topic?.name || '-',
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
    const topicName = lang === 'kz' && task.subtopic?.topic?.nameKz ? task.subtopic.topic.nameKz : task.subtopic?.topic?.name || 'Без темы';

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

  const topicStatsList = Object.values(topicStats);
  const percentage = Math.round(result.percentage);

  const testTitle = lang === 'kz' && test.titleKz ? test.titleKz : test.title;
  const subjectName = lang === 'kz' && test.subject?.nameKz ? test.subject.nameKz : test.subject?.name || '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 10pt;
      color: #333;
      line-height: 1.4;
    }

    .header {
      background: linear-gradient(135deg, #286786, #3a8fb7);
      color: white;
      padding: 15px 20px;
      border-radius: 12px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .header svg {
      width: 24px;
      height: 24px;
    }

    .header-title {
      font-size: 14pt;
      font-weight: bold;
    }

    .student-info {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .student-name {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .student-avatar {
      width: 40px;
      height: 40px;
      background: #f0f0f0;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .student-avatar svg {
      width: 24px;
      height: 24px;
      color: #666;
    }

    .name-text {
      font-size: 14pt;
      font-weight: 600;
      color: #333;
    }

    .meta-info {
      text-align: right;
      color: #666;
      font-size: 9pt;
    }

    .score-section {
      display: flex;
      gap: 30px;
      margin-bottom: 20px;
      align-items: center;
    }

    .score-circle {
      position: relative;
      width: 120px;
      height: 120px;
    }

    .score-circle svg {
      transform: rotate(-90deg);
    }

    .score-circle .bg {
      fill: none;
      stroke: #e8e8e8;
      stroke-width: 8;
    }

    .score-circle .progress {
      fill: none;
      stroke: #286786;
      stroke-width: 8;
      stroke-linecap: round;
      stroke-dasharray: ${2 * Math.PI * 52};
      stroke-dashoffset: ${2 * Math.PI * 52 * (1 - percentage / 100)};
    }

    .score-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 28pt;
      font-weight: bold;
      color: #286786;
    }

    .score-details {
      flex: 1;
    }

    .score-item {
      margin-bottom: 12px;
    }

    .score-label {
      font-size: 10pt;
      color: #333;
      margin-bottom: 4px;
    }

    .score-bar {
      height: 10px;
      background: #e8e8e8;
      border-radius: 5px;
      overflow: hidden;
    }

    .score-bar-fill {
      height: 100%;
      background: #286786;
      border-radius: 5px;
    }

    .section-title {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 20px;
      padding: 8px 16px;
      display: inline-block;
      font-size: 10pt;
      font-weight: 500;
      margin-bottom: 15px;
    }

    .stats-row {
      display: flex;
      gap: 20px;
      margin-bottom: 15px;
      padding: 12px 16px;
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .stat-icon {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      color: white;
    }

    .stat-icon.correct { background: #22c55e; }
    .stat-icon.incorrect { background: #ef4444; }
    .stat-icon.skipped { background: #9ca3af; }

    .questions-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
    }

    .questions-table th {
      text-align: left;
      padding: 10px 12px;
      background: #f8f9fa;
      border-bottom: 1px solid #e0e0e0;
      font-size: 9pt;
      color: #666;
    }

    .questions-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #f0f0f0;
      vertical-align: middle;
    }

    .questions-table tr:hover {
      background: #fafafa;
    }

    .q-number {
      font-weight: 500;
      color: #666;
      width: 40px;
    }

    .q-topic {
      max-width: 250px;
    }

    .status-icon {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .status-icon.correct {
      background: #dcfce7;
      color: #22c55e;
    }

    .status-icon.incorrect {
      background: #fee2e2;
      color: #ef4444;
    }

    .status-icon.skipped {
      background: #f3f4f6;
      color: #9ca3af;
    }

    .answer-circle {
      width: 28px;
      height: 28px;
      border: 2px solid #e0e0e0;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 500;
      font-size: 10pt;
    }

    .answer-circle.correct {
      border-color: #22c55e;
      color: #22c55e;
    }

    .answer-circle.incorrect {
      border-color: #ef4444;
      color: #ef4444;
    }

    .topic-item {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      padding: 15px;
      margin-bottom: 12px;
    }

    .topic-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .topic-name {
      font-weight: 500;
    }

    .topic-percent {
      background: #f0f0f0;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 9pt;
      font-weight: 500;
    }

    .topic-bar {
      height: 8px;
      background: #e8e8e8;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 8px;
    }

    .topic-bar-fill {
      height: 100%;
      border-radius: 4px;
    }

    .topic-bar-fill.green { background: #22c55e; }
    .topic-bar-fill.orange { background: #f97316; }
    .topic-bar-fill.red { background: #ef4444; }

    .topic-stats {
      display: flex;
      gap: 20px;
      font-size: 8pt;
      color: #666;
    }

    .footer {
      text-align: center;
      padding: 15px;
      color: #666;
      font-size: 9pt;
      margin-top: 20px;
      border-top: 1px solid #e0e0e0;
    }

    .page-break {
      page-break-before: always;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
      <path d="M6 12v5c3 3 9 3 12 0v-5"/>
    </svg>
    <span class="header-title">Mektepte - ${t.diagnostics}</span>
  </div>

  <!-- Student Info -->
  <div class="student-info">
    <div class="student-name">
      <div class="student-avatar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      <span class="name-text">${result.studentName || 'Ученик'}</span>
    </div>
    <div class="meta-info">
      <div>${testTitle}</div>
      <div>${subjectName}</div>
      <div>${t.grade}: ${result.studentClass || test.gradeLevel || '-'}</div>
    </div>
  </div>

  <!-- Score Section -->
  <div class="score-section">
    <div class="score-circle">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle class="bg" cx="60" cy="60" r="52"/>
        <circle class="progress" cx="60" cy="60" r="52"/>
      </svg>
      <div class="score-text">${percentage}%</div>
    </div>
    <div class="score-details">
      <div class="score-item">
        <div class="score-label">${t.totalScore}: ${correctCount}/${tasks.length}</div>
        <div class="score-bar">
          <div class="score-bar-fill" style="width: ${percentage}%"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- Questions Breakdown -->
  <div class="section-title">${t.questionsBreakdown}: ${subjectName}</div>

  <div class="stats-row">
    <div class="stat-item">
      <div class="stat-icon correct">✓</div>
      <span>${t.correct}: ${correctCount}/${tasks.length}</span>
    </div>
    <div class="stat-item">
      <div class="stat-icon incorrect">✗</div>
      <span>${t.incorrect}: ${incorrectCount}/${tasks.length}</span>
    </div>
    <div class="stat-item">
      <div class="stat-icon skipped">−</div>
      <span>${t.skipped}: ${skippedCount}/${tasks.length}</span>
    </div>
  </div>

  <table class="questions-table">
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
          <td class="q-number">${qr.number}</td>
          <td class="q-topic">${qr.topic}</td>
          <td>
            <div class="status-icon ${qr.isSkipped ? 'skipped' : qr.isCorrect ? 'correct' : 'incorrect'}">
              ${qr.isSkipped ? '−' : qr.isCorrect ? '✓' : '✗'}
            </div>
          </td>
          <td>
            <div class="answer-circle ${qr.isSkipped ? '' : qr.isCorrect ? 'correct' : 'incorrect'}">
              ${qr.studentAnswer}
            </div>
          </td>
          <td>
            <div class="answer-circle correct">${qr.correctAnswer}</div>
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- Topics Breakdown -->
  <div class="page-break"></div>
  <div class="section-title">${t.topicsBreakdown}: ${subjectName}</div>

  ${topicStatsList.map((topic, idx) => {
    const topicPercent = topic.total > 0 ? Math.round((topic.correct / topic.total) * 100) : 0;
    const barClass = topicPercent >= 70 ? 'green' : topicPercent >= 40 ? 'orange' : 'red';
    return `
      <div class="topic-item">
        <div class="topic-header">
          <span class="topic-name">${idx + 1}) ${topic.name} (${topic.correct}/${topic.total})</span>
          <span class="topic-percent">${topicPercent}%</span>
        </div>
        <div class="topic-bar">
          <div class="topic-bar-fill ${barClass}" style="width: ${topicPercent}%"></div>
        </div>
        <div class="topic-stats">
          <span>${t.correct}: ${topic.correct}</span>
          <span>${t.incorrect}: ${topic.incorrect}</span>
          <span>${t.skipped}: ${topic.skipped}</span>
        </div>
      </div>
    `;
  }).join('')}

  <!-- Footer -->
  <div class="footer">
    <strong>Mektepte</strong> • mektepte.kz
  </div>
</body>
</html>
  `;
}
