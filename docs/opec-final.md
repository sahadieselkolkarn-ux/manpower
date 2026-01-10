# ManpowerFlow: Final Scope & System Flow

This document provides a definitive, single-page overview of the ManpowerFlow system's functionality, aligned with the current repository state. It outlines the core user journey and data flow through the application's main modules.

**Authoritative Data Model:** For all entities mentioned below, the precise schema (fields, types, and constraints) is defined in **[`docs/backend.json`](./backend.json)**.

---

## 1. Core Workflow: From Setup to Payment

The system is designed around a sequential flow that passes responsibilities between departments.

### **Step 1: Operation Setup (Master Data)**
- **Actor:** `OPERATION_MANAGER`
- **Goal:** Configure the foundational data required for projects.
- **Flow:**
    1.  **Create Customer:** An operator adds a new customer (client) to the system, including their legal name, address, and contact details.
        -   *Entity:* `Client`
    2.  **Create Contract:** A contract is created under a specific customer, defining commercial terms. This includes:
        -   **Sale Rates:** Daily rates for each manpower position (`ManpowerPosition`).
        -   **OT Rules:** Overtime multipliers for different day types.
        -   *Entity:* `Contract`
    3.  **Create Project:** A project is created under a contract, specifying the work mode (`Onshore` / `Offshore`).
        -   *Entity:* `Project`

### **Step 2: Wave Planning & Manpower Requirement**
- **Actor:** `OPERATION_MANAGER`
- **Goal:** Define the specific requirements for a work period (a "Wave").
- **Flow:**
    1.  **Create Wave:** A wave is created under a project. This is the central planning document and includes:
        -   `waveCode`: An auto-generated unique identifier (e.g., `WV-2408-001`).
        -   `planningWorkPeriod`: The planned start and end dates for the work.
        -   `manpowerRequirement`: An array specifying which positions are needed, how many people for each, and any required certificates or skills.
        -   *Entity:* `Wave`

### **Step 3: Manpower Assignment**
- **Actor:** `OPERATION_OFFICER` or `OPERATION_MANAGER`
- **Goal:** Assign specific employees to the positions required by a wave.
- **Flow:**
    1.  Navigate to the **Wave Detail** page.
    2.  Use the "Add Assignment" feature, which opens a form.
    3.  The form performs **eligibility checks** in real-time:
        -   **Document Validity:** Checks if the employee's passport and certificates are expired or expiring soon.
        -   **Cooldown Policy:** Checks if the employee has had sufficient rest days since their last assignment, based on the `CooldownPolicy` settings.
    4.  An `Assignment` document is created, linking an `Employee` to the `Wave` and a specific `Position`. This document snapshots key information for historical accuracy.
        -   *Entity:* `Assignment`

### **Step 4: HR Execution (Timesheet Processing)**
- **Actor:** `HR_OFFICER` or `HR_MANAGER`
- **Goal:** Collect, verify, and approve working hours for payroll and billing.
- **Flow:**
    1.  **Create Timesheet Batch:** HR creates a `TimesheetBatch` from an operational `Wave`. This batch is tied to a specific time period.
        -   *Entity:* `TimesheetBatch`
    2.  **Data Entry:** HR can either:
        -   **Upload a PDF:** Attach the client-provided timesheet document to the batch.
        -   **Manual Entry:** Manually create `TimesheetLine` entries for each employee, detailing work type (`NORMAL`, `STANDBY`), hours, and OT.
        -   *Entity:* `TimesheetLine`
    3.  **HR Approval:** Once data entry is complete and verified, an `HR_MANAGER` approves the batch. This **locks** the batch from further edits by HR and signals to the Finance department that it is ready for processing.

### **Step 5: Finance & Accounting**
- **Actor:** `FINANCE_OFFICER`, `FINANCE_MANAGER`, `PAYROLL_OFFICER`
- **Goal:** Process payments, manage cash flow, and handle billing.
- **Flow:**
    1.  **Pending Processing:** Approved `TimesheetBatch` documents appear in the "Pending Processing" queue for the Finance team.
    2.  **Payroll & Billing:**
        -   A `Payroll` run can be generated from the timesheet data to calculate costs.
        -   An `Invoice` can be generated to bill the customer for services rendered.
        -   *Entities:* `Payroll`, `Invoice`
    3.  **A/R and A/P:**
        -   The system tracks Accounts Receivable (money owed from `Invoices`) and Accounts Payable (money owed for external `Bills`).
        -   Payments received (`ARPayment`) and payments made (`APPayment`) are recorded against their respective documents.
        -   *Entities:* `ARPayment`, `APPayment`, `BillAP`
    4.  **Cash Management:** All payments create `CashMovement` documents, providing a ledger for tracking cash flow across all `BankAccounts`.
        -   *Entities:* `CashMovement`, `BankAccount`

### **Step 6: Admin & Governance**
- **Actor:** `ADMIN`
- **Goal:** Maintain system health, manage users, and oversee all data.
- **Flow:**
    1.  **User & Role Management:** Admins create users and assign `Roles` to grant appropriate permissions.
    2.  **Master Data Management:** Admins manage system-wide master data like `CertificateType`, `Hospital`, `CompanyProfile`, etc.
    3.  **Policy Configuration:** Admins configure system-wide rules, such as the `CooldownPolicy`.
    4.  **Audit & History:** Admins have access to `AuditLog` records and a complete, unfiltered view of all data, including soft-deleted records (`isDeleted: true`).

---

This workflow ensures a clear separation of duties and a traceable data pipeline, from initial planning in Operations to final accounting in Finance, all governed by the Admin module.