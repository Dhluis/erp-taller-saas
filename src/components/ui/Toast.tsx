'use client';

import { useEffect } from 'react';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  InformationCircleIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type, onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const styles = {
    success: {
      bg: 'bg-success/10',
      border: 'border-success/30',
      text: 'text-success',
      icon: CheckCircleIcon,
    },
    error: {
      bg: 'bg-error/10',
      border: 'border-error/30',
      text: 'text-error',
      icon: XCircleIcon,
    },
    info: {
      bg: 'bg-primary/10',
      border: 'border-primary/30',
      text: 'text-primary',
      icon: InformationCircleIcon,
    },
  };

  const style = styles[type];
  const Icon = style.icon;

  return (
    <div className="fixed top-4 right-4 z-[100] animate-fadeIn">
      <div className={`
        ${style.bg} ${style.border} border rounded-lg p-4 shadow-lg
        max-w-md flex items-start space-x-3
      `}>
        <Icon className={`w-6 h-6 ${style.text} flex-shrink-0 mt-0.5`} />
        <p className={`flex-1 ${style.text} font-medium`}>{message}</p>
        <button
          onClick={onClose}
          className={`${style.text} hover:opacity-70 transition-opacity`}
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

