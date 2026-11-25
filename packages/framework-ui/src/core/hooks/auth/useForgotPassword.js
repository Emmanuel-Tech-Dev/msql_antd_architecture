import { useMutation } from "@tanstack/react-query";
import { useAuthProvider } from "../../provider/AuthProvider";

const useForgotPassword = ({ mutationOptions = {} } = {}) => {
  const authProvider = useAuthProvider();

  return useMutation({
    ...mutationOptions,
    mutationFn: ({ email }) => authProvider.forgotPassword({ email }),

    onSuccess: (data, variables, context) => {
      mutationOptions.onSuccess?.(data, variables, context);
    },

    onError: (error, variables, context) => {
      mutationOptions.onError?.(error, variables, context);
    },

  });
};

export default useForgotPassword;
