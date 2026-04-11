// src/core/hooks/auth/useLogout.js

import { useMutation } from "@tanstack/react-query";
import { useAuthProvider } from "../../provider/AuthProvider";
import queryClient from "../../queryClient";

const useLogout = ({ mutationOptions = {} } = {}) => {
  const authProvider = useAuthProvider();

  return useMutation({
    mutationFn: () => authProvider.logout(),

    onSuccess: (data, variables, context) => {
      // wipe entire cache — next user should not see previous user's data
      queryClient.clear();
      mutationOptions.onSuccess?.(data, variables, context);
    },

    onError: (error, variables, context) => {
      // clear cache even on error — server may have already invalidated the session
      queryClient.clear();
      mutationOptions.onError?.(error, variables, context);
    },

    ...mutationOptions,
  });
};

export default useLogout;
