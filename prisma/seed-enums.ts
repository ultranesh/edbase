import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://mz@localhost:5432/ertis_classroom?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding enum reference tables...');

  // Роли пользователей
  console.log('\nCreating user roles...');
  const userRoles = [
    { code: 'SUPERADMIN', name: 'Супер админ', nameKz: 'Супер әкімші', nameRu: 'Супер админ', nameEn: 'Super Admin', orderIndex: 1 },
    { code: 'ADMIN', name: 'Администратор', nameKz: 'Әкімші', nameRu: 'Администратор', nameEn: 'Administrator', orderIndex: 2 },
    { code: 'DEPARTMENT_HEAD', name: 'Руководитель отдела', nameKz: 'Бөлім басшысы', nameRu: 'Руководитель отдела', nameEn: 'Department Head', orderIndex: 3 },
    { code: 'CURATOR', name: 'Куратор', nameKz: 'Куратор', nameRu: 'Куратор', nameEn: 'Curator', orderIndex: 4 },
    { code: 'CHIEF_COORDINATOR', name: 'Главный координатор', nameKz: 'Бас үйлестіруші', nameRu: 'Главный координатор', nameEn: 'Chief Coordinator', orderIndex: 4 },
    { code: 'CHIEF_CURATOR', name: 'Главный куратор', nameKz: 'Бас куратор', nameRu: 'Главный куратор', nameEn: 'Chief Curator', orderIndex: 5 },
    { code: 'COORDINATOR', name: 'Координатор', nameKz: 'Үйлестіруші', nameRu: 'Координатор', nameEn: 'Coordinator', orderIndex: 6 },
    { code: 'TEACHER', name: 'Учитель', nameKz: 'Мұғалім', nameRu: 'Учитель', nameEn: 'Teacher', orderIndex: 7 },
    { code: 'PARENT', name: 'Родитель', nameKz: 'Ата-ана', nameRu: 'Родитель', nameEn: 'Parent', orderIndex: 8 },
    { code: 'ONLINE_MENTOR', name: 'Онлайн ментор', nameKz: 'Онлайн тәлімгер', nameRu: 'Онлайн ментор', nameEn: 'Online Mentor', orderIndex: 9 },
  ];
  for (const role of userRoles) {
    await prisma.refUserRole.upsert({
      where: { code: role.code },
      update: { name: role.name, nameKz: role.nameKz, nameRu: role.nameRu, nameEn: role.nameEn, orderIndex: role.orderIndex },
      create: role,
    });
    console.log(`Created user role: ${role.name}`);
  }

  // Пол
  console.log('\nCreating genders...');
  const genders = [
    { code: 'MALE', name: 'Мужской', nameKz: 'Ер', nameRu: 'Мужской', nameEn: 'Male', orderIndex: 1 },
    { code: 'FEMALE', name: 'Женский', nameKz: 'Әйел', nameRu: 'Женский', nameEn: 'Female', orderIndex: 2 },
  ];
  for (const gender of genders) {
    await prisma.refGender.upsert({
      where: { code: gender.code },
      update: { name: gender.name, nameKz: gender.nameKz, nameRu: gender.nameRu, nameEn: gender.nameEn, orderIndex: gender.orderIndex },
      create: gender,
    });
    console.log(`Created gender: ${gender.name}`);
  }

  // Гражданство
  console.log('\nCreating citizenships...');
  const citizenships = [
    { code: 'KZ', name: 'Гражданин РК', nameKz: 'ҚР азаматы', nameRu: 'Гражданин РК', nameEn: 'Kazakhstan Citizen', orderIndex: 1 },
    { code: 'FOREIGN', name: 'Иностранный гражданин', nameKz: 'Шетелдік азамат', nameRu: 'Иностранный гражданин', nameEn: 'Foreign Citizen', orderIndex: 2 },
  ];
  for (const citizenship of citizenships) {
    await prisma.refCitizenship.upsert({
      where: { code: citizenship.code },
      update: { name: citizenship.name, nameKz: citizenship.nameKz, nameRu: citizenship.nameRu, nameEn: citizenship.nameEn, orderIndex: citizenship.orderIndex },
      create: citizenship,
    });
    console.log(`Created citizenship: ${citizenship.name}`);
  }

  // Форматы обучения
  console.log('\nCreating study formats...');
  const studyFormats = [
    { code: 'ONLINE_GROUP', name: 'Онлайн группа', nameKz: 'Онлайн топ', nameRu: 'Онлайн группа', nameEn: 'Online Group', orderIndex: 1 },
    { code: 'OFFLINE_GROUP', name: 'Очная группа', nameKz: 'Офлайн топ', nameRu: 'Очная группа', nameEn: 'Offline Group', orderIndex: 2 },
    { code: 'ONLINE_INDIVIDUAL', name: 'Онлайн индивидуально', nameKz: 'Онлайн жеке', nameRu: 'Онлайн индивидуально', nameEn: 'Online Individual', orderIndex: 3 },
    { code: 'OFFLINE_INDIVIDUAL', name: 'Очно индивидуально', nameKz: 'Офлайн жеке', nameRu: 'Очно индивидуально', nameEn: 'Offline Individual', orderIndex: 4 },
  ];
  for (const format of studyFormats) {
    await prisma.refStudyFormat.upsert({
      where: { code: format.code },
      update: { name: format.name, nameKz: format.nameKz, nameRu: format.nameRu, nameEn: format.nameEn, orderIndex: format.orderIndex },
      create: format,
    });
    console.log(`Created study format: ${format.name}`);
  }

  // Гарантии
  console.log('\nCreating guarantees...');
  const guarantees = [
    { code: 'NONE', name: 'Без гарантии', nameKz: 'Кепілдіксіз', nameRu: 'Без гарантии', nameEn: 'No Guarantee', orderIndex: 1 },
    { code: 'FIFTY_PERCENT', name: '50% гарантия', nameKz: '50% кепілдік', nameRu: '50% гарантия', nameEn: '50% Guarantee', orderIndex: 2 },
    { code: 'EIGHTY_PERCENT', name: '80% гарантия', nameKz: '80% кепілдік', nameRu: '80% гарантия', nameEn: '80% Guarantee', orderIndex: 3 },
    { code: 'HUNDRED_PERCENT', name: '100% гарантия', nameKz: '100% кепілдік', nameRu: '100% гарантия', nameEn: '100% Guarantee', orderIndex: 4 },
  ];
  for (const guarantee of guarantees) {
    await prisma.refGuarantee.upsert({
      where: { code: guarantee.code },
      update: { name: guarantee.name, nameKz: guarantee.nameKz, nameRu: guarantee.nameRu, nameEn: guarantee.nameEn, orderIndex: guarantee.orderIndex },
      create: guarantee,
    });
    console.log(`Created guarantee: ${guarantee.name}`);
  }

  // Расписания занятий
  console.log('\nCreating study schedules...');
  const studySchedules = [
    { code: 'PSP', name: 'Пн-Ср-Пт', nameKz: 'Дс-Ср-Жм', nameRu: 'Пн-Ср-Пт', nameEn: 'Mon-Wed-Fri', orderIndex: 1 },
    { code: 'VCS', name: 'Вт-Чт-Сб', nameKz: 'Сс-Бс-Сн', nameRu: 'Вт-Чт-Сб', nameEn: 'Tue-Thu-Sat', orderIndex: 2 },
    { code: 'CUSTOM', name: 'Особый', nameKz: 'Ерекше', nameRu: 'Особый', nameEn: 'Custom', orderIndex: 3 },
  ];
  for (const schedule of studySchedules) {
    await prisma.refStudySchedule.upsert({
      where: { code: schedule.code },
      update: { name: schedule.name, nameKz: schedule.nameKz, nameRu: schedule.nameRu, nameEn: schedule.nameEn, orderIndex: schedule.orderIndex },
      create: schedule,
    });
    console.log(`Created study schedule: ${schedule.name}`);
  }

  // Типы документов родителя
  console.log('\nCreating parent document types...');
  const parentDocumentTypes = [
    { code: 'ID_CARD', name: 'Удостоверение личности', nameKz: 'Жеке куәлік', nameRu: 'Удостоверение личности', nameEn: 'ID Card', orderIndex: 1 },
    { code: 'RK_PASSPORT', name: 'Паспорт гражданина РК', nameKz: 'ҚР азаматының паспорты', nameRu: 'Паспорт гражданина РК', nameEn: 'RK Passport', orderIndex: 2 },
    { code: 'FOREIGN', name: 'Иностранный документ', nameKz: 'Шетелдік құжат', nameRu: 'Иностранный документ', nameEn: 'Foreign Document', orderIndex: 3 },
  ];
  for (const docType of parentDocumentTypes) {
    await prisma.refParentDocumentType.upsert({
      where: { code: docType.code },
      update: { name: docType.name, nameKz: docType.nameKz, nameRu: docType.nameRu, nameEn: docType.nameEn, orderIndex: docType.orderIndex },
      create: docType,
    });
    console.log(`Created parent document type: ${docType.name}`);
  }

  // Статусы студентов
  console.log('\nCreating student statuses...');
  const studentStatuses = [
    { code: 'ACTIVE', name: 'Активный', nameKz: 'Белсенді', nameRu: 'Активный', nameEn: 'Active', color: '#22C55E', orderIndex: 1 },
    { code: 'INACTIVE', name: 'Неактивный', nameKz: 'Белсенді емес', nameRu: 'Неактивный', nameEn: 'Inactive', color: '#6B7280', orderIndex: 2 },
    { code: 'GRADUATED', name: 'Окончил обучение', nameKz: 'Оқуды бітірді', nameRu: 'Окончил обучение', nameEn: 'Graduated', color: '#3B82F6', orderIndex: 3 },
    { code: 'DROPPED', name: 'Отчислен', nameKz: 'Шығарылды', nameRu: 'Отчислен', nameEn: 'Dropped', color: '#EF4444', orderIndex: 4 },
    { code: 'ON_HOLD', name: 'На паузе', nameKz: 'Кідірісте', nameRu: 'На паузе', nameEn: 'On Hold', color: '#F59E0B', orderIndex: 5 },
  ];
  for (const status of studentStatuses) {
    await prisma.refStudentStatus.upsert({
      where: { code: status.code },
      update: { name: status.name, nameKz: status.nameKz, nameRu: status.nameRu, nameEn: status.nameEn, color: status.color, orderIndex: status.orderIndex },
      create: status,
    });
    console.log(`Created student status: ${status.name}`);
  }

  // Статусы учителей
  console.log('\nCreating teacher statuses...');
  const teacherStatuses = [
    { code: 'ACTIVE', name: 'Активный', nameKz: 'Белсенді', nameRu: 'Активный', nameEn: 'Active', color: '#22C55E', orderIndex: 1 },
    { code: 'INACTIVE', name: 'Неактивный', nameKz: 'Белсенді емес', nameRu: 'Неактивный', nameEn: 'Inactive', color: '#6B7280', orderIndex: 2 },
    { code: 'ON_VACATION', name: 'В отпуске', nameKz: 'Демалыста', nameRu: 'В отпуске', nameEn: 'On Vacation', color: '#F59E0B', orderIndex: 3 },
    { code: 'TERMINATED', name: 'Уволен', nameKz: 'Жұмыстан шығарылды', nameRu: 'Уволен', nameEn: 'Terminated', color: '#EF4444', orderIndex: 4 },
  ];
  for (const status of teacherStatuses) {
    await prisma.refTeacherStatus.upsert({
      where: { code: status.code },
      update: { name: status.name, nameKz: status.nameKz, nameRu: status.nameRu, nameEn: status.nameEn, color: status.color, orderIndex: status.orderIndex },
      create: status,
    });
    console.log(`Created teacher status: ${status.name}`);
  }

  // Статусы оплаты
  console.log('\nCreating payment statuses...');
  const paymentStatuses = [
    { code: 'PENDING', name: 'Ожидает оплаты', nameKz: 'Төлемді күтуде', nameRu: 'Ожидает оплаты', nameEn: 'Pending', color: '#F59E0B', orderIndex: 1 },
    { code: 'PARTIAL', name: 'Частично оплачен', nameKz: 'Жартылай төленген', nameRu: 'Частично оплачен', nameEn: 'Partial', color: '#3B82F6', orderIndex: 2 },
    { code: 'PAID', name: 'Оплачен', nameKz: 'Төленді', nameRu: 'Оплачен', nameEn: 'Paid', color: '#22C55E', orderIndex: 3 },
    { code: 'OVERDUE', name: 'Просрочен', nameKz: 'Мерзімі өткен', nameRu: 'Просрочен', nameEn: 'Overdue', color: '#EF4444', orderIndex: 4 },
    { code: 'REFUNDED', name: 'Возврат', nameKz: 'Қайтарылды', nameRu: 'Возврат', nameEn: 'Refunded', color: '#8B5CF6', orderIndex: 5 },
  ];
  for (const status of paymentStatuses) {
    await prisma.refPaymentStatus.upsert({
      where: { code: status.code },
      update: { name: status.name, nameKz: status.nameKz, nameRu: status.nameRu, nameEn: status.nameEn, color: status.color, orderIndex: status.orderIndex },
      create: status,
    });
    console.log(`Created payment status: ${status.name}`);
  }

  // Статусы договоров
  console.log('\nCreating contract statuses...');
  const contractStatuses = [
    { code: 'DRAFT', name: 'Черновик', nameKz: 'Жоба', nameRu: 'Черновик', nameEn: 'Draft', color: '#6B7280', orderIndex: 1 },
    { code: 'PENDING', name: 'На рассмотрении', nameKz: 'Қарауда', nameRu: 'На рассмотрении', nameEn: 'Pending', color: '#F59E0B', orderIndex: 2 },
    { code: 'ACTIVE', name: 'Активный', nameKz: 'Белсенді', nameRu: 'Активный', nameEn: 'Active', color: '#22C55E', orderIndex: 3 },
    { code: 'EXPIRED', name: 'Истек', nameKz: 'Мерзімі аяқталды', nameRu: 'Истек', nameEn: 'Expired', color: '#EF4444', orderIndex: 4 },
    { code: 'TERMINATED', name: 'Расторгнут', nameKz: 'Бұзылды', nameRu: 'Расторгнут', nameEn: 'Terminated', color: '#DC2626', orderIndex: 5 },
  ];
  for (const status of contractStatuses) {
    await prisma.refContractStatus.upsert({
      where: { code: status.code },
      update: { name: status.name, nameKz: status.nameKz, nameRu: status.nameRu, nameEn: status.nameEn, color: status.color, orderIndex: status.orderIndex },
      create: status,
    });
    console.log(`Created contract status: ${status.name}`);
  }

  // Статусы домашних заданий
  console.log('\nCreating homework statuses...');
  const homeworkStatuses = [
    { code: 'NOT_STARTED', name: 'Не начато', nameKz: 'Басталмады', nameRu: 'Не начато', nameEn: 'Not Started', color: '#6B7280', orderIndex: 1 },
    { code: 'IN_PROGRESS', name: 'В процессе', nameKz: 'Орындалуда', nameRu: 'В процессе', nameEn: 'In Progress', color: '#3B82F6', orderIndex: 2 },
    { code: 'SUBMITTED', name: 'Сдано', nameKz: 'Тапсырылды', nameRu: 'Сдано', nameEn: 'Submitted', color: '#F59E0B', orderIndex: 3 },
    { code: 'GRADED', name: 'Проверено', nameKz: 'Тексерілді', nameRu: 'Проверено', nameEn: 'Graded', color: '#22C55E', orderIndex: 4 },
    { code: 'RETURNED', name: 'Возвращено', nameKz: 'Қайтарылды', nameRu: 'Возвращено', nameEn: 'Returned', color: '#EF4444', orderIndex: 5 },
  ];
  for (const status of homeworkStatuses) {
    await prisma.refHomeworkStatus.upsert({
      where: { code: status.code },
      update: { name: status.name, nameKz: status.nameKz, nameRu: status.nameRu, nameEn: status.nameEn, color: status.color, orderIndex: status.orderIndex },
      create: status,
    });
    console.log(`Created homework status: ${status.name}`);
  }

  // Статусы заказов
  console.log('\nCreating order statuses...');
  const orderStatuses = [
    { code: 'NEW', name: 'Новый', nameKz: 'Жаңа', nameRu: 'Новый', nameEn: 'New', color: '#3B82F6', orderIndex: 1 },
    { code: 'PROCESSING', name: 'В обработке', nameKz: 'Өңделуде', nameRu: 'В обработке', nameEn: 'Processing', color: '#F59E0B', orderIndex: 2 },
    { code: 'CONFIRMED', name: 'Подтвержден', nameKz: 'Расталды', nameRu: 'Подтвержден', nameEn: 'Confirmed', color: '#22C55E', orderIndex: 3 },
    { code: 'CANCELLED', name: 'Отменен', nameKz: 'Бас тартылды', nameRu: 'Отменен', nameEn: 'Cancelled', color: '#EF4444', orderIndex: 4 },
    { code: 'COMPLETED', name: 'Завершен', nameKz: 'Аяқталды', nameRu: 'Завершен', nameEn: 'Completed', color: '#10B981', orderIndex: 5 },
  ];
  for (const status of orderStatuses) {
    await prisma.refOrderStatus.upsert({
      where: { code: status.code },
      update: { name: status.name, nameKz: status.nameKz, nameRu: status.nameRu, nameEn: status.nameEn, color: status.color, orderIndex: status.orderIndex },
      create: status,
    });
    console.log(`Created order status: ${status.name}`);
  }

  // Статусы сообщений
  console.log('\nCreating message statuses...');
  const messageStatuses = [
    { code: 'SENT', name: 'Отправлено', nameKz: 'Жіберілді', nameRu: 'Отправлено', nameEn: 'Sent', orderIndex: 1 },
    { code: 'DELIVERED', name: 'Доставлено', nameKz: 'Жеткізілді', nameRu: 'Доставлено', nameEn: 'Delivered', orderIndex: 2 },
    { code: 'READ', name: 'Прочитано', nameKz: 'Оқылды', nameRu: 'Прочитано', nameEn: 'Read', orderIndex: 3 },
    { code: 'FAILED', name: 'Ошибка', nameKz: 'Қате', nameRu: 'Ошибка', nameEn: 'Failed', orderIndex: 4 },
  ];
  for (const status of messageStatuses) {
    await prisma.refMessageStatus.upsert({
      where: { code: status.code },
      update: { name: status.name, nameKz: status.nameKz, nameRu: status.nameRu, nameEn: status.nameEn, orderIndex: status.orderIndex },
      create: status,
    });
    console.log(`Created message status: ${status.name}`);
  }

  // Типы тестов
  console.log('\nCreating test types...');
  const testTypes = [
    { code: 'DIAGNOSTIC', name: 'Диагностический', nameKz: 'Диагностикалық', nameRu: 'Диагностический', nameEn: 'Diagnostic', orderIndex: 1 },
    { code: 'PRACTICE', name: 'Практический', nameKz: 'Тәжірибелік', nameRu: 'Практический', nameEn: 'Practice', orderIndex: 2 },
    { code: 'EXAM', name: 'Экзаменационный', nameKz: 'Емтихандық', nameRu: 'Экзаменационный', nameEn: 'Exam', orderIndex: 3 },
    { code: 'HOMEWORK', name: 'Домашняя работа', nameKz: 'Үй жұмысы', nameRu: 'Домашняя работа', nameEn: 'Homework', orderIndex: 4 },
    { code: 'QUIZ', name: 'Викторина', nameKz: 'Викторина', nameRu: 'Викторина', nameEn: 'Quiz', orderIndex: 5 },
  ];
  for (const type of testTypes) {
    await prisma.refTestType.upsert({
      where: { code: type.code },
      update: { name: type.name, nameKz: type.nameKz, nameRu: type.nameRu, nameEn: type.nameEn, orderIndex: type.orderIndex },
      create: type,
    });
    console.log(`Created test type: ${type.name}`);
  }

  // Типы вопросов
  console.log('\nCreating question types...');
  const questionTypes = [
    { code: 'SINGLE_CHOICE', name: 'Один вариант', nameKz: 'Бір нұсқа', nameRu: 'Один вариант', nameEn: 'Single Choice', orderIndex: 1 },
    { code: 'MULTIPLE_CHOICE', name: 'Несколько вариантов', nameKz: 'Бірнеше нұсқа', nameRu: 'Несколько вариантов', nameEn: 'Multiple Choice', orderIndex: 2 },
    { code: 'TRUE_FALSE', name: 'Да/Нет', nameKz: 'Иә/Жоқ', nameRu: 'Да/Нет', nameEn: 'True/False', orderIndex: 3 },
    { code: 'SHORT_ANSWER', name: 'Короткий ответ', nameKz: 'Қысқа жауап', nameRu: 'Короткий ответ', nameEn: 'Short Answer', orderIndex: 4 },
    { code: 'ESSAY', name: 'Эссе', nameKz: 'Эссе', nameRu: 'Эссе', nameEn: 'Essay', orderIndex: 5 },
    { code: 'MATCHING', name: 'Сопоставление', nameKz: 'Сәйкестендіру', nameRu: 'Сопоставление', nameEn: 'Matching', orderIndex: 6 },
    { code: 'FILL_IN_BLANK', name: 'Заполнить пропуск', nameKz: 'Бос орынды толтыру', nameRu: 'Заполнить пропуск', nameEn: 'Fill in Blank', orderIndex: 7 },
  ];
  for (const type of questionTypes) {
    await prisma.refQuestionType.upsert({
      where: { code: type.code },
      update: { name: type.name, nameKz: type.nameKz, nameRu: type.nameRu, nameEn: type.nameEn, orderIndex: type.orderIndex },
      create: type,
    });
    console.log(`Created question type: ${type.name}`);
  }

  // Форматы заданий
  console.log('\nCreating task formats...');
  const taskFormats = [
    { code: 'INTERACTIVE', name: 'Интерактивный', nameKz: 'Интерактивті', nameRu: 'Интерактивный', nameEn: 'Interactive', orderIndex: 1 },
    { code: 'DOCUMENT', name: 'Документ', nameKz: 'Құжат', nameRu: 'Документ', nameEn: 'Document', orderIndex: 2 },
    { code: 'VIDEO', name: 'Видео', nameKz: 'Бейне', nameRu: 'Видео', nameEn: 'Video', orderIndex: 3 },
    { code: 'AUDIO', name: 'Аудио', nameKz: 'Аудио', nameRu: 'Аудио', nameEn: 'Audio', orderIndex: 4 },
    { code: 'PRESENTATION', name: 'Презентация', nameKz: 'Презентация', nameRu: 'Презентация', nameEn: 'Presentation', orderIndex: 5 },
  ];
  for (const format of taskFormats) {
    await prisma.refTaskFormat.upsert({
      where: { code: format.code },
      update: { name: format.name, nameKz: format.nameKz, nameRu: format.nameRu, nameEn: format.nameEn, orderIndex: format.orderIndex },
      create: format,
    });
    console.log(`Created task format: ${format.name}`);
  }

  // Типы уроков
  console.log('\nCreating lesson types...');
  const lessonTypes = [
    { code: 'LECTURE', name: 'Лекция', nameKz: 'Лекция', nameRu: 'Лекция', nameEn: 'Lecture', orderIndex: 1 },
    { code: 'PRACTICE', name: 'Практика', nameKz: 'Практика', nameRu: 'Практика', nameEn: 'Practice', orderIndex: 2 },
    { code: 'SEMINAR', name: 'Семинар', nameKz: 'Семинар', nameRu: 'Семинар', nameEn: 'Seminar', orderIndex: 3 },
    { code: 'LAB', name: 'Лабораторная', nameKz: 'Зертханалық', nameRu: 'Лабораторная', nameEn: 'Lab', orderIndex: 4 },
    { code: 'CONSULTATION', name: 'Консультация', nameKz: 'Кеңес', nameRu: 'Консультация', nameEn: 'Consultation', orderIndex: 5 },
    { code: 'EXAM', name: 'Экзамен', nameKz: 'Емтихан', nameRu: 'Экзамен', nameEn: 'Exam', orderIndex: 6 },
  ];
  for (const type of lessonTypes) {
    await prisma.refLessonType.upsert({
      where: { code: type.code },
      update: { name: type.name, nameKz: type.nameKz, nameRu: type.nameRu, nameEn: type.nameEn, orderIndex: type.orderIndex },
      create: type,
    });
    console.log(`Created lesson type: ${type.name}`);
  }

  // Уровни сложности
  console.log('\nCreating difficulty levels...');
  const difficultyLevels = [
    { code: 'EASY', name: 'Легкий', nameKz: 'Жеңіл', nameRu: 'Легкий', nameEn: 'Easy', orderIndex: 1 },
    { code: 'MEDIUM', name: 'Средний', nameKz: 'Орташа', nameRu: 'Средний', nameEn: 'Medium', orderIndex: 2 },
    { code: 'HARD', name: 'Сложный', nameKz: 'Қиын', nameRu: 'Сложный', nameEn: 'Hard', orderIndex: 3 },
    { code: 'EXPERT', name: 'Экспертный', nameKz: 'Сарапшылық', nameRu: 'Экспертный', nameEn: 'Expert', orderIndex: 4 },
  ];
  for (const level of difficultyLevels) {
    await prisma.refDifficultyLevel.upsert({
      where: { code: level.code },
      update: { name: level.name, nameKz: level.nameKz, nameRu: level.nameRu, nameEn: level.nameEn, orderIndex: level.orderIndex },
      create: level,
    });
    console.log(`Created difficulty level: ${level.name}`);
  }

  // Форматы генерируемых тестов
  console.log('\nCreating generated test formats...');
  const generatedTestFormats = [
    { code: 'PDF', name: 'PDF документ', nameKz: 'PDF құжат', nameRu: 'PDF документ', nameEn: 'PDF Document', orderIndex: 1 },
    { code: 'WORD', name: 'Word документ', nameKz: 'Word құжат', nameRu: 'Word документ', nameEn: 'Word Document', orderIndex: 2 },
    { code: 'ONLINE', name: 'Онлайн тест', nameKz: 'Онлайн тест', nameRu: 'Онлайн тест', nameEn: 'Online Test', orderIndex: 3 },
    { code: 'PRINT', name: 'Для печати', nameKz: 'Басып шығаруға', nameRu: 'Для печати', nameEn: 'Print', orderIndex: 4 },
  ];
  for (const format of generatedTestFormats) {
    await prisma.refGeneratedTestFormat.upsert({
      where: { code: format.code },
      update: { name: format.name, nameKz: format.nameKz, nameRu: format.nameRu, nameEn: format.nameEn, orderIndex: format.orderIndex },
      create: format,
    });
    console.log(`Created generated test format: ${format.name}`);
  }

  // Типы ресурсов
  console.log('\nCreating resource types...');
  const resourceTypes = [
    { code: 'VIDEO', name: 'Видео', nameKz: 'Бейне', nameRu: 'Видео', nameEn: 'Video', icon: '🎬', orderIndex: 1 },
    { code: 'DOCUMENT', name: 'Документ', nameKz: 'Құжат', nameRu: 'Документ', nameEn: 'Document', icon: '📄', orderIndex: 2 },
    { code: 'IMAGE', name: 'Изображение', nameKz: 'Сурет', nameRu: 'Изображение', nameEn: 'Image', icon: '🖼️', orderIndex: 3 },
    { code: 'AUDIO', name: 'Аудио', nameKz: 'Аудио', nameRu: 'Аудио', nameEn: 'Audio', icon: '🎵', orderIndex: 4 },
    { code: 'LINK', name: 'Ссылка', nameKz: 'Сілтеме', nameRu: 'Ссылка', nameEn: 'Link', icon: '🔗', orderIndex: 5 },
    { code: 'FILE', name: 'Файл', nameKz: 'Файл', nameRu: 'Файл', nameEn: 'File', icon: '📁', orderIndex: 6 },
  ];
  for (const type of resourceTypes) {
    await prisma.refResourceType.upsert({
      where: { code: type.code },
      update: { name: type.name, nameKz: type.nameKz, nameRu: type.nameRu, nameEn: type.nameEn, icon: type.icon, orderIndex: type.orderIndex },
      create: type,
    });
    console.log(`Created resource type: ${type.name}`);
  }

  // Типы уведомлений
  console.log('\nCreating notification types...');
  const notificationTypes = [
    { code: 'INFO', name: 'Информация', nameKz: 'Ақпарат', nameRu: 'Информация', nameEn: 'Info', icon: 'ℹ️', orderIndex: 1 },
    { code: 'WARNING', name: 'Предупреждение', nameKz: 'Ескерту', nameRu: 'Предупреждение', nameEn: 'Warning', icon: '⚠️', orderIndex: 2 },
    { code: 'SUCCESS', name: 'Успех', nameKz: 'Сәттілік', nameRu: 'Успех', nameEn: 'Success', icon: '✅', orderIndex: 3 },
    { code: 'ERROR', name: 'Ошибка', nameKz: 'Қате', nameRu: 'Ошибка', nameEn: 'Error', icon: '❌', orderIndex: 4 },
    { code: 'REMINDER', name: 'Напоминание', nameKz: 'Еске салу', nameRu: 'Напоминание', nameEn: 'Reminder', icon: '🔔', orderIndex: 5 },
    { code: 'MESSAGE', name: 'Сообщение', nameKz: 'Хабарлама', nameRu: 'Сообщение', nameEn: 'Message', icon: '✉️', orderIndex: 6 },
  ];
  for (const type of notificationTypes) {
    await prisma.refNotificationType.upsert({
      where: { code: type.code },
      update: { name: type.name, nameKz: type.nameKz, nameRu: type.nameRu, nameEn: type.nameEn, icon: type.icon, orderIndex: type.orderIndex },
      create: type,
    });
    console.log(`Created notification type: ${type.name}`);
  }

  // Типы транзакций
  console.log('\nCreating transaction types...');
  const transactionTypes = [
    { code: 'PAYMENT', name: 'Оплата', nameKz: 'Төлем', nameRu: 'Оплата', nameEn: 'Payment', orderIndex: 1 },
    { code: 'REFUND', name: 'Возврат', nameKz: 'Қайтару', nameRu: 'Возврат', nameEn: 'Refund', orderIndex: 2 },
    { code: 'SALARY', name: 'Зарплата', nameKz: 'Жалақы', nameRu: 'Зарплата', nameEn: 'Salary', orderIndex: 3 },
    { code: 'BONUS', name: 'Бонус', nameKz: 'Бонус', nameRu: 'Бонус', nameEn: 'Bonus', orderIndex: 4 },
    { code: 'PENALTY', name: 'Штраф', nameKz: 'Айыппұл', nameRu: 'Штраф', nameEn: 'Penalty', orderIndex: 5 },
    { code: 'TRANSFER', name: 'Перевод', nameKz: 'Аударым', nameRu: 'Перевод', nameEn: 'Transfer', orderIndex: 6 },
  ];
  for (const type of transactionTypes) {
    await prisma.refTransactionType.upsert({
      where: { code: type.code },
      update: { name: type.name, nameKz: type.nameKz, nameRu: type.nameRu, nameEn: type.nameEn, orderIndex: type.orderIndex },
      create: type,
    });
    console.log(`Created transaction type: ${type.name}`);
  }

  // Форматы зарплаты
  console.log('\nCreating salary formats...');
  const salaryFormats = [
    { code: 'HOURLY', name: 'Почасовая', nameKz: 'Сағаттық', nameRu: 'Почасовая', nameEn: 'Hourly', orderIndex: 1 },
    { code: 'FIXED', name: 'Фиксированная', nameKz: 'Тұрақты', nameRu: 'Фиксированная', nameEn: 'Fixed', orderIndex: 2 },
    { code: 'PER_STUDENT', name: 'За ученика', nameKz: 'Оқушыға', nameRu: 'За ученика', nameEn: 'Per Student', orderIndex: 3 },
    { code: 'PERCENTAGE', name: 'Процент', nameKz: 'Пайыз', nameRu: 'Процент', nameEn: 'Percentage', orderIndex: 4 },
  ];
  for (const format of salaryFormats) {
    await prisma.refSalaryFormat.upsert({
      where: { code: format.code },
      update: { name: format.name, nameKz: format.nameKz, nameRu: format.nameRu, nameEn: format.nameEn, orderIndex: format.orderIndex },
      create: format,
    });
    console.log(`Created salary format: ${format.name}`);
  }

  // Способы оплаты
  console.log('\nCreating payment methods...');
  const paymentMethods = [
    { code: 'CASH', name: 'Наличные', nameKz: 'Қолма-қол', nameRu: 'Наличные', nameEn: 'Cash', orderIndex: 1 },
    { code: 'CARD', name: 'Карта', nameKz: 'Карта', nameRu: 'Карта', nameEn: 'Card', orderIndex: 2 },
    { code: 'TRANSFER', name: 'Перевод', nameKz: 'Аударым', nameRu: 'Перевод', nameEn: 'Transfer', orderIndex: 3 },
    { code: 'KASPI', name: 'Kaspi', nameKz: 'Kaspi', nameRu: 'Kaspi', nameEn: 'Kaspi', orderIndex: 4 },
    { code: 'HALYK', name: 'Halyk', nameKz: 'Halyk', nameRu: 'Halyk', nameEn: 'Halyk', orderIndex: 5 },
  ];
  for (const method of paymentMethods) {
    await prisma.refPaymentMethod.upsert({
      where: { code: method.code },
      update: { name: method.name, nameKz: method.nameKz, nameRu: method.nameRu, nameEn: method.nameEn, orderIndex: method.orderIndex },
      create: method,
    });
    console.log(`Created payment method: ${method.name}`);
  }

  // Планы оплаты
  console.log('\nCreating payment plans...');
  const paymentPlans = [
    { code: 'FULL', name: 'Полная оплата', nameKz: 'Толық төлем', nameRu: 'Полная оплата', nameEn: 'Full Payment', orderIndex: 1 },
    { code: 'MONTHLY', name: 'Ежемесячно', nameKz: 'Ай сайын', nameRu: 'Ежемесячно', nameEn: 'Monthly', orderIndex: 2 },
    { code: 'QUARTERLY', name: 'Ежеквартально', nameKz: 'Тоқсан сайын', nameRu: 'Ежеквартально', nameEn: 'Quarterly', orderIndex: 3 },
    { code: 'INSTALLMENT', name: 'Рассрочка', nameKz: 'Бөліп төлеу', nameRu: 'Рассрочка', nameEn: 'Installment', orderIndex: 4 },
  ];
  for (const plan of paymentPlans) {
    await prisma.refPaymentPlan.upsert({
      where: { code: plan.code },
      update: { name: plan.name, nameKz: plan.nameKz, nameRu: plan.nameRu, nameEn: plan.nameEn, orderIndex: plan.orderIndex },
      create: plan,
    });
    console.log(`Created payment plan: ${plan.name}`);
  }

  // Время суток
  console.log('\nCreating time of day...');
  const timeOfDayItems = [
    { code: 'MORNING', name: 'Утро', nameKz: 'Таң', nameRu: 'Утро', nameEn: 'Morning', orderIndex: 1 },
    { code: 'AFTERNOON', name: 'День', nameKz: 'Күн', nameRu: 'День', nameEn: 'Afternoon', orderIndex: 2 },
    { code: 'EVENING', name: 'Вечер', nameKz: 'Кеш', nameRu: 'Вечер', nameEn: 'Evening', orderIndex: 3 },
  ];
  for (const item of timeOfDayItems) {
    await prisma.refTimeOfDay.upsert({
      where: { code: item.code },
      update: { name: item.name, nameKz: item.nameKz, nameRu: item.nameRu, nameEn: item.nameEn, orderIndex: item.orderIndex },
      create: item,
    });
    console.log(`Created time of day: ${item.name}`);
  }

  console.log('\nEnum seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
