// src/store/authStore.js

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const AUTH_META_STORAGE_KEY = "auth_meta_v1";

function readStoredAuthMeta() {
  try {
    const raw = localStorage.getItem(AUTH_META_STORAGE_KEY);
    if (!raw) {
      return {
        roles: [],
        permissions: [],
        resources: [],
        authMetaLoaded: false,
      };
    }

    const parsed = JSON.parse(raw);
    return {
      roles: Array.isArray(parsed?.roles) ? parsed.roles : [],
      permissions: Array.isArray(parsed?.permissions) ? parsed.permissions : [],
      resources: Array.isArray(parsed?.resources) ? parsed.resources : [],
      authMetaLoaded: true,
    };
  } catch {
    return {
      roles: [],
      permissions: [],
      resources: [],
      authMetaLoaded: false,
    };
  }
}

const initialAuthMeta = readStoredAuthMeta();

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      roles: initialAuthMeta.roles,
      permissions: initialAuthMeta.permissions,
      resources: initialAuthMeta.resources,
      authMetaLoaded: initialAuthMeta.authMetaLoaded,

      setAuth: (user, token, roles = [], permissions = [], resources = []) => {
        sessionStorage.setItem("access_token", token);
        localStorage.removeItem(AUTH_META_STORAGE_KEY);
        set({
          user,
          accessToken: token,
          isAuthenticated: true,
          roles,
          permissions,
          resources,
          authMetaLoaded: false,
        });
      },

      setAuthMeta: ({ user, roles = [], permissions = [], resources = [] }) => {
        localStorage.setItem(
          AUTH_META_STORAGE_KEY,
          JSON.stringify({ roles, permissions, resources }),
        );
        set((state) => ({
          user: user ?? state.user,
          roles,
          permissions,
          resources,
          authMetaLoaded: true,
        }));
      },

      clearAuth: () => {
        sessionStorage.removeItem("access_token");
        // Also clear the Zustand-persisted key so no stale auth survives a logout.
        sessionStorage.removeItem("auth_store");
        localStorage.removeItem(AUTH_META_STORAGE_KEY);
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          roles: [],
          permissions: [],
          resources: [],
          authMetaLoaded: false,
        });
      },

      getUser: () => get().user,
      getToken: () => get().accessToken,
    }),
    {
      name: "auth_store",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

export default useAuthStore;
