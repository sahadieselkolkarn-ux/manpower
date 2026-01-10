# ManpowerFlow (OPEC Project)

**ManpowerFlow** is an integrated web application designed to streamline manpower management for the oil & gas service industry, covering the entire lifecycle from operational planning to financial accounting. This system, developed under the project codename "OPEC" (Operations-HR-Accounting), serves as a single source of truth for all manpower-related activities.

Built with Next.js, Firebase, and Tailwind CSS, ManpowerFlow provides a role-based interface to manage complex workflows efficiently.

---

## 1. Project Scope & Modules

The system is organized into four core modules, accessible based on user roles:

| Module      | Key Responsibilities                                                                       |
|-------------|--------------------------------------------------------------------------------------------|
| **Operation** | Manages the core business flow: Customers, Contracts, Projects, Waves, and Assignments.    |
| **HR**      | Manages employee lifecycle, timesheets, compliance, and master data like positions.        |
| **Accounting**| Handles billing, payroll, accounts receivable (A/R), accounts payable (A/P), and cash flow. |
| **Admin**     | Governs system-wide settings, user management, roles, permissions, and audit logs.         |

---

## 2. RBAC (Role-Based Access Control)

Access to modules and actions is strictly controlled by a user's assigned roles. The system is built around these core functional roles:

- `ADMIN`: Full system access.
- `OPERATION_MANAGER` / `OPERATION_OFFICER`: Manages operational data.
- `HR_MANAGER` / `HR_OFFICER`: Manages employee and timesheet data.
- `FINANCE_MANAGER` / `FINANCE_OFFICER` / `PAYROLL_OFFICER`: Manages financial data.
- `MANAGEMENT_MANAGER`: General oversight role.

For detailed permission mappings, refer to `src/lib/rbac/permissions.ts`.

---

## 3. Data Model

The core data architecture is defined in `docs/backend.json`, which serves as the blueprint for all Firestore collections and data entities used in the application. This file is the single source of truth for our data schema.

---

## 4. Local Development

To run the project locally, follow these steps:

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Run the development server:**
    The app runs on port `9002`.
    ```bash
    npm run dev
    ```

---

## 5. Documentation Index

- **[Final Scope & System Flow](./docs/opec-final.md)**: A comprehensive overview of the system's intended workflow and features.
- **[System Blueprint](./docs/blueprint.md)**: Detailed breakdown of modules, roles, and navigation.
- **[Data Model (backend.json)](./docs/backend.json)**: The authoritative schema for all Firestore collections and entities.