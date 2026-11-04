"use client";

import { useAuth } from "@clerk/nextjs";
import { api } from "@convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/errors";

/**
 * Bridges Clerk → Convex user provisioning. The users table is the source of
 * truth for roles; this mutation can only ever create a standard user unless
 * the email is in the server-side ADMIN_EMAILS allowlist.
 */
export function useViewer() {
  const { isLoaded, isSignedIn } = useAuth();
  const storeUser = useMutation(api.features.auth.users.store);
  const attempted = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const viewer = useQuery(api.features.auth.users.me, isLoaded && isSignedIn ? {} : "skip");

  const provision = useCallback(async () => {
    try {
      setError(null);
      await storeUser();
    } catch (cause) {
      const message = getErrorMessage(cause);
      setError(message);
      toast.error("We could not finish setting up your account", { description: message });
    }
  }, [storeUser]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || attempted.current) {
      return;
    }
    attempted.current = true;
    void provision();
  }, [isLoaded, isSignedIn, provision]);

  return {
    viewer,
    isLoading: !isLoaded || (Boolean(isSignedIn) && viewer === undefined),
    error,
    retry: provision,
  };
}
