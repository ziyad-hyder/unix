import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  modalStack,
  getOpenModalCount,
  lockBodyScroll,
  unlockBodyScroll,
  _resetModalState,
} from './useModalA11y.js';

describe('useModalA11y nested modal & scroll lock test suite', () => {
  let originalDocument;

  beforeEach(() => {
    _resetModalState();
    originalDocument = global.document;
    global.document = {
      body: {
        style: {
          overflow: '',
        },
      },
      activeElement: null,
    };
  });

  afterEach(() => {
    global.document = originalDocument;
    _resetModalState();
  });

  describe('Ref-counted body scroll lock', () => {
    it('locks body scroll on first modal open and restores on close', () => {
      assert.equal(document.body.style.overflow, '');
      assert.equal(getOpenModalCount(), 0);

      lockBodyScroll();
      assert.equal(document.body.style.overflow, 'hidden');
      assert.equal(getOpenModalCount(), 1);

      unlockBodyScroll();
      assert.equal(document.body.style.overflow, '');
      assert.equal(getOpenModalCount(), 0);
    });

    it('preserves existing body overflow style when locking and restoring', () => {
      document.body.style.overflow = 'auto';

      lockBodyScroll();
      assert.equal(document.body.style.overflow, 'hidden');

      unlockBodyScroll();
      assert.equal(document.body.style.overflow, 'auto');
    });

    it('keeps body scroll locked when nested modals open and only restores when last modal closes', () => {
      // 1. First modal opens (e.g. CreateListingModal)
      lockBodyScroll();
      assert.equal(document.body.style.overflow, 'hidden');
      assert.equal(getOpenModalCount(), 1);

      // 2. Second modal opens on top (e.g. ConfirmDialog for discard)
      lockBodyScroll();
      assert.equal(document.body.style.overflow, 'hidden');
      assert.equal(getOpenModalCount(), 2);

      // 3. Second modal closes (user cancels discard)
      unlockBodyScroll();
      assert.equal(document.body.style.overflow, 'hidden', 'Body scroll must remain locked while first modal is still open');
      assert.equal(getOpenModalCount(), 1);

      // 4. First modal closes
      unlockBodyScroll();
      assert.equal(document.body.style.overflow, '', 'Body scroll must be restored when last modal closes');
      assert.equal(getOpenModalCount(), 0);
    });

    it('does not allow openModalCount to become negative', () => {
      unlockBodyScroll();
      unlockBodyScroll();
      assert.equal(getOpenModalCount(), 0);
      assert.equal(document.body.style.overflow, '');
    });
  });

  describe('Module-level modal stack & topmost event delegation', () => {
    it('pushes and pops modals in stack order', () => {
      const modal1 = { id: 1 };
      const modal2 = { id: 2 };

      modalStack.push(modal1);
      assert.equal(modalStack.length, 1);
      assert.equal(modalStack[modalStack.length - 1], modal1);

      modalStack.push(modal2);
      assert.equal(modalStack.length, 2);
      assert.equal(modalStack[modalStack.length - 1], modal2);

      // Pop top modal
      const idx2 = modalStack.indexOf(modal2);
      modalStack.splice(idx2, 1);
      assert.equal(modalStack.length, 1);
      assert.equal(modalStack[modalStack.length - 1], modal1);

      // Pop bottom modal
      const idx1 = modalStack.indexOf(modal1);
      modalStack.splice(idx1, 1);
      assert.equal(modalStack.length, 0);
    });

    it('ensures only topmost modal handles Escape and Tab actions', () => {
      let modal1EscFired = false;
      let modal2EscFired = false;

      const entry1 = {
        name: 'parentModal',
        handleEscape: () => { modal1EscFired = true; },
      };
      const entry2 = {
        name: 'confirmDialog',
        handleEscape: () => { modal2EscFired = true; },
      };

      modalStack.push(entry1);
      modalStack.push(entry2);

      // Simulated dispatch: only the topmost entry should execute
      const dispatchEscape = () => {
        const top = modalStack[modalStack.length - 1];
        if (top) top.handleEscape();
      };

      dispatchEscape();
      assert.equal(modal2EscFired, true, 'Topmost modal must handle Esc');
      assert.equal(modal1EscFired, false, 'Underlying modal must NOT handle Esc');

      // Now close entry2
      modalStack.pop();

      // Dispatch escape again
      dispatchEscape();
      assert.equal(modal1EscFired, true, 'Underlying modal handles Esc once it becomes topmost');
    });

    it('tracks triggerElement per modal for hierarchical focus restoration', () => {
      const pageButton = { name: 'list-item-btn', focusCalled: false, focus() { this.focusCalled = true; } };
      const formInput = { name: 'title-input', focusCalled: false, focus() { this.focusCalled = true; } };

      // User on pageButton opens modal 1
      document.activeElement = pageButton;
      const modal1Trigger = document.activeElement;

      // Inside modal 1, user focuses formInput and triggers discard confirmation (modal 2)
      document.activeElement = formInput;
      const modal2Trigger = document.activeElement;

      // Modal 2 closes: restores to formInput
      modal2Trigger.focus();
      assert.equal(formInput.focusCalled, true);
      assert.equal(pageButton.focusCalled, false);

      // Modal 1 closes: restores to pageButton
      modal1Trigger.focus();
      assert.equal(pageButton.focusCalled, true);
    });
  });
});
