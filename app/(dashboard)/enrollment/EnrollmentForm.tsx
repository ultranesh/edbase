'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DateInput from '../components/DateInput';
import { useNotification } from '@/app/components/ui/NotificationProvider';

interface EnrollmentFormProps {
  coordinatorId: string;
}

interface RefOption {
  id: string;
  name: string;
  code?: string;
}

interface Branch {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
}

// Helper: Auto-capitalize first letter of each word
const capitalizeWords = (value: string): string => {
  return value
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Helper: Format phone number as +7 XXX XXX XX XX
const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  let formatted = '';

  if (digits.length === 0) return '';

  // Always start with +7
  if (digits.startsWith('8') || digits.startsWith('7')) {
    formatted = '+7';
    const rest = digits.slice(1);
    if (rest.length > 0) formatted += ' ' + rest.slice(0, 3);
    if (rest.length > 3) formatted += ' ' + rest.slice(3, 6);
    if (rest.length > 6) formatted += ' ' + rest.slice(6, 8);
    if (rest.length > 8) formatted += ' ' + rest.slice(8, 10);
  } else {
    formatted = '+7';
    if (digits.length > 0) formatted += ' ' + digits.slice(0, 3);
    if (digits.length > 3) formatted += ' ' + digits.slice(3, 6);
    if (digits.length > 6) formatted += ' ' + digits.slice(6, 8);
    if (digits.length > 8) formatted += ' ' + digits.slice(8, 10);
  }

  return formatted;
};

// Helper: Format IIN as XXXXXX XXXXXX
const formatIIN = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 12);
  if (digits.length <= 6) return digits;
  return digits.slice(0, 6) + ' ' + digits.slice(6);
};

// Helper: Extract raw IIN (without spaces)
const getRawIIN = (value: string): string => {
  return value.replace(/\D/g, '').slice(0, 12);
};

// Helper: Extract date of birth from IIN
const extractDOBFromIIN = (iin: string): string => {
  const raw = getRawIIN(iin);
  if (raw.length < 6) return '';

  const yearPrefix = raw.slice(0, 2);
  const month = raw.slice(2, 4);
  const day = raw.slice(4, 6);

  // Determine century: if yearPrefix >= 00 && <= 24, it's 2000s, otherwise 1900s
  const yearNum = parseInt(yearPrefix);
  const fullYear = yearNum <= 24 ? '20' + yearPrefix : '19' + yearPrefix;

  // Validate month and day
  const monthNum = parseInt(month);
  const dayNum = parseInt(day);
  if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) return '';

  return `${fullYear}-${month}-${day}`;
};

// Helper: Format ID card document (XXX XXX XXX)
const formatIDCard = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 9);
  let formatted = digits.slice(0, 3);
  if (digits.length > 3) formatted += ' ' + digits.slice(3, 6);
  if (digits.length > 6) formatted += ' ' + digits.slice(6, 9);
  return formatted;
};

// Helper: Format RK Passport (N + 8 digits)
const formatRKPassport = (value: string): string => {
  // Remove everything except N and digits
  let clean = value.toUpperCase();
  if (!clean.startsWith('N')) {
    clean = 'N' + clean.replace(/[^0-9]/g, '');
  } else {
    clean = 'N' + clean.slice(1).replace(/[^0-9]/g, '');
  }
  return clean.slice(0, 9); // N + 8 digits
};

// Helper: Format currency with thousand separators (1 234 567)
const formatCurrency = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

// Helper: Parse currency to raw number string
const parseCurrency = (value: string): string => {
  return value.replace(/\s/g, '');
};

