'use client';

interface DateInputProps {
  label?: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  showEmptyGlow?: boolean;
}

export default function DateInput({
  label,
  name,
  value,
  onChange,
  required = false,
  className = '',
  showEmptyGlow = false,
}: DateInputProps) {
  const borderClass = showEmptyGlow && !value
    ? 'border-2 border-blue-500 dark:border-blue-400'
    : 'border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500';

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        type="date"
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete="off"
        className={`w-full px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-gray-700 transition-colors ${borderClass}`}
        style={{
          WebkitAppearance: 'none',
          MozAppearance: 'none',
          appearance: 'none',
        }}
      />
    </div>
  );
}
