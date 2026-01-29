/**
 * Toast Notification Component
 * Simple toast/snackbar for user feedback
 */
import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastProps {
  message: ToastMessage;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onClose(message.id), 300);
    }, message.duration || 3000);

    return () => clearTimeout(timer);
  }, [message, onClose]);

  const icons = {
    success: <CheckCircle size={16} />,
    error: <AlertCircle size={16} />,
    info: <Info size={16} />,
  };

  const colors = {
    success: 'bg-green-500/90 text-white',
    error: 'bg-red-500/90 text-white',
    info: 'bg-purple-500/90 text-white',
  };

  return (
    <div
      className={`flex items-center gap-2 px-4 py-3 rounded-xl backdrop-blur-xl shadow-lg transition-all duration-300 ${
        colors[message.type]
      } ${isExiting ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}
    >
      {icons[message.type]}
      <span className="text-sm font-medium">{message.message}</span>
      <button
        onClick={() => {
          setIsExiting(true);
          setTimeout(() => onClose(message.id), 300);
        }}
        className="ml-2 hover:opacity-70 transition-opacity"
      >
        <X size={14} />
      </button>
    </div>
  );
};

// Toast Container Component
export const ToastContainer: React.FC<{ toasts: ToastMessage[]; onClose: (id: string) => void }> = ({
  toasts,
  onClose,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      <div className="pointer-events-auto space-y-2">
        {toasts.map(toast => (
          <Toast key={toast.id} message={toast} onClose={onClose} />
        ))}
      </div>
    </div>
  );
};

// Toast Manager Hook
export const useToast = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: ToastType = 'info', duration?: number) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastMessage = { id, message, type, duration };
    setToasts(prev => [...prev, newToast]);
  };

  const closeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return { toasts, showToast, closeToast };
};
