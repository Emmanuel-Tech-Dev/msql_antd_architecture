// src/core/hooks/auth/useLogin.js

import { useMutation } from "@tanstack/react-query";
import { useAuthProvider } from "../../providers/AuthProvider";
import queryClient from "../../queryClient";

const useLogin = ({ mutationOptions = {} } = {}) => {
  const authProvider = useAuthProvider();

  return useMutation({
    mutationFn: (credentials) => authProvider.login(credentials),

    onSuccess: (data, variables, context) => {
      // invalidate bootstrap so it refetches with the new user's context
      queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
      mutationOptions.onSuccess?.(data, variables, context);
    },

    onError: (error, variables, context) => {
      mutationOptions.onError?.(error, variables, context);
    },

    ...mutationOptions,
  });
};

export default useLogin;
