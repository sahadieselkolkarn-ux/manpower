# System Walkthrough Guide

This guide provides step-by-step instructions for key user roles to perform their core tasks in the ManpowerFlow system.

---

## 1. OPERATION (Operation Manager / Officer)

### Goal: Set up a new work wave and assign employees.

**Step 1: Verify Client, Contract, and Project**
- **URL:** `/dashboard/clients`
- **Action:** Find the target client (e.g., "Chevron"). Click to enter the client details page.
- **Action:** On the client page, verify that the correct contract exists. Click on the contract name to enter its details page.
- **Action:** On the contract page, verify that the target project exists. Click on the project name.
- **Expected Result:** You should now be on the Project Details page, ready to create a wave.

**Step 2: Create a New Wave**
- **URL:** Project Details Page (e.g., `/dashboard/clients/.../projects/[projectId]`)
- **Action:** Click the "Add Wave" button.
- **Action:** In the form:
    - Set the "Planning Work Period" (Start and End Date).
    - Under "Manpower Requirement", click "Add Requirement".
    - Select a "Position" (e.g., "Foreman").
    - Enter the "Count" (e.g., 2).
    - Add another requirement if needed (e.g., "Welder", Count: 5).
    - Click "Save Wave".
- **Expected Result:** You are returned to the Project Details page, and the new wave appears in the "Waves" table. A `WV-YYMM-XXX` code is auto-generated.

**Step 3: Assign an Employee**
- **URL:** Wave Details Page (e.g., `/dashboard/clients/.../waves/[waveId]`)
- **Action:** Click the "Add Assignment" button.
- **Action:** In the form:
    - The wave should already be selected.
    - Select a "Position" from the dropdown (e.g., "Foreman").
    - The table of available employees will be filtered. Select an eligible employee by ticking the checkbox.
    - Click the "Assign X Employees" button.
- **Expected Result:** You are redirected back to the Wave Details page, and the employee's name now appears in the "Assignments" table.

---

## 2. HR (HR Manager / Officer)

### Goal: Create a timesheet batch for a wave, input data, and approve it for Finance.

**Step 1: Create a Timesheet Intake Batch**
- **URL:** `/dashboard/hr/timesheets`
- **Action:** Click "New Intake Batch".
- **Action:** On the intake page (`/dashboard/hr/timesheets/intake`):
    - Use the "Wave Selector" to find and select the wave created in the Operation flow.
    - The period dates will pre-fill. Confirm they are correct.
    - Click "Create Batch".
- **Expected Result:** You are redirected to the Timesheet Batch Details page (`/dashboard/hr/timesheets/[batchId]`).

**Step 2: Add Timesheet Lines**
- **URL:** Timesheet Batch Details Page
- **Action:** Click "Add Line".
- **Action:** In the form:
    - Select the "Assigned Employee" you assigned earlier.
    - Set the "Work Date" to a date within the batch period.
    - Set "Work Type" to `NORMAL`.
    - Enter "Normal Hours" (e.g., 8).
    - Enter "OT Hours" (e.g., 2).
    - Click "Save Line".
- **Expected Result:** The new line item appears in the "Timesheet Lines" table. Repeat for a few more days/employees as needed.

**Step 3: Approve and Lock the Batch**
- **URL:** Timesheet Batch Details Page
- **Action:** Once all data is entered, click the "Approve & Lock" button.
- **Action:** Confirm in the dialog box.
- **Expected Result:**
    - The batch status badge changes to "HR APPROVED".
    - The "Add Line" button and editing controls are now disabled.
    - The batch will now appear on the "Pending Processing" page for the Finance team.

---

## 3. FINANCE (Finance Officer / Payroll Officer / Finance Manager)

### Goal: Process an HR-approved batch for payroll.

**Step 1: Find the Pending Batch**
- **URL:** `/dashboard/finance/pending-billing`
- **Action:** Locate the timesheet batch that was approved by HR in the previous step. The list is ordered by the newest first.
- **Expected Result:** You should see the batch with the status "HR_APPROVED".

**Step 2: Preview Payroll Summary**
- **URL:** `/dashboard/finance/payroll` (This is the main Payroll page)
- **Action:** Find the same batch in the "Batches Ready for Payroll" table.
- **Action:** Click the "Preview Payroll" button.
- **Expected Result:** You are taken to the Payroll Preview page (`/dashboard/finance/payroll/[batchId]`).

**Step 3: Verify and Export Summary**
- **URL:** Payroll Preview Page
- **Action:** Review the "Employee Hour Summary" table. Check if the `Total Days`, `Total Normal Hr`, and `Total OT Hr` match the data entered by HR.
- **Action:** Click the "Export CSV" button.
- **Expected Result:** A CSV file is downloaded. Open it and verify the columns and data match what is shown on the screen.

**Step 4: Mark Batch as Paid (Simulates Payroll Completion)**
- **URL:** Timesheet Batch Details Page (`/dashboard/hr/timesheets/[batchId]`)
- **Action:** As a user with Finance rights, navigate to the batch details page (you can get there from the "Pending Processing" page).
- **Action:** Click the "Mark as Paid" button.
- **Action:** Confirm the date in the dialog.
- **Expected Result:** The batch status badge changes to "FINANCE PAID". The batch is now considered fully processed.

---

## 4. ADMIN (System Administrator)

### Goal: Manage system settings and user access.

**Step 1: Manage System Security**
- **URL:** `/dashboard/admin/system/security`
- **Action:** Observe the current status of the "Bootstrap" setting.
- **Action:** Add your own secondary email to the "Admin Email Allowlist" and click "Save Allowlist".
- **Action:** Click "Lock Bootstrap" (if it's open).
- **Expected Result:** The status should change to "LOCKED", and the allowlist should reflect your changes upon page refresh.

**Step 2: Review Permissions Matrix**
- **URL:** `/dashboard/admin/permissions`
- **Action:** Review the grid of roles and permissions. Use the search bar to filter for "EMPLOYEES".
- **Expected Result:** The table should filter to show only permissions related to employees, and you can see which roles (like `HR_MANAGER`) have access.

**Step 3: Manage Roles**
- **URL:** `/dashboard/admin/roles`
- **Action:** Click "Create Role".
    - Name: `Test Role`
    - Code: `TEST_ROLE`
    - Department/Level: `CUSTOM`
    - Click "Save Role".
- **Expected Result:** The new role appears in the "All Roles" table.
- **Action:** Find the `ADMIN` role.
- **Expected Result:** The "Delete" option in its action menu should be disabled.
- **Action:** Find `Test Role` and delete it.

**Step 4: Assign Role to a User**
- **URL:** `/dashboard/admin/users`
- **Action:** Find a test user (or your own account). Click the "More" icon (...) and select "Edit Roles".
- **Action:** In the modal, check the box for a role (e.g., `HR_OFFICER`). Click "Save".
- **Expected Result:** The user's role list in the table now includes "HR_OFFICER".