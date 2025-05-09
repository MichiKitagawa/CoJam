import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

interface FormDateTimePickerProps {
  label: string;
  value?: string;
  onChange: (dateTime: string | undefined) => void;
  error?: string;
  required?: boolean;
  minDate?: Date;
  maxDate?: Date;
}

const FormDateTimePicker: React.FC<FormDateTimePickerProps> = ({
  label,
  value,
  onChange,
  error,
  required = false,
  minDate,
  maxDate
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
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <DatePicker
        selected={selectedDate}
        onChange={handleDateChange}
        showTimeSelect
        timeFormat="HH:mm"
        timeIntervals={15}
        dateFormat="yyyy/MM/dd HH:mm"
        locale={ja}
        minDate={minDate}
        maxDate={maxDate}
        placeholderText="日時を選択"
        className={`w-full px-3 py-2 border ${
          error ? 'border-red-500' : 'border-gray-300'
        } rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500`}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default FormDateTimePicker; 