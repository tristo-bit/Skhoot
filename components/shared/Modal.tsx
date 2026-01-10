import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  title?: string;
  headerContent?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  panelClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  overlayClassName?: string;
  showClose?: boolean;
  closeAriaLabel?: string;
}

export const Modal: React.FC<ModalProps> = ({
  title,
  headerContent,
  onClose,
  children,
  footer,
  panelClassName = '',
  headerClassName = '',
  bodyClassName = '',
  footerClassName = '',
  overlayClassName = '',
  showClose = true,
  closeAriaLabel = 'Close',
}) => (
  <div
    className={`modal-overlay absolute inset-0 z-50 flex items-center justify-center ${overlayClassName}`}
    onClick={onClose}
  >
    <div
      className={`modal-panel glass-elevated animate-in zoom-in-95 duration-300 flex flex-col ${panelClassName}`}
      onClick={(e) => e.stopPropagation()}
    >
      {(title || headerContent || showClose) && (
        <div className={`modal-header flex items-center justify-between ${headerClassName}`}>
          <div className="flex items-center gap-2 min-w-0">
            {headerContent ?? (
              <h2 className="text-lg font-black font-jakarta text-text-primary truncate">
                {title}
              </h2>
            )}
          </div>
          {showClose && (
            <button
              onClick={onClose}
              className="modal-close w-8 h-8 flex items-center justify-center rounded-xl hover:glass-subtle transition-all text-text-secondary active:scale-90"
              aria-label={closeAriaLabel}
              title={closeAriaLabel}
            >
              <X size={18} />
            </button>
          )}
        </div>
      )}
      <div className={`modal-body flex-1 overflow-y-auto no-scrollbar ${bodyClassName}`}>
        {children}
      </div>
      {footer && (
        <div className={`modal-footer ${footerClassName}`}>
          {footer}
        </div>
      )}
    </div>
  </div>
);
