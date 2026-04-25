// src/core/authProviders/mysqlOrmAuthProvider.js

import apiClient from "../../services/apiClient";
import useAuthStore from "../../store/authStore";

const mysqlOrmAuthProvider = () => ({
  login: async ({ email, password }) => {
    const { data } = await apiClient.post("/auth/login", { email, password });

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

  getIdentity: async () => {
    const identity = useAuthStore.getState().getUser();
    return { user: identity };
  },

  getPermissions: async () => {
    const { data } = await apiClient.get("/auth/auth_user");
    const payload = data?.data ?? {};
    const roles = (payload.role ?? []).map((r) =>
      typeof r === "string" ? r : r?.role_id,
    );
    const permissions = payload.assignedPermission ?? [];
    const resources = payload.resources ?? [];
    const user = payload.user ?? null;

    useAuthStore.getState().setAuthMeta({
      user,
      roles,
      permissions,
      resources,
    });

    return {
      data: payload,
      user,
      roles,
      permissions,
      resources,
    };
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
