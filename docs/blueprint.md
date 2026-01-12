# Manpower OPEC - Blueprint

## Overall Vision
ระบบบริหารกำลังคน (Onshore/Offshore) ครอบคลุมตั้งแต่ Operation planning → Assignment → Timesheet/Attendance → Payroll → Billing/Accounting → Compliance & Admin

> ชื่อที่แสดงใน UI ปัจจุบันคือ “ManpowerFlow”

## Core Modules (under /dashboard)

### Operation
- **Customers (ลูกค้า)**: `/dashboard/clients`
- **Contracts**: `/dashboard/contracts`
  - Sale Rates (Onshore/Offshore)
  - OT Rules (Billing-side) & Day Pay Rules
  - Payroll-side OT Rules (Cost-side)
  - Custom Holiday Calendar
- **Projects**: `/dashboard/projects`
- **Waves**: `/dashboard/waves`
  - Planning Work Period
  - Manpower Requirement (Position, Count, Certificates, Skills)

### HR & Manpower
- **Employee Management**:
  - `/dashboard/hr/employees/field`: Manpower employees
  - `/dashboard/hr/employees/office`: Office employees
- **Assignments**: `/dashboard/hr/assignments`
  - Central view of all assignments across all waves.
- **Timesheets**: `/dashboard/hr/timesheets`
  - **Intake**: Create batches from a wave for a specific cutoff month (YYYY-MM).
  - **Batch Details**: Add/edit lines, approve, and lock for Finance.
- **Office Attendance**: `/dashboard/hr/attendance`
- **P.N.D.1 Tax Forms**: `/dashboard/hr/pnd1`
- **L.Y.01 Tax Forms**: `/dashboard/hr/tax-profiles`
- **Compliance Alerts**: `/dashboard/hr/compliance-alerts`
  - Monitors expiring documents (passports, certificates).
- **HR Settings**:
  - Holidays: `/dashboard/hr/holidays`
  - OT Settings: `/dashboard/hr/settings/overtime`
  - Master Data (Positions, Cert Types, Hospitals)

### Accounting & Finance
- **Pending Processing**: `/dashboard/finance/pending-billing`
  - A queue of HR-approved timesheet batches ready for payroll/billing.
- **Payroll**: `/dashboard/finance/payroll`
  - **Payroll Run**: A snapshot calculation of costs from an approved timesheet batch.
- **Billing**:
  - Billing Runs: `/dashboard/billing/runs`
  - Invoices: `/dashboard/billing/invoices`
- **Core Accounting (A/R, A/P, Cash)**:
  - Accessible from the "Core Accounting" menu group.

### Admin
- **Users**: `/dashboard/admin/users`
- **Roles**: `/dashboard/admin/roles`
- **Permissions**: `/dashboard/admin/permissions`
- **System**:
  - Company Profile: `/dashboard/admin/system/company-profile`
  - **Security**: `/dashboard/admin/system/security` (Manages bootstrap admin allowlist & lock)
- **Cooldown Policy**: `/dashboard/admin/cooldown`
- **Auditing**:
  - Employee History: `/dashboard/admin/employee-history`
  - Audit Logs: `/dashboard/admin/audit-logs`
