import { useMutation } from "@tanstack/react-query";
import { useAuthProvider } from "../../provider/AuthProvider";

const useResetPassword = ({ mutationOptions = {} } = {}) => {
  const authProvider = useAuthProvider();

  return useMutation({
    mutationFn: ({ token, password }) =>
      authProvider.resetPassword({ token, password }),

    onSuccess: (data, variables, context) => {
      mutationOptions.onSuccess?.(data, variables, context);
    },

    onError: (error, variables, context) => {
      mutationOptions.onError?.(error, variables, context);
    },

    ...mutationOptions,
  });
};

export default useResetPassword;
