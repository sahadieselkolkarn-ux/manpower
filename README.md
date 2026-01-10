# Manpower OPEC (App: ManpowerFlow)

ระบบบริหารกำลังคน (Onshore/Offshore) ครอบคลุมตั้งแต่ Operation planning → Assignment → Timesheet/Attendance → Payroll → Billing/Accounting → Compliance & Admin

> ชื่อที่แสดงใน UI ปัจจุบันคือ “ManpowerFlow”

## Modules
Operation
- Customers (ลูกค้า)
- Contracts
- Projects
- Waves (Planning Work Period + Manpower Requirement)
- Assignments

HR & Manpower
- Office Employees / Manpower Employees
- Timesheets / Attendance
- P.N.D.1 Runs / L.Y.01 Forms
- Compliance Alerts
- HR Settings: Holidays, Policies, Office Position, Manpower Position, Certificate Types, Hospitals

Accounting
- Pending Processing
- Billing: Billing Runs, Invoices
- Core Accounting: A/R, A/P, Cash, Payroll

Admin
- Users / Roles / Permissions
- System: Company Profile
- Cooldown Policy / Employee History / Audit Logs

## Roles & Access Control
- Roles ถูกกำหนดเป็น Role Codes และ seed เข้า Firestore collection `/roles`
- User profile อยู่ใน `/users` โดยใช้ document id = Firebase Auth UID
- ผู้ใช้ผูก role ผ่าน `roleIds` (อ้างอิง document id ของ role) และมี `roleCodes` เพื่อแสดงผล/กรณี bootstrap admin

ดูรายการ role codes ที่ระบบใช้งานจริงได้ที่ `src/lib/roles.ts`

## Data Model
ดูโครงสร้าง entity และ Firestore shape ที่ `docs/backend.json`

## Local Development
ต้องมี Node.js + npm

ติดตั้ง dependencies:
- `npm install`

รัน dev server:
- `npm run dev`

หมายเหตุ: dev script ใช้ `next dev --turbopack -p 9002`

## Docs
- `docs/blueprint.md` (Project blueprint)
- `docs/backend.json` (Entity/Data model)
- `docs/opec-final.md` (Final scope summary for Manpower OPEC)