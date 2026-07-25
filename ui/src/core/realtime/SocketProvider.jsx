import { useEffect } from "react";
import useAuthStore from "../../store/authStore";
import queryClient from "../queryClient";
import { connectSocket, disconnectSocket } from "../../services/socketClient";

export default function SocketProvider({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      disconnectSocket();
      return undefined;
    }

    const socket = connectSocket(accessToken);
    const refreshAuthorization = () => {
      queryClient.refetchQueries({ queryKey: ["auth_user"], exact: true, type: "active" });
      queryClient.refetchQueries({ queryKey: ["bootstrap"], exact: true, type: "active" });
    };
    const revokeSession = () => useAuthStore.getState().clearAuth();

    socket.on("access:changed", refreshAuthorization);
    socket.on("session:revoked", revokeSession);

    return () => {
      socket.off("access:changed", refreshAuthorization);
      socket.off("session:revoked", revokeSession);
      disconnectSocket();
    };
  }, [accessToken, isAuthenticated]);

  return children;
}
