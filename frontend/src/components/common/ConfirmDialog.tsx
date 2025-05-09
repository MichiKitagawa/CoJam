import React from 'react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-4 w-full">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        <p className="text-gray-600 mb-6">{message}</p>
        
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog; 