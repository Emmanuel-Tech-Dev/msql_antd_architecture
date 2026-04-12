import { useMutation } from "@tanstack/react-query";
import { useAuthProvider } from "../../provider/AuthProvider";
import queryClient from "../../queryClient";

const useChangePassword = ({ mutationOptions = {} } = {}) => {
  const authProvider = useAuthProvider();

  return useMutation({
    mutationFn: (values) => authProvider.changePassword(values),

    onSuccess: (data, variables, context) => {
      // wipe cache — tokens are rotated server-side
      queryClient.clear();
      mutationOptions.onSuccess?.(data, variables, context);
    },

    onError: (error, variables, context) => {
      mutationOptions.onError?.(error, variables, context);
    },

    ...mutationOptions,
  });
};

export default useChangePassword;
