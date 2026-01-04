// src/components/sidebar.tsx
'use client';

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
