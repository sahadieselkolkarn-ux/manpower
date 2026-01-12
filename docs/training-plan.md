# Manpower OPEC - Role-Based Training Plan

This document outlines the recommended training modules for each user role to ensure proficiency with the system.

---

### Role: ADMIN (System Administrator)
**Objective**: Understand the entire system's configuration, data flow, and user management capabilities.
**Modules**:
1.  **System Setup & Configuration**
    - `Admin > Users`: Creating users, assigning roles, managing status.
    - `Admin > Roles`: Creating and managing system-wide roles.
    - `Admin > System > Company Profile`: Configuring company details for reports.
    - `Admin > Cooldown Policy`: Setting up mandatory rest periods.
2.  **HR Settings (Full)**
    - `HR Settings > Holidays`: Managing the public holiday calendar for payroll.
    - `HR Settings > OT Settings`: Configuring weekend days, work hours, and OT divisors.
    - `HR Settings > Master Data`: Managing positions, certificate types, and hospitals.
3.  **Full End-to-End Flow (Smoke Test)**
    - Complete the `testing-smoke.md` flow to understand data relationships.
4.  **Auditing & Governance**
    - `Admin > Audit Logs`: Understanding how to trace system actions.
    - `Admin > Employee History`: Reviewing complete work records.

---

### Role: OPERATION (Manager & Officer)
**Objective**: Master the process of setting up operational data, from clients to assigning manpower.
**Modules**:
1.  **Core Operation Setup**
    - `Operation > Customers`: Managing client records.
    - `Operation > Contracts`: Creating contracts, setting sale rates, OT rules, and contract-specific holidays.
    - `Operation > Projects`: Defining projects under contracts.
    - `Operation > Waves`: Planning work periods and defining manpower requirements.
2.  **Assignment Process**
    - `HR & Manpower > Assignments > New Assignment`: Assigning employees to waves.
    - Understanding the eligibility checks (cooldown, certificates).
3.  **Information Review**
    - Navigating from Client -> Contract -> Project -> Wave to see the full picture.
    - Reviewing employee profiles (`HR & Manpower > Employee Management`) for availability and skills.

---

### Role: HR (Manager & Officer)
**Objective**: Manage employee data, compliance, and process timesheets for financial handoff.
**Modules**:
1.  **Employee & Master Data Management**
    - `HR & Manpower > Employee Management`: Creating, editing, and managing both Manpower and Office employee profiles.
    - `HR Settings > Master Data`: Managing position titles, certificate types, and hospitals.
2.  **Timesheet Processing**
    - `HR & Manpower > Timesheets > New Intake Batch`: Creating a new batch from a wave.
    - `Timesheet Batch Details`: Adding/editing/deleting timesheet lines.
    - `Timesheet Batch Details`: Using the **"Approve & Lock"** function to hand off to Finance.
3.  **Compliance & HR Policies**
    - `HR & Manpower > Compliance Alerts`: Monitoring expiring documents.
    - `HR Settings > Holidays`: Viewing and understanding the holiday calendar.
    - `HR Settings > OT Settings`: Understanding the rules that affect payroll.

---

### Role: FINANCE (Manager, Officer, Payroll)
**Objective**: Handle all financial aspects of the system, including billing, payments, and payroll processing.
**Modules**:
1.  **Accounts Payable (A/P)**
    - `Finance > A/P > Bills`: Creating and managing bills for non-payroll expenses.
    - `Finance > A/P > Payments`: Recording payments made for bills.
2.  **Accounts Receivable (A/R)**
    - `Finance > A/R > Invoices`: Reviewing outstanding invoices.
    - `Finance > A/R > Payments`: Recording payments received from clients.
3.  **Payroll & Billing Handoff**
    - `Finance > Pending Processing`: Viewing timesheet batches that are approved by HR and ready for processing.
    - `Timesheet Batch Details`: Using the **"Mark as Paid"** function (for Payroll).
    - `Billing > Billing Runs`: Using approved timesheets to generate invoices (for Billing).
4.  **Tax Forms**
    - `HR & Manpower > P.N.D.1 Runs`: Creating, managing, and exporting P.N.D.1 tax forms.
5.  **Cash Management**
    - `Finance > Cash > Dashboard`: Reviewing the overall cash position.
    - `Finance > Cash > Bank Accounts`: Managing company bank accounts.
    - `Finance > Cash > Movements`: Recording manual cash-in/out or transfers.

---

### Role: MANAGEMENT (Manager)
**Objective**: Gain a high-level overview of system activity and key metrics.
**Modules**:
1.  **Dashboard**
    - `Dashboard`: Understanding the key performance indicators (KPIs) like active contracts, ongoing waves, etc.
2.  **Reporting & Auditing (Read-Only)**
    - Navigating through Operation and HR modules to view data without editing.
    - `Admin > Employee History`: Reviewing overall manpower utilization.
    - `Admin > Audit Logs`: Understanding system activity.
3.  **Financial Overviews**
    - `Finance > A/R Aging` & `A/P Aging`: Understanding the company's financial health.
    - `Finance > Cash > Dashboard`: Monitoring the cash flow summary.
