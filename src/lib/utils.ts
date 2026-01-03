import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Timestamp } from "firebase/firestore";
import { InvoiceStatus } from "@/types/invoice";
import { BillStatus } from "@/types/ap-bill";
import { BadgeProps } from "@/components/ui/badge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const toDate = (value: unknown): Date | undefined => {
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
  return undefined;
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
