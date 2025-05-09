import React from 'react';

interface FormCheckboxProps {
  label: string;
  name: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  description?: string;
}

const FormCheckbox: React.FC<FormCheckboxProps> = ({
  label,
  name,
  checked,
  onChange,
  description
}) => {
  return (
    <div className="mb-4">
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            id={name}
            name={name}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            className="h-4 w-4 text-violet-600 border-zinc-700 rounded bg-zinc-800 focus:ring-violet-500 focus:ring-offset-zinc-800"
          />
        </div>
        <div className="ml-3">
          <label htmlFor={name} className="text-sm font-medium text-zinc-300">
            {label}
          </label>
          {description && (
            <p className="text-xs text-zinc-500">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormCheckbox; 