
'use client';

import { use, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { parsePersonKey } from '@/lib/tax/utils';
import { Employee } from '@/types/employee';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Icons } from '@/components/icons';
import { toDate, formatDate } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

function CheckboxDisplay({ checked }: { checked?: boolean }) {
  return (
    <div className="h-4 w-4 border border-black flex items-center justify-center">
      {checked && <div className="h-2 w-2 bg-black" />}
    </div>
  );
}

function LabeledCheckbox({ label, checked }: { label: string, checked?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <CheckboxDisplay checked={checked} />
      <span>{label}</span>
    </div>
  );
}

export default function Ly01ExportPage({ params }: { params: Promise<{ personKey: string }> }) {
  const { personKey } = use(params);
  const db = useFirestore();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db || !personKey) {
      setIsLoading(false);
      return;
    }

    const parsedKey = parsePersonKey(personKey);
    if (!parsedKey) {
      setIsLoading(false);
      return;
    }

    const unsub = onSnapshot(doc(db, 'employees', parsedKey.personRefId), (docSnap) => {
      if (docSnap.exists()) {
        setEmployee({ id: docSnap.id, ...docSnap.data() } as Employee);
      } else {
        setEmployee(null);
      }
      setIsLoading(false);
    }, (error) => {
      console.error(error);
      setIsLoading(false);
    });

    return () => unsub();
  }, [db, personKey]);
  
  const ly01 = employee?.taxProfile?.ly01;

  if (isLoading) {
    return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;
  }

  if (!employee || !ly01) {
    return <div className="p-8 text-center text-red-500">Employee or LY.01 data not found. Cannot generate PDF.</div>;
  }
  
  const data = ly01.data || {};
  const personal = data.personal || {};
  const marital = data.marital || {};

  return (
    <div className="p-8 bg-white text-black font-['Sarabun',_sans-serif] text-xs">
        <style jsx global>{`
            @media print {
              body { -webkit-print-color-adjust: exact; }
              .no-print { display: none; }
            }
        `}</style>
        
        <div className="no-print mb-8 flex justify-end gap-2">
            <Button variant="outline" onClick={() => window.close()}>Close</Button>
            <Button onClick={() => window.print()}>Print / Save as PDF</Button>
        </div>

        <div className="border-2 border-black p-4 space-y-4">
            {/* Header */}
            <header className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                    <Icons.logo className="h-16 w-16" />
                    <div>
                        <p className="font-bold">COMPANY NAME PLACEHOLDER</p>
                        <p>123 Address Rd, Bangkok, 10110</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="font-bold text-lg">แบบแจ้งรายการเพื่อการหักลดหย่อน (ล.ย. 01)</p>
                    <p>สำหรับผู้มีเงินได้ตามมาตรา 40(1) แห่งประมวลรัษฎากร</p>
                </div>
            </header>

            <Separator className="bg-black"/>

            {/* Personal Info */}
            <section className="grid grid-cols-2 gap-x-8">
                <div>
                    <p><strong>ชื่อผู้มีเงินได้:</strong> {employee.personalInfo.firstName} {employee.personalInfo.lastName}</p>
                </div>
                <div>
                     <p><strong>เลขประจำตัวผู้เสียภาษีอากร:</strong> {personal.taxId || '...........................................'}</p>
                </div>
                <div>
                    <p><strong>สถานะ:</strong> {marital.status}</p>
                </div>
            </section>
            
             <section className="border border-black p-2">
                 <p className="font-bold text-center mb-2">รายการหักลดหย่อน</p>
                 <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                    {/* Marital */}
                    <LabeledCheckbox label="คู่สมรส (ไม่มีเงินได้)" checked={marital.status === 'MARRIED' && !marital.spouseHasIncome} />

                    {/* Children */}
                    <p><strong>บุตร:</strong></p>
                    <LabeledCheckbox label="บุตรที่เกิดก่อนปี พ.ศ. 2561" checked={(data.children?.allowance30kCount || 0) > 0} />
                    <p>จำนวน: {data.children?.allowance30kCount || 0} คน</p>

                    <LabeledCheckbox label="บุตรที่เกิดตั้งแต่ปี พ.ศ. 2561 เป็นต้นไป" checked={(data.children?.allowance60kCount || 0) > 0} />
                     <p>จำนวน: {data.children?.allowance60kCount || 0} คน</p>

                    <p><strong>อุปการะเลี้ยงดูบิดามารดา:</strong></p>
                    <div/>

                    <LabeledCheckbox label="บิดาผู้มีเงินได้" checked={data.parents?.self?.father} />
                    <LabeledCheckbox label="มารดาผู้มีเงินได้" checked={data.parents?.self?.mother} />
                    <LabeledCheckbox label="บิดาคู่สมรส" checked={data.parents?.spouse?.father} />
                    <LabeledCheckbox label="มารดาคู่สมรส" checked={data.parents?.spouse?.mother} />

                    <p><strong>เบี้ยประกัน:</strong></p>
                    <div/>
                    
                    <p>เบี้ยประกันชีวิต: {data.insuranceAndFunds?.lifeInsuranceAmount || 0} บาท</p>
                    <p>เบี้ยประกันสุขภาพ: {data.insuranceAndFunds?.healthInsuranceAmount || 0} บาท</p>
                    <p>เบี้ยประกันสุขภาพบิดามารดา: {data.insuranceAndFunds?.selfParentsHealthInsuranceAmount || 0} บาท</p>

                    <p><strong>เงินสะสมเข้ากองทุน:</strong></p>
                    <div/>
                     <p>กองทุนสำรองเลี้ยงชีพ: {data.insuranceAndFunds?.providentFundAmount || 0} บาท</p>

                    <p><strong>เงินบริจาค:</strong></p>
                    <div/>
                    <p>บริจาคเพื่อการศึกษา/กีฬา/สาธารณประโยชน์: {data.otherDeductions?.educationDonationAmount || 0} บาท</p>
                    <p>บริจาคทั่วไป: {data.otherDeductions?.otherDonationAmount || 0} บาท</p>

                 </div>
            </section>
            
            {/* Declaration */}
            <section className="space-y-4 pt-4">
                <p>ขอรับรองว่ารายการที่แสดงไว้เป็นความจริงทุกประการ</p>
                <div className="grid grid-cols-2 gap-8 pt-8">
                    <p>....................................................</p>
                    <p>วันที่ (Date): {ly01.declaredDate ? formatDate(ly01.declaredDate) : '.....................'}</p>
                    <p>({employee.personalInfo.firstName} {employee.personalInfo.lastName})</p>
                </div>
            </section>

            <footer className="text-xs text-gray-500 pt-8">
                <p>Generated At: {formatDate(new Date())} by System</p>
                <p>Ref: {employee.employeeCode} / {personKey}</p>
            </footer>

        </div>
    </div>
  );
}
