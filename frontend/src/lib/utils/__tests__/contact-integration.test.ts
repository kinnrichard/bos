import { describe, it, expect } from 'vitest';
import { normalizeContact } from '../contactNormalizer';

describe('Contact Normalization Integration', () => {
  it('should handle typical user input scenarios', () => {
    // Email scenarios
    expect(normalizeContact('john@company.com')).toEqual({
      contact_type: 'email',
      formatted_value: 'john@company.com',
    });

    expect(normalizeContact('  JANE@COMPANY.COM  ')).toEqual({
      contact_type: 'email',
      formatted_value: 'jane@company.com',
    });

    // Phone scenarios
    expect(normalizeContact('555-123-4567')).toEqual({
      contact_type: 'phone',
      formatted_value: '(555) 123-4567',
    });

    expect(normalizeContact('(555) 123 4567')).toEqual({
      contact_type: 'phone',
      formatted_value: '(555) 123-4567',
    });

    expect(normalizeContact('15551234567')).toEqual({
      contact_type: 'phone',
      formatted_value: '(555) 123-4567',
    });

    expect(normalizeContact('5551234567')).toEqual({
      contact_type: 'phone',
      formatted_value: '(555) 123-4567',
    });

    // Address scenarios
    expect(normalizeContact('123 Main St, Anytown, ST 12345')).toEqual({
      contact_type: 'address',
      formatted_value: '123 Main St, Anytown, ST 12345',
    });

    expect(normalizeContact('P.O. Box 123')).toEqual({
      contact_type: 'address',
      formatted_value: 'P.O. Box 123',
    });

    // Edge cases that should be addresses
    expect(normalizeContact('@mention without domain')).toEqual({
      contact_type: 'address',
      formatted_value: '@mention without domain',
    });

    expect(normalizeContact('555-123')).toEqual({
      contact_type: 'address',
      formatted_value: '555-123',
    });
  });

  it('should work with ContactMethod data structure', () => {
    // Simulate what happens in the form
    const userInputs = ['john.doe@company.com', '(555) 123-4567', '123 Main St, Anytown ST'];

    const normalizedResults = userInputs.map((input) => {
      const normalized = normalizeContact(input);
      return {
        value: input,
        contact_type: normalized?.contact_type,
        formatted_value: normalized?.formatted_value || input,
      };
    });

    expect(normalizedResults).toEqual([
      {
        value: 'john.doe@company.com',
        contact_type: 'email',
        formatted_value: 'john.doe@company.com',
      },
      {
        value: '(555) 123-4567',
        contact_type: 'phone',
        formatted_value: '(555) 123-4567',
      },
      {
        value: '123 Main St, Anytown ST',
        contact_type: 'address',
        formatted_value: '123 Main St, Anytown ST',
      },
    ]);
  });
});
