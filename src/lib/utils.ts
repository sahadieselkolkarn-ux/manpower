
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Timestamp } from "firebase/firestore";
import { InvoiceStatus } from "@/types/invoice";
import { BillStatus } from "@/types/ap-bill";
import { BadgeProps } from "@/components/ui/badge";
import { format, parse, isValid, toDate as fnsToDate } from "date-fns";

export const DATE_FORMAT = 'dd/MM/yyyy';

/**
 * Converts various date-like values (Timestamp, Date, string) into a JavaScript Date object.
 * It intelligently handles 'dd/MM/yyyy' strings and standard ISO date strings.
 * @param value The value to convert. Can be a Firestore Timestamp, Date object, string, or number.
 * @returns A Date object, or undefined if the input is invalid or cannot be parsed.
 */
export const toDate = (value: unknown): Date | undefined => {
  if (!value) return undefined;
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string') {
    // First, try parsing the standard 'dd/MM/yyyy' format
    const parsedThaiFormat = parse(value, DATE_FORMAT, new Date());
    if (isValid(parsedThaiFormat)) {
      return parsedThaiFormat;
    }
    // As a fallback, try parsing ISO 8601 or other standard date strings
    const fromString = fnsToDate(value);
    if(isValid(fromString)) return fromString;
  }
  if (typeof value === 'number') {
     const fromNumber = fnsToDate(value);
     if(isValid(fromNumber)) return fromNumber;
  }

  // Return undefined if no valid conversion is found
  return undefined;
};

/**
 * Formats a given date value into the standard Thai "dd/MM/yyyy" format.
 * Returns 'N/A' for null/undefined inputs and 'Invalid Date' for unparseable values.
 * @param date The date value to format (Timestamp, Date, string, number).
 * @returns A formatted string 'dd/MM/yyyy' or a fallback string.
 */
export const formatDate = (date: Date | Timestamp | string | number | undefined | null): string => {
    if (!date) return ''; // Return empty string for form inputs, 'N/A' is better for display tables.
    const dateObj = toDate(date);
    if (!dateObj || !isValid(dateObj)) return 'Invalid Date';
    try {
        return format(dateObj, DATE_FORMAT);
    } catch (error) {
        return 'Invalid Date';
    }
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getInvoiceStatusVariant = (status: InvoiceStatus): BadgeProps['variant'] => {
    switch (status) {
        case 'PAID':
            return 'default'; // Or a success-like variant
        case 'SENT':
        case 'UNPAID':
            return 'outline';
        case 'PARTIAL':
            return 'secondary';
        case 'VOID':
        case 'DRAFT':
            return 'destructive';
        default:
            return 'secondary';
    }
};

export const getBillStatusVariant = (status: BillStatus): BadgeProps['variant'] => {
    switch (status) {
        case 'PAID':
            return 'default';
        case 'APPROVED':
            return 'secondary';
        case 'DRAFT':
            return 'outline';
        case 'VOID':
            return 'destructive';
        default:
            return 'secondary';
    }
};
