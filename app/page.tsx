import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="h-screen overflow-y-auto bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center">
              <Image
                src="/logos/ertis-academy-logo.svg"
                alt="Ertis Academy"
                width={140}
                height={42}
                priority
              />
            </Link>
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Возможности</a>
              <a href="#stats" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Результаты</a>
              <a href="#subjects" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Предметы</a>
            </nav>
            <Link
              href="https://classroom.ertis.academy/login"
              className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              Войти в Classroom
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full text-sm text-blue-700 font-medium mb-8">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            Образовательный центр нового поколения
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            Путь к знаниям<br />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              начинается здесь
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Современная система управления обучением для образовательных центров.
            Подготовка к НИШ, РФМШ, КТЛ и олимпиадам по всем предметам.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="https://classroom.ertis.academy/login"
              className="px-8 py-4 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 transition-all hover:scale-105"
            >
              Начать обучение
            </Link>
            <a
              href="#features"
              className="px-8 py-4 bg-gray-100 text-gray-900 font-medium rounded-xl hover:bg-gray-200 transition-all"
            >
              Узнать больше
            </a>
          </div>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section id="features" className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Всё для эффективного обучения
            </h2>
            <p className="text-lg text-gray-600">
              Инструменты, которые помогут достичь высоких результатов
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Large card - Courses */}
            <div className="md:col-span-2 md:row-span-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-8 text-white relative overflow-hidden group hover:scale-[1.02] transition-transform">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.1%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-30"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-blue-100 mb-2 block">Курсы и программы</span>
                <h3 className="text-2xl md:text-3xl font-bold mb-4">
                  Индивидуальные программы обучения
                </h3>
                <p className="text-blue-100 text-lg leading-relaxed">
                  Адаптивные курсы, созданные для достижения ваших целей. От подготовки к экзаменам до олимпиадного уровня.
                </p>
              </div>
            </div>

            {/* Analytics card */}
            <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl p-6 text-white relative overflow-hidden group hover:scale-[1.02] transition-transform">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-amber-100 mb-1 block">Аналитика</span>
              <h3 className="text-xl font-bold mb-2">Отслеживание прогресса</h3>
              <p className="text-amber-100 text-sm">
                Детальная статистика и отчёты об успеваемости
              </p>
            </div>

            {/* Schedule card */}
            <div className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl p-6 text-white relative overflow-hidden group hover:scale-[1.02] transition-transform">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-emerald-100 mb-1 block">Расписание</span>
              <h3 className="text-xl font-bold mb-2">Гибкий график</h3>
              <p className="text-emerald-100 text-sm">
                Удобное расписание занятий онлайн и офлайн
              </p>
            </div>

            {/* Teachers card */}
            <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-3xl p-6 text-white relative overflow-hidden group hover:scale-[1.02] transition-transform">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-violet-100 mb-1 block">Преподаватели</span>
              <h3 className="text-xl font-bold mb-2">Эксперты в своём деле</h3>
              <p className="text-violet-100 text-sm">
                Опытные педагоги с высшей квалификацией
              </p>
            </div>

            {/* Diagnostics card */}
            <div className="bg-gradient-to-br from-rose-400 to-pink-500 rounded-3xl p-6 text-white relative overflow-hidden group hover:scale-[1.02] transition-transform">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <span className="text-sm font-medium text-rose-100 mb-1 block">Диагностика</span>
              <h3 className="text-xl font-bold mb-2">Тестирование знаний</h3>
              <p className="text-rose-100 text-sm">
                Определение уровня и пробелов в знаниях
              </p>
            </div>

            {/* Wide card - Online/Offline */}
            <div className="md:col-span-2 bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 text-white relative overflow-hidden group hover:scale-[1.02] transition-transform">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-1">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-4">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-400 mb-1 block">Форматы обучения</span>
                  <h3 className="text-2xl font-bold mb-2">Онлайн и офлайн</h3>
                  <p className="text-gray-400">
                    Выберите удобный формат: занятия в классе или дистанционно из любой точки мира
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="px-4 py-2 bg-white/10 rounded-lg text-sm font-medium">Офлайн</div>
                  <div className="px-4 py-2 bg-blue-500 rounded-lg text-sm font-medium">Онлайн</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Результаты говорят сами за себя
            </h2>
            <p className="text-lg text-gray-600">
              Наши ученики достигают выдающихся результатов
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center p-8 bg-gray-50 rounded-3xl">
              <div className="text-5xl md:text-6xl font-bold text-blue-600 mb-2">83%</div>
              <p className="text-gray-600 font-medium">поступивших в желаемые учебные заведения</p>
            </div>
            <div className="text-center p-8 bg-gray-50 rounded-3xl">
              <div className="text-5xl md:text-6xl font-bold text-emerald-600 mb-2">5K+</div>
              <p className="text-gray-600 font-medium">учеников прошли обучение</p>
            </div>
            <div className="text-center p-8 bg-gray-50 rounded-3xl">
              <div className="text-5xl md:text-6xl font-bold text-amber-600 mb-2">50%</div>
              <p className="text-gray-600 font-medium">грантников НИШ, РФМШ, КТЛ — наши выпускники</p>
            </div>
            <div className="text-center p-8 bg-gray-50 rounded-3xl">
              <div className="text-5xl md:text-6xl font-bold text-purple-600 mb-2">10+</div>
              <p className="text-gray-600 font-medium">лет успешной работы</p>
            </div>
          </div>
        </div>
      </section>

      {/* Subjects Section */}
      <section id="subjects" className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Подготовка по всем предметам
            </h2>
            <p className="text-lg text-gray-600">
              Выберите предметы для подготовки к экзаменам и олимпиадам
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[
              { name: 'Математика', icon: '📐', color: 'from-blue-500 to-blue-600' },
              { name: 'Физика', icon: '⚡', color: 'from-amber-500 to-orange-500' },
              { name: 'Химия', icon: '🧪', color: 'from-emerald-500 to-teal-500' },
              { name: 'Биология', icon: '🧬', color: 'from-green-500 to-emerald-500' },
              { name: 'Информатика', icon: '💻', color: 'from-violet-500 to-purple-500' },
              { name: 'История Казахстана', icon: '🏛️', color: 'from-rose-500 to-pink-500' },
              { name: 'Казахский язык', icon: '🇰🇿', color: 'from-sky-500 to-blue-500' },
              { name: 'Русский язык', icon: '📝', color: 'from-red-500 to-rose-500' },
              { name: 'Английский язык', icon: '🌍', color: 'from-indigo-500 to-violet-500' },
              { name: 'География', icon: '🌏', color: 'from-cyan-500 to-teal-500' },
            ].map((subject) => (
              <div
                key={subject.name}
                className={`bg-gradient-to-br ${subject.color} rounded-2xl p-5 text-white hover:scale-105 transition-transform cursor-pointer`}
              >
                <div className="text-3xl mb-3">{subject.icon}</div>
                <h3 className="font-semibold text-sm">{subject.name}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Programs Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Программы подготовки
            </h2>
            <p className="text-lg text-gray-600">
              Выберите программу, соответствующую вашим целям
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-8 border border-blue-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-2xl">🎓</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">НИШ / РФМШ</h3>
              <p className="text-gray-600 mb-6">
                Комплексная подготовка к поступлению в Назарбаев Интеллектуальные Школы и РФМШ
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Математика и логика
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Казахский / Русский язык
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Пробные тесты
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-8 border border-amber-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-2xl">🏆</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Олимпиады</h3>
              <p className="text-gray-600 mb-6">
                Подготовка к республиканским и международным олимпиадам по различным предметам
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Углублённая программа
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Индивидуальный подход
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Работа с экспертами
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl p-8 border border-emerald-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-2xl">📚</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">КТЛ / Лицеи</h3>
              <p className="text-gray-600 mb-6">
                Подготовка к поступлению в Казахско-Турецкие лицеи и другие престижные школы
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Все необходимые предметы
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Симуляция экзаменов
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Поддержка до поступления
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Готовы начать путь к успеху?
          </h2>
          <p className="text-xl text-gray-400 mb-10">
            Присоединяйтесь к тысячам учеников, которые уже достигли своих целей
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="https://classroom.ertis.academy/login"
              className="px-8 py-4 bg-white text-gray-900 font-medium rounded-xl hover:bg-gray-100 transition-all hover:scale-105"
            >
              Войти в Classroom
            </Link>
            <a
              href="tel:+77007501414"
              className="px-8 py-4 bg-white/10 text-white font-medium rounded-xl hover:bg-white/20 transition-all border border-white/20"
            >
              +7 700 750 1414
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-gray-900 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <Link href="/" className="flex items-center">
              <Image
                src="/logos/ertis-academy-logo.svg"
                alt="Ertis Academy"
                width={120}
                height={36}
                className="brightness-0 invert"
              />
            </Link>
            <div className="flex items-center gap-6 text-gray-400 text-sm">
              <a href="#" className="hover:text-white transition-colors">Политика конфиденциальности</a>
              <a href="#" className="hover:text-white transition-colors">Условия использования</a>
            </div>
            <div className="text-gray-500 text-sm">
              © {new Date().getFullYear()} Ertis Academy. Все права защищены.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
