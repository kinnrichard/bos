import { describe, it, expect } from 'vitest';
import { NIL_UUID } from './constants';

describe('Constants', () => {
  describe('NIL_UUID', () => {
    it('should be a valid RFC 4122 nil UUID', () => {
      expect(NIL_UUID).toBe('00000000-0000-0000-0000-000000000000');
    });

    it('should match UUID v4 format', () => {
      // UUID format: 8-4-4-4-12 hexadecimal digits
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(NIL_UUID).toMatch(uuidRegex);
    });

    it('should be exactly 36 characters long', () => {
      expect(NIL_UUID).toHaveLength(36);
    });

    it('should contain only zeros and hyphens', () => {
      const nonZeroOrHyphen = /[^0-]/;
      expect(NIL_UUID).not.toMatch(nonZeroOrHyphen);
    });

    it('should have hyphens in correct positions', () => {
      const parts = NIL_UUID.split('-');
      expect(parts).toHaveLength(5);
      expect(parts[0]).toHaveLength(8);
      expect(parts[1]).toHaveLength(4);
      expect(parts[2]).toHaveLength(4);
      expect(parts[3]).toHaveLength(4);
      expect(parts[4]).toHaveLength(12);
    });
  });
});