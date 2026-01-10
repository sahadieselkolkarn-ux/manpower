# ManpowerFlow - System Blueprint

This document outlines the high-level structure, roles, and navigation of the ManpowerFlow application, aligned with the current implementation.

---

## 1. Core Modules

The application is divided into four primary modules, each with a distinct set of responsibilities.

### 1.1. Operation Module
- **Purpose:** Manages the entire operational workflow from client setup to manpower assignment.
- **Key Entities:** Customers (Clients), Contracts, Projects, Waves, Assignments.
- **Primary Users:** `OPERATION_MANAGER`, `OPERATION_OFFICER`.

### 1.2. HR Module (Human Resources)
- **Purpose:** Handles all aspects of employee management, from master data to time tracking and compliance.
- **Key Entities:** Employees (Office & Field), Timesheet Batches, Attendance, Tax Forms (P.N.D.1, L.Y.01), Compliance Documents.
- **Primary Users:** `HR_MANAGER`, `HR_OFFICER`.

### 1.3. Accounting Module
- **Purpose:** Manages all financial transactions, including billing, payments, and cash flow.
- **Key Entities:** Invoices, Bills (A/P), Payments (A/R, A/P), Bank Accounts, Payroll Runs.
- **Primary Users:** `FINANCE_MANAGER`, `FINANCE_OFFICER`, `PAYROLL_OFFICER`.

### 1.4. Admin Module
- **Purpose:** System-wide governance, user management, and configuration.
- **Key Entities:** Users, Roles, Company Profile, System Policies (e.g., Cooldown).
- **Primary Users:** `ADMIN`.

---

## 2. User Roles (RBAC)

User access is governed by role codes stored in `users/{userId}.roleCodes`. The `ADMIN` role has unrestricted access.

| Role Code              | Department  | Level   | Core Responsibilities                                                      |
|------------------------|-------------|---------|----------------------------------------------------------------------------|
| **`ADMIN`**            | ADMIN       | SYSTEM  | Full system access, user management, system configuration.                 |
| **`OPERATION_MANAGER`**| OPERATION   | MANAGER | Manages customers, contracts, projects, waves, and assignments.            |
| **`OPERATION_OFFICER`**| OPERATION   | OFFICER | Assists with operational data entry and management.                        |
| **`HR_MANAGER`**       | HR          | MANAGER | Manages all HR functions, including employee data, timesheets, and policies. |
| **`HR_OFFICER`**       | HR          | OFFICER | Handles day-to-day HR tasks, data entry, and timesheet processing.         |
| **`FINANCE_MANAGER`**  | FINANCE     | MANAGER | Oversees all accounting functions, approves payments, and manages cash flow. |
| **`FINANCE_OFFICER`**  | FINANCE     | OFFICER | Handles A/R, A/P, and financial reporting.                                 |
| **`PAYROLL_OFFICER`**  | FINANCE     | OFFICER | Processes payroll from approved timesheets.                                |
| **`MANAGEMENT_MANAGER`**| MANAGEMENT  | MANAGER | General management role with read-only access to key operational/HR data.  |

*Source of Truth: `src/lib/roles.ts`*

---

## 3. Navigation & Menu Structure

This is the primary navigation structure as seen in the application's sidebar. Visibility is controlled by the user's roles.

- **Dashboard** (`/dashboard`)
- **Operation**
  - Customers (ลูกค้า) (`/dashboard/clients`)
  - Contracts (`/dashboard/contracts`)
  - Projects (`/dashboard/projects`)
  - Waves (`/dashboard/waves`)
  - Assignments (`/dashboard/hr/assignments`)
- **HR & Manpower**
  - Office Employees (`/dashboard/hr/employees/office`)
  - Manpower Employees (`/dashboard/hr/employees/field`)
  - Timesheets (`/dashboard/hr/timesheets`)
  - Attendance (`/dashboard/hr/attendance`)
  - P.N.D.1 Runs (`/dashboard/hr/pnd1`)
  - L.Y.01 Forms (`/dashboard/hr/tax-profiles`)
  - Compliance Alerts (`/dashboard/hr/compliance-alerts`)
  - HR Settings (Sub-menu)
    - Holidays, Policies, Position Types, Hospitals
- **Accounting**
  - Pending Processing (`/dashboard/finance/pending-billing`)
  - Billing (Sub-menu)
    - Billing Runs, Invoices
  - Core Accounting (Sub-menu)
    - A/R, A/P, Cash, Payroll
- **Admin**
  - Users (`/dashboard/admin/users`)
  - Roles (`/dashboard/admin/roles`)
  - Permissions (`/dashboard/admin/permissions`)
  - System (Sub-menu)
    - Company Profile
  - Cooldown Policy (`/dashboard/admin/cooldown`)
  - Employee History (`/dashboard/admin/employee-history`)
  - Audit Logs (`/dashboard/admin/audit-logs`)

*This structure reflects the UI components in `src/components/sidebar-layout.tsx` and related pages.*