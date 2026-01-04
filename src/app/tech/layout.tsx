// src/app/tech/layout.tsx
import { ReactNode } from 'react';

// This is a shared layout for all tech departments.
// Specific permission checks will be done in sub-layouts.
export default function TechLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
