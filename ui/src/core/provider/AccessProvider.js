import { createContext, useContext } from "react";
import useAuthStore from "../../store/authStore";
import { useResourceStore } from "./ResourceProvider";

export const AccessProviderContext = createContext(null);

export function useAccessProvider() {
  const context = useContext(AccessProviderContext);
  if (!context) {
    throw new Error(
      "[Framework] useAccessProvider must be used inside FrameworkProvider",
    );
  }
  return context;
}

function isPrivilegedRole(roles = []) {
  return roles.some((role) => {
    const normalized = String(role?.role_id ?? role).trim().toLowerCase();
    return normalized === "superadmin" || normalized === "dev";
  });
}

function isPublicRoute(route) {
  const value = route?.is_public;
  const normalized = String(value).trim().toLowerCase();
  return value === true || value === 1 || normalized === "1" || normalized === "true";
}

export function checkAccess({
  resource,
  action,
  roles = [],
  permissions = [],
  browserRoutes = [],
  resources = {},
  isReady = false,
}) {
  if (!isReady) {
    return { can: false, reason: "Framework access registry is loading" };
  }

  if (isPrivilegedRole(roles)) return { can: true };

  if (action === "navigate") {
    const route = browserRoutes.find((item) => item.resource_path === resource);
    if (!route) return { can: false, reason: "Route is not assigned" };
    if (isPublicRoute(route)) return { can: true };
    return roles.length
      ? { can: true }
      : { can: false, reason: "Authentication is required" };
  }

  const resourceConfig = resources[resource];
  if (!resourceConfig) {
    return { can: false, reason: `Resource is not registered: ${resource}` };
  }

  if (resourceConfig.meta?.access?.public === true) return { can: true };

  const requiredPermission = resourceConfig.permissions?.[action];
  if (!requiredPermission) {
    return {
      can: false,
      reason: `No permission is configured for ${resource}.${action}`,
    };
  }

  return permissions.includes(requiredPermission)
    ? { can: true }
    : { can: false, reason: `Missing permission: ${requiredPermission}` };
}

export function createAccessProvider() {
  return {
    can: ({ resource, action }) => {
      const { roles, permissions } = useAuthStore.getState();
      const state = useResourceStore.getState();
      return checkAccess({
        resource,
        action,
        roles,
        permissions,
        browserRoutes: state.browserRoutes,
        resources: state.resources,
        isReady: state.isReady,
      });
    },
  };
}
