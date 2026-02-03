'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TestType, QuestionType } from '@prisma/client';
import { useNotification } from '@/app/components/ui/NotificationProvider';

interface Lesson {
  id: string;
  title: string;
}

interface Course {
  id: string;
  title: string;
  lessons: Lesson[];
}

interface Question {
  text: string;
  type: QuestionType;
  points: number;
  options: string[];
  correctAnswers: number[];
  explanation?: string;
}

interface TestFormProps {
  courses: Course[];
}

export default function TestForm({ courses }: TestFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    type: TestType;
    lessonId: string;
    duration: number;
    passingScore: number;
    maxAttempts: number;
    shuffleQuestions: boolean;
    showResults: boolean;
    isPublished: boolean;
  }>({
    title: '',
    description: '',
    type: TestType.QUIZ,
    lessonId: '',
    duration: 30,
    passingScore: 70,
    maxAttempts: 3,
    shuffleQuestions: true,
    showResults: true,
    isPublished: false,
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    text: '',
    type: QuestionType.SINGLE_CHOICE,
    points: 1,
    options: ['', ''],
    correctAnswers: [],
    explanation: '',
  });
  const { showToast } = useNotification();

  const selectedCourse = courses.find(c =>
    c.lessons.some(l => l.id === formData.lessonId)
  );

  const addOption = () => {
    setCurrentQuestion({
      ...currentQuestion,
      options: [...currentQuestion.options, ''],
    });
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...currentQuestion.options];
    newOptions[index] = value;
    setCurrentQuestion({ ...currentQuestion, options: newOptions });
  };

  const removeOption = (index: number) => {
    const newOptions = currentQuestion.options.filter((_, i) => i !== index);
    const newCorrectAnswers = currentQuestion.correctAnswers
      .filter(i => i !== index)
      .map(i => i > index ? i - 1 : i);
    setCurrentQuestion({
      ...currentQuestion,
      options: newOptions,
      correctAnswers: newCorrectAnswers,
    });
  };

  const toggleCorrectAnswer = (index: number) => {
    if (currentQuestion.type === QuestionType.SINGLE_CHOICE) {
      setCurrentQuestion({
        ...currentQuestion,
        correctAnswers: [index],
      });
    } else {
      const newCorrectAnswers = currentQuestion.correctAnswers.includes(index)
        ? currentQuestion.correctAnswers.filter(i => i !== index)
        : [...currentQuestion.correctAnswers, index];
      setCurrentQuestion({
        ...currentQuestion,
        correctAnswers: newCorrectAnswers,
      });
    }
  };

  const addQuestion = () => {
    if (!currentQuestion.text.trim()) {
      showToast({ message: 'Введите текст вопроса', type: 'warning' });
      return;
    }

    if (
      (currentQuestion.type === QuestionType.SINGLE_CHOICE ||
       currentQuestion.type === QuestionType.MULTIPLE_CHOICE) &&
      currentQuestion.options.some(opt => !opt.trim())
    ) {
      showToast({ message: 'Заполните все варианты ответа', type: 'warning' });
      return;
    }

    if (currentQuestion.correctAnswers.length === 0 &&
        currentQuestion.type !== QuestionType.ESSAY &&
        currentQuestion.type !== QuestionType.SHORT_ANSWER) {
      showToast({ message: 'Отметьте правильный ответ', type: 'warning' });
      return;
    }

    setQuestions([...questions, currentQuestion]);
    setCurrentQuestion({
      text: '',
      type: QuestionType.SINGLE_CHOICE,
      points: 1,
      options: ['', ''],
      correctAnswers: [],
      explanation: '',
    });
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (questions.length === 0) {
      setError('Добавьте хотя бы один вопрос');
      setLoading(false);
      return;
    }

    if (!formData.lessonId) {
      setError('Выберите урок для теста');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          questions,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка при создании теста');
      }

      router.push('/tests');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Основная информация
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-1">
              Название теста
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 transition-all hover:border-gray-300 dark:hover:border-gray-500 text-gray-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-1">
              Описание
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 transition-all hover:border-gray-300 dark:hover:border-gray-500 text-gray-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-1">
              Тип теста
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as TestType })}
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 transition-all hover:border-gray-300 dark:hover:border-gray-500 text-gray-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400"
            >
              <option value={TestType.QUIZ}>Опрос</option>
              <option value={TestType.MIDTERM}>Промежуточный</option>
              <option value={TestType.FINAL}>Итоговый</option>
              <option value={TestType.MOCK_EXAM}>Пробный экзамен</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-1">
              Урок
            </label>
            <select
              value={formData.lessonId}
              onChange={(e) => setFormData({ ...formData, lessonId: e.target.value })}
              required
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 transition-all hover:border-gray-300 dark:hover:border-gray-500 text-gray-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400"
            >
              <option value="">Выберите урок</option>
              {courses.map((course) => (
                <optgroup key={course.id} label={course.title}>
                  {course.lessons.map((lesson) => (
                    <option key={lesson.id} value={lesson.id}>
                      {lesson.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-1">
              Длительность (минуты)
            </label>
            <input
              type="number"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
              min="1"
              required
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 transition-all hover:border-gray-300 dark:hover:border-gray-500 text-gray-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-1">
              Проходной балл (%)
            </label>
            <input
              type="number"
              value={formData.passingScore}
              onChange={(e) => setFormData({ ...formData, passingScore: parseInt(e.target.value) })}
              min="0"
              max="100"
              required
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 transition-all hover:border-gray-300 dark:hover:border-gray-500 text-gray-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-1">
              Макс. попыток
            </label>
            <input
              type="number"
              value={formData.maxAttempts}
              onChange={(e) => setFormData({ ...formData, maxAttempts: parseInt(e.target.value) })}
              min="1"
              required
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 transition-all hover:border-gray-300 dark:hover:border-gray-500 text-gray-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400"
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.shuffleQuestions}
                onChange={(e) => setFormData({ ...formData, shuffleQuestions: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-gray-900 dark:text-gray-300">Перемешивать вопросы</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.showResults}
                onChange={(e) => setFormData({ ...formData, showResults: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-gray-900 dark:text-gray-300">Показывать результаты после прохождения</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isPublished}
                onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-gray-900 dark:text-gray-300">Опубликовать тест</span>
            </label>
          </div>
        </div>
      </div>

      {/* Question Builder */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Добавить вопрос
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-1">
              Текст вопроса
            </label>
            <textarea
              value={currentQuestion.text}
              onChange={(e) => setCurrentQuestion({ ...currentQuestion, text: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 transition-all hover:border-gray-300 dark:hover:border-gray-500 text-gray-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-1">
                Тип вопроса
              </label>
              <select
                value={currentQuestion.type}
                onChange={(e) => setCurrentQuestion({
                  ...currentQuestion,
                  type: e.target.value as QuestionType,
                  options: e.target.value === QuestionType.SINGLE_CHOICE || e.target.value === QuestionType.MULTIPLE_CHOICE
                    ? ['', '']
                    : [],
                  correctAnswers: [],
                })}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 transition-all hover:border-gray-300 dark:hover:border-gray-500 text-gray-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400"
              >
                <option value={QuestionType.SINGLE_CHOICE}>Один правильный</option>
                <option value={QuestionType.MULTIPLE_CHOICE}>Несколько правильных</option>
                <option value={QuestionType.TRUE_FALSE}>Правда/Ложь</option>
                <option value={QuestionType.SHORT_ANSWER}>Краткий ответ</option>
                <option value={QuestionType.ESSAY}>Эссе</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-1">
                Баллы
              </label>
              <input
                type="number"
                value={currentQuestion.points}
                onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: parseInt(e.target.value) })}
                min="1"
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 transition-all hover:border-gray-300 dark:hover:border-gray-500 text-gray-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400"
              />
            </div>
          </div>

          {(currentQuestion.type === QuestionType.SINGLE_CHOICE ||
            currentQuestion.type === QuestionType.MULTIPLE_CHOICE) && (
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-2">
                Варианты ответа
              </label>
              <div className="space-y-2">
                {currentQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type={currentQuestion.type === QuestionType.SINGLE_CHOICE ? 'radio' : 'checkbox'}
                      checked={currentQuestion.correctAnswers.includes(index)}
                      onChange={() => toggleCorrectAnswer(index)}
                      className="flex-shrink-0"
                    />
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`Вариант ${index + 1}`}
                      className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 transition-all hover:border-gray-300 dark:hover:border-gray-500 text-gray-900 dark:text-white"
                    />
                    {currentQuestion.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="px-3 py-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addOption}
                className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                + Добавить вариант
              </button>
            </div>
          )}

          {currentQuestion.type === QuestionType.TRUE_FALSE && (
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-2">
                Правильный ответ
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={currentQuestion.correctAnswers[0] === 0}
                    onChange={() => setCurrentQuestion({ ...currentQuestion, correctAnswers: [0] })}
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-300">Правда</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={currentQuestion.correctAnswers[0] === 1}
                    onChange={() => setCurrentQuestion({ ...currentQuestion, correctAnswers: [1] })}
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-300">Ложь</span>
                </label>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-1">
              Объяснение (необязательно)
            </label>
            <textarea
              value={currentQuestion.explanation}
              onChange={(e) => setCurrentQuestion({ ...currentQuestion, explanation: e.target.value })}
              rows={2}
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 transition-all hover:border-gray-300 dark:hover:border-gray-500 text-gray-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400"
            />
          </div>

          <button
            type="button"
            onClick={addQuestion}
            className="w-full px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            Добавить вопрос
          </button>
        </div>
      </div>

      {/* Questions List */}
      {questions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Вопросы ({questions.length})
          </h2>
          <div className="space-y-4">
            {questions.map((question, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-xs rounded">
                        Вопрос {index + 1}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 text-xs rounded">
                        {question.type}
                      </span>
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 text-xs rounded">
                        {question.points} балл(ов)
                      </span>
                    </div>
                    <p className="text-gray-900 dark:text-white font-medium">{question.text}</p>
                    {question.options.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {question.options.map((opt, i) => (
                          <li
                            key={i}
                            className={`text-sm ${
                              question.correctAnswers.includes(i)
                                ? 'text-green-700 dark:text-green-400 font-medium'
                                : 'text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {question.correctAnswers.includes(i) && '✓ '}
                            {opt}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeQuestion(index)}
                    className="ml-4 px-3 py-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <a
          href="/tests"
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Отмена
        </a>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Создание...' : 'Создать тест'}
        </button>
      </div>
    </form>
  );
}
