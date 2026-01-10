# Manpower OPEC – Final Scope (aligned with current repo)

## End-to-end flow
1) Operation setup
- Customer → Contract (sale rates / OT rules) → Project
- Wave: planning work period + manpower requirement (position, count, certificates, skill tags)

2) Assignment
- Assign manpower employees into a Wave (prevent duplicate active assignment in the same wave)

3) HR execution
- Timesheets, Attendance
- Compliance alerts
- Master data: positions (office/manpower), certificate types, hospitals, policies, holidays

4) Finance/Accounting
- Payroll
- Billing (runs → invoices)
- A/R, A/P, Cash

5) Admin & governance
- Users / Roles / Permissions
- Company profile
- Cooldown policy
- Employee history & audit logs

## Data model reference
- Entity definitions: docs/backend.json
- Key entities: User, Role, Employee, Client, Contract, Project, Wave, Assignment