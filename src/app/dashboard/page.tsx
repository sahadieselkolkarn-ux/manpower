// src/app/dashboard/page.tsx
'use client';

import { useAuth, UserProfile } from '@/context/AuthContext';

function PendingScreen() {
    return (
        <div>
            <h1>Your account is pending review.</h1>
            <p>Please contact an administrator to activate your account.</p>
        </div>
    )
}

function InactiveScreen() {
    return (
        <div>
            <h1>Your account is inactive.</h1>
            <p>Please contact an administrator for assistance.</p>
        </div>
    )
}

export default function DashboardPage() {
  const { user, userProfile } = useAuth();

  if (!userProfile) {
    return <div>Loading profile...</div>;
  }

  if (userProfile.status !== 'ACTIVE') {
      return <InactiveScreen />;
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {userProfile.displayName}!</p>
      <p>Your Role IDs: {userProfile.roleIds?.join(', ')}</p>
      <p>Is Admin: {userProfile.isAdmin ? 'Yes' : 'No'}</p>


      <h2>Debug Info:</h2>
      <pre style={{ background: '#f4f4f4', padding: '1rem', borderRadius: '5px' }}>
        {JSON.stringify({ user, userProfile }, null, 2)}
      </pre>
    </div>
  );
}
