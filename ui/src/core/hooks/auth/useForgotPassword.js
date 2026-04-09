import { useMutation } from "@tanstack/react-query";
import { useAuthProvider } from "../../providers/AuthProvider";

const useForgotPassword = ({ mutationOptions = {} } = {}) => {
  const authProvider = useAuthProvider();

  return useMutation({
    mutationFn: ({ email }) => authProvider.forgotPassword({ email }),

    onSuccess: (data, variables, context) => {
      mutationOptions.onSuccess?.(data, variables, context);
    },

    onError: (error, variables, context) => {
      mutationOptions.onError?.(error, variables, context);
    },

    ...mutationOptions,
  });
};

export default useForgotPassword;
