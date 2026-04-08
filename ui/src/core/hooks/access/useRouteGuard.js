// src/core/hooks/access/useRouteGuard.js

import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useAuthStore from "../../../store/authStore";
import { useResourceStore } from "../../provider/ResourceProvider";

const useRouteGuard = (loginPath = "/login") => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const roles = useAuthStore((s) => s.roles);
  const browserRoutes = useResourceStore((s) => s.getBrowserRoutes());

  useEffect(() => {
    const route = browserRoutes.find(
      (r) => r.resource_path === location.pathname,
    );

    // route not in registry — let it through
    if (!route) return;

    // public route — always accessible
    if (route.is_public) return;

    // non-public route — must be authenticated
    if (!isAuthenticated) {
      navigate(loginPath, {
        replace: true,
        state: { from: location.pathname, message: "Authentication required" },
      });
      return;
    }

    // authenticated but no roles assigned yet — block
    if (!roles?.length) {
      navigate(loginPath, {
        replace: true,
        state: {
          from: location.pathname,
          message: "No roles assigned to this account",
        },
      });
    }
  }, [location.pathname, isAuthenticated, roles, browserRoutes]);
};

export default useRouteGuard;
