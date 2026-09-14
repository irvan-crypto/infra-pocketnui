"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !isAuthenticated) {
      router.push("/");
      return;
    }
    if (ready && isAuthenticated && allowedRoles && !allowedRoles.includes(user!.role)) {
      router.push("/dashboard");
    }
  }, [ready, isAuthenticated, user, allowedRoles, router]);

  if (!ready || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-[#1a56db] border-t-transparent animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}