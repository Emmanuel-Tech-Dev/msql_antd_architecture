// src/core/hooks/access/useRouteGuard.js

import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useAuthStore from "../../../store/authStore";
import { useResourceStore } from "../../provider/ResourceProvider";

function normalizePath(path) {
  if (!path) return "/";
  const cleaned = String(path).trim();
  if (cleaned.length > 1 && cleaned.endsWith("/")) {
    return cleaned.slice(0, -1);
  }
  return cleaned;
}

function isPublicBrowserRoute(route) {
  const flag = route?.is_public;
  if (typeof flag === "boolean") return flag;
  if (typeof flag === "number") return flag === 1;
  if (typeof flag === "string") {
    const lowered = flag.trim().toLowerCase();
    return lowered === "1" || lowered === "true";
  }
  return false;
}

const useRouteGuard = (loginPath = "/login") => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const browserRoutes = useResourceStore((s) => s.getBrowserRoutes());
  const storeIsReady = useResourceStore((s) => s.isReady);

  // isReady logic: 
  // Non-auth users don't wait for resources (isReady=true).
  // Auth users wait until bootstrapping finishes.
  const isReady = isAuthenticated ? storeIsReady : true;

  // 1. Find the current route registry entry
  const currentPath = normalizePath(location.pathname);
  const route = browserRoutes.find(
    (r) => normalizePath(r.resource_path) === currentPath,
  );

  // 2. Determine if the user is allowed to be here (Synchronous calculation for gating)
  let isAllowed = false;
  let target = null;

  // Handle login path specifically to avoid cycles
  if (location.pathname === loginPath && !isAuthenticated) {
    isAllowed = true;
  } else if (!isReady) {
    // While bootstrapping, we gate the UI even if they might be allowed eventually
    isAllowed = false;
  } else if (!route) {
    // Missing route
    isAllowed = false;
    if (isAuthenticated && browserRoutes.length > 0) {
      const firstPublic = browserRoutes.find((r) => isPublicBrowserRoute(r));
      target = firstPublic?.resource_path || browserRoutes[0]?.resource_path || "/admin/404";
    } else {
      target = isAuthenticated ? "/admin/404" : loginPath;
    }
  } else if (!isAuthenticated) {
    // Any admin/browser route still requires an authenticated session.
    // "Public" here means accessible to any authenticated user.
    isAllowed = false;
    target = loginPath;
  } else if (isPublicBrowserRoute(route)) {
    // Public route for authenticated users
    isAllowed = true;
  } else {
    // Authenticated and route exists in their allowed browserRoutes
    isAllowed = true;
  }

  useEffect(() => {
    // If not ready or already allowed, no imperative action needed
    if (!isReady || isAllowed) return;

    // If we have a target redirect, do it
    if (target) {
      // Prevent infinite loop if target is current location
      if (location.pathname === target) return;

      navigate(target, {
        replace: true,
        state: { from: location.pathname },
      });
    }
  }, [isReady, isAllowed, target, navigate, location.pathname]);

  return { isAllowed, isReady };
};

export default useRouteGuard;
