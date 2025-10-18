'use client';

import { Toast } from './Toast';
import type { ToastType } from './Toast';

interface ToastContainerProps {
  toast: {
    message: string;
    type: ToastType;
    show: boolean;
  };
  onClose: () => void;
}

export function ToastContainer({ toast, onClose }: ToastContainerProps) {
  if (!toast.show) return null;

  return (
    <Toast
      message={toast.message}
      type={toast.type}
      onClose={onClose}
      duration={5000}
    />
  );
}

