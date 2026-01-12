# Billing Monthly Runbook

This document outlines the standard procedure for generating client invoices from approved timesheet data.

## Roles Involved
- **Finance Officer/Manager**: Responsible for generating, reviewing, and sending invoices.

---

## Step-by-Step Procedure

### 1. Navigate to Billing Runs
- **Who**: Finance
- **Where**: `Billing > Billing Runs` (`/dashboard/billing/runs`)
- **Action**: This page lists all timesheet batches that are in status `HR_APPROVED` or `FINANCE_PAID`, making them available for invoicing.

### 2. Select an Approved Batch
- **Who**: Finance
- **Action**:
    1. Identify the batch you want to invoice. The `Invoice Status` column will show `Not Generated` for new batches.
    2. Ensure the timesheet data is correct by opening the batch if necessary.

### 3. Generate Invoice
- **Who**: Finance
- **Where**: Billing Runs Page
- **Action**:
    1. Click the `Generate Invoice` button for the desired batch.
    2. The system will perform calculations based on the `saleLineItems` from the corresponding payroll run.
- **Result**:
    - An `invoice` document is created in Firestore.
    - An `invoiceNumber` is automatically generated (e.g., `INV-2408-001`).
    - The `Invoice Status` on the Billing Runs page updates to show the new invoice number.
    - The button changes to `View Invoice`.

### 4. Review Invoice
- **Who**: Finance
- **Where**: Invoice Detail Page (`/dashboard/billing/invoices/[invoiceId]`)
- **Action**:
    1. Click `View Invoice` or navigate via the main `Billing > Invoices` menu.
    2. Review the financial summary: Subtotal, VAT, Total Amount, WHT, and Net Receivable.
    3. (Future) Review the detailed line items.

### 5. Send Invoice and Record Payment (Future Steps)
- **Who**: Finance
- **Action**:
    1. Use the `Export PDF` function to generate a document to send to the client.
    2. Change the invoice status to `SENT`.
    3. When payment is received, use the `Record Payment` functionality in the A/R module.
