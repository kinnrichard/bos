import { describe, expect, it } from 'vitest';
import { normalizeClientName } from '../name-normalizer';

describe('normalizeClientName', () => {
  it('removes accents from names', () => {
    expect(normalizeClientName('Café')).toBe('CAFE');
    expect(normalizeClientName('niño')).toBe('NINO');
    expect(normalizeClientName('François')).toBe('FRANCOIS');
  });
  
  it('handles complex Unicode characters', () => {
    expect(normalizeClientName('Zürich')).toBe('ZURICH');
    expect(normalizeClientName('São Paulo')).toBe('SAOPAULO');
    expect(normalizeClientName('Köln')).toBe('KOLN');
  });
  
  it('converts to uppercase', () => {
    expect(normalizeClientName('test')).toBe('TEST');
    expect(normalizeClientName('MiXeD')).toBe('MIXED');
  });
  
  it('removes special characters and spaces', () => {
    expect(normalizeClientName('ABC & Co.')).toBe('ABCCO');
    expect(normalizeClientName('Test-Name')).toBe('TESTNAME');
    expect(normalizeClientName('Name (with) [brackets]')).toBe('NAMEWITHBRACKETS');
    expect(normalizeClientName('Name @ Company')).toBe('NAMECOMPANY');
  });
  
  it('handles null and undefined values', () => {
    expect(normalizeClientName(null as any)).toBeNull();
    expect(normalizeClientName(undefined as any)).toBeNull();
  });
  
  it('handles empty strings', () => {
    expect(normalizeClientName('')).toBeNull();
  });
  
  it('removes all whitespace', () => {
    expect(normalizeClientName('  spaced   out  ')).toBe('SPACEDOUT');
    expect(normalizeClientName('line\nbreak')).toBe('LINEBREAK');
    expect(normalizeClientName('tab\tseparated')).toBe('TABSEPARATED');
  });
  
  it('keeps only alphanumeric characters', () => {
    expect(normalizeClientName('Test123')).toBe('TEST123');
    expect(normalizeClientName('!@#$%^&*()')).toBeNull();
  });
});

describe('normalizeClientName with object input', () => {
  it('normalizes name field and adds normalized_name', () => {
    const input = { name: 'Café René' };
    const result = normalizeClientName(input);
    
    expect(result).toEqual({
      name: 'Café René',
      normalized_name: 'CAFERENE'
    });
  });
  
  it('preserves other fields', () => {
    const input = { 
      name: 'Test Company',
      id: '123',
      type: 'client'
    };
    const result = normalizeClientName(input);
    
    expect(result).toEqual({
      name: 'Test Company',
      normalized_name: 'TESTCOMPANY',
      id: '123',
      type: 'client'
    });
  });
  
  it('returns input unchanged if no name field', () => {
    const input = { id: '123', type: 'client' };
    const result = normalizeClientName(input);
    
    expect(result).toEqual(input);
  });
  
  it('handles empty name in object', () => {
    const input = { name: '' };
    const result = normalizeClientName(input);
    
    expect(result).toEqual({
      name: '',
      normalized_name: null
    });
  });
});