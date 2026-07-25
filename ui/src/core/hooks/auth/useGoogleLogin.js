import { useMutation } from "@tanstack/react-query";
import { useAuthProvider } from "../../provider/AuthProvider";
import queryClient from "../../queryClient";

const useGoogleLogin = ({ mutationOptions = {} } = {}) => {
  const authProvider = useAuthProvider();

  return useMutation({
    ...mutationOptions,
    mutationFn: ({ idToken }) => authProvider.googleLogin({ idToken }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
      mutationOptions.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      mutationOptions.onError?.(error, variables, context);
    },
  });
};

export default useGoogleLogin;