export default function EnrollmentForm({ coordinatorId }: EnrollmentFormProps) {
  const router = useRouter();
  const { showToast } = useNotification();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Reference data from database
  const [gradeLevels, setGradeLevels] = useState<RefOption[]>([]);
  const [languages, setLanguages] = useState<RefOption[]>([]);
  const [studyDirections, setStudyDirections] = useState<RefOption[]>([]);
  const [cities, setCities] = useState<RefOption[]>([]);
  const [schools, setSchools] = useState<RefOption[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [specialNeeds, setSpecialNeeds] = useState<RefOption[]>([]);

  // Step 1: Personal Information
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [studentIIN, setStudentIIN] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [address, setAddress] = useState('');
  const [cityId, setCityId] = useState('');

  // Parent Information
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentIIN, setParentIIN] = useState('');
  const [parentDateOfBirth, setParentDateOfBirth] = useState('');
  const [parentDocumentType, setParentDocumentType] = useState<'ID_CARD' | 'RK_PASSPORT' | 'FOREIGN'>('ID_CARD');
  const [parentDocumentNumber, setParentDocumentNumber] = useState('');

  // Step 2: Academic Information
  const [gradeLevelId, setGradeLevelId] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [languageId, setLanguageId] = useState('');
  const [studyDirectionId, setStudyDirectionId] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedSpecialNeeds, setSelectedSpecialNeeds] = useState<string[]>([]);
  const [allergy, setAllergy] = useState('');

  // Step 3: Branch, Format, Diagnostics
  const [branchId, setBranchId] = useState('');
  const [studyFormat, setStudyFormat] = useState('');
  const [guarantee, setGuarantee] = useState('');
  const [studySchedule, setStudySchedule] = useState<'PSP' | 'VCS' | 'CUSTOM'>('PSP');
  const [customDays, setCustomDays] = useState<string[]>([]);
  const [firstDiagnosticId, setFirstDiagnosticId] = useState('');
  const [careerOrientationResult, setCareerOrientationResult] = useState('');

  // Step 4: Subscription & Payment
  const [paymentPlan, setPaymentPlan] = useState<'ONE_TRANCHE' | 'TWO_TRANCHES' | 'THREE_TRANCHES'>('ONE_TRANCHE');
  const [startDate, setStartDate] = useState('');
  const [standardMonths, setStandardMonths] = useState<number | ''>('');
  const [bonusMonths, setBonusMonths] = useState<number | ''>('');
  const [intensiveMonths, setIntensiveMonths] = useState<number | ''>('');
  const [freezeDays, setFreezeDays] = useState<number | ''>('');
  const [calculatedEndDate, setCalculatedEndDate] = useState('');

  // Payment
  const [tranche1Amount, setTranche1Amount] = useState('');
  const [tranche1Date, setTranche1Date] = useState('');
  const [tranche2Amount, setTranche2Amount] = useState('');
  const [tranche2Date, setTranche2Date] = useState('');
  const [tranche3Amount, setTranche3Amount] = useState('');
  const [tranche3Date, setTranche3Date] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');

  // Auto-extract DOB from student IIN
  useEffect(() => {
    const rawIIN = getRawIIN(studentIIN);
    if (rawIIN.length >= 6) {
      const dob = extractDOBFromIIN(rawIIN);
      if (dob) {
        setDateOfBirth(dob);
      }
    }
  }, [studentIIN]);

  // Auto-extract DOB from parent IIN
  useEffect(() => {
    const rawIIN = getRawIIN(parentIIN);
    if (rawIIN.length >= 6) {
      const dob = extractDOBFromIIN(rawIIN);
      if (dob) {
        setParentDateOfBirth(dob);
      }
    }
  }, [parentIIN]);

  // Fetch reference data
  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        const [
          gradeLevelsRes,
          languagesRes,
          studyDirectionsRes,
          citiesRes,
          schoolsRes,
          branchesRes,
          subjectsRes,
          specialNeedsRes,
        ] = await Promise.all([
          fetch('/api/database/grade-levels'),
          fetch('/api/database/languages'),
          fetch('/api/database/study-directions'),
          fetch('/api/database/cities'),
          fetch('/api/database/schools'),
          fetch('/api/database/branches'),
          fetch('/api/database/subjects'),
          fetch('/api/database/special-needs'),
        ]);

        if (gradeLevelsRes.ok) setGradeLevels(await gradeLevelsRes.json());
        if (languagesRes.ok) setLanguages(await languagesRes.json());
        if (studyDirectionsRes.ok) setStudyDirections(await studyDirectionsRes.json());
        if (citiesRes.ok) setCities(await citiesRes.json());
        if (schoolsRes.ok) setSchools(await schoolsRes.json());
        if (branchesRes.ok) setBranches(await branchesRes.json());
        if (subjectsRes.ok) setSubjects(await subjectsRes.json());
        if (specialNeedsRes.ok) setSpecialNeeds(await specialNeedsRes.json());
      } catch (error) {
        console.error('Error fetching reference data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReferenceData();
  }, []);

  // Calculate end date
  useEffect(() => {
    if (startDate) {
      const totalMonths = (standardMonths || 0) + (bonusMonths || 0) + (intensiveMonths || 0);
      const start = new Date(startDate);
      const end = new Date(start);
      end.setMonth(end.getMonth() + totalMonths);
      setCalculatedEndDate(end.toISOString().split('T')[0]);
    }
  }, [startDate, standardMonths, bonusMonths, intensiveMonths]);

  // Auto-calculate total amount from tranches
  useEffect(() => {
    const t1 = parseFloat(tranche1Amount) || 0;
    const t2 = paymentPlan !== 'ONE_TRANCHE' ? (parseFloat(tranche2Amount) || 0) : 0;
    const t3 = paymentPlan === 'THREE_TRANCHES' ? (parseFloat(tranche3Amount) || 0) : 0;
    const total = t1 + t2 + t3;
    if (total > 0) {
      setTotalAmount(total.toString());
    }
  }, [tranche1Amount, tranche2Amount, tranche3Amount, paymentPlan]);

  // Auto-calculate monthly cost (total / standard months)
  useEffect(() => {
    const total = parseFloat(totalAmount) || 0;
    const months = standardMonths || 0;
    if (total > 0 && months > 0) {
      const monthly = Math.round(total / months);
      setMonthlyPayment(monthly.toString());
    }
  }, [totalAmount, standardMonths]);

  // Handle name input with auto-capitalize
  const handleNameChange = (value: string, setter: (v: string) => void) => {
    setter(capitalizeWords(value));
  };

  // Handle phone input with mask
  const handlePhoneChange = (value: string, setter: (v: string) => void) => {
    setter(formatPhone(value));
  };

  // Handle IIN input with mask
  const handleIINChange = (value: string, setter: (v: string) => void) => {
    setter(formatIIN(value));
  };

  // Handle parent document number based on type
  const handleParentDocumentChange = (value: string) => {
    switch (parentDocumentType) {
      case 'ID_CARD':
        setParentDocumentNumber(formatIDCard(value));
        break;
      case 'RK_PASSPORT':
        setParentDocumentNumber(formatRKPassport(value));
        break;
      case 'FOREIGN':
        setParentDocumentNumber(value);
        break;
    }
  };

  // Reset document number when type changes
  const handleDocumentTypeChange = (type: 'ID_CARD' | 'RK_PASSPORT' | 'FOREIGN') => {
    setParentDocumentType(type);
    setParentDocumentNumber('');
  };

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subjectId)
        ? prev.filter(s => s !== subjectId)
        : [...prev, subjectId]
    );
  };

  const toggleCustomDay = (day: string) => {
    setCustomDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  // Get schedule display string
  const getScheduleDisplay = () => {
    if (studySchedule === 'PSP') return 'ПСП';
    if (studySchedule === 'VCS') return 'ВЧС';
    if (studySchedule === 'CUSTOM' && customDays.length > 0) {
      const dayOrder = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
      const sortedDays = customDays.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
      return 'Особый-' + sortedDays.join('');
    }
    return 'Особый';
  };

  const toggleSpecialNeed = (needId: string) => {
    setSelectedSpecialNeeds(prev =>
      prev.includes(needId)
        ? prev.filter(n => n !== needId)
        : [...prev, needId]
    );
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!firstName || !lastName || !studentIIN || !parentName || !parentPhone || !parentIIN || !parentDocumentNumber) {
        showToast({ message: 'Пожалуйста, заполните все обязательные поля', type: 'warning' });
        return;
      }
    } else if (currentStep === 2) {
      if (!gradeLevelId || !languageId || !studyDirectionId) {
        showToast({ message: 'Пожалуйста, выберите класс, язык и направление обучения', type: 'warning' });
        return;
      }
    } else if (currentStep === 3) {
      if (!studyFormat || !guarantee) {
        showToast({ message: 'Пожалуйста, выберите формат обучения и гарантию', type: 'warning' });
        return;
      }
    }
    setCurrentStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const data = {
      // Personal info
      firstName,
      lastName,
      middleName: middleName || null,
      dateOfBirth: dateOfBirth || null,
      gender: gender || null,
      studentIIN: getRawIIN(studentIIN),
      studentPhone: studentPhone.replace(/\D/g, '') || null,
      address: address || null,
      cityId: cityId || null,
      parentName,
      parentPhone: parentPhone.replace(/\D/g, ''),
      parentIIN: getRawIIN(parentIIN),
      parentDocumentType,
      parentDocumentNumber: parentDocumentNumber.replace(/\s/g, ''),

      // Academic
      gradeLevelId,
      schoolId: schoolId || null,
      languageId,
      studyDirectionId,
      subjects: selectedSubjects,
      specialNeeds: selectedSpecialNeeds,
      allergy: allergy || null,

      // Branch & Format
      branchId: branchId || null,
      studyFormat,
      guarantee,
      studySchedule,
      customDays: studySchedule === 'CUSTOM' ? customDays : null,
      firstDiagnosticId: firstDiagnosticId || null,
      careerOrientationResult: careerOrientationResult || null,

      // Subscription
      standardMonths: standardMonths || 0,
      bonusMonths: bonusMonths || 0,
      intensiveMonths: intensiveMonths || 0,
      freezeDays: freezeDays || 0,

      // Payment
      paymentPlan,
      tranche1Amount: parseFloat(tranche1Amount) || null,
      tranche1Date: tranche1Date || null,
      tranche2Amount: paymentPlan !== 'ONE_TRANCHE' ? parseFloat(tranche2Amount) || null : null,
      tranche2Date: paymentPlan !== 'ONE_TRANCHE' ? tranche2Date || null : null,
      tranche3Amount: paymentPlan === 'THREE_TRANCHES' ? parseFloat(tranche3Amount) || null : null,
      tranche3Date: paymentPlan === 'THREE_TRANCHES' ? tranche3Date || null : null,
      totalAmount: parseFloat(totalAmount),
      monthlyPayment: parseFloat(monthlyPayment),

      // Study period
      studyStartDate: startDate,
      studyEndDate: calculatedEndDate,

      coordinatorId,
    };

    try {
      const response = await fetch('/api/enrollment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        showToast({ message: 'Ученик успешно зачислен', type: 'success' });
        router.push('/students');
        router.refresh();
      } else {
        const errorData = await response.json();
        showToast({ message: errorData.error || 'Ошибка при зачислении ученика', type: 'error' });
      }
    } catch (error) {
      console.error(error);
      showToast({ message: 'Ошибка при зачислении ученика', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all hover:border-gray-300 text-gray-900 placeholder-gray-400";
  const selectClass = "w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all hover:border-gray-300 text-gray-900 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%228%22%20viewBox%3D%220%200%2012%208%22%3E%3Cpath%20fill%3D%22%236B7280%22%20d%3D%22M1.41%200L6%204.59%2010.59%200%2012%201.41l-6%206-6-6z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px_12px] bg-[position:right_1rem_center] bg-no-repeat pr-10";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";
  const requiredClass = "text-red-500 ml-0.5";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Step indicators */}
      <div className="flex items-center justify-center gap-2 mb-10">
        {[
          { step: 1, label: 'Личные данные' },
          { step: 2, label: 'Обучение' },
          { step: 3, label: 'Филиал и формат' },
          { step: 4, label: 'Оплата' },
        ].map((item, index) => (
          <div key={item.step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm transition-all ${
                currentStep === item.step
                  ? 'bg-gray-900 text-white shadow-lg'
                  : currentStep > item.step
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {currentStep > item.step ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : item.step}
              </div>
              <span className={`text-xs mt-1.5 font-medium ${
                currentStep === item.step ? 'text-gray-900' : 'text-gray-500'
              }`}>{item.label}</span>
            </div>
            {index < 3 && (
              <div className={`w-20 h-0.5 mx-3 mt-[-20px] ${
                currentStep > item.step ? 'bg-green-500' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Step 1: Personal Information */}
        {currentStep === 1 && (
          <div className="space-y-6">
            {/* Student Info */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-sm">👤</span>
                Данные ученика
              </h2>

              <div className="grid grid-cols-3 gap-5">
                <div>
                  <label className={labelClass}>
                    Фамилия<span className={requiredClass}>*</span>
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => handleNameChange(e.target.value, setLastName)}
                    required
                    placeholder="Алькей"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Имя<span className={requiredClass}>*</span>
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => handleNameChange(e.target.value, setFirstName)}
                    required
                    placeholder="Маргулан"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Отчество</label>
                  <input
                    type="text"
                    value={middleName}
                    onChange={(e) => handleNameChange(e.target.value, setMiddleName)}
                    placeholder="Хаканович"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    ИИН ученика<span className={requiredClass}>*</span>
                  </label>
                  <input
                    type="text"
                    value={studentIIN}
                    onChange={(e) => handleIINChange(e.target.value, setStudentIIN)}
                    required
                    placeholder="000000 000000"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Дата рождения</label>
                  <div className="px-4 py-3 bg-gray-50 text-gray-800 font-medium rounded-xl text-sm border border-gray-200">
                    {dateOfBirth
                      ? new Date(dateOfBirth).toLocaleDateString('ru-RU')
                      : 'Определится по ИИН'}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Пол</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Выберите пол</option>
                    <option value="MALE">Мужской</option>
                    <option value="FEMALE">Женский</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Телефон ученика</label>
                  <input
                    type="tel"
                    value={studentPhone}
                    onChange={(e) => handlePhoneChange(e.target.value, setStudentPhone)}
                    placeholder="+7 700 200 21 21"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Город</label>
                  <select
                    value={cityId}
                    onChange={(e) => setCityId(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Выберите город</option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.id}>{city.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Адрес проживания</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="ул. Примерная, д. 1, кв. 1"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Parent Info */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center text-sm">👨‍👩‍👧</span>
                Данные родителя
              </h2>

              <div className="grid grid-cols-3 gap-5">
                <div>
                  <label className={labelClass}>
                    ФИО родителя<span className={requiredClass}>*</span>
                  </label>
                  <input
                    type="text"
                    value={parentName}
                    onChange={(e) => handleNameChange(e.target.value, setParentName)}
                    required
                    placeholder="Байтурсунов Ахмет"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Телефон родителя<span className={requiredClass}>*</span>
                  </label>
                  <input
                    type="tel"
                    value={parentPhone}
                    onChange={(e) => handlePhoneChange(e.target.value, setParentPhone)}
                    required
                    placeholder="+7 700 200 21 21"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    ИИН родителя<span className={requiredClass}>*</span>
                  </label>
                  <input
                    type="text"
                    value={parentIIN}
                    onChange={(e) => handleIINChange(e.target.value, setParentIIN)}
                    required
                    placeholder="000000 000000"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Дата рождения родителя</label>
                  <div className="px-4 py-3 bg-gray-50 text-gray-800 font-medium rounded-xl text-sm border border-gray-200">
                    {parentDateOfBirth
                      ? new Date(parentDateOfBirth).toLocaleDateString('ru-RU')
                      : 'Определится по ИИН'}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>
                    Тип документа<span className={requiredClass}>*</span>
                  </label>
                  <select
                    value={parentDocumentType}
                    onChange={(e) => handleDocumentTypeChange(e.target.value as 'ID_CARD' | 'RK_PASSPORT' | 'FOREIGN')}
                    className={selectClass}
                  >
                    <option value="ID_CARD">Удостоверение личности</option>
                    <option value="RK_PASSPORT">Паспорт гражданина РК</option>
                    <option value="FOREIGN">Иностранный документ</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>
                    Номер документа<span className={requiredClass}>*</span>
                  </label>
                  <input
                    type="text"
                    value={parentDocumentNumber}
                    onChange={(e) => handleParentDocumentChange(e.target.value)}
                    required
                    placeholder={
                      parentDocumentType === 'ID_CARD' ? '000 000 000' :
                      parentDocumentType === 'RK_PASSPORT' ? 'N00000000' :
                      'Номер документа'
                    }
                    className={inputClass}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {parentDocumentType === 'ID_CARD' && '9 цифр через пробел'}
                    {parentDocumentType === 'RK_PASSPORT' && 'Буква N + 8 цифр'}
                    {parentDocumentType === 'FOREIGN' && 'Любой формат'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={handleNextStep}
                className="px-8 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
              >
                Далее
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Academic Information */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center text-sm">📚</span>
                Учебная информация
              </h2>

              <div className="grid grid-cols-2 gap-5 mb-6">
                <div>
                  <label className={labelClass}>
                    Класс<span className={requiredClass}>*</span>
                  </label>
                  <select
                    value={gradeLevelId}
                    onChange={(e) => setGradeLevelId(e.target.value)}
                    required
                    className={selectClass}
                  >
                    <option value="">Выберите класс</option>
                    {gradeLevels.map((level) => (
                      <option key={level.id} value={level.id}>{level.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Школа</label>
                  <select
                    value={schoolId}
                    onChange={(e) => setSchoolId(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Выберите школу</option>
                    {schools.map((school) => (
                      <option key={school.id} value={school.id}>{school.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>
                    Язык обучения<span className={requiredClass}>*</span>
                  </label>
                  <select
                    value={languageId}
                    onChange={(e) => setLanguageId(e.target.value)}
                    required
                    className={selectClass}
                  >
                    <option value="">Выберите язык</option>
                    {languages.map((lang) => (
                      <option key={lang.id} value={lang.id}>{lang.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>
                    Направление обучения<span className={requiredClass}>*</span>
                  </label>
                  <select
                    value={studyDirectionId}
                    onChange={(e) => setStudyDirectionId(e.target.value)}
                    required
                    className={selectClass}
                  >
                    <option value="">Выберите направление</option>
                    {studyDirections.map((dir) => (
                      <option key={dir.id} value={dir.id}>{dir.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Subjects */}
              <div className="mb-6">
                <label className={labelClass}>Предметы в абонементе</label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {subjects.map((subject) => (
                    <label
                      key={subject.id}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${
                        selectedSubjects.includes(subject.id)
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSubjects.includes(subject.id)}
                        onChange={() => toggleSubject(subject.id)}
                        className="hidden"
                      />
                      <span className="text-sm">{subject.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Special Needs */}
              <div className="mb-6">
                <label className={labelClass}>Особые потребности</label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {specialNeeds.map((need) => (
                    <label
                      key={need.id}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${
                        selectedSpecialNeeds.includes(need.id)
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSpecialNeeds.includes(need.id)}
                        onChange={() => toggleSpecialNeed(need.id)}
                        className="hidden"
                      />
                      <span className="text-sm">{need.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>Аллергии / Особенности здоровья</label>
                <textarea
                  value={allergy}
                  onChange={(e) => setAllergy(e.target.value)}
                  placeholder="Укажите аллергии или особенности здоровья, если есть"
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-8 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Назад
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="px-8 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
              >
                Далее
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Branch, Format, Diagnostics */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center text-sm">🏫</span>
                Филиал и условия обучения
              </h2>

              <div className="grid grid-cols-2 gap-5 mb-6">
                <div>
                  <label className={labelClass}>Филиал</label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Выберите филиал</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>
                    Формат обучения<span className={requiredClass}>*</span>
                  </label>
                  <select
                    value={studyFormat}
                    onChange={(e) => setStudyFormat(e.target.value)}
                    required
                    className={selectClass}
                  >
                    <option value="">Выберите формат</option>
                    <option value="ONLINE_GROUP">Онлайн (группа)</option>
                    <option value="ONLINE_INDIVIDUAL">Онлайн (индивидуально)</option>
                    <option value="OFFLINE_GROUP">Оффлайн (группа)</option>
                    <option value="OFFLINE_INDIVIDUAL">Оффлайн (индивидуально)</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>
                    Гарантия<span className={requiredClass}>*</span>
                  </label>
                  <select
                    value={guarantee}
                    onChange={(e) => setGuarantee(e.target.value)}
                    required
                    className={selectClass}
                  >
                    <option value="">Выберите гарантию</option>
                    <option value="NONE">Без гарантии</option>
                    <option value="FIFTY_PERCENT">50%</option>
                    <option value="EIGHTY_PERCENT">80%</option>
                    <option value="HUNDRED_PERCENT">100%</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>
                    Дни обучения<span className={requiredClass}>*</span>
                  </label>
                  <select
                    value={studySchedule}
                    onChange={(e) => {
                      setStudySchedule(e.target.value as 'PSP' | 'VCS' | 'CUSTOM');
                      if (e.target.value !== 'CUSTOM') setCustomDays([]);
                    }}
                    className={selectClass}
                  >
                    <option value="PSP">ПСП (Пн-Ср-Пт)</option>
                    <option value="VCS">ВЧС (Вт-Чт-Сб)</option>
                    <option value="CUSTOM">Особый</option>
                  </select>
                </div>
              </div>

              {/* Custom days selection */}
              {studySchedule === 'CUSTOM' && (
                <div className="mt-4">
                  <label className={labelClass}>Выберите дни</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => (
                      <label
                        key={day}
                        className={`flex items-center justify-center w-12 h-10 rounded-lg cursor-pointer transition-all border ${
                          customDays.includes(day)
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={customDays.includes(day)}
                          onChange={() => toggleCustomDay(day)}
                          className="hidden"
                        />
                        <span className="text-sm font-medium">{day}</span>
                      </label>
                    ))}
                  </div>
                  {customDays.length > 0 && (
                    <p className="text-sm text-gray-600 mt-2">
                      Расписание: <span className="font-medium">{getScheduleDisplay()}</span>
                    </p>
                  )}
                </div>
              )}

              <div className="border-t border-gray-100 pt-6">
                <h3 className="text-base font-medium text-gray-900 mb-4">Диагностика и профориентация</h3>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>Первая диагностика</label>
                    <select
                      value={firstDiagnosticId}
                      onChange={(e) => setFirstDiagnosticId(e.target.value)}
                      className={selectClass}
                    >
                      <option value="">Не назначена</option>
                      <option value="pending">Будет назначена позже</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Диагностики будут доступны из базы</p>
                  </div>

                  <div>
                    <label className={labelClass}>Результат профориентации</label>
                    <select
                      value={careerOrientationResult}
                      onChange={(e) => setCareerOrientationResult(e.target.value)}
                      className={selectClass}
                    >
                      <option value="">Не пройдена</option>
                      <option value="tech">Технические науки</option>
                      <option value="humanities">Гуманитарные науки</option>
                      <option value="natural">Естественные науки</option>
                      <option value="creative">Творческие направления</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-8 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Назад
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="px-8 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
              >
                Далее
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Payment and Subscription */}
        {currentStep === 4 && (
          <div className="space-y-6">
            {/* Subscription */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm">📅</span>
                Абонемент
              </h2>

              <div className="grid grid-cols-4 gap-5 mb-6">
                <div>
                  <label className={labelClass}>Стандартных месяцев</label>
                  <input
                    type="number"
                    min="0"
                    value={standardMonths}
                    onChange={(e) => setStandardMonths(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Бонусных месяцев</label>
                  <input
                    type="number"
                    min="0"
                    value={bonusMonths}
                    onChange={(e) => setBonusMonths(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Интенсивных месяцев</label>
                  <input
                    type="number"
                    min="0"
                    value={intensiveMonths}
                    onChange={(e) => setIntensiveMonths(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Дни заморозки</label>
                  <input
                    type="number"
                    min="0"
                    value={freezeDays}
                    onChange={(e) => setFreezeDays(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>
                    Дата начала обучения<span className={requiredClass}>*</span>
                  </label>
                  <DateInput
                    name="studyStartDate"
                    value={startDate}
                    onChange={setStartDate}
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>Дата окончания</label>
                  <div className="px-4 py-3 bg-gray-50 text-gray-800 font-medium rounded-xl text-sm border border-gray-200">
                    {calculatedEndDate
                      ? new Date(calculatedEndDate).toLocaleDateString('ru-RU')
                      : 'Рассчитается автоматически'}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm">💳</span>
                Условия оплаты
              </h2>

              <div className="mb-6">
                <label className={labelClass}>
                  План оплаты<span className={requiredClass}>*</span>
                </label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {[
                    { value: 'ONE_TRANCHE', label: '1 транш', desc: 'Единовременная оплата' },
                    { value: 'TWO_TRANCHES', label: '2 транша', desc: 'Две части' },
                    { value: 'THREE_TRANCHES', label: '3 транша', desc: 'Три части' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`flex flex-col px-4 py-3 rounded-xl cursor-pointer transition-all border ${
                        paymentPlan === option.value
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        value={option.value}
                        checked={paymentPlan === option.value}
                        onChange={(e) => setPaymentPlan(e.target.value as typeof paymentPlan)}
                        className="hidden"
                      />
                      <span className="font-medium">{option.label}</span>
                      <span className={`text-xs ${paymentPlan === option.value ? 'text-gray-300' : 'text-gray-500'}`}>{option.desc}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {/* Транш 1 */}
                <div className="grid grid-cols-2 gap-5 p-4 bg-gray-50 rounded-xl">
                  <div>
                    <label className={labelClass}>
                      Сумма 1-го транша (₸)<span className={requiredClass}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formatCurrency(tranche1Amount)}
                      onChange={(e) => setTranche1Amount(parseCurrency(e.target.value))}
                      required
                      placeholder="0"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      Дата 1-го транша<span className={requiredClass}>*</span>
                    </label>
                    <DateInput
                      name="tranche1Date"
                      value={tranche1Date}
                      onChange={setTranche1Date}
                      required
                    />
                  </div>
                </div>

                {/* Транш 2 */}
                {paymentPlan !== 'ONE_TRANCHE' && (
                  <div className="grid grid-cols-2 gap-5 p-4 bg-gray-50 rounded-xl">
                    <div>
                      <label className={labelClass}>
                        Сумма 2-го транша (₸)<span className={requiredClass}>*</span>
                      </label>
                      <input
                        type="text"
                        value={formatCurrency(tranche2Amount)}
                        onChange={(e) => setTranche2Amount(parseCurrency(e.target.value))}
                        required
                        placeholder="0"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>
                        Дата 2-го транша<span className={requiredClass}>*</span>
                      </label>
                      <DateInput
                        name="tranche2Date"
                        value={tranche2Date}
                        onChange={setTranche2Date}
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Транш 3 */}
                {paymentPlan === 'THREE_TRANCHES' && (
                  <div className="grid grid-cols-2 gap-5 p-4 bg-gray-50 rounded-xl">
                    <div>
                      <label className={labelClass}>
                        Сумма 3-го транша (₸)<span className={requiredClass}>*</span>
                      </label>
                      <input
                        type="text"
                        value={formatCurrency(tranche3Amount)}
                        onChange={(e) => setTranche3Amount(parseCurrency(e.target.value))}
                        required
                        placeholder="0"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>
                        Дата 3-го транша<span className={requiredClass}>*</span>
                      </label>
                      <DateInput
                        name="tranche3Date"
                        value={tranche3Date}
                        onChange={setTranche3Date}
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Totals */}
                <div className="grid grid-cols-2 gap-5 pt-4 border-t border-gray-200">
                  <div>
                    <label className={labelClass}>
                      Общая сумма (₸)
                    </label>
                    <div className="px-4 py-3 bg-gray-50 text-gray-900 font-semibold rounded-xl text-sm border border-gray-200">
                      {totalAmount ? new Intl.NumberFormat('ru-RU').format(parseFloat(totalAmount)) + ' ₸' : 'Рассчитается автоматически'}
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>
                      Стоимость месяца (₸)
                    </label>
                    <div className="px-4 py-3 bg-gray-50 text-gray-900 font-medium rounded-xl text-sm border border-gray-200">
                      {monthlyPayment ? new Intl.NumberFormat('ru-RU').format(parseFloat(monthlyPayment)) + ' ₸' : 'Общая сумма ÷ стандартных месяцев'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-8 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Назад
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Зачисление...' : 'Зачислить ученика'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
