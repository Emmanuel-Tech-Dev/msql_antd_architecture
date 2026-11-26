// src/core/hooks/auth/useIdentity.js

import { useQuery } from "@tanstack/react-query";
import { useAuthProvider } from "../../provider/AuthProvider";
import useAuthStore from "../../../store/authStore";

// The signed-in user, from the auth provider. Re-read whenever someone signs
// in or out; { user: null } while signed out.
const useIdentity = () => {
  const authProvider = useAuthProvider();
  // The whole stored user is the key, so another account never sees the
  // previous one's cached identity.
  const userKey = useAuthStore((state) => JSON.stringify(state.user ?? null));
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const query = useQuery({
    queryKey: ["identity", userKey],
    queryFn: () => authProvider.getIdentity(),
    enabled: isAuthenticated,
  });
  return { user: isAuthenticated ? query.data?.user ?? null : null, isLoading: query.isLoading, error: query.error };
};

export default useIdentity;
