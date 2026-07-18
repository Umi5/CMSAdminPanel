import { describe, it, expect } from 'vitest';
import { convert, retypeBaseSeverity, maxSeverity } from './converters';

describe('convert — to text (always widens cleanly)', () => {
  it('number -> text', () => {
    expect(convert(2015, 'number', 'text')).toEqual({ status: 'clean', value: '2015' });
  });
  it('boolean -> text', () => {
    expect(convert(true, 'boolean', 'text')).toEqual({ status: 'clean', value: 'true' });
    expect(convert(false, 'boolean', 'text')).toEqual({ status: 'clean', value: 'false' });
  });
  it('date -> text keeps the ISO string', () => {
    expect(convert('2020-01-01', 'date', 'text')).toEqual({ status: 'clean', value: '2020-01-01' });
  });
  it('reference -> text keeps the id', () => {
    expect(convert('ent_x', 'reference', 'text')).toEqual({ status: 'clean', value: 'ent_x' });
  });
});

describe('convert — text to number (the hard case)', () => {
  it('parses clean numeric strings', () => {
    expect(convert('2015', 'text', 'number')).toEqual({ status: 'clean', value: 2015 });
    expect(convert(' 42 ', 'text', 'number')).toEqual({ status: 'clean', value: 42 });
    expect(convert('3.5', 'text', 'number')).toEqual({ status: 'clean', value: 3.5 });
  });
  it('flags values that are not numbers', () => {
    expect(convert('vintage', 'text', 'number').status).toBe('needs_attention');
    expect(convert('n/a', 'text', 'number').status).toBe('needs_attention');
    expect(convert('  ', 'text', 'number').status).toBe('needs_attention');
    expect(convert('12abc', 'text', 'number').status).toBe('needs_attention');
    expect(convert('Infinity', 'text', 'number').status).toBe('needs_attention');
  });
});

describe('convert — booleans and numbers', () => {
  it('boolean -> number', () => {
    expect(convert(true, 'boolean', 'number')).toEqual({ status: 'clean', value: 1 });
    expect(convert(false, 'boolean', 'number')).toEqual({ status: 'clean', value: 0 });
  });
  it('number -> boolean only for 0 and 1', () => {
    expect(convert(1, 'number', 'boolean')).toEqual({ status: 'clean', value: true });
    expect(convert(0, 'number', 'boolean')).toEqual({ status: 'clean', value: false });
    expect(convert(2, 'number', 'boolean').status).toBe('needs_attention');
  });
  it('text -> boolean for known words', () => {
    expect(convert('yes', 'text', 'boolean')).toEqual({ status: 'clean', value: true });
    expect(convert('FALSE', 'text', 'boolean')).toEqual({ status: 'clean', value: false });
    expect(convert('maybe', 'text', 'boolean').status).toBe('needs_attention');
  });
});

describe('convert — dates', () => {
  it('text -> date normalises to YYYY-MM-DD', () => {
    expect(convert('2020-01-01', 'text', 'date')).toEqual({ status: 'clean', value: '2020-01-01' });
    expect(convert('nope', 'text', 'date').status).toBe('needs_attention');
  });
  it('date <-> number round-trips through epoch millis', () => {
    const epoch = Date.parse('2020-01-01');
    expect(convert('2020-01-01', 'date', 'number')).toEqual({ status: 'clean', value: epoch });
    expect(convert(epoch, 'number', 'date')).toEqual({ status: 'clean', value: '2020-01-01' });
  });
});

describe('convert — references and dead ends', () => {
  it('anything -> reference needs a manual re-pick', () => {
    expect(convert('2015', 'text', 'reference').status).toBe('needs_attention');
    expect(convert(3, 'number', 'reference').status).toBe('needs_attention');
  });
  it('reference -> number/boolean/date has no mapping', () => {
    expect(convert('ent_x', 'reference', 'number').status).toBe('needs_attention');
    expect(convert('ent_x', 'reference', 'boolean').status).toBe('needs_attention');
  });
  it('same type is a clean no-op', () => {
    expect(convert('hi', 'text', 'text')).toEqual({ status: 'clean', value: 'hi' });
  });
});

describe('retypeBaseSeverity + maxSeverity', () => {
  it('classifies the baseline severity of a retype', () => {
    expect(retypeBaseSeverity('number', 'text')).toBe('safe');
    expect(retypeBaseSeverity('reference', 'text')).toBe('warning');
    expect(retypeBaseSeverity('boolean', 'number')).toBe('safe');
    expect(retypeBaseSeverity('text', 'number')).toBe('warning');
    expect(retypeBaseSeverity('date', 'number')).toBe('warning');
    expect(retypeBaseSeverity('text', 'reference')).toBe('destructive');
    expect(retypeBaseSeverity('boolean', 'date')).toBe('destructive');
  });
  it('takes the more severe of two levels', () => {
    expect(maxSeverity('safe', 'risky')).toBe('risky');
    expect(maxSeverity('destructive', 'warning')).toBe('destructive');
    expect(maxSeverity('warning', 'warning')).toBe('warning');
  });
});
