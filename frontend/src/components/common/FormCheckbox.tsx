import React from 'react';

interface FormCheckboxProps {
  label: string;
  name: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
}

const FormCheckbox: React.FC<FormCheckboxProps> = ({
  label,
  name,
  checked,
  onChange,
  error
}) => {
  return (
    <div className="mb-4">
      <div className="flex items-center">
        <input
          type="checkbox"
          id={name}
          name={name}
          checked={checked}
          onChange={onChange}
          className={`h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded ${
            error ? 'border-red-500' : ''
          }`}
        />
        <label htmlFor={name} className="ml-2 block text-sm text-gray-700">
          {label}
        </label>
      </div>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default FormCheckbox; 