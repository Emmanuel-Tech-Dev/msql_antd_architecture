// src/core/hooks/access/useRouteGuard.js

import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useAuthStore from "../../../store/authStore";
import { useResourceStore } from "../../provider/ResourceProvider";

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
  const route = browserRoutes.find((r) => r.resource_path === location.pathname);

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
    target = isAuthenticated ? "/admin/404" : loginPath;
  } else if (route.is_public) {
    // Public route
    isAllowed = true;
  } else if (!isAuthenticated) {
    // Private route, but not logged in
    isAllowed = false;
    target = loginPath;
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
