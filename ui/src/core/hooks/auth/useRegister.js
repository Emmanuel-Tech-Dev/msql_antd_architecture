// src/core/hooks/auth/useRegister.js

import { useMutation } from "@tanstack/react-query";
import { useAuthProvider } from "../../provider/AuthProvider";

const useRegister = ({ mutationOptions = {} } = {}) => {
  const authProvider = useAuthProvider();

  return useMutation({
    mutationFn: (record) => authProvider.register(record),

    onSuccess: (data, variables, context) => {
      mutationOptions.onSuccess?.(data, variables, context);
    },

    onError: (error, variables, context) => {
      mutationOptions.onError?.(error, variables, context);
    },

    ...mutationOptions,
  });
};

export default useRegister;
