# Smoke Test Flow (E2E)

This document outlines the minimum end-to-end flow to verify that the core system is functioning correctly after a deployment.

## Prerequisites
1.  **Run the app**: `npm run dev`
2.  **Login**: Access `http://localhost:9002` and log in with a user that has `OPERATION`, `HR`, and `FINANCE` roles. An Admin account is recommended for full access.

## Test Steps

### 1. Select a Work Wave
- **Action**: Navigate to `Operation > Waves` (`/dashboard/waves`).
- **Check**: The page loads and displays a list of waves.
- **Action**: Find a wave that is suitable for testing or create a new one. Click on it to go to the Wave Details page.
- **Check**: You are on the correct wave details page (e.g., `/dashboard/clients/.../waves/[waveId]`).

### 2. Test New Assignment Logic
- **Action**: On the Wave Details page, click **"Assign"** or navigate directly to `HR & Manpower > Assignments > New Assignment` (`/dashboard/hr/assignments/new`).
- **Action**: Select the test wave from the dropdown.

#### Test Case 2a: Block Assignment if Sale Rate is Zero
- **Action**: Select a position that you know has a `saleRate` of **0** in the contract.
- **Action**: Select an eligible employee.
- **Action**: Click the **"Assign Employee"** button.
- **Expected Result**: A `toast` notification appears with the error message "Assignment Blocked" and a description indicating the sale rate is zero. The assignment is **not** created.

#### Test Case 2b: Successful Assignment
- **Action**: Select a position that has a valid `saleRate` (> 0).
- **Action**: Select an employee who is eligible for the assignment.
- **Action**: Click the **"Assign Employee"** button.
- **Expected Result**: A `toast` notification appears confirming "Employee assigned successfully." You are redirected back to the wave details page.
- **Verification**: The employee's name appears in the "Assignments" table on the wave details page.

### 3. Create and Process a Timesheet
- **Action**: Navigate to `HR & Manpower > Timesheets` (`/dashboard/hr/timesheets`).
- **Action**: Click **"New Intake Batch"**.
- **Action**:
    - Select the same **Wave** used in the previous step.
    - Select the correct **Cutoff Month**.
    - Click **"Create Batch"**.
- **Check**: You are redirected to the Timesheet Batch Details page (e.g., `/dashboard/hr/timesheets/[batchId]`).

### 4. Add Timesheet Lines
- **Action**: On the Batch Details page, click **"Add Line"**.
- **Action**: Select the employee you assigned earlier.
- **Action**: Enter work details (e.g., Work Date, Work Type: NORMAL, Normal Hours: 8, OT Hours: 2).
- **Action**: Click **"Save Line"**.
- **Check**: The new line appears correctly in the "Timesheet Lines" table.
- **Action**: Add a few more lines for different days or work types if needed.

### 5. Approve Timesheet (HR)
- **Action**: On the Batch Details page, click **"Approve & Lock"**.
- **Action**: Confirm the action in the dialog.
- **Check**:
    - The batch status changes to **"HR APPROVED"**.
    - The "Add Line" button and editing actions are now disabled.

### 6. Generate Payroll (Finance)
- **Action**: Navigate to `Finance > Payroll` (`/dashboard/finance/payroll`).
- **Check**: The batch from the previous step should appear with a "Not Generated" payroll status.
- **Action**: Click the **"Generate Payroll"** button for that batch.
- **Check**: The button should change to "Open Payroll".

### 7. Review and Mark Payroll Paid (Finance)
- **Action**: Click **"Open Payroll"**.
- **Check**: You are on the Payroll Run detail page. Verify the summary table shows calculated costs.
- **Action**: Click **"Export CSV"** and check the downloaded file.
- **Action**: Click **"Mark Payroll as Paid"** and confirm.
- **Check**:
    - The payroll status on this page changes to `PAID`.
    - Navigate back to the original timesheet batch (`/dashboard/hr/timesheets/[batchId]`). Its status should now be `FINANCE_PAID`.

### 8. Generate Invoice (Finance)
- **Action**: Navigate to `Billing > Billing Runs` (`/dashboard/billing/runs`).
- **Check**: The same batch should appear in this list.
- **Action**: Click **"Generate Invoice"**.
- **Check**: The button changes to "View Invoice" and an invoice number appears.
- **Action**: Click **"View Invoice"**.
- **Check**: You are on the Invoice Detail page, and the financial summary (subtotal, VAT, total) is calculated correctly.

### 9. Firestore Verification (Optional)
- **assignments**: Check the `/assignments` collection.
- **timesheetBatches**: Check the `/timesheetBatches` collection for the final `FINANCE_PAID` status.
- **timesheetLines**: Check the `/timesheetLines` collection.
- **payrolls**: A document with ID equal to the batch ID should exist in `/payrolls` with `status: 'PAID'`.
- **invoices**: A new document should exist in `/invoices` with `status: 'DRAFT'`.
