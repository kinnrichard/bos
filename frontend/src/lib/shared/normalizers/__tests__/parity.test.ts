import { describe, expect, it } from 'vitest';
import { normalizeString } from '../name-normalizer';

// These test cases should match the Ruby test cases exactly
const PARITY_TEST_CASES = [
  // Input -> Expected output
  ['Café', 'CAFE'],
  ['niño', 'NINO'],
  ['François', 'FRANCOIS'],
  ['Zürich', 'ZURICH'],
  ['São Paulo', 'SAOPAULO'],
  ['Köln', 'KOLN'],
  ['test', 'TEST'],
  ['MiXeD', 'MIXED'],
  ['ABC & Co.', 'ABCCO'],
  ['Test-Name', 'TESTNAME'],
  ['Name (with) [brackets]', 'NAMEWITHBRACKETS'],
  ['Name @ Company', 'NAMECOMPANY'],
  ['  spaced   out  ', 'SPACEDOUT'],
  ['line\nbreak', 'LINEBREAK'],
  ['tab\tseparated', 'TABSEPARATED'],
  ['Test123', 'TEST123'],
  ['', null],
  ['!@#$%^&*()', null],
  ['   ', null],
  [null, null],
] as const;

describe('Ruby/TypeScript Parity Tests', () => {
  it('produces identical results to Ruby implementation', () => {
    PARITY_TEST_CASES.forEach(([input, expected]) => {
      const result = normalizeString(input as string);
      expect(result).toBe(expected);
    });
  });
  
  it('matches Ruby implementation documentation examples', () => {
    // Examples from the Ruby README
    expect(normalizeString('Café René')).toBe('CAFERENE');
    expect(normalizeString('naïve')).toBe('NAIVE');
    expect(normalizeString('résumé')).toBe('RESUME');
    expect(normalizeString('piñata')).toBe('PINATA');
    expect(normalizeString('über')).toBe('UBER');
  });
});