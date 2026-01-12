# Manpower OPEC Go-Live Checklist

This checklist covers the essential configuration steps required before deploying the system for production use.

## Phase 1: Initial System Setup (Admin)

- [ ] **Firebase Project Ready**: Ensure the target Firebase project is created and all necessary APIs are enabled.
- [ ] **Deploy Firestore Rules**: The final, production-ready `firestore.rules` must be deployed. The development rule (`allow read, write: if isSignedIn()`) must be removed.
- [ ] **Seed Master Data**:
    - [ ] Run role seeding to ensure all standard roles are in the `/roles` collection.
    - [ ] Populate initial master data for:
        - `/positions` (Manpower & Office)
        - `/certificateTypes`
        - `/hospitals`
- [ ] **Configure Company Profile**: Fill out all details in `Admin > System > Company Profile`. This is critical for reports and official documents.
- [ ] **Configure HR Policies**:
    - [ ] Set up the initial `Public Holiday Calendar` (`/dashboard/hr/holidays`).
    - [ ] Set up the `OT Settings` (`/dashboard/hr/settings/overtime`) with correct weekend days, normal hours, and OT divisors.

## Phase 2: User & Role Bootstrap (Critical Security Step)

- [ ] **Set Admin Allowlist**: In Firestore, navigate to `settings/security`. Ensure `bootstrap.isOpen` is `true` and add the email addresses of the initial administrators to the `bootstrap.adminEmailsAllowlist` array.
- [ ] **First Admin Signup**: Have the designated admin(s) sign up for their accounts through the application's UI. The system will automatically grant them `isAdmin=true` status upon their first profile creation.
- [ ] **LOCK THE SYSTEM**: Once the initial admin accounts are created and verified, immediately set `bootstrap.isOpen` to `false` in `settings/security`. **This is a critical step to prevent unauthorized admin access.**
- [ ] **Create User Accounts**: The Admin should now create accounts for all other users or guide them through the signup process.
- [ ] **Assign Roles**: The Admin must assign the correct roles to each user via the `Admin > Users` page.

## Phase 3: Operational Data Setup

- [ ] **Create Client Records**: Add all customer companies via `Operation > Customers`.
- [ ] **Create Contracts**: For each client, create the corresponding contracts with correct sale rates and OT rules (`Operation > Contracts`).
- [ ] **Create Projects**: Define the initial set of projects under each contract.
- [ ] **Onboard Employees**: Add all office and manpower employees into the system via the `HR & Manpower > Employee Management` sections. Ensure all personal data, documents, and position assignments are correct.

## Phase 4: Final Verification

- [ ] **Perform Smoke Test**: Run through the entire `testing-smoke.md` flow one last time on the production environment.
- [ ] **Review All Settings**: Double-check all configurations in the Admin and HR Settings sections.
- [ ] **User Communication**: Announce the official go-live time to all users.
- [ ] **Backup**: Perform an initial backup of the Firestore database.

---
**System is now ready for live operations.**
