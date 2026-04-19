// src/store/authStore.js

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      // roles: [],
      // permissions: [],

      setAuth: (user, token, roles = [], permissions = []) => {
        sessionStorage.setItem("access_token", token);
        set({
          user,
          accessToken: token,
          isAuthenticated: true,
          roles,
          permissions,
        });
      },

      clearAuth: () => {
        sessionStorage.removeItem("access_token");
        set({ user: null, accessToken: null, isAuthenticated: false });
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
