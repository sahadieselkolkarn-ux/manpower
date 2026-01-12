// src/components/sidebar.tsx
'use client';

// LEGACY COMPONENT: This file is no longer used for the main dashboard layout.
// The active sidebar is now implemented in `src/components/sidebar-layout.tsx`.
// This file is kept for historical reference and can be removed in a future cleanup.

import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { generateMenu } from '@/lib/rbac/menu';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const { userProfile, signOut } = useAuth();
  const pathname = usePathname();

  if (!userProfile) {
    return (
      <aside style={{ width: '250px', borderRight: '1px solid #ccc', padding: '1rem' }}>
        <p>Loading user...</p>
      </aside>
    );
  }

  const menuItems = generateMenu(userProfile);

  return (
    <aside style={{ width: '250px', borderRight: '1px solid #ccc', padding: '1rem', height: '100vh' }}>
      <h3>My App</h3>
      <nav>
        <ul>
          {menuItems.map((item) => (
            <li key={item.href} style={{ fontWeight: pathname === item.href ? 'bold' : 'normal' }}>
              <Link href={item.href}>{item.label}</Link>
            </li>
          ))}
        </ul>
      </nav>
      <div style={{ marginTop: 'auto' }}>
        <p>{userProfile.displayName}</p>
        <p>{userProfile.email}</p>
        <button onClick={signOut}>Sign Out</button>
      </div>
    </aside>
  );
}
