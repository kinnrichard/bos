import { describe, it, expect } from 'vitest';
import { normalizeContact, getContactTypeIcon, getContactTypeLabel } from '../contactNormalizer';

describe('contactNormalizer', () => {
  describe('email normalization', () => {
    it('should detect and lowercase emails', () => {
      const result = normalizeContact('TEST@EXAMPLE.COM');
      expect(result).toEqual({
        contact_type: 'email',
        formatted_value: 'test@example.com',
      });
    });

    it('should trim whitespace from emails', () => {
      const result = normalizeContact('  user@example.com  ');
      expect(result).toEqual({
        contact_type: 'email',
        formatted_value: 'user@example.com',
      });
    });

    it('should reject invalid email formats', () => {
      const invalid = ['user@', '@example.com', 'user.example.com', 'user @example.com'];
      invalid.forEach((email) => {
        const result = normalizeContact(email);
        expect(result?.contact_type).not.toBe('email');
      });
    });
  });

  describe('phone normalization', () => {
    it('should format 10-digit US phones', () => {
      const result = normalizeContact('8123213123');
      expect(result).toEqual({
        contact_type: 'phone',
        formatted_value: '(812) 321-3123',
      });
    });

    it('should handle phones with formatting', () => {
      const result = normalizeContact('812-321-3123');
      expect(result).toEqual({
        contact_type: 'phone',
        formatted_value: '(812) 321-3123',
      });
    });

    it('should strip US country code', () => {
      const result = normalizeContact('18123213123');
      expect(result).toEqual({
        contact_type: 'phone',
        formatted_value: '(812) 321-3123',
      });
    });

    it('should handle phone with parentheses and spaces', () => {
      const result = normalizeContact('(812) 321 3123');
      expect(result).toEqual({
        contact_type: 'phone',
        formatted_value: '(812) 321-3123',
      });
    });

    it('should reject invalid phone numbers', () => {
      const invalid = ['123', '12345', '123456789', '123456789012'];
      invalid.forEach((phone) => {
        const result = normalizeContact(phone);
        expect(result?.contact_type).not.toBe('phone');
      });
    });
  });

  describe('address handling', () => {
    it('should detect addresses as fallback', () => {
      const result = normalizeContact('123 Main St, Anytown USA');
      expect(result).toEqual({
        contact_type: 'address',
        formatted_value: '123 Main St, Anytown USA',
      });
    });

    it('should handle simple text as address', () => {
      const result = normalizeContact('Some random text');
      expect(result).toEqual({
        contact_type: 'address',
        formatted_value: 'Some random text',
      });
    });
  });

  describe('edge cases', () => {
    it('should return null for empty input', () => {
      expect(normalizeContact('')).toBeNull();
      expect(normalizeContact('  ')).toBeNull();
      expect(normalizeContact(null as any)).toBeNull();
      expect(normalizeContact(undefined as any)).toBeNull();
    });
  });

  describe('helper functions', () => {
    it('should return correct icons for contact types', () => {
      expect(getContactTypeIcon('email')).toBe('/icons/envelope.svg');
      expect(getContactTypeIcon('phone')).toBe('/icons/phone.svg');
      expect(getContactTypeIcon('address')).toBe('/icons/mappin.and.ellipse.svg');
    });

    it('should return correct labels for contact types', () => {
      expect(getContactTypeLabel('email')).toBe('Email');
      expect(getContactTypeLabel('phone')).toBe('Phone');
      expect(getContactTypeLabel('address')).toBe('Address');
    });
  });
});
