import type { FieldType, Severity } from '@cms/shared';

export type ConversionResult =
  | { status: 'clean'; value: unknown }
  | { status: 'needs_attention'; reason: string };

const clean = (value: unknown): ConversionResult => ({ status: 'clean', value });
const flag = (reason: string): ConversionResult => ({ status: 'needs_attention', reason });

const TRUE_WORDS = new Set(['true', 'yes', 'y', '1']);
const FALSE_WORDS = new Set(['false', 'no', 'n', '0']);

/** Epoch millis -> `YYYY-MM-DD` (dates are stored date-only). */
function toIsoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function toText(value: unknown, from: FieldType): ConversionResult {
  switch (from) {
    case 'boolean':
      return clean(value ? 'true' : 'false');
    case 'number':
    case 'date':
    case 'reference':
      return clean(String(value));
    case 'text':
      return clean(value);
  }
}

function toNumber(value: unknown, from: FieldType): ConversionResult {
  switch (from) {
    case 'number':
      return clean(value);
    case 'boolean':
      return clean(value ? 1 : 0);
    case 'date': {
      const ms = typeof value === 'string' ? Date.parse(value) : Number.NaN;
      return Number.isNaN(ms) ? flag('is not a valid date') : clean(ms);
    }
    case 'text': {
      if (typeof value !== 'string') return flag('is not a number');
      const trimmed = value.trim();
      if (trimmed === '') return flag('is blank');
      const n = Number(trimmed);
      return Number.isFinite(n) ? clean(n) : flag(`"${value}" is not a number`);
    }
    case 'reference':
      return flag('is a reference, not a number');
  }
}

function toBoolean(value: unknown, from: FieldType): ConversionResult {
  switch (from) {
    case 'boolean':
      return clean(value);
    case 'number':
      if (value === 1) return clean(true);
      if (value === 0) return clean(false);
      return flag(`${String(value)} is not 0 or 1`);
    case 'text': {
      if (typeof value !== 'string') return flag('is not true/false');
      const word = value.trim().toLowerCase();
      if (TRUE_WORDS.has(word)) return clean(true);
      if (FALSE_WORDS.has(word)) return clean(false);
      return flag(`"${value}" is not true/false`);
    }
    case 'date':
      return flag('a date is not true/false');
    case 'reference':
      return flag('a reference is not true/false');
  }
}

function toDate(value: unknown, from: FieldType): ConversionResult {
  switch (from) {
    case 'date':
      return clean(value);
    case 'text': {
      if (typeof value !== 'string') return flag('is not a date');
      const ms = Date.parse(value.trim());
      return Number.isNaN(ms) ? flag(`"${value}" is not a date`) : clean(toIsoDate(ms));
    }
    case 'number':
      return typeof value === 'number' && Number.isFinite(value)
        ? clean(toIsoDate(value))
        : flag('is not a valid date');
    case 'boolean':
      return flag('true/false is not a date');
    case 'reference':
      return flag('a reference is not a date');
  }
}

/**
 * Convert a single non-empty value from one field type to another. Empty values
 * are the planner's concern (they don't need conversion), so callers skip them.
 * This is the single source of truth for "can this value become the new type".
 */
export function convert(value: unknown, from: FieldType, to: FieldType): ConversionResult {
  if (from === to) return clean(value);
  switch (to) {
    case 'text':
      return toText(value, from);
    case 'number':
      return toNumber(value, from);
    case 'boolean':
      return toBoolean(value, from);
    case 'date':
      return toDate(value, from);
    case 'reference':
      // No way to infer a valid target entry id from a scalar; it must be re-picked.
      return flag('must be set to a valid reference');
  }
}

const SEVERITY_RANK: Record<Severity, number> = {
  safe: 0,
  warning: 1,
  risky: 2,
  destructive: 3,
};

export function maxSeverity(a: Severity, b: Severity): Severity {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

/**
 * Baseline severity of a retype, assuming every value converts cleanly. The
 * planner escalates this to at least `risky` when some values actually fail.
 */
export function retypeBaseSeverity(from: FieldType, to: FieldType): Severity {
  if (from === to) return 'safe';
  if (to === 'text') return from === 'reference' ? 'warning' : 'safe';
  if (to === 'reference' || from === 'reference') return 'destructive';
  if (from === 'boolean' && to === 'number') return 'safe';
  if (from === 'boolean' && to === 'date') return 'destructive';
  if (from === 'date' && to === 'boolean') return 'destructive';
  // text/number/date -> number/boolean/date: sensible but fallible per value.
  return 'warning';
}
