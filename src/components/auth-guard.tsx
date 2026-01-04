
"use client";

import { useRouter, usePathname } from "next/navigation";
import React from "react";

// The project's auth context
import { useAuth } from "@/context/AuthContext"; 
import FullPageLoader from "./full-page-loader";

type Props = { children: React.ReactNode };

export default function AuthGuard({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  // Adapted to the project's specific context values:
  // authUser -> user
  // userDoc -> userProfile
  const { user, userProfile, loading } = useAuth(); 

  // 1) Always wait for the auth state to be determined.
  if (loading) {
    return <FullPageLoader />;
  }

  // 2) If not logged in, redirect to the login page.
  if (!user) {
    // Prevent redirect loop if already on a public page.
    if (pathname !== "/" && pathname !== "/signup" && !pathname.startsWith('/kiosk')) {
      router.replace("/");
    }
    return <FullPageLoader />;
  }

  // 3) If logged in, but the Firestore user profile is not ready yet, keep showing the loader.
  // This is the critical step that prevents Firestore queries from running too early.
  if (!userProfile) {
    return <FullPageLoader />;
  }

  // 4) Only at this point is it safe to render pages that might run Firestore queries.
  return <>{children}</>;
}
