// src/core/providers/AccessProvider.js

import { createContext, useContext } from "react";
import useAuthStore from "../../store/authStore";
import { useResourceStore } from "./ResourceProvider";

export const AccessProviderContext = createContext(null);

export function useAccessProvider() {
  const ctx = useContext(AccessProviderContext);
  if (!ctx) {
    throw new Error(
      "[Framework] useAccessProvider must be used inside FrameworkProvider",
    );
  }
  return ctx;
}

// ─── Core check function ──────────────────────────────────────────────────────

/*
  action: 'list' | 'create' | 'edit' | 'delete' | 'show' | 'navigate'

  Returns { can: boolean, message?: string }
*/
export function checkAccess({
  resource,
  action,
  roles,
  permissions,
  browserRoutes,
}) {
  // SuperAdmin bypasses all checks
  if (roles?.includes("SuperAdmin")) {
    return { can: true };
  }

  // ── Browser route navigation check ────────────────────────────────────────
  if (action === "navigate") {
    const route = browserRoutes.find((r) => r.resource_path === resource);

    if (!route) {
      return { can: false, message: "Route not found" };
    }

    if (route.is_public) {
      return { can: true };
    }

    // non-public route — user must be authenticated
    // role-level route assignment check happens here
    // for now authenticated = can navigate non-public routes
    // granular route-role assignment can be added per project
    if (!roles?.length) {
      return { can: false, message: "Authentication required" };
    }

    return { can: true };
  }

  // ── Resource action check ─────────────────────────────────────────────────
  const resources = useResourceStore.getState().resources;
  const resourceConfig = resources[resource];

  if (!resourceConfig) {
    // resource not registered — open by default
    return { can: true };
  }

  const requiredPermission = resourceConfig.permissions?.[action];

  if (!requiredPermission) {
    // no permission configured for this action — open by default
    return { can: true };
  }

  const hasPermission = permissions?.includes(requiredPermission);

  if (!hasPermission) {
    return {
      can: false,
      message: `Missing permission: ${requiredPermission}`,
    };
  }

  return { can: true };
}

// ─── Access provider factory ──────────────────────────────────────────────────

export function createAccessProvider() {
  return {
    can: ({ resource, action }) => {
      const { roles, permissions } = useAuthStore.getState();
      const browserRoutes = useResourceStore.getState().getBrowserRoutes();

      return checkAccess({
        resource,
        action,
        roles,
        permissions,
        browserRoutes,
      });
    },
  };
}
