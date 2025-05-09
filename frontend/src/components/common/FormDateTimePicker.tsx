import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

export interface FormDateTimePickerProps {
  label: string;
  value?: string;
  onChange: (dateTime: string | undefined) => void;
  error?: string;
  required?: boolean;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

const FormDateTimePicker: React.FC<FormDateTimePickerProps> = ({
  label,
  value,
  onChange,
  error,
  required = false,
  minDate,
  maxDate,
  className = ''
}) => {
  // 文字列からDateオブジェクトに変換
  const selectedDate = value ? parseISO(value) : null;
  
  // DateオブジェクトからISO文字列に変換
  const handleDateChange = (date: Date | null) => {
    if (date) {
      const isoString = format(date, "yyyy-MM-dd'T'HH:mm:ss");
      onChange(isoString);
    } else {
      onChange(undefined);
    }
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-zinc-300 mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <div className={`${error ? 'border-red-500' : 'border-zinc-700'} rounded-md focus-within:ring-2 focus-within:ring-violet-500 ${className}`}>
        <DatePicker
          selected={selectedDate}
          onChange={handleDateChange}
          showTimeSelect
          timeFormat="HH:mm"
          timeIntervals={15}
          dateFormat="yyyy/MM/dd HH:mm"
          locale={ja}
          placeholderText="日時を選択"
          minDate={minDate}
          maxDate={maxDate}
          className="w-full px-3 py-2 bg-zinc-800 text-zinc-100 rounded-md focus:outline-none"
          calendarClassName="bg-zinc-800 text-zinc-100 border border-zinc-700"
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  );
};

export default FormDateTimePicker; 