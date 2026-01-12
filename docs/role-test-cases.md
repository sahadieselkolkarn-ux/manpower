# Role-Based Access Control (RBAC) - Test Cases

This document outlines test cases for verifying that users with specific roles can or cannot access certain pages and functionalities.

- **CAN ACCESS**: The user should be able to view and interact with the page as intended for their role.
- **DENIED**: The user should be redirected away from the page or shown an "Access Denied" message. They should not be able to see the page content.

## Test Matrix

| Page / Feature | URL | ADMIN | OPERATION_MANAGER | HR_MANAGER | FINANCE_MANAGER | MANAGEMENT_MANAGER |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Operation** | | | | | | |
| Customers / Contracts / Projects | `/dashboard/clients` | ✅ | ✅ | ❌ | ✅ | ✅ |
| Waves | `/dashboard/waves` | ✅ | ✅ | ❌ | ❌ | ✅ |
| New Assignment | `/dashboard/hr/assignments/new` | ✅ | ✅ | ✅ | ❌ | ✅ |
| **HR & Manpower** | | | | | | |
| Employee Mgmt (Field) | `/dashboard/hr/employees/field` | ✅ | ❌ | ✅ | ❌ | ✅ |
| Employee Mgmt (Office) | `/dashboard/hr/employees/office` | ✅ | ❌ | ✅ | ❌ | ✅ |
| Timesheets (List) | `/dashboard/hr/timesheets` | ✅ | ❌ | ✅ | ✅ | ✅ |
| Timesheets (Details) | `/dashboard/hr/timesheets/[id]` | ✅ | ❌ | ✅ | ✅ | ✅ |
| Compliance Alerts | `/dashboard/hr/compliance-alerts` | ✅ | ❌ | ✅ | ❌ | ✅ |
| HR Settings (All) | `/dashboard/hr/settings/...` | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Accounting** | | | | | | |
| Pending Processing | `/dashboard/finance/pending-billing` | ✅ | ❌ | ❌ | ✅ | ✅ |
| Payroll Processing | `/dashboard/finance/payroll` | ✅ | ❌ | ❌ | ✅ | ✅ |
| **Admin** | | | | | | |
| Users | `/dashboard/admin/users` | ✅ | ❌ | ❌ | ❌ | ❌ |
| Roles | `/dashboard/admin/roles` | ✅ | ❌ | ❌ | ❌ | ❌ |
| Permissions | `/dashboard/admin/permissions` | ✅ | ❌ | ❌ | ❌ | ❌ |
| Company Profile | `/dashboard/admin/system/company-profile` | ✅ | ❌ | ❌ | ❌ | ❌ |
| Security | `/dashboard/admin/system/security` | ✅ | ❌ | ❌ | ❌ | ❌ |
| Cooldown Policy | `/dashboard/admin/cooldown` | ✅ | ❌ | ❌ | ❌ | ❌ |
| Employee History | `/dashboard/admin/employee-history` | ✅ | ❌ | ❌ | ❌ | ✅ |
| Audit Logs | `/dashboard/admin/audit-logs` | ✅ | ❌ | ❌ | ❌ | ✅ |

**Note on Officer Roles:**
- `OPERATION_OFFICER` has similar access to `OPERATION_MANAGER` but may have fewer "write" actions.
- `HR_OFFICER` has similar access to `HR_MANAGER` but cannot approve certain items.
- `FINANCE_OFFICER` and `PAYROLL_OFFICER` have access to their specific modules within Finance.
- This matrix focuses on page-level access for `MANAGER` roles to simplify testing. The core logic is handled by `canManage...` functions in `src/lib/authz.ts`.
