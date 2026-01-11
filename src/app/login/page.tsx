// src/app/login/page.tsx
'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { useAuth as useFirebaseAuth, useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const auth = useFirebaseAuth();
  const db = useFirestore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists() && userDocSnap.data().status === 'ACTIVE') {
        const redirect = searchParams.get('redirect') || '/dashboard';
        router.push(redirect);
      } else {
        toast({
            variant: "destructive",
            title: "Approval Required",
            description: "This account is pending approval or is disabled.",
        });
        await signOut(auth);
        router.replace(`/pending?email=${encodeURIComponent(email)}`);
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Login</h1>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </form>
      <p>
        Don't have an account? <Link href="/signup">Sign up</Link>
      </p>
    </div>
  );
}
