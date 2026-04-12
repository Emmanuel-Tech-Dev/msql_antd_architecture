// src/core/providers/AuthProvider.js

import { createContext, useContext } from "react";

/*
  Every auth provider must implement this shape.

  Return shapes:
    login          → { user, token }
    logout         → void
    checkAuth      → { authenticated: boolean }
    getIdentity    → { user }
    getPermissions → { roles: [], permissions: [] }
    refreshToken   → { token }
    forgotPassword → void
    resetPassword  → void
*/
export const AUTH_PROVIDER_INTERFACE = [
  "login",
  "logout",
  "checkAuth",
  "getIdentity",
  "getPermissions",
  "refreshToken",
  "forgotPassword",
  "resetPassword",
  "changePassword",
];

export function validateAuthProvider(provider) {
  AUTH_PROVIDER_INTERFACE.forEach((method) => {
    if (typeof provider[method] !== "function") {
      throw new Error(
        `[Framework] authProvider is missing required method: "${method}"`,
      );
    }
  });
}

export const AuthProviderContext = createContext(null);

export function useAuthProvider() {
  const ctx = useContext(AuthProviderContext);
  if (!ctx) {
    throw new Error(
      "[Framework] useAuthProvider must be used inside FrameworkProvider",
    );
  }
  return ctx;
}
