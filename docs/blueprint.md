# App Name: ManpowerFlow (Project: Manpower OPEC)

## Goal
End-to-end manpower operations for onshore/offshore work:
Customer/Contract/Project planning → Wave requirements → Assignment → Timesheet/Attendance → Payroll → Billing/Accounting → Compliance & Audit.

## Core Features (as implemented)
- Firebase Auth (email/password)
- Role-based access control (RBAC)
- Firestore-backed master data and transactions
- Admin utilities: roles, permissions, audit logs, company profile, cooldown policy

## Roles (source of truth)
Seed into Firestore `/roles` using the role codes in `src/lib/roles.ts`:

- ADMIN
- HR_OFFICER, HR_MANAGER
- OPERATION_OFFICER, OPERATION_MANAGER
- PAYROLL_OFFICER
- FINANCE_OFFICER, FINANCE_MANAGER
- MANAGEMENT_MANAGER

Notes:
- Users are stored in `/users` (doc id = Firebase Auth UID).
- Users reference roles via `roleIds` (role document ids).
- `isAdmin` is an override for full access (ops/dev).

## Navigation / Modules
Operation: Customers, Contracts, Projects, Waves, Assignments  
HR & Manpower: Employees (Office/Manpower), Timesheets, Attendance, P.N.D.1, L.Y.01, Compliance Alerts, HR Settings  
Accounting: Pending Processing, Billing Runs, Invoices, A/R, A/P, Cash, Payroll  
Admin: Users, Roles, Permissions, Company Profile, Cooldown Policy, Employee History, Audit Logs

## Style Guidelines
- Tailwind + shadcn/ui
- Inter for body, Space Grotesk for headlines
- Role-based module grouping for clarity