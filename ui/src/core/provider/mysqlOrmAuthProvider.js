// src/core/authProviders/mysqlOrmAuthProvider.js

import apiClient from "../../services/apiClient";
import useAuthStore from "../../store/authStore";

const mysqlOrmAuthProvider = () => ({
  login: async ({ email, password }) => {
    const { data } = await apiClient.post("/auth/login", { email, password });
    // refresh token set as httpOnly cookie by server
    // access token returned in body
    const { token } = data;

    const user = { email };
    useAuthStore.getState().setAuth(user, token);

    return { user, token };
  },

  logout: async () => {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      useAuthStore.getState().clearAuth();
    }
  },

  // pure local check — API validates on every real request anyway
  checkAuth: () => {
    const { isAuthenticated } = useAuthStore.getState();
    return { authenticated: isAuthenticated };
  },

  getIdentity: () => {
    const user = useAuthStore.getState().getUser();
    return { user };
  },

  getPermissions: async () => {
    const { data } = await apiClient.get("/auth/permissions");
    return { roles: data.roles ?? [], permissions: data.permissions ?? [] };
  },

  refreshToken: async () => {
    const { data } = await apiClient.post("/auth/refresh");
    const { token } = data;
    const user = useAuthStore.getState().getUser();
    useAuthStore.getState().setAuth(user, token);
    return { token };
  },

  forgotPassword: async ({ email }) => {
    await apiClient.post("/auth/forget_password", { email });
  },

  resetPassword: async ({ token, password }) => {
    await apiClient.post(`/auth/reset_password?token=${token}`, { password });
  },

  changePassword: async ({ oldPassword, newPassword }) => {
    const { data } = await apiClient.post("/auth/change_password", {
      oldPassword,
      newpassword: newPassword,
    });
    // server rotates token_version — clear auth, force re-login
    useAuthStore.getState().clearAuth();
    return { data };
  },
});

export default mysqlOrmAuthProvider;
