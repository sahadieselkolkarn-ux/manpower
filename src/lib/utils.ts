
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Timestamp } from "firebase/firestore";
import { InvoiceStatus } from "@/types/invoice";
import { BillStatus } from "@/types/ap-bill";
import { BadgeProps } from "@/components/ui/badge";
import { format, parse, isValid } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const DATE_FORMAT = 'dd/MM/yyyy';

export const toDate = (value: unknown): Date | undefined => {
  if (!value) return undefined;
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return d;
    }
  }
  // Try parsing from dd/MM/yyyy as a fallback
  if (typeof value === 'string') {
    const parsed = parse(value, DATE_FORMAT, new Date());
    if (isValid(parsed)) {
      return parsed;
    }
  }
  return undefined;
};

export const formatDate = (date: Date | Timestamp | string | undefined | null): string => {
    if (!date) return 'N/A';
    const dateObj = toDate(date);
    if (!dateObj) return 'Invalid Date';
    return format(dateObj, DATE_FORMAT);
};


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
