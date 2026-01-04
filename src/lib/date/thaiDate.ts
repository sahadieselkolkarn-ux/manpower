
'use client';

import { format, parse, isValid } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

export const DATE_FORMAT_THAI = 'dd/MM/yyyy';
export const DATE_FORMAT_ISO = 'yyyy-MM-dd';

/**
 * Converts various date-like values into a JavaScript Date object.
 * It intelligently handles Firestore Timestamps, JS Dates, and strings in various formats.
 * @param value The value to convert. Can be a Firestore Timestamp, Date object, string (ISO or dd/MM/yyyy), or number.
 * @returns A Date object, or undefined if the input is invalid or cannot be parsed.
 */
export function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  
  if (typeof value === 'string') {
    // Try parsing ISO format first, as it's more standard
    const fromISO = new Date(value);
    if (isValid(fromISO)) return fromISO;
    
    // Then try parsing the Thai 'dd/MM/yyyy' format
    const fromThai = parse(value, DATE_FORMAT_THAI, new Date());
    if (isValid(fromThai)) return fromThai;
  }
  
  if (typeof value === 'number') {
    const fromNumber = new Date(value);
    if (isValid(fromNumber)) return fromNumber;
  }

  return undefined;
}

/**
 * Formats a given date value into the standard Thai "dd/MM/yyyy" format.
 * Returns an empty string for null/undefined/invalid inputs, which is suitable for form fields.
 * @param date The date value to format (Timestamp, Date, string, number).
 * @returns A formatted string 'dd/MM/yyyy' or an empty string.
 */
export function formatDate(date: any): string {
    if (!date) return '';
    const dateObj = toDate(date);
    if (!dateObj || !isValid(dateObj)) return '';
    try {
        return format(dateObj, DATE_FORMAT_THAI);
    } catch (error) {
        return '';
    }
}


/**
 * Parses a string in "dd/MM/yyyy" format and converts it to an ISO "YYYY-MM-DD" string.
 * @param thaiDate The date string in "dd/MM/yyyy" format.
 * @returns An object indicating success or failure. On success, it contains the ISO string.
 */
export function parseThaiDateToISO(thaiDate: string): { ok: true; iso: string } | { ok: false; error: string } {
    if (!thaiDate) {
        return { ok: true, iso: '' }; // Allow empty value
    }
    const dateObj = parse(thaiDate, DATE_FORMAT_THAI, new Date());
    if (isValid(dateObj)) {
        return { ok: true, iso: format(dateObj, DATE_FORMAT_ISO) };
    }
    return { ok: false, error: `Invalid date format. Please use ${DATE_FORMAT_THAI}.` };
}

/**
 * Formats an ISO date string "YYYY-MM-DD" into a Thai date string "dd/MM/yyyy".
 * @param isoDate The date string in "YYYY-MM-DD" format.
 * @returns A formatted string "dd/MM/yyyy" or an empty string if the input is invalid.
 */
export function formatThaiDateFromISO(isoDate: string | null | undefined): string {
    if (!isoDate) return '';
    const dateObj = parse(isoDate, DATE_FORMAT_ISO, new Date());
    if (isValid(dateObj)) {
        return format(dateObj, DATE_FORMAT_THAI);
    }
    return '';
}
