/**
 * Contact Normalization Utility
 *
 * Provides client-side contact normalization for email addresses, phone numbers, and addresses.
 * Ensures consistent data formatting at the point of entry without requiring backend changes.
 */

export type ContactType = 'email' | 'phone' | 'address';

export interface NormalizedContact {
  contact_type: ContactType;
  formatted_value: string;
}

/**
 * Normalizes a contact value and detects its type
 * @param value - Raw contact value to normalize
 * @returns Normalized contact object or null if empty
 */
export function normalizeContact(value: string): NormalizedContact | null {
  if (!value?.trim()) return null;

  const trimmed = value.trim();

  // Email detection and normalization
  if (trimmed.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/i)) {
    return {
      contact_type: 'email',
      formatted_value: trimmed.toLowerCase(),
    };
  }

  // Phone detection and formatting (US format)
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10 || (digits.length === 11 && digits[0] === '1')) {
    const cleaned = digits.length === 11 ? digits.slice(1) : digits;
    if (cleaned.length === 10) {
      return {
        contact_type: 'phone',
        formatted_value: `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`,
      };
    }
  }

  // Address as fallback
  return {
    contact_type: 'address',
    formatted_value: trimmed,
  };
}

/**
 * Gets the icon path for a contact type
 * @param type - Contact type
 * @returns Icon path for the contact type
 */
export function getContactTypeIcon(type: ContactType): string {
  switch (type) {
    case 'email':
      return '/icons/envelope.svg';
    case 'phone':
      return '/icons/phone.svg';
    case 'address':
      return '/icons/mappin.and.ellipse.svg';
    default:
      return '/icons/note.svg';
  }
}

/**
 * Gets a human-readable label for a contact type
 * @param type - Contact type
 * @returns Display label for the contact type
 */
export function getContactTypeLabel(type: ContactType): string {
  switch (type) {
    case 'email':
      return 'Email';
    case 'phone':
      return 'Phone';
    case 'address':
      return 'Address';
    default:
      return 'Contact';
  }
}
