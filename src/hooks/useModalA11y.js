import { useEffect, useRef } from 'react';

/**
 * Custom hook for accessible modal behavior:
 * - Focus trap within the modal
 * - Body scroll lock
 * - Esc key to close (if closeOnEscape is true)
 * - Focus restoration to previous active element on close
 * - Initial focus management
 *
 * @param {boolean} isOpen
 * @param {Function} onClose
 * @param {Object} [options]
 * @param {boolean} [options.closeOnEscape=true]
 * @param {React.RefObject} [options.initialFocusRef]
 * @returns {React.RefObject} modalRef to attach to the modal container
 */
export default function useModalA11y(
  isOpen,
  onClose,
  { closeOnEscape = true, initialFocusRef } = {}
) {
  const modalRef = useRef(null);
  const triggerRef = useRef(null);

  // 1. Focus restoration & body scroll lock
  useEffect(() => {
    if (isOpen) {
      // Save previously focused element to return focus when modal closes
      triggerRef.current = document.activeElement;

      // Lock body scroll
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      // Focus initial element or first focusable element inside modal
      const focusTimer = setTimeout(() => {
        if (initialFocusRef?.current && typeof initialFocusRef.current.focus === 'function') {
          initialFocusRef.current.focus();
        } else if (modalRef.current) {
          const focusable = modalRef.current.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length > 0 && typeof focusable[0].focus === 'function') {
            focusable[0].focus();
          } else if (typeof modalRef.current.focus === 'function') {
            modalRef.current.focus();
          }
        }
      }, 0);

      return () => {
        clearTimeout(focusTimer);
        document.body.style.overflow = originalOverflow;
        // Return focus to the trigger element
        if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
          triggerRef.current.focus();
        }
      };
    }
  }, [isOpen, initialFocusRef]);

  // 2. Escape key handling & Focus Trap on Tab
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (closeOnEscape && onClose) {
          e.preventDefault();
          onClose();
        }
        return;
      }

      if (e.key === 'Tab') {
        if (!modalRef.current) return;

        const focusableElements = modalRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          // Shift + Tab (backward)
          if (document.activeElement === firstElement || !modalRef.current.contains(document.activeElement)) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab (forward)
          if (document.activeElement === lastElement || !modalRef.current.contains(document.activeElement)) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeOnEscape, onClose]);

  return modalRef;
}
