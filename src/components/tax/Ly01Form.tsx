
'use client';

import React from 'react';

export function Ly01Form({ employee, mode, onFormSubmit }: { employee: any, mode: 'kiosk' | 'admin', onFormSubmit: () => void }) {
  return (
    <div className="p-8 border rounded-lg">
      <h2 className="text-xl font-bold">L.Y.01 Form (Under Construction)</h2>
      <p className="text-muted-foreground">This feature is currently being developed.</p>
      <div className="mt-4">
        <p>Employee: {employee.personalInfo.firstName} {employee.personalInfo.lastName}</p>
        <p>Mode: {mode}</p>
      </div>
    </div>
  );
}
