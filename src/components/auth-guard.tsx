
"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import FullPageLoader from "./full-page-loader";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If loading is finished and there's no user at all, redirect to login.
    if (!loading && !user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  // While loading is true, show the loader.
  // This now waits for both the auth state and the user profile to be resolved.
  if (loading) {
    return <FullPageLoader />;
  }

  // If loading is done, but there's no user or userProfile,
  // it means they're not logged in or their profile is missing (which shouldn't happen with bootstrap).
  // The useEffect will handle the redirect, but we can show a loader in the meantime.
  if (!user || !userProfile) {
     return <FullPageLoader />;
  }


  // If everything is loaded and user/profile exists, render the children.
  return <>{children}</>;
}
