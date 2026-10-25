import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  categoryLabel,
  typeLabel,
  typeActionLabel,
  rentalPeriodLabel,
  formatPrice,
  toTitleCase,
} from './labels.js';

describe('labels.js test suite', () => {
  describe('toTitleCase', () => {
    it('converts uppercase underscore words to Title Case', () => {
      assert.equal(toTitleCase('LAB_EQUIPMENT'), 'Lab Equipment');
      assert.equal(toTitleCase('SEMESTER_FINAL_KIT'), 'Semester Final Kit');
    });

    it('converts kebab-case words to Title Case', () => {
      assert.equal(toTitleCase('lab-equipment'), 'Lab Equipment');
    });

    it('converts lowercase single words to Title Case', () => {
      assert.equal(toTitleCase('calculator'), 'Calculator');
    });

    it('handles empty, null, and non-string inputs safely', () => {
      assert.equal(toTitleCase(''), '');
      assert.equal(toTitleCase(null), '');
      assert.equal(toTitleCase(undefined), '');
      assert.equal(toTitleCase(123), '');
    });
  });

  describe('categoryLabel', () => {
    it('returns standardized labels for known categories', () => {
      assert.equal(categoryLabel('ALL'), 'All Items');
      assert.equal(categoryLabel('CALCULATOR'), 'Calculators');
      assert.equal(categoryLabel('DRAFTING'), 'Drafting Kits');
      assert.equal(categoryLabel('ELECTRONICS'), 'Electronics');
      assert.equal(categoryLabel('OTHER'), 'Other Resources');
    });

    it('falls back to title-cased version for unknown categories', () => {
      assert.equal(categoryLabel('LAB_EQUIPMENT'), 'Lab Equipment');
      assert.equal(categoryLabel('textbooks'), 'Textbooks');
      assert.equal(categoryLabel('DRAWING_BOARD'), 'Drawing Board');
    });

    it('returns empty string for null, undefined, or empty values', () => {
      assert.equal(categoryLabel(null), '');
      assert.equal(categoryLabel(undefined), '');
      assert.equal(categoryLabel(''), '');
    });
  });

  describe('typeLabel and typeActionLabel', () => {
    it('returns unified vocabulary for known types (Buy, Rent, Swap)', () => {
      assert.equal(typeLabel('SELL'), 'Buy');
      assert.equal(typeLabel('RENT'), 'Rent');
      assert.equal(typeLabel('SWAP'), 'Swap');
      assert.equal(typeLabel('ALL'), 'All Types');
    });

    it('falls back to title-cased version for unknown types', () => {
      assert.equal(typeLabel('GIVEAWAY'), 'Giveaway');
      assert.equal(typeLabel('DONATE_NOW'), 'Donate Now');
    });

    it('returns empty string for null, undefined, or empty values', () => {
      assert.equal(typeLabel(null), '');
      assert.equal(typeLabel(undefined), '');
      assert.equal(typeLabel(''), '');
    });

    it('returns unified action button CTA labels', () => {
      assert.equal(typeActionLabel('SELL'), 'Request to Buy');
      assert.equal(typeActionLabel('RENT'), 'Request to Rent');
      assert.equal(typeActionLabel('SWAP'), 'Request to Swap');
      assert.equal(typeActionLabel('GIVEAWAY'), 'Request to Giveaway');
      assert.equal(typeActionLabel(null), 'Request Item');
      assert.equal(typeActionLabel(''), 'Request Item');
    });
  });

  describe('rentalPeriodLabel', () => {
    it('returns standardized labels per specification', () => {
      assert.equal(rentalPeriodLabel('DAILY'), 'per day');
      assert.equal(rentalPeriodLabel('WEEKLY'), 'per week');
      assert.equal(rentalPeriodLabel('MONTHLY'), 'per month');
      assert.equal(rentalPeriodLabel('SEMESTER'), 'per semester');
    });

    it('falls back to title-cased version for unknown periods', () => {
      assert.equal(rentalPeriodLabel('HOURLY'), 'Hourly');
      assert.equal(rentalPeriodLabel('ANNUAL'), 'Annual');
      assert.equal(rentalPeriodLabel('BI_WEEKLY'), 'Bi Weekly');
    });

    it('returns empty string for null, undefined, or empty values', () => {
      assert.equal(rentalPeriodLabel(null), '');
      assert.equal(rentalPeriodLabel(undefined), '');
      assert.equal(rentalPeriodLabel(''), '');
    });
  });

  describe('formatPrice', () => {
    it('returns "Price on request" or custom fallback when price is null, undefined, or empty', () => {
      assert.equal(formatPrice(null), 'Price on request');
      assert.equal(formatPrice(undefined), 'Price on request');
      assert.equal(formatPrice(''), 'Price on request');
      assert.equal(formatPrice(null, { fallback: '' }), '');
    });

    it('returns "Free" when price is 0 or "0", never "₹0"', () => {
      assert.equal(formatPrice(0), 'Free');
      assert.equal(formatPrice('0'), 'Free');
      assert.notEqual(formatPrice(0), '₹0');
      assert.notEqual(formatPrice('0'), '₹0');
    });

    it('formats positive numbers as INR currency', () => {
      assert.equal(formatPrice(100), '₹100');
      assert.equal(formatPrice('1500'), '₹1,500');
      assert.equal(formatPrice(25000), '₹25,000');
    });

    it('returns fallback for NaN and invalid strings', () => {
      assert.equal(formatPrice('not_a_number'), 'Price on request');
      assert.equal(formatPrice(NaN), 'Price on request');
    });
  });
});
