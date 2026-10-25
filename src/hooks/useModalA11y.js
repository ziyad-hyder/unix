import { useEffect, useRef } from 'react';

// Module-level stack of open modals
export const modalStack = [];

// Ref-counted body scroll lock
let openModalCount = 0;
let originalOverflow = '';

export function getOpenModalCount() {
  return openModalCount;
}

export function lockBodyScroll() {
  if (typeof document === 'undefined') return;
  if (openModalCount === 0) {
    originalOverflow = document.body.style.overflow || '';
    document.body.style.overflow = 'hidden';
  }
  openModalCount++;
}

export function unlockBodyScroll() {
  if (typeof document === 'undefined') return;
  openModalCount = Math.max(0, openModalCount - 1);
  if (openModalCount === 0) {
    document.body.style.overflow = originalOverflow;
    originalOverflow = '';
  }
}

export function _resetModalState() {
  modalStack.length = 0;
  openModalCount = 0;
  originalOverflow = '';
}

/**
 * Custom hook for accessible modal behavior:
 * - Module-level stack of open modals (only topmost handles Esc and Tab trap)
 * - Ref-counted body scroll lock (restores overflow only when last modal closes)
 * - Focus restoration returns to the element focused when THAT modal opened
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

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const closeOnEscapeRef = useRef(closeOnEscape);
  closeOnEscapeRef.current = closeOnEscape;

  useEffect(() => {
    if (!isOpen) return;

    // 1. Capture the element that was focused right before this modal opened
    triggerRef.current = typeof document !== 'undefined' ? document.activeElement : null;

    // 2. Lock body scroll with ref-counting
    lockBodyScroll();

    // 3. Register this modal onto the module-level stack
    const entry = {
      modalRef,
      onCloseRef,
      closeOnEscapeRef,
      triggerElement: triggerRef.current,
    };
    modalStack.push(entry);

    // 4. Focus initial element or first focusable element inside modal
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

    // 5. Keydown listener: only topmost modal handles Escape and Tab trap
    const handleKeyDown = (e) => {
      const isTopmost = modalStack.length > 0 && modalStack[modalStack.length - 1] === entry;
      if (!isTopmost) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (closeOnEscapeRef.current && onCloseRef.current) {
          onCloseRef.current();
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

    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      clearTimeout(focusTimer);

      if (typeof document !== 'undefined') {
        document.removeEventListener('keydown', handleKeyDown);
      }

      // Remove this modal entry from stack
      const idx = modalStack.indexOf(entry);
      if (idx !== -1) {
        modalStack.splice(idx, 1);
      }

      // Unlock body scroll with ref-counting
      unlockBodyScroll();

      // Return focus to the trigger element that was active when this modal opened
      if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
        try {
          triggerRef.current.focus();
        } catch {
          // In case element is no longer in DOM
        }
      }
    };
  }, [isOpen]);

  return modalRef;
}
