import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";

// This is a simple wrapper component that handles the Onboarding Gate logic
// as described in F4. If a user is logged in, not admin, not exempt, and hasn't
// completed onboarding, they can ONLY access /learn routes.

export function ProtectedRoute({ children, requireAuth = true }: { children: React.ReactNode, requireAuth?: boolean }) {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading, isError } = useGetMe({ query: { retry: false, queryKey: getGetMeQueryKey() } });
  
  useEffect(() => {
    if (isLoading) return;
    
    // Auth check
    if (requireAuth && (isError || !user)) {
      setLocation("/login");
      return;
    }
    
    // Already logged in, trying to access auth pages
    if (!requireAuth && user) {
      setLocation("/dashboard");
      return;
    }
    
    // Onboarding Gate check
    if (user && requireAuth) {
      const isLearnRoute = location.startsWith("/learn") || location.startsWith("/account");
      const needsOnboarding = user.role !== 'admin' && !user.onboardingComplete && !user.onboardingExempt;
      
      if (needsOnboarding && !isLearnRoute) {
        setLocation("/learn");
      }
    }
  }, [user, isLoading, isError, location, requireAuth, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  // If requires auth but no user, return null (useEffect will redirect)
  if (requireAuth && !user) return null;

  return <>{children}</>;
}
