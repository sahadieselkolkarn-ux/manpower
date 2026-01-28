
import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import FullPageLoader from '@/components/full-page-loader';


export default function LoginPage() {
  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{
        backgroundImage: "url('https://firebasestorage.googleapis.com/v0/b/studio-9091954631-7f4e0.firebasestorage.app/o/OPEC_Image_2.png?alt=media&token=e0595de1-495c-4e2f-8c7f-79813a6d8519')",
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <Suspense fallback={<FullPageLoader />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
