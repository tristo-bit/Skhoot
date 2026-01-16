import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { CloseButton } from '../buttonFormat';

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
}) => {
  // Prevent default drag behavior on the modal to allow drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const modal = (
    <div
      className={`modal-overlay fixed inset-0 z-50 flex items-center justify-center ${overlayClassName}`}
      onClick={onClose}
      onDragOver={handleDragOver}
    >
      <div
        className={`modal-panel glass-elevated animate-in zoom-in-95 duration-300 flex flex-col ${panelClassName}`}
        onClick={(e) => e.stopPropagation()}
        onDragOver={handleDragOver}
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
              <CloseButton
                onClick={onClose}
                className="modal-close"
                aria-label={closeAriaLabel}
                title={closeAriaLabel}
              />
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

  // Render via portal to escape parent stacking context
  return createPortal(modal, document.body);
};
