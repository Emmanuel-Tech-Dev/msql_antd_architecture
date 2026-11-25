// src/core/hooks/auth/useIdentity.js

import { useAuthProvider } from "../../provider/AuthProvider";

const useIdentity = () => {
  const authProvider = useAuthProvider();
  // synchronous — reads from authStore, no server call
  return authProvider.getIdentity();
};

export default useIdentity;
