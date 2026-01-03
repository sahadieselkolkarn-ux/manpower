
import { type Timestamp } from 'firebase/firestore';

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'VOID' | 'UNPAID' | 'PARTIAL';

export interface ManpowerInvoiceItem {
    assignmentId: string;
    description: string;
    normalAmount: number;
    otAmount: number;
}

export interface CommercialInvoiceItem {
    description: string;
    amount: number;
}

export interface Invoice {
    id: string;
    clientId: string;
    invoiceNumber: string;
    issueDate: Timestamp;
    dueDate: Timestamp;
    status: InvoiceStatus;
    manpowerItems?: ManpowerInvoiceItem[];
    commercialItems?: CommercialInvoiceItem[];

    // Financials
    subtotal: number;       // Amount before VAT
    vatAmount: number;      // VAT amount (e.g., 7% of subtotal)
    totalAmount: number;    // Subtotal + VAT
    whtAmount?: number;     // Withholding Tax amount (e.g., 3% of subtotal)
    netReceivable: number;  // Total - WHT

    paidAmount?: number;     // Total cash received so far
    whtReceivedAmount?: number; // Total WHT recorded so far
}
