# Payroll Monthly Runbook

This document outlines the standard monthly procedure for processing payroll from timesheets.

## Roles Involved
- **HR Officer/Manager**: Responsible for creating and approving timesheet batches.
- **Finance Officer/Manager/Payroll**: Responsible for generating, reviewing, and marking payroll as paid.

---

## Step-by-Step Procedure

### 1. Create Monthly Timesheet Batch
- **Who**: HR
- **Where**: `HR & Manpower > Timesheets` -> `New Intake Batch`
- **Action**:
    1. Select the `Wave` that work was performed for.
    2. Select the correct `Cutoff Month` (e.g., "2024-08"). The system will automatically set the start and end dates.
    3. Click `Create Batch`. You will be redirected to the new batch's detail page.

### 2. Enter and Verify Timesheet Lines
- **Who**: HR
- **Where**: Timesheet Batch Detail Page (`/dashboard/hr/timesheets/[batchId]`)
- **Action**:
    1. Click `Add Line` to add a new work record for an assigned employee.
    2. Fill in the `Work Date`, `Work Type`, `Normal Hours`, and `OT Hours`.
    3. Save the line. Repeat for all work records in the period.
    4. Verify all lines for accuracy. Check for any anomaly flags.

### 3. Approve and Lock Timesheet Batch
- **Who**: HR Manager
- **Where**: Timesheet Batch Detail Page
- **Action**:
    1. Once all data is verified, click the `Approve & Lock` button.
    2. Confirm the action in the dialog.
- **Result**: The batch status changes to `HR APPROVED`. It now appears in the `Finance > Pending Processing` queue and the `Finance > Payroll` list.

### 4. Generate Payroll Run
- **Who**: Finance
- **Where**: `Finance > Payroll` (`/dashboard/finance/payroll`)
- **Action**:
    1. Find the batch with the status `HR APPROVED` and `Not Generated` for payroll.
    2. Click the `Generate Payroll` button.
- **Result**: The system calculates all costs and sales values, creating a `Payroll Run` snapshot. The status will change to `Generated`, and the button will become `Open Payroll`.

### 5. Review Payroll and Export
- **Who**: Finance
- **Where**: Payroll Run Detail Page (`/dashboard/finance/payroll/[batchId]`)
- **Action**:
    1. Click `Open Payroll` from the list page to go to the detail page.
    2. Review the cost breakdown per employee.
    3. Review the total cost, total sale, and gross margin summaries.
    4. Click `Export CSV` to download the data for external use (e.g., for bank transfers).

### 6. Mark as Paid
- **Who**: Finance
- **Where**: Payroll Run Detail Page
- **Action**:
    1. After payments have been disbursed, click the `Mark Payroll as Paid` button.
    2. Confirm the action.
- **Result**:
    - The `Payroll Run` status changes to `PAID`.
    - The corresponding `Timesheet Batch` status changes to `FINANCE_PAID`.
    - The process for this batch is now complete.
